// Gefecht und Ruhe (konzept.md § 3.0e, § 3.7, § 3.7b): Gefecht starten, Adrenalin setzen, Senken, Rundenende,
// Initiative, Rückgängig und Gefecht beenden. Jede Funktion gibt einen neuen Charakter zurück; nichts wird gespeichert.

import type { Spieldaten } from '../daten/typen';
import type { Charakter, Gefecht, Gefechtsereignis, SlUmstand } from '../speicher/charakter';
import { begrenzen, gefechtsende, overTheEdge, rundenende, senken, startStand } from './leiter';
import type { Ergebnisstufe } from './probe';
import { gefechtVon } from './probenrechner';

/** Wie viele Gründe der SL die Lage-Auswahl zum Antippen anbietet. */
const LETZTE_GRUENDE = 6;

function jetzt(): string {
  return new Date().toISOString();
}

function mitGefecht(c: Charakter, g: Gefecht | { aktiv: false }, extra: Partial<Charakter['spielstand']> = {}): Charakter {
  return { ...c, geaendert: jetzt(), spielstand: { ...c.spielstand, ...extra, gefecht: g } };
}

function laufend(c: Charakter): Gefecht {
  const g = gefechtVon(c);
  if (!g) throw new Error('Kein Gefecht aktiv');
  return g;
}

/** Neuer Stand mit Protokolleintrag; merkt sich, ob Over the Edge erreicht wurde. */
function setze(g: Gefecht, nach: number, ursache: Gefechtsereignis['ursache'], d: Spieldaten): Gefecht {
  const stand = begrenzen(nach, d.regeln);
  if (stand === g.leiter) return g;
  const eintrag: Gefechtsereignis = { runde: g.runde, zeit: jetzt(), art: 'leiter', ursache, von: g.leiter, nach: stand, gesenkt_vorher: g.gesenkt_diese_runde };
  return {
    ...g,
    leiter: stand,
    adrenalin4_erreicht: g.adrenalin4_erreicht || overTheEdge(stand, d.regeln),
    protokoll: [...g.protokoll, eintrag]
  };
}

/** Gefecht starten: Startstufe aus der Nerve-Probe (normal oder überrascht), Runde 1. */
export function gefechtStarten(c: Charakter, ueberrascht: boolean, ergebnis: Ergebnisstufe, d: Spieldaten): Charakter {
  const leer: Gefecht = {
    aktiv: true,
    runde: 1,
    initiative: null,
    leiter: 0,
    adrenalin4_erreicht: false,
    ueberrascht,
    gesenkt_diese_runde: false,
    ausloeser_diese_runde: [],
    sichtstufe: d.regeln.sicht.stufen[0]!.id,
    lage: { sl_gefecht: [], letzte_gruende: [] },
    protokoll: []
  };
  return mitGefecht(c, setze(leer, startStand(ergebnis, ueberrascht, d.regeln), 'start', d));
}

/** Stand direkt setzen (Wählrad). */
export function leiterSetzen(c: Charakter, stand: number, d: Spieldaten): Charakter {
  return mitGefecht(c, setze(laufend(c), stand, 'rad', d));
}

/** Senken mit Ergebnis der Nerve-Probe; die Runde gilt als „gesenkt“, egal wie die Probe ausgeht. */
export function senkenEintragen(c: Charakter, ergebnis: Ergebnisstufe, d: Spieldaten): Charakter {
  const g = laufend(c);
  const neu = setze(g, senken(g.leiter, ergebnis, d.regeln), 'senken', d);
  // Ohne Änderung des Stands (misslungen) trotzdem vermerken, damit das Rundenende Bescheid weiß.
  const eintrag: Gefechtsereignis[] = neu === g
    ? [{ runde: g.runde, zeit: jetzt(), art: 'leiter', ursache: 'senken', von: g.leiter, nach: g.leiter, gesenkt_vorher: g.gesenkt_diese_runde }]
    : [];
  return mitGefecht(c, { ...neu, gesenkt_diese_runde: true, protokoll: [...neu.protokoll, ...eintrag] });
}

export interface RundenendeEingabe {
  /** IDs der angehakten Auslöser. */
  ausloeser: string[];
  /** Ergebnis der Nerve-Probe; null = verzichtet oder keine Probe möglich. */
  probe: Ergebnisstufe | null;
}

/** Stand nach dem Rundenende, ohne etwas zu ändern (für Bericht und Vorschau). */
export function standNachRundenende(c: Charakter, e: RundenendeEingabe, d: Spieldaten): number {
  const g = laufend(c);
  return rundenende({ stand: g.leiter, ausloeser: new Set(e.ausloeser).size, gesenkt: g.gesenkt_diese_runde, probe: e.probe }, d.regeln);
}

