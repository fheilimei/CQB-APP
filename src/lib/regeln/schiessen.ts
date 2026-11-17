// Schießen: Trefferwert, Trefferzone, Folgeschüsse, Schrot, Ladehemmung (konzept.md § 4.6; Regelwerk: Kampfsystem, Treffen).

import type { BandId, Feuermodus, Regeln, Spieldaten, Waffe } from '../daten/typen';
import { hatWirkung } from './leiter';
import { auswerten, probenwert, zehnerstelle, type Ergebnisstufe, type StepQuelle } from './probe';

// ---------- Trefferwert

/** Malsteps der Reichweite im Band; null = Schuss in diesem Band nicht möglich. */
export function reichweitenSteps(waffe: Waffe, band: BandId, r: Regeln): StepQuelle[] | null {
  const m = waffe.reichweite[band];
  if (m === null || m === undefined) return null;
  const name = r.schiessen.reichweitenbaender.find((b) => b.id === band)?.name ?? band;
  return m ? [{ id: 'reichweite', herkunft: 'lage', name: `Reichweite ${name}`, malsteps: m }] : [];
}

export type Ansage = 'keine' | 'rumpf' | 'zone';

/** Ansage nicht möglich bei Symptom „Keine Ansage“ (Adrenalin) oder ohne Sicht. */
export function ansageMoeglich(leiterstand: number, sichtstufe: string, r: Regeln): boolean {
  const ohneSicht = r.sicht.stufen.find((s) => s.id === sichtstufe)?.erkennen_bis === 'keins';
  return !hatWirkung(leiterstand, 'keine_ansage', r) && !ohneSicht;
}

export function ansageSteps(ansage: Ansage, r: Regeln): StepQuelle[] {
  if (ansage === 'keine') return [];
  const m = r.schiessen.ansage_malsteps[ansage] ?? 0;
  return [{ id: 'ansage', herkunft: 'lage', name: ansage === 'rumpf' ? 'Ansage Rumpf' : 'Ansage Zone', malsteps: m }];
}

export interface LageAuswahl {
  /** Je Gruppe die gewählte Umstand-ID (auswahl „eins“) oder Liste (auswahl „schalter“). */
  auswahl: Record<string, string | string[] | null | undefined>;
  band: BandId | null;
  /** Art der eigenen Bewegung in dieser Runde, null = keine. */
  eigene_bewegung: string | null;
  /** Ablauf: schiessen, werfen, werfer, sprengwaffe (für nicht_fuer). */
  ablauf: string;
}

/** Steps aus der Lage-Auswahl (konzept.md § 3.8c), allein aus regeln.json gebaut. */
export function lageSteps(l: LageAuswahl, r: Regeln): StepQuelle[] {
  const quellen: StepQuelle[] = [];
  if (l.eigene_bewegung) {
    const m = r.lage.eigene_bewegung[l.eigene_bewegung];
    if (m) quellen.push({ id: 'eigene_bewegung', herkunft: 'lage', name: `eigene Bewegung: ${l.eigene_bewegung}`, malsteps: m });
  }
  const gewaehlt = new Set(Object.values(l.auswahl).flatMap((v) => (v == null ? [] : Array.isArray(v) ? v : [v])));
  for (const u of r.lage.umstaende) {
    if (!gewaehlt.has(u.id)) continue;
    if (u.nicht_fuer?.includes(l.ablauf)) continue;
    if (l.band && u.nicht_in_baendern?.includes(l.band)) continue;
    if (u.nur_ohne_eigene_bewegung && l.eigene_bewegung) continue;
    if (!u.malsteps && !u.stepshields) continue;
    quellen.push({ id: `lage:${u.id}`, herkunft: 'lage', name: u.name, malsteps: u.malsteps, stepshields: u.stepshields });
  }
  return quellen;
}

// ---------- Trefferzone

export function zoneAusW8(w8: number, d: Spieldaten): string {
  const z = d.koerperzonen.eintraege.find((x) => x.w8 === w8);
  if (!z) throw new Error(`keine Zone für W8 = ${w8}`);
  return z.id;
}

/** Nächstniedrigere Zonennummer; nach der kleinsten folgt wieder die größte. */
function naechsteZone(zone: string, d: Spieldaten): string {
  const mitNummer = d.koerperzonen.eintraege.filter((z) => z.w8 !== null).sort((a, b) => b.w8! - a.w8!);
  const i = mitNummer.findIndex((z) => z.id === zone);
  return mitNummer[(i + 1) % mitNummer.length]!.id;
}

/**
 * Verteilt Kugeln oder Splitter auf Zonen: erste in `ersteZone`, jede weitere eine Zonennummer tiefer.
 * Bei einer Zone ohne Nummer (Ansage Rumpf) beginnt die Zählung bei schrot_rumpf_start.
 * Ergebnis: Zone → Zahl der Kugeln, in der Reihenfolge der Treffer. Gleiche Zonen sind ein Treffer.
 */
export function zonenFolge(ersteZone: string, anzahl: number, d: Spieldaten): Map<string, number> {
  const ergebnis = new Map<string, number>();
  if (anzahl <= 0) return ergebnis;
  let zone = d.koerperzonen.eintraege.find((z) => z.id === ersteZone)?.w8 == null ? d.regeln.schiessen.schrot_rumpf_start : ersteZone;
  for (let i = 0; i < anzahl; i++) {
    ergebnis.set(zone, (ergebnis.get(zone) ?? 0) + 1);
    zone = naechsteZone(zone, d);
  }
  return ergebnis;
}

/** Splitterzahl des Bereichs; wer liegt, erhält den Anteil aus regeln.json (abgerundet). */
export function splitterzahl(zahlImBand: number, liegend: boolean, r: Regeln): number {
  return liegend ? Math.floor(zahlImBand * r.sprengwirkung.splitter_liegend_anteil) : zahlImBand;
}

