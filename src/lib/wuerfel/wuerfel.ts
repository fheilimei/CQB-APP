// Gemeinsame Würfellogik (konzept.md § 2, Leitlinie 6). Jede Stelle, an der ein Würfelergebnis entsteht,
// läuft über diese Funktionen und die Komponente Wuerfel.svelte: App würfelt oder Eingabe von Hand.

import type { Quelle } from '../speicher/charakter';

export type Wuerfelart = 'W100' | 'W10' | 'W8' | '2W10';

export interface Wurf {
  art: Wuerfelart;
  /** Einzelwerte: W100 [Zehner, Einer] wie gewürfelt (0–9), 2W10 [positiv, negativ], sonst [Wert]. */
  werte: number[];
  /** W100: 1–100; W10: 1–10; W8: 1–8; 2W10: positiv − negativ (−9 bis +9). */
  ergebnis: number;
  quelle: Quelle;
}

/** Zufallsquelle: Zahl in [0, 1). Austauschbar für Tests. */
export type Zufall = () => number;

const w = (seiten: number, zufall: Zufall) => Math.floor(zufall() * seiten) + 1;

export function wuerfle(art: Wuerfelart, zufall: Zufall = Math.random): Wurf {
  switch (art) {
    case 'W100': {
      const zehner = w(10, zufall) - 1;
      const einer = w(10, zufall) - 1;
      return { art, werte: [zehner, einer], ergebnis: w100(zehner, einer), quelle: 'app' };
    }
    case 'W10': {
      const x = w(10, zufall);
      return { art, werte: [x], ergebnis: x, quelle: 'app' };
    }
    case 'W8': {
      const x = w(8, zufall);
      return { art, werte: [x], ergebnis: x, quelle: 'app' };
    }
    case '2W10': {
      const p = w(10, zufall);
      const n = w(10, zufall);
      return { art, werte: [p, n], ergebnis: p - n, quelle: 'app' };
    }
  }
}

/** W100 aus zwei W10 (Zehner, Einer, je 0–9): 0 und 0 zählen als 100. */
export function w100(zehner: number, einer: number): number {
  const x = zehner * 10 + einer;
  return x === 0 ? 100 : x;
}

/** Spanne einer Eingabe von Hand. 2W10 wird als zwei Würfel 1–10 eingegeben. */
export function spanne(art: Wuerfelart): { min: number; max: number } {
  switch (art) {
    case 'W100': return { min: 1, max: 100 };
    case 'W10': return { min: 1, max: 10 };
    case 'W8': return { min: 1, max: 8 };
    case '2W10': return { min: 1, max: 10 };
  }
}

/** Eingabe von Hand. Bei 2W10 sind es zwei Zahlen (positiv, negativ). Ungültige Eingabe → null. */
export function vonHand(art: Wuerfelart, eingabe: number[]): Wurf | null {
  const { min, max } = spanne(art);
  const anzahl = art === '2W10' ? 2 : 1;
  if (eingabe.length !== anzahl || eingabe.some((x) => !Number.isInteger(x) || x < min || x > max)) return null;
  if (art === '2W10') return { art, werte: [eingabe[0]!, eingabe[1]!], ergebnis: eingabe[0]! - eingabe[1]!, quelle: 'hand' };
  if (art === 'W100') {
    const x = eingabe[0]!;
    return { art, werte: [Math.floor((x % 100) / 10), x % 10], ergebnis: x, quelle: 'hand' };
  }
  return { art, werte: [eingabe[0]!], ergebnis: eingabe[0]!, quelle: 'hand' };
}

/**
 * Würfelstellen der App mit ihrem Standard. Heute würfelt die App nur die Abweichung selbst;
 * überall sonst ist die Eingabe von Hand Standard (konzept.md § 2, Leitlinie 6).
 * Neue Stellen werden hier ergänzt; in den Einstellungen lässt sich der Standard je Stelle umschalten.
 */
export const WUERFELSTELLEN = {
  abweichung: { name: 'Abweichung', art: '2W10', standard: 'app' },
  probe: { name: 'Proben', art: 'W100', standard: 'hand' },
  trefferzone: { name: 'Trefferzone', art: 'W8', standard: 'hand' },
  rueckstoss: { name: 'Rückstoßwürfel', art: 'W10', standard: 'hand' }
} as const satisfies Record<string, { name: string; art: Wuerfelart; standard: Quelle }>;

export type Wuerfelstelle = keyof typeof WUERFELSTELLEN;

export function modusFuer(stelle: Wuerfelstelle, einstellungen: Record<string, Quelle>): Quelle {
  return einstellungen[stelle] ?? WUERFELSTELLEN[stelle].standard;
}
