// Migration älterer Schemaversionen (docs/datenformat.md § Migration).
// Für jeden Schritt n → n+1 steht hier eine Funktion; die Liste wird der Reihe nach angewandt.

import type { MagazinSorte, Spieldaten } from '../daten/typen';
import { leererKorb, neueErstellung, SCHEMA, type Charakter, type Magazin, type MunitionEintrag, type Teil } from './charakter';

type Roh = Record<string, unknown> & { schema?: unknown };

/** MIGRATIONEN[n] hebt einen Charakter von Schema n auf n+1. */
export const MIGRATIONEN: Record<number, (c: Roh, d?: Spieldaten) => Roh> = {
  // 1 → 2: Stand der Erstellung und Vorratslevel von Hand. Ein Entwurf aus Schema 1 hatte nur Name und Aussehen.
  1: (c) => ({
    ...c,
    erstellung: c.status === 'erstellung' ? neueErstellung() : null,
    vorratslevel_manuell: null
  }),
  // 2 → 3: Die Deckung gilt auch außerhalb des Gefechts und liegt jetzt im Spielstand statt im Gefecht.
  2: (c) => {
    const sp = (c.spielstand ?? {}) as Record<string, unknown>;
    const g = (sp.gefecht ?? { aktiv: false }) as Record<string, unknown>;
    const { deckung, ...rest } = g;
    return { ...c, spielstand: { ...sp, gefecht: rest, deckung: deckung ?? null } };
  },
  // 3 → 4: Die Deckungskante entfällt; Deckung entsteht nur durch Antippen. Alle bisher verdeckten Zonen gelten als angetippt.
  3: (c) => {
    const sp = (c.spielstand ?? {}) as Record<string, unknown>;
    const dg = sp.deckung as (Record<string, unknown> & { zonen?: string[]; getippt?: string[] }) | null | undefined;
    if (!dg) return c;
    const { kante: _kante, ...rest } = dg;
    const getippt = [...new Set([...(dg.getippt ?? []), ...(dg.zonen ?? [])])];
    return { ...c, spielstand: { ...sp, deckung: { ...rest, getippt } } };
  },
  // 4 → 5: Der Stat „Decisiveness“ heißt jetzt „Decision“. Die alte ID wird überall ersetzt, als Schlüssel und als Wert.
  4: (c) => benenneUm(c, 'decisiveness', 'decision') as Roh,
  // 5 → 6: Munition je Magazin, lose Munition und Aufsätze, Zustand für alles Dauerhafte (konzept.md § 3.8, R42).
  5: (c, d) => auf6(c, d),
  // 6 → 7: Ein Entwurf bekommt den Korb für Schritt 7 (Laden bei der Erstellung), anfangs leer.
  6: (c) => {
    const e = c.erstellung as Record<string, unknown> | null | undefined;
    return e ? { ...c, erstellung: { ...e, korb: e.korb ?? leererKorb() } } : c;
  },
  // 7 → 8: Magazine als eigene Gegenstände beim Charakter (magazine.json; konzept.md § 3.8, R49).
  7: (c, d) => auf8(c, d)
};

type Alt7Mag = { inhalt: number; typ: string; zustand: string };
type Alt7Waffe = Record<string, unknown> & {
  waffe: string; magazin_zustand?: string; magazine?: Alt7Mag[]; zubehoer?: (Alt7Mag & { art: string })[]; aufsaetze?: Teil[];
};

/** Magazinsorte zu einer früheren Aufsatz- bzw. Zubehör-ID (oder heutigen ID), bevorzugt eine, die an die Waffe passt. */
function sorteZu(alt: string, waffe: string | null, d: Spieldaten): MagazinSorte | null {
  const kandidaten = d.magazine.eintraege.filter((m) => m.id === alt || m.alte_ids?.includes(alt));
  return kandidaten.find((m) => waffe && m.passt_an.includes(waffe)) ?? kandidaten[0] ?? null;
}

/**
 * Schema 7 → 8. Erweiterte Magazine und Trommeln waren Aufsätze; Ersatzmagazine, Schnelllader und Ladestreifen hingen an
 * einer Waffe. Jetzt steckt in einer Waffe mit Wechselmagazin ein Magazin einer Sorte (das angebrachte erweiterte
 * Magazin, sonst das Standardmagazin); ihre Ersatzmagazine haben dieselbe Sorte, weil sie bisher dieselbe Größe hatten.
 * Alle Ersatzmagazine, Schnelllader und Ladestreifen kommen zu `ausruestung.magazine`; lose erweiterte Magazine werden
 * leere Magazine. Im Korb der Erstellung werden Magazine, Zubehör und erweiterte Magazine zu Magazinsorten.
 */
