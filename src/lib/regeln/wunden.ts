// Eingehende Treffer übernehmen (konzept.md § 3.10, § 4.7): Wunde oder Prellung anlegen, HP abziehen,
// Tod durch Krit-Folge, Stagger und Auslöser im Gefecht. Jede Funktion gibt einen neuen Charakter zurück.

import type { Folgesatz, Spieldaten } from '../daten/typen';
import type { Charakter, Gefecht, Trefferereignis, Wunde } from '../speicher/charakter';
import { eigeneBewegungFuerLage, eigenerStand } from './aktionen';
import { hatWirkung } from './leiter';
import { grundwerte } from './modifikatoren';
import { gefechtVon } from './probenrechner';
import { ruestungswert, treffer, verdeckteZonen, type StaggerRegel, type Trefferfolge } from './schaden';

/** Was die SL ansagt bzw. der Spieler einträgt, bevor eine Zone gewählt ist. */
export interface Geschoss {
  /** null = stumpf (keine DK). */
  dk: number | null;
  mw: number;
  kugeln: number;
  krit: boolean;
  /** Deckungswert vor der getroffenen Zone; null = Zone nicht verdeckt. */
  deckung: number | null;
}

export interface Eingang extends Geschoss {
  zone: string;
}

/** Stagger-Regel aus den Symptomen von Adrenalin bzw. Ruhepuls (außerhalb des Gefechts normal). */
export function staggerRegel(c: Charakter, d: Spieldaten): StaggerRegel {
  const g = gefechtVon(c);
  if (!g) return 'normal';
  if (hatWirkung(g.leiter, 'kein_stagger', d.regeln)) return 'nie';
  if (hatWirkung(g.leiter, 'stagger_ab_gleich', d.regeln)) return 'empfindlich';
  return 'normal';
}

/**
 * Deckung aus dem laufenden Gefecht für eine Zone (gefecht.deckung, datenformat.md). Gespeichert sind die schon
 * erweiterten Zonen; für die Ansage „Rumpf“ zählt die Deckung, wenn alle Rumpfzonen verdeckt sind (R32).
 */
export function deckungFuer(zone: string, c: Charakter, d: Spieldaten): number | null {
  const dg = gefechtVon(c)?.deckung;
  if (!dg) return null;
  return verdeckteZonen(dg.zonen, d, false).includes(zone) ? dg.wert : null;
}

/** Was ein Treffer auf eine Zone auslösen würde, ohne etwas zu ändern (Vorschau und Bericht). */
export interface Ausgang extends Trefferfolge {
  zone: string;
  ruestung: number;
  /** Sofort tot (Krit-Folge der Zone) oder HP danach ≤ Grenze für Tod. */
  tot: boolean;
  /** Kampfunfähig durch diesen Treffer (HP = 0 oder Krit-Folge „kampfunfähig“), wenn nicht tot. */
  kampfunfaehig: boolean;
  hp_vorher: number;
  hp_nachher: number;
  /** Text der Zonenfolge (Spalte Normal oder Krit), wenn eine gilt. */
  folge_text: string | null;
}

function hpAktuellRoh(c: Charakter, d: Spieldaten): number {
  return grundwerte(c, d).hp - c.spielstand.hp_verlust_wunden - c.spielstand.prellungen;
}

export function ausgang(c: Charakter, e: Eingang, d: Spieldaten): Ausgang {
  const zone = d.koerperzonen.eintraege.find((z) => z.id === e.zone);
  if (!zone) throw new Error(`unbekannte Zone „${e.zone}“`);
  const ruestung = ruestungswert(e.zone, c.ausruestung.ruestung, d);
  const folge = treffer(
    { zone: e.zone, dk: e.dk, mw: e.mw, kugeln: e.kugeln, krit: e.krit, deckung: e.deckung, ruestung,
      schmerzresistenz: grundwerte(c, d).schmerzresistenz, stagger_regel: staggerRegel(c, d) },
    d
  );
  const hpVorher = hpAktuellRoh(c, d);
  const hpNachher = hpVorher - folge.schaden;
  const spalte = folge.folge === 'krit' ? zone.krit : folge.folge === 'normal' ? zone.normal : null;
  const r = d.regeln.lebenspunkte;
  const tot = c.spielstand.tot || hpNachher <= r.tot_bei || (folge.folge === 'krit' && zone.krit.tot === true);
  const kampfunfaehig = !tot && (hpNachher <= r.kampfunfaehig_bei || (folge.folge === 'krit' && zone.krit.kampfunfaehig === true));
  return { ...folge, zone: e.zone, ruestung, tot, kampfunfaehig, hp_vorher: hpVorher, hp_nachher: hpNachher, folge_text: spalte?.text ?? null };
}

