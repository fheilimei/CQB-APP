// Tests für die Wurfaktion (Regelwerk: Kampfsystem, Werfen; Sprengwirkung, Landepunkt und Zündung; konzept.md § 3.8a).
import { describe, expect, it } from 'vitest';
import { bewegen, lageWaehlen } from '../src/lib/regeln/aktionen';
import { gefechtStarten } from '../src/lib/regeln/gefecht';
import { gefechtVon, probeStellen } from '../src/lib/regeln/probenrechner';
import {
  bandSteps, brauchtW8, kochenMoeglich, SONSTIGES, wurfAuswerten, wurfgegenstaende, wurfReichweitenSteps, wurfStellen,
  wurfUebernehmen, wurfweitenSteps, type Wurfeinstellung, type Wurfgegenstand
} from '../src/lib/regeln/werfen';
import { neuerCharakter, type Charakter, type Gefecht } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();

function fertig(perks: string[] = []): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  for (const id of Object.keys(c.stats)) c.stats[id] = { rang: 'C', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
  return {
    ...c, status: 'fertig', erstellung: null, name: 'Mara', perks,
    ausruestung: {
      ...c.ausruestung,
      nahkampfwaffen: [
        { id: 'n1', waffe: 'wurfmesser', trageort: 'guertel', anzahl: 2 },
        { id: 'n2', waffe: 'bajonett', trageort: 'guertel' },
        { id: 'n3', waffe: 'schlagring', trageort: 'tasche' }
      ],
      vorrat: [{ id: 'm67', anzahl: 1, trageort: 'weste' }, { id: 'm406_he', anzahl: 3, trageort: 'weste' }]
    }
  };
}
const imGefecht = (c: Charakter) => gefechtStarten(c, false, 'erfolg', d);
const g = (c: Charakter) => gefechtVon(c) as Gefecht;
const mitBand = (c: Charakter, band: string) => lageWaehlen(c, 'entfernung', band);
const gegenstand = (c: Charakter, name: string) => wurfgegenstaende(c, d).find((x) => x.name.includes(name)) as Wurfgegenstand;
const ohne: Wurfeinstellung = { ansage: 'keine', ansage_zone: null, kochen: false };

describe('Gegenstände', () => {
  it('nur werfbare Nahkampfwaffen (je Variante), Granaten zum Werfen aus dem Vorrat und immer „sonstiger Gegenstand“', () => {
    const namen = wurfgegenstaende(fertig(), d).map((x) => x.name);
    expect(namen.some((n) => n.includes('Wurfmesser'))).toBe(true);
    expect(namen.some((n) => n.includes('Schlagring'))).toBe(false); // Wurf n/A
    expect(namen.filter((n) => n.includes('Bajonett'))).toHaveLength(1); // aufgepflanzt nicht werfbar
    expect(namen.some((n) => n.includes('M67'))).toBe(true);
    expect(wurfgegenstaende(fertig(), d).some((x) => x.art === 'sprengwaffe' && x.eintrag === 'm406_he')).toBe(false); // Geschoss
    expect(wurfgegenstaende(fertig(), d).at(-1)!.id).toBe(SONSTIGES);
  });

  it('Anzahl 0 erscheint nicht', () => {
    const c = fertig();
    c.ausruestung.vorrat = [{ id: 'm67', anzahl: 0, trageort: 'weste' }];
    expect(wurfgegenstaende(c, d).some((x) => x.art === 'sprengwaffe')).toBe(false);
  });
});