function auf8(c: Roh, d?: Spieldaten): Roh {
  if (!d) throw new ImportFehler('Zum Umstellen dieses Charakters fehlen die Spieldaten.');
  const neu = d.regeln.waffenzustand.neu;
  const a = (c.ausruestung ?? {}) as Record<string, unknown>;
  const magazine: Magazin[] = [];
  const waffen = ((a.waffen ?? []) as Alt7Waffe[]).map((e) => {
    const { magazin_zustand, magazine: ersatz = [], zubehoer = [], aufsaetze = [], ...rest } = e;
    const w = d.waffen.eintraege.find((x) => x.id === e.waffe);
    const magAufsatz = aufsaetze.map((t) => ({ t, s: d.aufsaetze.eintraege.some((x) => x.id === t.id) ? null : sorteZu(t.id, e.waffe, d) })).find((x) => x.s);
    const bleiben = aufsaetze.filter((t) => t !== magAufsatz?.t);
    const sorte = magAufsatz?.s?.id ?? w?.standardmagazin;
    for (const m of ersatz) if (sorte) magazine.push({ id: sorte, inhalt: m.inhalt, typ: m.typ, zustand: m.zustand ?? neu });
    for (const z of zubehoer) {
      const s = sorteZu(z.art, e.waffe, d);
      if (s) magazine.push({ id: s.id, inhalt: z.inhalt, typ: z.typ, zustand: z.zustand ?? neu });
    }
    const eintrag: Record<string, unknown> = { ...rest, aufsaetze: bleiben };
    if (w?.ladeart === 'wechselmagazin' && sorte) eintrag.magazin = { id: sorte, zustand: magAufsatz?.t.zustand ?? magazin_zustand ?? neu };
    return eintrag;
  });
  const lose: Teil[] = [];
  for (const t of (a.aufsaetze ?? []) as Teil[]) {
    const s = d.aufsaetze.eintraege.some((x) => x.id === t.id) ? null : sorteZu(t.id, null, d);
    if (s) magazine.push({ id: s.id, inhalt: 0, typ: '', zustand: t.zustand });
    else lose.push(t);
  }
  let erstellung = c.erstellung as (Record<string, unknown> & { korb?: { kauf?: Record<string, unknown>[] } }) | null | undefined;
  if (erstellung?.korb?.kauf) {
    const kauf = erstellung.korb.kauf.flatMap((p) => {
      const { ziel: _ziel, ...rest } = p;
      const [art, id = ''] = String(p.ware).split(':');
      let sorte: string | null | undefined;
      if (art === 'magazin') sorte = d.waffen.eintraege.find((w) => w.id === id)?.standardmagazin ?? sorteZu(id, null, d)?.id;
      else if (art === 'zubehoer' || (art === 'aufsatz' && !d.aufsaetze.eintraege.some((x) => x.id === id))) sorte = sorteZu(id, null, d)?.id;
      else return [rest];
      return sorte ? [{ ...rest, ware: `magazin:${sorte}` }] : [];
    });
    erstellung = { ...erstellung, korb: { ...erstellung.korb, kauf } };
  }
  return { ...c, ...(erstellung ? { erstellung } : {}), ausruestung: { ...a, waffen, magazine, aufsaetze: lose } };
}

type Alt5Waffe = Record<string, unknown> & {
  waffe: string; munitionstyp?: string; reserve?: number[]; lose_patronen?: number; leere_magazine?: number;
  zubehoer?: { art: string; gefuellt: number; leer: number }[]; aufsaetze?: string[];
};

/**
 * Schema 5 → 6. Der bisherige Munitionstyp der Waffe gilt für alle ihre Magazine, Schnelllader und losen Patronen;
 * lose Patronen wandern zum Charakter (nach Kaliber und Typ). Leere Magazine werden Magazine mit Inhalt 0.
 * Alles Dauerhafte bekommt den Zustand „neu“. Braucht die Spieldaten für das Kaliber jeder Waffe.
 */
