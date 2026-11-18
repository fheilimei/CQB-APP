// Heilung (konzept.md § 3.12, § 4.9; Regelwerk: Schaden, Blutung und Verletzungen, Heilung).
// Nacht Ruhe: Prellungen zurück, Adrenalinschock vorbei. Ruhetag: dazu Erholungsprobe (HP) und ein Tag Heilung für jede
// versorgte Wunde. Jede Zahl steht in regeln.json (`heilung`, `zustaende.adrenalinschock`).

import type { Spieldaten } from '../daten/typen';
import type { Charakter, Wunde } from '../speicher/charakter';
import { blutet, blutungsart } from './blutung';
import { grundwerte } from './modifikatoren';
import type { ProbenAnfrage } from './probenrechner';
import type { Ergebnisstufe, StepQuelle } from './probe';

export type Nachsorge = 'krit' | 'gelungen' | 'misslungen';

/**
 * Die Wunde heilt: Sie ist versorgt und blutet nicht mehr. Eine Wunde ohne Blutung (Zone ohne Blutungsart) braucht
 * keine Versorgung und heilt ebenfalls (Regelfrage R40, docs/offen.md: vorläufig).
 */
export function heilt(w: Wunde, d: Spieldaten): boolean {
  if (!blutungsart(w, d)) return true;
  return !!w.versorgt && !blutet(w);
}

/**
 * Heildauer in Ruhetagen: Schaden × Tage je Schaden (kritisch: Wochen aus Ruhetagen) × Nachsorge-Faktor, aufgerundet.
 * Ohne Nachsorge (noch keine) gilt der Faktor „keine“. Regelfrage R39 (docs/offen.md): vorläufig wird bei einer
 * kritischen Wunde in Ruhetagen gerundet, nicht in Wochen.
 */
export function heildauer(w: Wunde, d: Spieldaten): number {
  const h = d.regeln.heilung;
  const tage = w.schaden * (w.kritisch ? h.heildauer_tage_je_schaden.kritisch : h.heildauer_tage_je_schaden.normal);
  return Math.ceil(tage * h.nachsorge_faktor[w.nachsorge ?? 'keine']);
}

/** Ruhetage, bis die Wunde verheilt ist (0 = verheilt). */
export function restHeildauer(w: Wunde, d: Spieldaten): number {
  return Math.max(0, heildauer(w, d) - w.ruhetage_geheilt);
}

/** Nachsorge möglich: einmal je Wunde, nach dem Versorgen. */
export function nachsorgeMoeglich(w: Wunde, d: Spieldaten): boolean {
  return w.nachsorge === null && !!w.versorgt && heilt(w, d);
}

/** Probe der Nachsorge: Erste Hilfe, bei einer kritischen Wunde Operation (regeln.json heilung.nachsorge_skill). */
export function nachsorgeAnfrage(w: Wunde, d: Spieldaten): ProbenAnfrage {
  const id = w.kritisch ? d.regeln.heilung.nachsorge_skill.kritisch : d.regeln.heilung.nachsorge_skill.normal;
  const skill = d.skills.eintraege.find((s) => s.id === id);
  if (!skill) throw new Error(`unbekannter Skill „${id}“`);
  return { stat: skill.stat, skill: skill.id, probe: 'nachsorge' };
}

export function nachsorgeSetzen(c: Charakter, wundId: string, ergebnis: Nachsorge): Charakter {
  return {
    ...c,
    geaendert: new Date().toISOString(),
    spielstand: { ...c.spielstand, wunden: c.spielstand.wunden.map((w) => (w.id === wundId ? { ...w, nachsorge: ergebnis } : w)) }
  };
}

/** Skill des Betreuers bei der Pflege: bei einer offenen kritischen Wunde Operation, sonst Erste Hilfe. */
export function pflegeSkill(c: Charakter, d: Spieldaten): string {
  const p = d.regeln.heilung.pflege_skill;
  return c.spielstand.wunden.some((w) => w.kritisch) ? p.offene_kritische_wunde : p.normal;
}

/** Wunden, die nicht heilen, weil sie nicht versorgt sind: je 1 Malstep auf die Erholungsprobe. */
export function unversorgteWunden(c: Charakter, d: Spieldaten): Wunde[] {
  return c.spielstand.wunden.filter((w) => !heilt(w, d));
}

