// Waffen in der Ausrüstung (konzept.md § 3.8; Regelwerk: Kampfsystem, Nachladen, Waffe wechseln, Ladehemmung;
// Schusswaffen (tragbar)): Magazingröße mit Aufsätzen, passende Aufsätze, Munition, Nachladen, Waffe wechseln,
// Ladehemmung beheben. Alle Funktionen sind rein; sie geben neue Einträge bzw. einen neuen Charakter zurück.

import type { Aufsatz, Munitionstyp, Spieldaten, Sprengwaffe, Waffe, Wechselkosten } from '../daten/typen';
import type { Charakter, Magazin, WaffenEintrag, ZubehoerEintrag } from '../speicher/charakter';
import { perkMitWirkung, perkWirkungen } from './aktionen';
import type { Ergebnisstufe, StepQuelle } from './probe';
import type { ProbenAnfrage } from './probenrechner';

export function waffeVon(e: WaffenEintrag, d: Spieldaten): Waffe {
  const w = d.waffen.eintraege.find((x) => x.id === e.waffe);
  if (!w) throw new Error(`Unbekannte Waffe „${e.waffe}“`);
  return w;
}

export function aktiverEintrag(c: Charakter): WaffenEintrag | null {
  return c.ausruestung.waffen.find((w) => w.id === c.ausruestung.aktive_waffe) ?? null;
}

/** Werfer verschießen Geschosse aus dem Vorrat statt Patronen (munition ist eine Liste von Geschoss-IDs). */
export function istWerfer(w: Waffe): boolean {
  return Array.isArray(w.munition);
}

export function aufsaetzeVon(e: WaffenEintrag, d: Spieldaten): Aufsatz[] {
  return e.aufsaetze.map((t) => d.aufsaetze.eintraege.find((a) => a.id === t.id)).filter((a): a is Aufsatz => !!a);
}

/** Kaliber (ID aus munition.json) der Waffe; null bei Werfern. */
export function kaliberVon(w: Waffe): string | null {
  return Array.isArray(w.munition) ? null : w.munition;
}

/** Magazingröße ohne Patrone im Lauf; ein erweitertes Magazin oder eine Trommel ersetzt sie. */
export function magazinGroesse(e: WaffenEintrag, d: Spieldaten): number {
  const w = waffeVon(e, d);
  const aus = aufsaetzeVon(e, d).find((a) => a.werte?.magazin);
  return aus?.werte?.magazin ?? w.magazin;
}

/** Höchster Inhalt der Waffe: Magazin + Patrone im Lauf („20+1“). */
export function kapazitaet(e: WaffenEintrag, d: Spieldaten): number {
  return magazinGroesse(e, d) + (waffeVon(e, d).patrone_im_lauf ? 1 : 0);
}

export function trommelmagazin(e: WaffenEintrag, d: Spieldaten): boolean {
  return aufsaetzeVon(e, d).some((a) => a.werte?.trommelmagazin);
}

/** Aufsätze, die an die Waffe passen: Anschluss vorhanden; nennt der Aufsatz Waffen, muss diese dabei sein. */
export function passendeAufsaetze(w: Waffe, d: Spieldaten): Aufsatz[] {
  return d.aufsaetze.eintraege.filter((a) =>
    a.passt_an.anschluss.some((x) => w.anschluesse.includes(x)) && (!a.passt_an.waffen.length || a.passt_an.waffen.includes(w.id)));
}

/** Waffenskill der Waffe: der Skill, dessen waffenkategorien die Kategorie der Waffe enthält. */
export function waffenskill(w: Waffe, d: Spieldaten): string | null {
  return d.skills.eintraege.find((s) => s.waffenkategorien?.includes(w.kategorie))?.id ?? null;
}

/** Wählbare Munition: Typen des Kalibers (fehlt munitionstypen: alle) bzw. bei Werfern die Geschosse. */
export function munitionstypen(w: Waffe, d: Spieldaten): string[] {
  if (Array.isArray(w.munition)) return [...w.munition];
  const kaliber = d.munition.eintraege.find((m) => m.id === w.munition);
  const alle = Object.keys(kaliber?.typen ?? {});
  return w.munitionstypen ? alle.filter((t) => w.munitionstypen!.includes(t)) : alle;
}

