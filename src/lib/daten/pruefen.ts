// Datenprüfung (konzept.md § 2, Leitlinie 9): Pflichtfelder, gültige IDs, Verweise zwischen Dateien.
// Liefert eine Liste lesbarer Fehler; leer heißt: Daten in Ordnung.

import { zugangDerKlasse } from '../regeln/aufstieg';
import { PERK_WIRKUNGEN, type Modifikator, type Spieldaten, type SymptomWirkung } from './typen';

const ID_MUSTER = /^[a-z0-9_]+$/;
const RAENGE = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
const ANSCHLUESSE = ['schiene_oben', 'schiene_unten', 'schiene_seitlich', 'muendung_pistole', 'muendung_gewehr'];
const SKILLGRUPPEN = ['waffen', 'kampf', 'koerper', 'technik', 'entscheidung', 'medizin', 'sozial', 'exklusiv'];
const PERKGRUPPEN = ['grundwerte', 'kampfkunst', 'kampf', 'allgemein', 'exklusiv'];
const HINWEIS_STELLEN = ['schiessen', 'probe', 'leiter', 'schaden', 'heilung', 'nahkampf', 'breakaction', 'initiative'];
const LADEARTEN = ['wechselmagazin', 'trommel', 'roehrenmagazin', 'fest', 'einzelschuss'];
const FEUERMODI = ['EF', 'Burst', 'VA'];
const KLASSENARTEN = ['grundklasse', 'spezialisierung', 'erweiterte_form', 'meister'];
const GRUNDWERTE = ['hp', 'schmerzresistenz', 'nahkampfschaden', 'wurfweite_band'];
const MOD_ARTEN = ['grundwert', 'stat', 'skill', 'probe', 'alle'];
const WIRKUNGEN = ['wert', 'stepshields', 'malsteps', 'krit_schwelle'];
const NUR_STEPS = ['▲', '▼'];
const SYMPTOM_WIRKUNGEN: SymptomWirkung[] = [
  'kein_stagger', 'keine_ansage', 'zweite_bewegung', 'keine_antizipation', 'zielen_als_main', 'stagger_ab_gleich', 'weitblick', 'kein_hechten'
];

