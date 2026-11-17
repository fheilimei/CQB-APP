// Statwert, Steps, Zielwert und Krit (konzept.md § 4.1–4.3; Regelwerk: Stats, Skills und Perks, Steps; Würfelmechanik).

import type { Rang, Regeln } from '../daten/typen';
import type { Abweichungswurf, StatEintrag } from '../speicher/charakter';

/** Kaufmännisch runden: ab ,5 auf. Der kleine Zuschlag fängt Rundungsfehler der Gleitkommazahlen ab (50 × 0,85). */
export function runden(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

export function abweichung(wurf: Abweichungswurf): number {
  return wurf.positiv - wurf.negativ;
}

/** Statwert = Rang + Abweichung. Ohne Rang oder Wurf (während der Erstellung) gibt es noch keinen Wert. */
export function statwert(eintrag: StatEintrag | undefined, regeln: Regeln): number | null {
  if (!eintrag?.rang || !eintrag.wurf) return null;
  return regeln.raenge[eintrag.rang] + abweichung(eintrag.wurf);
}

/** Ränge vom höchsten zum niedrigsten, aus den Zahlen in regeln.json. */
export function rangfolge(regeln: Regeln): Rang[] {
  return (Object.keys(regeln.raenge) as Rang[]).sort((a, b) => regeln.raenge[b] - regeln.raenge[a]);
}

/** Nächsthöherer Rang oder null, wenn der höchste erreicht ist. */
export function naechsterRang(rang: Rang, regeln: Regeln): Rang | null {
  if (rang === regeln.aufstieg.rang_max) return null;
  const folge = rangfolge(regeln);
  const i = folge.indexOf(rang);
  return i > 0 ? folge[i - 1]! : null;
}

/** Eine Quelle von Steps, mit Namen für die Aufschlüsselung (konzept.md § 3.0b). */
export interface StepQuelle {
  /** Woher die Steps kommen: lage, leiter, zustand, perk, anpassung, aufsatz, sl, skill … */
  herkunft: string;
  /** Anzeigename, z. B. „Reichweite mittel“ oder „Adrenalin 2“. */
  name: string;
  malsteps?: number;
  stepshields?: number;
  /** Änderung der Krit-Schwelle (z. B. Perk Kernschuss). */
  krit_schwelle?: number;
}

export interface Probeneingabe {
  statwert: number;
  /** Skillstufe; null = Probe ohne Skill (z. B. Initiative), dann auch kein Malstep für Skill 0. */
  skill: number | null;
  quellen: StepQuelle[];
}

export interface Probenwert {
  /** false: 6 oder mehr Netto-Malsteps, keine Probe möglich, die Handlung misslingt. */
  moeglich: boolean;
  /** Summe aller Malsteps, einschließlich des Malsteps für Skill 0. */
  malsteps: number;
  /** Skillstufe + Stepshields. */
  abzug: number;
  netto: number;
  /** Was vom Abzug übrig bleibt; erhöht die Krit-Schwelle. */
  uebrig: number;
  zielwert: number;
  krit_schwelle: number;
  /** true, wenn wegen Skill 0 ein Malstep dazukam. */
  skill_null: boolean;
}

export function summe(quellen: StepQuelle[], feld: 'malsteps' | 'stepshields' | 'krit_schwelle'): number {
  return quellen.reduce((s, q) => s + (q[feld] ?? 0), 0);
}

/** Zielwert = Statwert × Faktor[Netto], einmal gerundet. Immer vom Statwert gerechnet. */
export function zielwert(statwert: number, netto: number, regeln: Regeln): number {
  const faktor = regeln.steps.faktoren[netto];
  if (faktor === undefined || netto >= regeln.steps.keine_probe_ab) return 0;
  return runden(statwert * faktor);
}

/** Zehnerstelle des Zielwerts; bei 100 laut regeln.json. */
export function zehnerstelle(wert: number, regeln: Regeln): number {
  return wert >= 100 ? regeln.krit.zielwert_100_zehner : Math.floor(wert / 10);
}

/** Krit-Schwelle = Zehnerstelle des Zielwerts + Übrig (+ Änderungen durch Perks), nie unter dem Minimum. */
export function kritSchwelle(ziel: number, uebrig: number, zusatz: number, regeln: Regeln): number {
  return Math.max(regeln.krit.schwelle_min, zehnerstelle(ziel, regeln) + uebrig + zusatz);
}

/** Rechnet eine Probe vollständig durch (konzept.md § 4.2, 4.3). */
export function probenwert(e: Probeneingabe, regeln: Regeln): Probenwert {
  const skillNull = e.skill === 0;
  const malsteps = summe(e.quellen, 'malsteps') + (skillNull ? regeln.steps.skill_null_malsteps : 0);
  const abzug = (e.skill ?? 0) + summe(e.quellen, 'stepshields');
  const netto = Math.max(0, malsteps - abzug);
  const uebrig = Math.max(0, abzug - malsteps);
  const moeglich = netto < regeln.steps.keine_probe_ab;
  const ziel = moeglich ? zielwert(e.statwert, netto, regeln) : 0;
  const schwelle = moeglich ? kritSchwelle(ziel, uebrig, summe(e.quellen, 'krit_schwelle'), regeln) : regeln.krit.schwelle_min;
  return { moeglich, malsteps, abzug, netto, uebrig, zielwert: ziel, krit_schwelle: schwelle, skill_null: skillNull };
}

export type Ergebnisstufe = 'krit' | 'erfolg' | 'misserfolg';

/** Wertet einen W100-Wurf (1–100) gegen den Probenwert aus. */
export function auswerten(wurf: number, p: Pick<Probenwert, 'moeglich' | 'zielwert' | 'krit_schwelle'>): Ergebnisstufe {
  if (!p.moeglich || wurf > p.zielwert) return 'misserfolg';
  return wurf <= p.krit_schwelle ? 'krit' : 'erfolg';
}

/** Schlüssel für Tabellen in regeln.json, die nach Ergebnis aufgeteilt sind (krit, gelungen, misslungen). */
export function ergebnisSchluessel(stufe: Ergebnisstufe): 'krit' | 'gelungen' | 'misslungen' {
  return stufe === 'krit' ? 'krit' : stufe === 'erfolg' ? 'gelungen' : 'misslungen';
}

export interface Probenergebnis {
  stufe: Ergebnisstufe;
  wurf: number;
}

const RANG_DER_STUFE: Record<Ergebnisstufe, number> = { krit: 2, erfolg: 1, misserfolg: 0 };

/**
 * Contested Roll (Würfelmechanik, Contested Rolls): 1 = a setzt sich durch, −1 = b, 0 = Unentschieden.
 * Krit > Erfolg > Misserfolg; gleiche Stufe: höherer Wurf; beide misslungen oder alles gleich: Unentschieden.
 */
export function vergleiche(a: Probenergebnis, b: Probenergebnis): -1 | 0 | 1 {
  const ra = RANG_DER_STUFE[a.stufe];
  const rb = RANG_DER_STUFE[b.stufe];
  if (ra !== rb) return ra > rb ? 1 : -1;
  if (a.stufe === 'misserfolg' || a.wurf === b.wurf) return 0;
  return a.wurf > b.wurf ? 1 : -1;
}

/**
 * Rangfolge mehrerer Kontrahenten: Liste von Plätzen, jeder Platz enthält die Indizes, die gleichauf liegen.
 * Krits vor Erfolgen (jeweils höherer Wurf zuerst), alle Misserfolge gleichauf zuletzt.
 */
export function rangfolgeContested(ergebnisse: Probenergebnis[]): number[][] {
  const idx = ergebnisse.map((_, i) => i).sort((i, j) => -vergleiche(ergebnisse[i]!, ergebnisse[j]!));
  const plaetze: number[][] = [];
  for (const i of idx) {
    const letzter = plaetze[plaetze.length - 1];
    if (letzter && vergleiche(ergebnisse[letzter[0]!]!, ergebnisse[i]!) === 0) letzter.push(i);
    else plaetze.push([i]);
  }
  return plaetze;
}
