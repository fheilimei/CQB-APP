// Tests für den Laden (konzept.md § 3.14; Regelwerk: Schusswaffen (tragbar), Zustand: Preis, Verhandeln;
// Stats, Skills und Perks, Beschaffen; Regelfragen R43–R45, R47, R48).
import { describe, expect, it } from 'vitest';
import { kontostand } from '../src/lib/regeln/geld';
import {
  beschaffenAnfrage, eigeneWaffen, kaufAnwenden, passtZuWaffen, kaufPruefen, korbPreis, korbRahmen, NICHT_VERHANDELT, postenText, preisrahmen,
  sortiment, stueckpreis, verhandelnAnfrage, verkaufAnwenden, verkaufPreis, verkaufRahmen, verkaufTeile, wareVon, zugang,
  type KaufPosten, type Verhandlung
} from '../src/lib/regeln/laden';
import { neuerWaffenEintrag } from '../src/lib/regeln/waffen';
import { neuerCharakter, type Charakter } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();
const jetzt = new Date('2026-11-19T20:00:00.000Z');

function figur(geld = 1000, vl: number | null = 2, perks: string[] = []): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  return {
    ...c, status: 'fertig', erstellung: null, vorratslevel_manuell: vl, perks,
    kassenbuch: [{ zeit: jetzt.toISOString(), betrag: geld, art: 'startgeld', grund: '' }]
  };
}
const v = (ergebnis: Verhandlung['ergebnis'], krit = false): Verhandlung => ({ ergebnis, krit });
const ak = d.waffen.eintraege.find((w) => w.id === 'ak47')!.preis; // 250–400

describe('Preisrahmen nach Zustand', () => {
  it('R47: teilt die Spanne in Viertel: A oberstes … D unterstes (AK-47, 250–400)', () => {
    expect(preisrahmen(ak, 'A', d)).toEqual({ min: 363, max: 400 });
    expect(preisrahmen(ak, 'B', d)).toEqual({ min: 325, max: 363 });
    expect(preisrahmen(ak, 'C', d)).toEqual({ min: 288, max: 325 });
    expect(preisrahmen(ak, 'D', d)).toEqual({ min: 250, max: 288 });
  });
  it('R43: Verbrauchsware ohne Zustand hat die ganze Spanne', () => {
    expect(preisrahmen({ min: 15, max: 35 }, null, d)).toEqual({ min: 15, max: 35 });
  });
});

describe('Verhandeln', () => {
  it('Käufer gewinnt → Untergrenze, Händler → Obergrenze, unentschieden und ohne Verhandlung → Mitte', () => {
    expect(stueckpreis(ak, 'B', v('gewonnen'), 'kauf', d)).toBe(325);
    expect(stueckpreis(ak, 'B', v('verloren'), 'kauf', d)).toBe(363);
    expect(stueckpreis(ak, 'B', v('unentschieden'), 'kauf', d)).toBe(344);
    expect(stueckpreis(ak, 'B', NICHT_VERHANDELT, 'kauf', d)).toBe(344);
  });
  it('Krit des Siegers: ein Viertel der Spanne weiter', () => {
    expect(stueckpreis(ak, 'B', v('gewonnen', true), 'kauf', d)).toBe(288);
    expect(stueckpreis(ak, 'B', v('verloren', true), 'kauf', d)).toBe(400);
  });
  it('Krit höchstens bis zur Grenze der Spanne', () => {
    expect(stueckpreis(ak, 'D', v('gewonnen', true), 'kauf', d)).toBe(250);
    expect(stueckpreis(ak, 'A', v('verloren', true), 'kauf', d)).toBe(400);
    expect(stueckpreis({ min: 15, max: 35 }, null, v('gewonnen', true), 'kauf', d)).toBe(15);
  });
  it('Krit bei unentschieden ändert nichts', () => {
    expect(stueckpreis(ak, 'B', v('unentschieden', true), 'kauf', d)).toBe(344);
  });
  it('Verkauf: vertauschte Rollen – gewinnt der Spieler, gilt die Obergrenze', () => {
    expect(stueckpreis(ak, 'B', v('gewonnen'), 'verkauf', d)).toBe(363);
    expect(stueckpreis(ak, 'B', v('verloren'), 'verkauf', d)).toBe(325);
    expect(stueckpreis(ak, 'C', v('gewonnen', true), 'verkauf', d)).toBe(363);
  });
  it('Probe ist Empathy mit Verhandeln', () => {
    expect(verhandelnAnfrage(d)).toMatchObject({ stat: 'empathy', skill: 'verhandeln' });
  });
});

