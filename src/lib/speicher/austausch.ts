// Export und Import einzelner Charaktere als JSON-Datei (<name>.cqb.json).

import type { Charakter } from './charakter';
import { ImportFehler, migriere } from './migration';

export function exportiereText(c: Charakter): string {
  return JSON.stringify(c, null, 2);
}

/** Dateiname aus dem Namen: Umlaute ausgeschrieben, sonst nur Buchstaben, Ziffern und Bindestrich. */
export function dateiname(c: Charakter): string {
  const basis = (c.name || 'charakter')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${basis || 'charakter'}.cqb.json`;
}

/** Liest eine Exportdatei; wirft ImportFehler mit lesbarer Meldung. */
export function importiereText(text: string): Charakter {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    throw new ImportFehler('Die Datei ist keine gültige Charakterdatei (kein JSON).');
  }
  return migriere(roh);
}