function neueWundId(c: Charakter): string {
  const belegt = new Set(c.spielstand.wunden.map((w) => w.id));
  let n = c.spielstand.wunden.length + 1;
  while (belegt.has(`w${n}`)) n++;
  return `w${n}`;
}

/**
 * Auslöser eines eingehenden Treffers im Gefecht (regeln.json leiter.ausloeser).
 * Regelfrage R25 (docs/offen.md): vorläufig zählt „getroffen“, sobald der Treffer nicht in der Deckung stecken bleibt
 * (auch bei 0 Schaden); „verletzt“ nur bei Schaden; ein Schuss setzt immer „beschossen“.
 */
export function ausloeserVon(a: Pick<Ausgang, 'art' | 'schaden' | 'stagger'>, schuss: boolean, d: Spieldaten): string[] {
  const id = d.regeln.eingehend.ausloeser;
  const liste: string[] = [];
  if (schuss) liste.push(id.beschossen);
  if (a.art !== 'gestoppt') liste.push(id.getroffen);
  if (a.schaden > 0) liste.push(id.verletzt);
  if (a.stagger) liste.push(id.stagger);
  return liste;
}

export interface Uebernahme {
  /** Kurztext für das Gefechtsprotokoll („Schuss“, „Sonstiges“). */
  quelle: string;
  /** Setzt den Auslöser „beschossen“. */
  schuss: boolean;
}

/** Treffer übernehmen: Wunde (Durchschlag) oder Prellung (Wuchttreffer), HP, Tod, Stagger und Auslöser. */
export function trefferUebernehmen(c: Charakter, e: Eingang, u: Uebernahme, d: Spieldaten): Charakter {
  const a = ausgang(c, e, d);
  return anwenden(c, a, { eingabe: { ...e }, quelle: u.quelle, schuss: u.schuss }, d);
}

/** Schaden direkt (Sturz, Falle …): ohne Schadensablauf, als Wunde oder Prellung, ohne Zonenfolgen und ohne Stagger. */
export function schadenDirekt(c: Charakter, zone: string, schaden: number, art: 'wunde' | 'prellung', d: Spieldaten): Charakter {
  if (!d.koerperzonen.eintraege.some((z) => z.id === zone)) throw new Error(`unbekannte Zone „${zone}“`);
  const s = Math.max(0, Math.round(schaden));
  const hpVorher = hpAktuellRoh(c, d);
  const hpNachher = hpVorher - s;
  const r = d.regeln.lebenspunkte;
  const tot = c.spielstand.tot || hpNachher <= r.tot_bei;
  const a: Ausgang = {
    art: art === 'wunde' ? 'durchschlag' : 'wucht', rest_dk: null, schaden: s, wunde: art === 'wunde' && s > 0, prellung: art === 'prellung' && s > 0,
    folge: null, stagger: false, zone, ruestung: 0, tot, kampfunfaehig: !tot && hpNachher <= r.kampfunfaehig_bei,
    hp_vorher: hpVorher, hp_nachher: hpNachher, folge_text: null
  };
  return anwenden(c, a, { direkt: { zone, schaden: s, art }, quelle: 'Sonstiges', schuss: false }, d);
}

interface Herkunft {
  eingabe?: Eingang;
  direkt?: { zone: string; schaden: number; art: 'wunde' | 'prellung' };
  quelle: string;
  schuss: boolean;
}

