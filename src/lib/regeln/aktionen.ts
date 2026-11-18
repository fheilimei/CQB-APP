// Aktionen einer Runde (konzept.md § 3.7a, § 4.12; Regelwerk: Kampfsystem, Action Economy, Aktionen):
// Zähler der vier Aktionsknöpfe, Bewegung, Standwechsel, Hechten, Zielen, Konzentration und Merker der Lage.
// Jede Funktion gibt einen neuen Charakter zurück; nichts wird gespeichert.

import type { PerkWirkung, Spieldaten } from '../daten/typen';
import type { Aktion, Aktionszahlen, Charakter, Gefecht } from '../speicher/charakter';
import { hatWirkung, overTheEdge } from './leiter';
import type { StepQuelle } from './probe';
import { gefechtVon } from './probenrechner';

export const AKTIONEN: Aktion[] = ['main', 'bewegung', 'stand', 'break'];

function laufend(c: Charakter): Gefecht {
  const g = gefechtVon(c);
  if (!g) throw new Error('Kein Gefecht aktiv');
  return g;
}

function mit(c: Charakter, g: Gefecht): Charakter {
  return { ...c, geaendert: new Date().toISOString(), spielstand: { ...c.spielstand, gefecht: g } };
}

// ---------- Perk-Wirkungen (regeln.json `perk_wirkungen`)

/** Alle Wirkungen einer Art aus den Perks des Charakters. */
export function perkWirkungen<A extends PerkWirkung['art']>(c: Charakter, d: Spieldaten, art: A): Extract<PerkWirkung, { art: A }>[] {
  const liste: Extract<PerkWirkung, { art: A }>[] = [];
  for (const p of c.perks) for (const w of d.regeln.perk_wirkungen[p] ?? []) if (w.art === art) liste.push(w as Extract<PerkWirkung, { art: A }>);
  return liste;
}

/** Name des Perks, der eine Wirkung dieser Art bringt (für Herkunft und Hinweise). */
export function perkMitWirkung(c: Charakter, d: Spieldaten, art: PerkWirkung['art']): string | null {
  const id = c.perks.find((p) => (d.regeln.perk_wirkungen[p] ?? []).some((w) => w.art === art));
  return id ? (d.perks.eintraege.find((p) => p.id === id)?.name ?? id) : null;
}

// ---------- Stand

/** Eigener Stand; ohne Angabe der erste Stand aus regeln.json. */
export function eigenerStand(g: Gefecht, d: Spieldaten): string {
  return g.stand || d.regeln.staende[0]!.id;
}

export function standDaten(id: string, d: Spieldaten) {
  return d.regeln.staende.find((s) => s.id === id);
}

// ---------- Zähler

/** Höchstzahl einer Aktion in dieser Runde ohne Korrektur von Hand (Sprint, Initiative-Krit, Konzentration, Stagger). */
export function hoechstzahl(c: Charakter, g: Gefecht, aktion: Aktion, d: Spieldaten): number {
  const r = d.regeln;
  switch (aktion) {
    case 'main':
      return r.aktionen.main;
    case 'break': {
      if (g.break_verloren || g.konzentration) return Math.min(g.verbraucht.break, r.aktionen.break);
      return r.aktionen.break + (g.initiative?.stufe === 'krit' ? r.initiative.krit_break_extra : 0);
    }
    case 'bewegung':
      if (g.konzentration && r.konzentration[g.konzentration].bewegung_max === null) return 0;
      return hatWirkung(g.leiter, 'zweite_bewegung', r) ? r.aktionen.sprint_bewegung : r.aktionen.bewegung;
    case 'stand':
      if (g.konzentration && !r.konzentration[g.konzentration].standwechsel) return 0;
      return r.aktionen.stand;
  }
}

/** Wie oft eine Aktion in dieser Runde noch verfügbar ist. Over the Edge: ein gemeinsamer Zähler für alle vier. */
export function verfuegbar(c: Charakter, aktion: Aktion, d: Spieldaten): number {
  const g = laufend(c);
  const r = d.regeln;
  const einzeln = Math.max(0, hoechstzahl(c, g, aktion, d) - g.verbraucht[aktion] + g.korrektur[aktion]);
  if (!overTheEdge(g.leiter, r)) return einzeln;
  const summe = AKTIONEN.reduce((s, a) => s + g.verbraucht[a], 0);
  return Math.max(0, Math.min(einzeln, r.aktionen.over_the_edge_gesamt - summe) + g.korrektur[aktion]);
}

export function zaehler(c: Charakter, d: Spieldaten): Aktionszahlen {
  return Object.fromEntries(AKTIONEN.map((a) => [a, verfuegbar(c, a, d)])) as Aktionszahlen;
}

