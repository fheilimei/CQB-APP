// Tests der Charaktererstellung, der Aufstiegsschritte und des Schreibmodus (konzept.md § 3.0, 3.0a, 4.11).
import { describe, expect, it } from 'vitest';
import type { Rang } from '../src/lib/daten/typen';
import {
  moeglichkeiten,
  perkKaufen,
  sessionAbschliessen,
  skillSteigern,
  statrankUp,
  vorratslevel,
  zugangDerKlasse
} from '../src/lib/regeln/aufstieg';
import {
  basisSkills,
  erstellungAbschliessen,
  erstellungAnwenden,
  erstellungKaufSperre,
  kaufHinzufuegen,
  kaufZurueckgeben,
  klassenwegZu,
  klasseWaehlen,
  meisterExklusiv,
  offeneRaenge,
  raengeTauschen,
  rangSetzen,
  rueckzahlung,
  schrittFehlt,
  startgeld,
  stufe4Optionen
} from '../src/lib/regeln/erstellung';
import { korrigiere } from '../src/lib/regeln/korrektur';
import { statwert } from '../src/lib/regeln/probe';
import { neuerCharakter, type Abweichungswurf, type Charakter } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();
const statIds = d.stats.eintraege.map((s) => s.id);
const wurf = (positiv: number, negativ: number): Abweichungswurf => ({ positiv, negativ, quelle: 'app' });
const JETZT = new Date('2026-11-17T20:00:00Z');

/** Entwurf mit Name und Klasse, Ränge in der Reihenfolge von stats.json, alle Würfe 5 − 5. */
function entwurf(klasse: string | null, raenge: (Rang | null)[] = []): Charakter {
  let c = { ...neuerCharakter(statIds), name: 'Mara' };
  c = klasseWaehlen(c, klasse, d);
  statIds.forEach((id, i) => {
    c = rangSetzen(c, id, raenge[i] ?? null);
    c.stats[id]!.wurf = wurf(5, 5);
  });
  return c;
}
// Lehrling: F, F, E, E, E, E, D, D, C. Brawn (2. Stat) bekommt D.
const LEHRLING: Rang[] = ['E', 'D', 'E', 'F', 'C', 'E', 'D', 'E', 'F'];

describe('Klasse und Weg', () => {
  it('Grundklasse und Spezialisierung: nur die Klasse selbst', () => {
    expect(klassenwegZu('rekrut', null, d)).toEqual([{ klasse: 'rekrut', art: 'erstellung' }]);
    expect(klassenwegZu('grenadier', null, d)).toEqual([{ klasse: 'grenadier', art: 'erstellung' }]);
  });

  it('erweiterte Form mit ihrer Spezialisierung', () => {
    expect(klassenwegZu('pionier', null, d)?.map((s) => s.klasse)).toEqual(['grenadier', 'pionier']);
  });

  it('Meister braucht eine Stufe-4-Klasse seiner Laufbahn (Beispiel Grenadier → Pionier → Veteran)', () => {
    expect(klassenwegZu('veteran', null, d)).toBeNull();
    expect(klassenwegZu('veteran', 'sek_beamter', d)).toBeNull();
    expect(klassenwegZu('veteran', 'pionier', d)?.map((s) => s.klasse)).toEqual(['grenadier', 'pionier', 'veteran']);
    expect(stufe4Optionen('veteran', d).map((k) => k.id)).toEqual(['einzelkaempfer', 'fernspaeher', 'pionier', 'gefechtssanitaeter']);
  });
});

