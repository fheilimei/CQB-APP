// Zugang der Klassen, Aufstieg und Klassenwechsel (konzept.md § 4.11; Regelwerk: Charakteraufstieg, Klassen).

import type { Klasse, Rang, Spieldaten } from '../daten/typen';
import type { Abweichungswurf, Charakter } from '../speicher/charakter';
import { naechsterRang, rangfolge, statwert } from './probe';

// ---------- Zugang

export interface Zugang {
  skills: Set<string>;
  perks: Set<string>;
}

const GRUPPE = 'gruppe:';

function klasseVon(id: string, d: Spieldaten): Klasse {
  const k = d.klassen.eintraege.find((x) => x.id === id);
  if (!k) throw new Error(`unbekannte Klasse „${id}“`);
  return k;
}

/** Löst eine Liste aus IDs und Gruppen auf. Gruppen geben nie exklusive Einträge frei. */
function aufloesen(liste: string[] | undefined, eintraege: { id: string; gruppe: string; exklusiv?: string[] }[]): string[] {
  const ergebnis: string[] = [];
  for (const x of liste ?? []) {
    if (x.startsWith(GRUPPE)) {
      const g = x.slice(GRUPPE.length);
      for (const e of eintraege) if (e.gruppe === g && !e.exklusiv?.length) ergebnis.push(e.id);
    } else ergebnis.push(x);
  }
  return ergebnis;
}

/** Zugang einer Klasse: eigene Listen, die Kette über „wie“ und die exklusiven Einträge der Kette. */
export function zugangDerKlasse(id: string, d: Spieldaten): Zugang {
  const k = klasseVon(id, d);
  if (k.zugang.laufbahn_gesamt) {
    const z: Zugang = { skills: new Set(), perks: new Set() };
    for (const andere of d.klassen.eintraege) {
      if (andere.laufbahn !== k.laufbahn || andere.zugang.laufbahn_gesamt) continue;
      const teil = zugangDerKlasse(andere.id, d);
      teil.skills.forEach((s) => z.skills.add(s));
      teil.perks.forEach((p) => z.perks.add(p));
    }
    return z;
  }
  const skills = new Set<string>();
  const perks = new Set<string>();
  const kette: string[] = [];
  let aktuell: Klasse | undefined = k;
  while (aktuell && !kette.includes(aktuell.id)) {
    kette.push(aktuell.id);
    aufloesen(aktuell.zugang.skills, d.skills.eintraege).forEach((s) => skills.add(s));
    aufloesen(aktuell.zugang.perks, d.perks.eintraege).forEach((p) => perks.add(p));
    aktuell = aktuell.zugang.wie ? klasseVon(aktuell.zugang.wie, d) : undefined;
  }
  for (const s of d.skills.eintraege) if (s.exklusiv?.some((x) => kette.includes(x))) skills.add(s.id);
  for (const p of d.perks.eintraege) if (p.exklusiv?.some((x) => kette.includes(x))) perks.add(p.id);
  return { skills, perks };
}

/** Aktuelle Klasse = letzter Eintrag im Klassenweg; null bei freier Erstellung ohne Klasse. */
export function aktuelleKlasse(c: Charakter): string | null {
  return c.klassenweg[c.klassenweg.length - 1]?.klasse ?? null;
}

/**
 * Zugang des Charakters; null = ohne Klasse, alles zugänglich.
 * Zweite Spezialisierung: Vereinigung mit der Spezialisierung davor im Klassenweg.
 */
export function zugangDes(c: Charakter, d: Spieldaten): Zugang | null {
  const letzter = c.klassenweg[c.klassenweg.length - 1];
  if (!letzter) return null;
  const z = zugangDerKlasse(letzter.klasse, d);
  if (letzter.art === 'zweite_spezialisierung') {
    const erste = [...c.klassenweg.slice(0, -1)].reverse().find((s) => klasseVon(s.klasse, d).art === 'spezialisierung');
    if (erste) {
      const teil = zugangDerKlasse(erste.klasse, d);
      teil.skills.forEach((s) => z.skills.add(s));
      teil.perks.forEach((p) => z.perks.add(p));
    }
  }
  return z;
}

