// Schussrechner (konzept.md § 3.8, § 3.8c; Regelwerk: Kampfsystem, Treffen, Schrotflinten, Ladehemmung, Schießen in
// den Nahkampf, Lage): stellt aus Charakter, aktiver Waffe und Lage den Trefferwert, die Haltezahl und die
// Ladehemmungsrate zusammen, wertet die Würfe aus und übernimmt das Ergebnis (Magazin, Break, Auslöser, Protokoll).

import type { BandId, Feuermodus, LageUmstand, Spieldaten, Waffe } from '../daten/typen';
import type { Charakter, Gefecht, WaffenEintrag } from '../speicher/charakter';
import { eigeneBewegungFuerLage, eigenerStand, perkMitWirkung, perkWirkungen, zielenAktiv } from './aktionen';
import { leiterSteps } from './leiter';
import { modifikatorenDes, modifikatorSteps, type Probenkontext } from './modifikatoren';
import { statwert, type Ergebnisstufe, type StepQuelle } from './probe';
import { gefechtVon, probeStellen, type Probe, type ProbenAnfrage, type SlSteps } from './probenrechner';
import {
  ansageMoeglich, ansageSteps, burstSchuesse, folgetreffer, garbenfaktor, haltezahl, kugelnDerFolgetreffer, ladehemmung,
  ladehemmungsRate, lageSteps, reichweitenSteps, zoneAusW8, zonenFolge, type Ansage, type Ladehemmung
} from './schiessen';
import { auswerten } from './probe';
import { geltendeSicht } from './zustaende';
import { gehaltenerSchild } from './wunden';
import { aufsaetzeVon, istWerfer, kapazitaet, munitionswerte, trommelmagazin, waffenskill, waffeVon } from './waffen';

export type Modus = 'EF' | 'Burst' | 'VA';

export interface Schusseinstellung {
  modus: Modus;
  /** Zahl der Schüsse (EF, VA) bzw. der Bursts. */
  anzahl: number;
  ansage: Ansage;
  /** Angesagte Zone bei Ansage „zone“. */
  ansage_zone: string | null;
  /** Aufsätze mit Schalter, die gerade im Einsatz sind (z. B. Zweibein aufgesetzt). */
  schalter: string[];
  ausgeschaltet: string[];
  sl: SlSteps;
}

export interface Schussvorschau {
  eintrag: WaffenEintrag;
  waffe: Waffe;
  modus: Feuermodus;
  band: BandId | null;
  /** Angesagte Schüsse (bei Burst: Bursts × Länge, höchstens Feuerrate), höchstens Inhalt der Waffe. */
  schuesse: number;
  /** Höchste wählbare Anzahl (Schüsse bzw. Bursts). */
  anzahl_max: number;
  probe: Probe;
  /** Die Anfrage der Trefferprobe ohne Steps der SL und ausgeschaltete Chips (für den Probenbaustein der Oberfläche). */
  anfrage: Omit<ProbenAnfrage, 'sl' | 'ausgeschaltet' | 'braucht_sicht'>;
  /** null bei nur einem Schuss. */
  haltezahl: { wert: number; quellen: StepQuelle[] } | null;
  lh_rate: number;
  garbenfaktor: number;
  /** Kugeln bei einem Treffer (Schrotzahl im Band, sonst 1). */
  kugeln: number;
  ansage_moeglich: boolean;
  /** Warum nicht geschossen werden kann. */
  sperre: 'leer' | 'ladehemmung' | 'band' | 'entfernung' | null;
  /** Umstand „Ziel im Nahkampf“ ist gewählt: ein Fehlschuss trifft einen anderen Beteiligten. */
  nahkampf: boolean;
  werfer: boolean;
}

/** Gewählte Umstände je Gruppe; fehlt eine Auswahl, gilt der Standard der Gruppe. Entfernung hat keinen Standard. */
export function lageAuswahl(g: Gefecht, d: Spieldaten): Record<string, string | string[] | null> {
  const a: Record<string, string | string[] | null> = {};
  for (const gr of d.regeln.lage.gruppen) {
    const wert = g.lage.auswahl[gr.id];
    if (wert !== undefined) a[gr.id] = wert;
    else if (gr.auswahl === 'schalter') a[gr.id] = [];
    else a[gr.id] = gr.quelle === 'reichweite' ? null : (d.regeln.lage.umstaende.find((u) => u.gruppe === gr.id && u.standard)?.id ?? null);
  }
  return a;
}

/** Die Gruppe, deren Auswahl das Band ist (quelle „reichweite“). */
export function entfernungsgruppe(d: Spieldaten): string | null {
  return d.regeln.lage.gruppen.find((g) => g.quelle === 'reichweite')?.id ?? null;
}

