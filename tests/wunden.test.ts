// Tests für eingehende Treffer (konzept.md § 3.10, § 4.7; Regelwerk: Schaden, Blutung und Verletzungen; Körperzonen).
import { describe, expect, it } from 'vitest';
import { gefechtStarten, leiterSetzen } from '../src/lib/regeln/gefecht';
import { hpAktuell } from '../src/lib/regeln/modifikatoren';
import { gefechtVon, lebenslageDes } from '../src/lib/regeln/probenrechner';
import { ausgang, ausloeserVon, schadenDirekt, staggerRegel, trefferUebernehmen, vorschau, type Eingang } from '../src/lib/regeln/wunden';
import { neuerCharakter, type Charakter, type Gefecht, type Trefferereignis } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();

/** Alle Stats auf C, ohne Perks: HP 8, Schmerzresistenz 1. */
function fertig(ruestung: string[] = []): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  for (const id of Object.keys(c.stats)) c.stats[id] = { rang: 'C', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
  return { ...c, status: 'fertig', erstellung: null, name: 'Mara', ausruestung: { ...c.ausruestung, ruestung } };
}
const imGefecht = (c: Charakter, stand = 0) => leiterSetzen(gefechtStarten(c, false, 'erfolg', d), stand, d);
const g = (c: Charakter) => gefechtVon(c) as Gefecht;
const schuss = (zone: string, dk: number | null, mw: number, extra: Partial<Eingang> = {}): Eingang =>
  ({ zone, dk, mw, kugeln: 1, krit: false, deckung: null, ...extra });
const U = { quelle: 'Schuss', schuss: true };

