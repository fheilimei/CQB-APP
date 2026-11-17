// Schreibmodus (konzept.md § 3.0a): Werte direkt ändern, ohne Punktkosten und ohne Prüfung der Voraussetzungen.
// Jede Änderung wird mit art „korrektur“ protokolliert (vorher, nachher). Geänderte Werte werden markiert (✎).

import type { Rang } from '../daten/typen';
import type { Abweichungswurf, Anpassung, Charakter } from '../speicher/charakter';

export type Korrektur =
  | { art: 'rang'; id: string; rang: Rang }
  | { art: 'wurf'; id: string; wurf: Abweichungswurf }
  | { art: 'skill'; id: string; stufe: number }
  | { art: 'perk'; id: string; hat: boolean }
  | { art: 'freie_punkte'; wert: number }
  | { art: 'vorratslevel'; wert: number | null }
  | { art: 'text'; feld: 'name' | 'aussehen' | 'notizen'; wert: string }
  | { art: 'hintergrund'; feld: 'geburtsort' | 'personen' | 'lebensmittelpunkt'; wert: string }
  /** Grundwert von Hand setzen; null = wieder berechnen lassen (Markierung entfällt). */
  | { art: 'grundwert'; id: string; wert: number | string | null };

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
    case 'grundwert':
      return `grundwerte.${k.id}`;
    case 'text':
    case 'hintergrund':
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
    case 'hintergrund':
      vorher = c.hintergrund[k.feld];
      nachher = k.wert;
      x = { ...c, hintergrund: { ...c.hintergrund, [k.feld]: k.wert } };
      break;
    case 'grundwert': {
      vorher = c.grundwerte_manuell[k.id] ?? null;
      nachher = k.wert;
      const g = { ...c.grundwerte_manuell };
      if (k.wert === null) delete g[k.id];
      else g[k.id] = k.wert;
      x = { ...c, grundwerte_manuell: g };
      break;
    }
  }
  if (JSON.stringify(vorher) === JSON.stringify(nachher)) return c;
  const pfad = pfadVon(k);
  const zeit = jetzt.toISOString();
  // Ein zurückgesetzter Grundwert gilt wieder als berechnet und trägt keine Markierung mehr.
  const zurueck = k.art === 'grundwert' && k.wert === null;
  const ueberschrieben = !pfad ? c.ueberschrieben
    : zurueck ? c.ueberschrieben.filter((p) => p !== pfad)
    : c.ueberschrieben.includes(pfad) ? c.ueberschrieben : [...c.ueberschrieben, pfad];
  const protokollPfad = pfad ?? (k.art === 'text' ? k.feld : k.art === 'hintergrund' ? `hintergrund.${k.feld}` : k.art);
  return {
    ...x,
    geaendert: zeit,
    ueberschrieben,
    protokoll: [...c.protokoll, { zeit, art: 'korrektur', pfad: protokollPfad, vorher, nachher }]
  };
}

/** Dauerhafte Anpassungen der SL anlegen, ändern, ab- und anschalten, löschen (konzept.md § 3.0a). */
export type Anpassungsaktion =
  | { art: 'neu'; anpassung: Omit<Anpassung, 'id' | 'aktiv'> }
  | { art: 'aktiv'; id: string; aktiv: boolean }
  | { art: 'loeschen'; id: string };

/** Führt eine Anpassungsaktion aus und protokolliert sie mit art „anpassung“ (vorher, nachher). */
export function anpassen(c: Charakter, a: Anpassungsaktion, jetzt: Date = new Date(), neueId?: string): Charakter {
  const zeit = jetzt.toISOString();
  let liste: Anpassung[];
  let vorher: Anpassung | null = null;
  let nachher: Anpassung | null = null;
  switch (a.art) {
    case 'neu': {
      const id = neueId ?? freieId(c);
      nachher = { ...a.anpassung, id, aktiv: true };
      liste = [...c.anpassungen, nachher];
      break;
    }
    case 'aktiv':
      vorher = c.anpassungen.find((x) => x.id === a.id) ?? null;
      if (!vorher || vorher.aktiv === a.aktiv) return c;
      nachher = { ...vorher, aktiv: a.aktiv };
      liste = c.anpassungen.map((x) => (x.id === a.id ? nachher! : x));
      break;
    case 'loeschen':
      vorher = c.anpassungen.find((x) => x.id === a.id) ?? null;
      if (!vorher) return c;
      liste = c.anpassungen.filter((x) => x.id !== a.id);
      break;
  }
  return {
    ...c,
    geaendert: zeit,
    anpassungen: liste,
    protokoll: [...c.protokoll, { zeit, art: 'anpassung', aktion: a.art, vorher, nachher }]
  };
}

/** Kleinste freie ID der Form a1, a2 … */
function freieId(c: Charakter): string {
  const belegt = new Set(c.anpassungen.map((x) => x.id));
  let n = 1;
  while (belegt.has(`a${n}`)) n++;
  return `a${n}`;
}
