// Tests des Regelkerns (konzept.md § 4.1–4.7, 4.10, 4.11). Fälle aus dem Regelwerk und Grenzfälle.
import { describe, expect, it } from 'vitest';
import type { Rang } from '../src/lib/daten/typen';
import {
  aktuelleKlasse,
  eingefroreneSkills,
  fehlendeRangstufen,
  klassenwechselPruefen,
  perkKaufenSperre,
  rankSetErfuellt,
  skillSteigernSperre,
  statrankUpSperre,
  wechselVorschau,
  zugangDerKlasse,
  zugangDes
} from '../src/lib/regeln/aufstieg';
import {
  anstiegMalsteps,
  leiterSteps,
  rundenende,
  senken,
  standName,
  startStand,
  symptome,
  verschieben
} from '../src/lib/regeln/leiter';
import { grundwerte, hpAktuell, modifikatorenDes, modifikatorSteps } from '../src/lib/regeln/modifikatoren';
import {
  auswerten,
  kritSchwelle,
  naechsterRang,
  probenwert,
  rangfolgeContested,
  runden,
  statwert,
  vergleiche,
  zehnerstelle,
  zielwert,
  type StepQuelle
} from '../src/lib/regeln/probe';
import { ruestungswert, treffer, verdeckteZonen, type Treffereingabe } from '../src/lib/regeln/schaden';
import {
  ansageMoeglich,
  ansageSteps,
  burstSchuesse,
  folgetreffer,
  garbenfaktor,
  haltezahl,
  kugelnDerFolgetreffer,
  ladehemmung,
  ladehemmungsRate,
  lageSteps,
  reichweitenSteps,
  schussAuswerten,
  splitterzahl,
  zoneAusW8,
  zonenFolge
} from '../src/lib/regeln/schiessen';
import { lebenslage, sichtSteps, zustandsSteps } from '../src/lib/regeln/zustaende';
import { neuerCharakter, type Charakter } from '../src/lib/speicher/charakter';
import { ladeTestdaten } from './hilfen';

const d = ladeTestdaten();
const r = d.regeln;
const statIds = d.stats.eintraege.map((s) => s.id);
const ms = (malsteps: number): StepQuelle => ({ herkunft: 'test', name: 'Malsteps', malsteps });
const sh = (stepshields: number): StepQuelle => ({ herkunft: 'test', name: 'Stepshields', stepshields });
const waffe = (id: string) => d.waffen.eintraege.find((w) => w.id === id)!;

/** Charakter mit gegebenen Rängen (Abweichung 0) in der Reihenfolge von stats.json. */
function charakter(raenge: Rang[], extra: Partial<Charakter> = {}): Charakter {
  const c = neuerCharakter(statIds);
  statIds.forEach((id, i) => (c.stats[id] = { rang: raenge[i]!, wurf: { positiv: 5, negativ: 5, quelle: 'hand' } }));
  c.status = 'fertig';
  return { ...c, ...extra };
}
const LEHRLING: Rang[] = ['E', 'E', 'E', 'F', 'C', 'D', 'D', 'E', 'F'];

