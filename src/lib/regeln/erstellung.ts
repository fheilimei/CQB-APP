// Charaktererstellung (konzept.md § 3.0, § 4.11; Regelwerk: Charaktererstellung; Schulden, Coups und Verträge).
// Während der Erstellung stehen die Entscheidungen in c.erstellung. erstellungAnwenden() rechnet daraus den
// Charakter, wie er nach dem Abschluss aussähe; so lässt sich jeder Schritt zurücknehmen (außer den Würfen).

import type { Klasse, Rang, Spieldaten } from '../daten/typen';
import type { Charakter, Erstellungskauf, Erstellungsstand, Klassenschritt } from '../speicher/charakter';
import { perkKaufenSperre, skillSteigernSperre, statrankUpSperre, zugangDerKlasse, type Sperre } from './aufstieg';
import { naechsterRang } from './probe';

function klasseOder(id: string | null, d: Spieldaten): Klasse | null {
  return id ? (d.klassen.eintraege.find((k) => k.id === id) ?? null) : null;
}

/** Gewählte Klasse der Erstellung; null ohne Klasse oder solange keine gewählt ist. */
export function erstellungsklasse(e: Erstellungsstand, d: Spieldaten): Klasse | null {
  return e.ohne_klasse ? null : klasseOder(e.klasse, d);
}

// ---------- Klasse und Weg

/** Stufe-4-Klassen, aus denen ein Meister kommen kann: die erweiterten Formen seiner Laufbahn. */
export function stufe4Optionen(meisterId: string, d: Spieldaten): Klasse[] {
  const m = klasseOder(meisterId, d);
  if (!m) return [];
  return d.klassen.eintraege.filter((k) => k.art === 'erweiterte_form' && k.laufbahn === m.laufbahn);
}

/**
 * Klassenweg bei der Erstellung auf höherer Stufe (datenformat.md § klassenweg): erweiterte Form mit ihrer
 * Spezialisierung, Meister mit Stufe-4-Klasse und deren Spezialisierung. null, wenn der Meister noch keine
 * gültige Stufe-4-Klasse hat.
 */
export function klassenwegZu(klasseId: string, stufe4: string | null, d: Spieldaten): Klassenschritt[] | null {
  const k = klasseOder(klasseId, d);
  if (!k) return null;
  const schritt = (id: string): Klassenschritt => ({ klasse: id, art: 'erstellung' });
  switch (k.art) {
    case 'grundklasse':
    case 'spezialisierung':
      return [schritt(k.id)];
    case 'erweiterte_form':
      return k.erweitert ? [schritt(k.erweitert), schritt(k.id)] : [schritt(k.id)];
    case 'meister': {
      if (!stufe4 || !stufe4Optionen(k.id, d).some((x) => x.id === stufe4)) return null;
      return [...klassenwegZu(stufe4, null, d)!, schritt(k.id)];
    }
  }
}

export function rankSetDer(klasseId: string, d: Spieldaten): Rang[] {
  const k = klasseOder(klasseId, d);
  const set = d.klassen.stufen.find((s) => s.stufe === k?.stufe)?.rank_set;
  if (!set) throw new Error(`kein Rank-Set für „${klasseId}“`);
  return set;
}

/** Rank-Set der Erstellung; null ohne Klasse (Ränge von Hand). */
export function rankSetFuer(e: Erstellungsstand, d: Spieldaten): Rang[] | null {
  const k = erstellungsklasse(e, d);
  return k ? rankSetDer(k.id, d) : null;
}

/**
 * Stat-Voraussetzungen bei der Erstellung: Spezialisierung und erweiterte Form verlangen ihren Stat auf Rang A,
 * die erweiterte Form auch den ihrer Spezialisierung (Ränge sinken nie). Der Meister hat keine (Regelwerk: Klassen, Meister).
 * Regelfrage R14 (docs/offen.md): vorläufig.
 */
export function statVoraussetzungen(e: Erstellungsstand, d: Spieldaten): { stat: string; rang: Rang }[] {
  const k = erstellungsklasse(e, d);
  if (!k || k.art === 'meister') return [];
  return (klassenwegZu(k.id, null, d) ?? [])
    .map((s) => klasseOder(s.klasse, d)?.voraussetzung_stat)
    .filter((v): v is { stat: string; rang: Rang } => !!v);
}

