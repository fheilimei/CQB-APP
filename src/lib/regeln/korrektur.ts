// Schreibmodus (konzept.md § 3.0a): Werte direkt ändern, ohne Punktkosten und ohne Prüfung der Voraussetzungen.
// Jede Änderung wird mit art „korrektur“ protokolliert (vorher, nachher). Geänderte Werte werden markiert (✎).

import type { Rang } from '../daten/typen';
import type { Abweichungswurf, Charakter } from '../speicher/charakter';

export type Korrektur =
  | { art: 'rang'; id: string; rang: Rang }
  | { art: 'wurf'; id: string; wurf: Abweichungswurf }
  | { art: 'skill'; id: string; stufe: number }
  | { art: 'perk'; id: string; hat: boolean }
  | { art: 'freie_punkte'; wert: number }
  | { art: 'vorratslevel'; wert: number | null }
  | { art: 'text'; feld: 'name' | 'aussehen' | 'notizen'; wert: string };

/** Pfad des Werts, wie er in `ueberschrieben` steht (datenformat.md § Charakter). Texte werden nicht markiert. */
export function pfadVon(k: Korrektur): string | null {
  switch (k.art) {
    case 'rang':
    case 'wurf':
      return `stats.${k.id}`;
    case 'skill':
      return `skills.${k.id}`;
    case 'perk':
      return `perks.${k.id}`;
    case 'freie_punkte':
      return 'freie_punkte';
    case 'vorratslevel':
      return 'vorratslevel';
    case 'text':
      return null;
  }
}

export function korrigiere(c: Charakter, k: Korrektur, jetzt: Date = new Date()): Charakter {
  let x: Charakter;
  let vorher: unknown;
  let nachher: unknown;
  switch (k.art) {
    case 'rang':
      vorher = c.stats[k.id]?.rang ?? null;
      nachher = k.rang;
      x = { ...c, stats: { ...c.stats, [k.id]: { ...c.stats[k.id]!, rang: k.rang } } };
      break;
    case 'wurf':
      vorher = c.stats[k.id]?.wurf ?? null;
      nachher = { ...k.wurf, quelle: 'hand' };
      x = { ...c, stats: { ...c.stats, [k.id]: { ...c.stats[k.id]!, wurf: nachher as Abweichungswurf } } };
      break;
    case 'skill': {
      vorher = c.skills[k.id] ?? 0;
      nachher = k.stufe;
      const skills = { ...c.skills };
      if (k.stufe > 0) skills[k.id] = k.stufe;
      else delete skills[k.id];
      x = { ...c, skills };
      break;
    }
    case 'perk':
      vorher = c.perks.includes(k.id);
      nachher = k.hat;
      x = { ...c, perks: k.hat ? [...new Set([...c.perks, k.id])] : c.perks.filter((p) => p !== k.id) };
      break;
    case 'freie_punkte':
      vorher = c.freie_punkte;
      nachher = k.wert;
      x = { ...c, freie_punkte: k.wert };
      break;
    case 'vorratslevel':
      vorher = c.vorratslevel_manuell;
      nachher = k.wert;
      x = { ...c, vorratslevel_manuell: k.wert };
      break;
    case 'text':
      vorher = c[k.feld];
      nachher = k.wert;
      x = { ...c, [k.feld]: k.wert };
      break;
  }
  if (JSON.stringify(vorher) === JSON.stringify(nachher)) return c;
  const pfad = pfadVon(k);
  const zeit = jetzt.toISOString();
  return {
    ...x,
    geaendert: zeit,
    ueberschrieben: pfad && !c.ueberschrieben.includes(pfad) ? [...c.ueberschrieben, pfad] : c.ueberschrieben,
    protokoll: [...c.protokoll, { zeit, art: 'korrektur', pfad: pfad ?? (k.art === 'text' ? k.feld : k.art), vorher, nachher }]
  };
}
