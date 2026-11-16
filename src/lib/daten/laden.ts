// Lädt die Spieldaten zur Laufzeit aus public/data/ (vom Service Worker offline gehalten) und prüft sie.

import { pruefeDaten } from './pruefen';
import { DATEIEN, type Spieldaten } from './typen';

export interface Ladeergebnis {
  daten: Spieldaten;
  /** Fehler der Datenprüfung; leer heißt: alles in Ordnung. */
  fehler: string[];
}

export async function ladeSpieldaten(basis: string = import.meta.env.BASE_URL): Promise<Ladeergebnis> {
  const eintraege = await Promise.all(
    DATEIEN.map(async (name) => {
      const antwort = await fetch(`${basis}data/${name}.json`);
      if (!antwort.ok) throw new Error(`Datei ${name}.json konnte nicht geladen werden (${antwort.status}).`);
      return [name, await antwort.json()] as const;
    })
  );
  const daten = Object.fromEntries(eintraege) as unknown as Spieldaten;
  return { daten, fehler: pruefeDaten(daten) };
}

/** Datenstand für die Anzeige „Über die App“: das jüngste Versionsdatum aller Dateien. */
export function datenstand(daten: Spieldaten): string {
  return DATEIEN.map((n) => (daten[n] as { version: string }).version).sort().at(-1) ?? '';
}