/**
 * Erholungsprobe auf Grit. Malsteps je unversorgter Wunde und Stepshields aus der Pflege kommen als feste Quellen dazu;
 * schlechte Umstände trägt der Spieler als Steps der SL ein. Kampfunfähigkeit gilt nicht (zustaende.kampfunfaehig.gilt_nicht_fuer).
 */
export function erholungAnfrage(c: Charakter, pflege: Nachsorge | null, d: Spieldaten): ProbenAnfrage {
  const h = d.regeln.heilung;
  const zusatz: StepQuelle[] = [];
  const n = unversorgteWunden(c, d).length;
  if (n) zusatz.push({ id: 'unversorgt', herkunft: 'zustand', name: n === 1 ? 'Unversorgte Wunde' : `${n} unversorgte Wunden`, malsteps: n * h.malsteps_je_unversorgte_wunde });
  const schilde = pflege === 'krit' ? h.pflege_stepshields.krit : pflege === 'gelungen' ? h.pflege_stepshields.gelungen : 0;
  if (schilde) zusatz.push({ id: 'pflege', herkunft: 'lage', name: 'Pflege', stepshields: schilde });
  return { stat: h.erholungsprobe.stat, skill: null, probe: 'erholungsprobe', zusatz };
}

/** HP aus der Erholungsprobe je Ergebnis. */
export function erholungHp(stufe: Ergebnisstufe, d: Spieldaten): number {
  const e = d.regeln.heilung.erholungsprobe;
  return stufe === 'krit' ? e.krit : stufe === 'erfolg' ? e.gelungen : e.misslungen;
}

export interface Ruhebericht {
  prellungen: number;
  adrenalinschock_vorbei: boolean;
  /** Nur am Ruhetag: */
  hp_gewonnen: number;
  hp_vorher: number;
  hp_nachher: number;
  /** Wunden, die einen Tag geheilt sind, mit verbleibenden Ruhetagen (0 = verheilt und gestrichen). */
  geheilt: { wunde: Wunde; rest: number }[];
  /** Wunden, die nicht heilen (unversorgt). */
  heilen_nicht: Wunde[];
}

/** Eine Nacht Ruhe: Prellungen zurück; die Ruhe beendet den Adrenalinschock (zustaende.adrenalinschock.ende_ruhe_stunden). */
export function nachtRuhe(c: Charakter): Charakter {
  return {
    ...c,
    geaendert: new Date().toISOString(),
    spielstand: { ...c.spielstand, prellungen: 0, adrenalinschock: { aktiv: false, ruhe_stunden: 0 } }
  };
}

/**
 * Ruhe eintragen. `erholung` null = nur eine Nacht. Sonst ein Ruhetag (mit der Nacht davor): HP aus der Erholungsprobe,
 * höchstens bis zum Grundwert; jede heilende Wunde zählt einen Ruhetag; verheilte Wunden werden gestrichen
 * (die HP kommen nicht mit der Wunde zurück).
 */
export function ruhen(c: Charakter, erholung: Ergebnisstufe | null, d: Spieldaten): { nach: Charakter; bericht: Ruhebericht } {
  const ss = c.spielstand;
  const max = grundwerte(c, d).hp;
  const hpVorher = max - ss.hp_verlust_wunden - ss.prellungen;
  let nach = nachtRuhe(c);
  const bericht: Ruhebericht = {
    prellungen: ss.prellungen,
    adrenalinschock_vorbei: ss.adrenalinschock.aktiv,
    hp_gewonnen: 0,
    hp_vorher: hpVorher,
    hp_nachher: hpVorher + ss.prellungen,
    geheilt: [],
    heilen_nicht: []
  };
  if (erholung !== null && !ss.tot) {
    const gewonnen = Math.min(erholungHp(erholung, d), ss.hp_verlust_wunden);
    const wunden: Wunde[] = [];
    for (const w of ss.wunden) {
      if (!heilt(w, d)) { bericht.heilen_nicht.push(w); wunden.push(w); continue; }
      const neu = { ...w, ruhetage_geheilt: w.ruhetage_geheilt + 1 };
      const rest = restHeildauer(neu, d);
      bericht.geheilt.push({ wunde: neu, rest });
      if (rest > 0) wunden.push(neu);
    }
    nach = { ...nach, spielstand: { ...nach.spielstand, hp_verlust_wunden: ss.hp_verlust_wunden - gewonnen, wunden } };
    bericht.hp_gewonnen = gewonnen;
    bericht.hp_nachher = max - ss.hp_verlust_wunden + gewonnen;
  }
  return { nach, bericht };
}
