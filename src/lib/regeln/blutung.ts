// Blutung und Versorgen (konzept.md § 3.10, § 4.8; Regelwerk: Schaden, Blutung und Verletzungen, Blutung und Versorgen).
// Im Gefecht blutet niemand; die Fristen beginnen mit dem Gefechtsende. Die App zählt keine Zeit: Der Spieler trägt
// „Frist abgelaufen“ ein, wenn die SL es sagt (Entscheidung des Nutzers, 18.11.2026). Jede Zahl steht in regeln.json
// (`blutung`, `versorgen`).

import type { Blutungsart, Massnahme, Spieldaten } from '../daten/typen';
import type { Charakter, Wunde } from '../speicher/charakter';
import { grundwerte } from './modifikatoren';
import { gefechtVon, type ProbenAnfrage } from './probenrechner';

/** Blutungsart einer Wunde aus der Zone (koerperzonen.json, Spalte normal bzw. krit); null = blutet nicht. */
export function blutungsart(w: Wunde, d: Spieldaten): { id: string; art: Blutungsart } | null {
  const z = d.koerperzonen.eintraege.find((x) => x.id === w.zone);
  const id = (w.kritisch ? z?.krit.blutung : z?.normal.blutung) ?? null;
  const art = id ? d.regeln.blutung[id] : undefined;
  return id && art ? { id, art } : null;
}

/** Die Wunde blutet noch (weder gestoppt noch ausgeblutet). */
export function blutet(w: Wunde): boolean {
  return w.blutung.status === 'offen';
}

/** Frist in Minuten ab Gefechtsende; eine Maßnahme mit Faktor (Druckverband am Rumpf) vervielfacht sie einmal. */
export function fristMinuten(w: Wunde, d: Spieldaten): number | null {
  const b = blutungsart(w, d);
  if (!b) return null;
  const wirkung = w.versorgt ? b.art.versorgung[w.versorgt] : undefined;
  const faktor = wirkung && wirkung !== 'stoppt' ? wirkung.frist_faktor : 1;
  return b.art.frist_minuten * faktor;
}

/** Die Frist wurde durch eine Maßnahme verlängert (z. B. Druckverband bei kritischer Rumpfblutung). */
export function fristVerlaengert(w: Wunde, d: Spieldaten): boolean {
  const b = blutungsart(w, d);
  const wirkung = b && w.versorgt ? b.art.versorgung[w.versorgt] : undefined;
  return !!wirkung && wirkung !== 'stoppt';
}

export interface MoeglicheMassnahme {
  id: string;
  massnahme: Massnahme;
  wirkung: 'stoppt' | { frist_faktor: number };
}

/**
 * Maßnahmen, die für eine Wunde noch etwas bewirken. Blutet sie: alle Maßnahmen ihrer Blutungsart, außer einer
 * Fristverlängerung, die schon angewandt ist (sie wirkt nur einmal). Ist sie ausgeblutet und unversorgt (normale
 * Blutung nach Ablauf): die stoppenden Maßnahmen, damit sie heilen kann (nur versorgte Wunden heilen).
 */
export function massnahmenFuer(w: Wunde, d: Spieldaten): MoeglicheMassnahme[] {
  const b = blutungsart(w, d);
  if (!b || w.blutung.status === 'gestoppt') return [];
  if (w.blutung.status === 'abgelaufen' && w.versorgt) return [];
  const aus: MoeglicheMassnahme[] = [];
  for (const [id, wirkung] of Object.entries(b.art.versorgung)) {
    const m = d.regeln.versorgen[id];
    if (!m) continue;
    // Regelfrage R28 (docs/offen.md): vorläufig lässt sich eine ausgeblutete Wunde noch versorgen, damit sie heilt.
    if (w.blutung.status === 'abgelaufen' && wirkung !== 'stoppt') continue;
    if (wirkung !== 'stoppt' && w.versorgt === id) continue;
    aus.push({ id, massnahme: m, wirkung });
  }
  return aus;
}

/** Wunden des Charakters, die sich noch versorgen lassen. */
export function versorgbareWunden(c: Charakter, d: Spieldaten): Wunde[] {
  return c.spielstand.wunden.filter((w) => massnahmenFuer(w, d).length > 0);
}

/** Probe zum Versorgen: Skill der Maßnahme auf seinem Stat (skills.json). */
export function versorgenAnfrage(massnahmeId: string, d: Spieldaten): ProbenAnfrage {
  const m = d.regeln.versorgen[massnahmeId];
  if (!m) throw new Error(`unbekannte Maßnahme „${massnahmeId}“`);
  const skill = d.skills.eintraege.find((s) => s.id === m.skill);
  if (!skill) throw new Error(`unbekannter Skill „${m.skill}“`);
  return { stat: skill.stat, skill: skill.id, probe: 'versorgen' };
}

