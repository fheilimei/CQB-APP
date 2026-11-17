// Typen der Spieldaten unter public/data/. Beschreibung der Felder: docs/datenformat.md.

export type Rang = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type BandId = 'bedraengt' | 'nah' | 'mittel' | 'weit' | 'sehr_weit' | 'fern';
export type Spanne = { min: number; max: number };

/** Gemeinsames Format für alles, was Werte automatisch verändert (datenformat.md § Modifikator). */
export interface Modifikator {
  ziel: { art: 'grundwert' | 'stat' | 'skill' | 'probe' | 'alle'; id?: string };
  wirkung: { wert?: number; stepshields?: number; malsteps?: number; krit_schwelle?: number };
  bedingung?: {
    baender?: string[];
    skill?: string;
    stand?: string;
    ohne_bewegung?: boolean;
    aufgelegt?: boolean;
  };
}

export interface Leiterstufe {
  name: string | null;
  gruppe_a: number;
  gruppe_b: number;
  symptome: string[];
  over_the_edge?: boolean;
  /** Over the Edge: Gewinne der Symptome entfallen, Verluste bleiben. */
  symptome_nur_verluste?: boolean;
}

/** Änderung der Leiterstufe je Ergebnis einer Probe (positiv = steigen). */
export type StufenAenderung = Record<'krit' | 'gelungen' | 'misslungen', number>;

/** Wirkungen der Symptome, die der Regelkern kennt. Die Zuordnung zu Symptomen steht in regeln.json. */
export type SymptomWirkung =
  | 'kein_stagger'
  | 'keine_ansage'
  | 'zweite_bewegung'
  | 'keine_antizipation'
  | 'zielen_als_main'
  | 'stagger_ab_gleich'
  | 'weitblick'
  | 'kein_hechten';

export interface LageUmstand {
  id: string;
  gruppe: string;
  name: string;
  malsteps?: number;
  stepshields?: number;
  standard?: boolean;
  hinweis?: string;
  nicht_fuer?: string[];
  nicht_in_baendern?: string[];
  nur_ohne_eigene_bewegung?: boolean;
}

export interface Regeln {
  version: string;
  raenge: Record<Rang, number>;
  abweichung: { min: number; max: number };
  steps: { faktoren: number[]; keine_probe_ab: number; skill_null_malsteps: number };
  leiter: {
    min: number;
    max: number;
    stufen: Record<string, Leiterstufe>;
    start: Record<string, { krit: number; gelungen: number; misslungen: number }>;
    ueberrascht_breakaction_malsteps: number;
    ausloeser: { id: string; name: string }[];
    rundenende: { malsteps_je_ausloeser: number; anstieg: number; probe: StufenAenderung };
    senken: StufenAenderung;
    verschieben: StufenAenderung;
  };
  symptome: Record<
    string,
    { gewinn: string; verlust: string; wirkung: { gewinn: SymptomWirkung; verlust: SymptomWirkung }; vorlaeufig?: boolean }
  >;
  zustaende: {
    adrenalinschock: { malsteps: number; ende_ruhe_stunden: number; mit_perk?: Record<string, number> };
    kampfunfaehig: { malsteps_ausserhalb_gefecht: number; gilt_nicht_fuer: string[]; mit_perk?: Record<string, number> };
    geblendet: { sichtstufe: string; malsteps_mit_gereizt_addieren: boolean };
    gereizt: { malsteps: number; probe: string };
  };
  lage: {
    eigene_bewegung: Record<string, number>;
    gruppen: { id: string; name: string; auswahl: 'eins' | 'schalter'; zuruecksetzen: string; quelle?: string }[];
    umstaende: LageUmstand[];
    vorlaeufig?: boolean;
  };
  sicht: { stufen: { id: string; name: string; erkennen_bis: string | null; malsteps: number }[]; gilt_fuer: string[] };
  schiessen: {
    ansage_malsteps: Record<string, number>;
    rueckstoss_stepshields: Record<string, number>;
    haltezahl_max: number;
    /** Zone, mit der die Zählung der Schrotkugeln nach der Ansage „Rumpf“ beginnt. */
    schrot_rumpf_start: string;
    garbenfaktor_aus_feuerrate: { bis: number | null; faktor: number }[];
    reichweitenbaender: { id: BandId; name: string; beschreibung: string }[];
  };
  aktionen: Record<string, number>;
  lebenspunkte: { kampfunfaehig_bei: number; tot_bei: number };
  geld: {
    ersparnisse: number;
    schulden: { klein: number; mittel: number; gross: number; rueckzahlung_faktor: number };
    coup: { klein: number; mittel: number; gross: number };
    einstiegsgehalt_ab_stufe: number;
    session_punkte: number;
  };
  grundwerte: { hp: number; schmerzresistenz: number; nahkampfschaden: number; wurfweite_band: BandId };
  aufstieg: { statrank_up_kosten: number; skill_level_kosten: number; skill_min: number; skill_max: number; rang_max: Rang };
  krit: { schwelle_min: number; zielwert_100_zehner: number };
  /** Ist die Zone `arme_mit` verdeckt, gelten auch die Zonen `arme` als verdeckt. */
  deckung: { arme_mit: string; arme: string[] };
  sprengwirkung: { splitter_liegend_anteil: number };
  waffenzustand: { stufen: string[]; neu: string; namen: Record<string, string>; preis_viertel: Record<string, number> };
  ladehemmung: { zustand_zuschlag: Record<string, Record<string, number>>; trommelmagazin_zuschlag: number; schwer_bei_wurf: number };
  [weitere: string]: unknown;
}

