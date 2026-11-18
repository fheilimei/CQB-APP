// Nahkampf (Regelwerk: Kampfsystem, Nahkampf; konzept.md § 3.8b, § 4.12): überlegener Stand, Steps der Verteidigung,
// Schaden einer Nahkampfwaffe, Kampfkunst-Wirkungen. Eingehend (Getroffen → Nahkampf) und ausgehend (Main bzw. Break →
// Nahkampfangriff).

import type { Spieldaten } from '../daten/typen';
import type { Charakter, Gefecht } from '../speicher/charakter';
import { eigenerStand, protokolliere, verbrauchen } from './aktionen';
import { grundwerte } from './modifikatoren';
import { ansageSteps, type Ansage } from './schiessen';
import { aktiverEintrag, waffeVon } from './waffen';
import { staggerRegel } from './wunden';
import { gefechtVon } from './probenrechner';
import type { StepQuelle } from './probe';

/** Wer den überlegenen Stand hat: 'a', 'b' oder null bei gleichem Stand (Stand im Nahkampf, Kreis aus regeln.json). */
export function ueberlegen(a: string, b: string, d: Spieldaten): 'a' | 'b' | null {
  const s = d.regeln.nahkampf.stand_schlaegt;
  if (s[a] === b) return 'a';
  if (s[b] === a) return 'b';
  return null;
}

/** Eine wählbare Nahkampfwaffe; Waffen mit Varianten (Bajonett, Klappspaten) erscheinen je Variante. */
export interface NahkampfwaffenWahl {
  /** Waffen-ID oder „Waffen-ID:Variante“. */
  id: string;
  name: string;
  art: 'stumpf' | 'scharf';
  laenge: 'kurz' | 'mittel' | 'lang';
  mw: number;
  /** null = stumpf (keine DK). */
  dk: number | null;
  /** Angriff mit dieser Kampfkunst (Perk-ID); nur dann gibt es Kampfkunst-Wirkungen (R35). */
  kampfkunst?: string;
}

export function nahkampfwaffenWahl(d: Spieldaten, nur?: (w: Spieldaten['nahkampfwaffen']['eintraege'][number]) => boolean): NahkampfwaffenWahl[] {
  const aus: NahkampfwaffenWahl[] = [];
  for (const w of d.nahkampfwaffen.eintraege) {
    if (nur && !nur(w)) continue;
    if (w.varianten) {
      for (const [vid, v] of Object.entries(w.varianten)) {
        const art = v.art ?? w.art;
        aus.push({ id: `${w.id}:${vid}`, name: `${w.name} (${v.name})`, art, laenge: v.laenge, mw: v.mw, dk: art === 'stumpf' ? null : v.dk });
      }
    } else {
      aus.push({ id: w.id, name: w.name, art: w.art, laenge: w.laenge ?? 'kurz', mw: w.mw ?? 0, dk: w.art === 'stumpf' ? null : (w.dk ?? 0) });
    }
  }
  return aus;
}

/**
 * Treffer einer Nahkampfwaffe: MW = Nahkampfschaden des Angreifers + MW der Waffe; stumpfe Waffen haben keine DK
 * (Kampfsystem, Trefferzone, Schaden und Krit).
 */
export function nahkampfTreffer(w: { art: 'stumpf' | 'scharf'; mw: number; dk: number | null }, nahkampfschaden: number): { dk: number | null; mw: number } {
  return { dk: w.art === 'stumpf' ? null : (w.dk ?? 0), mw: Math.max(0, nahkampfschaden + w.mw) };
}

export interface Verteidigungslage {
  /** Eigener Stand (im Gefecht der Stand des Gefechts). */
  eigenerStand: string;
  gegnerStand: string;
  /** Du verteidigst mit einer langen Waffe gegen einen Gegner in Armeslänge. */
  langeWaffeInArmeslaenge: boolean;
}

