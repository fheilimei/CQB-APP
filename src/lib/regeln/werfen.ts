// Wurfaktion (konzept.md § 3.8a; Regelwerk: Kampfsystem, Werfen; Sprengwirkung, Landepunkt und Zündung):
// Gegenstand wählen, Malsteps aus Wurfweite, Wurf-Reichweite, Lage, Ansage und „Kochen lassen“ zusammenstellen,
// Würfe auswerten (Wurfwaffe: Treffer und Zone; Sprengwaffe: Landepunkt) und übernehmen (Main bzw. Break −1,
// Gegenstand −1, Auslöser, Gefechtsprotokoll).

import type { BandId, Spieldaten, Sprengwaffe, WurfReichweite } from '../daten/typen';
import type { Charakter } from '../speicher/charakter';
import { eigeneBewegungFuerLage, eigenerStand, mit, protokolliere, verbrauchen } from './aktionen';
import { grundwerte } from './modifikatoren';
import { angriffsTreffer, nahkampfwaffenWahl, type AngriffsTreffer, type NahkampfwaffenWahl } from './nahkampf';
import type { Ergebnisstufe, StepQuelle } from './probe';
import { gefechtVon, type ProbenAnfrage } from './probenrechner';
import { ansageMoeglich, ansageSteps, lageSteps, zoneAusW8, type Ansage } from './schiessen';
import { entfernungsgruppe, lageAuswahl } from './schuss';
import { sprengwaffe } from './waffen';

// ---------- Gegenstände

export type Wurfgegenstand =
  | { art: 'wurfwaffe'; id: string; name: string; eintrag: string; anzahl: number; waffe: NahkampfwaffenWahl; wurf: WurfReichweite }
  | { art: 'sprengwaffe'; id: string; name: string; eintrag: string; anzahl: number; spreng: Sprengwaffe }
  | { art: 'sonstiges'; id: string; name: string };

/** ID des Eintrags „sonstiger Gegenstand“. */
export const SONSTIGES = 'sonstiges';

/** Wurf-Reichweite, die in mindestens einem Band einen Wurf erlaubt. */
function werfbar(w: WurfReichweite): boolean {
  return !!w && Object.values(w).some((m) => m !== null && m !== undefined);
}

/**
 * Was der Charakter werfen kann: eigene Nahkampfwaffen mit Wurf-Reichweite (je Variante), Granaten aus dem Vorrat
 * (einsatz „wurf“), jeweils mit Anzahl > 0, und immer „sonstiger Gegenstand“.
 */
export function wurfgegenstaende(c: Charakter, d: Spieldaten): Wurfgegenstand[] {
  const liste: Wurfgegenstand[] = [];
  for (const e of c.ausruestung.nahkampfwaffen) {
    const anzahl = e.anzahl ?? 1;
    if (anzahl <= 0) continue;
    const w = d.nahkampfwaffen.eintraege.find((x) => x.id === e.waffe);
    if (!w) continue;
    for (const wahl of nahkampfwaffenWahl(d, (x) => x.id === w.id)) {
      const variante = wahl.id.includes(':') ? w.varianten?.[wahl.id.split(':')[1]!] : undefined;
      const wurf = variante && 'wurf' in variante ? (variante.wurf ?? null) : w.wurf;
      if (!werfbar(wurf)) continue;
      liste.push({ art: 'wurfwaffe', id: `${e.id}|${wahl.id}`, name: wahl.name, eintrag: e.id, anzahl, waffe: wahl, wurf });
    }
  }
  for (const v of c.ausruestung.vorrat) {
    const s = sprengwaffe(v.id, d);
    if (!s || s.einsatz !== 'wurf' || v.anzahl <= 0) continue;
    liste.push({ art: 'sprengwaffe', id: `vorrat|${v.id}`, name: s.name, eintrag: v.id, anzahl: v.anzahl, spreng: s });
  }
  liste.push({ art: 'sonstiges', id: SONSTIGES, name: 'sonstiger Gegenstand' });
  return liste;
}

/** Vorgewählter Skill: Granaten für Sprengwaffen, sonst Wurfwaffen (regeln.json `werfen`). */
export function wurfSkill(g: Wurfgegenstand, d: Spieldaten): string {
  return g.art === 'sprengwaffe' ? d.regeln.werfen.skill_sprengwaffe : d.regeln.werfen.skill_wurfwaffe;
}

// ---------- Malsteps

function bandIndex(band: BandId, d: Spieldaten): number {
  return d.regeln.schiessen.reichweitenbaender.findIndex((b) => b.id === band);
}

/**
 * Malsteps der Wurfweite des Charakters: bis zur genauen Wurfweite keine, ein Band darüber
 * `werfen.ueber_wurfweite_malsteps`, weiter null (nicht möglich).
 */
export function wurfweitenSteps(band: BandId, wurfweite: BandId, d: Spieldaten): StepQuelle[] | null {
  const ueber = bandIndex(band, d) - bandIndex(wurfweite, d);
  if (ueber <= 0) return [];
  if (ueber > 1) return null;
  return [{ id: 'wurfweite', herkunft: 'lage', name: 'über deiner Wurfweite', malsteps: d.regeln.werfen.ueber_wurfweite_malsteps }];
}