export interface Liste<T> {
  version: string;
  eintraege: T[];
}

export interface Stat {
  id: string;
  name: string;
  gruppe: 'A' | 'B' | 'C';
}

export interface Skill {
  id: string;
  name: string;
  stat: string;
  gruppe: string;
  waffenkategorien?: string[];
  exklusiv?: string[];
}

export interface Perk {
  id: string;
  gruppe: 'grundwerte' | 'kampfkunst' | 'kampf' | 'allgemein' | 'exklusiv';
  name: string;
  rang: number;
  voraussetzung: { stats: { stat: string; min: number }[]; perks: string[] };
  kurz: string;
  wirkung: string;
  modifikatoren: Modifikator[];
  hinweis_bei: string[];
  exklusiv?: string[];
  kampfkunst?: Record<string, string | null>;
  vorlaeufig?: boolean;
}

export interface Koerperzone {
  id: string;
  name: string;
  w8: number | null;
  nur_ansage?: boolean;
  multiplikator: number;
  bereich: 'kopf' | 'rumpf' | 'glied';
  normal: { text: string; blutung?: string; dauerhaft: string[] };
  krit: { text: string; tot?: boolean; kampfunfaehig?: boolean; blutung?: string };
}

export interface Munitionstyp {
  dk: number | null;
  mw: number;
  schrotzahl?: Partial<Record<BandId, number>>;
  stumpf?: boolean;
  unterschall?: boolean;
  vorratslevel?: number;
  preis_10?: Spanne;
  vorlaeufig?: boolean;
}

export interface Munition {
  id: string;
  name: string;
  art: 'patrone' | 'schrot';
  unterschall?: boolean;
  typen: Record<string, Munitionstyp>;
  vorlaeufig?: boolean;
}

export interface Feuermodus {
  feuerrate: number;
  rueckstoss: number;
  lh_prozent: number;
  garbenfaktor?: number;
  burst_laenge?: number;
}

export interface Waffe {
  id: string;
  name: string;
  kategorie: string;
  vorratslevel: number;
  preis: Spanne;
  /** Kaliber-ID aus munition.json; bei Werfern Liste von Geschoss-IDs. */
  munition: string | string[];
  /** Fehlt: alle Typen des Kalibers. */
  munitionstypen?: string[];
  magazin: number;
  patrone_im_lauf: boolean;
  ladeart: 'wechselmagazin' | 'trommel' | 'roehrenmagazin' | 'fest' | 'einzelschuss';
  zubehoer?: string[];
  feuermodi: Partial<Record<'EF' | 'Burst' | 'VA', Feuermodus>>;
  betriebsarten?: Record<string, { name: string; feuerrate?: number; lh_prozent?: number }>;
  reichweite: Record<BandId, number | null>;
  lh_beheben_mod: number;
  zuverlaessigkeit: 'zuverlaessig' | 'normal';
  anschluesse: string[];
  magazine?: number[];
  lauter?: number;
  leiser?: number;
  besonderheiten: string;
  vorlaeufig?: boolean;
}

export interface Aufsatz {
  id: string;
  name: string;
  passt_an: { anschluss: string[]; waffen: string[] };
  einsatz: 'immer' | 'schalter';
  schalter_text?: string;
  modifikatoren: Modifikator[];
  werte?: { magazin?: number; trommelmagazin?: boolean };
  setzt?: { aufgelegt?: boolean };
  waffe?: string;
  nahkampfwaffe?: string;
  hinweis: string | null;
  vorlaeufig?: boolean;
}

export interface Zubehoer {
  id: string;
  name: string;
  passt_zu: string;
  vorratslevel: number;
  preis: Spanne;
  wirkung: string;
  vorlaeufig?: boolean;
}

export interface Aufsaetze extends Liste<Aufsatz> {
  zubehoer: Zubehoer[];
}

export type Haende = 1 | 2 | [1, 2] | null;
export interface NahkampfVariante {
  name: string;
  art?: 'stumpf' | 'scharf';
  haende: Haende;
  laenge: 'kurz' | 'mittel' | 'lang';
  mw: number;
  dk: number | null;
  /** Abweichende Wurf-Reichweite dieser Variante; fehlt das Feld, gilt die der Waffe. */
  wurf?: WurfReichweite;
}