// ---------- Ränge

/** Ränge des Sets, die noch keinem Stat zugeordnet sind (absteigend). */
export function offeneRaenge(c: Charakter, set: Rang[], d: Spieldaten): Rang[] {
  const rest = [...set];
  for (const s of Object.values(c.stats)) {
    if (!s.rang) continue;
    const i = rest.indexOf(s.rang);
    if (i >= 0) rest.splice(i, 1);
  }
  return rest.sort((a, b) => d.regeln.raenge[b] - d.regeln.raenge[a]);
}

/** Passen die zugeordneten Ränge in das Set (jeder Rang höchstens so oft wie im Set)? */
export function raengePassen(c: Charakter, set: Rang[]): boolean {
  const rest = [...set];
  for (const s of Object.values(c.stats)) {
    if (!s.rang) continue;
    const i = rest.indexOf(s.rang);
    if (i < 0) return false;
    rest.splice(i, 1);
  }
  return true;
}

function mitStats(c: Charakter, aendern: (stats: Charakter['stats']) => void): Charakter {
  const stats = Object.fromEntries(Object.entries(c.stats).map(([id, s]) => [id, { ...s }]));
  aendern(stats);
  return { ...c, stats };
}

/** Ordnet einem Stat einen Rang zu (null = Rang entfernen). Der Wurf bleibt beim Stat. */
export function rangSetzen(c: Charakter, statId: string, rang: Rang | null): Charakter {
  return mitStats(c, (s) => { s[statId] = { ...s[statId]!, rang }; });
}

/** Tauscht die Ränge zweier Stats. Die Würfe bleiben bei ihren Stats. */
export function raengeTauschen(c: Charakter, a: string, b: string): Charakter {
  return mitStats(c, (s) => {
    const ra = s[a]!.rang;
    s[a] = { ...s[a]!, rang: s[b]!.rang };
    s[b] = { ...s[b]!, rang: ra };
  });
}

/**
 * Wählt die Klasse (null = ohne Klasse). Ränge bleiben, wenn sie ins neue Rank-Set passen, sonst werden sie
 * geleert. Würfe bleiben immer. Die Wahl des Meisters wird zurückgesetzt, wenn sich die Klasse ändert.
 */
export function klasseWaehlen(c: Charakter, klasseId: string | null, d: Spieldaten): Charakter {
  const alt = c.erstellung!;
  const gleich = !alt.ohne_klasse && alt.klasse === klasseId;
  const e: Erstellungsstand = {
    ...alt,
    ohne_klasse: klasseId === null,
    klasse: klasseId,
    stufe4: gleich ? alt.stufe4 : null,
    meister_skills: gleich ? alt.meister_skills : []
  };
  let x: Charakter = { ...c, erstellung: e };
  const set = rankSetFuer(e, d);
  if (set && !raengePassen(x, set)) x = mitStats(x, (s) => { for (const id in s) s[id] = { ...s[id]!, rang: null }; });
  return x;
}

// ---------- Skills und Perks der Klasse

/** Klassen, deren Mindestskills bei der Erstellung gelten: die Klasse, beim Meister auch seine Stufe-4-Klasse. */
function klassenMitMindestskills(e: Erstellungsstand, d: Spieldaten): Klasse[] {
  const k = erstellungsklasse(e, d);
  if (!k) return [];
  const s4 = k.art === 'meister' ? klasseOder(e.stufe4, d) : null;
  return s4 ? [s4, k] : [k];
}

/** Skills nach Schritt 4: Mindestskills (höchster Wert zählt) und beim Meister die gewählten Skills auf dem verlangten Wert. */
export function basisSkills(e: Erstellungsstand, d: Spieldaten): Record<string, number> {
  const skills: Record<string, number> = {};
  for (const k of klassenMitMindestskills(e, d))
    for (const [id, w] of Object.entries(k.mindestskills)) skills[id] = Math.max(skills[id] ?? 0, w);
  const wahl = erstellungsklasse(e, d)?.mindestskills_wahl;
  if (wahl) for (const id of e.meister_skills) skills[id] = Math.max(skills[id] ?? 0, wahl.wert);
  return skills;
}