function gewaehlteUmstaende(auswahl: Record<string, string | string[] | null>, d: Spieldaten): LageUmstand[] {
  const ids = new Set(Object.values(auswahl).flatMap((v) => (v == null ? [] : Array.isArray(v) ? v : [v])));
  return d.regeln.lage.umstaende.filter((u) => ids.has(u.id));
}

/** Umstände, die Aufsätze im Einsatz setzen (setzt.aufgelegt → Umstand „aufgelegt“ der Gruppe Schütze). */
function gesetztDurchAufsatz(e: WaffenEintrag, schalter: string[], d: Spieldaten): string[] {
  const aufgelegt = aufsaetzeVon(e, d).some((a) => a.setzt?.aufgelegt && (a.einsatz === 'immer' || schalter.includes(a.id)));
  if (!aufgelegt) return [];
  return d.regeln.lage.umstaende.filter((u) => u.nur_ohne_eigene_bewegung).map((u) => u.id);
}

/** Feuermodus der Waffe; fehlt er, der erste vorhandene. */
export function feuermodus(w: Waffe, modus: Modus): { modus: Modus; daten: Feuermodus } {
  const m = w.feuermodi[modus] ? modus : (Object.keys(w.feuermodi)[0] as Modus);
  return { modus: m, daten: w.feuermodi[m]! };
}