/** Malsteps der Wurf-Reichweite der Waffe im Band; null = „n/A“ (nicht werfbar). Granaten haben keine. */
export function wurfReichweitenSteps(wurf: WurfReichweite, band: BandId, d: Spieldaten): StepQuelle[] | null {
  const m = wurf?.[band];
  if (m === null || m === undefined) return null;
  const name = d.regeln.schiessen.reichweitenbaender.find((b) => b.id === band)?.name ?? band;
  return m ? [{ id: 'wurf_reichweite', herkunft: 'waffe', name: `Wurf-Reichweite ${name}`, malsteps: m }] : [];
}

/** Malsteps von Wurfweite und Wurf-Reichweite zusammen; null = in diesem Band nicht werfbar. */
export function bandSteps(g: Wurfgegenstand, band: BandId, wurfweite: BandId, d: Spieldaten): StepQuelle[] | null {
  const ww = wurfweitenSteps(band, wurfweite, d);
  if (ww === null) return null;
  if (g.art !== 'wurfwaffe') return ww;
  const rw = wurfReichweitenSteps(g.wurf, band, d);
  return rw === null ? null : [...ww, ...rw];
}

/** Kochen lassen geht nur bei einer Granate mit Zeitzünder. */
export function kochenMoeglich(g: Wurfgegenstand): boolean {
  return g.art === 'sprengwaffe' && g.spreng.zuender === 'zeit';
}

export interface Wurfeinstellung {
  ansage: Ansage;
  ansage_zone: string | null;
  kochen: boolean;
}

export interface Wurfvorschau {
  gegenstand: Wurfgegenstand;
  band: BandId | null;
  wurfweite: BandId;
  /** Anfrage der Wurfprobe ohne Steps der SL und ausgeschaltete Chips (für den Probenbaustein der Oberfläche). */
  anfrage: Omit<ProbenAnfrage, 'sl' | 'ausgeschaltet' | 'braucht_sicht'>;
  ansage_moeglich: boolean;
  /** Ziel im Nahkampf: Ein Fehlwurf mit einer Wurfwaffe trifft einen anderen Beteiligten. */
  nahkampf: boolean;
  sperre: 'entfernung' | 'band' | null;
}

/** Abläufe für `nicht_fuer` der Lage: Granate werfen ist werfen und sprengwaffe. */
export function wurfAblauf(g: Wurfgegenstand): string[] {
  return g.art === 'sprengwaffe' ? ['werfen', 'sprengwaffe'] : ['werfen'];
}

export function wurfStellen(c: Charakter, d: Spieldaten, gg: Wurfgegenstand, s: Wurfeinstellung): Wurfvorschau {
  const r = d.regeln;
  const g = gefechtVon(c);
  const stand = g ? eigenerStand(g, d) : r.staende[0]!.id;
  const auswahl = g ? lageAuswahl(g, d) : {};
  const eg = entfernungsgruppe(d);
  const band = (eg ? (auswahl[eg] as BandId | null) : null) ?? null;
  const bewegung = g ? eigeneBewegungFuerLage(g) : null;
  const ablauf = wurfAblauf(gg);
  const wurfweite = grundwerte(c, d).wurfweite_band;

  const fest: StepQuelle[] = [];
  const zusatz: StepQuelle[] = [];
  const bs = band ? bandSteps(gg, band, wurfweite, d) : null;
  if (bs) fest.push(...bs);
  for (const q of lageSteps({ auswahl: eg ? { ...auswahl, [eg]: null } : auswahl, band, eigene_bewegung: bewegung, ablauf }, r)) {
    if (q.id !== 'eigene_bewegung') fest.push(q);
    else zusatz.push({ ...q, name: `eigene Bewegung: ${d.darstellung.bewegungen[bewegung!] ?? bewegung}` });
  }
  const mitAnsage = gg.art !== 'sprengwaffe';
  if (mitAnsage) zusatz.push(...ansageSteps(s.ansage, r));
  if (s.kochen && kochenMoeglich(gg)) zusatz.push({ id: 'kochen', herkunft: 'lage', name: 'Kochen lassen', malsteps: r.werfen.kochen_malsteps });

  const ids = new Set(Object.values(auswahl).flatMap((v) => (v == null ? [] : Array.isArray(v) ? v : [v])));
  const nahkampf = r.lage.umstaende.some((u) => ids.has(u.id) && u.fehlschuss_trifft_beteiligten && !u.nicht_fuer?.some((a) => ablauf.includes(a)));
  return {
    gegenstand: gg,
    band,
    wurfweite,
    anfrage: {
      stat: r.werfen.stat, skill: wurfSkill(gg, d), probe: 'werfen', zusatz, fest,
      kontext: { band, stand, ohne_bewegung: !bewegung, aufgelegt: false }
    },
    ansage_moeglich: mitAnsage && ansageMoeglich(g?.leiter ?? 0, g?.sichtstufe ?? r.sicht.stufen[0]!.id, r),
    nahkampf,
    sperre: !band ? 'entfernung' : bs === null ? 'band' : null
  };
}

