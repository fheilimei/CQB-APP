// Modifikatoren aus Perks und Anpassungen der SL einsammeln und auf eine Probe anwenden (datenformat.md § Modifikator).
// Grundwerte (konzept.md § 4.10) entstehen aus Startwert + Modifikatoren „wert“, von Hand gesetzte Werte ersetzen sie.

import type { BandId, Modifikator, Spieldaten } from '../daten/typen';
import type { Charakter } from '../speicher/charakter';
import type { StepQuelle } from './probe';

export interface HerkunftModifikator extends Modifikator {
  herkunft: 'perk' | 'anpassung';
  /** Name des Perks oder Grund der Anpassung. */
  name: string;
  /** ID des Perks bzw. der Anpassung, für Sprung und Rückverweis (konzept.md § 3.0b). */
  quelle: string;
}

/** Alle wirksamen Modifikatoren des Charakters: Perks (immer) und aktive Anpassungen. */
export function modifikatorenDes(c: Charakter, d: Spieldaten): HerkunftModifikator[] {
  const perks = new Map(d.perks.eintraege.map((p) => [p.id, p]));
  const liste: HerkunftModifikator[] = [];
  for (const id of c.perks) {
    const p = perks.get(id);
    if (!p) continue;
    for (const m of p.modifikatoren) liste.push({ ...m, herkunft: 'perk', name: p.name, quelle: id });
  }
  for (const a of c.anpassungen) {
    if (!a.aktiv) continue;
    liste.push({ ziel: a.ziel, wirkung: a.wirkung, bedingung: a.bedingung, herkunft: 'anpassung', name: a.grund, quelle: a.id });
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

/** Eine Zeile der Aufschlüsselung: woher eine Änderung kommt und wie viel sie ausmacht. */
export interface Beitrag {
  herkunft: 'perk' | 'anpassung';
  /** ID des Perks bzw. der Anpassung. */
  quelle: string;
  name: string;
  wert: number;
}

/** Aufschlüsselung eines Grundwerts (konzept.md § 3.0b, § 4.10). Wurfweite als Band-ID. */
export interface GrundwertAufschluesselung {
  id: keyof Grundwerte;
  start: number | string;
  beitraege: Beitrag[];
  /** Start + Beiträge, ohne Eingriff von Hand. */
  berechnet: number | string;
  /** Von Hand gesetzter Wert (Schreibmodus) oder null. */
  hand: number | string | null;
  /** Was gilt: der Wert von Hand, sonst der berechnete. */
  ergebnis: number | string;
}

/** Grundwerte mit Start (regeln.json), Beiträgen der Perks und Anpassungen und dem Wert von Hand. */
export function grundwerteAufgeschluesselt(c: Charakter, d: Spieldaten): GrundwertAufschluesselung[] {
  const mods = modifikatorenDes(c, d);
  const baender = d.regeln.schiessen.reichweitenbaender.map((b) => b.id as string);
  return (Object.keys(d.regeln.grundwerte) as (keyof Grundwerte)[]).map((id) => {
    const start = d.regeln.grundwerte[id] as number | string;
    const beitraege: Beitrag[] = mods
      .filter((m) => m.ziel.art === 'grundwert' && m.ziel.id === id && typeof m.wirkung.wert === 'number')
      .map((m) => ({ herkunft: m.herkunft, quelle: m.quelle, name: m.name, wert: m.wirkung.wert! }));
    const plus = beitraege.reduce((s, b) => s + b.wert, 0);
    let berechnet: number | string;
    let hand: number | string | null = c.grundwerte_manuell[id] ?? null;
    if (typeof start === 'string') {
      // Wurfweite: Startband plus Bänder, begrenzt auf die vorhandenen Bänder.
      const i = Math.max(0, baender.indexOf(start));
      berechnet = baender[Math.min(baender.length - 1, Math.max(0, i + plus))]!;
      if (typeof hand !== 'string' || !baender.includes(hand)) hand = null;
    } else {
      berechnet = start + plus;
      if (typeof hand !== 'number') hand = null;
    }
    return { id, start, beitraege, berechnet, hand, ergebnis: hand ?? berechnet };
  });
}

/** Grundwerte = Start (regeln.json) + Perks und Anpassungen; von Hand gesetzte Werte ersetzen das Ergebnis. */
export function grundwerte(c: Charakter, d: Spieldaten): Grundwerte {
  return Object.fromEntries(grundwerteAufgeschluesselt(c, d).map((g) => [g.id, g.ergebnis])) as unknown as Grundwerte;
}

/** HP aktuell = HP-Höchstwert − Verlust durch Wunden − Prellungen (datenformat.md § Felder im Spielstand). */
export function hpAktuell(c: Charakter, d: Spieldaten): number {
  return grundwerte(c, d).hp - c.spielstand.hp_verlust_wunden - c.spielstand.prellungen;
}
