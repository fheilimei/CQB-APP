// Laden: Kaufen und Verkaufen (konzept.md § 3.14; Regelwerk: Schusswaffen (tragbar), Begriffserklärung und Zustand;
// Stats, Skills und Perks, Skillproben: Beschaffen; Regelfragen R18, R42–R45, R47, R48).
// Alle Funktionen sind rein. Preise, Proben und Grenzen kommen aus den Spieldaten (regeln.json `laden`,
// `waffenzustand.preis_viertel`; Geldwertspannen und Vorratslevel der Ausrüstungsdateien).

import type { Spanne, Spieldaten } from '../daten/typen';
import type { Charakter, Magazin, WaffenEintrag } from '../speicher/charakter';
import { perkWirkungen } from './aktionen';
import { vorratslevel } from './aufstieg';
import { kontostand } from './geld';
import type { StepQuelle } from './probe';
import type { ProbenAnfrage } from './probenrechner';
import { freieId, istWerfer, kaliberVon, munitionAendern, neuerWaffenEintrag, waffeVon } from './waffen';

// ---------- Sortiment

export type Warenart = 'waffe' | 'munition' | 'magazin' | 'nahkampf' | 'spreng' | 'ruestung' | 'schild' | 'aufsatz' | 'zubehoer';

export interface Ware {
  art: Warenart;
  /** Eindeutiger Schlüssel im Laden: `art:id`, bei Munition `munition:kaliber:typ`. */
  schluessel: string;
  /** ID in den Daten (Waffe, Nahkampfwaffe …); Munition: Kaliber; Magazin: Waffe, zu der es gehört. */
  id: string;
  /** Nur Munition: Typ (FMJ, HP …). */
  typ?: string;
  name: string;
  vorratslevel: number;
  /** Je Stück; bei Munition je `regeln.laden.munition_je` Schuss. */
  preis: Spanne;
  /** Verbrauchsware (Munition, Granaten, Geschosse): kein Zustand, Rahmen ist die ganze Spanne (R43). */
  verbrauch: boolean;
  vorlaeufig: boolean;
}

/**
 * Alles, was der Laden führt: jeder Eintrag mit Geldwertspanne und Vorratslevel. Ohne Preis (Faust, Gewehrkolben …)
 * nicht. Waffen und Nahkampfwaffen, die als Aufsatz verkauft werden (M203, Bajonett), stehen nur bei den Aufsätzen.
 */
export function sortiment(d: Spieldaten): Ware[] {
  const liste: Ware[] = [];
  const add = (w: Omit<Ware, 'schluessel'>) => liste.push({ ...w, schluessel: w.typ ? `${w.art}:${w.id}:${w.typ}` : `${w.art}:${w.id}` });
  const alsAufsatzW = new Set(d.aufsaetze.eintraege.map((a) => a.waffe).filter(Boolean));
  const alsAufsatzN = new Set(d.aufsaetze.eintraege.map((a) => a.nahkampfwaffe).filter(Boolean));

  for (const w of d.waffen.eintraege) {
    if (alsAufsatzW.has(w.id)) continue;
    add({ art: 'waffe', id: w.id, name: w.name, vorratslevel: w.vorratslevel, preis: w.preis, verbrauch: false, vorlaeufig: !!w.vorlaeufig });
  }
  for (const m of d.munition.eintraege)
    for (const [typ, t] of Object.entries(m.typen))
      if (t.preis_10 && t.vorratslevel)
        add({ art: 'munition', id: m.id, typ, name: `${m.name} ${typ}`, vorratslevel: t.vorratslevel, preis: t.preis_10, verbrauch: true, vorlaeufig: !!(t.vorlaeufig || m.vorlaeufig) });
  for (const w of d.waffen.eintraege)
    if (w.ersatzmagazin)
      add({ art: 'magazin', id: w.id, name: `Magazin ${w.name}`, vorratslevel: w.vorratslevel, preis: w.ersatzmagazin.preis, verbrauch: false, vorlaeufig: !!w.ersatzmagazin.vorlaeufig });
  for (const n of d.nahkampfwaffen.eintraege) {
    if (alsAufsatzN.has(n.id) || !n.preis || !n.vorratslevel) continue;
    add({ art: 'nahkampf', id: n.id, name: n.name, vorratslevel: n.vorratslevel, preis: n.preis, verbrauch: false, vorlaeufig: !!n.vorlaeufig });
  }
  for (const s of d.wurf_und_sprengwaffen.eintraege)
    if (s.preis && s.vorratslevel)
      add({ art: 'spreng', id: s.id, name: s.name, vorratslevel: s.vorratslevel, preis: s.preis, verbrauch: true, vorlaeufig: !!s.vorlaeufig });
  for (const r of d.schutz.ruestung)
    add({ art: 'ruestung', id: r.id, name: r.name, vorratslevel: r.vorratslevel, preis: r.preis, verbrauch: false, vorlaeufig: !!r.vorlaeufig });
  for (const s of d.schutz.schilde)
    add({ art: 'schild', id: s.id, name: s.name, vorratslevel: s.vorratslevel, preis: s.preis, verbrauch: false, vorlaeufig: false });
  for (const a of d.aufsaetze.eintraege) {
    const h = aufsatzHandel(a.id, d);
    if (h) add({ art: 'aufsatz', id: a.id, name: a.name, vorratslevel: h.vorratslevel, preis: h.preis, verbrauch: false, vorlaeufig: !!a.vorlaeufig });
  }
  for (const z of d.aufsaetze.zubehoer)
    add({ art: 'zubehoer', id: z.id, name: z.name, vorratslevel: z.vorratslevel, preis: z.preis, verbrauch: false, vorlaeufig: !!z.vorlaeufig });
  return liste;
}