/** Verteidigungen dieser Runde bisher (außerhalb des Gefechts 0). */
export function verteidigungenBisher(c: Charakter): number {
  return gefechtVon(c)?.verteidigungen ?? 0;
}

/** Steps, die die Verteidigungsprobe zusätzlich zu Adrenalin, Zuständen usw. bekommt (Lage-Block 1). */
export function verteidigungsSteps(c: Charakter, l: Verteidigungslage, d: Spieldaten): StepQuelle[] {
  const r = d.regeln.nahkampf;
  const aus: StepQuelle[] = [];
  const bisher = verteidigungenBisher(c);
  if (bisher > 0 && r.malsteps_je_weitere_verteidigung > 0) {
    aus.push({ id: 'weitere_verteidigung', herkunft: 'lage', name: bisher === 1 ? 'weitere Verteidigung in dieser Runde' : `${bisher} weitere Verteidigungen in dieser Runde`, malsteps: bisher * r.malsteps_je_weitere_verteidigung });
  }
  if (ueberlegen(l.eigenerStand, l.gegnerStand, d) === 'b' && r.ueberlegener_stand_malsteps > 0) {
    aus.push({ id: 'gegner_ueberlegen', herkunft: 'lage', name: 'Gegner hat den überlegenen Stand', malsteps: r.ueberlegener_stand_malsteps });
  }
  if (l.langeWaffeInArmeslaenge && r.lange_waffe_in_armeslaenge > 0) {
    aus.push({ id: 'lange_waffe', herkunft: 'lage', name: 'lange Waffe in Armeslänge', malsteps: r.lange_waffe_in_armeslaenge });
  }
  return aus;
}

/** Was „Gegner hat 1 Malstep“ ansagt, wenn du den überlegenen Stand hast (0 sonst). */
export function malstepsDesGegners(l: Verteidigungslage, d: Spieldaten): number {
  return ueberlegen(l.eigenerStand, l.gegnerStand, d) === 'a' ? d.regeln.nahkampf.ueberlegener_stand_malsteps : 0;
}

export type Wirkung = Spieldaten['regeln']['nahkampf']['wirkungen'][number];

/**
 * Kampfkunst-Wirkungen aus den eigenen Perks für einen Sieg mit überlegenem Stand (Stand im Nahkampf). Leer, wenn
 * du nicht überlegen warst oder kein Perk den Fall abdeckt. Mehrere Perks mit derselben Wirkung zählen einmal. Mit
 * `nurPerk` zählt nur diese Kampfkunst (Angriff mit einer Kampfkunst, R35).
 */
export function eigeneKampfkunst(c: Charakter, sieger: string, verlierer: string, d: Spieldaten, nurPerk?: string): { wirkung: Wirkung; perks: string[] }[] {
  if (ueberlegen(sieger, verlierer, d) !== 'a') return [];
  const paar = `${sieger}_ueber_${verlierer}`;
  const aus: { wirkung: Wirkung; perks: string[] }[] = [];
  for (const p of d.perks.eintraege) {
    if (!c.perks.includes(p.id) || (nurPerk && p.id !== nurPerk)) continue;
    const name = p.kampfkunst?.[paar];
    const w = name ? d.regeln.nahkampf.wirkungen.find((x) => x.name === name) : undefined;
    if (!w) continue;
    const da = aus.find((x) => x.wirkung.id === w.id);
    if (da) da.perks.push(p.id);
    else aus.push({ wirkung: w, perks: [p.id] });
  }
  return aus;
}

/** Wirkungen, die ein Gegner mit überlegenem Stand gegen dich ansagen kann (alle aus regeln.json; leer ohne Überlegenheit). */
export function gegnerKampfkunst(l: Verteidigungslage, d: Spieldaten): Wirkung[] {
  return ueberlegen(l.eigenerStand, l.gegnerStand, d) === 'b' ? d.regeln.nahkampf.wirkungen : [];
}

/**
 * Ein Nahkampfangriff auf dich, vor dem Schaden: Im Gefecht setzt er den Auslöser „im Nahkampf angegriffen“; hast du
 * dich verteidigt, zählt die Verteidigung für die Runde und eine Aktion mit Konzentration ist unterbrochen.
 */