/** DK/MW des geladenen Munitionstyps (Schusswaffe) oder null. */
export function munitionswerte(e: WaffenEintrag, d: Spieldaten): Munitionstyp | null {
  const w = waffeVon(e, d);
  if (Array.isArray(w.munition)) return null;
  return d.munition.eintraege.find((m) => m.id === w.munition)?.typen[e.munitionstyp] ?? null;
}

export function sprengwaffe(id: string, d: Spieldaten): Sprengwaffe | null {
  return d.wurf_und_sprengwaffen.eintraege.find((s) => s.id === id) ?? null;
}

export function kaliberName(w: Waffe, d: Spieldaten): string {
  if (Array.isArray(w.munition)) return w.munition.map((id) => sprengwaffe(id, d)?.name ?? id).join(', ');
  return d.munition.eintraege.find((m) => m.id === w.munition)?.name ?? w.munition;
}

/**
 * Neue Waffe für die Ausrüstung, Zustand neuwertig, ohne Ersatzmagazine. `geladen`: voll mit dem ersten Munitionstyp
 * (Schreibmodus); sonst leer (Kauf im Laden). Werfer sind immer leer.
 */
export function neuerWaffenEintrag(waffeId: string, d: Spieldaten, id: string, trageort: string, geladen = true): WaffenEintrag {
  const w = d.waffen.eintraege.find((x) => x.id === waffeId);
  if (!w) throw new Error(`Unbekannte Waffe „${waffeId}“`);
  const typen = munitionstypen(w, d);
  const voll = geladen && !istWerfer(w);
  return {
    id,
    waffe: w.id,
    munitionstyp: voll ? (typen[0] ?? '') : '',
    im_magazin: voll ? w.magazin + (w.patrone_im_lauf ? 1 : 0) : 0,
    ...(w.ladeart === 'wechselmagazin' ? { magazin_zustand: d.regeln.waffenzustand.neu } : {}),
    magazine: [],
    zubehoer: [],
    zustand: d.regeln.waffenzustand.neu,
    aufsaetze: [],
    ladehemmung: null,
    trageort
  };
}

// ---------- Lose Munition (nach Kaliber und Typ beim Charakter)

export function loseMunition(c: Charakter, kaliber: string, typ: string): number {
  return c.ausruestung.munition.find((m) => m.kaliber === kaliber && m.typ === typ)?.anzahl ?? 0;
}

/** Lose Munition um `delta` ändern; Einträge mit 0 verschwinden. */
export function munitionAendern(c: Charakter, kaliber: string, typ: string, delta: number): Charakter {
  if (!delta || !typ) return c;
  const da = c.ausruestung.munition.some((m) => m.kaliber === kaliber && m.typ === typ);
  const liste = da
    ? c.ausruestung.munition.map((m) => (m.kaliber === kaliber && m.typ === typ ? { ...m, anzahl: m.anzahl + delta } : m))
    : [...c.ausruestung.munition, { kaliber, typ, anzahl: delta }];
  return { ...c, geaendert: new Date().toISOString(), ausruestung: { ...c.ausruestung, munition: liste.filter((m) => m.anzahl > 0) } };
}

/** Wählbare Munitionstypen der Waffe mit der losen Munition, die davon da ist. */
export function loseTypen(c: Charakter, w: Waffe, d: Spieldaten): { typ: string; anzahl: number }[] {
  const k = kaliberVon(w);
  if (!k) return [];
  return munitionstypen(w, d).map((typ) => ({ typ, anzahl: loseMunition(c, k, typ) }));
}

/** Freie ID mit Präfix (wf, nk …), die im Charakter noch nicht vorkommt. */
export function freieId(c: Charakter, praefix: string): string {
  const belegt = new Set([...c.ausruestung.waffen, ...c.ausruestung.nahkampfwaffen].map((x) => x.id));
  let n = 1;
  while (belegt.has(`${praefix}${n}`)) n++;
  return `${praefix}${n}`;
}

export function eintragErsetzen(c: Charakter, e: WaffenEintrag): Charakter {
  return { ...c, geaendert: new Date().toISOString(), ausruestung: { ...c.ausruestung, waffen: c.ausruestung.waffen.map((x) => (x.id === e.id ? e : x)) } };
}

/** Waffe ersetzen und lose Munition ändern (z. B. Patronen aus der losen Munition in die Waffe). */
function mitMunition(c: Charakter, e: WaffenEintrag, w: Waffe, typ: string, delta: number): Charakter {
  const k = kaliberVon(w);
  const neu = eintragErsetzen(c, e);
  return k ? munitionAendern(neu, k, typ, delta) : neu;
}

