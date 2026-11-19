// Tests für Aktionen, Waffen und Schussrechner (konzept.md § 3.7a, § 3.8, § 3.8c, § 4.6, § 4.12).
import { describe, expect, it } from 'vitest';
import {
  bewegen, bewegungsarten, eigeneBewegungFuerLage, hechten, hechtenSperre, konzentrationSetzen, korrigieren, lageWaehlen, neuesZiel, standWechseln,
  verbrauchen, verfuegbar, zaehler, zielen, zielenAktiv, zielwirkung
} from '../src/lib/regeln/aktionen';
import { gefechtStarten, initiativeEintragen, leiterSetzen, naechsteRunde, senkenEintragen } from '../src/lib/regeln/gefecht';
import { gefechtVon } from '../src/lib/regeln/probenrechner';
import { lageAuswahl, schussAuswerten, schussStellen, schussUebernehmen, type Schusseinstellung } from '../src/lib/regeln/schuss';
import {
  aufsatzAbnehmen, aufsatzAnbringen, einzelnLaden, einzelnProAktion, einzelnTypen, loseAufsaetzeFuer, magazineFuellen, magazineFuer, kapazitaet, magazinLeeren, magazinsorteSetzen, ladehemmungBeheben, lhBehebenAnfrage, magazinWechseln, magazinHerausnehmen, platzFuer, mitLaderLaden, nachladearten, trommelmagazin,
  nachladenAlsBreak, neuerWaffenEintrag, passendeAufsaetze, waffenskill, wechselkosten, werferLaden
} from '../src/lib/regeln/waffen';
import { neuerCharakter, type Charakter, type Gefecht, type WaffenEintrag } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();
const r = d.regeln;

/** Alle Stats auf C ohne Abweichung: Statwert 60, Step-Reihe 60, 51, 38, 25, 14, 6. */
function fertig(extra: Partial<Charakter> = {}): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  for (const id of Object.keys(c.stats)) c.stats[id] = { rang: 'C', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
  return { ...c, status: 'fertig', erstellung: null, name: 'Mara', ...extra };
}
const g = (c: Charakter) => gefechtVon(c) as Gefecht;
const imGefecht = (stand = 0, extra: Partial<Charakter> = {}) => leiterSetzen(gefechtStarten(fertig(extra), false, 'erfolg', d), stand, d);
const auf = (...ids: string[]) => ids.map((id) => ({ id, zustand: 'A' }));
const mag = (inhalt: number, typ = 'FMJ', id = 'magazin_ak47_30') => ({ id, inhalt, typ: inhalt ? typ : '', zustand: 'A' });
/** Charakter mit diesen Waffen und Magazinen. */
const mitAusr = (c: Charakter, waffen: WaffenEintrag[], magazine: ReturnType<typeof mag>[] = []): Charakter => ({ ...c, ausruestung: { ...c.ausruestung, waffen, magazine } });
const mitMunition = (c: Charakter, ...m: { kaliber: string; typ: string; anzahl: number }[]): Charakter => ({ ...c, ausruestung: { ...c.ausruestung, munition: m } });
const waffe = (id: string, mehr: Partial<WaffenEintrag> = {}): WaffenEintrag => ({ ...neuerWaffenEintrag(id, d, `w_${id}`, 'schlinge'), ...mehr });
function bewaffnet(e: WaffenEintrag, extra: Partial<Charakter> = {}, stand = 0): Charakter {
  const c = imGefecht(stand, extra);
  return { ...c, ausruestung: { ...c.ausruestung, waffen: [e, ...c.ausruestung.waffen], aktive_waffe: e.id } };
}
const einstellung = (mehr: Partial<Schusseinstellung> = {}): Schusseinstellung => ({
  modus: 'EF', anzahl: 1, ansage: 'keine', ansage_zone: null, schalter: [], ausgeschaltet: [], sl: { malsteps: 0, stepshields: 0, grund: '' }, ...mehr
});

describe('Zähler der Aktionsleiste', () => {
  it('zu Beginn je 1; Verbrauchen zieht ab', () => {
    const c = imGefecht();
    expect(zaehler(c, d)).toEqual({ main: 1, break: 1, bewegung: 1, stand: 1 });
    expect(verfuegbar(verbrauchen(c, 'main'), 'main', d)).toBe(0);
  });

  it('Sprint ab Adrenalin 2: zwei Bewegungen', () => {
    expect(verfuegbar(imGefecht(2), 'bewegung', d)).toBe(2);
    expect(verfuegbar(imGefecht(1), 'bewegung', d)).toBe(1);
  });

  it('Over the Edge: ein gemeinsamer Zähler, nach einer Aktion alles 0 und keine zweite Bewegung', () => {
    const c = imGefecht(4);
    expect(zaehler(c, d)).toEqual({ main: 1, break: 1, bewegung: 1, stand: 1 });
    expect(zaehler(verbrauchen(c, 'break'), d)).toEqual({ main: 0, break: 0, bewegung: 0, stand: 0 });
  });

  it('Initiative-Krit: Break 2 in dieser Runde', () => {
    const c = initiativeEintragen(imGefecht(), { wurf: 3, stufe: 'krit', zielwert: 60 });
    expect(verfuegbar(c, 'break', d)).toBe(2);
  });

  it('Konzentration: Break 0; voll auch keine Bewegung und kein Standwechsel; leicht höchstens Gehen', () => {
    const leicht = konzentrationSetzen(imGefecht(), 'leicht');
    expect(zaehler(leicht, d)).toMatchObject({ break: 0, bewegung: 1, stand: 1 });
    expect(bewegungsarten(leicht, d).filter((b) => b.erlaubt).map((b) => b.id)).toEqual(['gehen']);
    expect(zaehler(konzentrationSetzen(imGefecht(), 'voll'), d)).toMatchObject({ break: 0, bewegung: 0, stand: 0 });
  });

  it('Korrektur von Hand ±1, nie unter 0', () => {
    let c = korrigieren(imGefecht(), 'main', 1, d);
    expect(verfuegbar(c, 'main', d)).toBe(2);
    c = korrigieren(korrigieren(korrigieren(c, 'main', -1, d), 'main', -1, d), 'main', -1, d);
    expect(verfuegbar(c, 'main', d)).toBe(0);
  });

  it('Senken verbraucht die Mainaction', () => {
    expect(verfuegbar(senkenEintragen(imGefecht(2), 'erfolg', d), 'main', d)).toBe(0);
  });

  it('Nächste Runde setzt Zähler, Bewegung, Hechten und Konzentration zurück', () => {
    let c = bewegen(konzentrationSetzen(verbrauchen(imGefecht(), 'main'), 'leicht'), 'gehen', d);
    c = naechsteRunde(c, { ausloeser: [], probe: null }, d);
    expect(zaehler(c, d)).toEqual({ main: 1, break: 1, bewegung: 1, stand: 1 });
    expect(g(c)).toMatchObject({ bewegt: null, gehechtet: false, konzentration: null });
  });
});