// ---------------------------------------------------------------- 4.1–4.3
describe('Statwert, Zielwert und Krit', () => {
  it('Statwert = Rang + Abweichung; ohne Wurf noch kein Wert', () => {
    expect(statwert({ rang: 'C', wurf: { positiv: 8, negativ: 4, quelle: 'app' } }, r)).toBe(64);
    expect(statwert({ rang: 'F', wurf: { positiv: 1, negativ: 10, quelle: 'app' } }, r)).toBe(21);
    expect(statwert({ rang: 'S', wurf: { positiv: 10, negativ: 1, quelle: 'app' } }, r)).toBe(99);
    expect(statwert({ rang: 'C', wurf: null }, r)).toBeNull();
  });

  it.each([
    [79, [67, 50, 33, 18, 8]],
    [54, [46, 34, 22, 12, 6]],
    [35, [30, 22, 15, 8, 4]]
  ])('Prüfwerte der Step-Tabelle: %i', (wert, erwartet) => {
    expect([1, 2, 3, 4, 5].map((n) => zielwert(wert, n, r))).toEqual(erwartet);
    expect(zielwert(wert, 0, r)).toBe(wert);
  });

  it('R1: gerundet zugunsten des Spielers – kein Zielwert unter dem genauen Faktor', () => {
    // Genaue Faktoren aus den Abschlägen 15 %, 25 %, 35 %, 45 %, 55 %
    const genau = [1, 0.85, 0.85 * 0.75, 0.85 * 0.75 * 0.65, 0.85 * 0.75 * 0.65 * 0.55, 0.85 * 0.75 * 0.65 * 0.55 * 0.45];
    r.steps.faktoren.forEach((f, n) => expect(f).toBeGreaterThanOrEqual(genau[n]!));
    for (let wert = 1; wert <= 100; wert++)
      for (let n = 0; n <= 5; n++) expect(zielwert(wert, n, r)).toBeGreaterThanOrEqual(runden(wert * genau[n]!));
    expect(zielwert(29, 2, r)).toBe(19); // 29 × 0,638 = 18,5
    expect(zielwert(100, 3, r)).toBe(42); // 100 × 0,415 = 41,5
  });

  it('rundet kaufmännisch (ab ,5 auf)', () => {
    expect(runden(42.5)).toBe(43);
    expect(runden(42.49)).toBe(42);
    expect(zielwert(50, 1, r)).toBe(43); // 50 × 0,85 = 42,5
  });

  it('R1: Faktoren = Abschlag 15 %, 25 %, 35 % … auf die vorherige Stufe, auf drei Stellen aufgerundet', () => {
    const abschlag = [0.15, 0.25, 0.35, 0.45, 0.55];
    const faktoren = abschlag.reduce((f, a) => [...f, f[f.length - 1]! * (1 - a)], [1]);
    faktoren.forEach((f, i) => expect(r.steps.faktoren[i]).toBeCloseTo(Math.ceil(f * 1000 - 1e-9) / 1000, 10));
  });

  it('6 Netto-Malsteps: keine Probe möglich, Handlung misslingt', () => {
    const p = probenwert({ statwert: 99, skill: 1, quellen: [ms(7)] }, r);
    expect(p.netto).toBe(6);
    expect(p.moeglich).toBe(false);
    expect(auswerten(1, p)).toBe('misserfolg');
    expect(probenwert({ statwert: 99, skill: 1, quellen: [ms(6)] }, r).moeglich).toBe(true);
  });

  it('Skill 0 bringt 1 Malstep, Probe ohne Skill nicht', () => {
    const mitSkill0 = probenwert({ statwert: 79, skill: 0, quellen: [] }, r);
    expect(mitSkill0.skill_null).toBe(true);
    expect(mitSkill0.zielwert).toBe(67);
    expect(probenwert({ statwert: 79, skill: null, quellen: [] }, r).zielwert).toBe(79);
  });

  it('Skill und Stepshields heben Malsteps auf; Übriges erhöht die Krit-Schwelle', () => {
    const p = probenwert({ statwert: 79, skill: 2, quellen: [ms(3), sh(2)] }, r);
    expect(p).toMatchObject({ malsteps: 3, abzug: 4, netto: 0, uebrig: 1, zielwert: 79, krit_schwelle: 8 });
    const q = probenwert({ statwert: 79, skill: 1, quellen: [ms(3)] }, r);
    expect(q).toMatchObject({ netto: 2, uebrig: 0, zielwert: 50, krit_schwelle: 5 });
  });

  it('Krit-Schwelle: Zehnerstelle, bei 100 laut Regeln 10, nie unter 0', () => {
    expect(zehnerstelle(100, r)).toBe(10);
    expect(zehnerstelle(8, r)).toBe(0);
    expect(kritSchwelle(8, 0, 0, r)).toBe(0);
    expect(kritSchwelle(30, 0, -5, r)).toBe(0);
    expect(probenwert({ statwert: 64, skill: 1, quellen: [{ herkunft: 'perk', name: 'Kernschuss', krit_schwelle: 1 }] }, r).krit_schwelle).toBe(8);
  });

  it('Wurf genau auf dem Zielwert gelingt, genau auf der Krit-Schwelle ist Krit', () => {
    const p = { moeglich: true, zielwert: 50, krit_schwelle: 5 };
    expect(auswerten(50, p)).toBe('erfolg');
    expect(auswerten(51, p)).toBe('misserfolg');
    expect(auswerten(5, p)).toBe('krit');
    expect(auswerten(6, p)).toBe('erfolg');
  });

  it('Contested Roll und Rangfolge', () => {
    expect(vergleiche({ stufe: 'krit', wurf: 3 }, { stufe: 'erfolg', wurf: 40 })).toBe(1);
    expect(vergleiche({ stufe: 'erfolg', wurf: 30 }, { stufe: 'erfolg', wurf: 40 })).toBe(-1);
    expect(vergleiche({ stufe: 'misserfolg', wurf: 90 }, { stufe: 'misserfolg', wurf: 60 })).toBe(0);
    expect(vergleiche({ stufe: 'erfolg', wurf: 30 }, { stufe: 'erfolg', wurf: 30 })).toBe(0);
    const plaetze = rangfolgeContested([
      { stufe: 'erfolg', wurf: 20 },
      { stufe: 'misserfolg', wurf: 80 },
      { stufe: 'krit', wurf: 4 },
      { stufe: 'erfolg', wurf: 35 },
      { stufe: 'misserfolg', wurf: 95 },
      { stufe: 'erfolg', wurf: 20 }
    ]);
    expect(plaetze).toEqual([[2], [3], [0, 5], [1, 4]]);
  });

  it('Rang steigt bis S, nicht darüber', () => {
    expect(naechsterRang('F', r)).toBe('E');
    expect(naechsterRang('A', r)).toBe('S');
    expect(naechsterRang('S', r)).toBeNull();
  });
});

