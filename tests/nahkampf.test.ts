// Tests für den Nahkampf, eingehend und ausgehend (Regelwerk: Kampfsystem, Nahkampf; konzept.md § 3.8b).
import { describe, expect, it } from 'vitest';
import { pruefeDaten } from '../src/lib/daten/pruefen';
import { konzentrationSetzen, rundeZuruecksetzen, standWechseln } from '../src/lib/regeln/aktionen';
import { gefechtStarten, leiterSetzen } from '../src/lib/regeln/gefecht';
import {
  angriffEintragen, eigeneKampfkunst, gegnerKampfkunst, gegnerWirkungAnwenden, malstepsDesGegners, nahkampfTreffer,
  nahkampfwaffenWahl, ueberlegen, verteidigungsSteps, wirkungsFolge, type Wirkung
} from '../src/lib/regeln/nahkampf';
import { gefechtVon, probeStellen } from '../src/lib/regeln/probenrechner';
import { ausgang, trefferUebernehmen } from '../src/lib/regeln/wunden';
import { alsBreak, angriffsSteps, angriffsTreffer, angriffsWaffen, angriffUebernehmen } from '../src/lib/regeln/nahkampf';
import { neuerWaffenEintrag } from '../src/lib/regeln/waffen';
import { neuerCharakter, type Charakter, type Gefecht } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();

function fertig(perks: string[] = []): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  for (const id of Object.keys(c.stats)) c.stats[id] = { rang: 'C', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
  return { ...c, status: 'fertig', erstellung: null, name: 'Mara', perks };
}
const imGefecht = (c: Charakter, stand = 0) => leiterSetzen(gefechtStarten(c, false, 'erfolg', d), stand, d);
const g = (c: Charakter) => gefechtVon(c) as Gefecht;
const wirkung = (id: string) => d.regeln.nahkampf.wirkungen.find((w) => w.id === id) as Wirkung;
const lage = (eigen: string, gegner: string, lang = false) => ({ eigenerStand: eigen, gegnerStand: gegner, langeWaffeInArmeslaenge: lang });

describe('Stand im Nahkampf', () => {
  it('Liegen schlägt Stehen, Stehen schlägt Hocke, Hocke schlägt Liegen; gleicher Stand: keiner', () => {
    expect(ueberlegen('liegen', 'stehen', d)).toBe('a');
    expect(ueberlegen('stehen', 'hocke', d)).toBe('a');
    expect(ueberlegen('hocke', 'liegen', d)).toBe('a');
    expect(ueberlegen('stehen', 'liegen', d)).toBe('b');
    expect(ueberlegen('hocke', 'hocke', d)).toBeNull();
  });

  it('Gegner mit überlegenem Stand gibt dir 1 Malstep; mit eigenem überlegenem Stand hat er 1 Malstep', () => {
    const c = fertig();
    expect(verteidigungsSteps(c, lage('hocke', 'stehen'), d)).toEqual([expect.objectContaining({ id: 'gegner_ueberlegen', malsteps: 1 })]);
    expect(malstepsDesGegners(lage('hocke', 'stehen'), d)).toBe(0);
    expect(verteidigungsSteps(c, lage('stehen', 'hocke'), d)).toEqual([]);
    expect(malstepsDesGegners(lage('stehen', 'hocke'), d)).toBe(1);
  });
});

