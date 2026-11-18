// Tests für Zustände (Geblendet, Gereizt) und den ballistischen Schild (konzept.md § 3.11, § 4.5; Regelwerk:
// Sprengwirkung, Blendung und Reizgas; Deckung und Rüstung, Ballistischer Schild).
import { describe, expect, it } from 'vitest';
import { bewegungsarten, lageWaehlen } from '../src/lib/regeln/aktionen';
import {
  deckungSetzen, geblendetBeenden, geblendetSetzen, gefechtStarten, leiterSetzen, naechsteRunde, reizgasSetzen, schildHalten
} from '../src/lib/regeln/gefecht';
import { gefechtVon, probeStellen } from '../src/lib/regeln/probenrechner';
import { schildBeimSchiessen, schussStellen, type Schusseinstellung } from '../src/lib/regeln/schuss';
import { neuerWaffenEintrag, waffeVon } from '../src/lib/regeln/waffen';
import { deckungFuer, gehaltenerSchild, staggerOhneTreffer } from '../src/lib/regeln/wunden';
import { blendung, geblendetRunden, geltendeSicht, istGereizt } from '../src/lib/regeln/zustaende';
import { neuerCharakter, type Charakter, type Gefecht, type WaffenEintrag } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();
const r = d.regeln;

function fertig(extra: Partial<Charakter> = {}): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  for (const id of Object.keys(c.stats)) c.stats[id] = { rang: 'C', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
  return { ...c, status: 'fertig', erstellung: null, name: 'Mara', ...extra };
}
const g = (c: Charakter) => gefechtVon(c) as Gefecht;
const imGefecht = (stand = 0, extra: Partial<Charakter> = {}) => leiterSetzen(gefechtStarten(fertig(extra), false, 'erfolg', d), stand, d);
const runde = (c: Charakter) => naechsteRunde(c, { ausloeser: [], probe: null }, d);
const mitSchild = (c: Charakter, gehalten = true) => schildHalten({ ...c, ausruestung: { ...c.ausruestung, schild: 'ballistischer_schild' } }, gehalten);
const waffe = (id: string): WaffenEintrag => ({ ...neuerWaffenEintrag(id, d, `w_${id}`, 'holster') });
const einstellung = (): Schusseinstellung => ({
  modus: 'EF', anzahl: 1, ansage: 'keine', ansage_zone: null, schalter: [], ausgeschaltet: [], sl: { malsteps: 0, stepshields: 0, grund: '' }
});
const m84 = d.wurf_und_sprengwaffen.eintraege.find((w) => w.id === 'm84');

