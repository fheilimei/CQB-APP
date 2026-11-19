import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { Ablage } from '../src/lib/speicher/ablage';
import { dateiname, exportiereText, importiereText } from '../src/lib/speicher/austausch';
import { neueErstellung, neuerCharakter, SCHEMA, type Charakter } from '../src/lib/speicher/charakter';
import { ImportFehler, migriere } from '../src/lib/speicher/migration';
import { deckungZonen } from '../src/lib/regeln/gefecht';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();
const statIds = d.stats.eintraege.map((s) => s.id);

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
  c.spielstand.wunden = [{ id: 'w1', zone: 'bein_r', schaden: 3, kritisch: false, blutung: { status: 'gestoppt', frist_ende: null }, versorgt: 'druckverband', nachsorge: null, ruhetage_geheilt: 0 }];
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
    expect(importiereText(exportiereText(c), d)).toEqual(c);
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
    expect(() => importiereText('kein json', d)).toThrow(ImportFehler);
    expect(() => importiereText('[1,2]', d)).toThrow('keinen Charakter');
    expect(() => importiereText('{"name":"x"}', d)).toThrow('Schemaversion fehlt');
  });

  it('lehnt Dateien aus einer neueren App-Version ab', () => {
    const c = { ...beispiel(), schema: SCHEMA + 1 };
    expect(() => importiereText(JSON.stringify(c), d)).toThrow('neueren App-Version');
  });
});

