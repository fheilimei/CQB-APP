// Waffen in der Ausrüstung (konzept.md § 3.8; Regelwerk: Kampfsystem, Nachladen, Waffe wechseln, Ladehemmung;
// Schusswaffen (tragbar)): Magazingröße mit Aufsätzen, passende Aufsätze, Munition, Nachladen, Waffe wechseln,
// Ladehemmung beheben. Alle Funktionen sind rein; sie geben neue Einträge bzw. einen neuen Charakter zurück.

import type { Aufsatz, Munitionstyp, Spieldaten, Sprengwaffe, Waffe, Wechselkosten } from '../daten/typen';
import type { Charakter, WaffenEintrag } from '../speicher/charakter';
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
  return e.aufsaetze.map((id) => d.aufsaetze.eintraege.find((a) => a.id === id)).filter((a): a is Aufsatz => !!a);
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

/** Neue Waffe für die Ausrüstung: voll geladen, ohne Ersatzmagazine, Zustand neuwertig. Werfer sind leer. */
export function neuerWaffenEintrag(waffeId: string, d: Spieldaten, id: string, trageort: string): WaffenEintrag {
  const w = d.waffen.eintraege.find((x) => x.id === waffeId);
  if (!w) throw new Error(`Unbekannte Waffe „${waffeId}“`);
  const typen = munitionstypen(w, d);
  const werfer = istWerfer(w);
  return {
    id,
    waffe: w.id,
    munitionstyp: werfer ? '' : (typen[0] ?? ''),
    im_magazin: werfer ? 0 : w.magazin + (w.patrone_im_lauf ? 1 : 0),
    reserve: [],
    ...(werfer ? {} : { lose_patronen: 0 }),
    ...(w.ladeart === 'wechselmagazin' ? { leere_magazine: 0 } : {}),
    ...(w.zubehoer?.length ? { zubehoer: w.zubehoer.map((art) => ({ art, gefuellt: 0, leer: 0 })) } : {}),
    zustand: d.regeln.waffenzustand.neu,
    aufsaetze: [],
    ladehemmung: null,
    trageort
  };
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

// ---------- Nachladen (Kampfsystem, Nachladen)

export type Nachladeart =
  | { art: 'magazin'; /** Reserve-Index des vollsten Magazins (Vorwahl). */ vorwahl: number }
  | { art: 'zubehoer'; zubehoer: string; gefuellt: number }
  | { art: 'einzeln'; patronen: number }
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
    if (e.reserve.some((n) => n > 0)) arten.push({ art: 'magazin', vorwahl: vollstes(e.reserve) });
    return arten;
  }
  for (const z of e.zubehoer ?? []) if (z.gefuellt > 0) arten.push({ art: 'zubehoer', zubehoer: z.art, gefuellt: z.gefuellt });
  const frei = kapazitaet(e, d) - e.im_magazin;
  if (frei > 0 && (e.lose_patronen ?? 0) > 0) arten.push({ art: 'einzeln', patronen: Math.min(frei, e.lose_patronen ?? 0, einzelnProAktion(c, d)) });
  return arten;
}

function vollstes(reserve: number[]): number {
  let best = 0;
  reserve.forEach((n, i) => { if (n > reserve[best]!) best = i; });
  return best;
}

/** Patronen pro Mainaction beim einzeln Laden; Perks mit „einzeln_patronen“ erhöhen sie. */
export function einzelnProAktion(c: Charakter, d: Spieldaten): number {
  return Math.max(d.regeln.nachladen.einzeln_patronen, ...perkWirkungen(c, d, 'einzeln_patronen').map((w) => w.patronen));
}

/**
 * Magazin wechseln: Das eingesetzte Magazin geht mit seinem Rest in die Reserve, eine Patrone im Lauf bleibt in der Waffe.
 * Ein leeres altes Magazin zählt zu den leeren Magazinen (zum Füllen nach dem Gefecht).
 */
export function magazinWechseln(e: WaffenEintrag, index: number, d: Spieldaten): WaffenEintrag {
  const w = waffeVon(e, d);
  const neu = e.reserve[index];
  if (neu === undefined) return e;
  const imLauf = w.patrone_im_lauf && e.im_magazin > 0 ? 1 : 0;
  const rest = e.im_magazin - imLauf;
  const reserve = e.reserve.filter((_, i) => i !== index);
  if (rest > 0) reserve.push(rest);
  return {
    ...e,
    im_magazin: neu + imLauf,
    reserve: reserve.filter((n) => n > 0),
    ...(rest > 0 ? {} : { leere_magazine: (e.leere_magazine ?? 0) + 1 })
  };
}