describe('Geblendet', () => {
  it('Blendgranate bedrängt: 2 Runden und Stagger; nah: 1 Runde, nur mit freiem Kopf', () => {
    expect(blendung(m84, 'bedraengt', false, false)).toEqual({ runden: 2, stagger: true });
    expect(blendung(m84, 'nah', false, false)).toEqual({ runden: 1, stagger: false });
    expect(blendung(m84, 'nah', true, false)).toEqual({ runden: 0, stagger: false });
    // Im Kern hilft ein verdeckter Kopf nicht.
    expect(blendung(m84, 'bedraengt', true, false)).toEqual({ runden: 2, stagger: true });
  });

  it('Abwenden (Reaktion gelungen): nicht geblendet, der Stagger bleibt', () => {
    expect(blendung(m84, 'bedraengt', false, true)).toEqual({ runden: 0, stagger: true });
  });

  it('Andere Granaten blenden nicht; ein Band außerhalb blendet nicht', () => {
    const splitter = d.wurf_und_sprengwaffen.eintraege.find((w) => w.sonderwirkung == null);
    expect(blendung(splitter, 'bedraengt', false, false)).toEqual({ runden: 0, stagger: false });
    expect(blendung(m84, 'weit', false, false)).toEqual({ runden: 0, stagger: false });
  });

  it('Runden zählen ab der Detonation; endet am Ende der letzten Runde', () => {
    let c = geblendetSetzen(imGefecht(), 2);
    expect(geblendetRunden(g(c))).toBe(2);
    c = runde(c);
    expect(geblendetRunden(g(c))).toBe(1);
    c = runde(c);
    expect(geblendetRunden(g(c))).toBe(0);
    expect(g(c).geblendet_bis).toBeNull();
  });

  it('eine kürzere Blendung verkürzt eine längere nicht; von Hand beenden', () => {
    const c = geblendetSetzen(geblendetSetzen(imGefecht(), 2), 1);
    expect(geblendetRunden(g(c))).toBe(2);
    expect(geblendetRunden(g(geblendetBeenden(c)))).toBe(0);
  });

  it('außerhalb des Gefechts ändert sich nichts', () => {
    const c = fertig();
    expect(geblendetSetzen(c, 2)).toBe(c);
  });

  it('setzt die Sichtstufe keine: 3 Malsteps statt der eingestellten Stufe, keine Ansage', () => {
    const c = geblendetSetzen(imGefecht(), 1);
    expect(geltendeSicht(g(c), r)).toBe('keine');
    const p = probeStellen(c, d, { stat: 'control', skill: null, braucht_sicht: true });
    expect(p.automatisch.find((q) => q.id === 'sicht')).toMatchObject({ herkunft: 'zustand', name: 'Geblendet', malsteps: 3 });
    const sch = schussStellen(lageWaehlen({ ...c, ausruestung: { ...c.ausruestung, waffen: [waffe('m1911')], aktive_waffe: 'w_m1911' } }, 'entfernung', 'nah'),
      d, waffe('m1911'), einstellung());
    expect(sch.ansage_moeglich).toBe(false);
  });
});

describe('Gereizt', () => {
  it('2 Malsteps auf alle Proben; mit Geblendet zusammen', () => {
    let c = reizgasSetzen(imGefecht(), { in_wolke: true, gereizt: true, gasmaske: false });
    expect(istGereizt(g(c))).toBe(true);
    expect(probeStellen(c, d, { stat: 'grit', skill: null }).wert).toMatchObject({ malsteps: 2 });
    c = geblendetSetzen(c, 1);
    expect(probeStellen(c, d, { stat: 'control', skill: null, braucht_sicht: true }).wert).toMatchObject({ malsteps: 5 });
  });

  it('hält an, solange du in der Wolke stehst; endet am Ende der Runde, in der du sie verlässt', () => {
    let c = reizgasSetzen(imGefecht(), { in_wolke: true, gereizt: true, gasmaske: false });
    c = runde(c);
    expect(istGereizt(g(c))).toBe(true);
    c = reizgasSetzen(c, { in_wolke: false, gereizt: true, gasmaske: false });
    expect(istGereizt(g(c))).toBe(true);
    c = runde(c);
    expect(istGereizt(g(c))).toBe(false);
    expect(g(c).reizgas).toBeNull();
  });

  it('in der Wolke, Probe bestanden: nicht gereizt, die Wolke bleibt bis zum Verlassen', () => {
    let c = reizgasSetzen(imGefecht(), { in_wolke: true, gereizt: false, gasmaske: false });
    expect(probeStellen(c, d, { stat: 'grit', skill: null }).wert).toMatchObject({ malsteps: 0 });
    c = runde(c);
    expect(g(c).reizgas).toMatchObject({ in_wolke: true, gereizt: false });
  });
});