describe('Bewegung, Stand, Hechten', () => {
  it('Bewegungsart nach Stand: Stehen alle außer Kriechen, Hocke nur Gehen, Liegen nur Kriechen', () => {
    const erlaubt = (c: Charakter) => bewegungsarten(c, d).filter((b) => b.erlaubt).map((b) => b.id);
    const c = imGefecht();
    expect(erlaubt(c)).toEqual(['gehen', 'laufen', 'rennen']);
    expect(erlaubt(standWechseln(c, 'hocke', 'stand', d))).toEqual(['gehen']);
    expect(erlaubt(standWechseln(c, 'liegen', 'stand', d))).toEqual(['kriechen']);
  });

  it('Schutzanzug: höchstens Gehen', () => {
    const c = imGefecht(0);
    const mitAnzug = { ...c, ausruestung: { ...c.ausruestung, ruestung: [{ id: 'schutzanzug', zustand: 'A' }] } };
    expect(bewegungsarten(mitAnzug, d).find((b) => b.id === 'rennen')).toMatchObject({ erlaubt: false, grund: 'ausruestung' });
  });

  it('Sprint: die schnellere Bewegung zählt', () => {
    const c = bewegen(bewegen(imGefecht(2), 'rennen', d), 'gehen', d);
    expect(g(c)).toMatchObject({ bewegt: 'rennen', bewegungen: 2 });
  });

  it('R33: Rennen, dann Hocke → Gehen; Rennen, dann Liegen → Kriechen; Stehen erlaubt die Bewegung weiter', () => {
    const gerannt = bewegen(imGefecht(), 'rennen', d);
    expect(g(standWechseln(gerannt, 'hocke', 'stand', d)).bewegt).toBe('gehen');
    expect(g(standWechseln(gerannt, 'liegen', 'break', d)).bewegt).toBe('kriechen');
    expect(eigeneBewegungFuerLage(g(standWechseln(gerannt, 'hocke', 'stand', d)))).toBe('gehen');
    // Gehen bleibt in der Hocke Gehen; wieder aufstehen macht nicht schneller
    expect(g(standWechseln(bewegen(imGefecht(), 'gehen', d), 'hocke', 'stand', d)).bewegt).toBe('gehen');
    const zurueck = standWechseln(standWechseln(gerannt, 'hocke', 'stand', d), 'stehen', 'break', d);
    expect(g(zurueck).bewegt).toBe('gehen');
    // Ohne Bewegung bleibt es ohne Bewegung
    expect(g(standWechseln(imGefecht(), 'liegen', 'stand', d)).bewegt).toBeNull();
    // Hechten ins Liegen nach dem Rennen: für die Lage zählt Hechten (R9), die Bewegung sinkt auf Kriechen
    const gehechtet = hechten(gerannt, 'liegen', 'main', d);
    expect(g(gehechtet).bewegt).toBe('kriechen');
    expect(eigeneBewegungFuerLage(g(bewegen(gehechtet, 'kriechen', d)))).toBe('kriechen');
  });

  it('Standwechsel: über Stand verbraucht den Stand-Zähler, als Breakaction die Breakaction', () => {
    const c = standWechseln(imGefecht(), 'hocke', 'stand', d);
    expect(verfuegbar(c, 'stand', d)).toBe(0);
    const b = standWechseln(c, 'liegen', 'break', d);
    expect(verfuegbar(b, 'break', d)).toBe(0);
    expect(g(b).stand).toBe('liegen');
  });

  it('Hechten: gesperrt im Liegen und mit Ruhepuls 2; setzt Stand und zählt als Bewegung für die Lage', () => {
    expect(hechtenSperre(standWechseln(imGefecht(), 'liegen', 'stand', d), d)).toBe('stand');
    expect(hechtenSperre(imGefecht(-2), d)).toBe('symptom');
    expect(d.regeln.hechten.staende).toEqual(['liegen']); // R27: Hechten nur ins Liegen
    const c = hechten(imGefecht(), 'liegen', 'main', d);
    expect(g(c)).toMatchObject({ stand: 'liegen', gehechtet: true });
    expect(verfuegbar(c, 'main', d)).toBe(0);
  });

  it('R9: Bewegung und Hechten in derselben Runde – für die Lage zählt das zuletzt Gewählte', () => {
    const gerannt = bewegen(imGefecht(), 'rennen', d);
    expect(eigeneBewegungFuerLage(g(gerannt))).toBe('rennen');
    // Rennen, dann Hechten: Hechten zählt (2 statt 4 Malsteps)
    const danachGehechtet = hechten(gerannt, 'hocke', 'main', d);
    expect(eigeneBewegungFuerLage(g(danachGehechtet))).toBe('hechten');
    // Hechten, dann Gehen: Gehen zählt (1 statt 2 Malsteps)
    const danachGegangen = bewegen(hechten(imGefecht(), 'hocke', 'main', d), 'gehen', d);
    expect(eigeneBewegungFuerLage(g(danachGegangen))).toBe('gehen');
    expect(eigeneBewegungFuerLage(g(imGefecht()))).toBeNull();
  });
});