describe('Ränge verteilen', () => {
  it('offene Ränge sind der Rest des Rank-Sets', () => {
    const c = entwurf('rekrut', ['C', 'D']);
    expect(offeneRaenge(c, ['F', 'F', 'E', 'E', 'E', 'E', 'D', 'D', 'C'], d)).toEqual(['D', 'E', 'E', 'E', 'E', 'F', 'F']);
  });

  it('Tauschen und Entfernen lassen den Wurf beim Stat', () => {
    let c = entwurf('rekrut', ['C', 'F']);
    c.stats.twitch!.wurf = wurf(9, 1);
    c = raengeTauschen(c, 'twitch', 'brawn');
    expect(c.stats.twitch).toEqual({ rang: 'F', wurf: wurf(9, 1) });
    expect(c.stats.brawn!.rang).toBe('C');
    c = rangSetzen(c, 'twitch', null);
    expect(c.stats.twitch!.wurf).toEqual(wurf(9, 1));
  });

  it('Klassenwechsel auf gleicher Stufe behält die Ränge, auf anderer Stufe werden sie geleert (Würfe bleiben)', () => {
    let c = entwurf('rekrut', LEHRLING);
    c = klasseWaehlen(c, 'anwaerter', d);
    expect(c.stats.brawn!.rang).toBe('D');
    c = klasseWaehlen(c, 'soldat', d);
    expect(Object.values(c.stats).every((s) => s.rang === null && s.wurf !== null)).toBe(true);
  });

  it('Spezialisierung verlangt ihren Stat auf Rang A, die erweiterte Form auch den ihrer Spezialisierung', () => {
    // Stufe 3: D, D, C, C, C, C, B, B, A – Kommandosoldat verlangt Twitch A
    const spez = entwurf('kommandosoldat', ['B', 'A', 'B', 'C', 'C', 'C', 'C', 'D', 'D']);
    expect(schrittFehlt(spez, 2, d)).toEqual([{ art: 'stat_rang', stat: 'twitch', rang: 'A' }]);
    expect(schrittFehlt(raengeTauschen(spez, 'twitch', 'brawn'), 2, d)).toEqual([]);
    // Stufe 4: C, C, B, B, B, B, A, A, S – Einzelkämpfer verlangt Grit A und Twitch A
    const erw = entwurf('einzelkaempfer', ['S', 'B', 'B', 'C', 'A', 'B', 'B', 'C', 'A']);
    expect(schrittFehlt(erw, 2, d)).toEqual([{ art: 'stat_rang', stat: 'grit', rang: 'A' }]);
    expect(schrittFehlt(entwurf('veteran', ['C', 'B', 'B', 'A', 'A', 'A', 'A', 'S', 'S']), 2, d)).toEqual([]);
  });

  it('ohne Klasse: kein Rank-Set, jeder Stat braucht einen Rang', () => {
    const c = entwurf(null, ['S', 'S']);
    expect(schrittFehlt(c, 2, d)).toEqual([{ art: 'rang_fehlt', stats: statIds.slice(2) }]);
  });
});

describe('Skills und Perks der Klasse', () => {
  it('Mindestskills der Klasse', () => {
    expect(basisSkills(entwurf('anwaerter').erstellung!, d)).toEqual(d.klassen.eintraege.find((k) => k.id === 'anwaerter')!.mindestskills);
  });

  it('Meister: Mindestskills der Stufe-4-Klasse und die Wahl auf 5, davon einer exklusiv', () => {
    let c = entwurf('veteran');
    c = { ...c, erstellung: { ...c.erstellung!, stufe4: 'pionier' } };
    expect(meisterExklusiv(c.erstellung!, d)).toEqual(['sprengstoff']);
    expect(schrittFehlt(c, 4, d).map((f) => f.art)).toEqual(['meister_wahl', 'meister_exklusiv']);

    c = { ...c, erstellung: { ...c.erstellung!, meister_skills: ['waffe_ar', 'granaten'] } };
    expect(schrittFehlt(c, 4, d).map((f) => f.art)).toEqual(['meister_exklusiv']);

    c = { ...c, erstellung: { ...c.erstellung!, meister_skills: ['waffe_ar', 'sprengstoff'] } };
    expect(schrittFehlt(c, 4, d)).toEqual([]);
    const s = basisSkills(c.erstellung!, d);
    expect(s.sprengstoff).toBe(5);
    expect(s.waffe_ar).toBe(5);
    expect(s.mechanik).toBe(2);
  });
});