describe('Verteidigung', () => {
  it('lange Waffe in Armeslänge: 1 Malstep', () => {
    expect(verteidigungsSteps(fertig(), lage('stehen', 'stehen', true), d)).toEqual([expect.objectContaining({ id: 'lange_waffe', malsteps: 1 })]);
  });

  it('erste Verteidigung der Runde ohne Malstep, jede weitere 1 Malstep mehr; Nächste Runde setzt zurück', () => {
    let c = imGefecht(fertig());
    expect(verteidigungsSteps(c, lage('stehen', 'stehen'), d)).toEqual([]);
    c = angriffEintragen(c, true, d);
    expect(verteidigungsSteps(c, lage('stehen', 'stehen'), d)).toEqual([expect.objectContaining({ malsteps: 1 })]);
    c = angriffEintragen(c, true, d);
    expect(verteidigungsSteps(c, lage('stehen', 'stehen'), d)).toEqual([expect.objectContaining({ malsteps: 2 })]);
    const neu = rundeZuruecksetzen(g(c), d);
    expect(neu.verteidigungen).toBe(0);
  });

  it('nicht wahrgenommen: keine Verteidigung, sie zählt nicht und Konzentration bleibt', () => {
    let c = konzentrationSetzen(imGefecht(fertig()), 'voll');
    c = angriffEintragen(c, false, d);
    expect(g(c).verteidigungen).toBe(0);
    expect(g(c).konzentration).toBe('voll');
    expect(g(c).ausloeser_diese_runde).toContain('nahkampf');
  });

  it('Verteidigung unterbricht eine Aktion mit Konzentration und setzt „im Nahkampf angegriffen“ nur einmal', () => {
    let c = konzentrationSetzen(imGefecht(fertig()), 'leicht');
    c = angriffEintragen(angriffEintragen(c, true, d), true, d);
    expect(g(c).konzentration).toBeNull();
    expect(g(c).ausloeser_diese_runde.filter((x) => x === 'nahkampf')).toHaveLength(1);
  });

  it('außerhalb des Gefechts ändert der Angriff nichts', () => {
    const c = fertig();
    expect(angriffEintragen(c, true, d)).toBe(c);
  });

  it('die Probe ist Agility + Nahkampf mit den Steps der Verteidigung', () => {
    const c = imGefecht(fertig());
    const p = probeStellen(c, d, { stat: d.regeln.nahkampf.stat, skill: d.regeln.nahkampf.skill, probe: 'nahkampf', fest: verteidigungsSteps(c, lage('hocke', 'stehen'), d) });
    const ohne = probeStellen(c, d, { stat: 'agility', skill: 'nahkampf', probe: 'nahkampf' });
    expect(p.wert!.zielwert).toBeLessThan(ohne.wert!.zielwert);
  });
});

describe('Schaden einer Nahkampfwaffe', () => {
  it('MW = Nahkampfschaden + MW der Waffe; stumpf ohne DK', () => {
    const liste = nahkampfwaffenWahl(d);
    const messer = liste.find((w) => w.id === 'kampfmesser')!;
    expect(nahkampfTreffer(messer, 1)).toEqual({ dk: 1, mw: 2 });
    const faust = liste.find((w) => w.id === 'koerper')!;
    expect(nahkampfTreffer(faust, 1)).toEqual({ dk: null, mw: 1 });
  });

  it('Waffen mit Varianten erscheinen je Variante (Klappspaten Kante scharf, Fläche stumpf)', () => {
    const liste = nahkampfwaffenWahl(d);
    expect(liste.find((w) => w.id === 'klappspaten:kante')).toMatchObject({ art: 'scharf', dk: 1, mw: 2 });
    expect(liste.find((w) => w.id === 'klappspaten:flaeche')).toMatchObject({ art: 'stumpf', dk: null });
    expect(liste.some((w) => w.id === 'klappspaten')).toBe(false);
  });

  it('stumpfer Treffer ist ein Wuchttreffer und gibt eine Prellung', () => {
    const c = trefferUebernehmen(fertig(), { zone: 'bauch', dk: null, mw: 1, kugeln: 1, krit: false, deckung: null }, { quelle: 'Nahkampf', schuss: false }, d);
    expect(c.spielstand.prellungen).toBe(1);
    expect(c.spielstand.wunden).toHaveLength(0);
  });

  it('Nahkampftreffer setzt im Gefecht nicht „beschossen“', () => {
    const c0 = imGefecht(fertig());
    const a = ausgang(c0, { zone: 'brust', dk: 1, mw: 2, kugeln: 1, krit: false, deckung: null }, d);
    const c = trefferUebernehmen(c0, { zone: 'brust', dk: 1, mw: 2, kugeln: 1, krit: false, deckung: null }, { quelle: 'Nahkampf', schuss: false }, d);
    expect(a.art).toBe('durchschlag');
    expect(g(c).ausloeser_diese_runde).not.toContain('beschossen');
    expect(g(c).ausloeser_diese_runde).toContain('getroffen');
  });
});

