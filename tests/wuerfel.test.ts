import { describe, expect, it } from 'vitest';
import { modusFuer, spanne, vonHand, w100, wuerfle, type Zufall } from '../src/lib/wuerfel/wuerfel';

/** Zufall, der der Reihe nach feste Werte liefert. */
const folge = (...werte: number[]): Zufall => {
  let i = 0;
  return () => werte[i++ % werte.length]!;
};
const seite = (x: number, seiten: number) => (x - 1 + 0.5) / seiten; // Zufallswert, der Augenzahl x ergibt

describe('W100', () => {
  it('0 und 0 zählen als 100', () => expect(w100(0, 0)).toBe(100));
  it('Zehner und Einer', () => {
    expect(w100(0, 1)).toBe(1);
    expect(w100(5, 4)).toBe(54);
    expect(w100(9, 9)).toBe(99);
  });
  it('gewürfelt mit festen Würfeln', () => {
    expect(wuerfle('W100', folge(seite(1, 10), seite(1, 10))).ergebnis).toBe(100);
    expect(wuerfle('W100', folge(seite(6, 10), seite(5, 10))).ergebnis).toBe(54);
  });
  it('bleibt immer zwischen 1 und 100', () => {
    for (let i = 0; i < 2000; i++) {
      const x = wuerfle('W100').ergebnis;
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(100);
    }
  });
});

describe('2W10 (Abweichung)', () => {
  it('positiv minus negativ', () => {
    const r = wuerfle('2W10', folge(seite(7, 10), seite(4, 10)));
    expect(r.werte).toEqual([7, 4]);
    expect(r.ergebnis).toBe(3);
    expect(r.quelle).toBe('app');
  });
  it('Grenzen −9 und +9', () => {
    expect(wuerfle('2W10', folge(seite(1, 10), seite(10, 10))).ergebnis).toBe(-9);
    expect(wuerfle('2W10', folge(seite(10, 10), seite(1, 10))).ergebnis).toBe(9);
  });
});

describe('W10 und W8', () => {
  it('W10 von 1 bis 10 (0 zählt als 10)', () => {
    expect(wuerfle('W10', folge(0)).ergebnis).toBe(1);
    expect(wuerfle('W10', folge(0.999)).ergebnis).toBe(10);
  });
  it('W8 von 1 bis 8', () => {
    expect(wuerfle('W8', folge(0)).ergebnis).toBe(1);
    expect(wuerfle('W8', folge(0.999)).ergebnis).toBe(8);
  });
});

describe('Eingabe von Hand', () => {
  it('nimmt gültige Werte an und merkt die Quelle', () => {
    expect(vonHand('W100', [100])).toEqual({ art: 'W100', werte: [0, 0], ergebnis: 100, quelle: 'hand' });
    expect(vonHand('W100', [54])?.werte).toEqual([5, 4]);
    expect(vonHand('2W10', [3, 5])).toEqual({ art: '2W10', werte: [3, 5], ergebnis: -2, quelle: 'hand' });
    expect(vonHand('W8', [8])?.ergebnis).toBe(8);
  });
  it('lehnt ungültige Werte ab', () => {
    expect(vonHand('W100', [0])).toBeNull();
    expect(vonHand('W100', [101])).toBeNull();
    expect(vonHand('W8', [9])).toBeNull();
    expect(vonHand('W10', [2.5])).toBeNull();
    expect(vonHand('2W10', [0, 5])).toBeNull();
    expect(vonHand('2W10', [5])).toBeNull();
  });
  it('Spannen', () => {
    expect(spanne('W100')).toEqual({ min: 1, max: 100 });
    expect(spanne('2W10')).toEqual({ min: 1, max: 10 });
  });
});

describe('Würfelstellen', () => {
  it('nur die Abweichung würfelt die App von sich aus', () => {
    expect(modusFuer('abweichung', {})).toBe('app');
    expect(modusFuer('probe', {})).toBe('hand');
    expect(modusFuer('trefferzone', {})).toBe('hand');
  });
  it('Einstellung geht vor Standard', () => {
    expect(modusFuer('abweichung', { abweichung: 'hand' })).toBe('hand');
    expect(modusFuer('probe', { probe: 'app' })).toBe('app');
  });
});
