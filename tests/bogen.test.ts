// Tests für den Bogen (konzept.md § 3.0b, 3.2–3.5): Step-Reihe, Grundwerte mit Aufschlüsselung,
// Markierung an Stats und Skills, Grundwerte und Anpassungen im Schreibmodus.
import { describe, expect, it } from 'vitest';
import { modifikatorenAn, perkModifikatoren, stepReihe } from '../src/lib/regeln/bogen';
import { anpassen, korrigiere } from '../src/lib/regeln/korrektur';
import { grundwerte, grundwerteAufgeschluesselt } from '../src/lib/regeln/modifikatoren';
import { neuerCharakter, type Charakter } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();
const r = d.regeln;
const JETZT = new Date('2026-11-17T20:00:00Z');

function fertig(extra: Partial<Charakter> = {}): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  for (const id of Object.keys(c.stats)) c.stats[id] = { rang: 'C', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
  return { ...c, status: 'fertig', erstellung: null, name: 'Mara', ...extra };
}

describe('Step-Reihe', () => {
  it.each([
    [79, [79, 67, 50, 33, 18, 8]],
    [54, [54, 46, 34, 22, 12, 6]],
    [35, [35, 30, 22, 15, 8, 4]]
  ])('Statwert %i', (wert, erwartet) => {
    expect(stepReihe(wert, r)).toEqual(erwartet);
  });

  it('endet vor der Grenze „keine Probe“', () => {
    expect(stepReihe(99, r)).toHaveLength(r.steps.keine_probe_ab);
  });
});

describe('Grundwerte mit Aufschlüsselung', () => {
  it('ohne Perks: Startwerte, keine Beiträge', () => {
    const g = grundwerteAufgeschluesselt(fertig(), d);
    expect(g.map((x) => x.id)).toEqual(['hp', 'schmerzresistenz', 'nahkampfschaden', 'wurfweite_band']);
    expect(g.every((x) => x.beitraege.length === 0 && x.hand === null && x.ergebnis === x.start)).toBe(true);
  });

  it('Perks und Anpassungen tragen je eine Zeile bei; inaktive Anpassungen nicht', () => {
    const c = fertig({ perks: ['zaeh_1', 'zaeh_2', 'wurfarm_1'] });
    c.anpassungen = [
      { id: 'a1', ziel: { art: 'grundwert', id: 'hp' }, wirkung: { wert: -1 }, grund: 'alte Verletzung', aktiv: true },
      { id: 'a2', ziel: { art: 'grundwert', id: 'hp' }, wirkung: { wert: 5 }, grund: 'aus', aktiv: false }
    ];
    const hp = grundwerteAufgeschluesselt(c, d).find((x) => x.id === 'hp')!;
    expect(hp.beitraege).toEqual([
      { herkunft: 'perk', quelle: 'zaeh_1', name: 'Zäh I', wert: 1 },
      { herkunft: 'perk', quelle: 'zaeh_2', name: 'Zäh II', wert: 1 },
      { herkunft: 'anpassung', quelle: 'a1', name: 'alte Verletzung', wert: -1 }
    ]);
    expect(hp.ergebnis).toBe(r.grundwerte.hp + 1);
    expect(grundwerte(c, d).wurfweite_band).toBe('mittel');
  });

  it('Wurfweite bleibt im letzten Band', () => {
    const c = fertig();
    c.anpassungen = [{ id: 'a1', ziel: { art: 'grundwert', id: 'wurfweite_band' }, wirkung: { wert: 20 }, grund: 'x', aktiv: true }];
    const baender = r.schiessen.reichweitenbaender;
    expect(grundwerte(c, d).wurfweite_band).toBe(baender[baender.length - 1]!.id);
  });

  it('von Hand gesetzt ersetzt den berechneten Wert; ungültiger Wert zählt nicht', () => {
    const c = fertig({ perks: ['zaeh_1'], grundwerte_manuell: { hp: 4, wurfweite_band: 'gibt_es_nicht' } });
    const g = grundwerteAufgeschluesselt(c, d);
    expect(g[0]).toMatchObject({ berechnet: r.grundwerte.hp + 1, hand: 4, ergebnis: 4 });
    expect(g[3]).toMatchObject({ hand: null, ergebnis: r.grundwerte.wurfweite_band });
  });
});