function auf6(c: Roh, d?: Spieldaten): Roh {
  if (!d) throw new ImportFehler('Zum Umstellen dieses Charakters fehlen die Spieldaten.');
  const neu = d.regeln.waffenzustand.neu;
  const a = (c.ausruestung ?? {}) as Record<string, unknown>;
  const munition: MunitionEintrag[] = [];
  const waffen = ((a.waffen ?? []) as Alt5Waffe[]).map((e) => {
    const { reserve = [], lose_patronen = 0, leere_magazine = 0, zubehoer = [], aufsaetze = [], ...rest } = e;
    const w = d.waffen.eintraege.find((x) => x.id === e.waffe);
    const typ = e.munitionstyp ?? '';
    const kaliber = w && !Array.isArray(w.munition) ? w.munition : null;
    if (kaliber && lose_patronen > 0) {
      const da = munition.find((m) => m.kaliber === kaliber && m.typ === typ);
      if (da) da.anzahl += lose_patronen;
      else munition.push({ kaliber, typ, anzahl: lose_patronen });
    }
    // Schnelllader und Ladestreifen gibt es nur an Waffen ohne Wechselmagazin, also ohne erweitertes Magazin.
    const groesse = w?.magazin ?? 0;
    return {
      ...rest,
      munitionstyp: typ,
      ...(w?.ladeart === 'wechselmagazin' ? { magazin_zustand: neu } : {}),
      magazine: [
        ...reserve.filter((n) => n > 0).map((n) => ({ inhalt: n, typ, zustand: neu })),
        ...Array.from({ length: leere_magazine }, () => ({ inhalt: 0, typ: '', zustand: neu }))
      ],
      zubehoer: zubehoer.flatMap((z) => [
        ...Array.from({ length: z.gefuellt }, () => ({ art: z.art, inhalt: groesse, typ, zustand: neu })),
        ...Array.from({ length: z.leer }, () => ({ art: z.art, inhalt: 0, typ: '', zustand: neu }))
      ]),
      aufsaetze: aufsaetze.map((id) => ({ id, zustand: neu }))
    };
  });
  const schild = a.schild as string | null | undefined;
  return {
    ...c,
    ausruestung: {
      ...a,
      waffen,
      nahkampfwaffen: ((a.nahkampfwaffen ?? []) as Record<string, unknown>[]).map((n) => ({ ...n, zustand: neu })),
      munition,
      aufsaetze: [],
      ruestung: ((a.ruestung ?? []) as string[]).map((id) => ({ id, zustand: neu })),
      schild: schild ? { id: schild, zustand: neu } : null
    }
  };
}

/** Ersetzt eine umbenannte ID überall im Charakter: als Schlüssel eines Objekts und als Zeichenkette. */
function benenneUm(wert: unknown, alt: string, neu: string): unknown {
  if (wert === alt) return neu;
  if (Array.isArray(wert)) return wert.map((w) => benenneUm(w, alt, neu));
  if (typeof wert === 'object' && wert !== null)
    return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k === alt ? neu : k, benenneUm(v, alt, neu)]));
  return wert;
}

export class ImportFehler extends Error {}

/**
 * Prüft die Grundform und bringt den Charakter auf das aktuelle Schema. Verändert die Eingabe nicht.
 * Manche Schritte brauchen die Spieldaten (5 → 6: Kaliber der Waffen).
 */
export function migriere(roh: unknown, d?: Spieldaten, ziel: number = SCHEMA, migrationen = MIGRATIONEN): Charakter {
  if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) throw new ImportFehler('Die Datei enthält keinen Charakter.');
  let c = structuredClone(roh) as Roh;
  const version = c.schema;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    throw new ImportFehler('Die Datei enthält keinen Charakter (Schemaversion fehlt).');
  if (version > ziel)
    throw new ImportFehler(`Der Charakter stammt aus einer neueren App-Version (Schema ${version}). Bitte zuerst die App aktualisieren.`);
  for (let v = version; v < ziel; v++) {
    const schritt = migrationen[v];
    if (!schritt) throw new ImportFehler(`Keine Migration von Schema ${v} auf ${v + 1} vorhanden.`);
    c = schritt(c, d);
    c.schema = v + 1;
  }
  if (typeof c.id !== 'string' || !c.id) throw new ImportFehler('Der Charakter hat keine ID.');
  if (typeof c.name !== 'string') throw new ImportFehler('Der Charakter hat keinen Namen.');
  if (typeof c.stats !== 'object' || c.stats === null) throw new ImportFehler('Dem Charakter fehlen die Stats.');
  return c as unknown as Charakter;
}