// ---------------------------------------------------------------- 4.4
describe('Adrenalin und Ruhepuls', () => {
  it('Anzeige ohne das Wort Leiter, bei 0 nichts', () => {
    expect(standName(2, r)).toBe('Adrenalin 2');
    expect(standName(4, r)).toBe('Over the Edge');
    expect(standName(-1, r)).toBe('Ruhepuls 1');
    expect(standName(0, r)).toBeNull();
  });

  it('Steps: Gruppe A und B gegenläufig, Over the Edge beide Malsteps, Nerve nie', () => {
    expect(leiterSteps(2, 'control', d)).toEqual([{ herkunft: 'leiter', name: 'Adrenalin 2', malsteps: 1 }]);
    expect(leiterSteps(3, 'brawn', d)).toEqual([{ herkunft: 'leiter', name: 'Adrenalin 3', stepshields: 2 }]);
    expect(leiterSteps(-3, 'control', d)).toEqual([{ herkunft: 'leiter', name: 'Ruhepuls 3', stepshields: 2 }]);
    expect(leiterSteps(-2, 'agility', d)).toEqual([{ herkunft: 'leiter', name: 'Ruhepuls 2', malsteps: 1 }]);
    expect(leiterSteps(4, 'twitch', d)[0]?.malsteps).toBe(2);
    expect(leiterSteps(4, 'intellect', d)[0]?.malsteps).toBe(2);
    expect(leiterSteps(1, 'control', d)).toEqual([]);
    expect(leiterSteps(4, 'nerve', d)).toEqual([]);
  });

  it('Symptome; Over the Edge nur mit Verlusten', () => {
    expect(symptome(2, r).gewinne).toEqual(['kein_stagger', 'zweite_bewegung']);
    const ote = symptome(4, r);
    expect(ote.gewinne).toEqual([]);
    expect(ote.verluste).toEqual(['keine_ansage', 'keine_antizipation']);
    expect(symptome(-1, r).verluste).toEqual(['stagger_ab_gleich']);
  });

  it('Gefechtsbeginn normal und überrascht', () => {
    expect([startStand('krit', false, r), startStand('erfolg', false, r), startStand('misserfolg', false, r)]).toEqual([-1, 0, 1]);
    expect([startStand('krit', true, r), startStand('erfolg', true, r), startStand('misserfolg', true, r)]).toEqual([0, 1, 2]);
  });

  it('Rundenende: Anstieg, Nerve-Probe, Senken sperrt Anstieg, Grenze bei Over the Edge', () => {
    const basis = { stand: 1, ausloeser: 2, gesenkt: false };
    expect(anstiegMalsteps(3, r)[0]?.malsteps).toBe(3);
    expect(rundenende({ ...basis, ausloeser: 0, probe: null }, r)).toBe(1);
    expect(rundenende({ ...basis, probe: null }, r)).toBe(2);
    expect(rundenende({ ...basis, probe: 'misserfolg' }, r)).toBe(2);
    expect(rundenende({ ...basis, probe: 'erfolg' }, r)).toBe(1);
    expect(rundenende({ ...basis, probe: 'krit' }, r)).toBe(0);
    expect(rundenende({ ...basis, gesenkt: true, probe: null }, r)).toBe(1);
    expect(rundenende({ ...basis, stand: 4, probe: null }, r)).toBe(4);
    expect(rundenende({ ...basis, stand: -1, probe: null }, r)).toBe(0);
  });

  it('Senken und Verbündete verschieben', () => {
    expect(senken(2, 'erfolg', r)).toBe(1);
    expect(senken(1, 'krit', r)).toBe(-1);
    expect(senken(-3, 'krit', r)).toBe(-3);
    expect(senken(2, 'misserfolg', r)).toBe(2);
    expect(verschieben(0, 'krit', 1, r)).toBe(2);
    expect(verschieben(0, 'erfolg', -1, r)).toBe(-1);
  });
});

// ---------------------------------------------------------------- 4.5
describe('Zustände', () => {
  it('HP 0 kampfunfähig, −1 tot, offene kritische Wunde kampfunfähig', () => {
    expect(lebenslage(1, false, r)).toBe('einsatzfaehig');
    expect(lebenslage(0, false, r)).toBe('kampfunfaehig');
    expect(lebenslage(-1, false, r)).toBe('tot');
    expect(lebenslage(5, true, r)).toBe('kampfunfaehig');
  });

  it('Adrenalinschock 3 Malsteps, mit Eiserne Nerven 2', () => {
    const z = { adrenalinschock: true, kampfunfaehig: false, gefecht_aktiv: false, gereizt: false, perks: [] };
    expect(zustandsSteps(z, d)[0]?.malsteps).toBe(3);
    expect(zustandsSteps({ ...z, perks: ['eiserne_nerven'] }, d)[0]?.malsteps).toBe(2);
  });

  it('Kampfunfähig: außerhalb des Gefechts 3 (Durchbeißen 2), nicht im Gefecht, nicht auf die Erholungsprobe', () => {
    const z = { adrenalinschock: false, kampfunfaehig: true, gefecht_aktiv: false, gereizt: false, perks: [] };
    expect(zustandsSteps(z, d)[0]?.malsteps).toBe(3);
    expect(zustandsSteps({ ...z, perks: ['durchbeissen'] }, d)[0]?.malsteps).toBe(2);
    expect(zustandsSteps({ ...z, gefecht_aktiv: true }, d)).toEqual([]);
    expect(zustandsSteps({ ...z, probe: 'erholungsprobe' }, d)).toEqual([]);
  });

  it('Gereizt und Geblendet zählen zusammen', () => {
    const z = { adrenalinschock: false, kampfunfaehig: false, gefecht_aktiv: true, gereizt: true, perks: [] };
    const summe = [...zustandsSteps(z, d), ...sichtSteps('klar', true, 'schiessen', r)].reduce((s, q) => s + (q.malsteps ?? 0), 0);
    expect(summe).toBe(5);
    expect(sichtSteps('schlecht', false, 'schiessen', r)[0]).toMatchObject({ name: 'Sicht schlecht', malsteps: 2 });
    expect(sichtSteps('schlecht', false, 'erholungsprobe', r)).toEqual([]);
  });
});