// ---------- Nachladen (Kampfsystem, Nachladen)

export type Nachladeart =
  | { art: 'magazin'; /** Index in `magazine` der Vorwahl: das vollste vom bisherigen Typ, sonst das vollste. */ vorwahl: number }
  | { art: 'zubehoer'; zubehoer: string; typ: string; gefuellt: number }
  | { art: 'einzeln'; patronen: number; /** Wählbare Typen mit loser Munition; ist die Waffe nicht leer, nur ihr Typ. */ typen: { typ: string; anzahl: number }[] }
  | { art: 'werfer'; geschosse: { id: string; anzahl: number }[] };

/** Wie die Waffe nachgeladen werden kann, mit dem, was gerade da ist. Leer = nichts zum Nachladen da. */
export function nachladearten(c: Charakter, e: WaffenEintrag, d: Spieldaten): Nachladeart[] {
  const w = waffeVon(e, d);
  const arten: Nachladeart[] = [];
  if (istWerfer(w)) {
    const geschosse = munitionstypen(w, d).map((id) => ({ id, anzahl: c.ausruestung.vorrat.find((v) => v.id === id)?.anzahl ?? 0 })).filter((g) => g.anzahl > 0);
    if (geschosse.length && e.im_magazin < kapazitaet(e, d)) arten.push({ art: 'werfer', geschosse });
    return arten;
  }
  if (w.ladeart === 'wechselmagazin') {
    if (e.magazine.some((m) => m.inhalt > 0)) arten.push({ art: 'magazin', vorwahl: vorwahlMagazin(e) });
    return arten;
  }
  const gruppen = new Map<string, { art: string; typ: string; n: number }>();
  for (const z of e.zubehoer) {
    if (z.inhalt <= 0) continue;
    const k = `${z.art}|${z.typ}`;
    const g = gruppen.get(k) ?? { art: z.art, typ: z.typ, n: 0 };
    g.n++;
    gruppen.set(k, g);
  }
  for (const g of gruppen.values()) arten.push({ art: 'zubehoer', zubehoer: g.art, typ: g.typ, gefuellt: g.n });
  const frei = kapazitaet(e, d) - e.im_magazin;
  const typen = einzelnTypen(c, e, d);
  if (frei > 0 && typen.length) arten.push({ art: 'einzeln', patronen: Math.min(frei, einzelnProAktion(c, d)), typen });
  return arten;
}

/**
 * Typen, die man einzeln laden kann: nur einer je Ladung. Ist noch Munition in der Waffe, nur deren Typ
 * (konzept.md § 3.8, Munition je Magazin, entschieden 19.11.2026).
 */
export function einzelnTypen(c: Charakter, e: WaffenEintrag, d: Spieldaten): { typ: string; anzahl: number }[] {
  return loseTypen(c, waffeVon(e, d), d).filter((t) => t.anzahl > 0 && (e.im_magazin <= 0 || !e.munitionstyp || t.typ === e.munitionstyp));
}

/** Vollstes Magazin vom bisherigen Typ der Waffe; gibt es keins, das vollste überhaupt. */
export function vorwahlMagazin(e: WaffenEintrag): number {
  const vollstes = (pruef: (m: Magazin) => boolean) => {
    let best = -1;
    e.magazine.forEach((m, i) => { if (m.inhalt > 0 && pruef(m) && (best < 0 || m.inhalt > e.magazine[best]!.inhalt)) best = i; });
    return best;
  };
  const gleich = e.munitionstyp ? vollstes((m) => m.typ === e.munitionstyp) : -1;
  return gleich >= 0 ? gleich : Math.max(0, vollstes(() => true));
}

/** Patronen pro Mainaction beim einzeln Laden; Perks mit „einzeln_patronen“ erhöhen sie. */
export function einzelnProAktion(c: Charakter, d: Spieldaten): number {
  return Math.max(d.regeln.nachladen.einzeln_patronen, ...perkWirkungen(c, d, 'einzeln_patronen').map((w) => w.patronen));
}