describe('Treffer übernehmen', () => {
  it('Durchschlag legt eine blutende Wunde an und zieht MW × Multiplikator von den HP ab', () => {
    const c = trefferUebernehmen(fertig(), schuss('brust', 1, 2), U, d);
    expect(c.spielstand.wunden).toHaveLength(1);
    expect(c.spielstand.wunden[0]).toMatchObject({ zone: 'brust', schaden: 4, kritisch: false, blutung: { status: 'offen' }, versorgt: null });
    expect(c.spielstand.hp_verlust_wunden).toBe(4);
    expect(hpAktuell(c, d)).toBe(4);
  });

  it('Wuchttreffer (Weste 1, DK 0) erzeugt eine Prellung statt einer Wunde', () => {
    const c = trefferUebernehmen(fertig(['weste_einfach']), schuss('bauch', 0, 3), U, d);
    expect(c.spielstand.wunden).toHaveLength(0);
    expect(c.spielstand.prellungen).toBe(2); // 3 − (1 − 0)
    expect(c.spielstand.hp_verlust_wunden).toBe(0);
  });

  it('DK gleich Schutzwert geht durch (Durchschlag)', () => {
    const a = ausgang(fertig(['weste_einfach']), schuss('brust', 1, 1), d);
    expect(a.art).toBe('durchschlag');
  });

  it('Folgetreffer: Kugeln bilden eine Wunde, Schaden mal Kugeln', () => {
    const c = trefferUebernehmen(fertig(), schuss('bein_l', 1, 1, { kugeln: 3 }), U, d);
    expect(c.spielstand.wunden).toHaveLength(1);
    expect(c.spielstand.wunden[0]!.schaden).toBe(3);
  });

  it('In Deckung stecken geblieben: nichts ändert sich', () => {
    const c0 = fertig();
    const c = trefferUebernehmen(c0, schuss('kopf', 1, 3, { deckung: 2 }), U, d);
    expect(c.spielstand.wunden).toHaveLength(0);
    expect(hpAktuell(c, d)).toBe(8);
  });

  it('Krit am Kopf (Durchschlag) ist sofort tödlich', () => {
    const c = trefferUebernehmen(fertig(), schuss('kopf', 1, 1, { krit: true }), U, d);
    expect(c.spielstand.tot).toBe(true);
    expect(lebenslageDes(c, d)).toBe('tot');
  });

  it('Krit, der an der Rüstung hängen bleibt, hat keine Krit-Folge (Rüstung schützt vor Krits)', () => {
    const a = ausgang(fertig(['weste_einfach']), schuss('brust', 0, 1, { krit: true }), d);
    expect(a.art).toBe('wucht');
    expect(a.tot).toBe(false);
    expect(a.folge_text).toBeNull();
  });

  it('Krit am Bein: kritische Wunde, kampfunfähig', () => {
    const c = trefferUebernehmen(fertig(), schuss('bein_r', 1, 1, { krit: true }), U, d);
    expect(c.spielstand.wunden[0]!.kritisch).toBe(true);
    expect(lebenslageDes(c, d)).toBe('kampfunfaehig');
  });

  it('genau 0 HP → kampfunfähig, −1 HP → tot', () => {
    const a0 = ausgang(fertig(), schuss('bauch', 1, 4), d); // 8 − 8
    expect(a0.hp_nachher).toBe(0);
    expect(a0.kampfunfaehig).toBe(true);
    expect(a0.tot).toBe(false);
    const a1 = ausgang(fertig(), schuss('kopf', 1, 3), d); // 8 − 9
    expect(a1.tot).toBe(true);
  });

  it('Folgen der Zone stehen im Ausgang (Spalte Normal bzw. Krit)', () => {
    expect(ausgang(fertig(), schuss('arm_r', 1, 1), d).folge_text).toBe('Blutung; Gegenstand fallen lassen');
    expect(ausgang(fertig(), schuss('arm_r', 1, 1, { krit: true }), d).folge_text).toMatch(/Kampfunfähig/);
  });

  it('Ansage Rumpf: Wunde in der Zone „Rumpf“, Rüstung der Weste', () => {
    const a = ausgang(fertig(['weste_einfach']), schuss('rumpf', 0, 2), d);
    expect(a.ruestung).toBe(1);
    expect(a.art).toBe('wucht');
  });

  it('R5: Wuchttreffer mit 0 Schaden: keine Prellung, keine HP', () => {
    const c = trefferUebernehmen(fertig(['weste_einfach']), schuss('bauch', 0, 1), U, d);
    expect(c.spielstand.prellungen).toBe(0);
    expect(c.spielstand.wunden).toHaveLength(0);
  });

  it('weitere Wunden bekommen eigene IDs', () => {
    const c1 = trefferUebernehmen(fertig(), schuss('bein_l', 1, 1), U, d);
    const c2 = trefferUebernehmen(c1, schuss('bein_r', 1, 1), U, d);
    expect(new Set(c2.spielstand.wunden.map((w) => w.id)).size).toBe(2);
  });
});