describe('Malsteps aus Wurfweite und Wurf-Reichweite', () => {
  it('bis zur genauen Wurfweite keine, ein Band darüber 2 Malsteps, weiter nicht möglich', () => {
    expect(wurfweitenSteps('bedraengt', 'nah', d)).toEqual([]);
    expect(wurfweitenSteps('nah', 'nah', d)).toEqual([]);
    expect(wurfweitenSteps('mittel', 'nah', d)).toEqual([expect.objectContaining({ malsteps: 2 })]);
    expect(wurfweitenSteps('weit', 'nah', d)).toBeNull();
  });

  it('Wurf-Reichweite der Waffe je Band; n/A = nicht werfbar', () => {
    const km = d.nahkampfwaffen.eintraege.find((w) => w.id === 'kampfmesser')!.wurf;
    expect(wurfReichweitenSteps(km, 'nah', d)).toEqual([expect.objectContaining({ malsteps: 2 })]);
    expect(wurfReichweitenSteps(km, 'weit', d)).toBeNull();
    const wm = d.nahkampfwaffen.eintraege.find((w) => w.id === 'wurfmesser')!.wurf;
    expect(wurfReichweitenSteps(wm, 'nah', d)).toEqual([]);
  });

  it('Wurfmesser auf mittel mit Wurfweite nah: 2 (Wurfweite) + 2 (Wurf-Reichweite); Granate nur Wurfweite', () => {
    const c = fertig();
    const sum = (q: { malsteps?: number }[] | null) => q?.reduce((s, x) => s + (x.malsteps ?? 0), 0);
    expect(sum(bandSteps(gegenstand(c, 'Wurfmesser'), 'mittel', 'nah', d))).toBe(4);
    expect(sum(bandSteps(gegenstand(c, 'M67'), 'mittel', 'nah', d))).toBe(2);
    expect(bandSteps(gegenstand(c, 'M67'), 'weit', 'nah', d)).toBeNull();
  });

  it('Wurfarm I verschiebt die genaue Wurfweite um ein Band', () => {
    const c = imGefecht({ ...fertig(['wurfarm_1']) });
    const v = wurfStellen(c, d, gegenstand(c, 'M67'), ohne);
    expect(v.wurfweite).toBe('mittel');
  });
});

describe('Wurfprobe', () => {
  it('Agility mit Skill Granaten bzw. Wurfwaffen; ohne Entfernung gesperrt', () => {
    const c = imGefecht(fertig());
    const v = wurfStellen(c, d, gegenstand(c, 'M67'), ohne);
    expect(v.anfrage.stat).toBe('agility');
    expect(v.anfrage.skill).toBe('granaten');
    expect(v.sperre).toBe('entfernung');
    expect(wurfStellen(c, d, gegenstand(c, 'Wurfmesser'), ohne).anfrage.skill).toBe('wurfwaffen');
  });

  it('Kochen lassen nur mit Zeitzünder: 1 Malstep', () => {
    const c = mitBand(imGefecht(fertig()), 'nah');
    const m67 = gegenstand(c, 'M67');
    expect(kochenMoeglich(m67)).toBe(true);
    expect(kochenMoeglich(gegenstand(c, 'Wurfmesser'))).toBe(false);
    const v = wurfStellen(c, d, m67, { ...ohne, kochen: true });
    expect(v.anfrage.zusatz).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'kochen', malsteps: 1 })]));
    expect(v.sperre).toBeNull();
  });

  it('Ansage nur bei Wurfwaffen; „Waffe aufgelegt“ gibt es beim Werfen nicht', () => {
    let c = mitBand(imGefecht(fertig()), 'nah');
    c = lageWaehlen(c, 'schuetze', ['aufgelegt']);
    const wm = wurfStellen(c, d, gegenstand(c, 'Wurfmesser'), { ...ohne, ansage: 'rumpf' });
    expect(wm.anfrage.zusatz).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ansage' })]));
    expect(wm.anfrage.fest!.some((q) => q.id === 'lage:aufgelegt')).toBe(false);
    const gr = wurfStellen(c, d, gegenstand(c, 'M67'), { ...ohne, ansage: 'rumpf' });
    expect(gr.anfrage.zusatz!.some((q) => q.id === 'ansage')).toBe(false);
    expect(gr.ansage_moeglich).toBe(false);
  });

  it('eigene Bewegung bringt Malsteps', () => {
    const c = bewegen(mitBand(imGefecht(fertig()), 'nah'), 'laufen', d);
    const v = wurfStellen(c, d, gegenstand(c, 'Wurfmesser'), ohne);
    expect(v.anfrage.zusatz).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'eigene_bewegung', malsteps: 2 })]));
    expect(probeStellen(c, d, { ...v.anfrage, braucht_sicht: true }).wert).not.toBeNull();
  });

  it('Ziel im Nahkampf: Fehlwurf mit Wurfwaffe trifft einen Beteiligten, Granate nicht', () => {
    const c = lageWaehlen(mitBand(imGefecht(fertig()), 'nah'), 'ziel_bewegung', 'ziel_nahkampf');
    expect(wurfStellen(c, d, gegenstand(c, 'Wurfmesser'), ohne).nahkampf).toBe(true);
    expect(wurfStellen(c, d, gegenstand(c, 'M67'), ohne).nahkampf).toBe(false);
  });
});