describe('Kampfkunst-Wirkungen', () => {
  it('eigene Wirkung nur mit überlegenem Stand und passendem Perk', () => {
    const c = fertig(['judo', 'brazilian_jiu_jitsu']);
    expect(eigeneKampfkunst(c, 'hocke', 'liegen', d)).toEqual([{ wirkung: wirkung('fixieren'), perks: ['judo', 'brazilian_jiu_jitsu'] }]);
    expect(eigeneKampfkunst(c, 'stehen', 'hocke', d).map((x) => x.wirkung.id)).toEqual(['umreissen']);
    expect(eigeneKampfkunst(c, 'hocke', 'stehen', d)).toEqual([]);
    expect(eigeneKampfkunst(fertig(), 'stehen', 'hocke', d)).toEqual([]);
  });

  it('der Gegner kann nur mit überlegenem Stand eine Wirkung ansagen', () => {
    expect(gegnerKampfkunst(lage('hocke', 'stehen'), d)).toHaveLength(4);
    expect(gegnerKampfkunst(lage('stehen', 'stehen'), d)).toEqual([]);
  });

  it('Umreißen legt dich hin, ohne Aktion', () => {
    const c = gegnerWirkungAnwenden(imGefecht(fertig()), wirkung('umreissen'), d);
    expect(g(c).stand).toBe('liegen');
    expect(g(c).verbraucht.stand).toBe(0);
  });

  it('Umreißen, wenn du schon liegst: keine Änderung', () => {
    const c0 = standWechseln(imGefecht(fertig()), 'liegen', 'stand', d);
    expect(wirkungsFolge(c0, wirkung('umreissen'), d).stand).toBeNull();
  });

  it('Erschüttern: Stagger (Break verloren, Konzentration unterbrochen, Auslöser)', () => {
    const c = gegnerWirkungAnwenden(konzentrationSetzen(imGefecht(fertig()), 'leicht'), wirkung('erschuettern'), d);
    expect(g(c).break_verloren).toBe(true);
    expect(g(c).konzentration).toBeNull();
    expect(g(c).ausloeser_diese_runde).toContain('stagger');
  });

  it('R34: Erschüttern mit Schmerz ignorieren (Adrenalin 1): kein Stagger', () => {
    const c0 = imGefecht(fertig(), 1);
    expect(wirkungsFolge(c0, wirkung('erschuettern'), d)).toMatchObject({ stagger: false, stagger_verhindert: true });
    expect(gegnerWirkungAnwenden(c0, wirkung('erschuettern'), d)).toBe(c0);
  });

  it('Fixieren und Entwaffnen ändern nichts (nur Hinweis)', () => {
    const c0 = imGefecht(fertig());
    expect(gegnerWirkungAnwenden(c0, wirkung('fixieren'), d)).toBe(c0);
    expect(gegnerWirkungAnwenden(c0, wirkung('entwaffnen'), d)).toBe(c0);
  });
});

describe('Datenprüfung Nahkampf', () => {
  it('die Spieldaten bestehen die Prüfung', () => {
    expect(pruefeDaten(d)).toEqual([]);
  });

  it('eine Kampfkunst-Wirkung, die es nicht gibt, fällt auf', () => {
    const kaputt = structuredClone(d);
    kaputt.perks.eintraege.find((p) => p.id === 'judo')!.kampfkunst!.stehen_ueber_hocke = 'Wegtragen';
    expect(pruefeDaten(kaputt).some((f) => f.includes('Wegtragen'))).toBe(true);
  });
});

// ---------- Ausgehend: eigener Nahkampfangriff