describe('Zielen', () => {
  it('als Breakaction: Stepshield für den nächsten Schuss in der nächsten Runde', () => {
    let c = zielen(imGefecht(), d, 'break', false);
    expect(zielenAktiv(g(c))).toBeNull();
    c = naechsteRunde(c, { ausloeser: [], probe: null }, d);
    expect(zielenAktiv(g(c))).toMatchObject({ stepshields: 1, ohne_reichweite: false });
    c = naechsteRunde(c, { ausloeser: [], probe: null }, d);
    expect(zielenAktiv(g(c))).toBeNull();
  });

  it('Atemkontrolle: 2 Stepshields, wenn liegend oder aufgelegt', () => {
    const c = imGefecht(0, { perks: ['atemkontrolle'] });
    expect(zielwirkung(c, d, false).stepshields).toBe(1);
    expect(zielwirkung(c, d, true)).toMatchObject({ stepshields: 2, perk: 'Atemkontrolle' });
  });

  it('Gezielter Schuss: ohne Bewegung keine Reichweite; bewegt er sich danach, bleibt der Stepshield', () => {
    let c = zielen(imGefecht(0, { perks: ['gezielter_schuss'] }), d, 'break', false);
    expect(g(c).zielen).toMatchObject({ ohne_reichweite: true, stepshields: 0 });
    c = bewegen(c, 'gehen', d);
    expect(g(c).zielen).toMatchObject({ ohne_reichweite: false, stepshields: 1 });
  });
});