describe('Stagger und Auslöser im Gefecht', () => {
  it('Schaden über der Schmerzresistenz: Stagger, Breakaction verloren, Konzentration unterbrochen', () => {
    const c0 = imGefecht(fertig());
    const mitKonz = { ...c0, spielstand: { ...c0.spielstand, gefecht: { ...g(c0), konzentration: 'voll' as const } } };
    const c = trefferUebernehmen(mitKonz, schuss('bein_l', 1, 2), U, d);
    expect(g(c).break_verloren).toBe(true);
    expect(g(c).konzentration).toBeNull();
    expect(g(c).ausloeser_diese_runde).toEqual(['beschossen', 'getroffen', 'verletzt', 'stagger']);
  });

  it('Schaden gleich Schmerzresistenz: kein Stagger, außer mit Empfindlich (Ruhepuls 1)', () => {
    expect(trefferUebernehmen(imGefecht(fertig()), schuss('bein_l', 1, 1), U, d).spielstand.gefecht).toMatchObject({ break_verloren: false });
    const ruhe = imGefecht(fertig(), -1);
    expect(staggerRegel(ruhe, d)).toBe('empfindlich');
    expect(g(trefferUebernehmen(ruhe, schuss('bein_l', 1, 1), U, d)).break_verloren).toBe(true);
  });

  it('Schmerz ignorieren (Adrenalin 1): kein Stagger', () => {
    const c = imGefecht(fertig(), 1);
    expect(staggerRegel(c, d)).toBe('nie');
    expect(g(trefferUebernehmen(c, schuss('bein_l', 1, 5), U, d)).break_verloren).toBe(false);
  });

  it('außerhalb des Gefechts: kein Protokoll, keine Auslöser', () => {
    const c = trefferUebernehmen(fertig(), schuss('bein_l', 1, 2), U, d);
    expect(c.spielstand.gefecht.aktiv).toBe(false);
  });

  it('Protokoll hält die Änderungen für Rückgängig', () => {
    const c = trefferUebernehmen(imGefecht(fertig()), schuss('brust', 1, 2), U, d);
    const e = g(c).protokoll.at(-1) as Trefferereignis;
    expect(e.art).toBe('treffer');
    expect(e.aenderungen.hp_verlust_wunden).toEqual([0, 4]);
    expect(e.aenderungen.wunde).toBe(c.spielstand.wunden[0]!.id);
  });

  it('R25: in der Deckung gestoppt: nur beschossen; Wucht mit 0 Schaden: beschossen und getroffen', () => {
    expect(ausloeserVon({ art: 'gestoppt', schaden: 0, stagger: false }, true, d)).toEqual(['beschossen']);
    expect(ausloeserVon({ art: 'wucht', schaden: 0, stagger: false }, true, d)).toEqual(['beschossen', 'getroffen']);
  });

  it('Auslöser zählen je Runde nur einmal', () => {
    const c1 = trefferUebernehmen(imGefecht(fertig()), schuss('bein_l', 1, 1), U, d);
    const c2 = trefferUebernehmen(c1, schuss('bein_r', 1, 1), U, d);
    expect(g(c2).ausloeser_diese_runde).toEqual(['beschossen', 'getroffen', 'verletzt']);
  });
});

describe('Schaden direkt (Sonstiges)', () => {
  it('als Wunde: ohne Multiplikator, ohne Folgen; im Gefecht nur „verletzt“', () => {
    const c = schadenDirekt(imGefecht(fertig()), 'bein_l', 3, 'wunde', d);
    expect(c.spielstand.wunden[0]).toMatchObject({ zone: 'bein_l', schaden: 3, kritisch: false });
    expect(hpAktuell(c, d)).toBe(5);
    expect(g(c).ausloeser_diese_runde).toEqual(['verletzt']);
  });
  it('als Prellung', () => {
    const c = schadenDirekt(fertig(), 'kopf', 2, 'prellung', d);
    expect(c.spielstand.prellungen).toBe(2);
    expect(c.spielstand.wunden).toHaveLength(0);
  });
});

describe('Vorschau', () => {
  it('rechnet alle Zonen mit W8-Nummer, ohne „Rumpf“', () => {
    const v = vorschau(fertig(['weste_einfach']), { dk: 0, mw: 2, kugeln: 1, krit: false, deckung: null }, d);
    expect(Object.keys(v)).toHaveLength(8);
    expect(v.brust!.art).toBe('wucht');
    expect(v.kopf!.art).toBe('durchschlag');
    expect(v.kopf!.schaden).toBe(6);
  });
  it('stumpf: verdeckte Zone gestoppt, sonst Wucht mit vollem Rüstungswert', () => {
    const v = vorschau(fertig(['weste_einfach']), { dk: null, mw: 2, kugeln: 1, krit: true, deckung: null }, d, (z) => (z === 'kopf' ? 0 : null));
    expect(v.kopf!.art).toBe('gestoppt');
    expect(v.brust!).toMatchObject({ art: 'wucht', schaden: 1, stagger: true });
  });
});