export function basisPerks(e: Erstellungsstand, d: Spieldaten): string[] {
  return [...(erstellungsklasse(e, d)?.perks_vorgegeben ?? [])];
}

/** Skills, die ein Meister für die Wahl auf 5 nehmen kann (Zugang des Meisters). */
export function meisterWahlOptionen(e: Erstellungsstand, d: Spieldaten): string[] {
  const k = erstellungsklasse(e, d);
  if (!k?.mindestskills_wahl) return [];
  const z = zugangDerKlasse(k.id, d);
  return d.skills.eintraege.filter((s) => z.skills.has(s.id)).map((s) => s.id);
}

/** Exklusive Skills der Klassen im Weg des Meisters; einer davon muss unter den gewählten sein. */
export function meisterExklusiv(e: Erstellungsstand, d: Spieldaten): string[] {
  const k = erstellungsklasse(e, d);
  if (!k) return [];
  const weg = (klassenwegZu(k.id, e.stufe4, d) ?? []).map((s) => s.klasse);
  return d.skills.eintraege.filter((s) => s.exklusiv?.some((x) => weg.includes(x))).map((s) => s.id);
}

// ---------- Freie Punkte

export interface UngueltigerKauf {
  index: number;
  kauf: Erstellungskauf;
  sperre: Exclude<Sperre, null>;
}

export interface Erstellungsergebnis {
  /** Der Charakter, wie er nach dem Abschluss aussähe (Status bleibt „erstellung“). */
  charakter: Charakter;
  /** Käufe, deren Voraussetzungen nicht mehr erfüllt sind (z. B. nach Wechsel der Klasse). Sie zählen nicht. */
  ungueltig: UngueltigerKauf[];
}

/**
 * Rechnet die Erstellung durch: Klassenweg, Skills, Perks, Stats mit Statrank-Ups und freie Punkte.
 * Die Käufe werden der Reihe nach mit denselben Prüfungen wie im Aufstiegsmodus angewandt.
 */
export function erstellungAnwenden(c: Charakter, d: Spieldaten): Erstellungsergebnis {
  const e = c.erstellung;
  if (!e) return { charakter: c, ungueltig: [] };
  const k = erstellungsklasse(e, d);
  const weg = k ? (klassenwegZu(k.id, e.stufe4, d) ?? [{ klasse: k.id, art: 'erstellung' as const }]) : [];
  let x: Charakter = {
    ...c,
    klassenweg: weg,
    skills: basisSkills(e, d),
    perks: basisPerks(e, d),
    freie_punkte: k ? k.freie_punkte_start : e.freie_punkte_start,
    stats: Object.fromEntries(Object.entries(c.stats).map(([id, s]) => [id, { ...s }]))
  };
  const ungueltig: UngueltigerKauf[] = [];
  const a = d.regeln.aufstieg;
  e.kaeufe.forEach((kauf, index) => {
    if (kauf.art === 'skill') {
      const sperre = skillSteigernSperre(x, kauf.id, d);
      if (sperre) return void ungueltig.push({ index, kauf, sperre });
      x = { ...x, skills: { ...x.skills, [kauf.id]: (x.skills[kauf.id] ?? 0) + 1 }, freie_punkte: x.freie_punkte - a.skill_level_kosten };
    } else if (kauf.art === 'perk') {
      const sperre = perkKaufenSperre(x, kauf.id, d);
      if (sperre) return void ungueltig.push({ index, kauf, sperre });
      const rang = d.perks.eintraege.find((p) => p.id === kauf.id)!.rang;
      x = { ...x, perks: [...x.perks, kauf.id], freie_punkte: x.freie_punkte - rang };
    } else {
      const sperre = statrankUpSperre(x, kauf.id, d);
      if (sperre) return void ungueltig.push({ index, kauf, sperre });
      const s = x.stats[kauf.id]!;
      x = {
        ...x,
        stats: { ...x.stats, [kauf.id]: { rang: naechsterRang(s.rang!, d.regeln), wurf: kauf.wurf } },
        freie_punkte: x.freie_punkte - a.statrank_up_kosten
      };
    }
  });
  return { charakter: x, ungueltig };
}