// ---------------------------------------------------------------- 4.6
describe('Schießen', () => {
  it('Reichweite: Malsteps je Band, n/A nicht möglich', () => {
    expect(reichweitenSteps(waffe('ak47'), 'weit', r)?.[0]?.malsteps).toBe(3);
    expect(reichweitenSteps(waffe('m4'), 'nah', r)).toEqual([]);
    expect(reichweitenSteps(waffe('makarov'), 'sehr_weit', r)).toBeNull();
  });

  it('Ansage: Malsteps; nicht möglich mit Adrenalin oder ohne Sicht', () => {
    expect(ansageSteps('rumpf', r)[0]?.malsteps).toBe(1);
    expect(ansageSteps('zone', r)[0]?.malsteps).toBe(2);
    expect(ansageMoeglich(0, 'klar', r)).toBe(true);
    expect(ansageMoeglich(-2, 'schlecht', r)).toBe(true);
    expect(ansageMoeglich(1, 'klar', r)).toBe(false);
    expect(ansageMoeglich(0, 'keine', r)).toBe(false);
  });

  it('Lage: Ausnahmen für Bänder, eigene Bewegung und Abläufe', () => {
    const basis = { band: 'mittel' as const, eigene_bewegung: null, ablauf: 'schiessen' };
    const auswahl = { ziel_bewegung: 'ziel_laeuft', ziel_stand: 'ziel_hocke', ziel_groesse: 'ziel_normal', schuetze: ['aufgelegt'] };
    const summe = (q: StepQuelle[]) => [q.reduce((s, x) => s + (x.malsteps ?? 0), 0), q.reduce((s, x) => s + (x.stepshields ?? 0), 0)];
    expect(summe(lageSteps({ ...basis, auswahl }, r))).toEqual([2, 1]);
    expect(summe(lageSteps({ ...basis, band: 'bedraengt', auswahl }, r))).toEqual([1, 1]);
    expect(summe(lageSteps({ ...basis, eigene_bewegung: 'rennen', auswahl }, r))).toEqual([6, 0]);
    expect(summe(lageSteps({ ...basis, ablauf: 'werfer', auswahl: { ziel_bewegung: 'ziel_nahkampf' } }, r))).toEqual([0, 0]);
  });

  it('Trefferzone aus W8', () => {
    expect([8, 7, 6, 5, 4, 3, 2, 1].map((w) => zoneAusW8(w, d))).toEqual(['kopf', 'brust', 'bauch', 'unterleib', 'arm_r', 'arm_l', 'bein_r', 'bein_l']);
  });

  it('Schrot und Splitter: nächstniedrigere Zone, nach 1 wieder 8, Ansage Rumpf beginnt bei Brust', () => {
    expect([...zonenFolge('kopf', 3, d)]).toEqual([['kopf', 1], ['brust', 1], ['bauch', 1]]);
    expect([...zonenFolge('bein_l', 2, d)]).toEqual([['bein_l', 1], ['kopf', 1]]);
    expect([...zonenFolge('rumpf', 2, d)]).toEqual([['brust', 1], ['bauch', 1]]);
    expect([...zonenFolge('brust', 10, d)].find(([z]) => z === 'brust')).toEqual(['brust', 2]);
    expect(splitterzahl(5, true, r)).toBe(2);
    expect(splitterzahl(5, false, r)).toBe(5);
  });

  it('Haltezahl: Zehnerstelle + Übrig, höchstens 10, ab 6 Netto-Malsteps 0', () => {
    expect(haltezahl({ brawn: 79, skill: 1, rueckstoss: 2, quellen: [] }, r)).toBe(6); // 67
    expect(haltezahl({ brawn: 79, skill: 3, rueckstoss: 1, quellen: [] }, r)).toBe(9); // 79, Übrig 2
    expect(haltezahl({ brawn: 99, skill: 5, rueckstoss: 0, quellen: [] }, r)).toBe(10);
    expect(haltezahl({ brawn: 79, skill: 0, rueckstoss: 5, quellen: [] }, r)).toBe(0); // 5 + 1 für Skill 0
    expect(haltezahl({ brawn: 79, skill: 0, rueckstoss: 5, quellen: [sh(1)] }, r)).toBe(0); // 5 Malsteps → 8
    expect(haltezahl({ brawn: 79, skill: 1, rueckstoss: 3, quellen: [sh(1), ms(1)] }, r)).toBe(5); // 2 Netto → 50
  });

  it('Folgetreffer, Garbenfaktor und Kugeln', () => {
    expect(folgetreffer(6, 4)).toBe(2);
    expect(folgetreffer(3, 10)).toBe(0);
    expect(garbenfaktor('VA', waffe('ak47'))).toBe(2);
    expect(garbenfaktor('EF', waffe('ak47'))).toBe(1);
    expect(kugelnDerFolgetreffer(3, 3, 7)).toEqual([3, 3]);
    expect(kugelnDerFolgetreffer(3, 3, 8)).toEqual([3, 3, 1]);
    expect(kugelnDerFolgetreffer(2, 1, 4)).toEqual([1, 1]);
    expect(burstSchuesse(3, waffe('beretta_93r').feuermodi.Burst!)).toBe(6);
  });

  it('Ladehemmung: Rate aus Modus, Zustand, Trommel; schwer bei 100', () => {
    expect(ladehemmungsRate(3, waffe('m4'), 'C', true, r)).toBe(3 + 5 + 2);
    expect(ladehemmungsRate(1, waffe('ak47'), 'A', false, r)).toBe(1);
    expect(ladehemmung(98, 3, r)).toBe('einfach');
    expect(ladehemmung(97, 3, r)).toBe('keine');
    expect(ladehemmung(100, 3, r)).toBe('schwer');
    expect(ladehemmung(100, 0, r)).toBe('keine');
  });

  it('Schuss auswerten: Fehlschuss nimmt alle Schüsse mit, Ladehemmung verbraucht nichts', () => {
    const e = { wurf: 30, zielwert: 50, krit_schwelle: 5, moeglich: true, lh_rate: 3, angesagt: 5, zone: 'brust', haltezahl: 6, rueckstosswuerfel: 3, garbenfaktor: 1 };
    expect(schussAuswerten(e, r)).toEqual({ ladehemmung: 'keine', stufe: 'erfolg', zone: 'brust', folgetreffer: [1, 1, 1], verbraucht: 5 });
    expect(schussAuswerten({ ...e, wurf: 60 }, r)).toMatchObject({ stufe: 'misserfolg', folgetreffer: [], verbraucht: 5 });
    expect(schussAuswerten({ ...e, wurf: 99 }, r)).toMatchObject({ ladehemmung: 'einfach', stufe: null, verbraucht: 0 });
    expect(schussAuswerten({ ...e, wurf: 4, angesagt: 1, rueckstosswuerfel: null }, r)).toMatchObject({ stufe: 'krit', folgetreffer: [] });
  });
});

