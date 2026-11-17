// Modifikatoren aus Perks und Anpassungen der SL einsammeln und auf eine Probe anwenden (datenformat.md § Modifikator).
// Grundwerte (konzept.md § 4.10) entstehen aus Startwert + Modifikatoren „wert“, von Hand gesetzte Werte ersetzen sie.

import type { BandId, Modifikator, Spieldaten } from '../daten/typen';
import type { Charakter } from '../speicher/charakter';
import type { StepQuelle } from './probe';

export interface HerkunftModifikator extends Modifikator {
  herkunft: 'perk' | 'anpassung';
  /** Name des Perks oder Grund der Anpassung. */
  name: string;
}

/** Alle wirksamen Modifikatoren des Charakters: Perks (immer) und aktive Anpassungen. */
export function modifikatorenDes(c: Charakter, d: Spieldaten): HerkunftModifikator[] {
  const perks = new Map(d.perks.eintraege.map((p) => [p.id, p]));
  const liste: HerkunftModifikator[] = [];
  for (const id of c.perks) {
    const p = perks.get(id);
    if (!p) continue;
    for (const m of p.modifikatoren) liste.push({ ...m, herkunft: 'perk', name: p.name });
  }
  for (const a of c.anpassungen) {
    if (!a.aktiv) continue;
    liste.push({ ziel: a.ziel, wirkung: a.wirkung, bedingung: a.bedingung, herkunft: 'anpassung', name: a.grund });
  }
  return liste;
}

/** Umstände einer Probe, gegen die Ziel und Bedingung eines Modifikators geprüft werden. */
export interface Probenkontext {
  stat: string;
  skill?: string | null;
  /** Art der Probe, z. B. schiessen, haltezahl, erholungsprobe. */
  probe?: string;
  band?: BandId | null;
  stand?: string;
  ohne_bewegung?: boolean;
  aufgelegt?: boolean;
}

export function trifftZu(m: Modifikator, k: Probenkontext): boolean {
  const z = m.ziel;
  const zielPasst =
    z.art === 'alle' ||
    (z.art === 'stat' && z.id === k.stat) ||
    (z.art === 'skill' && !!k.skill && z.id === k.skill) ||
    (z.art === 'probe' && !!k.probe && z.id === k.probe);
  if (!zielPasst) return false;
  const b = m.bedingung;
  if (!b) return true;
  if (b.baender && (!k.band || !b.baender.includes(k.band))) return false;
  if (b.skill && b.skill !== k.skill) return false;
  if (b.stand && b.stand !== k.stand) return false;
  if (b.ohne_bewegung && !k.ohne_bewegung) return false;
  if (b.aufgelegt && !k.aufgelegt) return false;
  return true;
}

/** Step-Quellen aus Modifikatoren, die auf diese Probe wirken. Grundwert-Modifikatoren zählen hier nicht. */
export function modifikatorSteps(mods: (Modifikator & { herkunft: string; name: string })[], k: Probenkontext): StepQuelle[] {
  return mods
    .filter((m) => m.ziel.art !== 'grundwert' && trifftZu(m, k))
    .map((m) => ({
      herkunft: m.herkunft,
      name: m.name,
      malsteps: m.wirkung.malsteps,
      stepshields: m.wirkung.stepshields,
      krit_schwelle: m.wirkung.krit_schwelle
    }));
}

export interface Grundwerte {
  hp: number;
  schmerzresistenz: number;
  nahkampfschaden: number;
  /** Band-ID der genauen Wurfweite. */
  wurfweite_band: BandId;
}

/** Grundwerte = Start (regeln.json) + Perks und Anpassungen; von Hand gesetzte Werte ersetzen das Ergebnis. */
export function grundwerte(c: Charakter, d: Spieldaten): Grundwerte {
  const start = d.regeln.grundwerte;
  const plus: Record<string, number> = {};
  for (const m of modifikatorenDes(c, d)) {
    if (m.ziel.art !== 'grundwert' || !m.ziel.id || m.wirkung.wert === undefined) continue;
    plus[m.ziel.id] = (plus[m.ziel.id] ?? 0) + m.wirkung.wert;
  }
  const baender = d.regeln.schiessen.reichweitenbaender.map((b) => b.id);
  const startBand = Math.max(0, baender.indexOf(start.wurfweite_band));
  const bandIndex = Math.min(baender.length - 1, Math.max(0, startBand + (plus.wurfweite_band ?? 0)));
  const w: Grundwerte = {
    hp: start.hp + (plus.hp ?? 0),
    schmerzresistenz: start.schmerzresistenz + (plus.schmerzresistenz ?? 0),
    nahkampfschaden: start.nahkampfschaden + (plus.nahkampfschaden ?? 0),
    wurfweite_band: baender[bandIndex]!
  };
  const hand = c.grundwerte_manuell;
  for (const feld of ['hp', 'schmerzresistenz', 'nahkampfschaden'] as const) {
    if (typeof hand[feld] === 'number') w[feld] = hand[feld];
  }
  if (typeof hand.wurfweite_band === 'string' && baender.includes(hand.wurfweite_band as BandId)) {
    w.wurfweite_band = hand.wurfweite_band as BandId;
  }
  return w;
}

/** HP aktuell = HP-Höchstwert − Verlust durch Wunden − Prellungen (datenformat.md § Felder im Spielstand). */
export function hpAktuell(c: Charakter, d: Spieldaten): number {
  return grundwerte(c, d).hp - c.spielstand.hp_verlust_wunden - c.spielstand.prellungen;
}