/** Skills des Charakters, die er hat (Stufe ≥ 1), aber nicht steigern kann. */
export function eingefroreneSkills(c: Charakter, d: Spieldaten): string[] {
  const z = zugangDes(c, d);
  if (!z) return [];
  return Object.entries(c.skills)
    .filter(([id, stufe]) => stufe > 0 && !z.skills.has(id))
    .map(([id]) => id);
}

// ---------- Aufstieg

/** Grund, warum ein Kauf nicht geht; null = möglich. */
export type Sperre = 'kein_zugang' | 'maximum' | 'punkte' | 'voraussetzung' | 'vorhanden' | 'unbekannt' | null;

export function skillSteigernSperre(c: Charakter, skillId: string, d: Spieldaten): Sperre {
  if (!d.skills.eintraege.some((s) => s.id === skillId)) return 'unbekannt';
  const z = zugangDes(c, d);
  if (z && !z.skills.has(skillId)) return 'kein_zugang';
  if ((c.skills[skillId] ?? 0) >= d.regeln.aufstieg.skill_max) return 'maximum';
  if (c.freie_punkte < d.regeln.aufstieg.skill_level_kosten) return 'punkte';
  return null;
}

export interface PerkVoraussetzung {
  art: 'stat' | 'perk';
  id: string;
  min?: number;
  erfuellt: boolean;
}

export function perkVoraussetzungen(c: Charakter, perkId: string, d: Spieldaten): PerkVoraussetzung[] {
  const p = d.perks.eintraege.find((x) => x.id === perkId);
  if (!p) return [];
  return [
    ...p.voraussetzung.stats.map((v) => ({
      art: 'stat' as const,
      id: v.stat,
      min: v.min,
      erfuellt: (statwert(c.stats[v.stat], d.regeln) ?? 0) >= v.min
    })),
    ...p.voraussetzung.perks.map((id) => ({ art: 'perk' as const, id, erfuellt: c.perks.includes(id) }))
  ];
}

export function perkKaufenSperre(c: Charakter, perkId: string, d: Spieldaten): Sperre {
  const p = d.perks.eintraege.find((x) => x.id === perkId);
  if (!p) return 'unbekannt';
  if (c.perks.includes(perkId)) return 'vorhanden';
  const z = zugangDes(c, d);
  if (z && !z.perks.has(perkId)) return 'kein_zugang';
  if (perkVoraussetzungen(c, perkId, d).some((v) => !v.erfuellt)) return 'voraussetzung';
  if (c.freie_punkte < p.rang) return 'punkte';
  return null;
}

export function statrankUpSperre(c: Charakter, statId: string, d: Spieldaten): Sperre {
  const rang = c.stats[statId]?.rang;
  if (!rang) return 'unbekannt';
  if (!naechsterRang(rang, d.regeln)) return 'maximum';
  if (c.freie_punkte < d.regeln.aufstieg.statrank_up_kosten) return 'punkte';
  return null;
}

// ---------- Klassenwechsel

/** Ränge des Charakters erfüllen das Rank-Set: beide absteigend, jeder Rang ≥ dem an gleicher Stelle. */
export function rankSetErfuellt(raenge: Rang[], rankSet: Rang[], d: Spieldaten): boolean {
  const wert = (r: Rang) => d.regeln.raenge[r];
  const a = [...raenge].sort((x, y) => wert(y) - wert(x));
  const b = [...rankSet].sort((x, y) => wert(y) - wert(x));
  if (a.length < b.length) return false;
  return b.every((r, i) => wert(a[i]!) >= wert(r));
}

/** Statrank-Ups, die mindestens fehlen, um das Rank-Set zu erfüllen (für die Kostenangabe). */
export function fehlendeRangstufen(raenge: Rang[], rankSet: Rang[], d: Spieldaten): number {
  const folge = rangfolge(d.regeln);
  const pos = (r: Rang) => folge.length - 1 - folge.indexOf(r);
  const a = [...raenge].sort((x, y) => pos(y) - pos(x));
  const b = [...rankSet].sort((x, y) => pos(y) - pos(x));
  return b.reduce((s, r, i) => s + Math.max(0, pos(r) - pos(a[i] ?? folge[folge.length - 1]!)), 0);
}

