// Probe zusammenstellen (konzept.md § 3.6, § 3.8c ohne Block 2): Statwert, Skill und alle Steps mit ihrer Quelle.
// Automatisch: Adrenalin bzw. Ruhepuls (nur im Gefecht), Zustände, Perks, Anpassungen der SL, SL-Steps für das
// ganze Gefecht, Sichtstufe (wenn die Probe Sicht braucht). Dazu die Steps der SL für diese eine Probe.

import type { Perk, Spieldaten } from '../daten/typen';
import { gefechtErgaenzt, type Charakter, type Gefecht } from '../speicher/charakter';
import { leiterSteps } from './leiter';
import { hpAktuell, modifikatorenDes, modifikatorSteps, type Probenkontext } from './modifikatoren';
import { probenwert, statwert, type Probenwert, type StepQuelle } from './probe';
import { lebenslage, sichtstufenSteps, zustandsSteps, type Lebenslage } from './zustaende';

/** Das laufende Gefecht oder null. */
export function gefechtVon(c: Charakter): Gefecht | null {
  return c.spielstand.gefecht.aktiv ? gefechtErgaenzt(c.spielstand.gefecht as Gefecht) : null;
}

/** Stand von Adrenalin bzw. Ruhepuls; außerhalb des Gefechts immer 0 (konzept.md § 3.7). */
export function leiterStand(c: Charakter): number {
  return gefechtVon(c)?.leiter ?? 0;
}

/**
 * Offene kritische Wunde, die kampfunfähig macht: kritisch, und ihre Zone nennt als Krit-Folge „kampfunfähig“
 * (koerperzonen.json, krit.kampfunfaehig). Die Blutung spielt keine Rolle; offen ist die Wunde, bis sie geheilt
 * ist (dann steht sie nicht mehr in der Liste). Regelfrage R6 (docs/offen.md): entschieden.
 */
export function offeneKritischeWunde(c: Charakter, d: Spieldaten): boolean {
  return c.spielstand.wunden.some(
    (w) => w.kritisch === true && d.koerperzonen.eintraege.find((z) => z.id === w.zone)?.krit.kampfunfaehig === true
  );
}

export function lebenslageDes(c: Charakter, d: Spieldaten): Lebenslage {
  return lebenslage(hpAktuell(c, d), offeneKritischeWunde(c, d), d.regeln);
}

export interface SlSteps {
  malsteps: number;
  stepshields: number;
  grund: string;
}

export interface ProbenAnfrage {
  stat: string;
  /** Skill der Probe; null = Probe ohne Skill (kein Malstep für Skill 0). */
  skill: string | null;
  /** Art der Probe für Modifikatoren und Zustände (z. B. initiative, nerve_anstieg). */
  probe?: string;
  /** Sichtstufe einrechnen (Schalter „braucht Sicht“). */
  braucht_sicht?: boolean;
  /** Sichtstufe, falls kein Gefecht läuft (im Gefecht gilt die des Gefechts). */
  sichtstufe?: string;
  /** Steps der SL nur für diese Probe. */
  sl?: SlSteps;
  /** IDs automatischer Quellen, die der Spieler für diese Probe per × ausgeschaltet hat. */
  ausgeschaltet?: string[];
  /** Weitere Quellen, die ein Ablauf mitbringt (z. B. Auslöser beim Anstieg, Überraschung bei der Initiative). */
  zusatz?: StepQuelle[];
  /** Quellen aus einer Auswahl des Spielers (Entfernung, Ziel); sie zählen, erscheinen aber nicht als Chip. */
  fest?: StepQuelle[];
  /** Umstände für die Bedingungen von Modifikatoren (Band, Stand, ohne Bewegung, aufgelegt). */
  kontext?: Omit<Probenkontext, 'stat' | 'skill' | 'probe'>;
}

export interface Probe {
  statwert: number | null;
  /** Skillstufe oder null ohne Skill. */
  skillstufe: number | null;
  /** Alle automatischen Quellen mit ID, auch ausgeschaltete. */
  automatisch: StepQuelle[];
  /** Was tatsächlich in die Rechnung eingeht. */
  quellen: StepQuelle[];
  /** null, solange der Stat keinen Wert hat. */
  wert: Probenwert | null;
}

