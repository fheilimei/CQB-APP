// Migration älterer Schemaversionen (docs/datenformat.md § Migration).
// Für jeden Schritt n → n+1 steht hier eine Funktion; die Liste wird der Reihe nach angewandt.

import { neueErstellung, SCHEMA, type Charakter } from './charakter';

type Roh = Record<string, unknown> & { schema?: unknown };

/** MIGRATIONEN[n] hebt einen Charakter von Schema n auf n+1. */
export const MIGRATIONEN: Record<number, (c: Roh) => Roh> = {
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
};

export class ImportFehler extends Error {}

/** Prüft die Grundform und bringt den Charakter auf das aktuelle Schema. Verändert die Eingabe nicht. */
export function migriere(roh: unknown, ziel: number = SCHEMA, migrationen = MIGRATIONEN): Charakter {
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
    c = schritt(c);
    c.schema = v + 1;
  }
  if (typeof c.id !== 'string' || !c.id) throw new ImportFehler('Der Charakter hat keine ID.');
  if (typeof c.name !== 'string') throw new ImportFehler('Der Charakter hat keinen Namen.');
  if (typeof c.stats !== 'object' || c.stats === null) throw new ImportFehler('Dem Charakter fehlen die Stats.');
  return c as unknown as Charakter;
}
