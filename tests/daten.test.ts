import { describe, expect, it } from 'vitest';
import { pruefeDaten } from '../src/lib/daten/pruefen';
import { ladeTestdaten } from './hilfen';

describe('Spieldaten', () => {
  const daten = ladeTestdaten();

  it('bestehen die Datenprüfung', () => {
    expect(pruefeDaten(daten)).toEqual([]);
  });

  it('enthalten alle Klassen des Regelwerks (3 Laufbahnen × 11 Klassen)', () => {
    expect(daten.klassen.eintraege).toHaveLength(33);
    for (const lb of daten.klassen.laufbahnen) {
      const k = daten.klassen.eintraege.filter((x) => x.laufbahn === lb.id);
      expect(k.map((x) => x.stufe).sort()).toEqual([1, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5]);
    }
  });

  it('enthalten neun Stats und fünf Stufen', () => {
    expect(daten.stats.eintraege).toHaveLength(9);
    expect(daten.klassen.stufen.map((s) => s.stufe)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Datenprüfung erkennt Fehler', () => {
  const kopie = () => structuredClone(ladeTestdaten());

  it('doppelte und ungültige IDs', () => {
    const d = kopie();
    d.skills.eintraege.push({ ...d.skills.eintraege[0]! });
    d.perks.eintraege[0]!.id = 'Zäh';
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('doppelte ID');
    expect(fehler).toContain('ungültige ID „Zäh“');
  });

  it('Verweise zwischen Dateien', () => {
    const d = kopie();
    d.skills.eintraege[0]!.stat = 'kraft';
    d.waffen.eintraege[0]!.munition = 'gibt_es_nicht';
    d.klassen.eintraege[0]!.mindestskills = { zaubern: 1 };
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('unbekannter Stat „kraft“');
    expect(fehler).toContain('unbekanntes Kaliber „gibt_es_nicht“');
    expect(fehler).toContain('unbekannter Skill „zaubern“');
  });

  it('Rank-Vorschlag, der nicht zum Rank-Set passt', () => {
    const d = kopie();
    const stats = d.stats.eintraege.map((s) => s.id);
    d.klassen.eintraege[0]!.rank_vorschlag = Object.fromEntries(stats.map((s) => [s, 'S'])) as never;
    expect(pruefeDaten(d).join('\n')).toContain('Rank-Vorschlag passt nicht');
  });

  it('Rank-Vorschlag, der passt', () => {
    const d = kopie();
    const stats = d.stats.eintraege.map((s) => s.id);
    const set = d.klassen.stufen[0]!.rank_set;
    d.klassen.eintraege[0]!.rank_vorschlag = Object.fromEntries(stats.map((s, i) => [s, set[i]])) as never;
    expect(pruefeDaten(d)).toEqual([]);
  });

  it('fehlende Pflichtfelder und falscher Garbenfaktor', () => {
    const d = kopie();
    (d.perks.eintraege[0] as { kurz?: string }).kurz = undefined;
    d.waffen.eintraege.find((w) => w.id === 'ak47')!.feuermodi.VA!.garbenfaktor = 3;
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('Pflichtfeld „kurz“ fehlt');
    expect(fehler).toContain('Garbenfaktor 3 passt nicht');
  });

  it('Zugang, der im Kreis läuft', () => {
    const d = kopie();
    d.klassen.eintraege.find((k) => k.id === 'soldat')!.zugang.wie = 'kommandosoldat';
    expect(pruefeDaten(d).join('\n')).toContain('im Kreis');
  });
});