/** Malsteps je Reichweitenband beim Werfen; null = in diesem Band nicht werfbar. Ganz null = nicht werfbar. */
export type WurfReichweite = Partial<Record<BandId, number | null>> | null;

export interface Nahkampfwaffe {
  id: string;
  name: string;
  art: 'stumpf' | 'scharf';
  haende?: Haende;
  laenge?: 'kurz' | 'mittel' | 'lang';
  mw?: number;
  dk?: number | null;
  wurf: WurfReichweite;
  varianten?: Record<string, NahkampfVariante>;
  vorratslevel?: number;
  preis?: Spanne;
  immer_verfuegbar?: boolean;
  mit_waffe?: string[];
  besonderheiten: string;
  vorlaeufig?: boolean;
}

export interface Sprengwaffe {
  id: string;
  name: string;
  art: 'splitter' | 'blend' | 'rauch' | 'gas' | 'sonstiges';
  einsatz: 'wurf' | 'geschoss';
  verwendet_in?: string[];
  vorratslevel: number | null;
  preis: Spanne | null;
  zuender?: 'zeit' | 'aufschlag' | 'kontakt' | null;
  verzoegerung?: number | Partial<Record<BandId, number>> | null;
  bereiche?: Partial<Record<BandId, number>> | null;
  kern?: string[];
  splitter?: { dk: number | null; mw: number | null } | null;
  druckwelle?: { mw: number | null } | null;
  strahl?: { dk: number; mw: number } | null;
  sonderwirkung?: ({ art: string; text: string } & Record<string, unknown>) | null;
  schaden?: { dk: number | null; mw: number | null };
  ausloeser?: string[];
  besonderheiten?: string;
  vorlaeufig?: boolean;
}

export interface Schutzwert {
  id: string;
  name: string;
  wert: number;
  vorlaeufig?: boolean;
}

export interface Ruestung {
  id: string;
  name: string;
  art: 'weste' | 'helm' | 'anzug';
  zonen: Record<string, number>;
  vorratslevel: number;
  preis: Spanne;
  einschraenkung?: Record<string, unknown>;
  vorlaeufig?: boolean;
}

export interface Schild {
  id: string;
  name: string;
  deckung: number;
  zonen: string[];
  nur_von_vorn: boolean;
  vorratslevel: number;
  preis: Spanne;
  einschraenkung?: Record<string, unknown>;
}

export interface Schutz {
  version: string;
  deckung: Schutzwert[];
  fahrzeugpanzerung: Schutzwert[];
  ruestung: Ruestung[];
  schilde: Schild[];
}

export interface Zugang {
  wie?: string | null;
  skills?: string[];
  perks?: string[];
  laufbahn_gesamt?: boolean;
}

export interface Klasse {
  id: string;
  name: string;
  laufbahn: string;
  stufe: number;
  art: 'grundklasse' | 'spezialisierung' | 'erweiterte_form' | 'meister';
  beschreibung: string;
  erweitert?: string;
  voraussetzung_stat: { stat: string; rang: Rang } | null;
  rank_vorschlag?: Record<string, Rang>;
  vorratslevel: number;
  gehalt: number;
  freie_punkte_start: number;
  mindestskills: Record<string, number>;
  mindestskills_wahl?: { anzahl: number; wert: number; davon_exklusiv: number };
  perks_vorgegeben: string[];
  zugang: Zugang;
}

export interface Klassen {
  version: string;
  stufen: { stufe: number; name: string; rank_set: Rang[]; richtgehalt: number; vorlaeufig?: boolean }[];
  laufbahnen: { id: string; name: string; umfeld: string; befoerderung: string }[];
  eintraege: Klasse[];
}

export interface Darstellung {
  version: string;
  herkunft: Record<string, { zeichen: string; farbe?: string; rahmen?: string; name: string }>;
  typen: Record<'stat' | 'skill' | 'perk', { zeichen: string; farbe: string; name: string }>;
  leiter_farben: Record<string, string>;
}

/** Alle Spieldaten zusammen, wie der Regelkern und die Oberfläche sie bekommen. */
export interface Spieldaten {
  regeln: Regeln;
  stats: Liste<Stat>;
  skills: Liste<Skill>;
  perks: Liste<Perk>;
  koerperzonen: Liste<Koerperzone>;
  munition: Liste<Munition>;
  waffen: Liste<Waffe>;
  aufsaetze: Aufsaetze;
  nahkampfwaffen: Liste<Nahkampfwaffe>;
  wurf_und_sprengwaffen: Liste<Sprengwaffe>;
  schutz: Schutz;
  klassen: Klassen;
  darstellung: Darstellung;
}

export const DATEIEN = [
  'regeln',
  'stats',
  'skills',
  'perks',
  'koerperzonen',
  'munition',
  'waffen',
  'aufsaetze',
  'nahkampfwaffen',
  'wurf_und_sprengwaffen',
  'schutz',
  'klassen',
  'darstellung'
] as const satisfies readonly (keyof Spieldaten)[];
