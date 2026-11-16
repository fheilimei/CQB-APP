// Lädt die echten Spieldaten aus public/data/ für Tests.
import { readFileSync } from 'node:fs';
import { DATEIEN, type Spieldaten } from '../src/lib/daten/typen';

export function ladeTestdaten(): Spieldaten {
  const eintraege = DATEIEN.map((n) => [n, JSON.parse(readFileSync(new URL(`../public/data/${n}.json`, import.meta.url), 'utf-8'))]);
  return Object.fromEntries(eintraege) as Spieldaten;
}