// ---------- Auswertung

export interface Wurfbericht {
  stufe: Ergebnisstufe;
  /** Wurfwaffe (und sonstiger Gegenstand): getroffene Zone, null = daneben. */
  zone: string | null;
  krit: boolean;
  /** Fehlwurf in den Nahkampf: trifft einen anderen Beteiligten (nie kritisch). */
  beteiligter: boolean;
  /** Werte des Treffers (nur Nahkampfwaffen). */
  treffer: AngriffsTreffer | null;
  /** Sprengwaffe: Landepunkt nach Ergebnis und (bei Misserfolg) Richtung. */
  landepunkt: { text: string; richtung: string | null } | null;
  /** Sprengwaffe: Verzögerung in Runden nach dem Kochen (0 = detoniert beim Landen); null ohne Zeitzünder. */
  verzoegerung: number | null;
}

/** Zone der Ansage „Rumpf“: die Zone, die nur angesagt werden kann. */
function rumpfzone(d: Spieldaten): string {
  return d.koerperzonen.eintraege.find((z) => z.nur_ansage)?.id ?? d.regeln.schiessen.schrot_rumpf_start;
}

export function wurfAuswerten(c: Charakter, d: Spieldaten, v: Wurfvorschau, s: Wurfeinstellung, stufe: Ergebnisstufe, w8: number | null): Wurfbericht {
  const r = d.regeln;
  const gg = v.gegenstand;
  const leer: Wurfbericht = { stufe, zone: null, krit: false, beteiligter: false, treffer: null, landepunkt: null, verzoegerung: null };
  if (gg.art === 'sprengwaffe') {
    const richtung = stufe === 'misserfolg' && w8 ? (r.sprengwirkung.richtungen[w8 - 1] ?? null) : null;
    const verzoegerung = gg.spreng.zuender === 'zeit'
      ? Math.max(0, (typeof gg.spreng.verzoegerung === 'number' ? gg.spreng.verzoegerung : 0) - (s.kochen ? 1 : 0)) : null;
    return { ...leer, landepunkt: { text: r.sprengwirkung.landepunkt[stufe], richtung }, verzoegerung };
  }
  const fehl = stufe === 'misserfolg';
  if (fehl && !v.nahkampf) return leer;
  let zone: string;
  if (!fehl && s.ansage === 'rumpf') zone = rumpfzone(d);
  else if (!fehl && s.ansage === 'zone' && s.ansage_zone) zone = s.ansage_zone;
  else zone = zoneAusW8(w8 ?? 1, d);
  const treffer = gg.art === 'wurfwaffe' ? angriffsTreffer(c, gg.waffe, zone, d) : null;
  return { ...leer, zone, krit: !fehl && stufe === 'krit', beteiligter: fehl, treffer };
}

/** Braucht die Auswertung einen W8? Zone ohne Ansage, Fehlwurf in den Nahkampf, Richtung der Granate. */
export function brauchtW8(v: Wurfvorschau, s: Wurfeinstellung, stufe: Ergebnisstufe | null): boolean {
  if (!stufe) return false;
  if (v.gegenstand.art === 'sprengwaffe') return stufe === 'misserfolg';
  if (stufe === 'misserfolg') return v.nahkampf;
  return s.ansage === 'keine';
}

/**
 * Wurf übernehmen („Weiter“): Main bzw. Break −1, geworfener Gegenstand −1 (der Eintrag bleibt mit Anzahl 0 stehen),
 * Auslöser „selbst auf jemanden geschossen“ (Regelfrage R36, vorläufig), Eintrag im Gefechtsprotokoll.
 */
export function wurfUebernehmen(c: Charakter, d: Spieldaten, gg: Wurfgegenstand, als: 'main' | 'break', text: string): Charakter {
  let x = verbrauchen(c, als);
  if (gg.art === 'wurfwaffe') {
    const nahkampfwaffen = x.ausruestung.nahkampfwaffen.map((e) => (e.id === gg.eintrag ? { ...e, anzahl: Math.max(0, (e.anzahl ?? 1) - 1) } : e));
    x = { ...x, ausruestung: { ...x.ausruestung, nahkampfwaffen } };
  } else if (gg.art === 'sprengwaffe') {
    const vorrat = x.ausruestung.vorrat.map((e) => (e.id === gg.eintrag ? { ...e, anzahl: Math.max(0, e.anzahl - 1) } : e));
    x = { ...x, ausruestung: { ...x.ausruestung, vorrat } };
  }
  const g = gefechtVon(x);
  // Regelfrage R36 (docs/offen.md): vorläufig zählt jede Wurfaktion wie ein eigener Schuss als Auslöser.
  const a = d.regeln.schiessen.ausloeser;
  if (g && !g.ausloeser_diese_runde.includes(a)) x = mit(x, { ...g, ausloeser_diese_runde: [...g.ausloeser_diese_runde, a] });
  return protokolliere(x, text);
}