export interface Pruefpunkt {
  art: 'rank_set' | 'mindestskills' | 'mindestskills_wahl' | 'stat_rang' | 'weg';
  erfuellt: boolean;
  /** Fehlende Skills (ID → Mindestwert) bzw. Stat und Rang. */
  fehlt?: Record<string, number | string>;
  /** Freie Punkte, die mindestens fehlen (Ränge und Skill-Level). */
  kosten?: number;
}

function stufeDes(k: Klasse, d: Spieldaten) {
  const s = d.klassen.stufen.find((x) => x.stufe === k.stufe);
  if (!s) throw new Error(`Stufe ${k.stufe} fehlt in klassen.json`);
  return s;
}

/**
 * Prüft einen Wechsel in die Zielklasse (konzept.md § 3.0d). Die Freigabe der SL prüft die App nicht.
 * Bei Meistern zählen zusätzlich die Mindestskills der Stufe-4-Klasse aus dem Klassenweg.
 * `zweiteSpezialisierung`: Die Zielklasse ist eine Spezialisierung, der Charakter gilt danach als Stufe 4.
 */
export function klassenwechselPruefen(c: Charakter, zielId: string, d: Spieldaten, zweiteSpezialisierung = false): Pruefpunkt[] {
  const ziel = klasseVon(zielId, d);
  const r = d.regeln;
  const punkte: Pruefpunkt[] = [];

  // 1. Rank-Set der Zielstufe (zweite Spezialisierung: Stufe 4)
  const zielStufe = zweiteSpezialisierung ? ziel.stufe + 1 : ziel.stufe;
  const set = d.klassen.stufen.find((s) => s.stufe === zielStufe)?.rank_set ?? stufeDes(ziel, d).rank_set;
  const raenge = Object.values(c.stats).map((s) => s.rang).filter((x): x is Rang => !!x);
  const rsOk = rankSetErfuellt(raenge, set, d);
  punkte.push({ art: 'rank_set', erfuellt: rsOk, kosten: rsOk ? 0 : fehlendeRangstufen(raenge, set, d) * r.aufstieg.statrank_up_kosten });

  // 2. Mindestskills; Meister zusätzlich die der Stufe-4-Klasse aus dem Klassenweg
  const mindest: Record<string, number> = { ...ziel.mindestskills };
  const weg = c.klassenweg.map((s) => ({ ...s, k: klasseVon(s.klasse, d) }));
  const stufe4 = [...weg].reverse().find((s) => s.k.art === 'erweiterte_form' || s.art === 'zweite_spezialisierung');
  if (ziel.art === 'meister' && stufe4) {
    for (const [id, w] of Object.entries(stufe4.k.mindestskills)) mindest[id] = Math.max(mindest[id] ?? 0, w);
  }
  const fehlt: Record<string, number> = {};
  let skillKosten = 0;
  for (const [id, w] of Object.entries(mindest)) {
    const hat = c.skills[id] ?? 0;
    if (hat < w) {
      fehlt[id] = w;
      skillKosten += (w - hat) * r.aufstieg.skill_level_kosten;
    }
  }
  punkte.push({ art: 'mindestskills', erfuellt: Object.keys(fehlt).length === 0, fehlt, kosten: skillKosten });

  // Meister: Wahl von Skills auf dem verlangten Wert, davon einer exklusiv aus einer Spezialisierung des Wegs
  if (ziel.mindestskills_wahl) {
    const w = ziel.mindestskills_wahl;
    const hoch = Object.entries(c.skills).filter(([, s]) => s >= w.wert).map(([id]) => id);
    const exklusivDesWegs = new Set(
      d.skills.eintraege.filter((s) => s.exklusiv?.some((k) => weg.some((x) => x.klasse === k))).map((s) => s.id)
    );
    const exklusivOk = hoch.filter((id) => exklusivDesWegs.has(id)).length >= w.davon_exklusiv;
    punkte.push({ art: 'mindestskills_wahl', erfuellt: hoch.length >= w.anzahl && exklusivOk });
  }

  // 3. Stat auf Rang (Spezialisierung, erweiterte Form, zweite Spezialisierung)
  if (ziel.voraussetzung_stat) {
    const v = ziel.voraussetzung_stat;
    const hat = c.stats[v.stat]?.rang;
    const ok = !!hat && r.raenge[hat] >= r.raenge[v.rang];
    punkte.push({ art: 'stat_rang', erfuellt: ok, fehlt: ok ? undefined : { [v.stat]: v.rang } });
  }

  // 4. Weg: erweiterte Form verlangt ihre Spezialisierung; Meister eine Stufe-4-Klasse seiner Laufbahn
  if (ziel.art === 'erweiterte_form') {
    punkte.push({ art: 'weg', erfuellt: weg.some((s) => s.klasse === ziel.erweitert) });
  } else if (ziel.art === 'meister') {
    punkte.push({ art: 'weg', erfuellt: !!stufe4 && stufe4.k.laufbahn === ziel.laufbahn });
  } else if (zweiteSpezialisierung) {
    const spez = weg.filter((s) => s.k.art === 'spezialisierung' && s.k.laufbahn === ziel.laufbahn && s.klasse !== ziel.id);
    punkte.push({ art: 'weg', erfuellt: spez.length > 0 });
  }
  return punkte;
}