function mitSchusswaffe(c: Charakter, id: string): Charakter {
  const e = neuerWaffenEintrag(id, d, `w_${id}`, 'schlinge');
  return { ...c, ausruestung: { ...c.ausruestung, waffen: [e], aktive_waffe: e.id } };
}
const mitNahkampf = (c: Charakter, ...ids: string[]): Charakter =>
  ({ ...c, ausruestung: { ...c.ausruestung, nahkampfwaffen: ids.map((w, i) => ({ id: `n${i}`, waffe: w, trageort: 'guertel', zustand: 'A' })) } });
const alage = (eigen: string, gegner: string, mehr: Partial<{ langeWaffeInArmeslaenge: boolean; ansage: 'keine' | 'rumpf' | 'zone' }> = {}) =>
  ({ eigenerStand: eigen, gegnerStand: gegner, langeWaffeInArmeslaenge: false, ansage: 'keine' as const, ...mehr });

describe('Nahkampfangriff: Waffen', () => {
  it('ohne Ausrüstung nur Körperwaffen', () => {
    expect(angriffsWaffen(fertig(), d).map((w) => w.id)).toEqual(['koerper']);
  });

  it('eigene Nahkampfwaffen erscheinen, Varianten einzeln; Waffen mit Anzahl 0 nicht', () => {
    const c = mitNahkampf(fertig(), 'kampfmesser', 'klappspaten');
    expect(angriffsWaffen(c, d).map((w) => w.id)).toEqual(['koerper', 'kampfmesser', 'klappspaten:kante', 'klappspaten:flaeche']);
    const leer = { ...c, ausruestung: { ...c.ausruestung, nahkampfwaffen: [{ id: 'n0', waffe: 'kampfmesser', trageort: 'guertel', anzahl: 0, zustand: 'A' }] } };
    expect(angriffsWaffen(leer, d).map((w) => w.id)).toEqual(['koerper']);
  });

  it('Kolben und Lauf nur mit aktiver Langwaffe, Pistolengriff nur mit aktiver Pistole', () => {
    expect(angriffsWaffen(mitSchusswaffe(fertig(), 'ak47'), d).map((w) => w.id)).toEqual(['koerper', 'gewehrkolben', 'gewehrlauf']);
    expect(angriffsWaffen(mitSchusswaffe(fertig(), 'makarov'), d).map((w) => w.id)).toEqual(['koerper', 'pistolengriff']);
  });

  it('R35: jede eigene Kampfkunst ist eine eigene Wahl mit den Werten der Körperwaffen, direkt dahinter', () => {
    const c = mitNahkampf(fertig(['judo', 'boxen']), 'kampfmesser');
    const w = angriffsWaffen(c, d);
    expect(w.map((x) => x.id)).toEqual(['koerper', 'kampfkunst:boxen', 'kampfkunst:judo', 'kampfmesser']);
    const koerper = w[0]!;
    expect(w[2]).toMatchObject({ art: koerper.art, laenge: koerper.laenge, mw: koerper.mw, dk: koerper.dk, kampfkunst: 'judo' });
    expect(koerper.kampfkunst).toBeUndefined();
  });

  it('R35: Wirkungen nur der gewählten Kampfkunst', () => {
    const c = fertig(['judo', 'boxen']);
    expect(eigeneKampfkunst(c, 'stehen', 'hocke', d).map((x) => x.wirkung.id).sort()).toEqual(['erschuettern', 'umreissen']);
    expect(eigeneKampfkunst(c, 'stehen', 'hocke', d, 'judo').map((x) => x.wirkung.id)).toEqual(['umreissen']);
    expect(eigeneKampfkunst(c, 'liegen', 'stehen', d, 'boxen')).toEqual([]);
  });

  it('als Breakaction nur mit kurzer (Armeslänge) oder langer Waffe (Abfangen), nicht mit mittlerer', () => {
    expect(alsBreak('kurz', d)).toMatch(/Armeslänge/);
    expect(alsBreak('lang', d)).toMatch(/Abfangen/);
    expect(alsBreak('mittel', d)).toBeNull();
  });
});

