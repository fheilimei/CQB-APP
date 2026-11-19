// Texte für den Reiter Verlauf (konzept.md § „Aufbau der App“, Verlauf): Gefechtsprotokoll, Aufstiegsprotokoll,
// Kassenbuch und Wunden. Reine Funktionen, damit sie sich testen lassen.

import type { Spieldaten } from '../daten/typen';
import { blutet, fristMinuten, fristVerlaengert } from '../regeln/blutung';
import { heilt, restHeildauer } from '../regeln/heilung';
import type { Buchung, Charakter, Gefecht, Wunde } from '../speicher/charakter';
import { geld, grundwertName, klasseName, mitZeichen, punkte, standText, vorzeichen } from './texte';

/** Datum und Uhrzeit kurz: „19.11.2026, 22:30“. */
export function zeitText(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const tageText = (n: number) => `${n} ${n === 1 ? 'Ruhetag' : 'Ruhetage'}`;

/** Stand einer Wunde in Worten (Blutung, Versorgung, Heildauer). */
export function wundStatus(w: Wunde, d: Spieldaten, imGefecht: boolean): string {
  const mit = w.versorgt ? (d.regeln.versorgen[w.versorgt]?.name ?? w.versorgt) : '';
  if (blutet(w)) {
    const frist = fristMinuten(w, d);
    const fristText = frist === null ? '' : `, Frist ${frist} ${frist === 1 ? 'Minute' : 'Minuten'}${imGefecht ? ' ab Gefechtsende' : ''}`;
    return `blutet${fristText}${fristVerlaengert(w, d) ? ` (${mit})` : ''}`;
  }
  if (w.versorgt) return `versorgt (${mit})${heilt(w, d) ? `, heilt: noch ${tageText(restHeildauer(w, d))}${w.nachsorge === null ? ' ohne Nachsorge' : ''}` : ''}`;
  if (w.blutung.status === 'gestoppt') return 'Blutung gestoppt';
  return 'ausgeblutet, unversorgt';
}

// ---------- Gefechtsprotokoll

const URSACHE: Record<string, string> = { rad: 'Von Hand', start: 'Gefechtsbeginn', rundenende: 'Rundenende', senken: 'Senken' };
const ERGEBNIS: Record<string, string> = { gestoppt: 'von der Rüstung gestoppt', durchschlag: 'durchschlägt', wucht: 'Wucht' };

/** Ein Eintrag des laufenden Gefechts als Zeile: Haupttext und (optional) Einzelheiten. */
export function gefechtseintragText(e: Gefecht['protokoll'][number], d: Spieldaten): { text: string; mehr: string[] } {
  switch (e.art) {
    case 'leiter': {
      const ursache = URSACHE[e.ursache] ?? e.ursache;
      if (e.von === e.nach) return { text: `${ursache}: misslungen, es bleibt, wie es ist`, mehr: [] };
      const text = e.nach === 0 ? `${standText(e.von, d)} vorbei`
        : e.von === 0 ? standText(e.nach, d)
        : `${standText(e.von, d)} → ${standText(e.nach, d)}`;
      return { text: `${ursache}: ${text}`, mehr: [] };
    }
    case 'schuss':
      return { text: e.text[0] ?? 'Schuss', mehr: e.text.slice(1) };
    case 'aktion':
      return { text: e.text, mehr: [] };
    case 'treffer':
    case 'schaden_direkt': {
      const zoneId = e.eingabe?.zone ?? e.direkt?.zone ?? '';
      const zone = d.koerperzonen.eintraege.find((z) => z.id === zoneId)?.name ?? zoneId;
      const r = e.ergebnis;
      const wirkung = r.art === 'gestoppt' ? ERGEBNIS.gestoppt!
        : `${ERGEBNIS[r.art] ?? r.art}, ${r.schaden} Schaden${r.stagger ? ', Stagger' : ''}${r.tot ? ', tödlich' : ''}`;
      return { text: `Getroffen (${e.quelle || 'Treffer'})${zone ? `, ${zone}` : ''}: ${wirkung}`, mehr: [] };
    }
  }
}

// ---------- Kassenbuch

const BUCHUNGSART: Record<Buchung['art'], string> = {
  startgeld: 'Startgeld', auftrag: 'Auftrag', kauf: 'Kauf', verkauf: 'Verkauf', rate: 'Rate', korrektur: 'Korrektur'
};

/** Betrag mit Vorzeichen: „+1.200 $“, „−300 $“. */
export const betragText = (n: number) => (n > 0 ? `+${geld(n)}` : n < 0 ? `−${geld(-n)}` : geld(0));

export function buchungText(b: Buchung): string {
  const art = BUCHUNGSART[b.art] ?? b.art;
  return b.grund ? `${art}: ${b.grund}` : art;
}

// ---------- Aufstiegsprotokoll

const WECHSELART: Record<string, string> = {
  befoerderung: 'Beförderung', zweite_spezialisierung: 'Zweite Spezialisierung', wechsel: 'Laufbahnwechsel'
};

const FELDNAME: Record<string, string> = {
  name: 'Name', aussehen: 'Aussehen', freie_punkte: 'Freie Punkte', vorratslevel: 'Vorratslevel',
  'hintergrund.geburtsort': 'Geburtsort', 'hintergrund.personen': 'Wichtige Personen', 'hintergrund.lebensmittelpunkt': 'Lebensmittelpunkt'
};

/** Was eine Korrektur im Schreibmodus geändert hat, mit Zeichen der Begriffsart. */
function korrekturZiel(pfad: string, d: Spieldaten): string {
  const [teil, id] = pfad.split('.', 2) as [string, string | undefined];
  if (id && teil === 'stats') return mitZeichen('stat', id, d);
  if (id && teil === 'skills') return mitZeichen('skill', id, d);
  if (id && teil === 'perks') return mitZeichen('perk', id, d);
  if (id && teil === 'grundwerte') return grundwertName(id, d);
  return FELDNAME[pfad] ?? pfad;
}

/** Ein einfacher Wert zum Anzeigen; Würfe und Ränge als kurze Form, sonst leer. */
function wertText(w: unknown, pfad: string): string | null {
  if (w === null || w === undefined || w === '') return '–';
  if (typeof w === 'number') return String(w);
  if (typeof w === 'boolean') return pfad.startsWith('perks.') ? (w ? 'hat ihn' : 'hat ihn nicht') : null;
  if (typeof w === 'string') return w.length <= 24 ? w : null;
  if (typeof w === 'object' && 'positiv' in w && 'negativ' in w) return `Wurf ${(w as { positiv: number }).positiv} − ${(w as { negativ: number }).negativ}`;
  return null;
}

/** Ein Eintrag des Aufstiegsprotokolls als Satz. Unbekannte Arten erscheinen mit ihrem Namen. */
export function aufstiegseintragText(e: Charakter['protokoll'][number], d: Spieldaten): string {
  const kosten = typeof e.kosten === 'number' ? ` (${punkte(e.kosten)})` : '';
  switch (e.art) {
    case 'erstellung_abgeschlossen':
      return 'Erstellung abgeschlossen';
    case 'session':
      return `Session abgeschlossen: ${vorzeichen(Number(e.punkte ?? 0))} freie Punkte`;
    case 'skill':
      return `${mitZeichen('skill', String(e.id), d)} auf Stufe ${e.nach}${kosten}`;
    case 'perk':
      return `${mitZeichen('perk', String(e.id), d)} gekauft${kosten}`;
    case 'statrank_up':
      return `Statrank-Up ${mitZeichen('stat', String(e.id), d)}: Rank ${e.rang_von} → ${e.rang_nach}${kosten}`;
    case 'klassenwechsel': {
      const art = WECHSELART[String(e.wechsel)] ?? 'Klassenwechsel';
      const von = e.von ? klasseName(String(e.von), d) : 'ohne Klasse';
      return `${art}: ${von} → ${klasseName(String(e.nach), d)}`;
    }
    case 'korrektur': {
      const pfad = String(e.pfad ?? '');
      const vorher = wertText(e.vorher, pfad);
      const nachher = wertText(e.nachher, pfad);
      const werte = vorher !== null && nachher !== null ? `: ${vorher} → ${nachher}` : '';
      return `Im Schreibmodus geändert: ${korrekturZiel(pfad, d)}${werte}`;
    }
    default:
      return e.art;
  }
}