describe('Auswertung', () => {
  it('Wurfwaffe: Erfolg trifft die Zone des W8, Schaden wie ein Nahkampftreffer; Misserfolg daneben', () => {
    const c = mitBand(imGefecht(fertig()), 'nah');
    const v = wurfStellen(c, d, gegenstand(c, 'Wurfmesser'), ohne);
    expect(brauchtW8(v, ohne, 'erfolg')).toBe(true);
    const b = wurfAuswerten(c, d, v, ohne, 'erfolg', 8);
    expect(b.zone).toBe(d.koerperzonen.eintraege.find((z) => z.w8 === 8)!.id);
    expect(b.krit).toBe(false);
    expect(b.treffer).toEqual(expect.objectContaining({ dk: expect.any(Number) }));
    expect(wurfAuswerten(c, d, v, ohne, 'misserfolg', null).zone).toBeNull();
    expect(brauchtW8(v, ohne, 'misserfolg')).toBe(false);
  });

  it('Wurfwaffe mit Ansage Zone: kein W8, Krit trifft die angesagte Zone kritisch', () => {
    const c = mitBand(imGefecht(fertig()), 'nah');
    const s: Wurfeinstellung = { ansage: 'zone', ansage_zone: 'kopf', kochen: false };
    const v = wurfStellen(c, d, gegenstand(c, 'Wurfmesser'), s);
    expect(brauchtW8(v, s, 'krit')).toBe(false);
    const b = wurfAuswerten(c, d, v, s, 'krit', null);
    expect(b).toEqual(expect.objectContaining({ zone: 'kopf', krit: true }));
  });

  it('Granate: Krit genau, Erfolg bedrängt, Misserfolg nah mit Richtung des W8', () => {
    const c = mitBand(imGefecht(fertig()), 'nah');
    const v = wurfStellen(c, d, gegenstand(c, 'M67'), ohne);
    expect(wurfAuswerten(c, d, v, ohne, 'krit', null).landepunkt!.text).toBe(d.regeln.sprengwirkung.landepunkt.krit);
    expect(wurfAuswerten(c, d, v, ohne, 'erfolg', null).landepunkt!.richtung).toBeNull();
    expect(brauchtW8(v, ohne, 'misserfolg')).toBe(true);
    const m = wurfAuswerten(c, d, v, ohne, 'misserfolg', 3);
    expect(m.landepunkt).toEqual({ text: d.regeln.sprengwirkung.landepunkt.misserfolg, richtung: 'links' });
  });

  it('Kochen lassen senkt die Verzögerung um 1 (M67: 1 → 0, detoniert beim Landen)', () => {
    const c = mitBand(imGefecht(fertig()), 'nah');
    const gg = gegenstand(c, 'M67');
    expect(wurfAuswerten(c, d, wurfStellen(c, d, gg, ohne), ohne, 'erfolg', null).verzoegerung).toBe(1);
    const k = { ...ohne, kochen: true };
    expect(wurfAuswerten(c, d, wurfStellen(c, d, gg, k), k, 'erfolg', null).verzoegerung).toBe(0);
  });
});

describe('Übernehmen', () => {
  it('Main −1, Granate −1 (Eintrag bleibt), Auslöser geschossen (R36), Protokoll', () => {
    const c = mitBand(imGefecht(fertig()), 'nah');
    const n = wurfUebernehmen(c, d, gegenstand(c, 'M67'), 'main', 'Wurf');
    expect(g(n).verbraucht.main).toBe(1);
    expect(n.ausruestung.vorrat.find((v) => v.id === 'm67')!.anzahl).toBe(0);
    expect(g(n).ausloeser_diese_runde).toContain('geschossen');
    expect(g(n).protokoll.at(-1)).toEqual(expect.objectContaining({ art: 'aktion', text: 'Wurf' }));
  });

  it('Wurfwaffe als Break: Break −1, Anzahl 2 → 1; sonstiger Gegenstand ändert die Ausrüstung nicht', () => {
    const c = mitBand(imGefecht(fertig(['quickthrow'])), 'nah');
    const n = wurfUebernehmen(c, d, gegenstand(c, 'Wurfmesser'), 'break', 'Wurf');
    expect(g(n).verbraucht.break).toBe(1);
    expect(n.ausruestung.nahkampfwaffen.find((x) => x.id === 'n1')!.anzahl).toBe(1);
    const s = wurfUebernehmen(c, d, gegenstand(c, 'sonstiger'), 'main', 'Wurf');
    expect(s.ausruestung).toEqual(c.ausruestung);
  });
});
