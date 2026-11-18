// Tests für Probenrechner und Gefecht (konzept.md § 3.6, § 3.7, § 3.7b, § 4.4).
import { describe, expect, it } from 'vitest';
import {
  adrenalinschockBeenden, gefechtBeenden, gefechtStarten, grundMerken, initiativeEintragen, leiterSetzen, letzteLeiterAenderung,
  naechsteRunde, rueckgaengig, senkenEintragen, sichtstufeSetzen, slGefechtHinzu, slGefechtLoeschen, standNachRundenende
} from '../src/lib/regeln/gefecht';
import { anstiegMalsteps } from '../src/lib/regeln/leiter';
import { gefechtVon, initiativeZusatz, lebenslageDes, leiterStand, offeneKritischeWunde, perkHinweise, probeStellen } from '../src/lib/regeln/probenrechner';
import { neuerCharakter, type Charakter, type Gefecht } from '../src/lib/speicher/charakter';
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
const imGefecht = (stand: number, extra: Partial<Charakter> = {}) => leiterSetzen(gefechtStarten(fertig(extra), false, 'erfolg', d), stand, d);

describe('Probe zusammenstellen', () => {
  it('ohne Steps: Statwert, Krit aus der Zehnerstelle', () => {
    const p = probeStellen(fertig(), d, { stat: 'control', skill: null });
    expect(p.statwert).toBe(60);
    expect(p.wert).toMatchObject({ moeglich: true, netto: 0, zielwert: 60, krit_schwelle: 6 });
    expect(p.automatisch).toEqual([]);
  });

  it('Skill 0 bringt 1 Malstep, Skill 2 gleicht aus und erhöht die Krit-Schwelle', () => {
    expect(probeStellen(fertig(), d, { stat: 'control', skill: 'fahren' }).wert).toMatchObject({ netto: 1, zielwert: 51, skill_null: true });
    const c = fertig({ skills: { fahren: 2 } });
    expect(probeStellen(c, d, { stat: 'control', skill: 'fahren' }).wert).toMatchObject({ netto: 0, uebrig: 2, zielwert: 60, krit_schwelle: 8 });
  });

  it('Adrenalin wirkt nur im Gefecht; Adrenalin 2: Gruppe B 1 Malstep, Gruppe A 1 Stepshield, Nerve nichts', () => {
    const c = imGefecht(2);
    expect(leiterStand(c)).toBe(2);
    expect(probeStellen(c, d, { stat: 'control', skill: null }).wert).toMatchObject({ netto: 1, zielwert: 51 });
    const twitch = probeStellen(c, d, { stat: 'twitch', skill: null });
    expect(twitch.automatisch).toEqual([{ id: 'leiter', herkunft: 'leiter', name: 'Adrenalin 2', stepshields: 1 }]);
    expect(twitch.wert).toMatchObject({ zielwert: 60, krit_schwelle: 7 });
    expect(probeStellen(c, d, { stat: 'nerve', skill: null }).automatisch).toEqual([]);
    expect(leiterStand(gefechtBeenden(c))).toBe(0);
  });

  it('× schaltet eine automatische Quelle für diese Probe aus', () => {
    const c = imGefecht(3);
    const p = probeStellen(c, d, { stat: 'control', skill: null, ausgeschaltet: ['leiter'] });
    expect(p.automatisch).toHaveLength(1);
    expect(p.quellen).toEqual([]);
    expect(p.wert!.zielwert).toBe(60);
  });

  it('Adrenalinschock: 3 Malsteps auf alle Proben, mit Eiserne Nerven 2', () => {
    const c = fertig();
    c.spielstand.adrenalinschock = { aktiv: true, ruhe_stunden: 0 };
    expect(probeStellen(c, d, { stat: 'nerve', skill: null }).wert).toMatchObject({ malsteps: 3, zielwert: 25 });
    c.perks = ['eiserne_nerven'];
    expect(probeStellen(c, d, { stat: 'nerve', skill: null }).wert!.malsteps).toBe(2);
  });

  it('Steps der SL: für diese Probe und für das ganze Gefecht', () => {
    let c = imGefecht(0);
    c = slGefechtHinzu(c, { malsteps: 1, stepshields: 0, grund: 'Regen' });
    const p = probeStellen(c, d, { stat: 'control', skill: null, sl: { malsteps: 1, stepshields: 2, grund: 'Deckung' } });
    expect(p.quellen.map((q) => q.name)).toEqual(['Regen', 'Deckung']);
    expect(p.wert).toMatchObject({ malsteps: 2, abzug: 2, netto: 0, uebrig: 0 });
    c = slGefechtLoeschen(c, g(c).lage.sl_gefecht[0]!.id);
    expect(g(c).lage.sl_gefecht).toEqual([]);
  });

  it('Steps der SL mit gilt_fuer wirken nur auf diese Probenarten', () => {
    const c = imGefecht(0);
    (c.spielstand.gefecht as Gefecht).lage.sl_gefecht = [{ id: 'u1', malsteps: 2, stepshields: 0, grund: 'Wind', gilt_fuer: ['schiessen'] }];
    expect(probeStellen(c, d, { stat: 'control', skill: null }).wert!.malsteps).toBe(0);
    expect(probeStellen(c, d, { stat: 'control', skill: null, probe: 'schiessen' }).wert!.malsteps).toBe(2);
  });

  it('braucht Sicht: Sichtstufe des Gefechts zählt', () => {
    const c = sichtstufeSetzen(imGefecht(0), 'schlecht');
    expect(probeStellen(c, d, { stat: 'intellect', skill: null, braucht_sicht: true }).wert!.malsteps).toBe(2);
    expect(probeStellen(c, d, { stat: 'intellect', skill: null }).wert!.malsteps).toBe(0);
  });

  it('6 Netto-Malsteps: keine Probe möglich', () => {
    const p = probeStellen(fertig(), d, { stat: 'control', skill: null, sl: { malsteps: 6, stepshields: 0, grund: '' } });
    expect(p.wert!.moeglich).toBe(false);
  });

  it('Perk-Modifikatoren mit passendem Skill (Kernschuss)', () => {
    const c = fertig({ perks: ['kernschuss'], skills: { waffe_praezision: 1 } });
    const p = probeStellen(c, d, { stat: 'control', skill: 'waffe_praezision' });
    expect(p.automatisch).toEqual([{ id: 'perk:kernschuss:0', herkunft: 'perk', name: 'Kernschuss', malsteps: undefined, stepshields: undefined, krit_schwelle: 1 }]);
    expect(p.wert!.krit_schwelle).toBe(6 + 1 + 1);
  });

  it('Hinweise der Perks je Stelle', () => {
    const c = fertig({ perks: ['entschlossen', 'kernschuss'] });
    expect(perkHinweise(c, d, ['initiative']).map((p) => p.id)).toEqual(['entschlossen']);
    expect(perkHinweise(c, d, ['probe'])).toEqual([]);
  });
});