describe('Freie Punkte bei der Erstellung', () => {
  it('Skills, Perks und Statrank-Up mit denselben Prüfungen wie im Aufstieg', () => {
    let c = entwurf('rekrut', LEHRLING);
    expect(erstellungAnwenden(c, d).charakter.freie_punkte).toBe(5);

    c = kaufHinzufuegen(c, { art: 'skill', id: 'waffe_ar' }, d);
    c = kaufHinzufuegen(c, { art: 'skill', id: 'waffe_ar' }, d);
    c = kaufHinzufuegen(c, { art: 'perk', id: 'zaeh_1' }, d); // Brawn D, Wurf 5 − 5 = 50
    c = kaufHinzufuegen(c, { art: 'statrank_up', id: 'twitch', wurf: wurf(2, 8) }, d);
    const x = erstellungAnwenden(c, d).charakter;
    expect(x.skills.waffe_ar).toBe(3);
    expect(x.perks).toEqual(['zaeh_1']);
    expect(x.stats.twitch).toEqual({ rang: 'D', wurf: wurf(2, 8) });
    expect(statwert(x.stats.twitch, d.regeln)).toBe(44);
    expect(x.freie_punkte).toBe(1);
    expect(x.klassenweg).toEqual([{ klasse: 'rekrut', art: 'erstellung' }]);
    expect(erstellungKaufSperre(c, 'perk', 'zaeh_2', d)).toBe('voraussetzung');
  });

  it('Perk ohne erfüllte Voraussetzung und Kauf ohne Punkte sind gesperrt', () => {
    let c = entwurf('rekrut', ['E', 'E', 'E', 'F', 'C', 'D', 'D', 'E', 'F']); // Brawn E = 40
    expect(erstellungKaufSperre(c, 'perk', 'zaeh_1', d)).toBe('voraussetzung');
    for (let i = 0; i < 4; i++) c = kaufHinzufuegen(c, { art: 'skill', id: 'athletik' }, d); // Mindestskill 1 → 5
    expect(erstellungKaufSperre(c, 'skill', 'athletik', d)).toBe('maximum');
    c = kaufHinzufuegen(c, { art: 'skill', id: 'fahren' }, d);
    expect(erstellungKaufSperre(c, 'skill', 'erste_hilfe', d)).toBe('punkte');
  });

  it('Rückgabe gibt Punkte zurück, ein Statrank-Up bleibt (sein Wurf ist fest)', () => {
    let c = entwurf('rekrut', LEHRLING);
    c = kaufHinzufuegen(c, { art: 'statrank_up', id: 'twitch', wurf: wurf(1, 1) }, d);
    c = kaufHinzufuegen(c, { art: 'skill', id: 'fahren' }, d);
    expect(kaufZurueckgeben(c, 0)).toBe(c);
    c = kaufZurueckgeben(c, 1);
    expect(c.erstellung!.kaeufe.map((k) => k.art)).toEqual(['statrank_up']);
    expect(erstellungAnwenden(c, d).charakter.freie_punkte).toBe(4);
  });

  it('nach Wechsel der Klasse zählen Käufe ohne Zugang nicht mehr und werden gemeldet', () => {
    const rekrut = zugangDerKlasse('rekrut', d).skills;
    const anwaerter = zugangDerKlasse('anwaerter', d).skills;
    const nurRekrut = [...rekrut].find((s) => !anwaerter.has(s))!;
    let c = entwurf('rekrut', LEHRLING);
    c = kaufHinzufuegen(c, { art: 'skill', id: nurRekrut }, d);
    c = klasseWaehlen(c, 'anwaerter', d);
    const r = erstellungAnwenden(c, d);
    expect(r.ungueltig).toEqual([{ index: 0, kauf: { art: 'skill', id: nurRekrut }, sperre: 'kein_zugang' }]);
    expect(r.charakter.freie_punkte).toBe(5);
    expect(schrittFehlt(c, 5, d)).toEqual([{ art: 'kaeufe_ungueltig', anzahl: 1 }]);
  });
});