describe('Korb', () => {
  const korb: KaufPosten[] = [
    { ware: 'waffe:ak47', zustand: 'B', menge: 1 },
    { ware: 'munition:762x39:HP', zustand: null, menge: 30 }
  ];
  it('Rahmen und Preis über alle Posten (Munition je 10 Schuss)', () => {
    expect(korbRahmen(korb, d)).toEqual({ min: 325 + 45, max: 363 + 105 });
    expect(korbPreis(korb, v('gewonnen'), d)).toBe(325 + 45);
    expect(korbPreis(korb, NICHT_VERHANDELT, d)).toBe(344 + 75);
  });
  it('R44: beschaffte Ware hat den Preis der SL und verhandelt nicht mit', () => {
    const k: KaufPosten[] = [...korb, { ware: 'munition:762x39:AP', zustand: null, menge: 10, preis_sl: 50 }];
    expect(korbPreis(k, v('gewonnen', true), d)).toBe(288 + 45 + 50);
    expect(korbRahmen(k, d).min).toBe(325 + 45 + 50);
  });
  it('Text der Posten', () => {
    expect(postenText(korb[0]!, d)).toBe('Kalashnikov AK-47 (gebraucht)');
    expect(postenText(korb[1]!, d)).toMatch(/^30 Schuss .*HP$/);
  });
});

describe('Sortiment', () => {
  const s = sortiment(d);
  it('jede Ware hat einen eindeutigen Schlüssel, eine Spanne und ein Vorratslevel 1–5', () => {
    expect(new Set(s.map((w) => w.schluessel)).size).toBe(s.length);
    for (const w of s) {
      expect(w.preis.min).toBeLessThanOrEqual(w.preis.max);
      expect(w.vorratslevel).toBeGreaterThanOrEqual(1);
      expect(w.vorratslevel).toBeLessThanOrEqual(5);
    }
  });
  it('Waffen und Nahkampfwaffen, die Aufsätze sind, stehen nur bei den Aufsätzen', () => {
    for (const a of d.aufsaetze.eintraege.filter((x) => x.waffe)) expect(s.some((w) => w.art === 'waffe' && w.id === a.waffe)).toBe(false);
    expect(s.some((w) => w.art === 'nahkampf' && w.id === 'bajonett')).toBe(false);
    expect(wareVon('aufsatz:bajonett', d)?.preis).toEqual(d.nahkampfwaffen.eintraege.find((n) => n.id === 'bajonett')!.preis);
  });
  it('Verbrauchsware: Munition und Sprengmittel', () => {
    expect(s.filter((w) => w.verbrauch).every((w) => w.art === 'munition' || w.art === 'spreng')).toBe(true);
    expect(wareVon('spreng:m67', d)?.verbrauch).toBe(true);
  });
});

describe('Vorratslevel und Beschaffen', () => {
  const ware = (s: string) => wareVon(s, d)!;
  it('bis zum Vorratslevel der Klasse frei', () => {
    expect(zugang(figur(), ware('waffe:ak47'), false, d)).toEqual({ art: 'frei', stufen: 0 });
  });
  it('1 und 2 Stufen darüber nur über Beschaffen, 3 Stufen gar nicht', () => {
    expect(zugang(figur(), ware('munition:762x39:HP'), false, d)).toEqual({ art: 'beschaffen', stufen: 1 });
    expect(zugang(figur(), ware('munition:762x39:AP'), false, d)).toEqual({ art: 'beschaffen', stufen: 2 });
    expect(zugang(figur(), ware('munition:50bmg:HP'), false, d)).toEqual({ art: 'nicht', stufen: 3 });
  });
  it('Kontakte senkt das Vorratslevel der Ware um 1, nur mit dem Perk und nur eingeschaltet', () => {
    expect(zugang(figur(1000, 2, ['kontakte']), ware('munition:50bmg:HP'), true, d)).toEqual({ art: 'beschaffen', stufen: 2 });
    expect(zugang(figur(1000, 2, ['kontakte']), ware('munition:50bmg:HP'), false, d).art).toBe('nicht');
    expect(zugang(figur(), ware('munition:50bmg:HP'), true, d).art).toBe('nicht');
  });
  it('ohne Vorratslevel ist alles frei', () => {
    expect(zugang(figur(1000, null), ware('munition:50bmg:HP'), false, d).art).toBe('frei');
  });
  it('Probe: Empathy mit Beschaffen, 2 Malsteps je Stufe', () => {
    const a = beschaffenAnfrage(2, d);
    expect(a).toMatchObject({ stat: 'empathy', skill: 'beschaffen' });
    expect(a.fest?.[0]?.malsteps).toBe(4);
  });
});

