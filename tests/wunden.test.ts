// Tests für eingehende Treffer (konzept.md § 3.10, § 4.7; Regelwerk: Schaden, Blutung und Verletzungen; Körperzonen).
import { describe, expect, it } from 'vitest';
import { deckungSetzen, deckungZonen, gefechtBeenden, gefechtStarten, leiterSetzen } from '../src/lib/regeln/gefecht';
import { hpAktuell } from '../src/lib/regeln/modifikatoren';
import { gefechtVon, lebenslageDes } from '../src/lib/regeln/probenrechner';
import { bewegen, hechten } from '../src/lib/regeln/aktionen';
import { ausgang, ausloeserVon, deckungFuer, folgeSaetze, schadenDirekt, staggerRegel, trefferUebernehmen, vorschau, type Eingang } from '../src/lib/regeln/wunden';
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

describe('Folgen als Sätze im Bericht', () => {
  const bein = (krit = false) => ({ zone: 'bein_l', folge: krit ? ('krit' as const) : ('normal' as const) });
  it('Arm: blutet und Gegenstand fallen lassen', () => {
    expect(folgeSaetze({ zone: 'arm_r', folge: 'normal' }, fertig(), d)).toEqual(['Die Wunde blutet.', 'Du lässt fallen, was du in dieser Hand hältst.']);
  });
  it('Bein im Gefecht ohne Bewegung: kein Sturz, aber humpeln', () => {
    expect(folgeSaetze(bein(), imGefecht(fertig()), d)).toEqual(['Die Wunde blutet.', 'Du kannst nur noch humpeln.']);
  });
  it('Bein im Gefecht nach Laufen: Sturz', () => {
    const c = bewegen(imGefecht(fertig()), 'laufen', d);
    expect(folgeSaetze(bein(), c, d)).toContain('Du stürzt, weil du im Lauf getroffen wurdest, und liegst jetzt am Boden.');
  });
  it('R26: Treffer am Bein nach Rennen legt dich hin (ohne Aktion), im Protokoll vermerkt', () => {
    const vorher = bewegen(imGefecht(fertig()), 'rennen', d);
    const c = trefferUebernehmen(vorher, schuss('bein_r', 1, 1), U, d);
    expect(g(c).stand).toBe('liegen');
    expect(g(c).verbraucht).toEqual(g(vorher).verbraucht);
    expect((g(c).protokoll.at(-1) as Trefferereignis).aenderungen.stand).toEqual(['stehen', 'liegen']);
  });
  it('R26: Treffer am Bein ohne Lauf oder am Arm ändert den Stand nicht', () => {
    const vorher = bewegen(imGefecht(fertig()), 'gehen', d);
    expect(g(trefferUebernehmen(vorher, schuss('bein_r', 1, 1), U, d)).stand).toBe(g(vorher).stand);
    const lauf = bewegen(imGefecht(fertig()), 'laufen', d);
    expect(g(trefferUebernehmen(lauf, schuss('arm_r', 1, 1), U, d)).stand).toBe(g(lauf).stand);
    expect(g(trefferUebernehmen(lauf, schuss('bein_r', 5, 1), U, d)).stand).toBe('liegen');
  });
  it('Bein nach Gehen oder nach Laufen und dann Hechten: kein Sturz', () => {
    expect(folgeSaetze(bein(), bewegen(imGefecht(fertig()), 'gehen', d), d).some((s) => s.includes('stürzt'))).toBe(false);
    const gehechtet = hechten(bewegen(imGefecht(fertig()), 'laufen', d), 'liegen', 'break', d);
    expect(folgeSaetze(bein(), gehechtet, d).some((s) => s.includes('stürzt'))).toBe(false);
  });
  it('Bein außerhalb des Gefechts: Sturz als Bedingung', () => {
    expect(folgeSaetze(bein(), fertig(), d)).toContain('Warst du im Lauf, stürzt du.');
  });
  it('Krit am Bein: Verbluten in fünf Minuten; ohne Folge keine Sätze', () => {
    expect(folgeSaetze(bein(true), fertig(), d)).toEqual(['Die Wunde blutet so stark, dass du innerhalb von fünf Minuten verblutest.']);
    expect(folgeSaetze({ zone: 'bein_l', folge: null }, fertig(), d)).toEqual([]);
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

describe('Deckung auf der Figur (konzept.md § 3.9)', () => {
  const unten = (stufe: number) => ({ richtung: 'unten', stufe });
  it('Kante von unten: jede Stufe nimmt die darunter mit; bis zum Bauch bleiben die Arme frei', () => {
    expect(deckungZonen(unten(0), [], d)).toEqual(['bein_r', 'bein_l']);
    expect(deckungZonen(unten(1), [], d)).toEqual(['unterleib', 'bein_r', 'bein_l']);
    expect(deckungZonen(unten(2), [], d)).toEqual(['bauch', 'unterleib', 'bein_r', 'bein_l']);
    expect(deckungZonen(unten(2), [], d)).not.toContain('arm_r');
  });
  it('R3: Kante von unten bis zur Brust verdeckt beide Arme, bis zum Kopf alles', () => {
    expect(deckungZonen(unten(3), [], d)).toEqual(['brust', 'bauch', 'unterleib', 'rumpf', 'arm_r', 'arm_l', 'bein_r', 'bein_l']);
    expect(deckungZonen(unten(4), [], d)).toContain('kopf');
  });
  it('R3: seitliche Kante verdeckt nur den Arm ihrer Seite, bis „alles“', () => {
    expect(deckungZonen({ richtung: 'rechts', stufe: 0 }, [], d)).toEqual(['arm_r', 'bein_r']);
    expect(deckungZonen({ richtung: 'rechts', stufe: 1 }, [], d)).toEqual(['kopf', 'brust', 'bauch', 'unterleib', 'rumpf', 'arm_r', 'bein_r']);
    expect(deckungZonen({ richtung: 'links', stufe: 2 }, [], d)).toHaveLength(9);
  });
  it('R3, R31: angetippte Brust verdeckt nur die Brust, nicht Rumpf oder Arme; Kante und Antippen zusammen', () => {
    expect(deckungZonen(null, ['brust'], d)).toEqual(['brust']);
    expect(deckungZonen(null, ['bauch'], d)).toEqual(['bauch']);
    expect(deckungZonen(unten(0), ['kopf'], d)).toEqual(['kopf', 'bein_r', 'bein_l']);
  });
  it('setzen, im Treffer anwenden und mit „keine“ wieder löschen', () => {
    let c = deckungSetzen(imGefecht(fertig()), { wert: 2, art: 'autotuer', kante: unten(2), getippt: [] }, d);
    expect(c.spielstand.deckung).toMatchObject({ wert: 2, art: 'autotuer', kante: unten(2) });
    expect(deckungFuer('bauch', c, d)).toBe(2);
    expect(deckungFuer('brust', c, d)).toBeNull();
    expect(deckungFuer('rumpf', c, d)).toBeNull(); // R32: Ansage Rumpf nur verdeckt, wenn der ganze Rumpf verdeckt ist
    c = deckungSetzen(c, { wert: 2, art: 'autotuer', kante: unten(3), getippt: [] }, d);
    expect(deckungFuer('rumpf', c, d)).toBe(2);
    expect(deckungFuer('kopf', c, d)).toBeNull();
    c = deckungSetzen(c, { wert: 2, art: null, kante: null, getippt: [] }, d);
    expect(c.spielstand.deckung).toBeNull();
  });
  it('gilt auch in Ruhe und bleibt über das Gefechtsende erhalten', () => {
    let c = deckungSetzen(fertig(), { wert: 3, art: null, kante: unten(0), getippt: [] }, d);
    expect(deckungFuer('bein_r', c, d)).toBe(3);
    expect(deckungFuer('kopf', c, d)).toBeNull();
    c = gefechtBeenden(imGefecht(c));
    expect(deckungFuer('bein_l', c, d)).toBe(3);
  });
  it('R30: dünne Holztür hat Schutz 1 (entschieden)', () => {
    expect(d.schutz.deckung.find((x) => x.id === 'holztuer_duenn')!.wert).toBe(1);
  });
});