describe('Hintergrund und Startgeld', () => {
  it('Ersparnisse + Optionen; Einstiegsgehalt nur ab Stufe 2 mit Vertrag', () => {
    const c = entwurf('rekrut');
    expect(startgeld(c, d).summe).toBe(300);
    c.hintergrund.schulden = { groesse: 'mittel', glaeubiger: 'Onkel Vic', frist_auftraege: 6, sicherheit: 'das Auto' };
    c.hintergrund.coup = { groesse: 'gross', beute: '', feind: '' };
    c.hintergrund.vertrag = { auftraggeber: 'Halvorsen', verpflichtung: '' };
    expect(startgeld(c, d).summe).toBe(300 + 1000 + 1600);
    const soldat = klasseWaehlen(c, 'soldat', d);
    expect(startgeld(soldat, d)).toEqual({
      summe: 300 + 1000 + 1600 + 400,
      posten: [
        { art: 'ersparnisse', betrag: 300 },
        { art: 'schulden', groesse: 'mittel', betrag: 1000 },
        { art: 'coup', groesse: 'gross', betrag: 1600 },
        { art: 'einstiegsgehalt', betrag: 400 }
      ]
    });
  });

  it('Rückzahlung: Betrag + 50 % (750, 1500, 3000)', () => {
    expect([rueckzahlung('klein', d), rueckzahlung('mittel', d), rueckzahlung('gross', d)]).toEqual([750, 1500, 3000]);
  });

  it('Schulden brauchen eine Frist', () => {
    const c = entwurf('rekrut');
    c.hintergrund.schulden = { groesse: 'klein', glaeubiger: '', frist_auftraege: 0, sicherheit: '' };
    expect(schrittFehlt(c, 6, d)).toEqual([{ art: 'frist' }]);
  });
});

describe('Was fehlt', () => {
  it('Schritt 1: Name, Klasse, beim Meister die Stufe-4-Klasse', () => {
    const leer = neuerCharakter(statIds);
    expect(schrittFehlt(leer, 1, d)).toEqual([{ art: 'name' }, { art: 'klasse' }]);
    expect(schrittFehlt(entwurf('veteran'), 1, d)).toEqual([{ art: 'stufe4' }]);
    expect(schrittFehlt(entwurf(null), 1, d)).toEqual([]);
  });

  it('Schritt 3: Abweichung fehlt', () => {
    const c = entwurf('rekrut', LEHRLING);
    c.stats.nerve!.wurf = null;
    expect(schrittFehlt(c, 3, d)).toEqual([{ art: 'abweichung', stats: ['nerve'] }]);
  });
});