/**
 * Magazin wechseln: Das eingesetzte Magazin geht mit seinem Rest und Typ zu den Ersatzmagazinen (leer, wenn nichts
 * mehr drin ist); eine Patrone im Lauf bleibt in der Waffe. Die Waffe trägt danach den Typ des neuen Magazins;
 * die Patrone im Lauf zählt mit dazu. Regelfrage R46 (docs/offen.md): vorläufig.
 */
export function magazinWechseln(e: WaffenEintrag, index: number, d: Spieldaten): WaffenEintrag {
  const w = waffeVon(e, d);
  const neu = e.magazine[index];
  if (!neu) return e;
  const imLauf = w.patrone_im_lauf && e.im_magazin > 0 ? 1 : 0;
  const rest = e.im_magazin - imLauf;
  const alt: Magazin = { inhalt: rest, typ: rest > 0 ? e.munitionstyp : '', zustand: e.magazin_zustand ?? d.regeln.waffenzustand.neu };
  return {
    ...e,
    munitionstyp: neu.typ,
    im_magazin: neu.inhalt + imLauf,
    magazin_zustand: neu.zustand,
    magazine: [...e.magazine.filter((_, i) => i !== index), alt]
  };
}

/**
 * Schnelllader bzw. Ladestreifen mit diesem Typ: füllt auf einmal; Patronen, die noch drin waren, kommen zur losen
 * Munition (Regelfrage R11, vorläufig).
 */
export function mitZubehoerLaden(c: Charakter, e: WaffenEintrag, art: string, typ: string, d: Spieldaten): Charakter {
  const i = e.zubehoer.findIndex((z) => z.art === art && z.typ === typ && z.inhalt > 0);
  if (i < 0) return c;
  const z = e.zubehoer[i]!;
  const w = waffeVon(e, d);
  const raus = e.im_magazin;
  const nach: WaffenEintrag = {
    ...e,
    munitionstyp: typ,
    im_magazin: Math.min(kapazitaet(e, d), z.inhalt),
    zubehoer: e.zubehoer.map((x, j) => (j === i ? { ...x, inhalt: 0, typ: '' } : x))
  };
  return mitMunition(c, nach, w, e.munitionstyp, raus);
}

/** Einzeln laden: bis zu n Patronen eines Typs aus der losen Munition, höchstens bis zur Kapazität; nur ein Typ je Ladung. */
export function einzelnLaden(c: Charakter, e: WaffenEintrag, n: number, typ: string, d: Spieldaten): Charakter {
  const w = waffeVon(e, d);
  const k = kaliberVon(w);
  if (!k || (e.im_magazin > 0 && e.munitionstyp && typ !== e.munitionstyp)) return c;
  const x = Math.max(0, Math.min(n, kapazitaet(e, d) - e.im_magazin, loseMunition(c, k, typ)));
  if (!x) return c;
  return mitMunition(c, { ...e, munitionstyp: typ, im_magazin: e.im_magazin + x }, w, typ, -x);
}

/** Werfer laden: ein Geschoss aus dem Vorrat (Anzahl −1) wird der Inhalt der Waffe. */
export function werferLaden(c: Charakter, e: WaffenEintrag, geschoss: string): Charakter {
  const v = c.ausruestung.vorrat.find((x) => x.id === geschoss);
  if (!v || v.anzahl <= 0) return c;
  const neu: WaffenEintrag = { ...e, munitionstyp: geschoss, im_magazin: 1 };
  return {
    ...c,
    geaendert: new Date().toISOString(),
    ausruestung: {
      ...c.ausruestung,
      waffen: c.ausruestung.waffen.map((x) => (x.id === e.id ? neu : x)),
      vorrat: c.ausruestung.vorrat.map((x) => (x.id === geschoss ? { ...x, anzahl: x.anzahl - 1 } : x))
    }
  };
}

/** Konzentration der Nachladeart (regeln.json `konzentration.aktionen`); null = keine. */
export function nachladenKonzentration(art: Nachladeart['art'], d: Spieldaten): 'leicht' | 'voll' | null {
  const k = d.regeln.konzentration.aktionen;
  if (art === 'einzeln') return k.einzeln_laden ?? null;
  if (art === 'werfer') return k.werfer_nachladen ?? null;
  return null;
}

/** Nachladen als Breakaction: nur mit Perk („nachladen_als_break“) und nur mit Magazin, Schnelllader oder Ladestreifen. */
export function nachladenAlsBreak(c: Charakter, art: Nachladeart['art'], d: Spieldaten): boolean {
  return (art === 'magazin' || art === 'zubehoer') && perkWirkungen(c, d, 'nachladen_als_break').length > 0;
}

