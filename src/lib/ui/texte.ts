// Textbausteine der Oberfläche, gesammelt an einer Stelle (konzept.md § 3.0c). Begriffe wie im Regelwerk.

import type { Modifikator, Rang, Spieldaten } from '../daten/typen';
import type { Sperre } from '../regeln/aufstieg';
import type { Fehlt } from '../regeln/erstellung';
import type { Ergebnisstufe } from '../regeln/probe';
import type { Abweichungswurf } from '../speicher/charakter';

/** Modus eines fertigen Charakters (konzept.md § 3.0a); wird nicht gespeichert. */
export type Modus = 'lesen' | 'aufstieg' | 'schreiben';
export const MODUS_NAME: Record<Modus, string> = { lesen: '', aufstieg: 'Aufstieg', schreiben: 'Schreibmodus' };

/** Eine Zeile eines Berichts (konzept.md § 3.0c); wichtige Zeilen fett. */
export interface Zeile { text: string; fett?: boolean }

export const statName = (id: string, d: Spieldaten) => d.stats.eintraege.find((s) => s.id === id)?.name ?? id;
export const skillName = (id: string, d: Spieldaten) => d.skills.eintraege.find((s) => s.id === id)?.name ?? id;
export const perkName = (id: string, d: Spieldaten) => d.perks.eintraege.find((s) => s.id === id)?.name ?? id;
export const klasseName = (id: string, d: Spieldaten) => d.klassen.eintraege.find((k) => k.id === id)?.name ?? id;
export const stufeName = (stufe: number, d: Spieldaten) => d.klassen.stufen.find((s) => s.stufe === stufe)?.name ?? `Stufe ${stufe}`;
export const laufbahnName = (id: string, d: Spieldaten) => d.klassen.laufbahnen.find((l) => l.id === id)?.name ?? id;

/** Name mit Zeichen der Begriffsart, für reinen Text (Hinweise, Berichte). */
export function mitZeichen(art: 'stat' | 'skill' | 'perk', id: string, d: Spieldaten): string {
  const name = art === 'stat' ? statName(id, d) : art === 'skill' ? skillName(id, d) : perkName(id, d);
  return `${d.darstellung.typen[art].zeichen} ${name}`;
}

export const punkte = (n: number) => `${n} ${Math.abs(n) === 1 ? 'Punkt' : 'Punkte'}`;
export const vorzeichen = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');
export const rangText = (r: Rang, d: Spieldaten) => `${r} (${d.regeln.raenge[r]})`;
export const wurfText = (w: Abweichungswurf) => `${w.positiv} − ${w.negativ}`;
export const geld = (n: number) => `${n.toLocaleString('de-DE')} $`;

export const grundwertName = (id: string, d: Spieldaten) => d.darstellung.grundwerte[id] ?? id;
export const bandName = (id: string, d: Spieldaten) => d.regeln.schiessen.reichweitenbaender.find((b) => b.id === id)?.name ?? id;

/** Wert eines Grundwerts zum Anzeigen; die Wurfweite ist ein Band. */
export const grundwertWert = (wert: number | string, d: Spieldaten) => (typeof wert === 'string' ? bandName(wert, d) : String(wert));

/** Wirkung eines Modifikators: „+1“, „▲1“ (Stepshields), „▼1“ (Malsteps), „Krit-Schwelle +1“; Wurfweite in Bändern. */
export function wirkungText(m: Modifikator): string {
  const w = m.wirkung;
  if (w.wert !== undefined) return m.ziel.id === 'wurfweite_band' ? `${vorzeichen(w.wert)} ${Math.abs(w.wert) === 1 ? 'Band' : 'Bänder'}` : vorzeichen(w.wert);
  if (w.stepshields !== undefined) return w.stepshields >= 0 ? `▲${w.stepshields}` : `▼${-w.stepshields}`;
  if (w.malsteps !== undefined) return w.malsteps >= 0 ? `▼${w.malsteps}` : `▲${-w.malsteps}`;
  if (w.krit_schwelle !== undefined) return `Krit-Schwelle ${vorzeichen(w.krit_schwelle)}`;
  return '';
}