/** Eine Aktion verbrauchen (−1). */
export function verbrauchen(c: Charakter, aktion: Aktion): Charakter {
  const g = laufend(c);
  return mit(c, { ...g, verbraucht: { ...g.verbraucht, [aktion]: g.verbraucht[aktion] + 1 } });
}

/** Langer Druck: ±1 von Hand (Sonderregeln, Fehltipper). Der Zähler fällt nie unter 0. */
export function korrigieren(c: Charakter, aktion: Aktion, schritt: 1 | -1, d: Spieldaten): Charakter {
  if (schritt < 0 && verfuegbar(c, aktion, d) === 0) return c;
  const g = laufend(c);
  return mit(c, { ...g, korrektur: { ...g.korrektur, [aktion]: g.korrektur[aktion] + schritt } });
}

// ---------- Konzentration

/** Konzentration setzt voraus, dass in dieser Runde noch keine Breakaction eingesetzt wurde. */
export function konzentrationMoeglich(c: Charakter): boolean {
  const g = gefechtVon(c);
  return !g || g.verbraucht.break === 0;
}

/** Mainaction mit Konzentration: Break 0 für diese Runde, Bewegung bzw. Standwechsel beschränkt. Die stärkere Stufe gilt. */
export function konzentrationSetzen(c: Charakter, stufe: 'leicht' | 'voll'): Charakter {
  const g = gefechtVon(c);
  if (!g) return c;
  const neu = g.konzentration === 'voll' ? 'voll' : stufe;
  return mit(c, { ...g, konzentration: neu });
}

// ---------- Bewegung

export interface Bewegungsart {
  id: string;
  erlaubt: boolean;
  /** Warum nicht erlaubt: stand, konzentration, ausruestung. */
  grund: 'stand' | 'konzentration' | 'ausruestung' | null;
}

/** Index einer Bewegungsart von langsam nach schnell. */
function tempo(id: string, d: Spieldaten): number {
  return d.regeln.bewegung.reihenfolge.indexOf(id);
}

/** Schnellste Bewegung, die Rüstung und Schild erlauben (schutz.json `einschraenkung.bewegung_max`), oder null. */
export function bewegungMaxAusruestung(c: Charakter, d: Spieldaten): string | null {
  const s = d.schutz;
  const teile = [
    ...c.ausruestung.ruestung.map((id) => s.ruestung.find((x) => x.id === id)?.einschraenkung),
    c.ausruestung.schild ? s.schilde.find((x) => x.id === c.ausruestung.schild)?.einschraenkung : undefined
  ];
  let max: string | null = null;
  for (const e of teile) {
    const b = e?.bewegung_max;
    if (typeof b === 'string' && (max === null || tempo(b, d) < tempo(max, d))) max = b;
  }
  return max;
}

/** Bewegungsarten mit Erlaubnis nach Stand, Konzentration und Ausrüstung (konzept.md § 3.7a, Bewegung). */
export function bewegungsarten(c: Charakter, d: Spieldaten): Bewegungsart[] {
  const g = laufend(c);
  const stand = eigenerStand(g, d);
  const konz = g.konzentration ? d.regeln.konzentration[g.konzentration].bewegung_max : undefined;
  const ausr = bewegungMaxAusruestung(c, d);
  return d.regeln.bewegung.reihenfolge.map((id) => {
    const art = d.regeln.bewegung.arten[id]!;
    let grund: Bewegungsart['grund'] = null;
    if (!art.stand.includes(stand)) grund = 'stand';
    else if (konz === null || (konz && tempo(id, d) > tempo(konz, d))) grund = 'konzentration';
    else if (ausr && tempo(id, d) > tempo(ausr, d)) grund = 'ausruestung';
    return { id, erlaubt: grund === null, grund };
  });
}

/** Bewegung ausführen: Zähler −1; die schnellste Bewegung der Runde zählt für die Lage (Sprint).
 *  Regelfrage R9 (entschieden): Eine Bewegung nach dem Hechten löst das Hechten für die Lage ab. */
export function bewegen(c: Charakter, art: string, d: Spieldaten): Charakter {
  const g = laufend(c);
  const bewegt = g.bewegt && tempo(g.bewegt, d) >= tempo(art, d) ? g.bewegt : art;
  // Wer nach dem Zielen in derselben Runde läuft, verliert „ohne Reichweite“ (Gezielter Schuss), behält aber das Zielen.
  const zielen = g.zielen && g.zielen.ohne_reichweite && g.zielen.gezielt_in === g.runde
    ? { ...g.zielen, ohne_reichweite: false, stepshields: d.regeln.zielen.stepshields }
    : g.zielen;
  return mit(c, {
    ...g,
    bewegt,
    gehechtet: false,
    bewegungen: g.bewegungen + 1,
    zielen,
    verbraucht: { ...g.verbraucht, bewegung: g.verbraucht.bewegung + 1 }
  });
}

