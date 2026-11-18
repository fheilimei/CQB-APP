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

/** Aktionen einer Runde (konzept.md § 3.7a). */
export type Aktion = 'main' | 'break' | 'bewegung' | 'stand';
export type Aktionszahlen = Record<Aktion, number>;

/** Merker aus „Zielen“ für den nächsten Schuss (konzept.md § 3.7a). Gilt nur in der Runde `runde`. */
export interface Zielen {
  runde: number;
  stepshields: number;
  /** Perk-Wirkung „zielen_ohne_reichweite“ (z. B. Gezielter Schuss): keine Malsteps der Reichweite. */
  ohne_reichweite: boolean;
  /** Runde, in der gezielt wurde; bewegt sich der Charakter danach in dieser Runde, entfällt ohne_reichweite. */
  gezielt_in: number;
}

/** Ein Schuss im Gefechtsprotokoll (konzept.md § 3.8, Schritt 6 „Weiter“). */
export interface Schussereignis {
  runde: number;
  zeit: string;
  art: 'schuss';
  waffe: string;
  text: string[];
}

/** Sonstige Aktion im Gefechtsprotokoll (Nachladen, Waffe wechseln, Zielen …). */
export interface Aktionsereignis {
  runde: number;
  zeit: string;
  art: 'aktion';
  text: string;
}

/** Eingehender Treffer im Gefechtsprotokoll (konzept.md § 3.10), mit den Änderungen für Rückgängig. */
export interface Trefferereignis {
  runde: number;
  zeit: string;
  art: 'treffer' | 'schaden_direkt';
  quelle: string;
  eingabe?: { zone: string; dk: number | null; mw: number; kugeln: number; krit: boolean; deckung: number | null };
  direkt?: { zone: string; schaden: number; art: 'wunde' | 'prellung' };
  ergebnis: { art: 'gestoppt' | 'durchschlag' | 'wucht'; schaden: number; stagger: boolean; tot: boolean };
  aenderungen: {
    wunde: string | null;
    hp_verlust_wunden: [number, number];
    prellungen: [number, number];
    tot: [boolean, boolean];
    /** Auslöser, die dieser Treffer neu gesetzt hat. */
    ausloeser: string[];
    /** Breakaction durch diesen Treffer verloren. */
    break_verloren: boolean;
  };
}

/** Wunde (datenformat.md § Felder im Spielstand). */
export interface Wunde {
  id: string;
  zone: string;
  schaden: number;
  kritisch: boolean;
  blutung: { status: 'offen' | 'gestoppt' | 'abgelaufen'; frist_ende: string | number | null };
  versorgt: null | 'druckverband' | 'tourniquet' | 'operation';
  nachsorge: null | 'krit' | 'gelungen' | 'misslungen' | 'keine';
  ruhetage_geheilt: number;
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
  lage: {
    sl_gefecht: SlUmstand[];
    letzte_gruende: string[];
    /** Auswahl in Block 2 der Lage-Auswahl je Gruppe (regeln.json `lage.gruppen`); fehlt = Standard bzw. nichts gewählt. */
    auswahl: Record<string, string | string[] | null>;
  };
  /** Eigener Stand: stehen, hocke, liegen. */
  stand: string;
  /** Schnellste eigene Bewegung dieser Runde (regeln.json `bewegung.arten`) oder null. */
  bewegt: string | null;
  /** Zahl der Bewegungen dieser Runde (Sprint erlaubt eine zweite). */
  bewegungen: number;
  /** In dieser Runde gehechtet und seitdem nicht bewegt (Regelfrage R9: das zuletzt Gewählte zählt für die Lage). */
  gehechtet: boolean;
  zielen: Zielen | null;
  /** Konzentration einer Mainaction in dieser Runde. */
  konzentration: 'leicht' | 'voll' | null;
  /** Verbrauchte Aktionen dieser Runde. */
  verbraucht: Aktionszahlen;
  /** Korrektur von Hand (langer Druck, ±1) je Aktion. */
  korrektur: Aktionszahlen;
  /** Break durch Stagger verloren (Schritt 7 setzt das). */
  break_verloren: boolean;
  /** Aktuelle Deckung: Wert und tatsächlich verdeckte Zonen; fehlt oder null = keine Deckung. */
  deckung?: { wert: number; zonen: string[] } | null;
  protokoll: (Gefechtsereignis | Schussereignis | Aktionsereignis | Trefferereignis)[];
}

/** Schusswaffe in der Ausrüstung (datenformat.md § Felder im Spielstand). */
export interface WaffenEintrag {
  id: string;
  /** ID aus waffen.json. */
  waffe: string;
  /** Munitionstyp des Kalibers (z. B. FMJ); bei Werfern die ID des geladenen Geschosses oder leer. */
  munitionstyp: string;
  /** Inhalt inklusive Patrone im Lauf. */
  im_magazin: number;
  /** Inhalt jedes Ersatzmagazins. */
  reserve: number[];
  /** Munition ohne Magazin (einzeln laden, Magazine, Schnelllader und Ladestreifen füllen). */
  lose_patronen?: number;
  /** Leere Ersatzmagazine (Wechselmagazin); entstehen beim Nachladen, werden mit „Magazine füllen“ wieder voll. */
  leere_magazine?: number;
  /** Schnelllader bzw. Ladestreifen. */
  zubehoer?: { art: string; gefuellt: number; leer: number }[];
  zustand: string;
  aufsaetze: string[];
  ladehemmung: 'einfach' | 'schwer' | null;
  trageort: string;
}

export interface NahkampfEintrag {
  id: string;
  waffe: string;
  trageort: string;
  /** Fehlt: 1. */
  anzahl?: number;
}

/** Granaten und Geschosse (ID aus wurf_und_sprengwaffen.json). */
export interface VorratEintrag {
  id: string;
  anzahl: number;
  trageort: string;
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
    waffen: WaffenEintrag[];
    nahkampfwaffen: NahkampfEintrag[];
    aktive_waffe: string | null;
    vorrat: VorratEintrag[];
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
    wunden: Wunde[];
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

export const KEINE_AKTIONEN: Aktionszahlen = { main: 0, break: 0, bewegung: 0, stand: 0 };

/**
 * Ergänzt Felder des Gefechts, die erst mit späteren Schritten dazukamen (datenformat.md § Felder im Spielstand),
 * damit auch ein Gefecht weiterläuft, das mit einer älteren Version gestartet wurde. Ein fehlender Stand bleibt leer;
 * der Regelkern nimmt dann den ersten Stand aus regeln.json (aktionen.ts, eigenerStand).
 */
export function gefechtErgaenzt(g: Gefecht): Gefecht {
  return {
    ...g,
    lage: { ...g.lage, auswahl: g.lage.auswahl ?? {} },
    stand: g.stand ?? '',
    bewegt: g.bewegt ?? null,
    bewegungen: g.bewegungen ?? 0,
    gehechtet: g.gehechtet ?? false,
    zielen: g.zielen ?? null,
    konzentration: g.konzentration ?? null,
    verbraucht: g.verbraucht ?? { ...KEINE_AKTIONEN },
    korrektur: g.korrektur ?? { ...KEINE_AKTIONEN },
    break_verloren: g.break_verloren ?? false
  };
}