export function wareVon(schluessel: string, d: Spieldaten): Ware | null {
  return sortiment(d).find((w) => w.schluessel === schluessel) ?? null;
}

/** Spanne und Vorratslevel eines Aufsatzes; fehlen sie, die der Waffe bzw. Nahkampfwaffe, die er ist. */
function aufsatzHandel(id: string, d: Spieldaten): { vorratslevel: number; preis: Spanne } | null {
  const a = d.aufsaetze.eintraege.find((x) => x.id === id);
  if (!a) return null;
  if (a.preis && a.vorratslevel) return { vorratslevel: a.vorratslevel, preis: a.preis };
  const quelle = a.waffe ? d.waffen.eintraege.find((w) => w.id === a.waffe) : a.nahkampfwaffe ? d.nahkampfwaffen.eintraege.find((n) => n.id === a.nahkampfwaffe) : null;
  return quelle?.preis && quelle.vorratslevel ? { vorratslevel: quelle.vorratslevel, preis: quelle.preis } : null;
}

// ---------- Preis (Schusswaffen (tragbar), Zustand: Preis, Verhandeln)

/** Ein Stück Ware, das einen Preis hat: Spanne, Zustand (null = Verbrauchsware) und wie oft es zählt. */
export interface Preisteil {
  name: string;
  spanne: Spanne;
  zustand: string | null;
  /** Wie oft der Stückpreis zählt (Stück; Munition: Schuss / munition_je). */
  einheiten: number;
}

/** Ergebnis der Verhandlung aus Sicht des Spielers; `keine` = nicht verhandelt (zählt wie unentschieden, R44). */
export interface Verhandlung {
  ergebnis: 'keine' | 'gewonnen' | 'verloren' | 'unentschieden';
  krit: boolean;
}
export const NICHT_VERHANDELT: Verhandlung = { ergebnis: 'keine', krit: false };

/** Abschnitt der Spanne, den der Zustand vorgibt (ungerundet); ohne Zustand die ganze Spanne (R43). */
function abschnitt(s: Spanne, zustand: string | null, d: Spieldaten): Spanne {
  if (zustand === null) return { ...s };
  const viertel = d.regeln.waffenzustand.preis_viertel;
  const teile = Math.max(...Object.values(viertel));
  const q = viertel[zustand] ?? teile;
  const breite = (s.max - s.min) / teile;
  return { min: s.min + (q - 1) * breite, max: s.min + q * breite };
}

/** Regelfrage R47 (docs/offen.md): vorläufig wird jeder Stückpreis kaufmännisch auf ganze Dollar gerundet. */
function rund(x: number): number {
  return Math.round(x);
}

