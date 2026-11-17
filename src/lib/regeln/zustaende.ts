// Zustände und ihre Malsteps (konzept.md § 4.5; Regelwerk: Würfelmechanik, Zustände).
// Adrenalin und Ruhepuls stehen in leiter.ts; Geblendet wirkt über die Sichtstufe.

import type { Regeln, Spieldaten } from '../daten/typen';
import type { StepQuelle } from './probe';

export type Lebenslage = 'einsatzfaehig' | 'kampfunfaehig' | 'tot';

/** HP 0 → kampfunfähig, ≤ −1 → tot; eine offene kritische Wunde macht ebenfalls kampfunfähig. */
export function lebenslage(hp: number, offeneKritischeWunde: boolean, r: Regeln): Lebenslage {
  if (hp <= r.lebenspunkte.tot_bei) return 'tot';
  if (hp <= r.lebenspunkte.kampfunfaehig_bei || offeneKritischeWunde) return 'kampfunfaehig';
  return 'einsatzfaehig';
}

/** Malsteps eines Zustands; ein Perk des Charakters kann sie senken (mit_perk in regeln.json). */
function mitPerk(standard: number, mitPerkTabelle: Record<string, number> | undefined, perks: string[]): number {
  let wert = standard;
  for (const [perk, malsteps] of Object.entries(mitPerkTabelle ?? {})) if (perks.includes(perk)) wert = Math.min(wert, malsteps);
  return wert;
}

export interface Zustandslage {
  adrenalinschock: boolean;
  kampfunfaehig: boolean;
  gefecht_aktiv: boolean;
  gereizt: boolean;
  /** Perks des Charakters (für mit_perk). */
  perks: string[];
  /** Art der Probe, z. B. erholungsprobe (Kampfunfähigkeit gilt dort nicht). */
  probe?: string;
}

/** Malsteps aus Zuständen; sie gelten für alle Proben. */
export function zustandsSteps(z: Zustandslage, d: Spieldaten): StepQuelle[] {
  const r = d.regeln.zustaende;
  const quellen: StepQuelle[] = [];
  if (z.adrenalinschock) {
    quellen.push({ herkunft: 'zustand', name: 'Adrenalinschock', malsteps: mitPerk(r.adrenalinschock.malsteps, r.adrenalinschock.mit_perk, z.perks) });
  }
  if (z.kampfunfaehig && !z.gefecht_aktiv && !(z.probe && r.kampfunfaehig.gilt_nicht_fuer.includes(z.probe))) {
    quellen.push({
      herkunft: 'zustand',
      name: 'Kampfunfähig',
      malsteps: mitPerk(r.kampfunfaehig.malsteps_ausserhalb_gefecht, r.kampfunfaehig.mit_perk, z.perks)
    });
  }
  if (z.gereizt) quellen.push({ herkunft: 'zustand', name: 'Gereizt', malsteps: r.gereizt.malsteps });
  return quellen;
}

/** Sichtstufe, die gilt: Geblendet setzt die Stufe aus regeln.json (keine). */
export function wirksameSicht(sichtstufe: string, geblendet: boolean, r: Regeln): string {
  return geblendet ? r.zustaende.geblendet.sichtstufe : sichtstufe;
}

/** Malsteps der Sichtstufe für eine Probenart aus sicht.gilt_fuer (schiessen, werfen, nahkampf …). */
export function sichtSteps(sichtstufe: string, geblendet: boolean, probe: string, r: Regeln): StepQuelle[] {
  if (!r.sicht.gilt_fuer.includes(probe)) return [];
  return sichtstufenSteps(sichtstufe, geblendet, r);
}

/** Malsteps der Sichtstufe ohne Rücksicht auf die Probenart (Schalter „braucht Sicht“ im Probenrechner). */
export function sichtstufenSteps(sichtstufe: string, geblendet: boolean, r: Regeln): StepQuelle[] {
  const id = wirksameSicht(sichtstufe, geblendet, r);
  const s = r.sicht.stufen.find((x) => x.id === id);
  if (!s || !s.malsteps) return [];
  return [{ herkunft: geblendet ? 'zustand' : 'lage', name: geblendet ? 'Geblendet' : `Sicht ${s.name}`, malsteps: s.malsteps }];
}