/** Grund, warum ein weiterer Kauf in Schritt 5 nicht geht; null = möglich. */
export function erstellungKaufSperre(c: Charakter, art: Erstellungskauf['art'], id: string, d: Spieldaten): Sperre {
  const x = erstellungAnwenden(c, d).charakter;
  if (art === 'skill') return skillSteigernSperre(x, id, d);
  if (art === 'perk') return perkKaufenSperre(x, id, d);
  return statrankUpSperre(x, id, d);
}

export function kaufHinzufuegen(c: Charakter, kauf: Erstellungskauf, d: Spieldaten): Charakter {
  const sperre = erstellungKaufSperre(c, kauf.art, kauf.id, d);
  if (sperre) throw new Error(`Kauf nicht möglich: ${sperre}`);
  return { ...c, erstellung: { ...c.erstellung!, kaeufe: [...c.erstellung!.kaeufe, kauf] } };
}

/** Gibt einen Skill- oder Perk-Kauf zurück. Statrank-Ups bleiben, weil ihr Wurf nicht zurückgenommen wird. */
export function kaufZurueckgeben(c: Charakter, index: number): Charakter {
  const kauf = c.erstellung!.kaeufe[index];
  if (!kauf || kauf.art === 'statrank_up') return c;
  return { ...c, erstellung: { ...c.erstellung!, kaeufe: c.erstellung!.kaeufe.filter((_, i) => i !== index) } };
}

// ---------- Hintergrund und Startgeld

export interface Geldposten {
  art: 'ersparnisse' | 'schulden' | 'coup' | 'einstiegsgehalt';
  betrag: number;
  groesse?: 'klein' | 'mittel' | 'gross';
}

const NAMEN: Record<Geldposten['art'], string> = {
  ersparnisse: 'Ersparnisse',
  schulden: 'Schulden',
  coup: 'Coup',
  einstiegsgehalt: 'Einstiegsgehalt'
};
export const GROESSEN: Record<'klein' | 'mittel' | 'gross', string> = { klein: 'klein', mittel: 'mittel', gross: 'groß' };

export function postenText(p: Geldposten): string {
  return `${NAMEN[p.art]}${p.groesse ? ` ${GROESSEN[p.groesse]}` : ''} ${p.betrag}`;
}

/** Startgeld = Ersparnisse + Optionen + Einstiegsgehalt (Klasse ab Stufe 2 und Vertrag). */
export function startgeld(c: Charakter, d: Spieldaten): { summe: number; posten: Geldposten[] } {
  const g = d.regeln.geld;
  const h = c.hintergrund;
  const posten: Geldposten[] = [{ art: 'ersparnisse', betrag: g.ersparnisse }];
  if (h.schulden) posten.push({ art: 'schulden', groesse: h.schulden.groesse, betrag: g.schulden[h.schulden.groesse] });
  if (h.coup) posten.push({ art: 'coup', groesse: h.coup.groesse, betrag: g.coup[h.coup.groesse] });
  const k = c.erstellung ? erstellungsklasse(c.erstellung, d) : null;
  if (h.vertrag && k && k.stufe >= g.einstiegsgehalt_ab_stufe) posten.push({ art: 'einstiegsgehalt', betrag: k.gehalt });
  return { summe: posten.reduce((s, p) => s + p.betrag, 0), posten };
}

/** Rückzahlung der Schulden: Betrag + 50 %. */
export function rueckzahlung(groesse: 'klein' | 'mittel' | 'gross', d: Spieldaten): number {
  return Math.round(d.regeln.geld.schulden[groesse] * d.regeln.geld.schulden.rueckzahlung_faktor);
}

// ---------- Was fehlt noch?

export type Fehlt =
  | { art: 'name' }
  | { art: 'klasse' }
  | { art: 'stufe4' }
  | { art: 'raenge_offen'; raenge: Rang[] }
  | { art: 'rang_fehlt'; stats: string[] }
  | { art: 'stat_rang'; stat: string; rang: Rang }
  | { art: 'abweichung'; stats: string[] }
  | { art: 'meister_wahl'; anzahl: number; wert: number }
  | { art: 'meister_exklusiv' }
  | { art: 'kaeufe_ungueltig'; anzahl: number }
  | { art: 'punkte_negativ' }
  | { art: 'frist' };