/** Preisrahmen eines Stücks: der Abschnitt des Zustands, gerundet. */
export function preisrahmen(s: Spanne, zustand: string | null, d: Spieldaten): Spanne {
  const a = abschnitt(s, zustand, d);
  return { min: rund(a.min), max: rund(a.max) };
}

/**
 * Stückpreis nach der Verhandlung. Gewinnt der Käufer: Untergrenze des Abschnitts; der Händler: Obergrenze;
 * unentschieden oder nicht verhandelt: Mitte. Krit des Siegers: ein Viertel der Spanne weiter, höchstens bis zur
 * Grenze der Spanne. Beim Verkauf sind die Rollen vertauscht.
 */
export function stueckpreis(s: Spanne, zustand: string | null, v: Verhandlung, rolle: 'kauf' | 'verkauf', d: Spieldaten): number {
  const a = abschnitt(s, zustand, d);
  if (v.ergebnis === 'keine' || v.ergebnis === 'unentschieden') return rund((a.min + a.max) / 2);
  // Richtung, in die der Sieger den Preis zieht: nach unten, wenn der Käufer gewinnt.
  const kaeuferGewinnt = (v.ergebnis === 'gewonnen') === (rolle === 'kauf');
  const viertel = (s.max - s.min) / Math.max(...Object.values(d.regeln.waffenzustand.preis_viertel));
  const p = kaeuferGewinnt ? Math.max(s.min, a.min - (v.krit ? viertel : 0)) : Math.min(s.max, a.max + (v.krit ? viertel : 0));
  return rund(p);
}

export function teilRahmen(t: Preisteil, d: Spieldaten): Spanne {
  const r = preisrahmen(t.spanne, t.zustand, d);
  return { min: r.min * t.einheiten, max: r.max * t.einheiten };
}

export function teilPreis(t: Preisteil, v: Verhandlung, rolle: 'kauf' | 'verkauf', d: Spieldaten): number {
  return stueckpreis(t.spanne, t.zustand, v, rolle, d) * t.einheiten;
}

function summe(r: Spanne[]): Spanne {
  return r.reduce((a, b) => ({ min: a.min + b.min, max: a.max + b.max }), { min: 0, max: 0 });
}

// ---------- Vorratslevel und Beschaffen (Stats, Skills und Perks, Skillproben: Beschaffen; Perk Kontakte)

export interface Zugang {
  art: 'frei' | 'beschaffen' | 'nicht';
  /** Stufen über dem Vorratslevel der Klasse (0 = frei). */
  stufen: number;
}

/** Ob der Charakter einen Perk hat, der beim Kauf das Vorratslevel senkt (Kontakte). */
export function kontakteStufen(c: Charakter, d: Spieldaten): number {
  return perkWirkungen(c, d, 'vorratslevel_weniger').reduce((s, w) => s + w.stufen, 0);
}

/**
 * Zugang zu einer Ware: bis zum Vorratslevel der Klasse frei, darüber bis `stufen_max` Stufen nur über Beschaffen,
 * noch höher gar nicht. `kontakte`: Perk Kontakte eingesetzt (Vorratslevel der Ware niedriger). Ohne Vorratslevel
 * (keine Klasse und keins von Hand) ist alles frei.
 */
export function zugang(c: Charakter, w: Ware, kontakte: boolean, d: Spieldaten): Zugang {
  const vl = vorratslevel(c, d);
  if (vl === null) return { art: 'frei', stufen: 0 };
  const stufen = Math.max(0, w.vorratslevel - (kontakte ? kontakteStufen(c, d) : 0) - vl);
  if (stufen === 0) return { art: 'frei', stufen };
  return { art: stufen <= d.regeln.laden.beschaffen.stufen_max ? 'beschaffen' : 'nicht', stufen };
}

/** Probe Beschaffen: Empathy mit Beschaffen, 2 Malsteps je Stufe über dem Vorratslevel. */
export function beschaffenAnfrage(stufen: number, d: Spieldaten): ProbenAnfrage {
  const b = d.regeln.laden.beschaffen;
  const fest: StepQuelle[] = stufen > 0
    ? [{ id: 'vorratslevel', herkunft: 'laden', name: `${stufen} ${stufen === 1 ? 'Stufe' : 'Stufen'} über dem Vorratslevel`, malsteps: stufen * b.malsteps_je_stufe }]
    : [];
  return { stat: b.stat, skill: b.skill, probe: 'beschaffen', fest };
}