describe('Kaufen', () => {
  const korb: KaufPosten[] = [
    { ware: 'magazin:magazin_ak47_30', zustand: 'C', menge: 2 },
    { ware: 'waffe:ak47', zustand: 'B', menge: 1 },
    { ware: 'munition:762x39:HP', zustand: null, menge: 30 },
    { ware: 'aufsatz:reflexvisier', zustand: 'A', menge: 1 },
    { ware: 'spreng:m67', zustand: null, menge: 2 },
    { ware: 'ruestung:weste_einfach', zustand: 'D', menge: 1 }
  ];
  it('legt die Ware in die Ausrüstung und bucht einmal „Kauf“', () => {
    const c = kaufAnwenden(figur(), korb, 600, d, jetzt);
    const a = c.ausruestung;
    expect(a.waffen).toHaveLength(1);
    const e = a.waffen[0]!;
    expect(e).toMatchObject({ waffe: 'ak47', zustand: 'B', magazin: { id: 'magazin_ak47_30', zustand: 'B' }, im_magazin: 0, munitionstyp: '', trageort: 'rucksack' });
    const leer = { id: 'magazin_ak47_30', inhalt: 0, typ: '', zustand: 'C' };
    expect(a.magazine).toEqual([leer, leer]);
    expect(a.munition).toEqual([{ kaliber: '762x39', typ: 'HP', anzahl: 30 }]);
    expect(a.aufsaetze).toEqual([{ id: 'reflexvisier', zustand: 'A' }]);
    expect(a.vorrat).toEqual([{ id: 'm67', anzahl: 2, trageort: 'rucksack' }]);
    expect(a.ruestung).toEqual([{ id: 'weste_einfach', zustand: 'D' }]);
    expect(c.kassenbuch.at(-1)).toMatchObject({ betrag: -600, art: 'kauf' });
    expect(c.kassenbuch.at(-1)!.grund).toContain('Kalashnikov AK-47 (gebraucht)');
    expect(kontostand(c)).toBe(400);
  });
  it('Granaten kommen zum vorhandenen Vorrat dazu', () => {
    const c0 = figur();
    const c = kaufAnwenden({ ...c0, ausruestung: { ...c0.ausruestung, vorrat: [{ id: 'm67', anzahl: 1, trageort: 'weste' }] } }, [korb[4]!], 100, d, jetzt);
    expect(c.ausruestung.vorrat).toEqual([{ id: 'm67', anzahl: 3, trageort: 'weste' }]);
  });
  it('prüft Geld und nur einen Schild; Magazine gehen auch ohne Waffe', () => {
    expect(kaufPruefen(figur(), korb, 600, d)).toEqual([]);
    expect(kaufPruefen(figur(500), korb, 600, d)).toEqual(['Es fehlen 100 $.']);
    expect(kaufPruefen(figur(), [korb[0]!], 30, d)).toEqual([]);
    const schild: KaufPosten = { ware: 'schild:ballistischer_schild', zustand: 'A', menge: 1 };
    expect(kaufPruefen(figur(5000), [schild, schild], 0, d)).toEqual(['Du kannst nur einen Schild tragen.']);
  });
  it('Magazinsorten: Standard, erweitert, Trommel, Schnelllader und Ladestreifen stehen bei den Magazinen', () => {
    const mags = sortiment(d).filter((w) => w.art === 'magazin');
    expect(mags.map((w) => w.id)).toEqual(expect.arrayContaining(['magazin_stanag_20', 'magazin_stanag_30', 'trommel_stanag_100', 'schnelllader_sw_model_10', 'ladestreifen_mosin_nagant']));
    expect(wareVon('magazin:magazin_stanag_30', d)?.name).toBe('Erweitertes Magazin (30) für Colt M4 Carbine, Colt M16A4');
    expect(sortiment(d).some((w) => w.art === 'aufsatz' && w.id.includes('magazin'))).toBe(false);
  });
});