export function schussStellen(c: Charakter, d: Spieldaten, e: WaffenEintrag, s: Schusseinstellung): Schussvorschau {
  const r = d.regeln;
  const g = gefechtVon(c);
  const w = waffeVon(e, d);
  const werfer = istWerfer(w);
  const { modus, daten: fm } = feuermodus(w, s.modus);
  const leiter = g?.leiter ?? 0;
  const stand = g ? eigenerStand(g, d) : r.staende[0]!.id;

  // Lage: Auswahl, Band, Aufsätze im Einsatz, eigene Bewegung
  const auswahl = g ? lageAuswahl(g, d) : {};
  const eg = entfernungsgruppe(d);
  const band = (eg ? (auswahl[eg] as BandId | null) : null) ?? null;
  const gesetzt = gesetztDurchAufsatz(e, s.schalter, d);
  const schuetze = d.regeln.lage.gruppen.find((x) => x.auswahl === 'schalter')?.id;
  if (schuetze && gesetzt.length) auswahl[schuetze] = [...new Set([...((auswahl[schuetze] as string[]) ?? []), ...gesetzt])];
  const bewegung = g ? eigeneBewegungFuerLage(g) : null;
  const ablauf = werfer ? 'werfer' : 'schiessen';
  const lage = lageSteps({ auswahl: eg ? { ...auswahl, [eg]: null } : auswahl, band, eigene_bewegung: bewegung, ablauf }, r);
  const umstaende = gewaehlteUmstaende(auswahl, d);
  const aufgelegt = umstaende.some((u) => u.nur_ohne_eigene_bewegung) && !bewegung;

  const fest: StepQuelle[] = [];
  const zusatz: StepQuelle[] = [];
  // Reichweite: entfällt durch Zielen mit „ohne Reichweite“ oder Perks mit „reichweite_frei“ im Band.
  const zielen = g ? zielenAktiv(g) : null;
  const frei = band && perkWirkungen(c, d, 'reichweite_frei').some((p) => p.baender.includes(band));
  if (band) {
    const rw = reichweitenSteps(w, band, r) ?? [];
    if (zielen?.ohne_reichweite && rw.length) zusatz.push({ id: 'zielen_reichweite', herkunft: 'lage', name: `Zielen: keine Reichweite (${rw[0]!.name})`, stepshields: 0 });
    else if (frei && rw.length) zusatz.push({ id: 'perk_reichweite', herkunft: 'perk', name: `${perkMitWirkung(c, d, 'reichweite_frei')}: keine Reichweite`, stepshields: 0 });
    else fest.push(...rw);
  }
  for (const q of lage) {
    if (q.id !== 'eigene_bewegung') { fest.push(q); continue; }
    const weniger = perkWirkungen(c, d, 'eigene_bewegung_weniger').reduce((s2, p) => s2 + p.malsteps, 0);
    const name = `eigene Bewegung: ${d.darstellung.bewegungen[bewegung!] ?? bewegung}`;
    const malsteps = Math.max(0, (q.malsteps ?? 0) - weniger);
    zusatz.push({ ...q, name: weniger ? `${name} (${perkMitWirkung(c, d, 'eigene_bewegung_weniger')} −${weniger})` : name, malsteps });
  }
  if (!werfer) zusatz.push(...ansageSteps(s.ansage, r));
  if (zielen?.stepshields) zusatz.push({ id: 'zielen', herkunft: 'lage', name: 'Zielen', stepshields: zielen.stepshields });
  const schild = schildBeimSchiessen(c, w, d);
  if (schild?.malsteps) zusatz.push({ id: 'schild', herkunft: 'lage', name: `${schild.name} in der Hand`, malsteps: schild.malsteps });

  const kontext: Omit<Probenkontext, 'stat' | 'skill' | 'probe'> = { band, stand, ohne_bewegung: !bewegung, aufgelegt };
  const skill = waffenskill(w, d);
  const aufsaetze = aufsaetzeVon(e, d).filter((a) => a.einsatz === 'immer' || s.schalter.includes(a.id));
  for (const a of aufsaetze) {
    for (const [i, q] of modifikatorSteps(a.modifikatoren.map((m) => ({ ...m, herkunft: 'aufsatz', name: a.name })), { ...kontext, stat: r.schiessen.stat, skill, probe: 'schiessen' }).entries())
      zusatz.push({ ...q, id: `aufsatz:${a.id}:${i}` });
  }

  const anfrage = { stat: r.schiessen.stat, skill, probe: 'schiessen', zusatz, fest, kontext };
  const probe = probeStellen(c, d, { ...anfrage, braucht_sicht: true, sl: s.sl, ausgeschaltet: s.ausgeschaltet });

  // Schüsse
  const inhalt = e.im_magazin;
  const burst = modus === 'Burst';
  const anzahlMax = werfer ? 1 : burst ? Math.max(1, Math.floor(fm.feuerrate / (fm.burst_laenge ?? 1))) : fm.feuerrate;
  const anzahl = Math.max(1, Math.min(s.anzahl, anzahlMax));
  const schuesse = Math.min(inhalt, burst ? burstSchuesse(anzahl, fm) : anzahl);

  // Haltezahl: nur Waffe, Skill, Leiter auf Brawn und Rückstoß abfangen (Stand, Aufsätze, Perks/Anpassungen auf „haltezahl“).
  let halte: Schussvorschau['haltezahl'] = null;
  if (schuesse > 1) {
    const h = r.schiessen.haltezahl;
    const quellen: StepQuelle[] = [...leiterSteps(leiter, h.stat, d)];
    const liegend = r.schiessen.rueckstoss_stepshields[stand];
    if (liegend) quellen.push({ herkunft: 'lage', name: `${d.regeln.staende.find((x) => x.id === stand)?.adjektiv ?? stand} schießen`, stepshields: liegend });
    const hk = { ...kontext, stat: h.stat, skill: h.skill, probe: 'haltezahl' };
    for (const a of aufsaetze) quellen.push(...modifikatorSteps(a.modifikatoren.map((m) => ({ ...m, herkunft: 'aufsatz', name: a.name })), hk));
    quellen.push(...modifikatorSteps(modifikatorenDes(c, d), hk));
    const brawn = statwert(c.stats[h.stat], r) ?? 0;
    halte = { wert: haltezahl({ brawn, skill: c.skills[h.skill] ?? 0, rueckstoss: fm.rueckstoss, quellen }, r), quellen };
  }

  const mun = munitionswerte(e, d);
  const kugeln = band && mun?.schrotzahl ? (mun.schrotzahl[band] ?? 1) : 1;
  const umstandBand = band ? reichweitenSteps(w, band, r) : [];
  const sperre: Schussvorschau['sperre'] = e.ladehemmung ? 'ladehemmung' : inhalt <= 0 ? 'leer' : !band ? 'entfernung' : umstandBand === null ? 'band' : null;

  return {
    eintrag: e,
    waffe: w,
    modus: fm,
    band,
    schuesse,
    anzahl_max: anzahlMax,
    probe,
    anfrage,
    haltezahl: halte,
    lh_rate: ladehemmungsRate(fm.lh_prozent, w, e.zustand, trommelmagazin(e, d), r),
    garbenfaktor: burst ? 1 : garbenfaktor(modus, w),
    kugeln,
    ansage_moeglich: !werfer && ansageMoeglich(leiter, geltendeSicht(g, r), r),
    sperre,
    nahkampf: umstaende.some((u) => u.fehlschuss_trifft_beteiligten),
    werfer
  };
}

// ---------- Auswertung

export interface Schusswuerfe {
  wurf: number;
  /** W8 für die Zone (ohne Ansage), beim Fehlschuss in den Nahkampf für den Beteiligten, beim Werfer für die Richtung. */
  w8: number | null;
  /** Rückstoßwürfel (W10), nur bei mehr als einem Schuss. */
  rueckstoss: number | null;
}