/** Nächste Runde: Rundenende von Adrenalin bzw. Ruhepuls, neue Runde ohne Auslöser, Initiative offen. */
export function naechsteRunde(c: Charakter, e: RundenendeEingabe, d: Spieldaten): Charakter {
  const g = laufend(c);
  const neu = setze(g, standNachRundenende(c, e, d), 'rundenende', d);
  return mitGefecht(c, {
    ...neu,
    runde: g.runde + 1,
    gesenkt_diese_runde: false,
    ausloeser_diese_runde: [],
    initiative: null
  });
}

/** Ergebnis der Initiative eintragen; es bleibt bis zur nächsten Runde sichtbar. */
export function initiativeEintragen(c: Charakter, initiative: NonNullable<Gefecht['initiative']>): Charakter {
  return mitGefecht(c, { ...laufend(c), initiative });
}

/**
 * Letzte Änderung von Adrenalin bzw. Ruhepuls, die sich zurücknehmen lässt: aus dieser Runde oder das gerade
 * abgeschlossene Rundenende. Der Start des Gefechts und ältere Runden bleiben. null, wenn es keine gibt.
 */
export function letzteLeiterAenderung(c: Charakter): Gefechtsereignis | null {
  const g = gefechtVon(c);
  const e = g?.protokoll.filter((x) => x.art === 'leiter').at(-1);
  if (!g || !e || e.ursache === 'start') return null;
  return e.runde === g.runde || (e.ursache === 'rundenende' && e.runde === g.runde - 1) ? e : null;
}

export function rueckgaengig(c: Charakter, d: Spieldaten): Charakter {
  const g = laufend(c);
  const e = letzteLeiterAenderung(c);
  if (!e) return c;
  const protokoll = g.protokoll.filter((x) => x !== e);
  // Over the Edge gilt nur noch als erreicht, wenn es außerhalb der zurückgenommenen Änderung erreicht wurde.
  const erreicht = protokoll.some((x) => overTheEdge(x.nach, d.regeln));
  return mitGefecht(c, { ...g, leiter: e.von, gesenkt_diese_runde: e.gesenkt_vorher, adrenalin4_erreicht: erreicht, protokoll });
}

/** Steps der SL für das ganze Gefecht anlegen bzw. löschen (konzept.md § 3.8c, Block 3). */
export function slGefechtHinzu(c: Charakter, u: Omit<SlUmstand, 'id'>): Charakter {
  const g = laufend(c);
  const id = `u${Date.now().toString(36)}${g.lage.sl_gefecht.length}`;
  return mitGefecht(c, { ...g, lage: { ...g.lage, sl_gefecht: [...g.lage.sl_gefecht, { ...u, id }] } });
}

export function slGefechtLoeschen(c: Charakter, id: string): Charakter {
  const g = laufend(c);
  return mitGefecht(c, { ...g, lage: { ...g.lage, sl_gefecht: g.lage.sl_gefecht.filter((u) => u.id !== id) } });
}

/** Grund der SL vorne in die Liste der zuletzt verwendeten Gründe (ohne Doppelte). */
export function grundMerken(c: Charakter, grund: string): Charakter {
  const g = gefechtVon(c);
  const text = grund.trim();
  if (!g || !text) return c;
  const liste = [text, ...g.lage.letzte_gruende.filter((x) => x !== text)].slice(0, LETZTE_GRUENDE);
  return mitGefecht(c, { ...g, lage: { ...g.lage, letzte_gruende: liste } });
}

export function sichtstufeSetzen(c: Charakter, sichtstufe: string): Charakter {
  return mitGefecht(c, { ...laufend(c), sichtstufe });
}

/** Gefecht beenden: Stand auf 0; wer Over the Edge erreicht hat, erleidet den Adrenalinschock. */
export function gefechtBeenden(c: Charakter): Charakter {
  const g = laufend(c);
  const ende = gefechtsende(g.adrenalin4_erreicht);
  const schock = ende.adrenalinschock ? { aktiv: true, ruhe_stunden: 0 } : c.spielstand.adrenalinschock;
  return mitGefecht(c, { aktiv: false }, { adrenalinschock: schock });
}

/** Adrenalinschock endet nach der Ruhe aus regeln.json (zustaende.adrenalinschock.ende_ruhe_stunden). */
export function adrenalinschockBeenden(c: Charakter): Charakter {
  return { ...c, geaendert: jetzt(), spielstand: { ...c.spielstand, adrenalinschock: { aktiv: false, ruhe_stunden: 0 } } };
}