/** Triviale Probe: nach dem Gefecht ab der Skillstufe aus `trivial_nach_gefecht_ab` ohne Probe (Druckverband ab Erste Hilfe 1). */
export function versorgenTrivial(c: Charakter, massnahmeId: string, d: Spieldaten): boolean {
  const m = d.regeln.versorgen[massnahmeId];
  if (!m || m.trivial_nach_gefecht_ab === undefined || gefechtVon(c)) return false;
  return (c.skills[m.skill] ?? 0) >= m.trivial_nach_gefecht_ab;
}

/** Konzentration der Maßnahme im Gefecht; ein Perk mit `konzentration_statt` (Feldversorgung) ersetzt sie. */
export function versorgenKonzentration(c: Charakter, massnahmeId: string, d: Spieldaten): 'leicht' | 'voll' {
  const m = d.regeln.versorgen[massnahmeId];
  if (!m) throw new Error(`unbekannte Maßnahme „${massnahmeId}“`);
  for (const p of c.perks)
    for (const w of d.regeln.perk_wirkungen[p] ?? [])
      if (w.art === 'konzentration_statt' && w.aktion === m.konzentration) return w.konzentration;
  return d.regeln.konzentration.aktionen[m.konzentration] ?? 'voll';
}

function ersetzeWunde(c: Charakter, neu: Wunde, mehr: Partial<Charakter['spielstand']> = {}): Charakter {
  return {
    ...c,
    geaendert: new Date().toISOString(),
    spielstand: { ...c.spielstand, ...mehr, wunden: c.spielstand.wunden.map((w) => (w.id === neu.id ? neu : w)) }
  };
}

function wundeVon(c: Charakter, id: string): Wunde {
  const w = c.spielstand.wunden.find((x) => x.id === id);
  if (!w) throw new Error(`unbekannte Wunde „${id}“`);
  return w;
}

/**
 * Gelungene Maßnahme eintragen. „stoppt“: Blutung gestoppt (bei einer ausgebluteten Wunde bleibt der Status, sie
 * gilt nun als versorgt). Fristfaktor: die Wunde blutet weiter, die Frist ist verlängert. Eine misslungene Probe
 * ändert nichts; sie darf wiederholt werden, solange die Frist läuft (Regelwerk: vorläufig).
 */
export function versorgen(c: Charakter, wundId: string, massnahmeId: string, d: Spieldaten): Charakter {
  const w = wundeVon(c, wundId);
  const m = massnahmenFuer(w, d).find((x) => x.id === massnahmeId);
  if (!m) throw new Error(`„${massnahmeId}“ wirkt bei dieser Wunde nicht`);
  const status = m.wirkung === 'stoppt' && w.blutung.status === 'offen' ? 'gestoppt' : w.blutung.status;
  return ersetzeWunde(c, { ...w, versorgt: massnahmeId, blutung: { ...w.blutung, status } });
}

export interface Fristablauf {
  /** Zusätzlicher Schaden (normale Blutung), zählt zur Wunde. */
  schaden: number;
  /** Tod durch Verbluten oder weil die HP unter die Grenze fallen. */
  tot: boolean;
  /** Durch den Schaden kampfunfähig (HP auf der Grenze), wenn nicht tot. */
  kampfunfaehig: boolean;
  hp_vorher: number;
  hp_nachher: number;
}

/** Was passiert, wenn die Frist einer blutenden Wunde abläuft (ohne etwas zu ändern). */
export function fristablauf(c: Charakter, wundId: string, d: Spieldaten): Fristablauf {
  const w = wundeVon(c, wundId);
  const b = blutungsart(w, d);
  if (!b || !blutet(w)) throw new Error('Die Wunde blutet nicht');
  const ss = c.spielstand;
  const hpVorher = grundwerte(c, d).hp - ss.hp_verlust_wunden - ss.prellungen;
  const a = b.art;
  let schaden = 0;
  if (a.bei_ablauf === 'schaden') {
    const roh = w.schaden * (a.schaden_anteil ?? 0);
    schaden = a.runden === 'ab' ? Math.floor(roh) : Math.ceil(roh);
  }
  const hpNachher = hpVorher - schaden;
  const r = d.regeln.lebenspunkte;
  const tot = ss.tot || a.bei_ablauf === 'tod' || hpNachher <= r.tot_bei;
  return { schaden, tot, kampfunfaehig: !tot && hpNachher <= r.kampfunfaehig_bei, hp_vorher: hpVorher, hp_nachher: hpNachher };
}

/** Frist abgelaufen: Schaden zur Wunde und zu den HP bzw. Tod; die Wunde blutet danach nicht mehr. */
export function fristAblaufen(c: Charakter, wundId: string, d: Spieldaten): Charakter {
  const w = wundeVon(c, wundId);
  const f = fristablauf(c, wundId, d);
  return ersetzeWunde(
    c,
    { ...w, schaden: w.schaden + f.schaden, blutung: { ...w.blutung, status: 'abgelaufen' } },
    { hp_verlust_wunden: c.spielstand.hp_verlust_wunden + f.schaden, tot: f.tot }
  );
}