// ---------------------------------------------------------------- 4.7
describe('Schadensablauf', () => {
  const basis: Treffereingabe = { zone: 'brust', dk: 3, mw: 3, kugeln: 1, krit: false, deckung: null, ruestung: 0, schmerzresistenz: 1, stagger_regel: 'normal' };

  it('ohne Schutz: Durchschlag, MW × Multiplikator', () => {
    expect(treffer(basis, d)).toMatchObject({ art: 'durchschlag', schaden: 6, wunde: true, folge: 'normal', stagger: true });
    expect(treffer({ ...basis, zone: 'kopf', krit: true }, d)).toMatchObject({ schaden: 9, folge: 'krit' });
    expect(treffer({ ...basis, zone: 'arm_l', mw: 1 }, d)).toMatchObject({ schaden: 1, stagger: false });
  });

  it('Deckung: DK kleiner gestoppt, genau gleich geht durch mit Rest-DK 0', () => {
    expect(treffer({ ...basis, deckung: 4 }, d)).toMatchObject({ art: 'gestoppt', schaden: 0 });
    expect(treffer({ ...basis, deckung: 3 }, d)).toMatchObject({ art: 'durchschlag', rest_dk: 0 });
    expect(treffer({ ...basis, deckung: 3, ruestung: 1 }, d)).toMatchObject({ art: 'wucht', schaden: 2 });
  });

  it('Rüstung: DK gleich Schutzwert ist Durchschlag, darunter Wuchttreffer ohne Krit', () => {
    expect(treffer({ ...basis, ruestung: 3 }, d).art).toBe('durchschlag');
    const w = treffer({ ...basis, dk: 1, mw: 4, ruestung: 3, krit: true }, d);
    expect(w).toMatchObject({ art: 'wucht', schaden: 2, wunde: false, prellung: true, folge: null });
    expect(treffer({ ...basis, dk: 0, mw: 2, ruestung: 3 }, d)).toMatchObject({ art: 'wucht', schaden: 0, prellung: false });
  });

  it('Kugeln eines Folgetreffers: Schutz einmal, Schaden × Kugeln', () => {
    expect(treffer({ ...basis, kugeln: 3 }, d).schaden).toBe(18);
    expect(treffer({ ...basis, dk: 1, mw: 4, ruestung: 3, kugeln: 2 }, d).schaden).toBe(4);
  });

  it('stumpf: verdeckt kein Schaden, sonst Wucht mit vollem Rüstungswert, Krit immer Stagger', () => {
    const stumpf = { ...basis, dk: null, mw: 2, schmerzresistenz: 3 };
    expect(treffer({ ...stumpf, deckung: 0 }, d)).toMatchObject({ art: 'gestoppt', schaden: 0 });
    expect(treffer(stumpf, d)).toMatchObject({ art: 'wucht', schaden: 2, stagger: false });
    expect(treffer({ ...stumpf, ruestung: 1 }, d).schaden).toBe(1);
    expect(treffer({ ...stumpf, krit: true }, d).stagger).toBe(true);
  });

  it('R4: Schmerz ignorieren gewinnt gegen den stumpfen Krit, kein Stagger', () => {
    const stumpf = { ...basis, dk: null, mw: 2, schmerzresistenz: 3, krit: true };
    expect(treffer({ ...stumpf, stagger_regel: 'nie' }, d).stagger).toBe(false);
  });

  it('R5: Bei 0 Schaden keine Prellung, keine Wunde, keine Zonenfolge', () => {
    const wucht = treffer({ ...basis, dk: 1, mw: 2, ruestung: 3 }, d);
    expect(wucht).toMatchObject({ art: 'wucht', schaden: 0, prellung: false, wunde: false });
    const stumpf = treffer({ ...basis, dk: null, mw: 1, ruestung: 1 }, d);
    expect(stumpf).toMatchObject({ art: 'wucht', schaden: 0, prellung: false });
    const durch = treffer({ ...basis, mw: 0, krit: true }, d);
    expect(durch).toMatchObject({ art: 'durchschlag', schaden: 0, wunde: false, folge: null });
  });

  it('Stagger: größer als Schmerzresistenz; empfindlich ab gleich; Schmerz ignorieren nie', () => {
    const t = { ...basis, zone: 'arm_r', mw: 2, schmerzresistenz: 2 };
    expect(treffer(t, d).stagger).toBe(false);
    expect(treffer({ ...t, stagger_regel: 'empfindlich' }, d).stagger).toBe(true);
    expect(treffer({ ...t, mw: 5, stagger_regel: 'nie' }, d).stagger).toBe(false);
  });

  it('R3: Deckung: Rumpf ganz, Arme nur wenn Deckung von unten die Brust verdeckt', () => {
    expect(verdeckteZonen(['bein_l', 'bein_r', 'unterleib'], d, true)).toEqual(['brust', 'bauch', 'unterleib', 'rumpf', 'bein_r', 'bein_l']);
    expect(verdeckteZonen(['bein_l', 'bein_r', 'unterleib', 'bauch'], d, true)).not.toContain('arm_r');
    expect(verdeckteZonen(['bein_l', 'bein_r', 'unterleib', 'bauch', 'brust'], d, true)).toEqual(['brust', 'bauch', 'unterleib', 'rumpf', 'arm_r', 'arm_l', 'bein_r', 'bein_l']);
    // seitlich (z. B. Hausecke rechts bis über den Rumpf): nur der Arm dieser Seite
    expect(verdeckteZonen(['arm_r', 'bein_r', 'brust', 'bauch', 'unterleib', 'kopf'], d, false)).toEqual(['kopf', 'brust', 'bauch', 'unterleib', 'rumpf', 'arm_r', 'bein_r']);
    expect(verdeckteZonen(['brust'], d, false)).toEqual(['brust', 'bauch', 'unterleib', 'rumpf']);
  });

  it('R2: Rüstungswert: höchster Wert zählt; Ansage Rumpf nimmt die Rüstung am Rumpf', () => {
    expect(ruestungswert('brust', ['weste_einfach', 'weste_verstaerkt'], d)).toBe(2);
    expect(ruestungswert('kopf', ['weste_schwer'], d)).toBe(0);
    expect(ruestungswert('rumpf', ['weste_schwer'], d)).toBe(3);
    expect(ruestungswert('rumpf', ['weste_einfach', 'weste_verstaerkt'], d)).toBe(2);
    expect(ruestungswert('rumpf', [], d)).toBe(0);
  });
});

