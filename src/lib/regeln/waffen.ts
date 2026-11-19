// Waffen in der Ausrüstung (konzept.md § 3.8; Regelwerk: Kampfsystem, Nachladen, Waffe wechseln, Ladehemmung;
// Schusswaffen (tragbar)): Magazine und Magazingröße, passende Aufsätze, Munition, Nachladen, Waffe wechseln,
// Ladehemmung beheben. Alle Funktionen sind rein; sie geben neue Einträge bzw. einen neuen Charakter zurück.

import type { Aufsatz, MagazinSorte, Munitionstyp, Spieldaten, Sprengwaffe, Waffe, Wechselkosten } from '../daten/typen';
import type { Charakter, Magazin, WaffenEintrag } from '../speicher/charakter';
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

// ---------- Magazine (magazine.json; konzept.md § 3.8, Magazine)

export function magazinSorte(id: string, d: Spieldaten): MagazinSorte | null {
  return d.magazine.eintraege.find((m) => m.id === id) ?? null;
}

/** Magazinsorten, die an die Waffe passen: Wechselmagazine bzw. Schnelllader und Ladestreifen. */
export function passendeMagazine(waffeId: string, d: Spieldaten): MagazinSorte[] {
  return d.magazine.eintraege.filter((m) => m.passt_an.includes(waffeId));
}

/** Name mit den Waffen, an die das Magazin passt („Magazin (20) für Colt M4 Carbine, Colt M16A4“). */
export function magazinName(m: MagazinSorte, d: Spieldaten): string {
  const waffen = m.passt_an.map((id) => d.waffen.eintraege.find((w) => w.id === id)?.name ?? id);
  return `${m.name} für ${waffen.join(', ')}`;
}

/** Kaliber der Patronen in einem Magazin: das der Waffen, an die es passt. */
export function magazinKaliber(id: string, d: Spieldaten): string | null {
  const w = d.waffen.eintraege.find((x) => magazinSorte(id, d)?.passt_an.includes(x.id));
  return w ? kaliberVon(w) : null;
}

/** Fassungsvermögen eines Magazins bzw. Schnellladers oder Ladestreifens. */
export function magazinPlatz(id: string, d: Spieldaten): number {
  return magazinSorte(id, d)?.groesse ?? 0;
}

/** Magazine beim Charakter, die an die Waffe passen, mit ihrem Index in `ausruestung.magazine`. */
export function magazineFuer(c: Charakter, e: WaffenEintrag, d: Spieldaten): { index: number; m: Magazin }[] {
  return c.ausruestung.magazine.flatMap((m, index) => (magazinSorte(m.id, d)?.passt_an.includes(e.waffe) ? [{ index, m }] : []));
}

/** Magazingröße ohne Patrone im Lauf: die des eingesetzten Magazins; ohne Wechselmagazin die der Waffe. */
export function magazinGroesse(e: WaffenEintrag, d: Spieldaten): number {
  const w = waffeVon(e, d);
  if (w.ladeart !== 'wechselmagazin') return w.magazin;
  return e.magazin ? magazinPlatz(e.magazin.id, d) : 0;
}

/** Höchster Inhalt der Waffe: Magazin + Patrone im Lauf („20+1“). */
export function kapazitaet(e: WaffenEintrag, d: Spieldaten): number {
  return magazinGroesse(e, d) + (waffeVon(e, d).patrone_im_lauf ? 1 : 0);
}