// ---------- Standwechsel und Hechten

/** Bewegung der Runde nach einem Standwechsel: Ist sie im neuen Stand nicht möglich, gilt die schnellste Bewegungsart,
 *  die der neue Stand erlaubt (Hocke → Gehen, Liegen → Kriechen; Kampfsystem, Standwechsel).
 *  Regelfrage R33 (entschieden): Wer rennt und dann in die Hocke geht oder sich hinlegt, verlangsamt auf das erlaubte Maß. */
export function bewegungImStand(bewegt: string | null, stand: string, d: Spieldaten): string | null {
  if (!bewegt) return null;
  const arten = d.regeln.bewegung.arten;
  if (arten[bewegt]?.stand.includes(stand)) return bewegt;
  const moeglich = d.regeln.bewegung.reihenfolge.filter((id) => arten[id]!.stand.includes(stand) && tempo(id, d) <= tempo(bewegt, d));
  return moeglich.at(-1) ?? null;
}

/** Standwechsel über den Knopf Stand verbraucht den Stand-Zähler, als Breakaction (Break-Menü, mit Reaktion oder Antizipation) die Breakaction.
 *  Die Bewegung der Runde sinkt auf das, was der neue Stand erlaubt (R33). */
export function standWechseln(c: Charakter, stand: string, als: 'stand' | 'break', d: Spieldaten): Charakter {
  const g = laufend(c);
  return mit(c, { ...g, stand, bewegt: bewegungImStand(g.bewegt, stand, d), verbraucht: { ...g.verbraucht, [als]: g.verbraucht[als] + 1 } });
}

/** Hechten ist gesperrt aus einem Stand mit kein_hechten (Liegen) und mit dem Symptom „Kein Hechten“. */
export function hechtenSperre(c: Charakter, d: Spieldaten): 'stand' | 'symptom' | null {
  const g = laufend(c);
  if (standDaten(eigenerStand(g, d), d)?.kein_hechten) return 'stand';
  if (hatWirkung(g.leiter, 'kein_hechten', d.regeln)) return 'symptom';
  return null;
}

/** Hechten (Main oder Break): in einen Stand aus regeln.json hechten.staende (R27: nur Liegen); zählt bis Rundenende bzw. bis zur nächsten Bewegung als eigene Bewegung für die Lage (R9). */
export function hechten(c: Charakter, zielstand: string, als: 'main' | 'break', d: Spieldaten): Charakter {
  const g = laufend(c);
  return mit(c, { ...g, stand: zielstand, bewegt: bewegungImStand(g.bewegt, zielstand, d), gehechtet: true, verbraucht: { ...g.verbraucht, [als]: g.verbraucht[als] + 1 } });
}

// ---------- Zielen

/** Zielen als Mainaction nur mit dem Symptom „Ruhige Hand“. */
export function zielenAlsMain(c: Charakter, d: Spieldaten): boolean {
  const g = gefechtVon(c);
  return !!g && hatWirkung(g.leiter, 'zielen_als_main', d.regeln);
}

export interface Zielwirkung {
  stepshields: number;
  ohne_reichweite: boolean;
  /** Name des Perks, der die Wirkung ändert, sonst null. */
  perk: string | null;
}

/**
 * Was Zielen jetzt bringt: Stepshield, mit Perk mehr (liegend oder aufgelegt) oder „ohne Reichweite“ (ohne Bewegung).
 * Regelfrage R10 (docs/offen.md): vorläufig zählt „liegend oder aufgelegt“ im Moment des Zielens.
 */
export function zielwirkung(c: Charakter, d: Spieldaten, liegendOderAufgelegt: boolean): Zielwirkung {
  const g = gefechtVon(c);
  let w: Zielwirkung = { stepshields: d.regeln.zielen.stepshields, ohne_reichweite: false, perk: null };
  for (const p of perkWirkungen(c, d, 'zielen_stepshields')) {
    if (p.bedingung === 'liegend_oder_aufgelegt' && !liegendOderAufgelegt) continue;
    if (p.stepshields > w.stepshields) w = { ...w, stepshields: p.stepshields, perk: perkMitWirkung(c, d, 'zielen_stepshields') };
  }
  for (const p of perkWirkungen(c, d, 'zielen_ohne_reichweite')) {
    if (p.bedingung === 'ohne_bewegung' && g?.bewegt) continue;
    w = { stepshields: 0, ohne_reichweite: true, perk: perkMitWirkung(c, d, 'zielen_ohne_reichweite') };
  }
  return w;
}