describe('Abschluss der Erstellung', () => {
  it('trägt alles fest ein, bucht das Startgeld und legt die Schulden an', () => {
    let c = entwurf('rekrut', LEHRLING);
    c = kaufHinzufuegen(c, { art: 'skill', id: 'waffe_ar' }, d);
    c.hintergrund.schulden = { groesse: 'mittel', glaeubiger: 'Onkel Vic', frist_auftraege: 6, sicherheit: 'das Auto' };
    const f = erstellungAbschliessen(c, d, JETZT);
    expect(f.status).toBe('fertig');
    expect(f.erstellung).toBeNull();
    expect(f.klassenweg).toEqual([{ klasse: 'rekrut', art: 'erstellung' }]);
    expect(f.skills.waffe_ar).toBe(2);
    expect(f.freie_punkte).toBe(4);
    expect(f.kassenbuch).toEqual([{ zeit: JETZT.toISOString(), betrag: 1300, art: 'startgeld', grund: 'Ersparnisse 300 + Schulden mittel 1000' }]);
    expect(f.schulden).toEqual({ rest: 1500, frist_auftraege: 6 });
    expect(f.protokoll).toEqual([{ zeit: JETZT.toISOString(), art: 'erstellung_abgeschlossen' }]);
  });

  it('kauft den Korb aus Schritt 7 nach dem Startgeld (eine Buchung „Kauf“)', () => {
    const c = entwurf('rekrut', LEHRLING);
    c.hintergrund.schulden = { groesse: 'mittel', glaeubiger: '', frist_auftraege: 6, sicherheit: '' };
    c.erstellung!.korb = {
      kauf: [{ ware: 'waffe:ak47', zustand: 'B', menge: 1 }, { ware: 'munition:762x39:HP', zustand: null, menge: 30 }],
      verhandlung: { ergebnis: 'gewonnen', krit: false }, preis_sl: null
    };
    expect(schrittFehlt(c, 7, d)).toEqual([]);
    const f = erstellungAbschliessen(c, d, JETZT);
    expect(f.kassenbuch.map((b) => [b.art, b.betrag])).toEqual([['startgeld', 1300], ['kauf', -(325 + 45)]]);
    expect(f.ausruestung.waffen).toHaveLength(1);
    expect(f.ausruestung.waffen[0]).toMatchObject({ waffe: 'ak47', zustand: 'B' });
    expect(f.ausruestung.munition).toEqual([{ kaliber: '762x39', typ: 'HP', anzahl: 30 }]);
    expect(f.erstellung).toBeNull();
  });

  it('Preis der SL gilt für den Korb; reicht das Startgeld nicht, nennt Schritt 7 den Fehlbetrag', () => {
    const c = entwurf('rekrut', LEHRLING);
    c.erstellung!.korb = { kauf: [{ ware: 'waffe:ak47', zustand: 'A', menge: 1 }], verhandlung: { ergebnis: 'keine', krit: false }, preis_sl: 250 };
    expect(erstellungAbschliessen(c, d, JETZT).kassenbuch.at(-1)).toMatchObject({ art: 'kauf', betrag: -250 });
    c.erstellung!.korb.preis_sl = 400;
    expect(schrittFehlt(c, 7, d)).toEqual([{ art: 'korb', text: 'Es fehlen 100 $.' }]);
    expect(() => erstellungAbschliessen(c, d, JETZT)).toThrow('Schritt 7');
  });

  it('verweigert den Abschluss, solange etwas fehlt', () => {
    expect(() => erstellungAbschliessen(entwurf('rekrut', ['C']), d)).toThrow('Schritt 2');
  });
});

