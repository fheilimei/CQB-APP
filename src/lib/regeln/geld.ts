// Geld (konzept.md § 3.13): Der Kontostand ist die Summe aller Buchungen im Kassenbuch und wird nie gespeichert.

import type { Charakter } from '../speicher/charakter';

/** Kontostand = Summe aller Buchungen. */
export function kontostand(c: Pick<Charakter, 'kassenbuch'>): number {
  return c.kassenbuch.reduce((s, b) => s + b.betrag, 0);
}
