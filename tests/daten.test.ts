import { describe, expect, it } from 'vitest';
import { pruefeDaten } from '../src/lib/daten/pruefen';
import { ladeTestdaten } from './hilfen';

describe('Spieldaten', () => {
  const daten = ladeTestdaten();

  it('bestehen die Datenprüfung', () => {
    expect(pruefeDaten(daten)).toEqual([]);
  });

  it('enthalten alle Klassen des Regelwerks (3 Laufbahnen × 11 Klassen)', () => {
    expect(daten.klassen.eintraege).toHaveLength(33);
    for (const lb of daten.klassen.laufbahnen) {
      const k = daten.klassen.eintraege.filter((x) => x.laufbahn === lb.id);
      expect(k.map((x) => x.stufe).sort()).toEqual([1, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5]);
    }
  });

  it('enthalten Wurfmesser und Wurfaxt; jede Nahkampfwaffe hat eine Wurf-Reichweite', () => {
    const n = daten.nahkampfwaffen.eintraege;
    expect(n.find((x) => x.id === 'wurfmesser')?.wurf).toEqual({ bedraengt: 0, nah: 0, mittel: 2, weit: null });
    expect(n.find((x) => x.id === 'wurfaxt')?.wurf).toEqual({ bedraengt: 0, nah: 1, mittel: 2, weit: null });
    for (const w of n) expect('wurf' in w).toBe(true);
  });

  it('enthalten neun Stats und fünf Stufen', () => {
    expect(daten.stats.eintraege).toHaveLength(9);
    expect(daten.klassen.stufen.map((s) => s.stufe)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Datenprüfung erkennt Fehler', () => {
  const kopie = () => structuredClone(ladeTestdaten());

  it('doppelte und ungültige IDs', () => {
    const d = kopie();
    d.skills.eintraege.push({ ...d.skills.eintraege[0]! });
    d.perks.eintraege[0]!.id = 'Zäh';
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('doppelte ID');
    expect(fehler).toContain('ungültige ID „Zäh“');
  });

  it('Verweise zwischen Dateien', () => {
    const d = kopie();
    d.skills.eintraege[0]!.stat = 'kraft';
    d.waffen.eintraege[0]!.munition = 'gibt_es_nicht';
    d.klassen.eintraege[0]!.mindestskills = { zaubern: 1 };
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('unbekannter Stat „kraft“');
    expect(fehler).toContain('unbekanntes Kaliber „gibt_es_nicht“');
    expect(fehler).toContain('unbekannter Skill „zaubern“');
  });

  it('Ereignis mit unbekanntem Auslöser', () => {
    const d = kopie();
    d.regeln.ereignis[0]!.ausloeser = 'gibt_es_nicht';
    expect(pruefeDaten(d).join('\n')).toContain('ereignis: unbekannter Auslöser „gibt_es_nicht“');
  });

  it('Rank-Vorschlag, der nicht zum Rank-Set passt', () => {
    const d = kopie();
    const stats = d.stats.eintraege.map((s) => s.id);
    d.klassen.eintraege[0]!.rank_vorschlag = Object.fromEntries(stats.map((s) => [s, 'S'])) as never;
    expect(pruefeDaten(d).join('\n')).toContain('Rank-Vorschlag passt nicht');
  });

  it('Rank-Vorschlag, der passt', () => {
    const d = kopie();
    const stats = d.stats.eintraege.map((s) => s.id);
    const set = d.klassen.stufen[0]!.rank_set;
    d.klassen.eintraege[0]!.rank_vorschlag = Object.fromEntries(stats.map((s, i) => [s, set[i]])) as never;
    expect(pruefeDaten(d)).toEqual([]);
  });

  it('fehlende Pflichtfelder und falscher Garbenfaktor', () => {
    const d = kopie();
    (d.perks.eintraege[0] as { kurz?: string }).kurz = undefined;
    d.waffen.eintraege.find((w) => w.id === 'ak47')!.feuermodi.VA!.garbenfaktor = 3;
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('Pflichtfeld „kurz“ fehlt');
    expect(fehler).toContain('Garbenfaktor 3 passt nicht');
  });

  it('fehlende Preise und Vorratslevel für den Laden', () => {
    const d = kopie();
    delete d.munition.eintraege.find((m) => m.id === '9x19')!.typen.FMJ!.preis_10;
    delete d.waffen.eintraege.find((w) => w.id === 'ak47')!.ersatzmagazin;
    d.aufsaetze.eintraege.find((a) => a.id === 'zweibein')!.vorratslevel = 6;
    d.aufsaetze.eintraege.find((a) => a.id === 'bajonett')!.preis = { min: 1, max: 2 };
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('munition.json 9x19 FMJ: Geldwertspanne fehlt');
    expect(fehler).toContain('waffen.json ak47 ersatzmagazin: Geldwertspanne fehlt');
    expect(fehler).toContain('aufsaetze.json zweibein: Vorratslevel fehlt oder liegt nicht bei 1–5');
    expect(fehler).toContain('aufsaetze.json bajonett: Preis und Vorratslevel kommen von der Waffe');
  });

  it('fehlende oder ungültige Wurf-Reichweite einer Nahkampfwaffe', () => {
    const d = kopie();
    const [a, b] = d.nahkampfwaffen.eintraege;
    delete (a as { wurf?: unknown }).wurf;
    b!.wurf = { nah: -1, sehr_nah: 0 } as never;
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('wurf fehlt');
    expect(fehler).toContain('unbekanntes Band „sehr_nah“ in wurf');
    expect(fehler).toContain('wurf nah: Malsteps');
  });

  it('R2: Rüstung am Rumpf muss alle Rumpfzonen gleich schützen', () => {
    const d = kopie();
    const weste = d.schutz.ruestung.find((r) => r.zonen['brust'] !== undefined)!;
    weste.zonen['bauch'] = (weste.zonen['brust'] ?? 0) + 1;
    expect(pruefeDaten(d).join('\n')).toContain('Brust, Bauch und Unterleib mit demselben Wert');
  });

  it('Zugang, der im Kreis läuft', () => {
    const d = kopie();
    d.klassen.eintraege.find((k) => k.id === 'soldat')!.zugang.wie = 'kommandosoldat';
    expect(pruefeDaten(d).join('\n')).toContain('im Kreis');
  });

  it('Mindestskill außerhalb des Zugangs der Klasse', () => {
    const d = kopie();
    d.klassen.eintraege.find((k) => k.id === 'rekrut')!.mindestskills.tarnen = 1;
    expect(pruefeDaten(d).join('\n')).toContain('Mindestskill „tarnen“ liegt nicht im Zugang der Klasse');
  });

  it('unbekannte Perks, Zonen und Symptom-Wirkungen in regeln.json', () => {
    const d = kopie();
    d.regeln.zustaende.adrenalinschock.mit_perk = { gibt_es_nicht: 2 };
    d.regeln.schiessen.schrot_rumpf_start = 'hals';
    d.regeln.symptome.a1!.wirkung.gewinn = 'fliegen' as never;
    const fehler = pruefeDaten(d).join('\n');
    expect(fehler).toContain('unbekannter Perk „gibt_es_nicht“ in mit_perk');
    expect(fehler).toContain('unbekannte Körperzone „hals“');
    expect(fehler).toContain('unbekannte Wirkung „fliegen“');
  });
});
