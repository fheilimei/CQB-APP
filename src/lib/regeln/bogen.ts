// Werte für den Bogen (konzept.md § 3.2–3.5, § 3.0b): Step-Reihe der Stats und Herkunft der Modifikatoren.

import type { Modifikator, Regeln, Spieldaten } from '../daten/typen';
import type { Charakter } from '../speicher/charakter';
import { modifikatorenDes, type HerkunftModifikator } from './modifikatoren';
import { zielwert } from './probe';

/**
 * Step-Reihe eines Stats: Zielwert bei 0, 1, 2 … Netto-Malsteps, bis vor die Grenze „keine Probe“.
 * Immer vom Statwert gerechnet (konzept.md § 4.2).
 */
export function stepReihe(statwert: number, regeln: Regeln): number[] {
  const n = Math.min(regeln.steps.keine_probe_ab, regeln.steps.faktoren.length);
  return Array.from({ length: n }, (_, netto) => zielwert(statwert, netto, regeln));
}

/**
 * Modifikatoren, deren Ziel dieser Stat bzw. Skill ist; für die Markierung am Wert (konzept.md § 3.0b).
 * Bedingungen schränken nur ein, wann sie wirken; markiert wird trotzdem.
 */
export function modifikatorenAn(c: Charakter, d: Spieldaten, art: 'stat' | 'skill', id: string): HerkunftModifikator[] {
  return modifikatorenDes(c, d).filter((m) => m.ziel.art === art && m.ziel.id === id);
}

/** Rückverweis „Wirkt auf“: Modifikatoren eines Perks. */
export function perkModifikatoren(perkId: string, d: Spieldaten): Modifikator[] {
  return d.perks.eintraege.find((p) => p.id === perkId)?.modifikatoren ?? [];
}