/** Probe Verhandeln (Contested Roll gegen den Händler): Empathy mit Verhandeln. */
export function verhandelnAnfrage(d: Spieldaten): ProbenAnfrage {
  const v = d.regeln.laden.verhandeln;
  return { stat: v.stat, skill: v.skill, probe: 'verhandeln' };
}

// ---------- Kaufen

export interface KaufPosten {
  /** Schlüssel der Ware (sortiment). */
  ware: string;
  /** Zustand A–D; null bei Verbrauchsware. */
  zustand: string | null;
  /** Stück; Munition in Schuss (Vielfache von munition_je). */
  menge: number;
  /** Magazin, Schnelllader, Ladestreifen: Waffe in der Ausrüstung (ID); fehlt = erste passende Waffe. */
  ziel?: string;
  /** Über Beschaffen besorgt: Preis der SL für den ganzen Posten; verhandelt nicht mit (R44). */
  preis_sl?: number;
}

function einheiten(w: Ware, menge: number, d: Spieldaten): number {
  return w.art === 'munition' ? menge / d.regeln.laden.munition_je : menge;
}

export function kaufTeil(p: KaufPosten, d: Spieldaten): Preisteil | null {
  const w = wareVon(p.ware, d);
  if (!w) return null;
  return { name: w.name, spanne: w.preis, zustand: w.verbrauch ? null : p.zustand, einheiten: einheiten(w, p.menge, d) };
}

/** Rahmen eines Postens; beschaffte Ware hat den festen Preis der SL. */
export function postenRahmen(p: KaufPosten, d: Spieldaten): Spanne {
  if (p.preis_sl !== undefined) return { min: p.preis_sl, max: p.preis_sl };
  const t = kaufTeil(p, d);
  return t ? teilRahmen(t, d) : { min: 0, max: 0 };
}

export function postenPreis(p: KaufPosten, v: Verhandlung, d: Spieldaten): number {
  if (p.preis_sl !== undefined) return p.preis_sl;
  const t = kaufTeil(p, d);
  return t ? teilPreis(t, v, 'kauf', d) : 0;
}

export function korbRahmen(korb: KaufPosten[], d: Spieldaten): Spanne {
  return summe(korb.map((p) => postenRahmen(p, d)));
}

/** Errechneter Preis des ganzen Korbs nach einer Verhandlung (Vorschlag für den Preis der SL). */
export function korbPreis(korb: KaufPosten[], v: Verhandlung, d: Spieldaten): number {
  return korb.reduce((s, p) => s + postenPreis(p, v, d), 0);
}

/** Waffen, zu denen ein Magazin bzw. Zubehör aus dem Laden passt (Ziel eines Postens). */
export function zielWaffen(c: Charakter, w: Ware, d: Spieldaten): WaffenEintrag[] {
  if (w.art === 'magazin') return c.ausruestung.waffen.filter((e) => e.waffe === w.id);
  if (w.art === 'zubehoer') return c.ausruestung.waffen.filter((e) => waffeVon(e, d).zubehoer?.includes(w.id));
  return [];
}

/** Was gegen den Kauf spricht (leer = kaufbar): Geld reicht nicht, Magazin ohne Waffe, zweiter Schild. */
export function kaufPruefen(c: Charakter, korb: KaufPosten[], preis: number, d: Spieldaten): string[] {
  const fehler: string[] = [];
  const fehlt = preis - kontostand(c);
  if (fehlt > 0) fehler.push(`Es fehlen ${fehlt} $.`);
  const kaeufe = korb.map((p) => wareVon(p.ware, d));
  const schilde = kaeufe.filter((w) => w?.art === 'schild').length;
  if (schilde > 1 || (schilde === 1 && c.ausruestung.schild)) fehler.push('Du kannst nur einen Schild tragen.');
  for (const [i, p] of korb.entries()) {
    const w = kaeufe[i];
    if (!w) { fehler.push(`Unbekannte Ware „${p.ware}“.`); continue; }
    if (w.art !== 'magazin' && w.art !== 'zubehoer') continue;
    // Eine Waffe aus demselben Korb zählt mit.
    const imKorb = kaeufe.some((k) => k?.art === 'waffe' && (w.art === 'magazin' ? k.id === w.id : d.waffen.eintraege.find((x) => x.id === k.id)?.zubehoer?.includes(w.id)));
    const ziele = zielWaffen(c, w, d);
    if (p.ziel ? !ziele.some((e) => e.id === p.ziel) : !ziele.length && !imKorb) fehler.push(`${w.name}: Dazu fehlt die passende Waffe.`);
  }
  return fehler;
}

