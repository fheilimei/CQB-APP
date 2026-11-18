// Tests für Blutung und Versorgen (konzept.md § 3.10, § 4.8; Regelwerk: Schaden, Blutung und Verletzungen, Blutung).
import { describe, expect, it } from 'vitest';
import {
  blutet, fristAblaufen, fristablauf, fristMinuten, fristVerlaengert, massnahmenFuer, versorgbareWunden, versorgen,
  versorgenAnfrage, versorgenKonzentration, versorgenTrivial
} from '../src/lib/regeln/blutung';
import { gefechtStarten } from '../src/lib/regeln/gefecht';
import { hpAktuell } from '../src/lib/regeln/modifikatoren';
import { lebenslageDes } from '../src/lib/regeln/probenrechner';
import { schadenDirekt, trefferUebernehmen } from '../src/lib/regeln/wunden';
import { neuerCharakter, type Charakter } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();

/** Alle Stats auf C, ohne Perks: HP 8. */
function fertig(): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  for (const id of Object.keys(c.stats)) c.stats[id] = { rang: 'C', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
  return { ...c, status: 'fertig', erstellung: null, name: 'Mara' };
}
const U = { quelle: 'Schuss', schuss: true };
const treffer = (c: Charakter, zone: string, mw: number, krit = false) =>
  trefferUebernehmen(c, { zone, dk: 3, mw, kugeln: 1, krit, deckung: null }, U, d);
const w = (c: Charakter, i = 0) => c.spielstand.wunden[i]!;

describe('Fristen', () => {
  it('normale Wunde: 10 Minuten, kritisch an Gliedmaßen 5, kritisch am Rumpf 1', () => {
    expect(fristMinuten(w(treffer(fertig(), 'bein_r', 1)), d)).toBe(10);
    expect(fristMinuten(w(treffer(fertig(), 'arm_l', 1, true)), d)).toBe(5);
    expect(fristMinuten(w(treffer(fertig(), 'bauch', 1, true)), d)).toBe(1);
  });

  it('Druckverband verdoppelt die Frist einer kritischen Rumpfblutung einmal; die Wunde blutet weiter', () => {
    let c = treffer(fertig(), 'unterleib', 1, true);
    expect(massnahmenFuer(w(c), d).map((m) => m.id)).toEqual(['druckverband', 'operation']);
    c = versorgen(c, w(c).id, 'druckverband', d);
    expect(fristMinuten(w(c), d)).toBe(2);
    expect(fristVerlaengert(w(c), d)).toBe(true);
    expect(blutet(w(c))).toBe(true);
    // Ein zweiter Druckverband wirkt nicht mehr; nur noch die Operation stoppt.
    expect(massnahmenFuer(w(c), d).map((m) => m.id)).toEqual(['operation']);
    c = versorgen(c, w(c).id, 'operation', d);
    expect(blutet(w(c))).toBe(false);
    expect(w(c).versorgt).toBe('operation');
    expect(fristVerlaengert(w(c), d)).toBe(false);
  });
});