// ---------- Waffe wechseln (Kampfsystem, Waffe wechseln)

const RANG: Record<string, number> = { ohne: 0, main: 1, konzentration: 2 };
const rangVon = (k: Wechselkosten) => (typeof k === 'string' ? RANG[k]! : RANG.konzentration! + (k.runden ?? 1));

/** Kosten am Trageort; Perks mit „ziehen_ohne_aktion“ machen ihn kostenlos. */
export function kostenAm(c: Charakter, trageort: string, d: Spieldaten): { kosten: Wechselkosten; perk: string | null } {
  const k = d.regeln.waffe_wechseln.trageorte[trageort] ?? 'main';
  if (perkWirkungen(c, d, 'ziehen_ohne_aktion').some((w) => w.trageorte.includes(trageort)))
    return { kosten: 'ohne', perk: perkMitWirkung(c, d, 'ziehen_ohne_aktion') };
  return { kosten: k, perk: null };
}

/**
 * Kosten eines Wechsels: Er umfasst Wegstecken der alten und Bereitmachen der neuen Waffe; es zählt der teurere
 * der beiden Trageorte. Regelfrage R7 (docs/offen.md): vorläufig.
 */
export function wechselkosten(c: Charakter, nachId: string, d: Spieldaten): { kosten: Wechselkosten; perk: string | null } {
  const alt = aktiverEintrag(c);
  const neu = c.ausruestung.waffen.find((w) => w.id === nachId);
  const teile = [alt ? kostenAm(c, alt.trageort, d) : null, neu ? kostenAm(c, neu.trageort, d) : null].filter((x): x is NonNullable<typeof x> => !!x);
  if (!teile.length) return { kosten: 'ohne', perk: null };
  // Bei gleichen Kosten den Teil mit Perk nennen, damit der Bericht zeigt, warum es nichts kostet.
  return teile.reduce((a, b) => (rangVon(b.kosten) > rangVon(a.kosten) || (rangVon(b.kosten) === rangVon(a.kosten) && b.perk && !a.perk) ? b : a));
}

export function waffeAktivieren(c: Charakter, id: string | null): Charakter {
  return { ...c, geaendert: new Date().toISOString(), ausruestung: { ...c.ausruestung, aktive_waffe: id } };
}

// ---------- Ladehemmung beheben

/** Probe für eine einfache Ladehemmung: Control mit Waffenskill, Malsteps LH-Behebenmod. + Sicht + Leiter. */
export function lhBehebenAnfrage(e: WaffenEintrag, d: Spieldaten): ProbenAnfrage {
  const w = waffeVon(e, d);
  const mod: StepQuelle[] = w.lh_beheben_mod ? [{ id: 'lh_mod', herkunft: 'waffe', name: 'LH-Behebenmod. der Waffe', malsteps: w.lh_beheben_mod }] : [];
  return { stat: d.regeln.ladehemmung.beheben.stat, skill: waffenskill(w, d), probe: 'ladehemmung_beheben', fest: mod };
}

/** Probe für eine schwere Ladehemmung (nur außerhalb des Gefechts): Intellect mit Mechanik, Malsteps LH-Behebenmod. */
export function schwerBehebenAnfrage(e: WaffenEintrag, d: Spieldaten): ProbenAnfrage {
  const w = waffeVon(e, d);
  const r = d.regeln.ladehemmung.schwer_beheben;
  const mod: StepQuelle[] = w.lh_beheben_mod ? [{ id: 'lh_mod', herkunft: 'waffe', name: 'LH-Behebenmod. der Waffe', malsteps: w.lh_beheben_mod }] : [];
  return { stat: r.stat, skill: r.skill, probe: 'ladehemmung_beheben', fest: mod };
}

/** Zustand eine Stufe schlechter (A → B …); schlechter als die letzte Stufe geht nicht. */
export function zustandSenken(zustand: string, stufen: number, d: Spieldaten): string {
  const s = d.regeln.waffenzustand.stufen;
  const i = s.indexOf(zustand);
  return s[Math.min(s.length - 1, Math.max(0, i) + stufen)]!;
}