/** Text eines Postens für Bericht und Kassenbuch („AK-47 (gebraucht)“, „30 Schuss 7.62x39 HP“, „2 × M67“). */
export function postenText(p: KaufPosten, d: Spieldaten): string {
  const w = wareVon(p.ware, d);
  if (!w) return p.ware;
  const zustand = !w.verbrauch && p.zustand ? ` (${d.regeln.waffenzustand.namen[p.zustand] ?? p.zustand})` : '';
  if (w.art === 'munition') return `${p.menge} Schuss ${w.name}`;
  return `${p.menge > 1 ? `${p.menge} × ` : ''}${w.name}${zustand}`;
}

/**
 * Bucht den Kauf (eine Buchung „Kauf“ mit allen Posten im Grund) und legt die Ware in die Ausrüstung:
 * Waffe mit Zustand, leerem Magazin, Trageort aus regeln.json; Munition lose; Magazin und Zubehör leer an die
 * Zielwaffe; Aufsatz lose; Granaten und Geschosse in den Vorrat; Rüstung, Schild, Nahkampfwaffe mit Zustand.
 */
export function kaufAnwenden(c: Charakter, korb: KaufPosten[], preis: number, d: Spieldaten, jetzt: Date = new Date()): Charakter {
  const ort = d.regeln.laden.trageort;
  const neu = d.regeln.waffenzustand.neu;
  let x: Charakter = { ...c, ausruestung: { ...c.ausruestung } };
  const reihe = [...korb].sort((a, b) => Number(wareVon(b.ware, d)?.art === 'waffe') - Number(wareVon(a.ware, d)?.art === 'waffe'));
  for (const p of reihe) {
    const w = wareVon(p.ware, d);
    if (!w) continue;
    const zustand = p.zustand ?? neu;
    const a = x.ausruestung;
    switch (w.art) {
      case 'waffe':
        for (let i = 0; i < p.menge; i++) {
          const e = neuerWaffenEintrag(w.id, d, freieId(x, 'wf'), ort, false);
          const mitZ: WaffenEintrag = { ...e, zustand, ...(e.magazin_zustand ? { magazin_zustand: zustand } : {}) };
          x = { ...x, ausruestung: { ...x.ausruestung, waffen: [...x.ausruestung.waffen, mitZ] } };
        }
        break;
      case 'munition':
        x = munitionAendern(x, w.id, w.typ!, p.menge);
        break;
      case 'magazin':
      case 'zubehoer': {
        const ziel = (p.ziel && a.waffen.find((e) => e.id === p.ziel)) || zielWaffen(x, w, d)[0];
        if (!ziel) break;
        const leer: Magazin = { inhalt: 0, typ: '', zustand };
        const stuecke = Array.from({ length: p.menge }, () => ({ ...leer }));
        const e: WaffenEintrag = w.art === 'magazin'
          ? { ...ziel, magazine: [...ziel.magazine, ...stuecke] }
          : { ...ziel, zubehoer: [...ziel.zubehoer, ...stuecke.map((m) => ({ ...m, art: w.id }))] };
        x = { ...x, ausruestung: { ...a, waffen: a.waffen.map((y) => (y.id === e.id ? e : y)) } };
        break;
      }
      case 'aufsatz':
        x = { ...x, ausruestung: { ...a, aufsaetze: [...a.aufsaetze, ...Array.from({ length: p.menge }, () => ({ id: w.id, zustand }))] } };
        break;
      case 'nahkampf':
        x = { ...x, ausruestung: { ...a, nahkampfwaffen: [...a.nahkampfwaffen, { id: freieId(x, 'nk'), waffe: w.id, trageort: ort, anzahl: p.menge, zustand }] } };
        break;
      case 'spreng': {
        const da = a.vorrat.some((v) => v.id === w.id);
        const vorrat = da ? a.vorrat.map((v) => (v.id === w.id ? { ...v, anzahl: v.anzahl + p.menge } : v)) : [...a.vorrat, { id: w.id, anzahl: p.menge, trageort: ort }];
        x = { ...x, ausruestung: { ...a, vorrat } };
        break;
      }
      case 'ruestung':
        x = { ...x, ausruestung: { ...a, ruestung: [...a.ruestung, ...Array.from({ length: p.menge }, () => ({ id: w.id, zustand }))] } };
        break;
      case 'schild':
        x = { ...x, ausruestung: { ...a, schild: { id: w.id, zustand } } };
        break;
    }
  }
  const grund = korb.map((p) => postenText(p, d)).join(', ');
  return {
    ...x,
    geaendert: jetzt.toISOString(),
    kassenbuch: [...x.kassenbuch, { zeit: jetzt.toISOString(), betrag: -preis, art: 'kauf', grund }]
  };
}