/** Schnelllader bzw. Ladestreifen: füllt auf einmal; Patronen, die noch drin waren, kommen zu den losen Patronen (Regelfrage R11, vorläufig). */
export function mitZubehoerLaden(e: WaffenEintrag, art: string, d: Spieldaten): WaffenEintrag {
  const z = e.zubehoer?.find((x) => x.art === art);
  if (!z || z.gefuellt <= 0) return e;
  return {
    ...e,
    im_magazin: magazinGroesse(e, d),
    lose_patronen: (e.lose_patronen ?? 0) + e.im_magazin,
    zubehoer: e.zubehoer!.map((x) => (x.art === art ? { ...x, gefuellt: x.gefuellt - 1, leer: x.leer + 1 } : x))
  };
}

/** Einzeln laden: bis zu n Patronen aus den losen Patronen, höchstens bis zur Kapazität. */
export function einzelnLaden(e: WaffenEintrag, n: number, d: Spieldaten): WaffenEintrag {
  const k = Math.max(0, Math.min(n, kapazitaet(e, d) - e.im_magazin, e.lose_patronen ?? 0));
  return { ...e, im_magazin: e.im_magazin + k, lose_patronen: (e.lose_patronen ?? 0) - k };
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

// ---------- Magazine füllen (außerhalb des Gefechts)

export interface Fuellung {
  eintrag: WaffenEintrag;
  /** Verbrauchte lose Patronen. */
  patronen: number;
  /** Was gefüllt wurde, in Reihenfolge: Waffe, angebrochene Magazine, leere Magazine bzw. Schnelllader/Ladestreifen. */
  waffe: [number, number] | null;
  reserve: { vorher: number; nachher: number }[];
  leere: number;
  zubehoer: { art: string; anzahl: number }[];
}

/**
 * Füllt aus den losen Patronen, so weit sie reichen: zuerst die Waffe (Wechselmagazin bis zur Kapazität), dann
 * angebrochene Ersatzmagazine, dann leere Magazine; bei Waffen ohne Wechselmagazin leere Schnelllader und Ladestreifen
 * (je Magazingröße). Einzeln laden in die Waffe selbst bleibt beim Nachladen.
 * Regelfrage R12 (docs/offen.md): Reihenfolge und „kostet keine Zeit“ vorläufig.
 */
export function magazineFuellen(e: WaffenEintrag, d: Spieldaten): Fuellung {
  const w = waffeVon(e, d);
  const groesse = magazinGroesse(e, d);
  let lose = e.lose_patronen ?? 0;
  const start = lose;
  const f: Fuellung = { eintrag: e, patronen: 0, waffe: null, reserve: [], leere: 0, zubehoer: [] };
  if (w.ladeart === 'wechselmagazin') {
    let im = e.im_magazin;
    const k = Math.min(lose, kapazitaet(e, d) - im);
    if (k > 0) { f.waffe = [im, im + k]; im += k; lose -= k; }
    const reserve = e.reserve.map((n) => {
      const x = Math.min(lose, groesse - n);
      if (x <= 0) return n;
      lose -= x;
      f.reserve.push({ vorher: n, nachher: n + x });
      return n + x;
    });
    let leere = e.leere_magazine ?? 0;
    while (leere > 0 && lose > 0) {
      const x = Math.min(lose, groesse);
      reserve.push(x);
      lose -= x;
      leere--;
      f.leere++;
    }
    f.eintrag = { ...e, im_magazin: im, reserve, leere_magazine: leere, lose_patronen: lose };
  } else if (e.zubehoer?.length) {
    const zubehoer = e.zubehoer.map((z) => {
      const n = Math.min(z.leer, Math.floor(lose / groesse));
      if (n <= 0) return z;
      lose -= n * groesse;
      f.zubehoer.push({ art: z.art, anzahl: n });
      return { ...z, gefuellt: z.gefuellt + n, leer: z.leer - n };
    });
    f.eintrag = { ...e, zubehoer, lose_patronen: lose };
  }
  f.patronen = start - lose;
  return f;
}