export function angriffEintragen(c: Charakter, verteidigt: boolean, d: Spieldaten): Charakter {
  const g = gefechtVon(c);
  if (!g) return c;
  const id = d.regeln.nahkampf.ausloeser;
  const ng: Gefecht = {
    ...g,
    ausloeser_diese_runde: g.ausloeser_diese_runde.includes(id) ? g.ausloeser_diese_runde : [...g.ausloeser_diese_runde, id],
    verteidigungen: (g.verteidigungen ?? 0) + (verteidigt ? 1 : 0),
    konzentration: verteidigt ? null : g.konzentration
  };
  return { ...c, geaendert: new Date().toISOString(), spielstand: { ...c.spielstand, gefecht: ng } };
}

/** Folge einer Kampfkunst-Wirkung des Gegners für dich, ohne etwas zu ändern. */
export interface WirkungsFolge {
  /** Neuer Stand (nur im Gefecht), wenn er sich ändert. */
  stand: string | null;
  /** Stagger tritt ein (nicht mit „Schmerz ignorieren“). */
  stagger: boolean;
  /** Stagger verhindert durch ein Symptom. */
  stagger_verhindert: boolean;
}

export function wirkungsFolge(c: Charakter, w: Wirkung, d: Spieldaten): WirkungsFolge {
  const g = gefechtVon(c);
  const stand = g && w.stand_danach && w.stand_danach !== eigenerStand(g, d) ? w.stand_danach : null;
  // Regelfrage R34 (docs/offen.md): vorläufig gilt Schmerz ignorieren („Du erleidest keinen Stagger“) auch für Erschüttern.
  const verhindert = !!w.stagger && staggerRegel(c, d) === 'nie';
  return { stand, stagger: !!w.stagger && !verhindert, stagger_verhindert: verhindert };
}

/** Kampfkunst-Wirkung des Gegners übernehmen: Stand (Umreißen) bzw. Stagger (Erschüttern); sonst nur Hinweis. */
export function gegnerWirkungAnwenden(c: Charakter, w: Wirkung, d: Spieldaten): Charakter {
  const g = gefechtVon(c);
  if (!g) return c;
  const f = wirkungsFolge(c, w, d);
  if (!f.stand && !f.stagger) return c;
  const st = d.regeln.eingehend.ausloeser.stagger;
  const ng: Gefecht = {
    ...g,
    ...(f.stand ? { stand: f.stand } : {}),
    ...(f.stagger
      ? {
          break_verloren: true,
          konzentration: null,
          ausloeser_diese_runde: g.ausloeser_diese_runde.includes(st) ? g.ausloeser_diese_runde : [...g.ausloeser_diese_runde, st]
        }
      : {})
  };
  return { ...c, geaendert: new Date().toISOString(), spielstand: { ...c.spielstand, gefecht: ng } };
}

// ---------- Ausgehend: eigener Nahkampfangriff (konzept.md § 3.8b)

/**
 * Womit du angreifen kannst: Körperwaffen (immer verfügbar), Nahkampfwaffen aus der Ausrüstung (je Variante) und
 * Einsätze mit der aktiven Schusswaffe (Kolben, Lauf, Pistolengriff; `mit_waffe` nennt die Waffenkategorien).
 */