describe('Aufstiegsschritte', () => {
  const fertig = () => ({ ...erstellungAbschliessen(entwurf('rekrut', LEHRLING), d, JETZT), freie_punkte: 3 });

  it('Skill steigern und Perk kaufen ziehen Punkte ab und werden protokolliert', () => {
    let c = skillSteigern(fertig(), 'waffe_ar', d, JETZT);
    expect(c.skills.waffe_ar).toBe(2);
    expect(c.freie_punkte).toBe(2);
    expect(c.protokoll.at(-1)).toEqual({ zeit: JETZT.toISOString(), art: 'skill', id: 'waffe_ar', von: 1, nach: 2, kosten: 1 });
    c = perkKaufen(c, 'zaeh_1', d, JETZT);
    expect(c.perks).toEqual(['zaeh_1']);
    expect(c.freie_punkte).toBe(1);
    expect(() => perkKaufen(c, 'zaeh_1', d)).toThrow('vorhanden');
  });

  it('Statrank-Up: Rang steigt, auch wenn der Statwert sinkt', () => {
    const c0 = fertig();
    c0.stats.twitch = { rang: 'E', wurf: wurf(10, 1) }; // 49
    const c = statrankUp(c0, 'twitch', wurf(1, 10), d, JETZT); // D − 9 = 41
    expect(c.stats.twitch!.rang).toBe('D');
    expect(statwert(c.stats.twitch, d.regeln)).toBe(41);
    expect(c.protokoll.at(-1)).toMatchObject({ art: 'statrank_up', id: 'twitch', rang_von: 'E', rang_nach: 'D', kosten: 1 });
  });

  it('nicht über S, nicht ohne Punkte', () => {
    const c = fertig();
    c.stats.twitch = { rang: 'S', wurf: wurf(5, 5) };
    expect(() => statrankUp(c, 'twitch', wurf(1, 1), d)).toThrow('maximum');
    expect(() => skillSteigern({ ...c, freie_punkte: 0 }, 'waffe_ar', d)).toThrow('punkte');
  });

  it('Session abschließen: +5 freie Punkte', () => {
    const c = sessionAbschliessen(fertig(), d, JETZT);
    expect(c.freie_punkte).toBe(8);
    expect(c.protokoll.at(-1)).toEqual({ zeit: JETZT.toISOString(), art: 'session', punkte: 5 });
  });

  it('Vorratslevel aus der Klasse, von Hand gesetzt geht vor', () => {
    expect(vorratslevel(fertig(), d)).toBe(3);
    expect(vorratslevel({ ...fertig(), vorratslevel_manuell: 1 }, d)).toBe(1);
    expect(vorratslevel({ ...fertig(), klassenweg: [] }, d)).toBeNull();
  });

  it('Möglichkeiten: nur im Zugang, ohne Skills auf 5 und vorhandene Perks', () => {
    const c = fertig();
    c.skills.athletik = 5;
    c.perks = ['zaeh_1'];
    const m = moeglichkeiten(c, d);
    const z = zugangDerKlasse('rekrut', d);
    expect(m.filter((x) => x.art === 'skill').every((x) => z.skills.has(x.id))).toBe(true);
    expect(m.some((x) => x.art === 'skill' && x.id === 'athletik')).toBe(false);
    expect(m.some((x) => x.art === 'perk' && x.id === 'zaeh_1')).toBe(false);
    expect(m.find((x) => x.art === 'perk' && x.id === 'zaeh_2')?.sperre).toBe('voraussetzung');
    expect(m.filter((x) => x.art === 'statrank_up')).toHaveLength(9);
  });
});

describe('Schreibmodus', () => {
  const fertig = () => erstellungAbschliessen(entwurf('rekrut', LEHRLING), d, JETZT);

  it('ändert ohne Prüfung, markiert und protokolliert vorher/nachher', () => {
    let c = korrigiere(fertig(), { art: 'skill', id: 'tarnen', stufe: 3 }, JETZT);
    expect(c.skills.tarnen).toBe(3);
    expect(c.ueberschrieben).toEqual(['skills.tarnen']);
    expect(c.protokoll.at(-1)).toEqual({ zeit: JETZT.toISOString(), art: 'korrektur', pfad: 'skills.tarnen', vorher: 0, nachher: 3 });
    c = korrigiere(c, { art: 'skill', id: 'tarnen', stufe: 0 }, JETZT);
    expect('tarnen' in c.skills).toBe(false);
    expect(c.ueberschrieben).toEqual(['skills.tarnen']);
  });

  it('Rang, Wurf (als „von Hand“), Perk, freie Punkte', () => {
    let c = korrigiere(fertig(), { art: 'rang', id: 'nerve', rang: 'S' }, JETZT);
    c = korrigiere(c, { art: 'wurf', id: 'nerve', wurf: wurf(9, 1) }, JETZT);
    expect(c.stats.nerve).toEqual({ rang: 'S', wurf: { positiv: 9, negativ: 1, quelle: 'hand' } });
    c = korrigiere(c, { art: 'perk', id: 'zaeh_2', hat: true }, JETZT);
    expect(c.perks).toContain('zaeh_2');
    c = korrigiere(c, { art: 'freie_punkte', wert: 12 }, JETZT);
    expect(c.freie_punkte).toBe(12);
    expect(c.ueberschrieben).toEqual(['stats.nerve', 'perks.zaeh_2', 'freie_punkte']);
  });

  it('ohne Änderung kein Protokolleintrag', () => {
    const c = fertig();
    expect(korrigiere(c, { art: 'freie_punkte', wert: c.freie_punkte })).toBe(c);
  });
});