export interface Trefferzeile {
  zone: string;
  kugeln: number;
  krit: boolean;
  /** Kugeln aus Folgetreffern (nicht der erste Schuss). */
  folgetreffer: boolean;
}

export interface Schussbericht {
  ladehemmung: Ladehemmung;
  stufe: Ergebnisstufe | null;
  /** Treffer am Ziel, oder beim Fehlschuss in den Nahkampf am anderen Beteiligten. */
  treffer: Trefferzeile[];
  fehlschuss_beteiligter: boolean;
  /** Folgetreffer aus Haltezahl − Rückstoßwürfel (vor der Begrenzung auf die angesagten Schüsse). */
  folgetreffer: number;
  verbraucht: number;
  magazin_vorher: number;
  magazin_nachher: number;
  /** Nur Werfer: Landepunkt nach Ergebnis und (bei Misserfolg) Richtung. */
  landepunkt: { stufe: Ergebnisstufe; richtung: string | null } | null;
}

/** Zone der Ansage „Rumpf“: die Zone, die nur angesagt werden kann. */
function rumpfzone(d: Spieldaten): string {
  return d.koerperzonen.eintraege.find((z) => z.nur_ansage)?.id ?? d.regeln.schiessen.schrot_rumpf_start;
}

/** Zonen der Folgetreffer: dieselbe wie der erste Schuss, außer ein Perk mit „folgetreffer_zonen“ greift (Triple Tap). */
function folgezone(c: Charakter, d: Spieldaten, ansageZone: string | null, erste: string, i: number): string {
  for (const p of perkWirkungen(c, d, 'folgetreffer_zonen'))
    if (ansageZone === p.ansage && p.zonen.length) return p.zonen[Math.min(i, p.zonen.length - 1)]!;
  return erste;
}

/** Fasst Kugeln je Zone zusammen; Krit und Folgetreffer bleiben je Zeile erhalten. */
function zusammenfassen(zeilen: Trefferzeile[]): Trefferzeile[] {
  const aus: Trefferzeile[] = [];
  for (const z of zeilen) {
    const da = aus.find((x) => x.zone === z.zone && x.krit === z.krit && x.folgetreffer === z.folgetreffer);
    if (da) da.kugeln += z.kugeln;
    else aus.push({ ...z });
  }
  return aus;
}

export function schussAuswerten(c: Charakter, d: Spieldaten, v: Schussvorschau, s: Schusseinstellung, w: Schusswuerfe): Schussbericht {
  const r = d.regeln;
  const vorher = v.eintrag.im_magazin;
  const lh = ladehemmung(w.wurf, v.lh_rate, r);
  const leer: Schussbericht = {
    ladehemmung: lh, stufe: null, treffer: [], fehlschuss_beteiligter: false, folgetreffer: 0, verbraucht: 0,
    magazin_vorher: vorher, magazin_nachher: vorher, landepunkt: null
  };
  if (lh !== 'keine') return leer;
  const p = v.probe.wert;
  const stufe: Ergebnisstufe = p && p.moeglich ? auswerten(w.wurf, p) : 'misserfolg';
  const verbraucht = v.schuesse;
  const basis = { ...leer, stufe, verbraucht, magazin_nachher: vorher - verbraucht };

  if (v.werfer) {
    const richtung = stufe === 'misserfolg' && w.w8 ? (r.sprengwirkung.richtungen[w.w8 - 1] ?? null) : null;
    return { ...basis, landepunkt: { stufe, richtung } };
  }

  const fehl = stufe === 'misserfolg';
  if (fehl && !v.nahkampf) return basis;

  // Erste Zone: Ansage (nicht beim Fehlschuss in den Nahkampf) oder W8
  let erste: string;
  if (!fehl && s.ansage === 'rumpf') erste = rumpfzone(d);
  else if (!fehl && s.ansage === 'zone' && s.ansage_zone) erste = s.ansage_zone;
  else erste = zoneAusW8(w.w8 ?? 1, d);

  const anzahl = v.schuesse > 1 && w.rueckstoss !== null && v.haltezahl ? folgetreffer(v.haltezahl.wert, w.rueckstoss) : 0;
  const folge = kugelnDerFolgetreffer(anzahl, v.garbenfaktor, v.schuesse);
  const ansageZone = !fehl && s.ansage === 'zone' ? s.ansage_zone : null;
  const zeilen: Trefferzeile[] = [];
  const schrot = v.kugeln > 1;
  const verteilen = (zone: string, kugeln: number, krit: boolean, ft: boolean) => {
    if (!schrot) { zeilen.push({ zone, kugeln, krit, folgetreffer: ft }); return; }
    // Schrot: jede Kugel eine Zonennummer tiefer; nur die erste Kugel des ersten Schusses kann ein Krit sein.
    // Jede Kugel einer Garbe bringt die volle Schrotzahl noch einmal, in dieselben Zonen (Kampfsystem, Schrotflinten).
    let erst = krit;
    for (let k = 0; k < kugeln; k++) {
      for (const [z, n] of zonenFolge(zone, v.kugeln, d)) {
        if (erst) { zeilen.push({ zone: z, kugeln: 1, krit: true, folgetreffer: ft }); if (n > 1) zeilen.push({ zone: z, kugeln: n - 1, krit: false, folgetreffer: ft }); erst = false; }
        else zeilen.push({ zone: z, kugeln: n, krit: false, folgetreffer: ft });
      }
    }
  };
  verteilen(erste, 1, !fehl && stufe === 'krit', false);
  folge.forEach((k, i) => verteilen(fehl ? erste : folgezone(c, d, ansageZone, erste, i), k, false, true));
  return { ...basis, treffer: zusammenfassen(zeilen), fehlschuss_beteiligter: fehl, folgetreffer: anzahl };
}