describe('Markierung und Rückverweis', () => {
  it('Kernschuss markiert den Skill Präzisionsgewehr, eine Anpassung den Stat', () => {
    const c = fertig({ perks: ['kernschuss'] });
    c.anpassungen = [{ id: 'a1', ziel: { art: 'stat', id: 'intellect' }, wirkung: { stepshields: 1 }, grund: 'Ortskenntnis', aktiv: true }];
    expect(modifikatorenAn(c, d, 'skill', 'waffe_praezision').map((m) => m.herkunft)).toEqual(['perk']);
    expect(modifikatorenAn(c, d, 'stat', 'intellect').map((m) => m.name)).toEqual(['Ortskenntnis']);
    expect(modifikatorenAn(c, d, 'stat', 'twitch')).toEqual([]);
  });

  it('Wirkt auf: Modifikatoren eines Perks', () => {
    expect(perkModifikatoren('zaeh_1', d)).toEqual([{ ziel: { art: 'grundwert', id: 'hp' }, wirkung: { wert: 1 } }]);
    expect(perkModifikatoren('gibt_es_nicht', d)).toEqual([]);
  });
});

describe('Schreibmodus: Grundwerte, Hintergrund, Anpassungen', () => {
  it('Grundwert setzen markiert ✎, Zurücksetzen hebt die Markierung auf', () => {
    let c = korrigiere(fertig(), { art: 'grundwert', id: 'schmerzresistenz', wert: 3 }, JETZT);
    expect(grundwerte(c, d).schmerzresistenz).toBe(3);
    expect(c.ueberschrieben).toEqual(['grundwerte.schmerzresistenz']);
    expect(c.protokoll.at(-1)).toMatchObject({ art: 'korrektur', pfad: 'grundwerte.schmerzresistenz', vorher: null, nachher: 3 });
    c = korrigiere(c, { art: 'grundwert', id: 'schmerzresistenz', wert: null }, JETZT);
    expect(c.grundwerte_manuell).toEqual({});
    expect(c.ueberschrieben).toEqual([]);
    expect(grundwerte(c, d).schmerzresistenz).toBe(r.grundwerte.schmerzresistenz);
  });

  it('Hintergrundtext ändern, ohne Markierung', () => {
    const c = korrigiere(fertig(), { art: 'hintergrund', feld: 'geburtsort', wert: 'Marseille' }, JETZT);
    expect(c.hintergrund.geburtsort).toBe('Marseille');
    expect(c.ueberschrieben).toEqual([]);
    expect(c.protokoll.at(-1)).toMatchObject({ pfad: 'hintergrund.geburtsort', nachher: 'Marseille' });
  });

  it('Anpassung anlegen, abschalten, löschen; jeder Schritt protokolliert', () => {
    let c = anpassen(fertig(), { art: 'neu', anpassung: { ziel: { art: 'grundwert', id: 'hp' }, wirkung: { wert: 2 }, grund: 'Bonus der SL' } }, JETZT);
    expect(c.anpassungen).toEqual([{ id: 'a1', ziel: { art: 'grundwert', id: 'hp' }, wirkung: { wert: 2 }, grund: 'Bonus der SL', aktiv: true }]);
    expect(grundwerte(c, d).hp).toBe(r.grundwerte.hp + 2);
    c = anpassen(c, { art: 'aktiv', id: 'a1', aktiv: false }, JETZT);
    expect(grundwerte(c, d).hp).toBe(r.grundwerte.hp);
    c = anpassen(c, { art: 'neu', anpassung: { ziel: { art: 'alle' }, wirkung: { malsteps: 1 }, grund: 'Fluch' } }, JETZT);
    expect(c.anpassungen.map((a) => a.id)).toEqual(['a1', 'a2']);
    c = anpassen(c, { art: 'loeschen', id: 'a1' }, JETZT);
    expect(c.anpassungen.map((a) => a.id)).toEqual(['a2']);
    expect(c.protokoll.map((p) => p.aktion)).toEqual(['neu', 'aktiv', 'neu', 'loeschen']);
    expect(c.protokoll.every((p) => p.art === 'anpassung')).toBe(true);
  });

  it('nichts zu tun: unveränderter Charakter', () => {
    const c = fertig();
    expect(anpassen(c, { art: 'loeschen', id: 'a9' })).toBe(c);
    expect(anpassen(c, { art: 'aktiv', id: 'a9', aktiv: true })).toBe(c);
  });
});