function anwenden(c: Charakter, a: Ausgang, h: Herkunft, d: Spieldaten): Charakter {
  const ss = c.spielstand;
  let wunde: Wunde | null = null;
  if (a.wunde) {
    wunde = {
      id: neueWundId(c),
      zone: a.zone,
      schaden: a.schaden,
      kritisch: a.folge === 'krit',
      blutung: { status: 'offen', frist_ende: null },
      versorgt: null,
      nachsorge: null,
      ruhetage_geheilt: 0
    };
  }
  const hpVerlust = ss.hp_verlust_wunden + (a.wunde ? a.schaden : 0);
  const prellungen = ss.prellungen + (a.prellung ? a.schaden : 0);
  const tot = ss.tot || a.tot;

  let gefecht: Charakter['spielstand']['gefecht'] = ss.gefecht;
  const g = gefechtVon(c);
  if (g) {
    // Schaden direkt (Sturz, Falle): kein Treffer, nur „verletzt“.
    const liste = h.direkt ? (a.schaden > 0 ? [d.regeln.eingehend.ausloeser.verletzt] : []) : ausloeserVon(a, h.schuss, d);
    const neu = liste.filter((x) => !g.ausloeser_diese_runde.includes(x));
    const breakWeg = a.stagger && !g.break_verloren;
    // Folge der Zone, die den Stand ändert (Sturz im Lauf → liegen), ohne Aktion.
    const standVorher = eigenerStand(g, d);
    const standNeu = h.direkt ? null : geltendeFolgen(a, c, d).find((f) => f.stand_danach)?.stand_danach ?? null;
    const standWechsel = standNeu && standNeu !== standVorher ? standNeu : null;
    const ereignis: Trefferereignis = {
      runde: g.runde,
      zeit: new Date().toISOString(),
      art: h.direkt ? 'schaden_direkt' : 'treffer',
      quelle: h.quelle,
      ...(h.eingabe ? { eingabe: h.eingabe } : {}),
      ...(h.direkt ? { direkt: h.direkt } : {}),
      ergebnis: { art: a.art, schaden: a.schaden, stagger: a.stagger, tot: a.tot },
      aenderungen: {
        wunde: wunde?.id ?? null,
        hp_verlust_wunden: [ss.hp_verlust_wunden, hpVerlust],
        prellungen: [ss.prellungen, prellungen],
        tot: [ss.tot, tot],
        ausloeser: neu,
        break_verloren: breakWeg,
        ...(standWechsel ? { stand: [standVorher, standWechsel] as [string, string] } : {})
      }
    };
    const ng: Gefecht = {
      ...g,
      ausloeser_diese_runde: [...g.ausloeser_diese_runde, ...neu],
      ...(standWechsel ? { stand: standWechsel } : {}),
      break_verloren: g.break_verloren || a.stagger,
      // Stagger unterbricht eine laufende Aktion mit Konzentration.
      konzentration: a.stagger ? null : g.konzentration,
      protokoll: [...g.protokoll, ereignis]
    };
    gefecht = ng;
  }
  return {
    ...c,
    geaendert: new Date().toISOString(),
    spielstand: {
      ...ss,
      gefecht,
      hp_verlust_wunden: hpVerlust,
      prellungen,
      tot,
      wunden: wunde ? [...ss.wunden, wunde] : ss.wunden
    }
  };
}

/** Vorschau für alle Zonen mit W8-Nummer (für die Färbung der Silhouette). */
export function vorschau(c: Charakter, g: Geschoss, d: Spieldaten, deckungJeZone?: (zone: string) => number | null): Record<string, Ausgang> {
  const aus: Record<string, Ausgang> = {};
  for (const z of d.koerperzonen.eintraege) {
    if (z.w8 === null) continue;
    aus[z.id] = ausgang(c, { ...g, zone: z.id, deckung: deckungJeZone ? deckungJeZone(z.id) : g.deckung }, d);
  }
  return aus;
}

/**
 * Folgen der Zone, die für diesen Treffer gelten (koerperzonen.json `saetze`). Im Gefecht entscheidet die eigene
 * Bewegung dieser Runde über bedingte Folgen (Sturz im Lauf, R26 entschieden: Laufen oder Rennen); außerhalb gilt der
 * Ersatz `ohne_gefecht` ohne weitere Wirkung.
 */
export function geltendeFolgen(a: Pick<Ausgang, 'zone' | 'folge'>, c: Charakter, d: Spieldaten): Folgesatz[] {
  const z = d.koerperzonen.eintraege.find((x) => x.id === a.zone);
  if (!z || !a.folge) return [];
  const g = gefechtVon(c);
  const bewegung = g ? eigeneBewegungFuerLage(g) : null;
  const aus: Folgesatz[] = [];
  for (const s of (a.folge === 'krit' ? z.krit : z.normal).saetze) {
    if (!s.nur_bei_bewegung) aus.push(s);
    else if (g) { if (bewegung && s.nur_bei_bewegung.includes(bewegung)) aus.push(s); }
    else if (s.ohne_gefecht) aus.push({ text: s.ohne_gefecht });
  }
  return aus;
}

/** Folgen der Zone als ganze Sätze für den Bericht. */
export function folgeSaetze(a: Pick<Ausgang, 'zone' | 'folge'>, c: Charakter, d: Spieldaten): string[] {
  return geltendeFolgen(a, c, d).map((s) => s.text);
}

/** Kurzbeschreibung einer Wunde für Listen und Berichte. */
export function wundenText(w: Wunde, d: Spieldaten): string {
  const z = d.koerperzonen.eintraege.find((x) => x.id === w.zone);
  const name = z?.name ?? w.zone;
  return `${name}: ${w.schaden} Schaden${w.kritisch ? ', kritisch' : ''}`;
}