describe('Migration', () => {
  it('lässt aktuelle Charaktere unverändert', () => {
    const c = beispiel();
    expect(migriere(c, d)).toEqual(c);
  });

  it('wendet Schritte der Reihe nach an (1 → 2 → 3)', () => {
    const alt = { ...beispiel(), schema: 1 } as Record<string, unknown>;
    const schritte = {
      1: (c: Record<string, unknown>) => ({ ...c, notizen: `${c.notizen}a` }),
      2: (c: Record<string, unknown>) => ({ ...c, notizen: `${c.notizen}b` })
    };
    const neu = migriere(alt, d, 3, schritte);
    expect(neu.schema).toBe(3);
    expect(neu.notizen).toBe('ab');
    expect(alt.schema).toBe(1);
  });

  it('meldet fehlende Migrationsschritte', () => {
    expect(() => migriere({ ...beispiel(), schema: 1 }, d, 2, {})).toThrow('Keine Migration von Schema 1 auf 2');
  });

  it('Schema 1 → 2: fertiger Charakter bekommt keinen Erstellungsstand, Entwurf einen leeren', () => {
    const { erstellung: _e, vorratslevel_manuell: _v, ...rest } = beispiel();
    const fertig = migriere({ ...rest, schema: 1 }, d, 2);
    expect(fertig.schema).toBe(2);
    expect(fertig.erstellung).toBeNull();
    expect(fertig.vorratslevel_manuell).toBeNull();
    expect(fertig.skills).toEqual(beispiel().skills);

    const entwurf = migriere({ ...rest, status: 'erstellung', schema: 1 }, d, 2);
    expect(entwurf.erstellung).toEqual({ schritt: 1, ohne_klasse: false, klasse: null, stufe4: null, meister_skills: [], freie_punkte_start: 0, kaeufe: [], korb: neueErstellung().korb });
  });

  it('Schema 2 → 3: Deckung zieht vom Gefecht in den Spielstand', () => {
    const b = beispiel();
    const { deckung: _d, ...sp } = b.spielstand;
    const deckung = { wert: 2, zonen: ['bein_r', 'bein_l'], art: 'autotuer', getippt: [] };
    const imGefecht = migriere({ ...b, schema: 2, spielstand: { ...sp, gefecht: { aktiv: true, stand: 'stehen', deckung } } }, d, 3);
    expect(imGefecht.schema).toBe(3);
    expect(imGefecht.spielstand.deckung).toEqual(deckung);
    expect(imGefecht.spielstand.gefecht).toEqual({ aktiv: true, stand: 'stehen' });
    const inRuhe = migriere({ ...b, schema: 2, spielstand: { ...sp, gefecht: { aktiv: false } } }, d, 3);
    expect(inRuhe.spielstand.deckung).toBeNull();
    expect(inRuhe.spielstand.gefecht).toEqual({ aktiv: false });
  });

  it('Schema 3 → 4: Deckungskante entfällt, alle verdeckten Zonen gelten als angetippt', () => {
    const b = beispiel();
    const alt = { wert: 2, zonen: ['brust', 'bauch', 'unterleib', 'rumpf', 'arm_r', 'arm_l', 'bein_r', 'bein_l'], art: 'autotuer', kante: { richtung: 'unten', stufe: 3 }, getippt: ['kopf'] };
    const c = migriere({ ...b, schema: 3, spielstand: { ...b.spielstand, deckung: alt } }, d, 4);
    expect(c.schema).toBe(4);
    expect(c.spielstand.deckung).toEqual({ wert: 2, zonen: alt.zonen, art: 'autotuer', getippt: ['kopf', ...alt.zonen] });
    // Die Figur zeigt dieselben Zonen wie vorher, dazu den angetippten Kopf.
    expect(new Set(deckungZonen(c.spielstand.deckung!.getippt!, d))).toEqual(new Set(['kopf', ...alt.zonen]));
    const ohne = migriere({ ...b, schema: 3, spielstand: { ...b.spielstand, deckung: null } }, d, 4);
    expect(ohne.spielstand.deckung).toBeNull();
  });

  it('Schema 4 → 5: Decisiveness heißt jetzt Decision, Werte bleiben erhalten', () => {
    const b = beispiel();
    const stats = { ...b.stats } as Record<string, unknown>;
    const eintrag = stats.decision;
    delete stats.decision;
    stats.decisiveness = eintrag;
    const anpassungen = [{ id: 'x', grund: 'Test', aktiv: true, stat: 'decisiveness' }];
    const c = migriere({ ...b, schema: 4, stats, anpassungen }, d, 5);
    expect(c.schema).toBe(5);
    expect(c.stats.decision).toEqual(eintrag);
    expect('decisiveness' in c.stats).toBe(false);
    expect((c.anpassungen[0] as unknown as Record<string, unknown>).stat).toBe('decision');
    expect(JSON.stringify(c)).not.toContain('decisiveness');
  });

  it('Schema 5 → 6: Munitionstyp der Waffe gilt für ihre Magazine; lose Patronen nach Kaliber; Zustand für alles Dauerhafte', () => {
    const b = beispiel();
    const alt = {
      ...b.ausruestung,
      waffen: [
        { id: 'wf1', waffe: 'ak47', munitionstyp: 'HP', im_magazin: 26, reserve: [30, 12], lose_patronen: 40, leere_magazine: 1, zustand: 'B',
          aufsaetze: ['reflexvisier'], ladehemmung: null, trageort: 'schlinge' },
        { id: 'wf2', waffe: 'ak47', munitionstyp: 'HP', im_magazin: 10, reserve: [], lose_patronen: 5, zustand: 'A',
          aufsaetze: [], ladehemmung: null, trageort: 'schlinge' },
        { id: 'wf3', waffe: 'sw_model_10', munitionstyp: 'FMJ', im_magazin: 6, reserve: [], lose_patronen: 0,
          zubehoer: [{ art: 'schnelllader', gefuellt: 2, leer: 1 }], zustand: 'A', aufsaetze: [], ladehemmung: null, trageort: 'holster' },
        { id: 'wf4', waffe: 'rpg7', munitionstyp: '', im_magazin: 0, reserve: [], zustand: 'A', aufsaetze: [], ladehemmung: null, trageort: 'ruecken' }
      ],
      nahkampfwaffen: [{ id: 'nk1', waffe: 'kampfmesser', trageort: 'guertel', anzahl: 1 }],
      ruestung: ['schutzanzug'],
      schild: 'ballistischer_schild'
    };
    delete (alt as Record<string, unknown>).munition;
    delete (alt as Record<string, unknown>).aufsaetze;
    const c = migriere({ ...b, schema: 5, ausruestung: alt }, d, 6);
    expect(c.schema).toBe(6);
    const [ak, ak2, revolver, rpg] = c.ausruestung.waffen;
    expect(ak).toEqual({ id: 'wf1', waffe: 'ak47', munitionstyp: 'HP', im_magazin: 26, magazin_zustand: 'A', zustand: 'B',
      magazine: [{ inhalt: 30, typ: 'HP', zustand: 'A' }, { inhalt: 12, typ: 'HP', zustand: 'A' }, { inhalt: 0, typ: '', zustand: 'A' }],
      zubehoer: [], aufsaetze: [{ id: 'reflexvisier', zustand: 'A' }], ladehemmung: null, trageort: 'schlinge' });
    expect(revolver!.zubehoer).toEqual([
      { art: 'schnelllader', inhalt: 6, typ: 'FMJ', zustand: 'A' }, { art: 'schnelllader', inhalt: 6, typ: 'FMJ', zustand: 'A' },
      { art: 'schnelllader', inhalt: 0, typ: '', zustand: 'A' }]);
    expect(rpg).toMatchObject({ munitionstyp: '', magazine: [], zubehoer: [] });
    expect(ak2!.magazine).toEqual([]);
    // Beide AK-47 haben das Kaliber 7.62x39: ihre losen HP-Patronen liegen zusammen.
    expect(c.ausruestung.munition).toEqual([{ kaliber: '762x39', typ: 'HP', anzahl: 45 }]);
    expect(c.ausruestung.aufsaetze).toEqual([]);
    expect(c.ausruestung.nahkampfwaffen[0]!.zustand).toBe('A');
    expect(c.ausruestung.ruestung).toEqual([{ id: 'schutzanzug', zustand: 'A' }]);
    expect(c.ausruestung.schild).toEqual({ id: 'ballistischer_schild', zustand: 'A' });
    expect(JSON.stringify(c)).not.toMatch(/lose_patronen|leere_magazine|reserve|gefuellt/);
  });

  it('Schema 6 → 7: ein Entwurf bekommt einen leeren Korb, ein fertiger Charakter bleibt gleich', () => {
    const b = beispiel();
    const { korb: _k, ...alt } = neueErstellung();
    const entwurf = migriere({ ...b, schema: 6, status: 'erstellung', erstellung: alt }, d, 7);
    expect(entwurf.erstellung!.korb).toEqual({ kauf: [], verhandlung: { ergebnis: 'keine', krit: false }, preis_sl: null });
    const fertig = migriere({ ...b, schema: 6 }, d, 7);
    expect(fertig).toEqual({ ...b, schema: 7 });
  });

  it('Schema 5 → 6 braucht die Spieldaten', () => {
    expect(() => migriere({ ...beispiel(), schema: 5 })).toThrow('Spieldaten');
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

    const { charaktere, fehler } = await ablage.alle(d);
    expect(fehler).toEqual([]);
    expect(charaktere.map((c) => c.name).sort()).toEqual(['Mara Voss', 'Zweiter']);
    expect((await ablage.holen(a.id, d))?.skills).toEqual(a.skills);
    expect(await ablage.zuletztGeoeffnet()).toBe(a.id);

    await ablage.loeschen(a.id);
    expect(await ablage.holen(a.id, d)).toBeUndefined();
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