describe('Versorgen', () => {
  it('Druckverband stoppt eine normale Blutung', () => {
    let c = treffer(fertig(), 'bein_r', 1);
    expect(massnahmenFuer(w(c), d).map((m) => m.id)).toEqual(['druckverband']);
    c = versorgen(c, w(c).id, 'druckverband', d);
    expect(w(c).blutung.status).toBe('gestoppt');
    expect(w(c).versorgt).toBe('druckverband');
    expect(versorgbareWunden(c, d)).toHaveLength(0);
  });

  it('Tourniquet stoppt eine kritische Blutung an Armen und Beinen; ein Druckverband geht dort nicht', () => {
    let c = treffer(fertig(), 'bein_l', 1, true);
    expect(massnahmenFuer(w(c), d).map((m) => m.id)).toEqual(['tourniquet']);
    expect(() => versorgen(c, w(c).id, 'druckverband', d)).toThrow();
    c = versorgen(c, w(c).id, 'tourniquet', d);
    expect(blutet(w(c))).toBe(false);
  });

  it('versorgte kritische Wunde hält die Kampfunfähigkeit aufrecht (offen bis geheilt)', () => {
    let c = treffer(fertig(), 'arm_r', 1, true);
    c = versorgen(c, w(c).id, 'tourniquet', d);
    expect(lebenslageDes(c, d)).toBe('kampfunfaehig');
  });

  it('Probe: Erste Hilfe bzw. Operation auf Control', () => {
    expect(versorgenAnfrage('druckverband', d)).toMatchObject({ stat: 'control', skill: 'erste_hilfe', probe: 'versorgen' });
    expect(versorgenAnfrage('tourniquet', d)).toMatchObject({ stat: 'control', skill: 'erste_hilfe' });
    expect(versorgenAnfrage('operation', d)).toMatchObject({ stat: 'control', skill: 'operation' });
  });

  it('Druckverband nach dem Gefecht ab Erste Hilfe 1 trivial, im Gefecht und mit Skill 0 nicht', () => {
    const ohne = fertig();
    const mit = { ...fertig(), skills: { erste_hilfe: 1 } };
    expect(versorgenTrivial(ohne, 'druckverband', d)).toBe(false);
    expect(versorgenTrivial(mit, 'druckverband', d)).toBe(true);
    expect(versorgenTrivial(mit, 'tourniquet', d)).toBe(false);
    expect(versorgenTrivial(gefechtStarten(mit, false, 'erfolg', d), 'druckverband', d)).toBe(false);
  });

  it('volle Konzentration; mit Feldversorgung leicht (nur Erste Hilfe)', () => {
    expect(versorgenKonzentration(fertig(), 'druckverband', d)).toBe('voll');
    const sani = { ...fertig(), perks: ['feldversorgung'] };
    expect(versorgenKonzentration(sani, 'druckverband', d)).toBe('leicht');
    expect(versorgenKonzentration(sani, 'tourniquet', d)).toBe('leicht');
    expect(versorgenKonzentration(sani, 'operation', d)).toBe('voll');
  });
});

describe('Frist abgelaufen', () => {
  it('normale Blutung: noch einmal halber Schaden (aufgerundet), zählt zur Wunde; danach blutet sie nicht mehr', () => {
    let c = treffer(fertig(), 'bein_r', 3); // 3 Schaden, HP 5
    const f = fristablauf(c, w(c).id, d);
    expect(f).toMatchObject({ schaden: 2, tot: false, hp_vorher: 5, hp_nachher: 3 });
    c = fristAblaufen(c, w(c).id, d);
    expect(w(c).schaden).toBe(5);
    expect(w(c).blutung.status).toBe('abgelaufen');
    expect(hpAktuell(c, d)).toBe(3);
    expect(blutet(w(c))).toBe(false);
  });

  it('R28: ausgeblutete Wunde ist unversorgt und lässt sich noch mit Druckverband versorgen (damit sie heilt)', () => {
    let c = treffer(fertig(), 'bein_r', 2);
    c = fristAblaufen(c, w(c).id, d);
    expect(massnahmenFuer(w(c), d).map((m) => m.id)).toEqual(['druckverband']);
    c = versorgen(c, w(c).id, 'druckverband', d);
    expect(w(c)).toMatchObject({ versorgt: 'druckverband', blutung: { status: 'abgelaufen' } });
    expect(versorgbareWunden(c, d)).toHaveLength(0);
  });

  it('gerader Schaden: genau die Hälfte (4 → 2)', () => {
    const c = schadenDirekt(fertig(), 'arm_l', 4, 'wunde', d);
    expect(fristablauf(c, w(c).id, d).schaden).toBe(2);
  });

  it('Schaden aus der Blutung kann kampfunfähig machen (HP genau 0) oder töten (HP −1)', () => {
    const k = schadenDirekt(fertig(), 'bein_r', 6, 'wunde', d); // HP 2, +3 → −1
    expect(fristablauf(k, w(k).id, d)).toMatchObject({ schaden: 3, tot: true });
    const n = schadenDirekt(fertig(), 'bein_r', 5, 'wunde', d); // HP 3, +3 → 0
    const f = fristablauf(n, w(n).id, d);
    expect(f).toMatchObject({ tot: false, kampfunfaehig: true, hp_nachher: 0 });
  });

  it('kritische Blutung: Tod', () => {
    let c = treffer(fertig(), 'bauch', 1, true);
    expect(fristablauf(c, w(c).id, d).tot).toBe(true);
    c = fristAblaufen(c, w(c).id, d);
    expect(c.spielstand.tot).toBe(true);
    expect(lebenslageDes(c, d)).toBe('tot');
  });

  it('gestoppte Blutung kann nicht mehr ablaufen', () => {
    let c = treffer(fertig(), 'bein_r', 1);
    c = versorgen(c, w(c).id, 'druckverband', d);
    expect(() => fristablauf(c, w(c).id, d)).toThrow();
  });
});