describe('Nahkampfangriff: Probe', () => {
  it('Gegner mit überlegenem Stand: 1 Malstep; eigener überlegener Stand: keiner', () => {
    expect(angriffsSteps(alage('hocke', 'stehen'), d)).toEqual([expect.objectContaining({ id: 'gegner_ueberlegen', malsteps: 1 })]);
    expect(angriffsSteps(alage('liegen', 'stehen'), d)).toEqual([]);
    expect(angriffsSteps(alage('stehen', 'stehen'), d)).toEqual([]);
  });

  it('lange Waffe in Armeslänge 1 Malstep; Ansage Rumpf und Zone wie beim Schießen', () => {
    expect(angriffsSteps(alage('stehen', 'stehen', { langeWaffeInArmeslaenge: true }), d)).toEqual([expect.objectContaining({ id: 'lange_waffe', malsteps: 1 })]);
    expect(angriffsSteps(alage('stehen', 'stehen', { ansage: 'rumpf' }), d)).toEqual([expect.objectContaining({ id: 'ansage', malsteps: d.regeln.schiessen.ansage_malsteps.rumpf })]);
    expect(angriffsSteps(alage('stehen', 'stehen', { ansage: 'zone' }), d)).toEqual([expect.objectContaining({ id: 'ansage', malsteps: d.regeln.schiessen.ansage_malsteps.zone })]);
  });

  it('Probe Agility + Nahkampf: Malstep des Stands senkt den Zielwert', () => {
    const c = fertig();
    const ohne = probeStellen(c, d, { stat: 'agility', skill: 'nahkampf', zusatz: angriffsSteps(alage('stehen', 'stehen'), d) }).wert!;
    const mit = probeStellen(c, d, { stat: 'agility', skill: 'nahkampf', zusatz: angriffsSteps(alage('hocke', 'stehen'), d) }).wert!;
    expect(mit.zielwert).toBeLessThan(ohne.zielwert);
  });
});

describe('Nahkampfangriff: Treffer für die SL', () => {
  const w = (id: string) => angriffsWaffen(mitNahkampf(fertig(), 'kampfmesser', 'baseballschlaeger'), d).find((x) => x.id === id)!;

  it('MW = Nahkampfschaden + MW der Waffe; scharf mit DK und Krit der Zone', () => {
    const t = angriffsTreffer(fertig(), w('kampfmesser'), 'kopf', d);
    expect(t).toEqual({ dk: 1, mw: d.regeln.grundwerte.nahkampfschaden + 1, nahkampfschaden: d.regeln.grundwerte.nahkampfschaden, krit_folge: 'Sofort Tod' });
  });

  it('stumpf: keine DK, Krit bringt Stagger; Körperwaffen MW +0', () => {
    expect(angriffsTreffer(fertig(), w('baseballschlaeger'), 'bein_l', d)).toMatchObject({ dk: null, mw: d.regeln.grundwerte.nahkampfschaden + 2, krit_folge: d.regeln.nahkampf.krit_stumpf });
    expect(angriffsTreffer(fertig(), w('koerper'), 'brust', d)).toMatchObject({ dk: null, mw: d.regeln.grundwerte.nahkampfschaden });
  });
});

describe('Nahkampfangriff übernehmen', () => {
  it('Main −1 bzw. Break −1, Eintrag im Protokoll, kein eigener Auslöser', () => {
    const c = imGefecht(fertig());
    const m = angriffUebernehmen(c, 'main', 'Nahkampfangriff');
    expect(g(m).verbraucht.main).toBe(1);
    expect(g(m).ausloeser_diese_runde).toEqual(g(c).ausloeser_diese_runde);
    expect(g(m).protokoll.at(-1)).toMatchObject({ art: 'aktion', text: 'Nahkampfangriff' });
    expect(g(angriffUebernehmen(c, 'break', 'x')).verbraucht.break).toBe(1);
  });
});