export function trommelmagazin(e: WaffenEintrag, d: Spieldaten): boolean {
  return !!(e.magazin && magazinSorte(e.magazin.id, d)?.trommel);
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
 * Neue Waffe für die Ausrüstung, Zustand neuwertig, mit dem Standardmagazin (bei Wechselmagazin). `geladen`: voll mit
 * dem ersten Munitionstyp (Schreibmodus); sonst leer (Kauf im Laden). Werfer sind immer leer.
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
    ...(w.ladeart === 'wechselmagazin' && w.standardmagazin ? { magazin: { id: w.standardmagazin, zustand: d.regeln.waffenzustand.neu } } : {}),
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
  | { art: 'magazin'; /** Index in `ausruestung.magazine` der Vorwahl: das vollste vom bisherigen Typ, sonst das vollste. */ vorwahl: number }
  | { art: 'lader'; sorte: string; typ: string; gefuellt: number }
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
  const passend = magazineFuer(c, e, d).filter((x) => x.m.inhalt > 0);
  if (w.ladeart === 'wechselmagazin') {
    if (passend.length) arten.push({ art: 'magazin', vorwahl: vorwahlMagazin(c, e, d) });
    return arten;
  }
  const gruppen = new Map<string, { sorte: string; typ: string; n: number }>();
  for (const { m } of passend) {
    const k = `${m.id}|${m.typ}`;
    const g = gruppen.get(k) ?? { sorte: m.id, typ: m.typ, n: 0 };
    g.n++;
    gruppen.set(k, g);
  }
  for (const g of gruppen.values()) arten.push({ art: 'lader', sorte: g.sorte, typ: g.typ, gefuellt: g.n });
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

/** Vollstes passendes Magazin vom bisherigen Typ der Waffe; gibt es keins, das vollste überhaupt (Index in `ausruestung.magazine`). */
export function vorwahlMagazin(c: Charakter, e: WaffenEintrag, d: Spieldaten): number {
  const passend = magazineFuer(c, e, d).filter((x) => x.m.inhalt > 0);
  const vollstes = (liste: typeof passend) => liste.reduce<(typeof passend)[number] | null>((a, b) => (!a || b.m.inhalt > a.m.inhalt ? b : a), null);
  return (vollstes(passend.filter((x) => e.munitionstyp && x.m.typ === e.munitionstyp)) ?? vollstes(passend))?.index ?? -1;
}

/** Patronen pro Mainaction beim einzeln Laden; Perks mit „einzeln_patronen“ erhöhen sie. */
export function einzelnProAktion(c: Charakter, d: Spieldaten): number {
  return Math.max(d.regeln.nachladen.einzeln_patronen, ...perkWirkungen(c, d, 'einzeln_patronen').map((w) => w.patronen));
}

/**
 * Magazin wechseln: Das eingesetzte Magazin kommt mit seinem Rest und Typ zu den Magazinen des Charakters (leer, wenn
 * nichts mehr drin ist); eine Patrone im Lauf bleibt in der Waffe. Die Waffe trägt danach Sorte, Zustand und Typ des
 * neuen Magazins (`index` in `ausruestung.magazine`); die Patrone im Lauf zählt mit dazu. Regelfrage R46 (docs/offen.md): vorläufig.
 */
export function magazinWechseln(c: Charakter, e: WaffenEintrag, index: number, d: Spieldaten): Charakter {
  const w = waffeVon(e, d);
  const neu = c.ausruestung.magazine[index];
  if (!neu || !magazinSorte(neu.id, d)?.passt_an.includes(e.waffe)) return c;
  const imLauf = w.patrone_im_lauf && e.im_magazin > 0 ? 1 : 0;
  const rest = e.im_magazin - imLauf;
  const magazine = c.ausruestung.magazine.filter((_, i) => i !== index);
  if (e.magazin) magazine.push({ id: e.magazin.id, zustand: e.magazin.zustand, inhalt: rest, typ: rest > 0 ? e.munitionstyp : '' });
  const eintrag: WaffenEintrag = { ...e, munitionstyp: neu.typ, im_magazin: neu.inhalt + imLauf, magazin: { id: neu.id, zustand: neu.zustand } };
  return eintragErsetzen({ ...c, ausruestung: { ...c.ausruestung, magazine } }, eintrag);
}

/**
 * Schnelllader bzw. Ladestreifen dieser Sorte mit diesem Typ: füllt auf einmal; er bleibt leer beim Charakter. Patronen,
 * die noch in der Waffe waren, kommen zur losen Munition (Regelfrage R11, vorläufig).
 */
export function mitLaderLaden(c: Charakter, e: WaffenEintrag, sorte: string, typ: string, d: Spieldaten): Charakter {
  const i = c.ausruestung.magazine.findIndex((m) => m.id === sorte && m.typ === typ && m.inhalt > 0 && magazinSorte(m.id, d)?.passt_an.includes(e.waffe));
  if (i < 0) return c;
  const z = c.ausruestung.magazine[i]!;
  const w = waffeVon(e, d);
  const raus = e.im_magazin;
  const magazine = c.ausruestung.magazine.map((x, j) => (j === i ? { ...x, inhalt: 0, typ: '' } : x));
  const nach: WaffenEintrag = { ...e, munitionstyp: typ, im_magazin: Math.min(kapazitaet(e, d), z.inhalt) };
  return mitMunition({ ...c, ausruestung: { ...c.ausruestung, magazine } }, nach, w, e.munitionstyp, raus);
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
  return (art === 'magazin' || art === 'lader') && perkWirkungen(c, d, 'nachladen_als_break').length > 0;
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

/** Was gefüllt oder geleert wird: die Waffe selbst oder ein Magazin, Schnelllader bzw. Ladestreifen (Index in `ausruestung.magazine`). */
export type Fuellziel = { art: 'waffe' } | { art: 'magazin'; index: number };

export interface Fuellung {
  nach: Charakter;
  typ: string;
  /** Verbrauchte lose Patronen. */
  patronen: number;
  /** Was gefüllt wurde, in Reihenfolge, mit Inhalt vorher und nachher. */
  schritte: { ziel: Fuellziel; vorher: number; nachher: number }[];
}

function zielInhalt(c: Charakter, e: WaffenEintrag, z: Fuellziel): { inhalt: number; typ: string } | null {
  if (z.art === 'waffe') return { inhalt: e.im_magazin, typ: e.munitionstyp };
  return c.ausruestung.magazine[z.index] ?? null;
}

/** Platz im Ziel für diesen Typ: 0, wenn schon ein anderer Typ darin ist (ein Typ je Magazin bzw. Ladung). */
export function platzFuer(c: Charakter, e: WaffenEintrag, z: Fuellziel, typ: string, d: Spieldaten): number {
  const x = zielInhalt(c, e, z);
  if (!x || (x.inhalt > 0 && x.typ && x.typ !== typ)) return 0;
  const groesse = z.art === 'waffe' ? kapazitaet(e, d) : magazinPlatz(c.ausruestung.magazine[z.index]!.id, d);
  return Math.max(0, groesse - x.inhalt);
}

/**
 * Ziele, die „Magazine füllen“ der Reihe nach füllt: bei Wechselmagazin zuerst die Waffe, dann angebrochene, dann leere
 * passende Magazine; sonst passende Schnelllader und Ladestreifen (die Waffe selbst lädt man einzeln). Regelfrage R12.
 */
export function fuellziele(c: Charakter, e: WaffenEintrag, d: Spieldaten): Fuellziel[] {
  const w = waffeVon(e, d);
  if (istWerfer(w)) return [];
  const passend = magazineFuer(c, e, d);
  const mags = [...passend.filter((x) => x.m.inhalt > 0), ...passend.filter((x) => x.m.inhalt <= 0)].map((x) => ({ art: 'magazin' as const, index: x.index }));
  return w.ladeart === 'wechselmagazin' ? [{ art: 'waffe' }, ...mags] : mags;
}

/**
 * Füllt die Ziele mit einem Munitionstyp aus der losen Munition, so weit sie reicht. Ziele mit einem anderen Typ
 * bleiben, wie sie sind. Schnelllader und Ladestreifen werden nur ganz gefüllt.
 */
export function magazineFuellen(c: Charakter, e: WaffenEintrag, typ: string, d: Spieldaten, ziele: Fuellziel[] = fuellziele(c, e, d)): Fuellung {
  const w = waffeVon(e, d);
  const k = kaliberVon(w);
  const start = k ? loseMunition(c, k, typ) : 0;
  let lose = start;
  let neu: WaffenEintrag = e;
  let x: Charakter = { ...c, ausruestung: { ...c.ausruestung, magazine: [...c.ausruestung.magazine] } };
  const schritte: Fuellung['schritte'] = [];
  for (const z of ziele) {
    const platz = platzFuer(x, neu, z, typ, d);
    let n = Math.min(lose, platz);
    const lader = z.art === 'magazin' && magazinSorte(x.ausruestung.magazine[z.index]!.id, d)?.art === 'lader';
    if (lader && n < platz) n = 0;
    if (n <= 0) continue;
    const vorher = zielInhalt(x, neu, z)!.inhalt;
    if (z.art === 'waffe') neu = { ...neu, im_magazin: vorher + n, munitionstyp: typ };
    else x.ausruestung.magazine[z.index] = { ...x.ausruestung.magazine[z.index]!, inhalt: vorher + n, typ };
    lose -= n;
    schritte.push({ ziel: z, vorher, nachher: vorher + n });
  }
  const patronen = start - lose;
  return { nach: mitMunition(x, neu, w, typ, -patronen), typ, patronen, schritte };
}

/** Leert die Waffe; die Patronen kommen zur losen Munition (z. B. um einen anderen Typ zu laden). */
export function waffeLeeren(c: Charakter, e: WaffenEintrag, d: Spieldaten): Charakter {
  if (e.im_magazin <= 0) return c;
  return mitMunition(c, { ...e, im_magazin: 0 }, waffeVon(e, d), e.munitionstyp, e.im_magazin);
}

/** Leert ein Magazin, einen Schnelllader oder Ladestreifen (Index in `ausruestung.magazine`); die Patronen kommen zur losen Munition. */
export function magazinLeeren(c: Charakter, index: number, d: Spieldaten): Charakter {
  const m = c.ausruestung.magazine[index];
  const k = m && magazinKaliber(m.id, d);
  if (!m || m.inhalt <= 0 || !k) return c;
  const magazine = c.ausruestung.magazine.map((x, i) => (i === index ? { ...x, inhalt: 0, typ: '' } : x));
  return munitionAendern({ ...c, ausruestung: { ...c.ausruestung, magazine } }, k, m.typ, m.inhalt);
}

// ---------- Lose Aufsätze anbringen und abnehmen (konzept.md § 3.8, Lose Aufsätze)

/** Lose Aufsätze, die an die Waffe passen, mit ihrem Index in `ausruestung.aufsaetze`. */
export function loseAufsaetzeFuer(c: Charakter, e: WaffenEintrag, d: Spieldaten): { index: number; aufsatz: Aufsatz; zustand: string }[] {
  const passend = passendeAufsaetze(waffeVon(e, d), d);
  return c.ausruestung.aufsaetze.flatMap((t, index) => {
    const aufsatz = passend.find((a) => a.id === t.id);
    return aufsatz ? [{ index, aufsatz, zustand: t.zustand }] : [];
  });
}

/** Bringt einen losen Aufsatz an. */
export function aufsatzAnbringen(c: Charakter, e: WaffenEintrag, index: number, d: Spieldaten): Charakter {
  const t = c.ausruestung.aufsaetze[index];
  if (!t || !d.aufsaetze.eintraege.some((x) => x.id === t.id)) return c;
  const lose = c.ausruestung.aufsaetze.filter((_, i) => i !== index);
  return eintragErsetzen({ ...c, ausruestung: { ...c.ausruestung, aufsaetze: lose } }, { ...e, aufsaetze: [...e.aufsaetze, t] });
}

/** Nimmt einen Aufsatz ab; er kommt zu den losen Aufsätzen. */
export function aufsatzAbnehmen(c: Charakter, e: WaffenEintrag, id: string, d: Spieldaten): Charakter {
  void d;
  const t = e.aufsaetze.find((x) => x.id === id);
  if (!t) return c;
  return eintragErsetzen({ ...c, ausruestung: { ...c.ausruestung, aufsaetze: [...c.ausruestung.aufsaetze, t] } }, { ...e, aufsaetze: e.aufsaetze.filter((x) => x !== t) });
}

/**
 * Schreibmodus: Sorte des eingesetzten Magazins ändern (ohne Tausch). Patronen über der neuen Kapazität kommen zur
 * losen Munition.
 */
export function magazinsorteSetzen(c: Charakter, e: WaffenEintrag, sorte: string, d: Spieldaten): Charakter {
  if (!magazinSorte(sorte, d)?.passt_an.includes(e.waffe)) return c;
  const neu: WaffenEintrag = { ...e, magazin: { id: sorte, zustand: e.magazin?.zustand ?? d.regeln.waffenzustand.neu } };
  const ueber = Math.max(0, neu.im_magazin - kapazitaet(neu, d));
  return mitMunition(c, { ...neu, im_magazin: neu.im_magazin - ueber }, waffeVon(e, d), e.munitionstyp, ueber);
}
