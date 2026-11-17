// Speicherformat eines Charakters (docs/datenformat.md § Charakter).
// Gespeichert werden nur Eingaben und Spielstand; alles Berechenbare entsteht im Regelkern.

import type { Modifikator, Rang } from '../daten/typen';

/** Aktuelle Schemaversion. Bei jeder inkompatiblen Änderung erhöhen und eine Migration ergänzen (migration.ts). */
export const SCHEMA = 2;

export type Quelle = 'app' | 'hand';

export interface Abweichungswurf {
  positiv: number;
  negativ: number;
  quelle: Quelle;
}

export interface StatEintrag {
  rang: Rang | null;
  wurf: Abweichungswurf | null;
}

export interface Klassenschritt {
  klasse: string;
  art: 'erstellung' | 'befoerderung' | 'wechsel' | 'zweite_spezialisierung';
  zeit?: string;
}

export interface Buchung {
  zeit: string;
  betrag: number;
  art: 'startgeld' | 'auftrag' | 'kauf' | 'verkauf' | 'rate' | 'korrektur';
  grund: string;
}

/** Kauf mit freien Punkten während der Erstellung (Schritt 5). Wird erst beim Abschluss fest eingetragen. */
export type Erstellungskauf =
  | { art: 'skill'; id: string }
  | { art: 'perk'; id: string }
  | { art: 'statrank_up'; id: string; wurf: Abweichungswurf };

/**
 * Stand einer laufenden Erstellung (konzept.md § 3.0). Solange er besteht, sind die Felder
 * klassenweg, skills, perks und freie_punkte leer; sie entstehen beim Abschluss aus diesen Angaben.
 * stats enthält die Ränge aus dem Rank-Set und die ersten Würfe; Statrank-Ups stehen in kaeufe.
 */
export interface Erstellungsstand {
  /** Zuletzt geöffneter Schritt (1–7). */
  schritt: number;
  ohne_klasse: boolean;
  klasse: string | null;
  /** Nur Meister: die Stufe-4-Klasse, aus der er kommt. */
  stufe4: string | null;
  /** Nur Meister: die gewählten Skills auf dem verlangten Wert. */
  meister_skills: string[];
  /** Nur ohne Klasse: freie Punkte zu Beginn. */
  freie_punkte_start: number;
  kaeufe: Erstellungskauf[];
}

/** Steps der SL für das ganze Gefecht (konzept.md § 3.8c, Block 3). */
export interface SlUmstand {
  id: string;
  malsteps: number;
  stepshields: number;
  grund: string;
  /** Probenarten, für die der Umstand gilt; fehlt = alle Proben. */
  gilt_fuer?: string[];
}

/** Ein Eintrag im Gefechtsprotokoll; `leiter` hält jede Änderung von Adrenalin bzw. Ruhepuls (für Rückgängig). */
export interface Gefechtsereignis {
  runde: number;
  zeit: string;
  art: 'leiter';
  /** Was die Änderung ausgelöst hat: rad, start, rundenende, senken. */
  ursache: 'rad' | 'start' | 'rundenende' | 'senken';
  von: number;
  nach: number;
  /** Stand von „gesenkt“ vor der Änderung, damit Rückgängig ihn wiederherstellt. */
  gesenkt_vorher: boolean;
}

/** Laufendes Gefecht (datenformat.md § Charakter, spielstand.gefecht). Außerhalb des Gefechts nur { aktiv: false }. */
export interface Gefecht {
  aktiv: true;
  runde: number;
  initiative: { wurf: number | null; stufe: 'krit' | 'erfolg' | 'misserfolg'; zielwert: number } | null;
  leiter: number;
  adrenalin4_erreicht: boolean;
  ueberrascht: boolean;
  gesenkt_diese_runde: boolean;
  ausloeser_diese_runde: string[];
  sichtstufe: string;
  lage: { sl_gefecht: SlUmstand[]; letzte_gruende: string[] };
  protokoll: Gefechtsereignis[];
}

export interface Anpassung extends Modifikator {
  id: string;
  grund: string;
  aktiv: boolean;
}

export interface Charakter {
  schema: number;
  id: string;
  geaendert: string;
  name: string;
  aussehen: string;
  klassenweg: Klassenschritt[];
  hintergrund: {
    schulden: { groesse: 'klein' | 'mittel' | 'gross'; glaeubiger: string; frist_auftraege: number; sicherheit: string } | null;
    coup: { groesse: 'klein' | 'mittel' | 'gross'; beute: string; feind: string } | null;
    vertrag: { auftraggeber: string; verpflichtung: string } | null;
    geburtsort: string;
    personen: string;
    lebensmittelpunkt: string;
  };
  notizen: string;
  status: 'erstellung' | 'fertig';
  /** Nur während der Erstellung gesetzt, sonst null. */
  erstellung: Erstellungsstand | null;
  /** Vorratslevel von Hand (ohne Klasse oder im Schreibmodus); null = aus der Klasse. */
  vorratslevel_manuell: number | null;
  freie_punkte: number;
  kassenbuch: Buchung[];
  schulden: { rest: number; frist_auftraege: number } | null;
  auftraege: number;
  stats: Record<string, StatEintrag>;
  skills: Record<string, number>;
  perks: string[];
  ueberschrieben: string[];
  grundwerte_manuell: Record<string, number | string>;
  anpassungen: Anpassung[];
  protokoll: ({ zeit: string; art: string } & Record<string, unknown>)[];
  ausruestung: {
    waffen: Record<string, unknown>[];
    nahkampfwaffen: Record<string, unknown>[];
    aktive_waffe: string | null;
    vorrat: Record<string, unknown>[];
    ruestung: string[];
    schild: string | null;
    sonstiges: string;
  };
  spielstand: {
    gefecht: Gefecht | { aktiv: false };
    hp_verlust_wunden: number;
    prellungen: number;
    tot: boolean;
    adrenalinschock: { aktiv: boolean; ruhe_stunden: number };
    wunden: Record<string, unknown>[];
  };
}

function neueId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function neueErstellung(): Erstellungsstand {
  return { schritt: 1, ohne_klasse: false, klasse: null, stufe4: null, meister_skills: [], freie_punkte_start: 0, kaeufe: [] };
}

/** Leerer Charakter im Status „erstellung“. statIds kommen aus stats.json, nie aus dem Code. */
export function neuerCharakter(statIds: string[], jetzt: Date = new Date()): Charakter {
  return {
    schema: SCHEMA,
    id: neueId(),
    geaendert: jetzt.toISOString(),
    name: '',
    aussehen: '',
    klassenweg: [],
    hintergrund: { schulden: null, coup: null, vertrag: null, geburtsort: '', personen: '', lebensmittelpunkt: '' },
    notizen: '',
    status: 'erstellung',
    erstellung: neueErstellung(),
    vorratslevel_manuell: null,
    freie_punkte: 0,
    kassenbuch: [],
    schulden: null,
    auftraege: 0,
    stats: Object.fromEntries(statIds.map((id) => [id, { rang: null, wurf: null }])),
    skills: {},
    perks: [],
    ueberschrieben: [],
    grundwerte_manuell: {},
    anpassungen: [],
    protokoll: [],
    ausruestung: { waffen: [], nahkampfwaffen: [], aktive_waffe: null, vorrat: [], ruestung: [], schild: null, sonstiges: '' },
    spielstand: {
      gefecht: { aktiv: false },
      hp_verlust_wunden: 0,
      prellungen: 0,
      tot: false,
      adrenalinschock: { aktiv: false, ruhe_stunden: 0 },
      wunden: []
    }
  };
}
