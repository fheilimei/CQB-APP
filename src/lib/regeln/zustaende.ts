// Zustände und ihre Malsteps (konzept.md § 4.5; Regelwerk: Würfelmechanik, Zustände).
// Adrenalin und Ruhepuls stehen in leiter.ts; Geblendet wirkt über die Sichtstufe.

import type { Regeln, Spieldaten, Sprengwaffe } from '../daten/typen';
import type { Gefecht } from '../speicher/charakter';
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

/** Runden, die Geblendet noch dauert, die laufende eingeschlossen; 0 = nicht geblendet. */
export function geblendetRunden(g: Gefecht | null): number {
  if (!g?.geblendet_bis) return 0;
  return Math.max(0, g.geblendet_bis - g.runde + 1);
}

/** Gereizt im laufenden Gefecht (Sprengwirkung, Reizgas). */
export function istGereizt(g: Gefecht | null): boolean {
  return !!g?.reizgas?.gereizt;
}

/** Sichtstufe, die im Gefecht gilt: die eingestellte, bei Geblendet „keine“. Ohne Gefecht die erste Stufe. */
export function geltendeSicht(g: Gefecht | null, r: Regeln): string {
  return wirksameSicht(g?.sichtstufe ?? r.sicht.stufen[0]!.id, geblendetRunden(g) > 0, r);
}

export interface Blendung {
  /** Runden Geblendet ab der Detonation; 0 = nicht geblendet. */
  runden: number;
  stagger: boolean;
}

/**
 * Wirkung einer Blendgranate auf dich (Sprengwirkung, Blendung), aus `sonderwirkung` der Waffe: Runden Geblendet je Band
 * (`geblendet_runden`), Stagger je Band (`stagger`). In den Bändern aus `kopf_verdeckt_schuetzt` blendet sie nur, wenn der
 * Kopf vom Explosionspunkt aus frei ist. Wer mit Erfolg reagiert (abgewendet), wird nicht geblendet; der Stagger bleibt.
 */
export function blendung(w: Sprengwaffe | undefined, band: string, kopfVerdeckt: boolean, abgewendet: boolean): Blendung {
  const sw = w?.sonderwirkung;
  if (!sw || sw.art !== 'blendung') return { runden: 0, stagger: false };
  const runden = (sw.geblendet_runden as Record<string, number> | undefined)?.[band] ?? 0;
  const stagger = ((sw.stagger as string[] | undefined) ?? []).includes(band);
  const geschuetzt = kopfVerdeckt && ((sw.kopf_verdeckt_schuetzt as string[] | undefined) ?? []).includes(band);
  return { runden: abgewendet || geschuetzt ? 0 : runden, stagger };
}
