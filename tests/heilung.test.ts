// Tests für die Heilung (konzept.md § 3.12, § 4.9; Regelwerk: Schaden, Blutung und Verletzungen, Heilung).
import { describe, expect, it } from 'vitest';
import { versorgen } from '../src/lib/regeln/blutung';
import {
  erholungAnfrage, erholungHp, heildauer, heilt, nachsorgeAnfrage, nachsorgeMoeglich, nachsorgeSetzen, nachtRuhe, pflegeSkill,
  restHeildauer, ruhen, unversorgteWunden
} from '../src/lib/regeln/heilung';
import { hpAktuell } from '../src/lib/regeln/modifikatoren';
import { lebenslageDes, probeStellen } from '../src/lib/regeln/probenrechner';
import { schadenDirekt } from '../src/lib/regeln/wunden';
import { neuerCharakter, type Charakter, type Wunde } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();

/** Alle Stats auf C, ohne Perks: HP 8. */
function fertig(): Charakter {
  const c = neuerCharakter(d.stats.eintraege.map((s) => s.id));
  for (const id of Object.keys(c.stats)) c.stats[id] = { rang: 'C', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
  return { ...c, status: 'fertig', erstellung: null, name: 'Mara' };
}
const wunde = (extra: Partial<Wunde>): Wunde => ({
  id: 'w1', zone: 'arm_l', schaden: 3, kritisch: false, blutung: { status: 'gestoppt', frist_ende: null }, versorgt: 'druckverband',
  nachsorge: null, ruhetage_geheilt: 0, ...extra
});
/** Arm links mit 3 Schaden, versorgt: HP 8 → 5. */
function verwundet(): Charakter {
  const c = schadenDirekt(fertig(), 'arm_l', 3, 'wunde', d);
  return versorgen(c, c.spielstand.wunden[0]!.id, 'druckverband', d);
}

describe('Heildauer', () => {
  it('normal: Schaden in Ruhetagen; ohne Nachsorge ×2', () => {
    expect(heildauer(wunde({ nachsorge: 'gelungen' }), d)).toBe(3);
    expect(heildauer(wunde({ nachsorge: null }), d)).toBe(6);
    expect(heildauer(wunde({ nachsorge: 'keine' }), d)).toBe(6);
    expect(heildauer(wunde({ nachsorge: 'misslungen' }), d)).toBe(6);
  });

  it('Krit der Nachsorge halbiert, aufgerundet', () => {
    expect(heildauer(wunde({ nachsorge: 'krit' }), d)).toBe(2);
    expect(heildauer(wunde({ schaden: 4, nachsorge: 'krit' }), d)).toBe(2);
  });

  it('kritisch: Wochen aus Ruhetagen (Schaden × 7)', () => {
    expect(heildauer(wunde({ kritisch: true, schaden: 2, nachsorge: 'gelungen' }), d)).toBe(14);
    // R39: gerundet in Ruhetagen (3 × 7 / 2 = 10,5 → 11).
    expect(heildauer(wunde({ kritisch: true, schaden: 3, nachsorge: 'krit' }), d)).toBe(11);
  });

  it('Rest zählt die geheilten Ruhetage ab, nie unter 0', () => {
    expect(restHeildauer(wunde({ nachsorge: 'gelungen', ruhetage_geheilt: 2 }), d)).toBe(1);
    expect(restHeildauer(wunde({ nachsorge: 'gelungen', ruhetage_geheilt: 5 }), d)).toBe(0);
  });
});

describe('Was heilt', () => {
  it('nur versorgte Wunden, die nicht mehr bluten', () => {
    expect(heilt(wunde({}), d)).toBe(true);
    expect(heilt(wunde({ versorgt: null, blutung: { status: 'abgelaufen', frist_ende: null } }), d)).toBe(false);
    expect(heilt(wunde({ versorgt: null, blutung: { status: 'offen', frist_ende: null } }), d)).toBe(false);
    // Druckverband am Rumpf (kritisch) verlängert nur die Frist: blutet weiter, heilt nicht.
    expect(heilt(wunde({ zone: 'bauch', kritisch: true, blutung: { status: 'offen', frist_ende: null } }), d)).toBe(false);
  });

  it('Nachsorge einmal je Wunde und erst nach dem Versorgen; kritisch auf Operation', () => {
    expect(nachsorgeMoeglich(wunde({}), d)).toBe(true);
    expect(nachsorgeMoeglich(wunde({ nachsorge: 'misslungen' }), d)).toBe(false);
    expect(nachsorgeMoeglich(wunde({ versorgt: null, blutung: { status: 'offen', frist_ende: null } }), d)).toBe(false);
    expect(nachsorgeAnfrage(wunde({}), d).skill).toBe('erste_hilfe');
    expect(nachsorgeAnfrage(wunde({ kritisch: true }), d).skill).toBe('operation');
    const c = verwundet();
    const id = c.spielstand.wunden[0]!.id;
    expect(nachsorgeSetzen(c, id, 'krit').spielstand.wunden[0]!.nachsorge).toBe('krit');
  });
});

describe('Nacht Ruhe', () => {
  it('Prellungen zurück, Adrenalinschock vorbei; Wunden bleiben', () => {
    let c = schadenDirekt(verwundet(), 'bein_r', 2, 'prellung', d);
    c = { ...c, spielstand: { ...c.spielstand, adrenalinschock: { aktiv: true, ruhe_stunden: 0 } } };
    expect(hpAktuell(c, d)).toBe(3);
    const nach = nachtRuhe(c);
    expect(hpAktuell(nach, d)).toBe(5);
    expect(nach.spielstand.adrenalinschock.aktiv).toBe(false);
    expect(nach.spielstand.wunden).toHaveLength(1);
    const { bericht } = ruhen(c, null, d);
    expect(bericht).toMatchObject({ prellungen: 2, adrenalinschock_vorbei: true, hp_vorher: 3, hp_nachher: 5, geheilt: [] });
  });
});

describe('Ruhetag', () => {
  it('Erholungsprobe: Krit +2, gelungen +1, misslungen +0', () => {
    expect(erholungHp('krit', d)).toBe(2);
    expect(erholungHp('erfolg', d)).toBe(1);
    expect(erholungHp('misserfolg', d)).toBe(0);
  });

  it('HP steigen, die Wunde heilt einen Tag', () => {
    const { nach, bericht } = ruhen(verwundet(), 'krit', d);
    expect(hpAktuell(nach, d)).toBe(7);
    expect(nach.spielstand.wunden[0]!.ruhetage_geheilt).toBe(1);
    expect(bericht).toMatchObject({ hp_gewonnen: 2, hp_vorher: 5, hp_nachher: 7 });
    expect(bericht.geheilt[0]!.rest).toBe(5);
  });

  it('höchstens bis zum Grundwert; Prellungen kommen mit der Nacht dazu', () => {
    let c = schadenDirekt(fertig(), 'arm_l', 1, 'wunde', d);
    c = versorgen(c, c.spielstand.wunden[0]!.id, 'druckverband', d);
    c = schadenDirekt(c, 'bein_r', 2, 'prellung', d);
    const { nach, bericht } = ruhen(c, 'krit', d);
    expect(hpAktuell(nach, d)).toBe(8);
    expect(bericht).toMatchObject({ hp_gewonnen: 1, hp_vorher: 5, hp_nachher: 8 });
  });

  it('verheilte Wunde wird gestrichen, die HP kommen nicht mit ihr zurück', () => {
    let c = verwundet();
    const id = c.spielstand.wunden[0]!.id;
    c = nachsorgeSetzen(c, id, 'krit');
    c = { ...c, spielstand: { ...c.spielstand, wunden: c.spielstand.wunden.map((w) => ({ ...w, ruhetage_geheilt: 1 })) } };
    const { nach, bericht } = ruhen(c, 'misserfolg', d);
    expect(nach.spielstand.wunden).toHaveLength(0);
    expect(bericht.geheilt[0]!.rest).toBe(0);
    expect(hpAktuell(nach, d)).toBe(5);
  });

  it('unversorgte Wunde heilt nicht und bringt 1 Malstep', () => {
    const c = schadenDirekt(fertig(), 'arm_l', 3, 'wunde', d);
    expect(unversorgteWunden(c, d)).toHaveLength(1);
    const { nach, bericht } = ruhen(c, 'erfolg', d);
    expect(nach.spielstand.wunden[0]!.ruhetage_geheilt).toBe(0);
    expect(bericht.heilen_nicht).toHaveLength(1);
    const a = erholungAnfrage(c, null, d);
    expect(a.zusatz).toEqual([expect.objectContaining({ malsteps: 1 })]);
  });

  it('Pflege: gelungen 1 Stepshield, Krit 2; Betreuer mit Operation bei kritischer Wunde', () => {
    const c = verwundet();
    expect(erholungAnfrage(c, 'gelungen', d).zusatz).toEqual([expect.objectContaining({ stepshields: 1 })]);
    expect(erholungAnfrage(c, 'krit', d).zusatz).toEqual([expect.objectContaining({ stepshields: 2 })]);
    expect(erholungAnfrage(c, 'misslungen', d).zusatz).toEqual([]);
    expect(pflegeSkill(c, d)).toBe('erste_hilfe');
    const krit = { ...c, spielstand: { ...c.spielstand, wunden: [wunde({ kritisch: true })] } };
    expect(pflegeSkill(krit, d)).toBe('operation');
  });

  it('auch bei 0 HP; die Malsteps der Kampfunfähigkeit gelten nicht; eine gelungene Probe beendet sie', () => {
    let c = schadenDirekt(fertig(), 'arm_l', 8, 'wunde', d);
    c = versorgen(c, c.spielstand.wunden[0]!.id, 'druckverband', d);
    expect(lebenslageDes(c, d)).toBe('kampfunfaehig');
    const p = probeStellen(c, d, erholungAnfrage(c, null, d));
    expect(p.quellen.some((q) => q.name === 'Kampfunfähig')).toBe(false);
    const { nach } = ruhen(c, 'erfolg', d);
    expect(lebenslageDes(nach, d)).toBe('einsatzfaehig');
  });
});