// ---------- Verkaufen

/** Ein Gegenstand aus der eigenen Ausrüstung im Verkaufskorb. */
export type VerkaufPosten =
  | { art: 'waffe'; id: string }
  | { art: 'magazin'; waffe: string; index: number }
  | { art: 'zubehoer'; waffe: string; index: number }
  | { art: 'aufsatz'; index: number }
  | { art: 'munition'; kaliber: string; typ: string; menge: number }
  | { art: 'nahkampf'; id: string; menge: number }
  | { art: 'spreng'; id: string; menge: number }
  | { art: 'ruestung'; index: number }
  | { art: 'schild' };

function zustandName(z: string, d: Spieldaten): string {
  return d.regeln.waffenzustand.namen[z] ?? z;
}

function magazinTeil(e: WaffenEintrag, zustand: string, d: Spieldaten): Preisteil | null {
  const w = waffeVon(e, d);
  return w.ersatzmagazin ? { name: `Magazin ${w.name}`, spanne: w.ersatzmagazin.preis, zustand, einheiten: 1 } : null;
}

function zubehoerTeil(art: string, zustand: string, d: Spieldaten): Preisteil | null {
  const z = d.aufsaetze.zubehoer.find((x) => x.id === art);
  return z ? { name: z.name, spanne: z.preis, zustand, einheiten: 1 } : null;
}

function aufsatzTeil(id: string, zustand: string, d: Spieldaten): Preisteil | null {
  const h = aufsatzHandel(id, d);
  const a = d.aufsaetze.eintraege.find((x) => x.id === id);
  return h && a ? { name: a.name, spanne: h.preis, zustand, einheiten: 1 } : null;
}

/**
 * Was ein Verkaufsposten wert ist, Stück für Stück. Eine Waffe zählt ihre angebrachten Aufsätze (R45), ihre
 * Ersatzmagazine, das eingesetzte Magazin und ihr Zubehör mit (R48), jedes nach seinem Zustand.
 */
