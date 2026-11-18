import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { Ablage } from '../src/lib/speicher/ablage';
import { dateiname, exportiereText, importiereText } from '../src/lib/speicher/austausch';
import { neuerCharakter, SCHEMA, type Charakter } from '../src/lib/speicher/charakter';
import { ImportFehler, migriere } from '../src/lib/speicher/migration';
import { ladeTestdaten } from './hilfen';

const statIds = ladeTestdaten().stats.eintraege.map((s) => s.id);

function beispiel(): Charakter {
  const c = neuerCharakter(statIds, new Date('2026-11-13T17:20:00+01:00'));
  c.name = 'Mara Voss';
  c.aussehen = '1,70 m, drahtig, Narbe über der linken Augenbraue';
  c.klassenweg = [{ klasse: 'anwaerter', art: 'erstellung' }];
  c.status = 'fertig';
  c.erstellung = null;
  c.stats.twitch = { rang: 'D', wurf: { positiv: 7, negativ: 4, quelle: 'app' } };
  c.skills = { waffe_pistole: 2, erste_hilfe: 1 };
  c.perks = ['zaeh_1'];
  c.kassenbuch = [{ zeit: '2026-11-13T17:05:00+01:00', betrag: 1300, art: 'startgeld', grund: 'Ersparnisse 300 + Schulden mittel 1000' }];
  c.anpassungen = [{ id: 'a1', ziel: { art: 'stat', id: 'intellect' }, wirkung: { stepshields: 1 }, grund: 'Ortskenntnis', aktiv: true }];
  c.spielstand.wunden = [{ id: 'w1', zone: 'bein_r', schaden: 3, kritisch: false }];
  return c;
}

describe('Neuer Charakter', () => {
  it('trägt die aktuelle Schemaversion und alle Stats aus den Daten', () => {
    const c = neuerCharakter(statIds);
    expect(c.schema).toBe(SCHEMA);
    expect(Object.keys(c.stats)).toEqual(statIds);
    expect(c.status).toBe('erstellung');
  });
});

describe('Export und Import', () => {
  it('Export → Import ohne Verlust', () => {
    const c = beispiel();
    expect(importiereText(exportiereText(c))).toEqual(c);
  });

  it('Dateiname aus dem Namen', () => {
    const c = beispiel();
    expect(dateiname(c)).toBe('mara-voss.cqb.json');
    c.name = 'Jürgen „Ölauge“ Weiß';
    expect(dateiname(c)).toBe('juergen-oelauge-weiss.cqb.json');
    c.name = '';
    expect(dateiname(c)).toBe('charakter.cqb.json');
  });

  it('meldet kaputte und fremde Dateien verständlich', () => {
    expect(() => importiereText('kein json')).toThrow(ImportFehler);
    expect(() => importiereText('[1,2]')).toThrow('keinen Charakter');
    expect(() => importiereText('{"name":"x"}')).toThrow('Schemaversion fehlt');
  });

  it('lehnt Dateien aus einer neueren App-Version ab', () => {
    const c = { ...beispiel(), schema: SCHEMA + 1 };
    expect(() => importiereText(JSON.stringify(c))).toThrow('neueren App-Version');
  });
});

describe('Migration', () => {
  it('lässt aktuelle Charaktere unverändert', () => {
    const c = beispiel();
    expect(migriere(c)).toEqual(c);
  });

  it('wendet Schritte der Reihe nach an (1 → 2 → 3)', () => {
    const alt = { ...beispiel(), schema: 1 } as Record<string, unknown>;
    const schritte = {
      1: (c: Record<string, unknown>) => ({ ...c, notizen: `${c.notizen}a` }),
      2: (c: Record<string, unknown>) => ({ ...c, notizen: `${c.notizen}b` })
    };
    const neu = migriere(alt, 3, schritte);
    expect(neu.schema).toBe(3);
    expect(neu.notizen).toBe('ab');
    expect(alt.schema).toBe(1);
  });

  it('meldet fehlende Migrationsschritte', () => {
    expect(() => migriere({ ...beispiel(), schema: 1 }, 2, {})).toThrow('Keine Migration von Schema 1 auf 2');
  });

  it('Schema 1 → 2: fertiger Charakter bekommt keinen Erstellungsstand, Entwurf einen leeren', () => {
    const { erstellung: _e, vorratslevel_manuell: _v, ...rest } = beispiel();
    const fertig = migriere({ ...rest, schema: 1 });
    expect(fertig.schema).toBe(2);
    expect(fertig.erstellung).toBeNull();
    expect(fertig.vorratslevel_manuell).toBeNull();
    expect(fertig.skills).toEqual(beispiel().skills);

    const entwurf = migriere({ ...rest, status: 'erstellung', schema: 1 });
    expect(entwurf.erstellung).toEqual({ schritt: 1, ohne_klasse: false, klasse: null, stufe4: null, meister_skills: [], freie_punkte_start: 0, kaeufe: [] });
  });

  it('für jede ältere Schemaversion gibt es einen Schritt', async () => {
    const { MIGRATIONEN } = await import('../src/lib/speicher/migration');
    for (let v = 1; v < SCHEMA; v++) expect(MIGRATIONEN[v], `Migration ${v} → ${v + 1}`).toBeTypeOf('function');
  });
});

describe('Ablage auf dem Gerät', () => {
  it('speichert, lädt, merkt den zuletzt geöffneten und löscht', async () => {
    const ablage = await Ablage.oeffnen('test-ablage-1');
    const a = beispiel();
    const b = { ...neuerCharakter(statIds), name: 'Zweiter' };
    await ablage.speichern(a);
    await ablage.speichern(b);
    await ablage.setzeZuletztGeoeffnet(a.id);

    const { charaktere, fehler } = await ablage.alle();
    expect(fehler).toEqual([]);
    expect(charaktere.map((c) => c.name).sort()).toEqual(['Mara Voss', 'Zweiter']);
    expect((await ablage.holen(a.id))?.skills).toEqual(a.skills);
    expect(await ablage.zuletztGeoeffnet()).toBe(a.id);

    await ablage.loeschen(a.id);
    expect(await ablage.holen(a.id)).toBeUndefined();
    expect(await ablage.zuletztGeoeffnet()).toBeUndefined();
    ablage.schliessen();
  });

  it('Einstellungen mit Standard „System“', async () => {
    const ablage = await Ablage.oeffnen('test-ablage-2');
    expect((await ablage.einstellungen()).darstellung).toBe('system');
    expect((await ablage.einstellungen()).reiterEingeklappt).toBe(false);
    await ablage.speichereEinstellungen({ darstellung: 'dunkel', wuerfeln: { abweichung: 'hand' }, reiterEingeklappt: true, laschenHoehe: 0.6 });
    expect(await ablage.einstellungen()).toEqual({ darstellung: 'dunkel', wuerfeln: { abweichung: 'hand' }, reiterEingeklappt: true, laschenHoehe: 0.6 });
    ablage.schliessen();
  });

  it('ältere Einstellungen ohne Reiter-Angabe: Reiter ausgeklappt', async () => {
    const ablage = await Ablage.oeffnen('test-ablage-3');
    await ablage.speichereEinstellungen({ darstellung: 'hell', wuerfeln: {} } as unknown as Parameters<typeof ablage.speichereEinstellungen>[0]);
    expect((await ablage.einstellungen()).reiterEingeklappt).toBe(false);
    expect((await ablage.einstellungen()).laschenHoehe).toBe(0);
    ablage.schliessen();
  });
});