describe('Ballistischer Schild', () => {
  it('nur in der Hand: Deckung 3 auf Kopf, Rumpf und Armen, Beine frei', () => {
    expect(gehaltenerSchild(mitSchild(fertig(), false), d)).toBeNull();
    const c = mitSchild(fertig());
    expect(gehaltenerSchild(c, d)?.deckung).toBe(3);
    for (const z of ['kopf', 'brust', 'bauch', 'unterleib', 'arm_r', 'arm_l', 'rumpf']) expect(deckungFuer(z, c, d)).toBe(3);
    expect(deckungFuer('bein_r', c, d)).toBeNull();
  });

  it('nur von vorn: ohne Schild zählt nur die Deckung auf der Figur', () => {
    const c = mitSchild(fertig());
    expect(deckungFuer('brust', c, d, { schild: false })).toBeNull();
  });

  it('R37: Deckung und Schild auf derselben Zone zählen nicht zusammen, der höhere Wert gilt', () => {
    const c = deckungSetzen(mitSchild(fertig()), { wert: 4, art: 'motorblock', getippt: ['brust', 'bein_r'] }, d);
    expect(deckungFuer('brust', c, d)).toBe(4);
    expect(deckungFuer('kopf', c, d)).toBe(3);
    expect(deckungFuer('bein_r', c, d)).toBe(4);
    const schwach = deckungSetzen(mitSchild(fertig()), { wert: 1, art: null, getippt: ['brust'] }, d);
    expect(deckungFuer('brust', schwach, d)).toBe(3);
    expect(deckungFuer('brust', schwach, d, { schild: false })).toBe(1);
  });

  it('Bewegung höchstens Gehen, solange er gehalten wird; Rüstungsträger erlaubt Laufen', () => {
    const erlaubt = (c: Charakter) => bewegungsarten(c, d).filter((b) => b.erlaubt).map((b) => b.id);
    const c = imGefecht();
    expect(erlaubt(mitSchild(c))).toEqual(['gehen']);
    expect(erlaubt(mitSchild(c, false))).toEqual(['gehen', 'laufen', 'rennen']);
    expect(erlaubt(mitSchild({ ...c, perks: ['ruestungstraeger'] }))).toEqual(['gehen', 'laufen']);
  });

  it('Rüstungsträger: mit Schutzanzug Laufen statt nur Gehen', () => {
    const c = imGefecht(0, { perks: ['ruestungstraeger'] });
    const anzug = { ...c, ausruestung: { ...c.ausruestung, ruestung: ['schutzanzug'] } };
    expect(bewegungsarten(anzug, d).filter((b) => b.erlaubt).map((b) => b.id)).toEqual(['gehen', 'laufen']);
  });

  it('Schießen: nur Pistolen, 1 Malstep', () => {
    const c = mitSchild(imGefecht());
    expect(schildBeimSchiessen(c, waffeVon(waffe('m1911'), d), d)).toMatchObject({ erlaubt: true, malsteps: 1 });
    expect(schildBeimSchiessen(c, waffeVon(waffe('m4'), d), d)).toMatchObject({ erlaubt: false });
    expect(schildBeimSchiessen(mitSchild(imGefecht(), false), waffeVon(waffe('m4'), d), d)).toBeNull();
    const bereit = lageWaehlen({ ...c, ausruestung: { ...c.ausruestung, waffen: [waffe('m1911')], aktive_waffe: 'w_m1911' } }, 'entfernung', 'nah');
    const q = schussStellen(bereit, d, waffe('m1911'), einstellung()).probe.quellen.find((x) => x.id === 'schild');
    expect(q).toMatchObject({ malsteps: 1 });
  });
});

describe('Stagger ohne Treffer', () => {
  it('nimmt die Breakaction und setzt den Auslöser; Schmerz ignorieren verhindert ihn', () => {
    const { nach, verhindert } = staggerOhneTreffer(imGefecht(), d);
    expect(verhindert).toBe(false);
    expect(g(nach)).toMatchObject({ break_verloren: true, konzentration: null });
    expect(g(nach).ausloeser_diese_runde).toContain(r.eingehend.ausloeser.stagger);
    // Adrenalin 1: Schmerz ignorieren (kein Stagger).
    expect(staggerOhneTreffer(imGefecht(1), d).verhindert).toBe(true);
  });
});