describe('Gefecht', () => {
  it.each([
    [false, 'krit', -1], [false, 'erfolg', 0], [false, 'misserfolg', 1],
    [true, 'krit', 0], [true, 'erfolg', 1], [true, 'misserfolg', 2]
  ] as const)('Start: überrascht %s, %s → %i', (ueberrascht, ergebnis, stand) => {
    const c = gefechtStarten(fertig(), ueberrascht, ergebnis, d);
    expect(g(c)).toMatchObject({ aktiv: true, runde: 1, leiter: stand, ueberrascht });
  });

  it('Überrascht: Initiative in Runde 1 mit 1 Malstep, mit Entschlossen ohne, ab Runde 2 nicht mehr', () => {
    const c = gefechtStarten(fertig(), true, 'erfolg', d);
    expect(initiativeZusatz(c, d)).toEqual([{ id: 'ueberrascht', herkunft: 'lage', name: 'überrascht (Runde 1)', malsteps: 1 }]);
    expect(initiativeZusatz({ ...c, perks: ['entschlossen'] }, d)).toEqual([]);
    expect(initiativeZusatz(naechsteRunde(c, { ausloeser: [], probe: null }, d), d)).toEqual([]);
    expect(initiativeZusatz(gefechtStarten(fertig(), false, 'erfolg', d), d)).toEqual([]);
  });

  it('Rundenende: ohne Auslöser bleibt die Stufe', () => {
    const c = imGefecht(1);
    expect(standNachRundenende(c, { ausloeser: [], probe: null }, d)).toBe(1);
  });

  it('Rundenende: Anstieg ohne Probe, gelungen bleibt, Krit sinkt, misslungen steigt', () => {
    const c = imGefecht(1);
    const a = { ausloeser: ['beschossen', 'getroffen'] };
    expect(standNachRundenende(c, { ...a, probe: null }, d)).toBe(2);
    expect(standNachRundenende(c, { ...a, probe: 'erfolg' }, d)).toBe(1);
    expect(standNachRundenende(c, { ...a, probe: 'krit' }, d)).toBe(0);
    expect(standNachRundenende(c, { ...a, probe: 'misserfolg' }, d)).toBe(2);
    expect(anstiegMalsteps(2, r)[0]!.malsteps).toBe(2);
  });

  it('Rundenende: jeder Auslöser zählt höchstens einmal; Over the Edge ist das Ende', () => {
    const c = imGefecht(4);
    expect(standNachRundenende(c, { ausloeser: ['getroffen', 'getroffen'], probe: null }, d)).toBe(4);
  });

  it('Senken: Krit −2 bis in den Ruhepuls; danach kein Anstieg am Rundenende', () => {
    let c = senkenEintragen(imGefecht(1), 'krit', d);
    expect(g(c)).toMatchObject({ leiter: -1, gesenkt_diese_runde: true });
    expect(standNachRundenende(c, { ausloeser: ['beschossen'], probe: null }, d)).toBe(-1);
    c = naechsteRunde(c, { ausloeser: ['beschossen'], probe: null }, d);
    expect(g(c)).toMatchObject({ runde: 2, leiter: -1, gesenkt_diese_runde: false, initiative: null });
  });

  it('Senken misslungen: Stufe bleibt, die Runde gilt trotzdem als gesenkt', () => {
    const c = senkenEintragen(imGefecht(2), 'misserfolg', d);
    expect(g(c)).toMatchObject({ leiter: 2, gesenkt_diese_runde: true });
    expect(g(rueckgaengig(c, d)).gesenkt_diese_runde).toBe(false);
  });

  it('Senken nie unter Ruhepuls 3', () => {
    expect(g(senkenEintragen(imGefecht(-2), 'krit', d)).leiter).toBe(r.leiter.min);
  });

  it('Rückgängig nimmt die letzte Änderung zurück, auch das Rundenende, aber nicht den Start', () => {
    let c = gefechtStarten(fertig(), false, 'misserfolg', d);
    expect(letzteLeiterAenderung(c)).toBeNull();
    c = leiterSetzen(c, 3, d);
    c = rueckgaengig(c, d);
    expect(g(c).leiter).toBe(1);
    c = naechsteRunde(c, { ausloeser: ['beschossen'], probe: null }, d);
    expect(g(c).leiter).toBe(2);
    c = rueckgaengig(c, d);
    expect(g(c)).toMatchObject({ leiter: 1, runde: 2 });
    expect(rueckgaengig(c, d)).toBe(c);
  });

  it('Over the Edge: Adrenalinschock bei Gefechtsende, auch wenn die Stufe vorher sank', () => {
    let c = leiterSetzen(imGefecht(3), 4, d);
    c = senkenEintragen(c, 'erfolg', d);
    c = gefechtBeenden(c);
    expect(c.spielstand.gefecht).toEqual({ aktiv: false });
    expect(c.spielstand.adrenalinschock.aktiv).toBe(true);
    expect(adrenalinschockBeenden(c).spielstand.adrenalinschock.aktiv).toBe(false);
  });

  it('Over the Edge zurückgenommen: kein Adrenalinschock', () => {
    const c = rueckgaengig(leiterSetzen(imGefecht(3), 4, d), d);
    expect(g(c).adrenalin4_erreicht).toBe(false);
    expect(gefechtBeenden(c).spielstand.adrenalinschock.aktiv).toBe(false);
  });

  it('ohne Over the Edge kein Adrenalinschock', () => {
    expect(gefechtBeenden(imGefecht(3)).spielstand.adrenalinschock.aktiv).toBe(false);
  });

  it('Initiative bleibt bis zur nächsten Runde stehen', () => {
    const c = initiativeEintragen(imGefecht(0), { wurf: 54, stufe: 'erfolg', zielwert: 60 });
    expect(g(c).initiative).toEqual({ wurf: 54, stufe: 'erfolg', zielwert: 60 });
  });

  it('Gründe der SL: zuletzt verwendete vorne, ohne Doppelte', () => {
    let c = imGefecht(0);
    c = grundMerken(grundMerken(grundMerken(c, 'Regen'), 'Nebel'), 'Regen');
    expect(g(c).lage.letzte_gruende).toEqual(['Regen', 'Nebel']);
    const ruhe = fertig();
    expect(grundMerken(ruhe, 'Regen')).toBe(ruhe);
  });
});