/** Vorschau eines Wechsels: Skills, die eingefroren bzw. wieder steigerbar werden. */
export function wechselVorschau(c: Charakter, zielId: string, d: Spieldaten, zweiteSpezialisierung = false) {
  const vorher = zugangDes(c, d);
  const nachher = zugangDes(
    { ...c, klassenweg: [...c.klassenweg, { klasse: zielId, art: zweiteSpezialisierung ? 'zweite_spezialisierung' : 'befoerderung' }] },
    d
  )!;
  const eigene = Object.entries(c.skills).filter(([, s]) => s > 0).map(([id]) => id);
  return {
    eingefroren: eigene.filter((id) => (!vorher || vorher.skills.has(id)) && !nachher.skills.has(id)),
    wieder_steigerbar: vorher ? eigene.filter((id) => !vorher.skills.has(id) && nachher.skills.has(id)) : [],
    neue_skills: [...nachher.skills].filter((id) => !vorher?.skills.has(id) && vorher !== null),
    neue_perks: [...nachher.perks].filter((id) => !vorher?.perks.has(id) && vorher !== null)
  };
}

// ---------- Aufstiegsschritte (konzept.md § 3.0a). Jeder Schritt wird protokolliert und ist nicht rücknehmbar.

export interface Moeglichkeit {
  art: 'skill' | 'statrank_up' | 'perk';
  id: string;
  kosten: number;
  sperre: Sperre;
}

/**
 * Alles, was sich mit freien Punkten kaufen ließe: nächstes Level jedes Skills im Zugang, Statrank-Ups,
 * Perks im Zugang, die der Charakter noch nicht hat. Mit Sperre; „Jetzt möglich“ sind die ohne Sperre.
 */
export function moeglichkeiten(c: Charakter, d: Spieldaten): Moeglichkeit[] {
  const a = d.regeln.aufstieg;
  const z = zugangDes(c, d);
  const liste: Moeglichkeit[] = [];
  for (const s of d.skills.eintraege) {
    if (z && !z.skills.has(s.id)) continue;
    const sperre = skillSteigernSperre(c, s.id, d);
    if (sperre !== 'maximum') liste.push({ art: 'skill', id: s.id, kosten: a.skill_level_kosten, sperre });
  }
  for (const id of Object.keys(c.stats)) {
    const sperre = statrankUpSperre(c, id, d);
    if (sperre !== 'maximum' && sperre !== 'unbekannt') liste.push({ art: 'statrank_up', id, kosten: a.statrank_up_kosten, sperre });
  }
  for (const p of d.perks.eintraege) {
    if ((z && !z.perks.has(p.id)) || c.perks.includes(p.id)) continue;
    liste.push({ art: 'perk', id: p.id, kosten: p.rang, sperre: perkKaufenSperre(c, p.id, d) });
  }
  return liste;
}

