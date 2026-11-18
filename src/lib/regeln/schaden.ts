// Schadensablauf (konzept.md § 4.7; Regelwerk: Schaden, Blutung und Verletzungen; Deckung und Rüstung).

import type { Spieldaten } from '../daten/typen';

/**
 * Tatsächlich verdeckte Zonen nach den Regeln für Rumpf und Arme:
 * Ist eine Rumpfzone verdeckt, gilt der ganze Rumpf als verdeckt. Ist die Zone `deckung.arme_mit` (Brust) verdeckt,
 * gelten auch die Arme als verdeckt. Regelfrage R3 (docs/offen.md), entschieden: ohne Richtung („von unten“ wird nicht geprüft).
 */
export function verdeckteZonen(zonen: string[], d: Spieldaten): string[] {
  const menge = new Set(zonen);
  const rumpf = d.koerperzonen.eintraege.filter((z) => z.bereich === 'rumpf').map((z) => z.id);
  if (rumpf.some((z) => menge.has(z))) for (const z of rumpf) menge.add(z);
  if (zonen.includes(d.regeln.deckung.arme_mit)) for (const z of d.regeln.deckung.arme) menge.add(z);
  return d.koerperzonen.eintraege.map((z) => z.id).filter((z) => menge.has(z));
}

/**
 * Rüstungswert einer Zone: höchster Wert aller getragenen Rüstungen (Westen, Helme, Anzug).
 * Zone ohne Nummer (Rumpf nach Ansage): Wert der Rüstung am Rumpf. Regelfrage R2 (docs/offen.md), entschieden:
 * Rüstung am Rumpf deckt immer alle Rumpfzonen mit demselben Wert ab (Datenprüfung); genommen wird der höchste.
 */
export function ruestungswert(zone: string, getragen: string[], d: Spieldaten): number {
  const teile = d.schutz.ruestung.filter((r) => getragen.includes(r.id));
  const wert = (z: string) => Math.max(0, ...teile.map((r) => r.zonen[z] ?? 0));
  const eintrag = d.koerperzonen.eintraege.find((z) => z.id === zone);
  if (eintrag && eintrag.w8 === null && eintrag.bereich === 'rumpf') {
    const zonen = d.koerperzonen.eintraege.filter((z) => z.bereich === 'rumpf' && z.w8 !== null);
    return Math.max(0, ...zonen.map((z) => wert(z.id)));
  }
  return wert(zone);
}

/** Wie Stagger für den Getroffenen gilt: normal (Schaden > Schmerzresistenz), empfindlich (≥), nie (Schmerz ignorieren). */
export type StaggerRegel = 'normal' | 'empfindlich' | 'nie';

export interface Treffereingabe {
  zone: string;
  /** Durchschlagskraft; null = stumpfer Treffer (keine DK). */
  dk: number | null;
  mw: number;
  /** Kugeln oder Splitter, die als ein Treffer zählen. */
  kugeln: number;
  krit: boolean;
  /** Deckungswert, wenn die Zone verdeckt ist; sonst null. */
  deckung: number | null;
  /** Rüstungswert der Zone (0 = keine). */
  ruestung: number;
  schmerzresistenz: number;
  stagger_regel: StaggerRegel;
}

export interface Trefferfolge {
  art: 'gestoppt' | 'durchschlag' | 'wucht';
  rest_dk: number | null;
  schaden: number;
  /** Durchschlag: Wunde mit Zonenfolgen. Wuchttreffer: Prellung. */
  wunde: boolean;
  prellung: boolean;
  /** Spalte der Zonenfolge: normal, krit oder keine (Wuchttreffer, gestoppt). */
  folge: 'normal' | 'krit' | null;
  stagger: boolean;
}

function stagger(schaden: number, e: Treffereingabe, kritStumpf: boolean): boolean {
  // Regelfrage R4 (docs/offen.md): vorläufig gewinnt Schmerz ignorieren gegen den stumpfen Krit.
  if (e.stagger_regel === 'nie') return false;
  if (kritStumpf) return true;
  return e.stagger_regel === 'empfindlich' ? schaden >= e.schmerzresistenz : schaden > e.schmerzresistenz;
}

/** Ein Treffer durch Deckung, Rüstung und Körper. */
export function treffer(e: Treffereingabe, d: Spieldaten): Trefferfolge {
  const zone = d.koerperzonen.eintraege.find((z) => z.id === e.zone);
  if (!zone) throw new Error(`unbekannte Zone „${e.zone}“`);
  const kugeln = Math.max(1, e.kugeln);
  const gestoppt: Trefferfolge = { art: 'gestoppt', rest_dk: null, schaden: 0, wunde: false, prellung: false, folge: null, stagger: false };

  // Regelfrage R5 (docs/offen.md): vorläufig keine Prellung bei 0 Schaden (prellung: schaden > 0, auch unten).
  // Stumpf: verdeckte Zone → kein Schaden; sonst immer Wuchttreffer mit vollem Rüstungswert als Restschutz.
  if (e.dk === null) {
    if (e.deckung !== null) return gestoppt;
    const schaden = Math.max(0, e.mw - e.ruestung) * kugeln;
    return { art: 'wucht', rest_dk: null, schaden, wunde: false, prellung: schaden > 0, folge: null, stagger: stagger(schaden, e, e.krit) };
  }

  // 1. Deckung
  let restDk = e.dk;
  if (e.deckung !== null) {
    if (e.dk < e.deckung) return { ...gestoppt, rest_dk: 0 };
    restDk = e.dk - e.deckung;
  }
  // 2. Rüstung: Rest-DK erreicht den Wert → Durchschlag
  if (restDk >= e.ruestung) {
    const schaden = e.mw * zone.multiplikator * kugeln;
    return {
      art: 'durchschlag',
      rest_dk: restDk,
      schaden,
      wunde: true,
      prellung: false,
      folge: e.krit ? 'krit' : 'normal',
      stagger: stagger(schaden, e, false)
    };
  }
  // 3. Wuchttreffer: Schaden = MW − (Rüstung − Rest-DK), mindestens 0; kein Multiplikator, keine Folgen, kein Krit.
  const schaden = Math.max(0, e.mw - (e.ruestung - restDk)) * kugeln;
  return { art: 'wucht', rest_dk: restDk, schaden, wunde: false, prellung: schaden > 0, folge: null, stagger: stagger(schaden, e, false) };
}