/** Ergebnis einer Behebungsprobe: Erfolg/Krit → Waffe frei; die schwere Ladehemmung senkt zusätzlich den Zustand. */
export function ladehemmungBeheben(e: WaffenEintrag, stufe: Ergebnisstufe, d: Spieldaten): WaffenEintrag {
  if (stufe === 'misserfolg') return e;
  const zustand = e.ladehemmung === 'schwer' ? zustandSenken(e.zustand, d.regeln.ladehemmung.schwer_beheben.zustand_stufen, d) : e.zustand;
  return { ...e, ladehemmung: null, zustand };
}

// ---------- Magazine füllen und leeren (außerhalb des Gefechts)

/** Was gefüllt oder geleert wird: die Waffe selbst, ein Ersatzmagazin, ein Schnelllader/Ladestreifen (Index). */
export type Fuellziel = { art: 'waffe' } | { art: 'magazin'; index: number } | { art: 'zubehoer'; index: number };

export interface Fuellung {
  nach: Charakter;
  eintrag: WaffenEintrag;
  typ: string;
  /** Verbrauchte lose Patronen. */
  patronen: number;
  /** Was gefüllt wurde, in Reihenfolge, mit Inhalt vorher und nachher. */
  schritte: { ziel: Fuellziel; vorher: number; nachher: number }[];
}

function zielInhalt(e: WaffenEintrag, z: Fuellziel): { inhalt: number; typ: string } | null {
  if (z.art === 'waffe') return { inhalt: e.im_magazin, typ: e.munitionstyp };
  const m = z.art === 'magazin' ? e.magazine[z.index] : e.zubehoer[z.index];
  return m ? { inhalt: m.inhalt, typ: m.typ } : null;
}

/** Platz im Ziel für diesen Typ: 0, wenn schon ein anderer Typ darin ist (ein Typ je Magazin bzw. Ladung). */
export function platzFuer(e: WaffenEintrag, z: Fuellziel, typ: string, d: Spieldaten): number {
  const x = zielInhalt(e, z);
  if (!x || (x.inhalt > 0 && x.typ && x.typ !== typ)) return 0;
  const groesse = z.art === 'waffe' ? kapazitaet(e, d) : magazinGroesse(e, d);
  return Math.max(0, groesse - x.inhalt);
}

/**
 * Ziele, die „Magazine füllen“ der Reihe nach füllt: bei Wechselmagazin zuerst die Waffe, dann angebrochene, dann leere
 * Ersatzmagazine; sonst Schnelllader und Ladestreifen (die Waffe selbst lädt man einzeln). Regelfrage R12 (docs/offen.md).
 */
export function fuellziele(e: WaffenEintrag, d: Spieldaten): Fuellziel[] {
  const w = waffeVon(e, d);
  if (istWerfer(w)) return [];
  if (w.ladeart === 'wechselmagazin') {
    const idx = e.magazine.map((_, i) => i);
    return [
      { art: 'waffe' },
      ...idx.filter((i) => e.magazine[i]!.inhalt > 0).map((index) => ({ art: 'magazin' as const, index })),
      ...idx.filter((i) => e.magazine[i]!.inhalt <= 0).map((index) => ({ art: 'magazin' as const, index }))
    ];
  }
  return e.zubehoer.map((_, index) => ({ art: 'zubehoer' as const, index }));
}

/**
 * Füllt die Ziele mit einem Munitionstyp aus der losen Munition, so weit sie reicht. Ziele mit einem anderen Typ
 * bleiben, wie sie sind. Schnelllader und Ladestreifen werden nur ganz gefüllt.
 */
export function magazineFuellen(c: Charakter, e: WaffenEintrag, typ: string, d: Spieldaten, ziele: Fuellziel[] = fuellziele(e, d)): Fuellung {
  const w = waffeVon(e, d);
  const k = kaliberVon(w);
  const start = k ? loseMunition(c, k, typ) : 0;
  let lose = start;
  let neu: WaffenEintrag = { ...e, magazine: [...e.magazine], zubehoer: [...e.zubehoer] };
  const schritte: Fuellung['schritte'] = [];
  for (const z of ziele) {
    const platz = platzFuer(neu, z, typ, d);
    let x = Math.min(lose, platz);
    if (z.art === 'zubehoer' && x < platz) x = 0;
    if (x <= 0) continue;
    const vorher = zielInhalt(neu, z)!.inhalt;
    if (z.art === 'waffe') neu = { ...neu, im_magazin: vorher + x, munitionstyp: typ };
    else if (z.art === 'magazin') neu.magazine[z.index] = { ...neu.magazine[z.index]!, inhalt: vorher + x, typ };
    else neu.zubehoer[z.index] = { ...neu.zubehoer[z.index]!, inhalt: vorher + x, typ };
    lose -= x;
    schritte.push({ ziel: z, vorher, nachher: vorher + x });
  }
  const patronen = start - lose;
  return { nach: mitMunition(c, neu, w, typ, -patronen), eintrag: neu, typ, patronen, schritte };
}