// ---------------------------------------------------------------- 4.10
describe('Grundwerte und Modifikatoren', () => {
  it('Start plus Perks; von Hand gesetzt ersetzt', () => {
    const c = charakter(LEHRLING, { perks: ['zaeh_1', 'zaeh_2', 'wurfarm_1'] });
    expect(grundwerte(c, d)).toEqual({ hp: 10, schmerzresistenz: 1, nahkampfschaden: 1, wurfweite_band: 'mittel' });
    c.grundwerte_manuell = { schmerzresistenz: 3 };
    expect(grundwerte(c, d).schmerzresistenz).toBe(3);
    c.spielstand.hp_verlust_wunden = 4;
    c.spielstand.prellungen = 1;
    expect(hpAktuell(c, d)).toBe(5);
  });

  it('Kernschuss wirkt nur mit dem Präzisionsgewehr; inaktive Anpassungen wirken nicht', () => {
    const c = charakter(LEHRLING, { perks: ['kernschuss'] });
    c.anpassungen = [
      { id: 'a1', ziel: { art: 'stat', id: 'intellect' }, wirkung: { stepshields: 1 }, grund: 'Ortskenntnis', aktiv: true },
      { id: 'a2', ziel: { art: 'alle' }, wirkung: { malsteps: 1 }, grund: 'aus', aktiv: false }
    ];
    const mods = modifikatorenDes(c, d);
    expect(modifikatorSteps(mods, { stat: 'control', skill: 'waffe_praezision' })).toEqual([
      { herkunft: 'perk', name: 'Kernschuss', malsteps: undefined, stepshields: undefined, krit_schwelle: 1 }
    ]);
    expect(modifikatorSteps(mods, { stat: 'control', skill: 'waffe_ar' })).toEqual([]);
    expect(modifikatorSteps(mods, { stat: 'intellect' }).map((q) => q.name)).toEqual(['Ortskenntnis']);
  });
});