describe('Filter: nur, was zu meinen Waffen passt', () => {
  const w = (s: string) => wareVon(s, d)!;
  it('Munition nach Kaliber und Typ der Waffe, Magazine und Aufsätze, die passen', () => {
    expect(passtZuWaffen(w('munition:762x39:HP'), ['ak47'], d)).toBe(true);
    expect(passtZuWaffen(w('munition:556x45:FMJ'), ['ak47'], d)).toBe(false);
    expect(passtZuWaffen(w('magazin:magazin_stanag_30'), ['m16a4'], d)).toBe(true);
    expect(passtZuWaffen(w('magazin:magazin_stanag_30'), ['ak47'], d)).toBe(false);
    expect(passtZuWaffen(w('aufsatz:reflexvisier'), ['m4'], d)).toBe(true);
    expect(passtZuWaffen(w('aufsatz:reflexvisier'), ['ak47'], d)).toBe(false);
  });
  it('Waffen, Handgranaten und Rüstung immer; Geschosse nur mit Werfer', () => {
    expect(passtZuWaffen(w('waffe:m4'), [], d)).toBe(true);
    expect(passtZuWaffen(w('spreng:m67'), [], d)).toBe(true);
    expect(passtZuWaffen(w('spreng:m406_he'), [], d)).toBe(false);
    expect(passtZuWaffen(w('spreng:m406_he'), ['m79'], d)).toBe(true);
    expect(passtZuWaffen(w('ruestung:weste_einfach'), [], d)).toBe(true);
  });
  it('eigene Waffen: vorhandene und die im Korb', () => {
    const c0 = figur();
    const c = { ...c0, ausruestung: { ...c0.ausruestung, waffen: [neuerWaffenEintrag('ak47', d, 'wf1', 'schlinge')] } };
    expect(eigeneWaffen(c, [{ ware: 'waffe:m4', zustand: 'A', menge: 1 }, { ware: 'spreng:m67', zustand: null, menge: 1 }], d)).toEqual(['ak47', 'm4']);
  });
});

describe('Verkaufen', () => {
  function mitWaffe(): Charakter {
    const c = figur();
    const e = { ...neuerWaffenEintrag('ak47', d, 'wf1', 'schlinge'), zustand: 'C', im_magazin: 10, munitionstyp: 'FMJ',
      aufsaetze: [{ id: 'reflexvisier', zustand: 'A' }] };
    return { ...c, ausruestung: { ...c.ausruestung, waffen: [e], aktive_waffe: 'wf1', munition: [{ kaliber: '762x39', typ: 'FMJ', anzahl: 5 }],
      magazine: [{ id: 'magazin_ak47_30', inhalt: 30, typ: 'HP', zustand: 'B' }] } };
  }
  it('R45/R48: Waffe zählt Aufsätze und das eingesetzte Magazin mit, jedes nach seinem Zustand; andere Magazine nicht', () => {
    const c = mitWaffe();
    const teile = verkaufTeile(c, { art: 'waffe', id: 'wf1' }, d);
    expect(teile.map((t) => t.zustand)).toEqual(['C', 'A', 'A']);
    const r = verkaufRahmen(c, [{ art: 'waffe', id: 'wf1' }], d);
    expect(r.min).toBe(288 + preisrahmen(d.aufsaetze.eintraege.find((a) => a.id === 'reflexvisier')!.preis!, 'A', d).min
      + preisrahmen(d.magazine.eintraege.find((m) => m.id === 'magazin_ak47_30')!.preis, 'A', d).min);
    expect(verkaufPreis(c, [{ art: 'waffe', id: 'wf1' }], v('verloren'), d)).toBe(r.min);
  });
  it('nimmt die Waffe heraus, Patronen kommen zur losen Munition, bucht einmal „Verkauf“', () => {
    const c = verkaufAnwenden(mitWaffe(), [{ art: 'waffe', id: 'wf1' }], 500, d, jetzt);
    expect(c.ausruestung.waffen).toEqual([]);
    expect(c.ausruestung.aktive_waffe).toBeNull();
    expect(c.ausruestung.munition).toEqual([{ kaliber: '762x39', typ: 'FMJ', anzahl: 15 }]);
    expect(c.ausruestung.magazine).toHaveLength(1);
    expect(c.kassenbuch.at(-1)).toMatchObject({ betrag: 500, art: 'verkauf' });
    expect(c.kassenbuch.at(-1)!.grund).toContain('mit Reflexvisier');
  });
  it('einzelnes Magazin und lose Munition', () => {
    const c = verkaufAnwenden(mitWaffe(), [{ art: 'magazin', index: 0 }, { art: 'munition', kaliber: '762x39', typ: 'FMJ', menge: 5 }], 20, d, jetzt);
    expect(c.ausruestung.magazine).toEqual([]);
    // 30 HP aus dem Magazin zurück, 5 FMJ verkauft
    expect(c.ausruestung.munition).toEqual([{ kaliber: '762x39', typ: 'HP', anzahl: 30 }]);
  });
});