function eintrag(c: Charakter, zeit: string, e: Record<string, unknown> & { art: string }): Charakter {
  return { ...c, geaendert: zeit, protokoll: [...c.protokoll, { zeit, ...e }] };
}

export function skillSteigern(c: Charakter, id: string, d: Spieldaten, jetzt: Date = new Date()): Charakter {
  const sperre = skillSteigernSperre(c, id, d);
  if (sperre) throw new Error(`Skill nicht steigerbar: ${sperre}`);
  const kosten = d.regeln.aufstieg.skill_level_kosten;
  const von = c.skills[id] ?? 0;
  const x = { ...c, skills: { ...c.skills, [id]: von + 1 }, freie_punkte: c.freie_punkte - kosten };
  return eintrag(x, jetzt.toISOString(), { art: 'skill', id, von, nach: von + 1, kosten });
}

export function perkKaufen(c: Charakter, id: string, d: Spieldaten, jetzt: Date = new Date()): Charakter {
  const sperre = perkKaufenSperre(c, id, d);
  if (sperre) throw new Error(`Perk nicht kaufbar: ${sperre}`);
  const kosten = d.perks.eintraege.find((p) => p.id === id)!.rang;
  const x = { ...c, perks: [...c.perks, id], freie_punkte: c.freie_punkte - kosten };
  return eintrag(x, jetzt.toISOString(), { art: 'perk', id, kosten });
}

/** Statrank-Up: Rang +1, Abweichung neu (der Wurf kommt von der Würfelkomponente). Der Statwert kann sinken. */
export function statrankUp(c: Charakter, id: string, wurf: Abweichungswurf, d: Spieldaten, jetzt: Date = new Date()): Charakter {
  const sperre = statrankUpSperre(c, id, d);
  if (sperre) throw new Error(`Statrank-Up nicht möglich: ${sperre}`);
  const kosten = d.regeln.aufstieg.statrank_up_kosten;
  const alt = c.stats[id]!;
  const neu = { rang: naechsterRang(alt.rang!, d.regeln), wurf };
  const x = { ...c, stats: { ...c.stats, [id]: neu }, freie_punkte: c.freie_punkte - kosten };
  return eintrag(x, jetzt.toISOString(), {
    art: 'statrank_up', id, rang_von: alt.rang, rang_nach: neu.rang, wurf_von: alt.wurf, wurf_nach: wurf, kosten
  });
}

/** Session abschließen: freie Punkte laut regeln.json (derzeit +5). */
export function sessionAbschliessen(c: Charakter, d: Spieldaten, jetzt: Date = new Date()): Charakter {
  const punkte = d.regeln.geld.session_punkte;
  return eintrag({ ...c, freie_punkte: c.freie_punkte + punkte }, jetzt.toISOString(), { art: 'session', punkte });
}

/**
 * Vorratslevel: von Hand gesetzt (ohne Klasse, Schreibmodus) oder aus der aktuellen Klasse. Zweite Spezialisierung:
 * das der erweiterten Formen der Laufbahn (Regelwerk: Klassen, Zweite Spezialisierung; höchster Wert).
 */
export function vorratslevel(c: Charakter, d: Spieldaten): number | null {
  if (c.vorratslevel_manuell !== null) return c.vorratslevel_manuell;
  const letzter = c.klassenweg.at(-1);
  if (!letzter) return null;
  const k = klasseVon(letzter.klasse, d);
  if (letzter.art !== 'zweite_spezialisierung') return k.vorratslevel;
  return Math.max(...d.klassen.eintraege.filter((x) => x.art === 'erweiterte_form' && x.laufbahn === k.laufbahn).map((x) => x.vorratslevel));
}
