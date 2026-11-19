// Tests für den Reiter Verlauf: Kontostand (konzept.md § 3.13) und Texte der Protokolleinträge.
import { describe, expect, it } from 'vitest';
import { kontostand } from '../src/lib/regeln/geld';
import type { Buchung } from '../src/lib/speicher/charakter';
import { aufstiegseintragText, betragText, buchungText, gefechtseintragText, wundStatus } from '../src/lib/ui/verlauf';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();
const zeit = '2026-11-19T20:00:00.000Z';
const buchung = (betrag: number, art: Buchung['art'] = 'kauf', grund = ''): Buchung => ({ zeit, betrag, art, grund });

describe('Kontostand', () => {
  it('ist die Summe aller Buchungen', () => {
    expect(kontostand({ kassenbuch: [] })).toBe(0);
    expect(kontostand({ kassenbuch: [buchung(5000, 'startgeld'), buchung(-1200), buchung(300, 'verkauf')] })).toBe(4100);
  });
  it('kann negativ werden (Korrektur)', () => {
    expect(kontostand({ kassenbuch: [buchung(100, 'startgeld'), buchung(-250, 'korrektur')] })).toBe(-150);
  });
});

describe('Kassenbuch-Texte', () => {
  it('Betrag mit Vorzeichen', () => {
    expect(betragText(1200)).toBe('+1.200 $');
    expect(betragText(-300)).toBe('−300 $');
    expect(betragText(0)).toBe('0 $');
  });
  it('Art und Grund', () => {
    expect(buchungText(buchung(5000, 'startgeld', 'Klasse'))).toBe('Startgeld: Klasse');
    expect(buchungText(buchung(-50, 'rate'))).toBe('Rate');
  });
});

describe('Aufstiegsprotokoll', () => {
  it('nennt Skills, Perks und Stats mit ihrem Zeichen', () => {
    expect(aufstiegseintragText({ zeit, art: 'skill', id: 'waffe_pistole', von: 1, nach: 2, kosten: 1 }, d)).toBe('⬢ Pistole auf Stufe 2 (1 Punkt)');
    expect(aufstiegseintragText({ zeit, art: 'perk', id: 'zaeh_1', kosten: 3 }, d)).toBe('◆ Zäh I gekauft (3 Punkte)');
    const stat = d.stats.eintraege[0]!;
    expect(aufstiegseintragText({ zeit, art: 'statrank_up', id: stat.id, rang_von: 'E', rang_nach: 'D', kosten: 1 }, d))
      .toBe(`Statrank-Up ■ ${stat.name}: Rank E → D (1 Punkt)`);
  });
  it('Session, Erstellung und Klassenwechsel', () => {
    expect(aufstiegseintragText({ zeit, art: 'session', punkte: 5 }, d)).toBe('Session abgeschlossen: +5 freie Punkte');
    expect(aufstiegseintragText({ zeit, art: 'erstellung_abgeschlossen' }, d)).toBe('Erstellung abgeschlossen');
    expect(aufstiegseintragText({ zeit, art: 'klassenwechsel', von: 'rekrut', nach: 'soldat', wechsel: 'befoerderung' }, d)).toBe('Beförderung: Rekrut → Soldat');
    expect(aufstiegseintragText({ zeit, art: 'klassenwechsel', von: null, nach: 'soldat', wechsel: 'wechsel' }, d)).toBe('Laufbahnwechsel: ohne Klasse → Soldat');
  });
  it('Korrekturen im Schreibmodus mit Werten, wo sie kurz sind', () => {
    expect(aufstiegseintragText({ zeit, art: 'korrektur', pfad: 'skills.waffe_pistole', vorher: 1, nachher: 3 }, d)).toBe('Im Schreibmodus geändert: ⬢ Pistole: 1 → 3');
    expect(aufstiegseintragText({ zeit, art: 'korrektur', pfad: 'freie_punkte', vorher: 2, nachher: 4 }, d)).toBe('Im Schreibmodus geändert: Freie Punkte: 2 → 4');
    expect(aufstiegseintragText({ zeit, art: 'korrektur', pfad: 'aussehen', vorher: 'a'.repeat(40), nachher: 'b' }, d)).toBe('Im Schreibmodus geändert: Aussehen');
  });
  it('unbekannte Arten erscheinen mit ihrem Namen', () => {
    expect(aufstiegseintragText({ zeit, art: 'neu' }, d)).toBe('neu');
  });
});

describe('Gefechtsprotokoll', () => {
  const leiter = (ursache: 'rad' | 'start' | 'rundenende' | 'senken', von: number, nach: number) =>
    ({ runde: 1, zeit, art: 'leiter' as const, ursache, von, nach, gesenkt_vorher: false });
  it('zeigt den Stand ohne „Leiter“ und ohne 0', () => {
    expect(gefechtseintragText(leiter('start', 0, 2), d).text).toBe('Gefechtsbeginn: Adrenalin 2');
    expect(gefechtseintragText(leiter('senken', 2, 0), d).text).toBe('Senken: Adrenalin 2 vorbei');
    expect(gefechtseintragText(leiter('rundenende', 2, -1), d).text).toBe('Rundenende: Adrenalin 2 → Ruhepuls 1');
    expect(gefechtseintragText(leiter('senken', 1, 1), d).text).toBe('Senken: misslungen, es bleibt, wie es ist');
    for (const e of [leiter('start', 0, 2), leiter('senken', 2, 0)]) expect(gefechtseintragText(e, d).text).not.toMatch(/Leiter|\b0\b/);
  });
  it('Schuss: erste Zeile, Rest als Einzelheiten', () => {
    const t = gefechtseintragText({ runde: 1, zeit, art: 'schuss', waffe: 'wf1', text: ['Zwei Schüsse', 'Treffer Brust'] }, d);
    expect(t).toEqual({ text: 'Zwei Schüsse', mehr: ['Treffer Brust'] });
  });
  it('Treffer mit Zone und Wirkung', () => {
    const t = gefechtseintragText({
      runde: 2, zeit, art: 'treffer', quelle: 'Schuss',
      eingabe: { zone: 'brust', dk: 2, mw: 3, kugeln: 1, krit: false, deckung: null },
      ergebnis: { art: 'durchschlag', schaden: 6, stagger: true, tot: false },
      aenderungen: { wunde: 'w1', hp_verlust_wunden: [0, 6], prellungen: [0, 0], tot: [false, false], ausloeser: [], break_verloren: true }
    }, d);
    expect(t.text).toBe('Getroffen (Schuss), Brust: durchschlägt, 6 Schaden, Stagger');
  });
});

describe('Wunden', () => {
  it('versorgte Wunde nennt die restliche Heildauer', () => {
    const w = { id: 'w1', zone: 'arm_l', schaden: 3, kritisch: false, blutung: { status: 'gestoppt' as const, frist_ende: null },
      versorgt: 'druckverband', nachsorge: null, ruhetage_geheilt: 0 };
    expect(wundStatus(w, d, false)).toMatch(/^versorgt \(.+\), heilt: noch \d+ Ruhetage? ohne Nachsorge$/);
  });
});