/** Was in einem Schritt (1–7) noch fehlt. Leer = der Schritt ist erledigt. */
export function schrittFehlt(c: Charakter, schritt: number, d: Spieldaten): Fehlt[] {
  const e = c.erstellung!;
  const f: Fehlt[] = [];
  const k = erstellungsklasse(e, d);
  switch (schritt) {
    case 1:
      if (!c.name.trim()) f.push({ art: 'name' });
      if (!e.ohne_klasse && !k) f.push({ art: 'klasse' });
      if (k?.art === 'meister' && !klassenwegZu(k.id, e.stufe4, d)) f.push({ art: 'stufe4' });
      break;
    case 2: {
      const set = rankSetFuer(e, d);
      if (set) {
        const offen = offeneRaenge(c, set, d);
        if (offen.length) f.push({ art: 'raenge_offen', raenge: offen });
        for (const v of statVoraussetzungen(e, d)) {
          const hat = c.stats[v.stat]?.rang;
          if (!hat || d.regeln.raenge[hat] < d.regeln.raenge[v.rang]) f.push({ art: 'stat_rang', ...v });
        }
      } else {
        const ohne = Object.entries(c.stats).filter(([, s]) => !s.rang).map(([id]) => id);
        if (ohne.length) f.push({ art: 'rang_fehlt', stats: ohne });
      }
      break;
    }
    case 3: {
      const ohne = Object.entries(c.stats).filter(([, s]) => !s.wurf).map(([id]) => id);
      if (ohne.length) f.push({ art: 'abweichung', stats: ohne });
      break;
    }
    case 4: {
      const wahl = k?.mindestskills_wahl;
      if (wahl) {
        if (e.meister_skills.length < wahl.anzahl) f.push({ art: 'meister_wahl', anzahl: wahl.anzahl, wert: wahl.wert });
        const exkl = meisterExklusiv(e, d);
        if (e.meister_skills.filter((id) => exkl.includes(id)).length < wahl.davon_exklusiv) f.push({ art: 'meister_exklusiv' });
      }
      break;
    }
    case 5: {
      const r = erstellungAnwenden(c, d);
      if (r.ungueltig.length) f.push({ art: 'kaeufe_ungueltig', anzahl: r.ungueltig.length });
      if (r.charakter.freie_punkte < 0) f.push({ art: 'punkte_negativ' });
      break;
    }
    case 6: {
      const s = c.hintergrund.schulden;
      if (s && !(Number.isInteger(s.frist_auftraege) && s.frist_auftraege >= 1)) f.push({ art: 'frist' });
      break;
    }
  }
  return f;
}

// ---------- Abschluss

/** Schließt die Erstellung ab: Werte fest eintragen, Startgeld buchen, Schulden anlegen. Wirft, solange etwas fehlt. */
export function erstellungAbschliessen(c: Charakter, d: Spieldaten, jetzt: Date = new Date()): Charakter {
  for (let s = 1; s <= 6; s++) {
    const f = schrittFehlt(c, s, d);
    if (f.length) throw new Error(`Schritt ${s} ist nicht erledigt: ${f.map((x) => x.art).join(', ')}`);
  }
  const zeit = jetzt.toISOString();
  const x = erstellungAnwenden(c, d).charakter;
  const geld = startgeld(c, d);
  const h = c.hintergrund;
  return {
    ...x,
    status: 'fertig',
    erstellung: null,
    vorratslevel_manuell: c.erstellung!.ohne_klasse ? c.vorratslevel_manuell : null,
    geaendert: zeit,
    kassenbuch: [...c.kassenbuch, { zeit, betrag: geld.summe, art: 'startgeld', grund: geld.posten.map(postenText).join(' + ') }],
    schulden: h.schulden ? { rest: rueckzahlung(h.schulden.groesse, d), frist_auftraege: h.schulden.frist_auftraege } : null,
    protokoll: [...c.protokoll, { zeit, art: 'erstellung_abgeschlossen' }]
  };
}