export function verkaufTeile(c: Charakter, p: VerkaufPosten, d: Spieldaten): Preisteil[] {
  const a = c.ausruestung;
  const teile: (Preisteil | null)[] = [];
  switch (p.art) {
    case 'waffe': {
      const e = a.waffen.find((x) => x.id === p.id);
      if (!e) return [];
      const w = waffeVon(e, d);
      teile.push({ name: w.name, spanne: w.preis, zustand: e.zustand, einheiten: 1 });
      for (const t of e.aufsaetze) teile.push(aufsatzTeil(t.id, t.zustand, d));
      if (e.magazin_zustand) teile.push(magazinTeil(e, e.magazin_zustand, d));
      for (const m of e.magazine) teile.push(magazinTeil(e, m.zustand, d));
      for (const z of e.zubehoer) teile.push(zubehoerTeil(z.art, z.zustand, d));
      break;
    }
    case 'magazin': {
      const e = a.waffen.find((x) => x.id === p.waffe);
      const m = e?.magazine[p.index];
      if (e && m) teile.push(magazinTeil(e, m.zustand, d));
      break;
    }
    case 'zubehoer': {
      const z = a.waffen.find((x) => x.id === p.waffe)?.zubehoer[p.index];
      if (z) teile.push(zubehoerTeil(z.art, z.zustand, d));
      break;
    }
    case 'aufsatz': {
      const t = a.aufsaetze[p.index];
      if (t) teile.push(aufsatzTeil(t.id, t.zustand, d));
      break;
    }
    case 'munition': {
      const m = d.munition.eintraege.find((x) => x.id === p.kaliber);
      const t = m?.typen[p.typ];
      if (m && t?.preis_10) teile.push({ name: `${m.name} ${p.typ}`, spanne: t.preis_10, zustand: null, einheiten: p.menge / d.regeln.laden.munition_je });
      break;
    }
    case 'nahkampf': {
      const n = a.nahkampfwaffen.find((x) => x.id === p.id);
      const w = n && d.nahkampfwaffen.eintraege.find((x) => x.id === n.waffe);
      if (n && w?.preis) teile.push({ name: w.name, spanne: w.preis, zustand: n.zustand, einheiten: p.menge });
      break;
    }
    case 'spreng': {
      const s = d.wurf_und_sprengwaffen.eintraege.find((x) => x.id === p.id);
      if (s?.preis) teile.push({ name: s.name, spanne: s.preis, zustand: null, einheiten: p.menge });
      break;
    }
    case 'ruestung': {
      const t = a.ruestung[p.index];
      const r = t && d.schutz.ruestung.find((x) => x.id === t.id);
      if (t && r) teile.push({ name: r.name, spanne: r.preis, zustand: t.zustand, einheiten: 1 });
      break;
    }
    case 'schild': {
      const s = a.schild && d.schutz.schilde.find((x) => x.id === a.schild!.id);
      if (s) teile.push({ name: s.name, spanne: s.preis, zustand: a.schild!.zustand, einheiten: 1 });
      break;
    }
  }
  return teile.filter((t): t is Preisteil => !!t);
}

export function verkaufRahmen(c: Charakter, korb: VerkaufPosten[], d: Spieldaten): Spanne {
  return summe(korb.flatMap((p) => verkaufTeile(c, p, d).map((t) => teilRahmen(t, d))));
}

export function verkaufPreis(c: Charakter, korb: VerkaufPosten[], v: Verhandlung, d: Spieldaten): number {
  return korb.reduce((s, p) => s + verkaufTeile(c, p, d).reduce((t, x) => t + teilPreis(x, v, 'verkauf', d), 0), 0);
}

/** Text eines Verkaufspostens für Bericht und Kassenbuch. */
export function verkaufText(c: Charakter, p: VerkaufPosten, d: Spieldaten): string {
  const teile = verkaufTeile(c, p, d);
  const erstes = teile[0];
  if (!erstes) return '';
  if (p.art === 'munition') return `${p.menge} Schuss ${erstes.name}`;
  const menge = (p.art === 'nahkampf' || p.art === 'spreng') && p.menge > 1 ? `${p.menge} × ` : '';
  const z = erstes.zustand ? ` (${zustandName(erstes.zustand, d)})` : '';
  const mit = teile.length > 1 ? ` mit ${teile.slice(1).map((t) => t.name).join(', ')}` : '';
  return `${menge}${erstes.name}${z}${mit}`;
}

/**
 * Bucht den Verkauf (eine Buchung „Verkauf“) und nimmt die Gegenstände aus der Ausrüstung. Patronen in einer
 * verkauften Waffe, ihren Magazinen und ihrem Zubehör kommen zur losen Munition, ein geladenes Geschoss in den Vorrat.
 */