describe('R6: Kampfunfähig durch kritische Wunde', () => {
  const mitWunde = (zone: string, kritisch: boolean, status: 'offen' | 'gestoppt' | 'abgelaufen') => {
    const c = fertig();
    c.spielstand.wunden = [{ id: 'w1', zone, schaden: 0, kritisch, blutung: { status, frist_ende: null }, versorgt: null, nachsorge: null, ruhetage_geheilt: 0 }];
    return c;
  };
  it('R6: kritische Wunde mit Folge „kampfunfähig“ macht kampfunfähig, auch wenn die Blutung gestoppt ist', () => {
    for (const status of ['offen', 'gestoppt', 'abgelaufen'] as const) {
      expect(offeneKritischeWunde(mitWunde('bein_r', true, status), d)).toBe(true);
      expect(lebenslageDes(mitWunde('bauch', true, status), d)).toBe('kampfunfaehig');
    }
  });
  it('R6: normale Wunde und kritische Wunde ohne Folge „kampfunfähig“ (Kopf: sofort tot) zählen nicht', () => {
    expect(offeneKritischeWunde(mitWunde('bein_r', false, 'offen'), d)).toBe(false);
    expect(offeneKritischeWunde(mitWunde('kopf', true, 'offen'), d)).toBe(false);
    expect(lebenslageDes(fertig(), d)).toBe('einsatzfaehig');
  });
});