export function angriffsWaffen(c: Charakter, d: Spieldaten): NahkampfwaffenWahl[] {
  const e = aktiverEintrag(c);
  const kategorie = e ? waffeVon(e, d).kategorie : null;
  const eigene = new Set(c.ausruestung.nahkampfwaffen.filter((x) => (x.anzahl ?? 1) > 0).map((x) => x.waffe));
  const liste = nahkampfwaffenWahl(d, (w) =>
    !!w.immer_verfuegbar || (w.mit_waffe ? !!kategorie && w.mit_waffe.includes(kategorie) : eigene.has(w.id)));
  // Regelfrage R35 (entschieden): Kampfkunst nur ohne Nahkampfwaffe. Jede eigene Kampfkunst ist eine eigene Wahl mit
  // den Werten von nahkampf.kampfkunst_waffe (Faust usw.); direkt hinter dieser eingereiht.
  const basis = nahkampfwaffenWahl(d, (w) => w.id === d.regeln.nahkampf.kampfkunst_waffe)[0];
  if (!basis) return liste;
  const kuenste = d.perks.eintraege
    .filter((p) => p.kampfkunst && c.perks.includes(p.id))
    .map((p): NahkampfwaffenWahl => ({ ...basis, id: `kampfkunst:${p.id}`, name: `${p.name} (Kampfkunst)`, kampfkunst: p.id }));
  const i = liste.findIndex((w) => w.id === basis.id);
  return i < 0 ? [...kuenste, ...liste] : [...liste.slice(0, i + 1), ...kuenste, ...liste.slice(i + 1)];
}

/** Bedingung, unter der ein Angriff mit dieser Länge als Breakaction geht; null = nur als Mainaction. */
export function alsBreak(laenge: NahkampfwaffenWahl['laenge'], d: Spieldaten): string | null {
  return d.regeln.nahkampf.als_break[laenge] ?? null;
}

export interface Angriffslage {
  eigenerStand: string;
  gegnerStand: string;
  /** Lange Waffe gegen ein Ziel in Armeslänge. */
  langeWaffeInArmeslaenge: boolean;
  ansage: Ansage;
}

/** Steps der Angriffsprobe zusätzlich zu Adrenalin, Zuständen usw.: überlegener Stand des Gegners, lange Waffe, Ansage. */
export function angriffsSteps(l: Angriffslage, d: Spieldaten): StepQuelle[] {
  const r = d.regeln.nahkampf;
  const aus: StepQuelle[] = [];
  if (ueberlegen(l.eigenerStand, l.gegnerStand, d) === 'b' && r.ueberlegener_stand_malsteps > 0) {
    aus.push({ id: 'gegner_ueberlegen', herkunft: 'lage', name: 'Gegner hat den überlegenen Stand', malsteps: r.ueberlegener_stand_malsteps });
  }
  if (l.langeWaffeInArmeslaenge && r.lange_waffe_in_armeslaenge > 0) {
    aus.push({ id: 'lange_waffe', herkunft: 'lage', name: 'lange Waffe in Armeslänge', malsteps: r.lange_waffe_in_armeslaenge });
  }
  aus.push(...ansageSteps(l.ansage, d.regeln));
  return aus;
}

/** Was beim Ziel ankommt: DK der Waffe (stumpf: keine), MW = eigener Nahkampfschaden + MW der Waffe, Krit-Folge. */
export interface AngriffsTreffer {
  dk: number | null;
  mw: number;
  nahkampfschaden: number;
  /** Krit-Folge beim Ziel, wenn der Treffer kritisch ist (scharf: Spalte „Krit“ der Zone; stumpf: Stagger). */
  krit_folge: string;
}

export function angriffsTreffer(c: Charakter, w: NahkampfwaffenWahl, zone: string, d: Spieldaten): AngriffsTreffer {
  const nks = grundwerte(c, d).nahkampfschaden;
  const t = nahkampfTreffer(w, nks);
  const z = d.koerperzonen.eintraege.find((x) => x.id === zone);
  const krit_folge = w.art === 'stumpf' ? d.regeln.nahkampf.krit_stumpf : (z?.krit.text ?? '');
  return { ...t, nahkampfschaden: nks, krit_folge };
}

/** Eigenen Nahkampfangriff übernehmen: Main bzw. Break −1 und Eintrag im Gefechtsprotokoll. Keine eigenen Auslöser. */
export function angriffUebernehmen(c: Charakter, als: 'main' | 'break', text: string): Charakter {
  return protokolliere(verbrauchen(c, als), text);
}