/**
 * Schuss übernehmen („Weiter“): Magazin −verbraucht, Ladehemmung an der Waffe, Break −1, Auslöser „geschossen“
 * (wenn ein Schuss abging), Zielen verbraucht bzw. verfallen, Eintrag im Gefechtsprotokoll.
 */
export function schussUebernehmen(c: Charakter, d: Spieldaten, e: WaffenEintrag, b: Schussbericht, text: string[]): Charakter {
  const g = gefechtVon(c);
  const w = waffeVon(e, d);
  const neu: WaffenEintrag = {
    ...e,
    im_magazin: Math.max(0, b.magazin_nachher),
    ladehemmung: b.ladehemmung === 'keine' ? e.ladehemmung : b.ladehemmung,
    ...(istWerfer(w) && b.verbraucht > 0 ? { munitionstyp: '' } : {})
  };
  const waffen = c.ausruestung.waffen.map((x) => (x.id === e.id ? neu : x));
  const zeit = new Date().toISOString();
  let gefecht = c.spielstand.gefecht;
  if (g) {
    const ausloeser = b.verbraucht > 0 && !g.ausloeser_diese_runde.includes(d.regeln.schiessen.ausloeser)
      ? [...g.ausloeser_diese_runde, d.regeln.schiessen.ausloeser] : g.ausloeser_diese_runde;
    gefecht = {
      ...g,
      ausloeser_diese_runde: ausloeser,
      zielen: null,
      verbraucht: { ...g.verbraucht, break: g.verbraucht.break + 1 },
      protokoll: [...g.protokoll, { runde: g.runde, zeit, art: 'schuss', waffe: e.id, text }]
    };
  }
  return { ...c, geaendert: zeit, ausruestung: { ...c.ausruestung, waffen }, spielstand: { ...c.spielstand, gefecht } };
}

/** Kurzinfo zum Magazinstand: „26 / 30+1“. */
export function magazinText(e: WaffenEintrag, d: Spieldaten): string {
  const w = waffeVon(e, d);
  const k = kapazitaet(e, d);
  if (w.ladeart === 'wechselmagazin' && !e.magazin) return e.im_magazin > 0 ? `${e.im_magazin} im Lauf, kein Magazin` : 'kein Magazin';
  return w.patrone_im_lauf ? `${e.im_magazin} / ${k - 1}+1` : `${e.im_magazin} / ${k}`;
}

/**
 * Schild in der Hand beim Schießen (Deckung und Rüstung, Ballistischer Schild; schutz.json `einschraenkung`): Malsteps
 * (`schiessen_malsteps`) und ob die Waffe in der freien Hand erlaubt ist (`waffen`: Waffenkategorien). null = kein Schild in der Hand.
 */
export function schildBeimSchiessen(c: Charakter, w: Waffe, d: Spieldaten): { name: string; malsteps: number; erlaubt: boolean; waffen: string[] } | null {
  const s = gehaltenerSchild(c, d);
  if (!s) return null;
  const e = s.einschraenkung ?? {};
  const waffen = Array.isArray(e.waffen) ? (e.waffen as string[]) : [];
  const malsteps = typeof e.schiessen_malsteps === 'number' ? e.schiessen_malsteps : 0;
  return { name: s.name, malsteps, erlaubt: !waffen.length || waffen.includes(w.kategorie), waffen };
}