/** Automatische Step-Quellen einer Probe, jede mit fester ID. */
export function automatischeQuellen(c: Charakter, d: Spieldaten, a: ProbenAnfrage): StepQuelle[] {
  const g = gefechtVon(c);
  const quellen: StepQuelle[] = [];
  for (const q of leiterSteps(g?.leiter ?? 0, a.stat, d)) quellen.push({ ...q, id: 'leiter' });
  const zustand = zustandsSteps(
    {
      adrenalinschock: c.spielstand.adrenalinschock.aktiv,
      kampfunfaehig: lebenslageDes(c, d) !== 'einsatzfaehig',
      gefecht_aktiv: !!g,
      gereizt: false,
      perks: c.perks,
      probe: a.probe
    },
    d
  );
  for (const q of zustand) quellen.push({ ...q, id: `zustand:${q.name}` });
  for (const [i, m] of modifikatorenDes(c, d).entries()) {
    for (const q of modifikatorSteps([m], { ...a.kontext, stat: a.stat, skill: a.skill, probe: a.probe })) quellen.push({ ...q, id: `${m.herkunft}:${m.quelle}:${i}` });
  }
  for (const u of g?.lage.sl_gefecht ?? []) {
    if (u.gilt_fuer && !(a.probe && u.gilt_fuer.includes(a.probe))) continue;
    quellen.push({ id: `sl_gefecht:${u.id}`, herkunft: 'sl', name: u.grund || 'SL (ganzes Gefecht)', malsteps: u.malsteps || undefined, stepshields: u.stepshields || undefined });
  }
  if (a.braucht_sicht) {
    for (const q of sichtstufenSteps(g?.sichtstufe ?? a.sichtstufe ?? d.regeln.sicht.stufen[0]!.id, false, d.regeln)) quellen.push({ ...q, id: 'sicht' });
  }
  for (const [n, q] of (a.zusatz ?? []).entries()) quellen.push({ ...q, id: q.id ?? `zusatz:${n}` });
  return quellen;
}

/** Stellt eine Probe zusammen und rechnet sie durch (konzept.md § 4.2, 4.3). */
export function probeStellen(c: Charakter, d: Spieldaten, a: ProbenAnfrage): Probe {
  const sw = statwert(c.stats[a.stat], d.regeln);
  const skillstufe = a.skill ? (c.skills[a.skill] ?? 0) : null;
  const automatisch = automatischeQuellen(c, d, a);
  const aus = new Set(a.ausgeschaltet ?? []);
  const quellen = [...(a.fest ?? []), ...automatisch.filter((q) => !aus.has(q.id!))];
  if (a.sl && (a.sl.malsteps || a.sl.stepshields)) {
    quellen.push({ id: 'sl', herkunft: 'sl', name: a.sl.grund || 'SL', malsteps: a.sl.malsteps || undefined, stepshields: a.sl.stepshields || undefined });
  }
  const wert = sw === null ? null : probenwert({ statwert: sw, skill: skillstufe, quellen }, d.regeln);
  return { statwert: sw, skillstufe, automatisch, quellen, wert };
}

/** Perks des Charakters, die an dieser Stelle einen Hinweis zeigen (hinweis_bei). */
export function perkHinweise(c: Charakter, d: Spieldaten, stellen: string[]): Perk[] {
  return d.perks.eintraege.filter((p) => c.perks.includes(p.id) && p.hinweis_bei.some((h) => stellen.includes(h)));
}

/** Überraschung in Runde 1: Malsteps auf die Initiative, außer ein Perk hebt sie auf (initiative.ueberrascht_mit_perk). */
export function initiativeZusatz(c: Charakter, d: Spieldaten): StepQuelle[] {
  const g = gefechtVon(c);
  if (!g || !g.ueberrascht || g.runde !== 1) return [];
  const r = d.regeln.initiative;
  let malsteps = r.ueberrascht_malsteps;
  for (const [perk, wert] of Object.entries(r.ueberrascht_mit_perk ?? {})) if (c.perks.includes(perk)) malsteps = Math.min(malsteps, wert);
  return malsteps > 0 ? [{ id: 'ueberrascht', herkunft: 'lage', name: 'überrascht (Runde 1)', malsteps }] : [];
}