// ---------------------------------------------------------------- 4.11
describe('Zugang der Klassen', () => {
  it('Grundklasse: Listen und Gruppen, nie exklusive Einträge', () => {
    const z = zugangDerKlasse('rekrut', d);
    expect(z.skills.has('waffe_ar')).toBe(true);
    expect(z.skills.has('reflexe')).toBe(true); // gruppe:kampf
    expect(z.skills.has('tarnen')).toBe(false);
    expect(z.skills.has('waffe_werfer')).toBe(false);
    expect(z.perks.has('zaeh_1')).toBe(true); // gruppe:grundwerte
    expect(z.perks.has('ueberfall')).toBe(false);
  });

  it('Gruppe gibt exklusive Skills einer anderen Gruppe nicht frei', () => {
    const k = structuredClone(d);
    k.klassen.eintraege.find((x) => x.id === 'rekrut')!.zugang.skills = ['gruppe:medizin'];
    const z = zugangDerKlasse('rekrut', k);
    expect(z.skills.has('erste_hilfe')).toBe(true);
    expect(z.skills.has('operation')).toBe(false);
  });

  it('Spezialisierung „wie“ plus eigene exklusive; erweiterte Form erbt sie', () => {
    const kommando = zugangDerKlasse('kommandosoldat', d);
    expect(kommando.skills.has('waffe_werfer')).toBe(true); // wie Soldat
    expect(kommando.skills.has('tarnen')).toBe(true);
    expect(kommando.perks.has('triple_tap')).toBe(true);
    expect(kommando.perks.has('ueberfall')).toBe(true);
    expect(kommando.perks.has('einsamer_wolf')).toBe(false);
    const einzel = zugangDerKlasse('einzelkaempfer', d);
    expect(einzel.skills.has('tarnen')).toBe(true);
    expect(einzel.perks.has('ueberfall')).toBe(true);
    expect(einzel.perks.has('einsamer_wolf')).toBe(true);
    expect(einzel.skills.has('ballistik')).toBe(false);
  });

  it('Meister: alles der Laufbahn mit allen exklusiven, nichts aus anderen Laufbahnen', () => {
    const z = zugangDerKlasse('veteran', d);
    for (const s of ['tarnen', 'ballistik', 'sprengstoff', 'operation']) expect(z.skills.has(s)).toBe(true);
    for (const p of ['einsamer_wolf', 'geduld', 'gerichtete_ladung', 'unter_feuer']) expect(z.perks.has(p)).toBe(true);
    expect(z.skills.has('schloesser')).toBe(false);
  });

  it('Zweite Spezialisierung: beide Spezialisierungen, nicht die exklusiven Perks der erweiterten Formen', () => {
    const c = charakter(LEHRLING, {
      klassenweg: [
        { klasse: 'soldat', art: 'erstellung' },
        { klasse: 'kommandosoldat', art: 'befoerderung' },
        { klasse: 'scharfschuetze', art: 'zweite_spezialisierung' }
      ]
    });
    const z = zugangDes(c, d)!;
    expect(z.skills.has('tarnen') && z.skills.has('ballistik')).toBe(true);
    expect(z.perks.has('ueberfall') && z.perks.has('atemkontrolle')).toBe(true);
    expect(z.perks.has('einsamer_wolf') || z.perks.has('geduld')).toBe(false);
  });

  it('ohne Klasse alles zugänglich; Skills außerhalb des Zugangs sind eingefroren', () => {
    const frei = charakter(LEHRLING, { skills: { tarnen: 2 } });
    expect(aktuelleKlasse(frei)).toBeNull();
    expect(zugangDes(frei, d)).toBeNull();
    expect(eingefroreneSkills(frei, d)).toEqual([]);
    const soldat = { ...frei, klassenweg: [{ klasse: 'soldat', art: 'wechsel' as const }], freie_punkte: 5 };
    expect(eingefroreneSkills(soldat, d)).toEqual(['tarnen']);
    expect(skillSteigernSperre(soldat, 'tarnen', d)).toBe('kein_zugang');
  });
});