/** Leert ein Ziel; die Patronen kommen zur losen Munition (z. B. um einen anderen Typ zu laden). */
export function zielLeeren(c: Charakter, e: WaffenEintrag, z: Fuellziel, d: Spieldaten): Charakter {
  const x = zielInhalt(e, z);
  if (!x || x.inhalt <= 0) return c;
  let neu: WaffenEintrag;
  if (z.art === 'waffe') neu = { ...e, im_magazin: 0 };
  else if (z.art === 'magazin') neu = { ...e, magazine: e.magazine.map((m, i) => (i === z.index ? { ...m, inhalt: 0, typ: '' } : m)) };
  else neu = { ...e, zubehoer: e.zubehoer.map((m, i): ZubehoerEintrag => (i === z.index ? { ...m, inhalt: 0, typ: '' } : m)) };
  return mitMunition(c, neu, waffeVon(e, d), x.typ, x.inhalt);
}

// ---------- Lose Aufsätze anbringen und abnehmen (konzept.md § 3.8, Lose Aufsätze)

/** Passt auf die Kapazität an: Patronen über der neuen Kapazität kommen zur losen Munition. */
function kapazitaetAnpassen(c: Charakter, e: WaffenEintrag, d: Spieldaten): Charakter {
  const kap = kapazitaet(e, d);
  const ueber = Math.max(0, e.im_magazin - kap);
  return mitMunition(c, { ...e, im_magazin: e.im_magazin - ueber }, waffeVon(e, d), e.munitionstyp, ueber);
}

/** Lose Aufsätze, die an die Waffe passen, mit ihrem Index in `ausruestung.aufsaetze`. */
export function loseAufsaetzeFuer(c: Charakter, e: WaffenEintrag, d: Spieldaten): { index: number; aufsatz: Aufsatz; zustand: string }[] {
  const passend = passendeAufsaetze(waffeVon(e, d), d);
  return c.ausruestung.aufsaetze.flatMap((t, index) => {
    const aufsatz = passend.find((a) => a.id === t.id);
    return aufsatz ? [{ index, aufsatz, zustand: t.zustand }] : [];
  });
}

/**
 * Bringt einen losen Aufsatz an. Es passt nur ein Magazin: ein neues erweitertes Magazin bzw. eine Trommel ersetzt
 * ein vorhandenes, das zu den losen Aufsätzen kommt.
 */
export function aufsatzAnbringen(c: Charakter, e: WaffenEintrag, index: number, d: Spieldaten): Charakter {
  const t = c.ausruestung.aufsaetze[index];
  const a = t && d.aufsaetze.eintraege.find((x) => x.id === t.id);
  if (!t || !a) return c;
  const ersetzt = a.werte?.magazin ? e.aufsaetze.filter((x) => d.aufsaetze.eintraege.find((y) => y.id === x.id)?.werte?.magazin) : [];
  const lose = [...c.ausruestung.aufsaetze.filter((_, i) => i !== index), ...ersetzt];
  const neu: WaffenEintrag = { ...e, aufsaetze: [...e.aufsaetze.filter((x) => !ersetzt.includes(x)), t] };
  return kapazitaetAnpassen({ ...c, ausruestung: { ...c.ausruestung, aufsaetze: lose } }, neu, d);
}

/** Nimmt einen Aufsatz ab; er kommt zu den losen Aufsätzen. */
export function aufsatzAbnehmen(c: Charakter, e: WaffenEintrag, id: string, d: Spieldaten): Charakter {
  const t = e.aufsaetze.find((x) => x.id === id);
  if (!t) return c;
  const neu: WaffenEintrag = { ...e, aufsaetze: e.aufsaetze.filter((x) => x !== t) };
  return kapazitaetAnpassen({ ...c, ausruestung: { ...c.ausruestung, aufsaetze: [...c.ausruestung.aufsaetze, t] } }, neu, d);
}