/** Worauf ein Modifikator wirkt, mit Zeichen der Begriffsart; Bedingungen in Klammern. */
export function zielText(m: Modifikator, d: Spieldaten): string {
  const z = m.ziel;
  let text: string;
  switch (z.art) {
    case 'grundwert': text = grundwertName(z.id ?? '', d); break;
    case 'stat': text = `Proben auf ${mitZeichen('stat', z.id ?? '', d)}`; break;
    case 'skill': text = `Proben mit ${mitZeichen('skill', z.id ?? '', d)}`; break;
    case 'probe': text = d.darstellung.proben[z.id ?? ''] ?? z.id ?? ''; break;
    case 'alle': text = 'alle Proben'; break;
  }
  const wenn = bedingungText(m, d);
  return wenn ? `${text} (${wenn})` : text;
}

/** Bedingung eines Modifikators als kurzer Text, leer ohne Bedingung. */
export function bedingungText(m: Modifikator, d: Spieldaten): string {
  const b = m.bedingung;
  const wenn: string[] = [];
  if (b?.skill) wenn.push(`mit ${mitZeichen('skill', b.skill, d)}`);
  if (b?.baender?.length) wenn.push(b.baender.map((x) => bandName(x, d)).join(', '));
  if (b?.stand) wenn.push(b.stand);
  if (b?.ohne_bewegung) wenn.push('ohne Bewegung');
  if (b?.aufgelegt) wenn.push('aufgelegt');
  return wenn.join('; ');
}

/** Warum ein Kauf nicht geht, als kurzer Hinweis. */
export function sperreText(sperre: Sperre, kosten: number, perkId: string | null, freie: number, d: Spieldaten,
  statwertVon: (id: string) => number | null, hatPerk: (id: string) => boolean): string {
  switch (sperre) {
    case null: return '';
    case 'punkte': return `braucht ${punkte(kosten)}, ${punkte(freie)} frei`;
    case 'maximum': return 'höchste Stufe erreicht';
    case 'vorhanden': return 'schon vorhanden';
    case 'kein_zugang': return 'nicht im Zugang der Klasse';
    case 'unbekannt': return 'unbekannt';
    case 'voraussetzung': {
      const p = d.perks.eintraege.find((x) => x.id === perkId);
      if (!p) return 'Voraussetzung fehlt';
      const fehlt = [
        ...p.voraussetzung.stats.filter((v) => (statwertVon(v.stat) ?? 0) < v.min).map((v) => `${mitZeichen('stat', v.stat, d)} ${v.min}`),
        ...p.voraussetzung.perks.filter((id) => !hatPerk(id)).map((id) => mitZeichen('perk', id, d))
      ];
      return `braucht ${fehlt.join(', ')}`;
    }
  }
}

/** Was im Schritt der Erstellung noch fehlt; steht auf dem Knopf „Weiter“. */
export function fehltText(f: Fehlt, d: Spieldaten): string {
  switch (f.art) {
    case 'name': return 'Name fehlt';
    case 'klasse': return 'Klasse wählen';
    case 'stufe4': return 'Stufe-4-Klasse wählen';
    case 'raenge_offen': return `Noch zu vergeben: ${f.raenge.join(', ')}`;
    case 'rang_fehlt': return `Rang fehlt bei ${f.stats.length === 1 ? statName(f.stats[0]!, d) : `${f.stats.length} Stats`}`;
    case 'stat_rang': return `${statName(f.stat, d)} braucht Rang ${f.rang}`;
    case 'abweichung': return `Abweichung fehlt bei ${f.stats.length === 1 ? statName(f.stats[0]!, d) : `${f.stats.length} Stats`}`;
    case 'meister_wahl': return `${f.anzahl} Skills auf ${f.wert} wählen`;
    case 'meister_exklusiv': return 'Ein Skill muss exklusiv sein';
    case 'kaeufe_ungueltig': return f.anzahl === 1 ? '1 Kauf ist ungültig' : `${f.anzahl} Käufe sind ungültig`;
    case 'punkte_negativ': return 'Zu viele Punkte ausgegeben';
    case 'frist': return 'Frist der Schulden fehlt';
  }
}

// ---- Proben, Adrenalin und Ruhepuls (konzept.md § 3.6, § 3.7)