describe('Aufstieg', () => {
  const rekrut = (extra: Partial<Charakter> = {}) =>
    charakter(LEHRLING, { klassenweg: [{ klasse: 'rekrut', art: 'erstellung' }], freie_punkte: 1, ...extra });

  it('Skill steigern: Zugang, Maximum 5, freie Punkte', () => {
    expect(skillSteigernSperre(rekrut(), 'waffe_ar', d)).toBeNull();
    expect(skillSteigernSperre(rekrut({ skills: { waffe_ar: 5 } }), 'waffe_ar', d)).toBe('maximum');
    expect(skillSteigernSperre(rekrut({ freie_punkte: 0 }), 'waffe_ar', d)).toBe('punkte');
    expect(skillSteigernSperre(rekrut(), 'gibt_es_nicht', d)).toBe('unbekannt');
  });

  it('Perk kaufen: Statwert, vorausgesetzter Perk, Rang als Kosten, schon vorhanden', () => {
    const c = rekrut({ freie_punkte: 2 });
    expect(perkKaufenSperre(c, 'zaeh_1', d)).toBe('voraussetzung'); // Brawn 40 < 50
    c.stats.brawn = { rang: 'B', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
    expect(perkKaufenSperre(c, 'zaeh_1', d)).toBeNull();
    expect(perkKaufenSperre(c, 'zaeh_2', d)).toBe('voraussetzung'); // Zäh I fehlt
    c.perks = ['zaeh_1'];
    expect(perkKaufenSperre(c, 'zaeh_1', d)).toBe('vorhanden');
    expect(perkKaufenSperre(c, 'zaeh_2', d)).toBeNull();
    c.freie_punkte = 1;
    expect(perkKaufenSperre(c, 'zaeh_2', d)).toBe('punkte');
  });

  it('Statrank-Up nicht über S', () => {
    const c = rekrut();
    expect(statrankUpSperre(c, 'brawn', d)).toBeNull();
    c.stats.brawn = { rang: 'S', wurf: { positiv: 5, negativ: 5, quelle: 'app' } };
    expect(statrankUpSperre(c, 'brawn', d)).toBe('maximum');
  });

  it('Rank-Set: absteigend verglichen, Ränge nicht Statwerte', () => {
    const lehrling = d.klassen.stufen[0]!.rank_set;
    const stufe2 = d.klassen.stufen[1]!.rank_set;
    expect(rankSetErfuellt(LEHRLING, lehrling, d)).toBe(true);
    expect(rankSetErfuellt(['S', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F'], lehrling, d)).toBe(false);
    expect(rankSetErfuellt(LEHRLING, stufe2, d)).toBe(false);
    const fehlend = fehlendeRangstufen(LEHRLING, stufe2, d);
    expect(fehlend).toBeGreaterThan(0);
  });

  it('Klassenwechsel: Prüfpunkte mit fehlenden Skills, Stat auf Rang A und Weg', () => {
    const c = charakter(['A', 'B', 'B', 'C', 'C', 'C', 'C', 'D', 'D'], {
      klassenweg: [{ klasse: 'rekrut', art: 'erstellung' }, { klasse: 'soldat', art: 'befoerderung' }],
      skills: { waffe_ar: 3, reflexe: 2, tarnen: 0 }
    });
    const punkte = klassenwechselPruefen(c, 'kommandosoldat', d);
    expect(punkte.find((p) => p.art === 'stat_rang')?.erfuellt).toBe(true);
    const skills = punkte.find((p) => p.art === 'mindestskills')!;
    expect(skills.erfuellt).toBe(false);
    expect(skills.fehlt?.tarnen).toBe(1);
    expect(punkte.find((p) => p.art === 'weg')).toBeUndefined();

    const einzel = klassenwechselPruefen(c, 'einzelkaempfer', d);
    expect(einzel.find((p) => p.art === 'weg')?.erfuellt).toBe(false);
    expect(einzel.find((p) => p.art === 'stat_rang')?.erfuellt).toBe(false); // Grit C

    const meister = klassenwechselPruefen(c, 'veteran', d);
    expect(meister.find((p) => p.art === 'weg')?.erfuellt).toBe(false);
    expect(meister.find((p) => p.art === 'mindestskills_wahl')?.erfuellt).toBe(false);
  });

  it('Vorschau des Wechsels: eingefrorene und wieder steigerbare Skills', () => {
    const c = charakter(LEHRLING, {
      klassenweg: [{ klasse: 'soldat', art: 'erstellung' }],
      skills: { waffe_werfer: 2, waffe_ar: 1 }
    });
    const zuLaufbursche = wechselVorschau(c, 'laufbursche', d);
    expect(zuLaufbursche.eingefroren).toEqual(['waffe_werfer', 'waffe_ar']);
    const zurueck = wechselVorschau({ ...c, klassenweg: [{ klasse: 'laufbursche', art: 'erstellung' }] }, 'soldat', d);
    expect(zurueck.wieder_steigerbar).toEqual(['waffe_werfer', 'waffe_ar']);
  });
});
