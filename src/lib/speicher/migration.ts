// Migration älterer Schemaversionen (docs/datenformat.md § Migration).
// Für jeden Schritt n → n+1 steht hier eine Funktion; die Liste wird der Reihe nach angewandt.

import type { Spieldaten } from '../daten/typen';
import { neueErstellung, SCHEMA, type Charakter, type MunitionEintrag } from './charakter';

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
};

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
    const erweitert = aufsaetze.map((id) => d.aufsaetze.eintraege.find((x) => x.id === id)?.werte?.magazin).find((n) => n);
    const groesse = erweitert ?? w?.magazin ?? 0;
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