export const ERGEBNIS_NAME: Record<Ergebnisstufe, string> = { krit: 'Krit', erfolg: 'Erfolg', misserfolg: 'Misserfolg' };
/** Ergebnis im Satz („Deine Probe ist …“). */
export const ERGEBNIS_SATZ: Record<Ergebnisstufe, string> = { krit: 'ein Krit', erfolg: 'gelungen', misserfolg: 'misslungen' };

/** Wurf zweistellig, wie er auf den Würfeln steht („07“). */
export const wurfZahl = (w: number) => String(w).padStart(2, '0');

/** Was der Spieler ansagt: „Erfolg · 54“, „Krit · 07“; bei Misserfolg ohne Wurf oder mit Zielwert (Initiative). */
export function ansage(stufe: Ergebnisstufe, wurf: number | null, zielwertBeiMisserfolg?: number): string {
  if (stufe === 'misserfolg') return zielwertBeiMisserfolg !== undefined ? `Misserfolg · Zielwert ${zielwertBeiMisserfolg}` : 'Misserfolg';
  return wurf === null ? ERGEBNIS_NAME[stufe] : `${ERGEBNIS_NAME[stufe]} · ${wurfZahl(wurf)}`;
}

/** Steps einer Quelle: „▼2“, „▲1“, „Krit-Schwelle +1“, mehrere mit Leerzeichen. */
export function stepsText(q: { malsteps?: number; stepshields?: number; krit_schwelle?: number }): string {
  const teile: string[] = [];
  if (q.malsteps) teile.push(q.malsteps > 0 ? `▼${q.malsteps}` : `▲${-q.malsteps}`);
  if (q.stepshields) teile.push(q.stepshields > 0 ? `▲${q.stepshields}` : `▼${-q.stepshields}`);
  if (q.krit_schwelle) teile.push(`Krit-Schwelle ${vorzeichen(q.krit_schwelle)}`);
  return teile.join(' ');
}

/** Stand im Satz: „Adrenalin 2“, „Ruhepuls 1“, „Over the Edge“; 0 als „0“. */
export const standText = (stand: number, d: Spieldaten) => d.regeln.leiter.stufen[String(stand)]?.name ?? '0';

/** Malsteps im Satz. */
export const malstepsText = (n: number) => `${n} ${n === 1 ? 'Malstep' : 'Malsteps'}`;

/** Kurzform eines Symptoms für die Zusammenfassung am Rad: Text vor dem Doppelpunkt. */
export const symptomKurz = (text: string) => text.split(':')[0]!.trim();

// ---- Waffen und Aktionen (konzept.md § 3.7a, § 3.8)

export const AKTION_NAME: Record<'main' | 'break' | 'bewegung' | 'stand', string> = { main: 'Main', break: 'Break', bewegung: 'Bewegung', stand: 'Stand' };

export const zoneName = (id: string, d: Spieldaten) => d.koerperzonen.eintraege.find((z) => z.id === id)?.name ?? id;
export const trageortName = (id: string, d: Spieldaten) => d.darstellung.trageorte[id] ?? id;
export const bewegungName = (id: string, d: Spieldaten) => d.darstellung.bewegungen[id] ?? id;
export const standAdjektiv = (id: string, d: Spieldaten) => d.regeln.staende.find((s) => s.id === id)?.adjektiv ?? id;
export const zustandName = (z: string, d: Spieldaten) => `${z} (${d.regeln.waffenzustand.namen[z] ?? ''})`;
export const waffenName = (id: string, d: Spieldaten) => d.waffen.eintraege.find((w) => w.id === id)?.name ?? id;
export const kugelnText = (n: number) => `${n} ${n === 1 ? 'Kugel' : 'Kugeln'}`;
export const patronenText = (n: number) => `${n} ${n === 1 ? 'Patrone' : 'Patronen'}`;

/** DK/MW: „DK 1 / MW 2“, stumpf ohne DK. */
export function dkMw(dk: number | null | undefined, mw: number | null | undefined, stumpf = false): string {
  if (stumpf || dk === null || dk === undefined) return `stumpf, MW ${mw ?? '–'}`;
  return `DK ${dk} / MW ${mw ?? '–'}`;
}