describe('Waffen', () => {
  it('Kapazität mit Patrone im Lauf; das eingesetzte Magazin bestimmt die Größe; Trommel', () => {
    expect(waffe('m4').magazin).toEqual({ id: 'magazin_stanag_20', zustand: 'A' });
    expect(kapazitaet(waffe('m4'), d)).toBe(21);
    expect(kapazitaet(waffe('m4', { magazin: { id: 'magazin_stanag_30', zustand: 'A' } }), d)).toBe(31);
    expect(trommelmagazin(waffe('m4', { magazin: { id: 'trommel_stanag_100', zustand: 'A' } }), d)).toBe(true);
    expect(trommelmagazin(waffe('m4'), d)).toBe(false);
    expect(kapazitaet(waffe('sw_model_10'), d)).toBe(6);
  });

  it('passende Aufsätze nach Anschlüssen; Magazine sind keine Aufsätze', () => {
    const ids = passendeAufsaetze(d.waffen.eintraege.find((w) => w.id === 'm4')!, d).map((a) => a.id);
    expect(ids).toContain('reflexvisier');
    expect(ids.some((id) => id.includes('magazin'))).toBe(false);
    expect(passendeAufsaetze(d.waffen.eintraege.find((w) => w.id === 'makarov')!, d)).toEqual([]);
  });

  it('M4 und M16A4 teilen sich ihre Magazine (R49)', () => {
    const c = mitAusr(fertig(), [], [mag(20, 'FMJ', 'magazin_stanag_20'), mag(30, 'FMJ', 'magazin_stanag_30'), mag(30)]);
    expect(magazineFuer(c, waffe('m4'), d).map((x) => x.index)).toEqual([0, 1]);
    expect(magazineFuer(c, waffe('m16a4'), d).map((x) => x.index)).toEqual([0, 1]);
    expect(magazineFuer(c, waffe('ak47'), d).map((x) => x.index)).toEqual([2]);
  });

  it('Waffenskill aus der Kategorie', () => {
    expect(waffenskill(d.waffen.eintraege.find((w) => w.id === 'ak47')!, d)).toBe('waffe_ar');
    expect(waffenskill(d.waffen.eintraege.find((w) => w.id === 'mosin_nagant')!, d)).toBe('waffe_praezision');
  });

  it('Magazin wechseln: Rest mit Typ zu den Magazinen, Patrone im Lauf bleibt; R46: Waffe trägt den Typ des neuen Magazins', () => {
    const e = waffe('ak47', { im_magazin: 26, munitionstyp: 'FMJ' });
    const c = magazinWechseln(mitAusr(fertig(), [e], [mag(30, 'HP'), mag(30), mag(12)]), e, 0, d);
    expect(c.ausruestung.waffen[0]).toMatchObject({ im_magazin: 31, munitionstyp: 'HP', magazin: { id: 'magazin_ak47_30', zustand: 'A' } });
    expect(c.ausruestung.magazine).toEqual([mag(30), mag(12), mag(25)]);
    const leer = waffe('ak47', { im_magazin: 0 });
    expect(magazinWechseln(mitAusr(fertig(), [leer], [mag(30)]), leer, 0, d).ausruestung).toMatchObject({ waffen: [{ im_magazin: 30 }], magazine: [mag(0)] });
  });

  it('Magazin wechseln: ein leeres altes Magazin bleibt als leeres Magazin; eine Trommel ersetzt das Standardmagazin', () => {
    const e = waffe('ak47', { im_magazin: 1 });
    expect(magazinWechseln(mitAusr(fertig(), [e], [mag(30)]), e, 0, d).ausruestung.magazine).toEqual([mag(0)]);
    const t = magazinWechseln(mitAusr(fertig(), [e], [mag(75, 'FMJ', 'trommel_ak47_75')]), e, 0, d);
    expect(t.ausruestung.waffen[0]).toMatchObject({ im_magazin: 76, magazin: { id: 'trommel_ak47_75' } });
    expect(kapazitaet(t.ausruestung.waffen[0]!, d)).toBe(76);
    expect(t.ausruestung.magazine).toEqual([mag(0)]);
  });

  it('R50: leeres Magazin einsetzen; die Patrone im Lauf behält ihren Typ', () => {
    const e = waffe('ak47', { im_magazin: 12, munitionstyp: 'HP' });
    const c = magazinWechseln(mitAusr(fertig(), [e], [mag(0)]), e, 0, d);
    expect(c.ausruestung.waffen[0]).toMatchObject({ im_magazin: 1, munitionstyp: 'HP', magazin: { id: 'magazin_ak47_30' } });
    expect(c.ausruestung.magazine).toEqual([mag(11, 'HP')]);
    const leer = waffe('ak47', { im_magazin: 0 });
    expect(magazinWechseln(mitAusr(fertig(), [leer], [mag(0)]), leer, 0, d).ausruestung.waffen[0]).toMatchObject({ im_magazin: 0, munitionstyp: '' });
  });

  it('R50: Magazin herausnehmen; Rest zu den Magazinen, Patrone im Lauf bleibt, Waffe ohne Magazin', () => {
    const e = waffe('ak47', { im_magazin: 26, munitionstyp: 'FMJ' });
    const c = magazinHerausnehmen(mitAusr(fertig(), [e], []), e, d);
    const w = c.ausruestung.waffen[0]!;
    expect(w).toMatchObject({ im_magazin: 1, munitionstyp: 'FMJ' });
    expect(w.magazin).toBeUndefined();
    expect(c.ausruestung.magazine).toEqual([mag(25)]);
    expect(kapazitaet(w, d)).toBe(1);
    expect(platzFuer(c, w, { art: 'waffe' }, 'FMJ', d)).toBe(0);
    expect(nachladearten(c, w, d)).toEqual([{ art: 'magazin', vorwahl: 0 }]);
    // Wieder einsetzen
    const z = magazinWechseln(c, w, 0, d);
    expect(z.ausruestung.waffen[0]).toMatchObject({ im_magazin: 26, magazin: { id: 'magazin_ak47_30' } });
    expect(z.ausruestung.magazine).toEqual([]);
    // Ohne Magazin ändert Herausnehmen nichts
    expect(magazinHerausnehmen(c, w, d)).toBe(c);
  });

  it('Magazin wechseln: ein Magazin, das nicht passt, ändert nichts', () => {
    const e = waffe('ak47', { im_magazin: 5 });
    const c = mitAusr(fertig(), [e], [mag(20, 'FMJ', 'magazin_stanag_20')]);
    expect(magazinWechseln(c, e, 0, d)).toBe(c);
  });

  it('Magazine füllen mit einem Typ: erst die Waffe, dann angebrochene, dann leere passende Magazine; anderer Typ bleibt', () => {
    const e = waffe('ak47', { im_magazin: 20, munitionstyp: 'FMJ' });
    const c = mitMunition(mitAusr(fertig(), [e], [mag(12, 'HP'), mag(0), mag(10), mag(0, 'FMJ', 'magazin_stanag_20'), mag(0)]),
      { kaliber: '762x39', typ: 'FMJ', anzahl: 50 }, { kaliber: '762x39', typ: 'HP', anzahl: 5 });
    const f = magazineFuellen(c, e, 'FMJ', d);
    expect(f.schritte.map((s) => [s.ziel, s.vorher, s.nachher])).toEqual([
      [{ art: 'waffe' }, 20, 31], [{ art: 'magazin', index: 2 }, 10, 30], [{ art: 'magazin', index: 1 }, 0, 19]]);
    expect(f.nach.ausruestung.magazine).toEqual([mag(12, 'HP'), mag(19), mag(30), mag(0, 'FMJ', 'magazin_stanag_20'), mag(0)]);
    expect(f.nach.ausruestung.waffen[0]!.im_magazin).toBe(31);
    expect(f.patronen).toBe(50);
    expect(f.nach.ausruestung.munition).toEqual([{ kaliber: '762x39', typ: 'HP', anzahl: 5 }]);
  });

  it('Magazine füllen ohne Wechselmagazin: Schnelllader nur ganz', () => {
    const z = (inhalt: number) => mag(inhalt, 'FMJ', 'schnelllader_sw_model_10');
    const e = waffe('sw_model_10');
    const f = magazineFuellen(mitMunition(mitAusr(fertig(), [e], [z(0), z(0), z(0)]), { kaliber: '38spc', typ: 'FMJ', anzahl: 14 }), e, 'FMJ', d);
    expect(f.nach.ausruestung.magazine).toEqual([z(6), z(6), z(0)]);
    expect(f.nach.ausruestung.munition).toEqual([{ kaliber: '38spc', typ: 'FMJ', anzahl: 2 }]);
  });

  it('Leeren: Patronen kommen zur losen Munition ihres Typs', () => {
    const c = magazinLeeren(mitMunition(mitAusr(fertig(), [], [mag(12, 'HP')]), { kaliber: '762x39', typ: 'HP', anzahl: 3 }), 0, d);
    expect(c.ausruestung.munition).toEqual([{ kaliber: '762x39', typ: 'HP', anzahl: 15 }]);
    expect(c.ausruestung.magazine).toEqual([mag(0)]);
  });

  it('Nachladearten: Vorwahl ist das vollste passende Magazin vom bisherigen Typ, sonst das vollste', () => {
    const mags = [mag(12), mag(30, 'HP'), mag(20), mag(30, 'FMJ', 'magazin_stanag_30')];
    const fmj = waffe('ak47', { im_magazin: 3, munitionstyp: 'FMJ' });
    expect(nachladearten(mitAusr(fertig(), [fmj], mags), fmj, d)).toEqual([{ art: 'magazin', vorwahl: 2 }]);
    const ap = waffe('ak47', { im_magazin: 3, munitionstyp: 'AP' });
    expect(nachladearten(mitAusr(fertig(), [ap], mags), ap, d)).toEqual([{ art: 'magazin', vorwahl: 1 }]);
    expect(nachladearten(mitAusr(fertig(), [ap], [mag(0), mag(30, 'FMJ', 'magazin_stanag_30')]), ap, d)).toEqual([]);
  });

  it('Schreibmodus: Sorte des eingesetzten Magazins ändern; überzählige Patronen werden lose', () => {
    const e = waffe('m4', { im_magazin: 31, munitionstyp: 'FMJ', magazin: { id: 'magazin_stanag_30', zustand: 'B' } });
    const c = magazinsorteSetzen(mitAusr(fertig(), [e]), e, 'magazin_stanag_20', d);
    expect(c.ausruestung.waffen[0]).toMatchObject({ im_magazin: 21, magazin: { id: 'magazin_stanag_20', zustand: 'B' } });
    expect(c.ausruestung.munition).toEqual([{ kaliber: '556x45', typ: 'FMJ', anzahl: 10 }]);
    expect(magazinsorteSetzen(c, c.ausruestung.waffen[0]!, 'magazin_ak47_30', d)).toBe(c);
  });

  it('einzeln laden: 2 Patronen, mit Fingerfertig 3; nie über die Kapazität', () => {
    expect(einzelnProAktion(fertig(), d)).toBe(2);
    expect(einzelnProAktion(fertig({ perks: ['fingerfertig'] }), d)).toBe(3);
    const e = waffe('sw_model_10', { im_magazin: 2, munitionstyp: 'FMJ' });
    const c = { ...mitMunition(fertig(), { kaliber: '38spc', typ: 'FMJ', anzahl: 10 }), };
    const mitWaffe = { ...c, ausruestung: { ...c.ausruestung, waffen: [e] } };
    const nach = einzelnLaden(mitWaffe, e, 2, 'FMJ', d);
    expect(nach.ausruestung.waffen[0]!.im_magazin).toBe(4);
    expect(nach.ausruestung.munition).toEqual([{ kaliber: '38spc', typ: 'FMJ', anzahl: 8 }]);
    const fast = { ...e, im_magazin: 5 };
    expect(einzelnLaden({ ...mitWaffe, ausruestung: { ...mitWaffe.ausruestung, waffen: [fast] } }, fast, 3, 'FMJ', d).ausruestung.munition[0]!.anzahl).toBe(9);
  });

  it('einzeln laden: nur ein Typ je Ladung; ein anderer erst, wenn die Waffe leer ist', () => {
    const c = mitMunition(fertig(), { kaliber: '38spc', typ: 'FMJ', anzahl: 10 }, { kaliber: '38spc', typ: 'HP', anzahl: 4 });
    const halb = waffe('sw_model_10', { im_magazin: 3, munitionstyp: 'FMJ' });
    expect(einzelnTypen(c, halb, d)).toEqual([{ typ: 'FMJ', anzahl: 10 }]);
    expect(einzelnLaden(c, halb, 2, 'HP', d)).toBe(c);
    const leer = waffe('sw_model_10', { im_magazin: 0, munitionstyp: 'FMJ' });
    expect(einzelnTypen(c, leer, d).map((t) => t.typ)).toEqual(['FMJ', 'HP']);
    expect(nachladearten(c, leer, d)).toEqual([{ art: 'einzeln', patronen: 2, typen: [{ typ: 'FMJ', anzahl: 10 }, { typ: 'HP', anzahl: 4 }] }]);
  });

  it('Schnelllader füllt die Trommel mit seinem Typ und bleibt leer zurück; Reste kommen zur losen Munition', () => {
    const z = (inhalt: number, typ = 'HP') => mag(inhalt, typ, 'schnelllader_sw_model_10');
    const e = waffe('sw_model_10', { im_magazin: 1, munitionstyp: 'FMJ' });
    const c = mitAusr(fertig(), [e], [z(6), z(6)]);
    expect(nachladearten(c, e, d)).toEqual([{ art: 'lader', sorte: 'schnelllader_sw_model_10', typ: 'HP', gefuellt: 2 }]);
    const nach = mitLaderLaden(c, e, 'schnelllader_sw_model_10', 'HP', d);
    expect(nach.ausruestung.waffen[0]).toMatchObject({ im_magazin: 6, munitionstyp: 'HP' });
    expect(nach.ausruestung.magazine).toEqual([z(0), z(6)]);
    expect(nach.ausruestung.munition).toEqual([{ kaliber: '38spc', typ: 'FMJ', anzahl: 1 }]);
    expect(nachladenAlsBreak(fertig({ perks: ['schnell_nachladen'] }), 'lader', d)).toBe(true);
    expect(nachladenAlsBreak(fertig({ perks: ['schnell_nachladen'] }), 'einzeln', d)).toBe(false);
  });

  it('Aufsatz anbringen und abnehmen: lose ↔ an der Waffe', () => {
    const e = waffe('m4', { im_magazin: 21, munitionstyp: 'FMJ', aufsaetze: auf('lampe') });
    let c = fertig();
    c = { ...c, ausruestung: { ...c.ausruestung, waffen: [e], aufsaetze: auf('reflexvisier', 'zweibein') } };
    expect(loseAufsaetzeFuer(c, e, d).map((l) => l.aufsatz.id)).toEqual(['reflexvisier', 'zweibein']);
    c = aufsatzAnbringen(c, e, 0, d);
    expect(c.ausruestung.waffen[0]!.aufsaetze).toEqual(auf('lampe', 'reflexvisier'));
    expect(c.ausruestung.aufsaetze).toEqual(auf('zweibein'));
    c = aufsatzAbnehmen(c, c.ausruestung.waffen[0]!, 'lampe', d);
    expect(c.ausruestung.waffen[0]).toMatchObject({ im_magazin: 21, aufsaetze: auf('reflexvisier') });
    expect(c.ausruestung.aufsaetze).toEqual(auf('zweibein', 'lampe'));
  });

  it('Werfer laden nimmt ein Geschoss aus dem Vorrat', () => {
    const e = waffe('rpg7');
    let c = fertig();
    c = { ...c, ausruestung: { ...c.ausruestung, waffen: [e], vorrat: [{ id: 'pg7v', anzahl: 2, trageort: 'rucksack' }] } };
    expect(nachladearten(c, e, d)).toEqual([{ art: 'werfer', geschosse: [{ id: 'pg7v', anzahl: 2 }] }]);
    c = werferLaden(c, e, 'pg7v');
    expect(c.ausruestung.waffen[0]).toMatchObject({ munitionstyp: 'pg7v', im_magazin: 1 });
    expect(c.ausruestung.vorrat[0]!.anzahl).toBe(1);
  });

  it('Waffe wechseln: der teurere Trageort zählt; Schnellzieher zieht aus dem Holster ohne Aktion', () => {
    const lang = { ...waffe('ak47'), id: 'a', trageort: 'schlinge' };
    const pistole = { ...waffe('m1911'), id: 'b', trageort: 'holster' };
    const c = { ...fertig(), ausruestung: { ...fertig().ausruestung, waffen: [lang, pistole], aktive_waffe: 'a' } };
    expect(wechselkosten(c, 'b', d).kosten).toBe('main');
    expect(wechselkosten({ ...c, perks: ['schnellzieher'] }, 'b', d)).toEqual({ kosten: 'ohne', perk: 'Schnellzieher' });
    const ruecken = { ...c, ausruestung: { ...c.ausruestung, waffen: [lang, { ...pistole, trageort: 'rucksack' }] } };
    expect(wechselkosten(ruecken, 'b', d).kosten).toMatchObject({ aktion: 'main', konzentration: 'leicht', runden: 2 });
  });

  it('Ladehemmung beheben: Control mit Waffenskill und LH-Behebenmod.; schwere senkt den Zustand', () => {
    expect(lhBehebenAnfrage(waffe('m4'), d)).toMatchObject({ stat: 'control', skill: 'waffe_ar', fest: [{ malsteps: 1 }] });
    expect(ladehemmungBeheben(waffe('m4', { ladehemmung: 'einfach' }), 'misserfolg', d).ladehemmung).toBe('einfach');
    expect(ladehemmungBeheben(waffe('m4', { ladehemmung: 'einfach' }), 'erfolg', d)).toMatchObject({ ladehemmung: null, zustand: 'A' });
    expect(ladehemmungBeheben(waffe('m4', { ladehemmung: 'schwer', zustand: 'B' }), 'erfolg', d)).toMatchObject({ ladehemmung: null, zustand: 'C' });
  });
});