export function verkaufAnwenden(c: Charakter, korb: VerkaufPosten[], preis: number, d: Spieldaten, jetzt: Date = new Date()): Charakter {
  const grund = korb.map((p) => verkaufText(c, p, d)).filter(Boolean).join(', ');
  const a = c.ausruestung;
  const weg = <T>(liste: T[], indizes: number[]) => liste.filter((_, i) => !indizes.includes(i));
  const waffenWeg = new Set(korb.flatMap((p) => (p.art === 'waffe' ? [p.id] : [])));
  const aufsaetzeWeg = korb.flatMap((p) => (p.art === 'aufsatz' ? [p.index] : []));
  const ruestungWeg = korb.flatMap((p) => (p.art === 'ruestung' ? [p.index] : []));
  let x: Charakter = { ...c };

  // Munition aus verkauften Waffen zurück in die lose Munition bzw. den Vorrat
  for (const e of a.waffen.filter((w) => waffenWeg.has(w.id))) {
    const w = waffeVon(e, d);
    const k = kaliberVon(w);
    if (istWerfer(w)) {
      if (e.munitionstyp && e.im_magazin > 0) x = vorratAendern(x, e.munitionstyp, e.im_magazin, d);
    } else if (k) {
      x = munitionAendern(x, k, e.munitionstyp, e.im_magazin);
      for (const m of [...e.magazine, ...e.zubehoer]) x = munitionAendern(x, k, m.typ, m.inhalt);
    }
  }
  // Einzelne Magazine und Zubehör: Patronen darin zurück, Stück entfernen
  const waffen = x.ausruestung.waffen.filter((w) => !waffenWeg.has(w.id)).map((e) => {
    const mags = korb.flatMap((p) => (p.art === 'magazin' && p.waffe === e.id ? [p.index] : []));
    const zub = korb.flatMap((p) => (p.art === 'zubehoer' && p.waffe === e.id ? [p.index] : []));
    if (!mags.length && !zub.length) return e;
    const k = kaliberVon(waffeVon(e, d));
    if (k) for (const m of [...e.magazine.filter((_, i) => mags.includes(i)), ...e.zubehoer.filter((_, i) => zub.includes(i))]) x = munitionAendern(x, k, m.typ, m.inhalt);
    return { ...e, magazine: weg(e.magazine, mags), zubehoer: weg(e.zubehoer, zub) };
  });
  let munition = x.ausruestung.munition;
  let nahkampfwaffen = x.ausruestung.nahkampfwaffen;
  let vorrat = x.ausruestung.vorrat;
  for (const p of korb) {
    if (p.art === 'munition')
      munition = munition.map((m) => (m.kaliber === p.kaliber && m.typ === p.typ ? { ...m, anzahl: m.anzahl - p.menge } : m)).filter((m) => m.anzahl > 0);
    if (p.art === 'nahkampf')
      nahkampfwaffen = nahkampfwaffen.map((n) => (n.id === p.id ? { ...n, anzahl: (n.anzahl ?? 1) - p.menge } : n)).filter((n) => (n.anzahl ?? 1) > 0);
    if (p.art === 'spreng')
      vorrat = vorrat.map((v) => (v.id === p.id ? { ...v, anzahl: v.anzahl - p.menge } : v)).filter((v) => v.anzahl > 0);
  }
  return {
    ...x,
    geaendert: jetzt.toISOString(),
    ausruestung: {
      ...x.ausruestung,
      waffen,
      aktive_waffe: x.ausruestung.aktive_waffe && waffenWeg.has(x.ausruestung.aktive_waffe) ? null : x.ausruestung.aktive_waffe,
      aufsaetze: weg(x.ausruestung.aufsaetze, aufsaetzeWeg),
      ruestung: weg(x.ausruestung.ruestung, ruestungWeg),
      schild: korb.some((p) => p.art === 'schild') ? null : x.ausruestung.schild,
      munition,
      nahkampfwaffen,
      vorrat
    },
    kassenbuch: [...x.kassenbuch, { zeit: jetzt.toISOString(), betrag: preis, art: 'verkauf', grund }]
  };
}

function vorratAendern(c: Charakter, id: string, delta: number, d: Spieldaten): Charakter {
  const v = c.ausruestung.vorrat;
  const vorrat = v.some((x) => x.id === id) ? v.map((x) => (x.id === id ? { ...x, anzahl: x.anzahl + delta } : x)) : [...v, { id, anzahl: delta, trageort: d.regeln.laden.trageort }];
  return { ...c, ausruestung: { ...c.ausruestung, vorrat } };
}