export function pruefeDaten(d: Spieldaten): string[] {
  const fehler: string[] = [];
  const f = (ort: string, text: string) => fehler.push(`${ort}: ${text}`);

  // ---------- Hilfen
  function ids(datei: string, liste: { id: string }[]): Set<string> {
    const menge = new Set<string>();
    for (const e of liste) {
      if (typeof e.id !== 'string' || !ID_MUSTER.test(e.id)) f(datei, `ungültige ID „${e.id}“`);
      if (menge.has(e.id)) f(datei, `doppelte ID „${e.id}“`);
      menge.add(e.id);
    }
    return menge;
  }
  function pflicht(ort: string, obj: object, felder: string[]) {
    for (const feld of felder) {
      const wert = (obj as Record<string, unknown>)[feld];
      if (wert === undefined || wert === '') f(ort, `Pflichtfeld „${feld}“ fehlt`);
    }
  }
  /** Vorratslevel 1–5 und Geldwertspanne mit min ≤ max (Laden, konzept.md § 3.14). */
  function handelswerte(ort: string, vl: unknown, preis: { min?: unknown; max?: unknown } | undefined) {
    if (typeof vl !== 'number' || !Number.isInteger(vl) || vl < 1 || vl > 5) f(ort, 'Vorratslevel fehlt oder liegt nicht bei 1–5');
    if (!preis || typeof preis.min !== 'number' || typeof preis.max !== 'number' || preis.min < 0 || preis.min > preis.max)
      f(ort, 'Geldwertspanne fehlt oder ist ungültig');
  }
  function version(datei: string, obj: { version?: unknown }) {
    if (typeof obj?.version !== 'string' || obj.version === '') f(datei, 'Feld „version“ fehlt');
  }

  for (const [name, inhalt] of Object.entries(d)) version(`${name}.json`, inhalt as { version?: unknown });

  const r = d.regeln;
  const baender = new Set(r.schiessen.reichweitenbaender.map((b) => b.id));
  const statIds = ids('stats.json', d.stats.eintraege);
  const skillIds = ids('skills.json', d.skills.eintraege);
  const perkIds = ids('perks.json', d.perks.eintraege);
  const zonenIds = ids('koerperzonen.json', d.koerperzonen.eintraege);
  const munIds = ids('munition.json', d.munition.eintraege);
  const waffenIds = ids('waffen.json', d.waffen.eintraege);
  const aufsatzIds = ids('aufsaetze.json', d.aufsaetze.eintraege);
  const magazinIds = ids('magazine.json', d.magazine.eintraege);
  const nahkampfIds = ids('nahkampfwaffen.json', d.nahkampfwaffen.eintraege);
  const sprengIds = ids('wurf_und_sprengwaffen.json', d.wurf_und_sprengwaffen.eintraege);
  ids('schutz.json (deckung)', d.schutz.deckung);
  ids('schutz.json (fahrzeugpanzerung)', d.schutz.fahrzeugpanzerung);
  ids('schutz.json (ruestung)', d.schutz.ruestung);
  ids('schutz.json (schilde)', d.schutz.schilde);
  const klassenIds = ids('klassen.json', d.klassen.eintraege);
  const laufbahnIds = ids('klassen.json (laufbahnen)', d.klassen.laufbahnen);
  const ausloeserIds = new Set(r.leiter.ausloeser.map((a) => a.id));
  const klasse = new Map(d.klassen.eintraege.map((k) => [k.id, k]));
  const waffenkategorien = new Set(d.skills.eintraege.flatMap((s) => s.waffenkategorien ?? []));
  const skillGruppen = new Set(d.skills.eintraege.map((s) => s.gruppe));
  const perkGruppen = new Set(d.perks.eintraege.map((p) => p.gruppe));

  function modifikatoren(ort: string, liste: Modifikator[] | undefined) {
    for (const m of liste ?? []) {
      if (!MOD_ARTEN.includes(m.ziel?.art)) f(ort, `Modifikator mit unbekanntem Ziel „${m.ziel?.art}“`);
      if (m.ziel.art === 'grundwert' && !GRUNDWERTE.includes(m.ziel.id ?? '')) f(ort, `unbekannter Grundwert „${m.ziel.id}“`);
      if (m.ziel.art === 'stat' && !statIds.has(m.ziel.id ?? '')) f(ort, `unbekannter Stat „${m.ziel.id}“`);
      if (m.ziel.art === 'skill' && !skillIds.has(m.ziel.id ?? '')) f(ort, `unbekannter Skill „${m.ziel.id}“`);
      if (m.ziel.art !== 'alle' && !m.ziel.id) f(ort, 'Modifikator ohne Ziel-ID');
      const wirkung = Object.keys(m.wirkung ?? {}).filter((k) => WIRKUNGEN.includes(k));
      if (wirkung.length !== 1) f(ort, 'Modifikator braucht genau eine Wirkung');
      if (m.wirkung.wert !== undefined && m.ziel.art !== 'grundwert') f(ort, '„wert“ ist nur für Grundwerte erlaubt');
      for (const b of m.bedingung?.baender ?? []) if (!baender.has(b as never)) f(ort, `unbekanntes Band „${b}“`);
      if (m.bedingung?.skill && !skillIds.has(m.bedingung.skill)) f(ort, `unbekannter Skill „${m.bedingung.skill}“`);
      if (m.ziel.art === 'probe' && !d.darstellung.proben?.[m.ziel.id ?? ''])
        f(ort, `Probenart „${m.ziel.id}“ hat keinen Namen in darstellung.json (proben)`);
    }
  }

  // ---------- regeln.json
  for (const rang of RAENGE) if (typeof r.raenge[rang as keyof typeof r.raenge] !== 'number') f('regeln.json', `Rang ${rang} ohne Wert`);
  if (r.steps.faktoren.length !== r.steps.keine_probe_ab) f('regeln.json', 'steps.faktoren muss genau keine_probe_ab Einträge haben');
  if (r.steps.faktoren[0] !== 1) f('regeln.json', 'steps.faktoren beginnt nicht mit 1');
  for (let s = r.leiter.min; s <= r.leiter.max; s++) {
    const stufe = r.leiter.stufen[String(s)];
    if (!stufe) f('regeln.json', `Leiterstufe ${s} fehlt`);
    else for (const sy of stufe.symptome) if (!r.symptome[sy]) f('regeln.json', `Leiterstufe ${s}: unbekanntes Symptom „${sy}“`);
    if (!d.darstellung.leiter_farben[String(s)]) f('darstellung.json', `Farbe für Leiterstufe ${s} fehlt`);
  }
  for (const k of ['adrenalin', 'ruhepuls'] as const) if (!d.darstellung.leiter_pfeile?.[k]) f('darstellung.json', `leiter_pfeile.${k} fehlt`);
  if (!baender.has(r.grundwerte.wurfweite_band)) f('regeln.json', 'grundwerte.wurfweite_band ist kein Band');
  const lageGruppen = new Set(r.lage.gruppen.map((g) => g.id));
  for (const u of r.lage.umstaende) {
    if (!lageGruppen.has(u.gruppe)) f('regeln.json', `Lage-Umstand ${u.id}: unbekannte Gruppe „${u.gruppe}“`);
    for (const b of u.nicht_in_baendern ?? []) if (!baender.has(b as never)) f('regeln.json', `Lage-Umstand ${u.id}: unbekanntes Band „${b}“`);
  }
  for (const g of r.lage.gruppen) {
    const umst = r.lage.umstaende.filter((u) => u.gruppe === g.id);
    if (g.quelle !== 'reichweite' && umst.length === 0) f('regeln.json', `Lage-Gruppe ${g.id} ohne Umstände`);
    if (g.auswahl === 'eins' && g.quelle !== 'reichweite' && umst.filter((u) => u.standard).length !== 1)
      f('regeln.json', `Lage-Gruppe ${g.id} braucht genau einen Standard`);
  }
  for (const s of r.sicht.stufen) if (s.erkennen_bis && s.erkennen_bis !== 'keins' && !baender.has(s.erkennen_bis as never))
    f('regeln.json', `Sichtstufe ${s.id}: unbekanntes Band`);
  for (const [id, sy] of Object.entries(r.symptome))
    for (const w of [sy.wirkung?.gewinn, sy.wirkung?.verlust])
      if (!SYMPTOM_WIRKUNGEN.includes(w as SymptomWirkung)) f('regeln.json', `Symptom ${id}: unbekannte Wirkung „${w}“`);
  for (const [z, eintrag] of Object.entries(r.zustaende))
    for (const p of Object.keys((eintrag as { mit_perk?: object }).mit_perk ?? {}))
      if (!perkIds.has(p)) f('regeln.json', `Zustand ${z}: unbekannter Perk „${p}“ in mit_perk`);
  if (!zonenIds.has(r.schiessen.schrot_rumpf_start)) f('regeln.json', `unbekannte Körperzone „${r.schiessen.schrot_rumpf_start}“`);
  if (!statIds.has(r.initiative.stat)) f('regeln.json', 'initiative.stat unbekannt');
  for (const p of Object.keys(r.initiative.ueberrascht_mit_perk ?? {}))
    if (!perkIds.has(p)) f('regeln.json', `initiative: unbekannter Perk „${p}“ in ueberrascht_mit_perk`);
  for (const [art, probe] of Object.entries(r.leiter.proben ?? {})) {
    if (!statIds.has(probe.stat)) f('regeln.json', `leiter.proben.${art}: unbekannter Stat „${probe.stat}“`);
    if (probe.skill && !skillIds.has(probe.skill)) f('regeln.json', `leiter.proben.${art}: unbekannter Skill „${probe.skill}“`);
    if (!d.darstellung.proben?.[art]) f('regeln.json', `leiter.proben.${art} hat keinen Namen in darstellung.json (proben)`);
  }
  for (const art of ['nerve_start', 'nerve_anstieg', 'nerve_senken', 'verschieben'])
    if (!r.leiter.proben?.[art]) f('regeln.json', `leiter.proben.${art} fehlt`);

  // Schießen, Ladehemmung, Breakaction, Bewegung, Trageorte, Perk-Wirkungen (Schritt 6)
  for (const [ort, stat] of [['schiessen.stat', r.schiessen.stat], ['schiessen.haltezahl.stat', r.schiessen.haltezahl?.stat],
    ['ladehemmung.beheben.stat', r.ladehemmung.beheben?.stat], ['ladehemmung.schwer_beheben.stat', r.ladehemmung.schwer_beheben?.stat],
    ['breakaction.reaktion.stat', r.breakaction.reaktion.stat], ['breakaction.antizipation.stat', r.breakaction.antizipation.stat]] as const)
    if (!statIds.has(stat as string)) f('regeln.json', `${ort}: unbekannter Stat „${stat}“`);
  for (const [ort, skill] of [['schiessen.haltezahl.skill', r.schiessen.haltezahl?.skill], ['ladehemmung.schwer_beheben.skill', r.ladehemmung.schwer_beheben?.skill],
    ['breakaction.reaktion.skill', r.breakaction.reaktion.skill], ['breakaction.antizipation.skill', r.breakaction.antizipation.skill]] as const)
    if (!skillIds.has(skill as string)) f('regeln.json', `${ort}: unbekannter Skill „${skill}“`);
  const bewegungsarten = new Set(Object.keys(r.bewegung.arten));
  if (r.bewegung.reihenfolge.length !== bewegungsarten.size || r.bewegung.reihenfolge.some((b) => !bewegungsarten.has(b)))
    f('regeln.json', 'bewegung.reihenfolge muss jede Bewegungsart genau einmal enthalten');
  for (const b of Object.keys(r.lage.eigene_bewegung))
    if (!bewegungsarten.has(b) && b !== 'hechten') f('regeln.json', `lage.eigene_bewegung: unbekannte Bewegungsart „${b}“`);
  for (const k of ['leicht', 'voll'] as const) {
    const max = r.konzentration[k].bewegung_max;
    if (max !== null && !bewegungsarten.has(max)) f('regeln.json', `konzentration.${k}.bewegung_max: unbekannte Bewegungsart „${max}“`);
  }
  const staende = new Set(r.staende.map((s) => s.id));
  if (!staende.size) f('regeln.json', 'staende ist leer');
  for (const [id, art] of Object.entries(r.bewegung.arten)) {
    for (const s of art.stand) if (!staende.has(s)) f('regeln.json', `bewegung.arten.${id}: unbekannter Stand „${s}“`);
    if (!d.darstellung.bewegungen?.[id]) f('darstellung.json', `Bewegungsart „${id}“ ohne Namen (bewegungen)`);
  }
  for (const id of [...Object.keys(r.bewegung.arten), 'hechten']) {
    const p = d.darstellung.bewegung_pfeile?.[id];
    if (p !== 'sprung' && !(typeof p === 'number' && p >= 1)) f('darstellung.json', `Bewegungsart „${id}“ ohne Pfeile (bewegung_pfeile)`);
  }
  for (const z of Object.keys(d.darstellung.zustand_bilder ?? {}))
    if (!(z in r.zustaende)) f('darstellung.json', `zustand_bilder: unbekannter Zustand „${z}“`);
  for (const s of staende) if (!d.darstellung.stand_bilder?.[s]) f('darstellung.json', `Stand „${s}“ ohne Piktogramm (stand_bilder)`);
  for (const s of [...r.hechten.staende, ...Object.keys(r.schiessen.rueckstoss_stepshields)])
    if (!staende.has(s)) f('regeln.json', `unbekannter Stand „${s}“ (hechten bzw. rueckstoss_stepshields)`);
  if (!r.eingehend?.ausloeser) f('regeln.json', 'eingehend.ausloeser fehlt');
  for (const [k, id] of Object.entries(r.eingehend?.ausloeser ?? {}))
    if (!r.leiter.ausloeser.some((a) => a.id === id)) f('regeln.json', `eingehend.ausloeser.${k}: unbekannter Auslöser „${id}“`);
  if (!r.ereignis?.length) f('regeln.json', 'ereignis fehlt');
  if (new Set((r.ereignis ?? []).map((e) => e.id)).size !== (r.ereignis ?? []).length) f('regeln.json', 'ereignis: doppelte ID');
  for (const e of r.ereignis ?? [])
    if (!r.leiter.ausloeser.some((a) => a.id === e.ausloeser)) f('regeln.json', `ereignis: unbekannter Auslöser „${e.ausloeser}“`);
  // Werfen
  if (!statIds.has(r.werfen?.stat)) f('regeln.json', `werfen.stat: unbekannter Stat „${r.werfen?.stat}“`);
  for (const k of ['skill_wurfwaffe', 'skill_sprengwaffe'] as const)
    if (!skillIds.has(r.werfen?.[k])) f('regeln.json', `werfen.${k}: unbekannter Skill „${r.werfen?.[k]}“`);
  // Nahkampf (Schritt 7)
  const nk = r.nahkampf;
  if (!statIds.has(nk.stat)) f('regeln.json', `nahkampf.stat: unbekannter Stat „${nk.stat}“`);
  if (!skillIds.has(nk.skill)) f('regeln.json', `nahkampf.skill: unbekannter Skill „${nk.skill}“`);
  for (const [a, b] of Object.entries(nk.stand_schlaegt))
    if (!staende.has(a) || !staende.has(b)) f('regeln.json', `nahkampf.stand_schlaegt: unbekannter Stand „${staende.has(a) ? b : a}“`);
  if (!r.leiter.ausloeser.some((a) => a.id === nk.ausloeser)) f('regeln.json', `nahkampf.ausloeser: unbekannter Auslöser „${nk.ausloeser}“`);
  for (const l of Object.keys(nk.als_break ?? {}))
    if (!['kurz', 'mittel', 'lang'].includes(l)) f('regeln.json', `nahkampf.als_break: unbekannte Länge „${l}“`);
  if (!nk.krit_stumpf) f('regeln.json', 'nahkampf.krit_stumpf fehlt');
  if (!d.nahkampfwaffen.eintraege.some((w) => w.id === nk.kampfkunst_waffe && !w.varianten))
    f('regeln.json', `nahkampf.kampfkunst_waffe: unbekannte Nahkampfwaffe „${nk.kampfkunst_waffe}“`);
  for (const st of r.staende) if (!st.du || !st.er) f('regeln.json', `staende.${st.id}: „du“ oder „er“ fehlt`);
  for (const w of nk.wirkungen ?? []) {
    for (const feld of ['folge', 'folge_du', 'tat_du', 'tat_gegner'] as const)
      if (!w[feld]) f('regeln.json', `nahkampf.wirkungen.${w.id}: „${feld}“ fehlt`);
    if (w.stand_danach && !staende.has(w.stand_danach)) f('regeln.json', `nahkampf.wirkungen.${w.id}: unbekannter Stand „${w.stand_danach}“`);
  }
  const wirkungsNamen = new Set((nk.wirkungen ?? []).map((w) => w.name));
  for (const p of d.perks.eintraege) {
    for (const [paar, text] of Object.entries(p.kampfkunst ?? {})) {
      const [sieger, verlierer] = paar.split('_ueber_');
      if (nk.stand_schlaegt[sieger!] !== verlierer) f('perks.json', `${p.id}.kampfkunst: „${paar}“ ist kein überlegener Stand`);
      if (text !== null && !wirkungsNamen.has(text)) f('perks.json', `${p.id}.kampfkunst.${paar}: unbekannte Wirkung „${text}“ (regeln.json nahkampf.wirkungen)`);
    }
  }
  if (!r.leiter.ausloeser.some((a) => a.id === r.schiessen.ausloeser)) f('regeln.json', `schiessen.ausloeser: unbekannter Auslöser „${r.schiessen.ausloeser}“`);
  if (r.sprengwirkung.richtungen.length !== 8) f('regeln.json', 'sprengwirkung.richtungen braucht 8 Einträge (W8)');
  for (const k of [...Object.keys(r.breakaction.reaktion.malsteps), ...Object.keys(r.breakaction.antizipation.malsteps_guete), ...Object.keys(r.breakaction.antizipation.malsteps_alter)])
    if (!d.darstellung.informationen?.[k]) f('darstellung.json', `Information „${k}“ ohne Namen (informationen)`);
  const trageorte = Object.keys(r.waffe_wechseln.trageorte);
  for (const t of trageorte) if (!d.darstellung.trageorte?.[t]) f('darstellung.json', `Trageort „${t}“ ohne Namen (trageorte)`);
  // Laden: Proben auf bekannte Stats und Skills, Trageort gekaufter Ware
  for (const [name, p] of [['verhandeln', r.laden.verhandeln], ['beschaffen', r.laden.beschaffen]] as const) {
    if (!statIds.has(p.stat)) f('regeln.json', `laden.${name}: unbekannter Stat „${p.stat}“`);
    if (!skillIds.has(p.skill)) f('regeln.json', `laden.${name}: unbekannter Skill „${p.skill}“`);
  }
  if (!trageorte.includes(r.laden.trageort)) f('regeln.json', `laden.trageort: unbekannter Trageort „${r.laden.trageort}“`);
  if (!(r.laden.munition_je > 0)) f('regeln.json', 'laden.munition_je muss größer als 0 sein');
  for (const [perk, liste] of Object.entries(r.perk_wirkungen)) {
    if (!perkIds.has(perk)) f('regeln.json', `perk_wirkungen: unbekannter Perk „${perk}“`);
    for (const w of liste) {
      if (!PERK_WIRKUNGEN.includes(w.art)) f('regeln.json', `perk_wirkungen.${perk}: unbekannte Wirkung „${w.art}“`);
      if (w.art === 'reichweite_frei') for (const b of w.baender) if (!baender.has(b)) f('regeln.json', `perk_wirkungen.${perk}: unbekanntes Band „${b}“`);
      if (w.art === 'folgetreffer_zonen') for (const z of [w.ansage, ...w.zonen]) if (!zonenIds.has(z)) f('regeln.json', `perk_wirkungen.${perk}: unbekannte Zone „${z}“`);
      if (w.art === 'konzentration_statt' && !r.konzentration.aktionen[w.aktion]) f('regeln.json', `perk_wirkungen.${perk}: unbekannte Aktion „${w.aktion}“`);
      if (w.art === 'ausruestung_bewegung' && !r.bewegung.reihenfolge.includes(w.bewegung_max)) f('regeln.json', `perk_wirkungen.${perk}: unbekannte Bewegung „${w.bewegung_max}“`);
      if (w.art === 'ziehen_ohne_aktion') for (const t of w.trageorte) if (!trageorte.includes(t)) f('regeln.json', `perk_wirkungen.${perk}: unbekannter Trageort „${t}“`);
    }
  }

  // ---------- stats.json
  for (const s of d.stats.eintraege) {
    pflicht(`stats.json ${s.id}`, s, ['id', 'name', 'gruppe']);
    if (!['A', 'B', 'C'].includes(s.gruppe)) f(`stats.json ${s.id}`, `ungültige Gruppe „${s.gruppe}“`);
  }
  if (d.stats.eintraege.length !== d.klassen.stufen[0]?.rank_set.length)
    f('stats.json', 'Zahl der Stats passt nicht zur Größe des Rank-Sets');

  // ---------- skills.json
  for (const s of d.skills.eintraege) {
    const ort = `skills.json ${s.id}`;
    pflicht(ort, s, ['id', 'name', 'stat', 'gruppe']);
    if (!statIds.has(s.stat)) f(ort, `unbekannter Stat „${s.stat}“`);
    if (!SKILLGRUPPEN.includes(s.gruppe)) f(ort, `unbekannte Gruppe „${s.gruppe}“`);
    if (s.gruppe === 'exklusiv' && !s.exklusiv?.length) f(ort, 'Gruppe exklusiv ohne Liste „exklusiv“');
    for (const k of s.exklusiv ?? []) {
      if (!klassenIds.has(k)) f(ort, `exklusiv: unbekannte Klasse „${k}“`);
      else if (klasse.get(k)?.art !== 'spezialisierung') f(ort, `exklusiv: „${k}“ ist keine Spezialisierung`);
    }
  }

  // ---------- perks.json
  for (const p of d.perks.eintraege) {
    const ort = `perks.json ${p.id}`;
    pflicht(ort, p, ['id', 'name', 'gruppe', 'rang', 'kurz', 'wirkung']);
    if (!PERKGRUPPEN.includes(p.gruppe)) f(ort, `unbekannte Gruppe „${p.gruppe}“`);
    if (!Number.isInteger(p.rang) || p.rang < 1) f(ort, 'Rang muss eine ganze Zahl ab 1 sein');
    for (const v of p.voraussetzung?.stats ?? []) if (!statIds.has(v.stat)) f(ort, `Voraussetzung: unbekannter Stat „${v.stat}“`);
    for (const v of p.voraussetzung?.perks ?? []) if (!perkIds.has(v)) f(ort, `Voraussetzung: unbekannter Perk „${v}“`);
    if (p.voraussetzung?.perks.includes(p.id)) f(ort, 'setzt sich selbst voraus');
    if ((p.gruppe === 'exklusiv') !== Boolean(p.exklusiv?.length)) f(ort, '„exklusiv“ nur und immer bei Gruppe exklusiv');
    for (const k of p.exklusiv ?? []) if (!klassenIds.has(k)) f(ort, `exklusiv: unbekannte Klasse „${k}“`);
    for (const h of p.hinweis_bei ?? []) if (!HINWEIS_STELLEN.includes(h)) f(ort, `unbekannte Hinweisstelle „${h}“`);
    if (!p.modifikatoren?.length && !p.hinweis_bei?.length) f(ort, 'weder Modifikatoren noch Hinweisstellen');
    modifikatoren(ort, p.modifikatoren);
  }

  for (const [id, b] of Object.entries(r.blutung ?? {})) {
    pflicht(`regeln.json blutung.${id}`, b, ['frist_minuten', 'bei_ablauf', 'versorgung']);
    if (b.bei_ablauf === 'schaden' && typeof b.schaden_anteil !== 'number') f('regeln.json', `blutung.${id}: schaden_anteil fehlt`);
    for (const m of Object.keys(b.versorgung ?? {})) if (!r.versorgen?.[m]) f('regeln.json', `blutung.${id}: unbekannte Maßnahme „${m}“`);
  }
  for (const [id, m] of Object.entries(r.versorgen ?? {})) {
    pflicht(`regeln.json versorgen.${id}`, m, ['name', 'skill', 'konzentration']);
    if (!d.skills.eintraege.some((s) => s.id === m.skill)) f('regeln.json', `versorgen.${id}: unbekannter Skill „${m.skill}“`);
    if (!r.konzentration.aktionen[m.konzentration]) f('regeln.json', `versorgen.${id}: unbekannte Konzentration „${m.konzentration}“`);
  }
  for (const [wo, sk] of [['nachsorge_skill', r.heilung?.nachsorge_skill], ['pflege_skill', r.heilung?.pflege_skill]] as const)
    for (const id of Object.values(sk ?? {}))
      if (!d.skills.eintraege.some((s) => s.id === id)) f('regeln.json', `heilung.${wo}: unbekannter Skill „${id}“`);

  // ---------- koerperzonen.json
  const w8 = d.koerperzonen.eintraege.map((z) => z.w8).filter((x): x is number => x !== null);
  for (let i = 1; i <= 8; i++) if (w8.filter((x) => x === i).length !== 1) f('koerperzonen.json', `W8-Ergebnis ${i} muss genau einer Zone gehören`);
  for (const z of d.koerperzonen.eintraege) {
    const ort = `koerperzonen.json ${z.id}`;
    pflicht(ort, z, ['id', 'name', 'ort', 'multiplikator', 'bereich', 'normal', 'krit']);
    if (z.w8 === null && !z.nur_ansage) f(ort, 'ohne W8-Nummer muss „nur_ansage“ gesetzt sein');
    for (const b of [z.normal.blutung, z.krit.blutung]) if (b && !r.blutung?.[b]) f(ort, `unbekannte Blutung „${b}“`);
    for (const spalte of [z.normal, z.krit]) {
      if (!Array.isArray(spalte?.saetze) || spalte.saetze.length === 0) { f(ort, 'Folge ohne „saetze“'); continue; }
      for (const satz of spalte.saetze) {
        if (!satz.text) f(ort, 'Satz ohne Text');
        for (const b of satz.nur_bei_bewegung ?? []) if (!r.bewegung.reihenfolge.includes(b)) f(ort, `unbekannte Bewegung „${b}“`);
        if (satz.stand_danach && !r.staende.some((x) => x.id === satz.stand_danach)) f(ort, `unbekannter Stand „${satz.stand_danach}“`);
      }
    }
  }

  // ---------- munition.json
  for (const m of d.munition.eintraege) {
    const ort = `munition.json ${m.id}`;
    pflicht(ort, m, ['id', 'name', 'art', 'typen']);
    if (Object.keys(m.typen ?? {}).length === 0) f(ort, 'keine Munitionstypen');
    for (const [typ, t] of Object.entries(m.typen ?? {})) {
      if (typeof t.mw !== 'number') f(ort, `${typ}: MW fehlt`);
      if (t.dk === null && !t.stumpf) f(ort, `${typ}: DK fehlt (nur stumpfe Munition hat keine DK)`);
      for (const b of Object.keys(t.schrotzahl ?? {})) if (!baender.has(b as never)) f(ort, `${typ}: unbekanntes Band „${b}“`);
      handelswerte(`${ort} ${typ}`, t.vorratslevel, t.preis_10);
    }
  }

  // ---------- waffen.json
  const munMap = new Map(d.munition.eintraege.map((m) => [m.id, m]));
  const sprengMap = new Map(d.wurf_und_sprengwaffen.eintraege.map((s) => [s.id, s]));
  for (const w of d.waffen.eintraege) {
    const ort = `waffen.json ${w.id}`;
    pflicht(ort, w, ['id', 'name', 'kategorie', 'munition', 'magazin', 'ladeart', 'feuermodi', 'reichweite', 'zuverlaessigkeit']);
    if (!waffenkategorien.has(w.kategorie)) f(ort, `kein Waffenskill für Kategorie „${w.kategorie}“`);
    if (Array.isArray(w.munition)) {
      for (const g of w.munition) {
        const s = sprengMap.get(g);
        if (!s) f(ort, `unbekanntes Geschoss „${g}“`);
        else if (!s.verwendet_in?.includes(w.id)) f(ort, `Geschoss „${g}“ nennt die Waffe nicht in verwendet_in`);
      }
    } else {
      const m = munMap.get(w.munition);
      if (!m) f(ort, `unbekanntes Kaliber „${w.munition}“`);
      for (const t of w.munitionstypen ?? []) if (m && !m.typen[t]) f(ort, `Kaliber hat keinen Typ „${t}“`);
    }
    if (!LADEARTEN.includes(w.ladeart)) f(ort, `unbekannte Ladeart „${w.ladeart}“`);
    if (!['zuverlaessig', 'normal'].includes(w.zuverlaessigkeit)) f(ort, 'ungültige Zuverlässigkeit');
    for (const b of baender) if (!(b in (w.reichweite ?? {}))) f(ort, `Reichweite für Band „${b}“ fehlt`);
    const modi = Object.keys(w.feuermodi ?? {});
    if (modi.length === 0) f(ort, 'kein Feuermodus');
    for (const [modus, fm] of Object.entries(w.feuermodi ?? {})) {
      if (!FEUERMODI.includes(modus)) f(ort, `unbekannter Feuermodus „${modus}“`);
      if (!fm) continue;
      if (modus === 'VA') {
        const soll = r.schiessen.garbenfaktor_aus_feuerrate.find((g) => g.bis === null || fm.feuerrate <= g.bis)?.faktor;
        if (fm.garbenfaktor !== soll) f(ort, `Garbenfaktor ${fm.garbenfaktor} passt nicht zur Feuerrate ${fm.feuerrate} (erwartet ${soll})`);
      } else if (fm.garbenfaktor !== undefined) f(ort, 'Garbenfaktor nur bei VA');
      if (modus === 'Burst') {
        if (!fm.burst_laenge) f(ort, 'Burst ohne burst_laenge');
        else if (fm.feuerrate % fm.burst_laenge !== 0) f(ort, 'Burst-Feuerrate ist kein Vielfaches der Burst-Länge');
      }
    }
    for (const a of w.anschluesse ?? []) if (!ANSCHLUESSE.includes(a)) f(ort, `unbekannter Anschluss „${a}“`);
    handelswerte(ort, w.vorratslevel, w.preis);
    if (w.ladeart === 'wechselmagazin') {
      const m = d.magazine.eintraege.find((x) => x.id === w.standardmagazin);
      if (!m) f(ort, `Standardmagazin fehlt oder ist unbekannt („${w.standardmagazin ?? ''}“)`);
      else {
        if (!m.passt_an.includes(w.id)) f(ort, `Standardmagazin „${m.id}“ nennt die Waffe nicht in passt_an`);
        if (m.groesse !== w.magazin) f(ort, `Standardmagazin „${m.id}“ hat ${m.groesse} statt ${w.magazin} Schuss`);
        if (m.art !== 'magazin') f(ort, 'Standardmagazin muss art „magazin“ haben');
      }
    } else if (w.standardmagazin) f(ort, 'standardmagazin nur bei Ladeart „wechselmagazin“');
  }

  // ---------- magazine.json
  const waffeMap = new Map(d.waffen.eintraege.map((w) => [w.id, w]));
  const alteIds = new Set<string>();
  for (const m of d.magazine.eintraege) {
    const ort = `magazine.json ${m.id}`;
    pflicht(ort, m, ['id', 'name', 'art', 'groesse', 'passt_an']);
    if (!['magazin', 'lader'].includes(m.art)) f(ort, 'art muss „magazin“ oder „lader“ sein');
    if (!(Number.isInteger(m.groesse) && m.groesse > 0)) f(ort, 'groesse muss eine ganze Zahl > 0 sein');
    if (!m.passt_an.length) f(ort, 'passt an keine Waffe');
    const kaliber = new Set<string>();
    for (const id of m.passt_an) {
      const w = waffeMap.get(id);
      if (!w) { f(ort, `unbekannte Waffe „${id}“`); continue; }
      if (Array.isArray(w.munition)) f(ort, `„${id}“ ist ein Werfer`);
      else kaliber.add(w.munition);
      if (m.art === 'magazin' && w.ladeart !== 'wechselmagazin') f(ort, `„${id}“ hat kein Wechselmagazin`);
      if (m.art === 'lader' && w.ladeart === 'wechselmagazin') f(ort, `Schnelllader bzw. Ladestreifen passt nicht an „${id}“ (Wechselmagazin)`);
      if (m.art === 'lader' && m.groesse !== w.magazin) f(ort, `groesse ${m.groesse} passt nicht zu „${id}“ (${w.magazin})`);
    }
    if (kaliber.size > 1) f(ort, 'Waffen mit verschiedenem Kaliber');
    if (m.trommel && m.art !== 'magazin') f(ort, 'trommel nur bei art „magazin“');
    for (const a of m.alte_ids ?? []) {
      if (magazinIds.has(a)) f(ort, `alte ID „${a}“ ist eine heutige ID`);
      if (alteIds.has(a) && m.art === 'magazin') f(ort, `alte ID „${a}“ doppelt`);
      alteIds.add(a);
    }
    handelswerte(ort, m.vorratslevel, m.preis);
  }

  // ---------- aufsaetze.json
  for (const a of d.aufsaetze.eintraege) {
    const ort = `aufsaetze.json ${a.id}`;
    pflicht(ort, a, ['id', 'name', 'passt_an', 'einsatz']);
    if (!a.passt_an.anschluss.length) f(ort, 'kein Anschluss');
    for (const x of a.passt_an.anschluss) if (!ANSCHLUESSE.includes(x)) f(ort, `unbekannter Anschluss „${x}“`);
    for (const x of a.passt_an.waffen) if (!waffenIds.has(x)) f(ort, `unbekannte Waffe „${x}“`);
    if (!['immer', 'schalter'].includes(a.einsatz)) f(ort, 'einsatz muss „immer“ oder „schalter“ sein');
    if (a.einsatz === 'schalter' && !a.schalter_text) f(ort, 'Schalter ohne schalter_text');
    if (a.waffe && !waffenIds.has(a.waffe)) f(ort, `unbekannte Waffe „${a.waffe}“`);
    if (a.nahkampfwaffe && !nahkampfIds.has(a.nahkampfwaffe)) f(ort, `unbekannte Nahkampfwaffe „${a.nahkampfwaffe}“`);
    modifikatoren(ort, a.modifikatoren);
    if (a.waffe || a.nahkampfwaffe) {
      if (a.preis || a.vorratslevel !== undefined) f(ort, 'Preis und Vorratslevel kommen von der Waffe; nicht doppelt eintragen');
    } else handelswerte(ort, a.vorratslevel, a.preis);
  }
  void aufsatzIds;

  // ---------- nahkampfwaffen.json
  for (const n of d.nahkampfwaffen.eintraege) {
    const ort = `nahkampfwaffen.json ${n.id}`;
    pflicht(ort, n, ['id', 'name', 'art']);
    if (!['stumpf', 'scharf'].includes(n.art)) f(ort, 'art muss „stumpf“ oder „scharf“ sein');
    if (!('wurf' in n)) f(ort, 'wurf fehlt (Objekt mit Malsteps je Band oder null)');
    for (const wurf of [n.wurf, ...Object.values(n.varianten ?? {}).map((v) => v.wurf)]) {
      if (wurf === null || wurf === undefined) continue;
      if (typeof wurf !== 'object') f(ort, 'wurf muss ein Objekt oder null sein');
      else
        for (const [b, m] of Object.entries(wurf)) {
          if (!baender.has(b as never)) f(ort, `unbekanntes Band „${b}“ in wurf`);
          if (m !== null && !(Number.isInteger(m) && m >= 0)) f(ort, `wurf ${b}: Malsteps müssen eine ganze Zahl ≥ 0 oder null sein`);
        }
    }
    const varianten = n.varianten ? Object.values(n.varianten) : [n];
    for (const v of varianten) {
      if (!['kurz', 'mittel', 'lang'].includes(v.laenge ?? '')) f(ort, 'Länge fehlt oder ist ungültig');
      if (typeof v.mw !== 'number') f(ort, 'MW fehlt');
      const art = ('art' in v && v.art) || n.art;
      if (art === 'scharf' && typeof v.dk !== 'number') f(ort, 'scharfe Waffe ohne DK');
      if (art === 'stumpf' && v.dk !== null) f(ort, 'stumpfe Waffe mit DK');
    }
    for (const k of n.mit_waffe ?? []) if (!waffenkategorien.has(k)) f(ort, `unbekannte Waffenkategorie „${k}“`);
  }

  // ---------- wurf_und_sprengwaffen.json
  for (const s of d.wurf_und_sprengwaffen.eintraege) {
    const ort = `wurf_und_sprengwaffen.json ${s.id}`;
    pflicht(ort, s, ['id', 'name', 'art', 'einsatz']);
    if (!['wurf', 'geschoss'].includes(s.einsatz)) f(ort, 'einsatz muss „wurf“ oder „geschoss“ sein');
    if (s.einsatz === 'geschoss' && !s.verwendet_in?.length) f(ort, 'Geschoss ohne verwendet_in');
    for (const w of s.verwendet_in ?? []) {
      if (!waffenIds.has(w)) f(ort, `unbekannte Waffe „${w}“`);
      const waffe = d.waffen.eintraege.find((x) => x.id === w);
      if (waffe && !(Array.isArray(waffe.munition) && waffe.munition.includes(s.id))) f(ort, `Waffe „${w}“ führt das Geschoss nicht`);
    }
    for (const b of [...Object.keys(s.bereiche ?? {}), ...(s.kern ?? [])]) if (!baender.has(b as never)) f(ort, `unbekanntes Band „${b}“`);
    for (const a of s.ausloeser ?? []) if (!ausloeserIds.has(a)) f(ort, `unbekannter Auslöser „${a}“`);
  }
  void sprengIds;

  // ---------- schutz.json
  for (const ru of d.schutz.ruestung) {
    for (const z of Object.keys(ru.zonen)) if (!zonenIds.has(z)) f(`schutz.json ${ru.id}`, `unbekannte Zone „${z}“`);
    // Regelfrage R2 (entschieden): Rüstung am Rumpf deckt alle Rumpfzonen mit demselben Wert.
    const rumpf = d.koerperzonen.eintraege.filter((z) => z.bereich === 'rumpf' && z.w8 !== null).map((z) => z.id);
    const werte = rumpf.map((z) => ru.zonen[z]);
    if (werte.some((w) => w !== undefined) && werte.some((w) => w !== werte[0]))
      f(`schutz.json ${ru.id}`, 'Rüstung am Rumpf muss Brust, Bauch und Unterleib mit demselben Wert abdecken');
  }
  for (const sc of d.schutz.schilde) {
    for (const z of sc.zonen) if (!zonenIds.has(z)) f(`schutz.json ${sc.id}`, `unbekannte Zone „${z}“`);
    const waffen = sc.einschraenkung?.waffen;
    if (waffen !== undefined && !(Array.isArray(waffen) && waffen.every((k) => typeof k === 'string')))
      f(`schutz.json ${sc.id}`, 'einschraenkung.waffen muss eine Liste von Waffenkategorien sein');
  }

  // ---------- klassen.json
  const stufen = new Map(d.klassen.stufen.map((s) => [s.stufe, s]));
  for (const s of d.klassen.stufen) {
    if (s.rank_set.length !== d.stats.eintraege.length) f('klassen.json', `Rank-Set der Stufe ${s.stufe} hat nicht ${d.stats.eintraege.length} Einträge`);
    for (const rg of s.rank_set) if (!RAENGE.includes(rg)) f('klassen.json', `Stufe ${s.stufe}: ungültiger Rang „${rg}“`);
  }
  for (const k of d.klassen.eintraege) {
    const ort = `klassen.json ${k.id}`;
    pflicht(ort, k, ['id', 'name', 'laufbahn', 'stufe', 'art', 'vorratslevel', 'gehalt', 'mindestskills', 'zugang']);
    if (!laufbahnIds.has(k.laufbahn)) f(ort, `unbekannte Laufbahn „${k.laufbahn}“`);
    const stufe = stufen.get(k.stufe);
    if (!stufe) f(ort, `unbekannte Stufe ${k.stufe}`);
    if (!KLASSENARTEN.includes(k.art)) f(ort, `unbekannte Art „${k.art}“`);
    if (k.erweitert) {
      const basis = klasse.get(k.erweitert);
      if (!basis) f(ort, `erweitert unbekannte Klasse „${k.erweitert}“`);
      else if (basis.art !== 'spezialisierung' || basis.laufbahn !== k.laufbahn) f(ort, 'erweitert keine Spezialisierung derselben Laufbahn');
    }
    if (k.art === 'erweiterte_form' && !k.erweitert) f(ort, 'erweiterte Form ohne „erweitert“');
    if (k.voraussetzung_stat) {
      if (!statIds.has(k.voraussetzung_stat.stat)) f(ort, `Voraussetzung: unbekannter Stat „${k.voraussetzung_stat.stat}“`);
      if (!RAENGE.includes(k.voraussetzung_stat.rang)) f(ort, 'Voraussetzung: ungültiger Rang');
    }
    if (k.rank_vorschlag && stufe) {
      const vorschlag = Object.values(k.rank_vorschlag).sort().join();
      if (vorschlag !== [...stufe.rank_set].sort().join()) f(ort, 'Rank-Vorschlag passt nicht zum Rank-Set der Stufe');
      for (const s of Object.keys(k.rank_vorschlag)) if (!statIds.has(s)) f(ort, `Rank-Vorschlag: unbekannter Stat „${s}“`);
      if (Object.keys(k.rank_vorschlag).length !== statIds.size) f(ort, 'Rank-Vorschlag nennt nicht jeden Stat');
    }
    for (const [s, wert] of Object.entries(k.mindestskills ?? {})) {
      if (!skillIds.has(s)) f(ort, `Mindestskill: unbekannter Skill „${s}“`);
      if (!Number.isInteger(wert) || wert < 1 || wert > r.aufstieg.skill_max) f(ort, `Mindestskill ${s}: Wert ${wert} außerhalb 1–${r.aufstieg.skill_max}`);
    }
    for (const p of k.perks_vorgegeben ?? []) if (!perkIds.has(p)) f(ort, `vorgegebener Perk unbekannt: „${p}“`);
    const z = k.zugang;
    if (z.wie && !klassenIds.has(z.wie)) f(ort, `Zugang „wie“: unbekannte Klasse „${z.wie}“`);
    for (const s of z.skills ?? []) {
      if (s.startsWith('gruppe:')) { if (!skillGruppen.has(s.slice(7))) f(ort, `Zugang: unbekannte Skillgruppe „${s}“`); }
      else if (!skillIds.has(s)) f(ort, `Zugang: unbekannter Skill „${s}“`);
    }
    for (const p of z.perks ?? []) {
      if (p.startsWith('gruppe:')) { if (!perkGruppen.has(p.slice(7) as never)) f(ort, `Zugang: unbekannte Perkgruppe „${p}“`); }
      else if (!perkIds.has(p)) f(ort, `Zugang: unbekannter Perk „${p}“`);
    }
    // Ketten über „wie“ dürfen nicht im Kreis laufen.
    const gesehen = new Set<string>([k.id]);
    let naechste = z.wie;
    while (naechste) {
      if (gesehen.has(naechste)) { f(ort, 'Zugang „wie“ läuft im Kreis'); break; }
      gesehen.add(naechste);
      naechste = klasse.get(naechste)?.zugang.wie ?? null;
    }
  }

  // Mindestskills müssen im Zugang der Klasse liegen, sonst könnte der Charakter sie nie steigern.
  if (fehler.length === 0) {
    for (const k of d.klassen.eintraege) {
      const zugang = zugangDerKlasse(k.id, d);
      for (const s of Object.keys(k.mindestskills ?? {}))
        if (!zugang.skills.has(s)) f(`klassen.json ${k.id}`, `Mindestskill „${s}“ liegt nicht im Zugang der Klasse`);
    }
  }

  // ---------- darstellung.json
  for (const t of ['stat', 'skill', 'perk'] as const) if (!d.darstellung.typen[t]) f('darstellung.json', `Typ „${t}“ fehlt`);
  for (const t of new Set(d.munition.eintraege.flatMap((m) => Object.keys(m.typen))))
    if (!d.darstellung.munitionsfarben?.[t]) f('darstellung.json', `Munitionstyp „${t}“ ohne Farbe (munitionsfarben)`);
  for (const [name, h] of [...Object.entries(d.darstellung.herkunft), ...Object.entries(d.darstellung.typen)])
    if (NUR_STEPS.includes(h.zeichen)) f('darstellung.json', `„${name}“ nutzt ${h.zeichen}; ▲ und ▼ sind für Steps reserviert`);
  for (const id of Object.keys(r.grundwerte))
    if (!d.darstellung.grundwerte?.[id]) f('darstellung.json', `Grundwert „${id}“ hat keinen Namen (grundwerte)`);

  return fehler;
}