describe('Schussrechner', () => {
  const nah = (c: Charakter) => lageWaehlen(c, 'entfernung', 'nah');

  it('ohne Entfernung gesperrt; Grundfall nah: Reichweite 1 + Skill 0 → Trefferwert 38', () => {
    const c = bewaffnet(waffe('ak47'));
    expect(schussStellen(c, d, waffe('ak47'), einstellung()).sperre).toBe('entfernung');
    const v = schussStellen(nah(c), d, waffe('ak47'), einstellung());
    expect(v.sperre).toBeNull();
    expect(v.probe.wert).toMatchObject({ netto: 2, zielwert: 38 });
    expect(v.haltezahl).toBeNull();
  });

  it('Standard der Lage-Gruppen: ruhendes, stehendes Ziel, Person', () => {
    const a = lageAuswahl(g(imGefecht()), d);
    expect(a).toMatchObject({ entfernung: null, ziel_bewegung: 'ziel_steht', ziel_stand: 'ziel_stehend', ziel_groesse: 'ziel_normal', schuetze: [] });
  });

  it('Lage, Ansage, eigene Bewegung und Zielen fließen ein; Reflexvisier nur in bedrängt und nah', () => {
    let c = nah(bewaffnet(waffe('m4', { aufsaetze: auf('reflexvisier') }), { skills: { waffe_ar: 2 } }));
    c = lageWaehlen(c, 'ziel_bewegung', 'ziel_laeuft');
    c = bewegen(c, 'gehen', d);
    const v = schussStellen(c, d, waffe('m4', { aufsaetze: auf('reflexvisier') }), einstellung({ ansage: 'rumpf' }));
    // Malsteps: Ziel läuft 1, eigene Bewegung 1, Ansage Rumpf 1 = 3; Abzug: Skill 2 + Reflexvisier 1 = 3 → netto 0.
    expect(v.probe.wert).toMatchObject({ malsteps: 3, abzug: 3, netto: 0, zielwert: 60 });
    const weit = lageWaehlen(c, 'entfernung', 'weit');
    expect(schussStellen(weit, d, waffe('m4', { aufsaetze: auf('reflexvisier') }), einstellung()).probe.quellen.some((q) => q.herkunft === 'aufsatz')).toBe(false);
  });

  it('aufgelegt nur ohne eigene Bewegung; Zweibein setzt „aufgelegt“', () => {
    const e = waffe('m4', { aufsaetze: auf('zweibein') });
    const c = nah(bewaffnet(e));
    const mit = schussStellen(c, d, e, einstellung({ schalter: ['zweibein'] }));
    expect(mit.probe.quellen.some((q) => q.id === 'lage:aufgelegt')).toBe(true);
    const bewegt = schussStellen(bewegen(c, 'gehen', d), d, e, einstellung({ schalter: ['zweibein'] }));
    expect(bewegt.probe.quellen.some((q) => q.id === 'lage:aufgelegt')).toBe(false);
  });

  it('CQB: im Band bedrängt keine Malsteps der Reichweite; Feuer in Bewegung: 1 Malstep weniger', () => {
    const c = lageWaehlen(bewaffnet(waffe('ak47'), { perks: ['cqb', 'feuer_in_bewegung'] }), 'entfernung', 'bedraengt');
    expect(schussStellen(c, d, waffe('ak47'), einstellung()).probe.wert).toMatchObject({ malsteps: 1 });
    const gelaufen = bewegen(c, 'laufen', d);
    expect(schussStellen(gelaufen, d, waffe('ak47'), einstellung()).probe.wert).toMatchObject({ malsteps: 2 });
  });

  it('Haltezahl: Brawn 60, Rückstoß 3 + Skill 0 → 14 → 1; liegend 1 Stepshield → 25 → 2; Vordergriff ebenso', () => {
    const e = waffe('ak47');
    const c = nah(bewaffnet(e));
    expect(schussStellen(c, d, e, einstellung({ modus: 'VA', anzahl: 10 })).haltezahl!.wert).toBe(1);
    expect(schussStellen(standWechseln(c, 'liegen', 'stand', d), d, e, einstellung({ modus: 'VA', anzahl: 10 })).haltezahl!.wert).toBe(2);
    const m4 = waffe('m4', { aufsaetze: auf('vordergriff') });
    // M4 VA: Rückstoß 2 + Skill 0 = 3, Vordergriff 1 → netto 2 → 38 → 3.
    expect(schussStellen(nah(bewaffnet(m4)), d, m4, einstellung({ modus: 'VA', anzahl: 10 })).haltezahl!.wert).toBe(3);
  });

  it('Burst: Schüsse = Bursts × Länge, höchstens Feuerrate; nie mehr als im Magazin', () => {
    const e = waffe('m16a4');
    const c = nah(bewaffnet(e));
    expect(schussStellen(c, d, e, einstellung({ modus: 'Burst', anzahl: 2 })).schuesse).toBe(6);
    expect(schussStellen(c, d, { ...e, im_magazin: 4 }, einstellung({ modus: 'Burst', anzahl: 2 })).schuesse).toBe(4);
  });

  it('Vollautomatik: Folgetreffer mit Garbenfaktor, höchstens angesagte Schüsse − 1', () => {
    const e = waffe('ak47', { im_magazin: 31 });
    const c = nah(bewaffnet(e, { skills: { waffe_ar: 2, rueckstosskontrolle: 2 } }));
    const s = einstellung({ modus: 'VA', anzahl: 10 });
    const v = schussStellen(c, d, e, s);
    // Haltezahl: Rückstoß 3, Skill 2 → netto 1 → 51 → 5. Rückstoßwürfel 1 → 4 Folgetreffer × 2 Kugeln = 8 (≤ 9).
    expect(v.haltezahl!.wert).toBe(5);
    const b = schussAuswerten(c, d, v, s, { wurf: 30, w8: 7, rueckstoss: 1 });
    expect(b).toMatchObject({ ladehemmung: 'keine', stufe: 'erfolg', folgetreffer: 4, verbraucht: 10, magazin_nachher: 21 });
    expect(b.treffer).toEqual([{ zone: 'brust', kugeln: 1, krit: false, folgetreffer: false }, { zone: 'brust', kugeln: 8, krit: false, folgetreffer: true }]);
  });

  it('Misserfolg: alle Schüsse ins Leere, Munition verbraucht', () => {
    const e = waffe('ak47');
    const c = nah(bewaffnet(e));
    const s = einstellung({ anzahl: 3 });
    const b = schussAuswerten(c, d, schussStellen(c, d, e, s), s, { wurf: 90, w8: 7, rueckstoss: 5 });
    expect(b).toMatchObject({ stufe: 'misserfolg', treffer: [], verbraucht: 3, magazin_nachher: 28 });
  });

  it('Ladehemmung: Wurf über 100 − Rate, kein Schuss, Magazin bleibt; 100 = schwer', () => {
    const e = waffe('m4', { zustand: 'C' });
    const c = nah(bewaffnet(e));
    const s = einstellung();
    const v = schussStellen(c, d, e, s);
    expect(v.lh_rate).toBe(9); // EF 4 + Zustand C (normal) 5
    expect(schussAuswerten(c, d, v, s, { wurf: 91, w8: 1, rueckstoss: null }).ladehemmung).toBe('keine');
    expect(schussAuswerten(c, d, v, s, { wurf: 92, w8: 1, rueckstoss: null })).toMatchObject({ ladehemmung: 'einfach', verbraucht: 0, magazin_nachher: 21 });
    expect(schussAuswerten(c, d, v, s, { wurf: 100, w8: 1, rueckstoss: null }).ladehemmung).toBe('schwer');
  });

  it('Buckshot: Schrotzahl im Band, Zonen fortlaufend nach unten, nur die erste Kugel kann critten', () => {
    const e = waffe('spas12', { munitionstyp: 'Buckshot' });
    const c = nah(bewaffnet(e, { skills: { waffe_schrot: 3 } }));
    const s = einstellung();
    const v = schussStellen(c, d, e, s);
    expect(v.kugeln).toBe(3);
    const b = schussAuswerten(c, d, v, s, { wurf: 2, w8: 7, rueckstoss: null });
    expect(b.treffer).toEqual([
      { zone: 'brust', kugeln: 1, krit: true, folgetreffer: false },
      { zone: 'bauch', kugeln: 1, krit: false, folgetreffer: false },
      { zone: 'unterleib', kugeln: 1, krit: false, folgetreffer: false }
    ]);
  });

  it('Triple Tap: Ansage Bauch, erster Folgetreffer Brust, weitere Kopf', () => {
    const e = waffe('ak47');
    const c = nah(bewaffnet(e, { perks: ['triple_tap'], skills: { waffe_ar: 5, rueckstosskontrolle: 5 } }));
    const s = einstellung({ anzahl: 3, ansage: 'zone', ansage_zone: 'bauch' });
    const b = schussAuswerten(c, d, schussStellen(c, d, e, s), s, { wurf: 20, w8: null, rueckstoss: 1 });
    expect(b.treffer.map((t) => t.zone)).toEqual(['bauch', 'brust', 'kopf']);
  });

  it('Ziel im Nahkampf: Fehlschuss trifft einen anderen Beteiligten in der Zone des W8, nie kritisch', () => {
    const e = waffe('ak47');
    const c = lageWaehlen(nah(bewaffnet(e)), 'ziel_bewegung', 'ziel_nahkampf');
    const s = einstellung({ ansage: 'zone', ansage_zone: 'kopf' });
    const v = schussStellen(c, d, e, s);
    expect(v.nahkampf).toBe(true);
    const b = schussAuswerten(c, d, v, s, { wurf: 95, w8: 2, rueckstoss: null });
    expect(b).toMatchObject({ stufe: 'misserfolg', fehlschuss_beteiligter: true, treffer: [{ zone: 'bein_r', kugeln: 1, krit: false }] });
  });

  it('Werfer: Landepunkt nach Ergebnis, bei Misserfolg Richtung aus dem W8', () => {
    const e = waffe('rpg7', { munitionstyp: 'pg7v', im_magazin: 1 });
    const c = nah(bewaffnet(e));
    const s = einstellung();
    const v = schussStellen(c, d, e, s);
    expect(v.werfer).toBe(true);
    expect(schussAuswerten(c, d, v, s, { wurf: 90, w8: 3, rueckstoss: null }).landepunkt).toEqual({ stufe: 'misserfolg', richtung: 'links' });
  });

  it('Übernehmen: Magazin, Break −1, Auslöser „geschossen“, Zielen verbraucht, Protokoll', () => {
    const e = waffe('ak47');
    let c = nah(bewaffnet(e));
    c = naechsteRunde(zielen(c, d, 'break', false), { ausloeser: [], probe: null }, d);
    const s = einstellung({ anzahl: 2 });
    const v = schussStellen(c, d, e, s);
    expect(v.probe.quellen.some((q) => q.id === 'zielen')).toBe(true);
    const b = schussAuswerten(c, d, v, s, { wurf: 10, w8: 7, rueckstoss: 9 });
    c = schussUebernehmen(c, d, e, b, ['Treffer']);
    expect(c.ausruestung.waffen[0]!.im_magazin).toBe(29);
    expect(verfuegbar(c, 'break', d)).toBe(0);
    expect(g(c).ausloeser_diese_runde).toContain('geschossen');
    expect(g(c).zielen).toBeNull();
    expect(g(c).protokoll.at(-1)).toMatchObject({ art: 'schuss', text: ['Treffer'] });
  });

  it('Neues Ziel setzt Entfernung, Stand und Größe zurück, Bewegung des Ziels bleibt', () => {
    let c = lageWaehlen(nah(imGefecht()), 'ziel_bewegung', 'ziel_laeuft');
    c = neuesZiel(c, d);
    expect(g(c).lage.auswahl).toEqual({ ziel_bewegung: 'ziel_laeuft' });
  });

  it('Rundenende setzt Bewegung des Ziels und „aufgelegt“ zurück, die Entfernung bleibt', () => {
    let c = lageWaehlen(lageWaehlen(nah(imGefecht()), 'ziel_bewegung', 'ziel_laeuft'), 'schuetze', ['aufgelegt']);
    c = naechsteRunde(c, { ausloeser: [], probe: null }, d);
    expect(g(c).lage.auswahl).toEqual({ entfernung: 'nah' });
  });
});

describe('Regeldaten', () => {
  it('regeln.json kennt die Werte für Schritt 6', () => {
    expect(r.schiessen.stat).toBe('control');
    expect(r.aktionen).toMatchObject({ main: 1, break: 1, over_the_edge_gesamt: 1, sprint_bewegung: 2 });
  });
});