/** Zielen: als Break für den nächsten Schuss in der nächsten Runde, als Main (Ruhige Hand) schon in dieser Runde. */
export function zielen(c: Charakter, d: Spieldaten, als: 'main' | 'break', liegendOderAufgelegt: boolean): Charakter {
  const g = laufend(c);
  const w = zielwirkung(c, d, liegendOderAufgelegt);
  return mit(c, {
    ...g,
    zielen: { runde: als === 'main' ? g.runde : g.runde + 1, stepshields: w.stepshields, ohne_reichweite: w.ohne_reichweite, gezielt_in: g.runde },
    verbraucht: { ...g.verbraucht, [als]: g.verbraucht[als] + 1 }
  });
}

/** Zielen, das für einen Schuss in dieser Runde gilt, sonst null. Regelfrage R8 (entschieden): nur die nächste Runde, nur der nächste Schuss. */
export function zielenAktiv(g: Gefecht): Gefecht['zielen'] {
  return g.zielen && g.zielen.runde === g.runde ? g.zielen : null;
}

// ---------- Lage-Auswahl merken (konzept.md § 3.8c, Merken)

export function lageWaehlen(c: Charakter, gruppe: string, wert: string | string[] | null): Charakter {
  const g = laufend(c);
  return mit(c, { ...g, lage: { ...g.lage, auswahl: { ...g.lage.auswahl, [gruppe]: wert } } });
}

/** Auswahl der Gruppen zurücksetzen, deren `zuruecksetzen` passt (rundenende, neues_ziel). */
export function lageZuruecksetzen(g: Gefecht, wann: string, d: Spieldaten): Gefecht {
  const auswahl = { ...g.lage.auswahl };
  for (const gr of d.regeln.lage.gruppen) if (gr.zuruecksetzen === wann) delete auswahl[gr.id];
  return { ...g, lage: { ...g.lage, auswahl } };
}

/** Knopf „Neues Ziel“: Entfernung, Stand und Größe des Ziels zurück; ein Zielen gilt dem alten Ziel und entfällt. */
export function neuesZiel(c: Charakter, d: Spieldaten): Charakter {
  const g = lageZuruecksetzen(laufend(c), 'neues_ziel', d);
  return mit(c, { ...g, zielen: null });
}

/** Neue Runde: Zähler, Bewegung, Hechten, Konzentration zurück; Lage-Gruppen mit zuruecksetzen „rundenende“. */
export function rundeZuruecksetzen(g: Gefecht, d: Spieldaten): Gefecht {
  const leer: Aktionszahlen = { main: 0, break: 0, bewegung: 0, stand: 0 };
  return {
    ...lageZuruecksetzen(g, 'rundenende', d),
    verbraucht: { ...leer },
    korrektur: { ...leer },
    bewegt: null,
    bewegungen: 0,
    gehechtet: false,
    konzentration: null,
    break_verloren: false
  };
}

/** Eigene Bewegung dieser Runde für die Lage: das zuletzt Gewählte aus Bewegung und Hechten.
 *  Regelfrage R9 (entschieden): Man rennt oder hechtet, nicht beides; `gehechtet` steht nur, solange danach keine Bewegung kam. */
export function eigeneBewegungFuerLage(g: Gefecht): string | null {
  return g.gehechtet ? 'hechten' : g.bewegt;
}

/** Eintrag „aktion“ im Gefechtsprotokoll. */
export function protokolliere(c: Charakter, text: string): Charakter {
  const g = gefechtVon(c);
  if (!g) return c;
  return mit(c, { ...g, protokoll: [...g.protokoll, { runde: g.runde, zeit: new Date().toISOString(), art: 'aktion', text }] });
}

/** Überraschung in Runde 1: Malsteps auf die Breakaction, außer ein Perk hebt sie auf (wie bei der Initiative). */
export function breakZusatz(c: Charakter, d: Spieldaten): StepQuelle[] {
  const g = gefechtVon(c);
  if (!g || !g.ueberrascht || g.runde !== 1) return [];
  let malsteps = d.regeln.leiter.ueberrascht_breakaction_malsteps;
  for (const [perk, wert] of Object.entries(d.regeln.initiative.ueberrascht_mit_perk ?? {})) if (c.perks.includes(perk)) malsteps = Math.min(malsteps, wert);
  return malsteps > 0 ? [{ id: 'ueberrascht', herkunft: 'lage', name: 'überrascht (Runde 1)', malsteps }] : [];
}
