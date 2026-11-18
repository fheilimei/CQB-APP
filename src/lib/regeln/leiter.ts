// Adrenalin und Ruhepuls (konzept.md § 4.4; Regelwerk: Adrenalin).
// Der Stand ist eine Ganzzahl von leiter.min bis leiter.max; 0 = weder Adrenalin noch Ruhepuls.

import type { Regeln, Spieldaten, SymptomWirkung } from '../daten/typen';
import { ergebnisSchluessel, type Ergebnisstufe, type StepQuelle } from './probe';

export function begrenzen(stand: number, r: Regeln): number {
  return Math.min(r.leiter.max, Math.max(r.leiter.min, stand));
}

function stufe(stand: number, r: Regeln) {
  const s = r.leiter.stufen[String(begrenzen(stand, r))];
  if (!s) throw new Error(`Leiterstufe ${stand} fehlt in regeln.json`);
  return s;
}

/** Anzeigetext des Stands („Adrenalin 2“, „Over the Edge“); bei 0 null, dann wird nichts angezeigt. */
export function standName(stand: number, r: Regeln): string | null {
  return stufe(stand, r).name;
}

/** Steps des Stands auf einen Stat. Gruppe C (Nerve) wird nie beeinflusst. */
export function leiterSteps(stand: number, statId: string, d: Spieldaten): StepQuelle[] {
  const gruppe = d.stats.eintraege.find((s) => s.id === statId)?.gruppe;
  if (gruppe !== 'A' && gruppe !== 'B') return [];
  const s = stufe(stand, d.regeln);
  const wert = gruppe === 'A' ? s.gruppe_a : s.gruppe_b;
  if (wert === 0 || !s.name) return [];
  return [wert > 0 ? { herkunft: 'leiter', name: s.name, stepshields: wert } : { herkunft: 'leiter', name: s.name, malsteps: -wert }];
}

/** Richtung der Wirkung auf eine Statgruppe bei Adrenalin und bei Ruhepuls: +1 Stepshields, −1 Malsteps, 0 nichts.
 *  Maßgeblich ist die erste Stufe, die auf die Gruppe wirkt (Over the Edge zählt nicht).
 *  null, wenn die Gruppe nie beeinflusst wird (Gruppe C). */
export function gruppenRichtung(gruppe: string, r: Regeln): { adrenalin: number; ruhepuls: number } | null {
  if (gruppe !== 'A' && gruppe !== 'B') return null;
  const feld = gruppe === 'A' ? 'gruppe_a' : 'gruppe_b';
  const richtung = (schritt: 1 | -1) => {
    for (let n = schritt; n >= r.leiter.min && n <= r.leiter.max; n += schritt) {
      const s = r.leiter.stufen[String(n)];
      if (s && !s.over_the_edge && s[feld] !== 0) return Math.sign(s[feld]);
    }
    return 0;
  };
  return { adrenalin: richtung(1), ruhepuls: richtung(-1) };
}

export interface Symptomlage {
  /** IDs der aktiven Symptome. */
  symptome: string[];
  gewinne: SymptomWirkung[];
  verluste: SymptomWirkung[];
}

/** Symptome des Stands. Over the Edge: nur die Verluste. */
export function symptome(stand: number, r: Regeln): Symptomlage {
  const s = stufe(stand, r);
  const gewinne: SymptomWirkung[] = [];
  const verluste: SymptomWirkung[] = [];
  for (const id of s.symptome) {
    const sym = r.symptome[id];
    if (!sym) continue;
    if (!s.symptome_nur_verluste) gewinne.push(sym.wirkung.gewinn);
    verluste.push(sym.wirkung.verlust);
  }
  return { symptome: [...s.symptome], gewinne, verluste };
}

export function hatWirkung(stand: number, wirkung: SymptomWirkung, r: Regeln): boolean {
  const l = symptome(stand, r);
  return l.gewinne.includes(wirkung) || l.verluste.includes(wirkung);
}

export function overTheEdge(stand: number, r: Regeln): boolean {
  return !!stufe(stand, r).over_the_edge;
}

/** Start bei Gefechtsbeginn aus der Nerve-Probe (normal oder überrascht). */
export function startStand(ergebnis: Ergebnisstufe, ueberrascht: boolean, r: Regeln): number {
  const tabelle = r.leiter.start[ueberrascht ? 'ueberrascht' : 'normal'];
  if (!tabelle) throw new Error('Starttabelle fehlt in regeln.json');
  return begrenzen(tabelle[ergebnisSchluessel(ergebnis)], r);
}

/** Malsteps der freiwilligen Nerve-Probe gegen den Anstieg: je Auslöser (jeder zählt höchstens einmal). */
export function anstiegMalsteps(ausloeser: number, r: Regeln): StepQuelle[] {
  if (ausloeser <= 0) return [];
  return [{ herkunft: 'leiter', name: 'Auslöser dieser Runde', malsteps: ausloeser * r.leiter.rundenende.malsteps_je_ausloeser }];
}

export interface Rundenende {
  stand: number;
  /** Zahl der verschiedenen Auslöser dieser Runde. */
  ausloeser: number;
  /** In dieser Runde gesenkt: kein Anstieg, keine Probe. */
  gesenkt: boolean;
  /** Ergebnis der Nerve-Probe; null = verzichtet oder keine Probe möglich (dann Anstieg). */
  probe: Ergebnisstufe | null;
}

/** Neuer Stand am Rundenende (Adrenalin, Anstieg). */
export function rundenende(e: Rundenende, r: Regeln): number {
  if (e.gesenkt || e.ausloeser <= 0) return e.stand;
  const aenderung = e.probe ? r.leiter.rundenende.probe[ergebnisSchluessel(e.probe)] : r.leiter.rundenende.anstieg;
  return begrenzen(e.stand + aenderung, r);
}

/** Senken (Mainaction, Nerve + Selbstbeherrschung): gelungen −1, Krit −2, auch in den Ruhepuls. */
export function senken(stand: number, ergebnis: Ergebnisstufe, r: Regeln): number {
  return begrenzen(stand + r.leiter.senken[ergebnisSchluessel(ergebnis)], r);
}

/** Verbündete verschieben (Empathy + Führung): Betrag der Verschiebung; die Richtung wählt der Spieler. */
export function verschiebung(ergebnis: Ergebnisstufe, r: Regeln): number {
  return r.leiter.verschieben[ergebnisSchluessel(ergebnis)];
}

export function verschieben(stand: number, ergebnis: Ergebnisstufe, richtung: 1 | -1, r: Regeln): number {
  return begrenzen(stand + richtung * verschiebung(ergebnis, r), r);
}

/** Gefechtsende: Stand auf 0; wer Over the Edge erreicht hat, erleidet den Adrenalinschock. */
export function gefechtsende(overTheEdgeErreicht: boolean): { stand: number; adrenalinschock: boolean } {
  return { stand: 0, adrenalinschock: overTheEdgeErreicht };
}