// ---------- Folgeschüsse

/** Schüsse aus angesagten Bursts, höchstens die Feuerrate im Burst. */
export function burstSchuesse(bursts: number, modus: Feuermodus): number {
  return Math.min(modus.feuerrate, bursts * (modus.burst_laenge ?? 1));
}

export interface Haltezahleingabe {
  brawn: number;
  /** Skillstufe Rückstoßkontrolle. */
  skill: number;
  /** Rückstoß des Feuermodus. */
  rueckstoss: number;
  /** Leiter auf Brawn, Rückstoß abfangen (liegend, Zweibein, Vordergriff, Kompensator), Perks. Keine Lage-Malsteps. */
  quellen: StepQuelle[];
}

/** Haltezahl = Zehnerstelle des Werts + Übrig, höchstens haltezahl_max; ab 6 Netto-Malsteps 0. Keine Probe, kein Krit. */
export function haltezahl(e: Haltezahleingabe, r: Regeln): number {
  const quellen: StepQuelle[] = e.rueckstoss ? [{ herkunft: 'waffe', name: 'Rückstoß', malsteps: e.rueckstoss }, ...e.quellen] : e.quellen;
  const p = probenwert({ statwert: e.brawn, skill: e.skill, quellen }, r);
  if (!p.moeglich) return 0;
  return Math.min(r.schiessen.haltezahl_max, zehnerstelle(p.zielwert, r) + p.uebrig);
}

/** Folgetreffer = Haltezahl − Rückstoßwürfel (W10, 1–10), mindestens 0. */
export function folgetreffer(halte: number, rueckstosswuerfel: number): number {
  return Math.max(0, halte - rueckstosswuerfel);
}

/** Garbenfaktor: nur bei Vollautomatik aus der Waffe, sonst 1. */
export function garbenfaktor(modus: 'EF' | 'Burst' | 'VA', waffe: Waffe): number {
  return modus === 'VA' ? (waffe.feuermodi.VA?.garbenfaktor ?? 1) : 1;
}

/** Kugeln je Folgetreffer; zusammen höchstens angesagte Schüsse − 1. Folgetreffer ohne Kugel entfallen. */
export function kugelnDerFolgetreffer(anzahl: number, faktor: number, angesagt: number): number[] {
  let rest = Math.max(0, angesagt - 1);
  const kugeln: number[] = [];
  for (let i = 0; i < anzahl && rest > 0; i++) {
    const k = Math.min(faktor, rest);
    kugeln.push(k);
    rest -= k;
  }
  return kugeln;
}

// ---------- Ladehemmung

/** Ladehemmungsrate in Prozent: LH des Modus + Zuschlag nach Zustand und Zuverlässigkeit (+ Trommelmagazin). */
export function ladehemmungsRate(lhModus: number, waffe: Waffe, zustand: string, trommelmagazin: boolean, r: Regeln): number {
  const zuschlag = r.ladehemmung.zustand_zuschlag[waffe.zuverlaessigkeit]?.[zustand] ?? 0;
  return lhModus + zuschlag + (trommelmagazin ? r.ladehemmung.trommelmagazin_zuschlag : 0);
}

export type Ladehemmung = 'keine' | 'einfach' | 'schwer';

/** Wurf > 100 − Rate → Ladehemmung; Wurf 100 bei Rate > 0 → schwere Ladehemmung. */
export function ladehemmung(wurf: number, rate: number, r: Regeln): Ladehemmung {
  if (rate <= 0) return 'keine';
  if (wurf >= r.ladehemmung.schwer_bei_wurf) return 'schwer';
  return wurf > 100 - rate ? 'einfach' : 'keine';
}

// ---------- Schuss auswerten

export interface Schussergebnis {
  ladehemmung: Ladehemmung;
  /** Stufe des Trefferwurfs; bei Ladehemmung null (kein Schuss). */
  stufe: Ergebnisstufe | null;
  /** Zone des ersten Treffers. */
  zone: string | null;
  /** Kugeln je Folgetreffer (leer ohne Folgetreffer). */
  folgetreffer: number[];
  /** Verbrauchte Patronen (bei Ladehemmung 0). */
  verbraucht: number;
}

export interface Schusseingabe {
  wurf: number;
  zielwert: number;
  krit_schwelle: number;
  moeglich: boolean;
  /** Ladehemmungsrate (0 = keine). */
  lh_rate: number;
  angesagt: number;
  /** Zone aus W8 oder Ansage. */
  zone: string;
  haltezahl: number;
  /** Rückstoßwürfel, nur bei mehr als einem Schuss. */
  rueckstosswuerfel: number | null;
  garbenfaktor: number;
}

/** Wertet einen Trefferwurf mit Folgeschüssen aus. Misslingt die Probe, gehen alle Schüsse ins Leere. */
export function schussAuswerten(e: Schusseingabe, r: Regeln): Schussergebnis {
  const lh = ladehemmung(e.wurf, e.lh_rate, r);
  if (lh !== 'keine') return { ladehemmung: lh, stufe: null, zone: null, folgetreffer: [], verbraucht: 0 };
  const stufe = auswerten(e.wurf, e);
  if (stufe === 'misserfolg') return { ladehemmung: lh, stufe, zone: null, folgetreffer: [], verbraucht: e.angesagt };
  const anzahl = e.angesagt > 1 && e.rueckstosswuerfel !== null ? folgetreffer(e.haltezahl, e.rueckstosswuerfel) : 0;
  return {
    ladehemmung: lh,
    stufe,
    zone: e.zone,
    folgetreffer: kugelnDerFolgetreffer(anzahl, e.garbenfaktor, e.angesagt),
    verbraucht: e.angesagt
  };
}
