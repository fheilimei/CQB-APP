<script lang="ts">
  // Reiter Werte (konzept.md § Aufbau der App, § 3.1–3.5) mit den Modi Lesen, Aufstieg und Schreiben (§ 3.0a).
  // Lesen: alles gesperrt. Aufstieg: Kaufen gegen freie Punkte, mit Bericht. Schreiben: direkt ändern, ohne Prüfung.
  import { tick } from 'svelte';
  import type { Modifikator, Rang, Spieldaten } from '../daten/typen';
  import {
    aktuelleKlasse, eingefroreneSkills, moeglichkeiten, perkKaufen, perkVoraussetzungen, skillSteigern,
    skillSteigernSperre, statrankUp, statrankUpSperre, vorratslevel, type Moeglichkeit
  } from '../regeln/aufstieg';
  import { modifikatorenAn, perkModifikatoren, stepReihe } from '../regeln/bogen';
  import { GROESSEN } from '../regeln/erstellung';
  import { anpassen, korrigiere, type Anpassungsaktion, type Korrektur } from '../regeln/korrektur';
  import type { HerkunftModifikator } from '../regeln/modifikatoren';
  import { leiterSteps } from '../regeln/leiter';
  import { rangfolge, statwert, summe } from '../regeln/probe';
  import { leiterStand } from '../regeln/probenrechner';
  import type { Charakter, Quelle } from '../speicher/charakter';
  import Begriff from './Begriff.svelte';
  import Bericht from './Bericht.svelte';
  import Herkunft from './Herkunft.svelte';
  import Kaufliste from './Kaufliste.svelte';
  import StatrankUp from './StatrankUp.svelte';
  import {
    bedingungText, geld, klasseName, laufbahnName, mitZeichen, perkName, punkte, stufeName, vorzeichen, wirkungText, wurfText, zielText,
    type Modus, type Zeile
  } from './texte';
  import Anpassungen from './werte/Anpassungen.svelte';
  import Grundwerte from './werte/Grundwerte.svelte';

  interface Props {
    c: Charakter; d: Spieldaten; modus: Modus; abweichungModus: Quelle; onaendern: (c: Charakter) => void;
    /** Probenrechner öffnen (konzept.md § 3.4: Skill antippen). */
    onprobe: (stat: string, skill: string | null) => void;
  }
  let { c, d, modus, abweichungModus, onaendern, onprobe }: Props = $props();
  const stand = $derived(leiterStand(c));
  /** Netto-Malsteps aus Adrenalin bzw. Ruhepuls auf diesen Stat; Stepshields allein lassen den Statwert gelten. */
  function leiterSpalte(statId: string): { spalte: number; wirkt: boolean } {
    const q = leiterSteps(stand, statId, d);
    return { spalte: Math.max(0, summe(q, 'malsteps') - summe(q, 'stepshields')), wirkt: q.length > 0 };
  }

  const klasse = $derived.by(() => { const id = aktuelleKlasse(c); return id ? d.klassen.eintraege.find((k) => k.id === id) ?? null : null; });
  const eingefroren = $derived(new Set(eingefroreneSkills(c, d)));
  const liste = $derived(modus === 'aufstieg' ? moeglichkeiten(c, d) : []);
  const markiert = (pfad: string) => c.ueberschrieben.includes(pfad);
  const schreiben = $derived(modus === 'schreiben');
  const gruppen = $derived([...new Set(d.stats.eintraege.map((s) => s.gruppe))]);
  const malstepSpalten = $derived(Array.from({ length: d.regeln.steps.keine_probe_ab - 1 }, (_, i) => i + 1));

  let offenStat = $state<string | null>(null);
  let offenSkill = $state<string | null>(null);
  let offenPerk = $state<string | null>(null);
  let offenGrundwert = $state<string | null>(null);
  let stammOffen = $state(false);
  let alleSkills = $state(false);
  let rankUp = $state<string | null>(null);
  let kauf = $state<{ m: Moeglichkeit; zeilen: Zeile[] } | null>(null);
  let neuerPerk = $state('');

  const skillsSichtbar = $derived(d.skills.eintraege.filter((s) => alleSkills || (c.skills[s.id] ?? 0) > 0));

  /** Quellen der Markierung an einem Stat oder Skill: Perks, Anpassungen, von Hand. */
  function quellenVon(mods: HerkunftModifikator[], pfad: string): string[] {
    return [...mods.map((m) => m.herkunft), ...(markiert(pfad) ? ['manuell'] : [])];
  }

  /** Sprung zu einem Wert, Perk oder einer Anpassung (Aufschlüsselung und Rückverweis, konzept.md § 3.0b). */
  async function springe(art: string, id: string) {
    if (art === 'perk') offenPerk = id;
    else if (art === 'stat') offenStat = id;
    else if (art === 'skill') { offenSkill = id; if (!((c.skills[id] ?? 0) > 0)) alleSkills = true; }
    else if (art === 'grundwert') offenGrundwert = id;
    await tick();
    document.getElementById(`${art}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const springbar = (m: Modifikator) => m.ziel.art === 'grundwert' || m.ziel.art === 'stat' || m.ziel.art === 'skill';

  // ---- Aufstieg: Kauf mit Bericht
  function kaufen(m: Moeglichkeit) {
    if (m.art === 'statrank_up') { rankUp = m.id; return; }
    const nach = c.freie_punkte - m.kosten;
    const zeilen: Zeile[] = m.art === 'skill'
      ? [{ text: `Du steigerst ${mitZeichen('skill', m.id, d)} von ${c.skills[m.id] ?? 0} auf ${(c.skills[m.id] ?? 0) + 1}.`, fett: true }]
      : [{ text: `Du erwirbst ${mitZeichen('perk', m.id, d)}.`, fett: true },
         { text: d.perks.eintraege.find((p) => p.id === m.id)?.wirkung ?? '' }];
    zeilen.push({ text: `Das kostet ${punkte(m.kosten)}. Deine freien Punkte sinken von ${c.freie_punkte} auf ${nach}.` });
    zeilen.push({ text: 'Ein Aufstiegsschritt lässt sich nicht zurücknehmen.' });
    kauf = { m, zeilen };
  }
  function kaufBestaetigen() {
    if (!kauf) return;
    const { m } = kauf;
    onaendern(m.art === 'skill' ? skillSteigern(c, m.id, d) : perkKaufen(c, m.id, d));
    kauf = null;
  }
  function skillPlus(id: string) {
    kaufen({ art: 'skill', id, kosten: d.regeln.aufstieg.skill_level_kosten, sperre: null });
  }

  // ---- Schreibmodus
  const k = (x: Korrektur) => onaendern(korrigiere(c, x));
  const anp = (a: Anpassungsaktion) => onaendern(anpassen(c, a));
  function wurfSetzen(id: string, feld: 'positiv' | 'negativ', wert: number) {
    const alt = c.stats[id]!.wurf ?? { positiv: 5, negativ: 5, quelle: 'hand' as const };
    if (!Number.isInteger(wert) || wert < 1 || wert > 10) return;
    k({ art: 'wurf', id, wurf: { ...alt, [feld]: wert } });
  }
  const wert = (e: Event) => (e.target as HTMLInputElement | HTMLTextAreaElement).value;

  /** Notizen sind kein Wert des Charakters; sie bleiben in jedem Modus änderbar und werden nicht protokolliert. */
  function notizen(text: string) {
    if (text !== c.notizen) onaendern({ ...c, notizen: text, geaendert: new Date().toISOString() });
  }
</script>

{#snippet modZeilen(mods: HerkunftModifikator[])}
  {#if mods.length}
    <ul class="mods">
      {#each mods as m, i (i)}
        {@const h = d.darstellung.herkunft[m.herkunft]!}
        <li><button class="link flach" onclick={() => springe(m.herkunft, m.quelle)}><span style:color={h.farbe}>{h.zeichen}</span> {m.name}</button>
          <span>{wirkungText(m)}{bedingungText(m, d) ? ` (${bedingungText(m, d)})` : ''}</span></li>
      {/each}
    </ul>
  {/if}
{/snippet}

{#if modus === 'aufstieg'}
  <div class="leiste karte" aria-live="polite"><strong>{punkte(c.freie_punkte)} frei</strong></div>
{/if}

<section class="karte">
  <details bind:open={stammOffen}>
    <summary><h2>Stammdaten</h2><span class="hinweis">{klasse ? klasse.name : 'ohne Klasse'}</span><span class="klapppfeil" aria-hidden="true">›</span></summary>
    <div class="stapel stamm">
    {#if schreiben}
      <label class="feld">Name
  <input id="st-name" value={c.name} onchange={(e) => { const v = wert(e).trim(); if (v) k({ art: 'text', feld: 'name', wert: v }); }} /></label>
      <label class="feld">Aussehen
  <textarea id="st-aussehen" rows="2" value={c.aussehen} onchange={(e) => k({ art: 'text', feld: 'aussehen', wert: wert(e) })}></textarea></label>
    {:else if c.aussehen}
      <p class="hinweis">{c.aussehen}</p>
    {/if}
    <dl>
      <dt>Klasse</dt><dd>{klasse ? klasse.name : 'ohne Klasse'}</dd>
      {#if klasse}
        {#if c.klassenweg.length > 1}<dt>Weg</dt><dd>{c.klassenweg.map((w) => klasseName(w.klasse, d)).join(' → ')}</dd>{/if}
        <dt>Laufbahn</dt><dd>{laufbahnName(klasse.laufbahn, d)}</dd>
        <dt>Stufe</dt><dd>{klasse.stufe} ({stufeName(klasse.stufe, d)})</dd>
        <dt>Gehalt</dt><dd>{geld(klasse.gehalt)} pro Auftrag{c.hintergrund.vertrag ? '' : ' (kein Vertrag)'}</dd>
      {/if}
      <dt>Vorratslevel</dt>
      <dd class:hand={markiert('vorratslevel')}>
        {#if schreiben}
          <input class="zahl" type="number" inputmode="numeric" min="1" max="5" value={vorratslevel(c, d) ?? ''}
            onchange={(e) => k({ art: 'vorratslevel', wert: Number(wert(e)) || null })} />
        {:else}{vorratslevel(c, d) ?? '–'}{/if}
      </dd>
      <dt>Freie Punkte</dt>
      <dd class:hand={markiert('freie_punkte')}>
        {#if schreiben}
          <span class="stepper">
            <button aria-label="einen Punkt weniger" onclick={() => k({ art: 'freie_punkte', wert: c.freie_punkte - 1 })}>−</button>
            <strong>{c.freie_punkte}</strong>
            <button aria-label="einen Punkt mehr" onclick={() => k({ art: 'freie_punkte', wert: c.freie_punkte + 1 })}>+</button>
          </span>
        {:else}{c.freie_punkte}{/if}
      </dd>
    </dl>

    <div class="gruppe">
    <h3 class="abschnitt-titel">Hintergrund</h3>
    {#if c.hintergrund.schulden || c.hintergrund.coup || c.hintergrund.vertrag}
      <ul class="hintergrund">
        {#if c.hintergrund.schulden}
          {@const s = c.hintergrund.schulden}
          <li><strong>Schulden</strong> ({GROESSEN[s.groesse]}){s.glaeubiger ? ` bei ${s.glaeubiger}` : ''}
            {#if c.schulden}: noch {geld(c.schulden.rest)}, Frist {c.schulden.frist_auftraege} {c.schulden.frist_auftraege === 1 ? 'Auftrag' : 'Aufträge'}{/if}{s.sicherheit ? `. Sicherheit: ${s.sicherheit}` : ''}</li>
        {/if}
        {#if c.hintergrund.coup}
          {@const s = c.hintergrund.coup}
          <li><strong>Coup</strong> ({GROESSEN[s.groesse]}){s.beute ? `: ${s.beute}` : ''}{s.feind ? `. Feind: ${s.feind}` : ''}</li>
        {/if}
        {#if c.hintergrund.vertrag}
          {@const s = c.hintergrund.vertrag}
          <li><strong>Vertrag</strong>{s.auftraggeber ? ` mit ${s.auftraggeber}` : ''}{s.verpflichtung ? `: ${s.verpflichtung}` : ''}</li>
        {/if}
      </ul>
    {/if}
    {#each [['geburtsort', 'Geburtsort'], ['personen', 'Wichtige Personen'], ['lebensmittelpunkt', 'Lebensmittelpunkt']] as const as [feld, titel] (feld)}
      {#if schreiben}
        <label class="feld">{titel}
  <input id="hg-{feld}" value={c.hintergrund[feld]} onchange={(e) => k({ art: 'hintergrund', feld, wert: wert(e) })} /></label>
      {:else if c.hintergrund[feld]}
        <p><span class="hinweis">{titel}:</span> {c.hintergrund[feld]}</p>
      {/if}
    {/each}

    </div>

    <label class="feld">Notizen
  <textarea id="st-notizen" rows="3" value={c.notizen} onchange={(e) => notizen(wert(e))}></textarea></label>
    </div>
  </details>
</section>

{#if modus === 'aufstieg'}
  <section class="karte"><Kaufliste {c} {d} {liste} onkaufen={kaufen} /></section>
{/if}

<section class="karte">
  <h2>Stats</h2>
  <div class="statgitter kopfreihe" style:--spalten={malstepSpalten.length} aria-hidden="true">
    <span></span><span>Wert</span>
    {#each malstepSpalten as n (n)}<span>▼{n}</span>{/each}
    <span></span>
  </div>
  {#each gruppen as gruppe (gruppe)}
    <div class="gruppe">
    <h3 class="gruppe-titel">Gruppe {gruppe}</h3>
    <ul class="zeilen">
      {#each d.stats.eintraege.filter((s) => s.gruppe === gruppe) as s (s.id)}
        {@const e = c.stats[s.id]!}
        {@const sw = statwert(e, d.regeln)}
        {@const mods = modifikatorenAn(c, d, 'stat', s.id)}
        {@const offen = offenStat === s.id}
        {@const lt = leiterSpalte(s.id)}
        <li id="stat-{s.id}">
          <!-- Eine Zeile: Name mit Rang-Marke, groß der Statwert, dann die Zielwerte bei 1 bis 5 Malsteps absteigend. -->
          <button class="zeile flach stat statgitter" style:--spalten={malstepSpalten.length} aria-expanded={offen} onclick={() => (offenStat = offen ? null : s.id)}>
            <span class="statname">
              <Begriff art="stat" name={s.name} darstellung={d.darstellung} />
              {#if e.rang}<span class="rang" aria-label="Rang {e.rang}">{e.rang}</span>{/if}
            </span>
            <strong class="statwert" class:hand={markiert(`stats.${s.id}`)} class:gilt={lt.wirkt && lt.spalte === 0}>{sw ?? '–'}<Herkunft quellen={[...quellenVon(mods, `stats.${s.id}`), ...(lt.wirkt ? ['leiter'] : [])]} darstellung={d.darstellung} /></strong>
            {#if sw !== null}
              {#each stepReihe(sw, d.regeln).slice(1) as z, i (i)}<span class="step" class:gilt={lt.wirkt && lt.spalte === i + 1}
                aria-label="bei {i + 1} {i === 0 ? 'Malstep' : 'Malsteps'}: {z}">{z}</span>{/each}
            {:else}
              {#each malstepSpalten as n (n)}<span></span>{/each}
            {/if}
            <span class="klapppfeil" aria-hidden="true">›</span>
          </button>
          {#if offen}
            <div class="detail">
              {#if schreiben}
                <label class="inline">Rang
                  <select value={e.rang ?? ''} onchange={(ev) => k({ art: 'rang', id: s.id, rang: (ev.target as HTMLSelectElement).value as Rang })}>
                    {#each rangfolge(d.regeln) as r (r)}<option value={r}>{r} ({d.regeln.raenge[r]})</option>{/each}
                  </select></label>
                <div class="zwei">
                  <label class="inline">Positivwürfel <input type="number" inputmode="numeric" min="1" max="10" value={e.wurf?.positiv ?? ''}
                    onchange={(ev) => wurfSetzen(s.id, 'positiv', Number(wert(ev)))} /></label>
                  <label class="inline">Negativwürfel <input type="number" inputmode="numeric" min="1" max="10" value={e.wurf?.negativ ?? ''}
                    onchange={(ev) => wurfSetzen(s.id, 'negativ', Number(wert(ev)))} /></label>
                </div>
              {:else}
                <p>Rang {e.rang} ({e.rang ? d.regeln.raenge[e.rang] : '–'}) · Abweichung {e.wurf ? vorzeichen(e.wurf.positiv - e.wurf.negativ) : '–'}
                  {#if e.wurf}<span class="hinweis">({wurfText(e.wurf)}, {e.wurf.quelle === 'app' ? 'von der App gewürfelt' : 'von Hand'})</span>{/if}</p>
                {#if lt.wirkt}<p class="hinweis">{d.darstellung.herkunft.leiter?.zeichen} {stand > 0 ? 'Adrenalin' : 'Ruhepuls'} wirkt: hervorgehoben ist der Zielwert, der jetzt gilt.</p>{/if}
                {#if modus === 'lesen'}<button class="betont" onclick={() => onprobe(s.id, null)}>Probe auf {mitZeichen('stat', s.id, d)}</button>{/if}
                {#if modus === 'aufstieg' && statrankUpSperre(c, s.id, d) === null}
                  <button class="betont" onclick={() => (rankUp = s.id)}>Statrank-Up ({punkte(d.regeln.aufstieg.statrank_up_kosten)})</button>
                {/if}
              {/if}
              {@render modZeilen(mods)}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
    </div>
  {/each}
</section>

<section class="karte">
  <div class="kopf">
    <h2>Skills</h2>
    <label class="schalter"><input type="checkbox" bind:checked={alleSkills} /> Alle Skills</label>
  </div>
  <ul class="zeilen">
    {#each skillsSichtbar as s (s.id)}
      {@const stufe = c.skills[s.id] ?? 0}
      {@const kalt = eingefroren.has(s.id)}
      {@const mods = modifikatorenAn(c, d, 'skill', s.id)}
      {@const offen = offenSkill === s.id}
      <li id="skill-{s.id}">
        <div class="skill">
          <button class="zeile flach name" aria-expanded={modus === 'lesen' ? undefined : offen}
            onclick={() => (modus === 'lesen' ? onprobe(s.stat, s.id) : (offenSkill = offen ? null : s.id))}>
            <span class="skillname"><Begriff art="skill" name={s.name} darstellung={d.darstellung} />
              {#if kalt}<span class="schloss" title="eingefroren">🔒</span>{/if}</span>
            {#if modus !== 'schreiben'}
              <strong class="wert" class:hand={markiert(`skills.${s.id}`)}>{stufe}<Herkunft quellen={quellenVon(mods, `skills.${s.id}`)} darstellung={d.darstellung} /></strong>
            {/if}
            {#if modus !== 'lesen'}<span class="klapppfeil" aria-hidden="true">›</span>{/if}
          </button>
          {#if schreiben}
            <span class="stepper">
              <button aria-label="{s.name} senken" disabled={stufe <= 0} onclick={() => k({ art: 'skill', id: s.id, stufe: stufe - 1 })}>−</button>
              <strong class:hand={markiert(`skills.${s.id}`)}>{stufe}</strong>
              <button aria-label="{s.name} steigern" disabled={stufe >= d.regeln.aufstieg.skill_max} onclick={() => k({ art: 'skill', id: s.id, stufe: stufe + 1 })}>+</button>
            </span>
          {:else if modus === 'aufstieg' && skillSteigernSperre(c, s.id, d) === null}
            <button class="plus" aria-label="{s.name} auf {stufe + 1} steigern" onclick={() => skillPlus(s.id)}>+</button>
          {/if}
        </div>
        {#if modus === 'aufstieg' && kalt}<p class="hinweis klein">eingefroren: nicht im Zugang von {klasse?.name}</p>{/if}
        {#if offen}
          {@const sw = statwert(c.stats[s.stat], d.regeln)}
          <div class="detail">
            <p>Probe auf {mitZeichen('stat', s.stat, d)}{sw !== null ? ` (${sw})` : ''}{stufe === 0 ? '; mit Stufe 0 kommt 1 Malstep dazu' : `; Stufe ${stufe} gleicht ${stufe === 1 ? '1 Malstep' : `${stufe} Malsteps`} aus`}.</p>
            {#if kalt}<p class="hinweis">Eingefroren: wirkt normal, lässt sich mit {klasse?.name ?? 'dieser Klasse'} aber nicht steigern.</p>{/if}
            {@render modZeilen(mods)}
          </div>
        {/if}
      </li>
    {:else}
      <li class="hinweis">Noch keine Skills.</li>
    {/each}
  </ul>
</section>

<section class="karte">
  <h2>Perks</h2>
  <ul class="zeilen">
    {#each c.perks as id (id)}
      {@const p = d.perks.eintraege.find((x) => x.id === id)}
      {@const offen = offenPerk === id}
      {@const wirkt = perkModifikatoren(id, d)}
      <li id="perk-{id}">
        <button class="zeile flach perk" aria-expanded={offen} onclick={() => (offenPerk = offen ? null : id)}>
          <span><Begriff art="perk" name={perkName(id, d)} darstellung={d.darstellung} />
            <span class="hinweis kurz">{p?.kurz}</span></span>
          {#if modus === 'aufstieg'}<span class="hinweis">Rang {p?.rang}</span>{/if}
          <span class="klapppfeil" aria-hidden="true">›</span>
        </button>
        {#if offen && p}
          <div class="detail">
            <p>{p.wirkung}</p>
            <p class="hinweis">Rang {p.rang} (= Kosten){#if perkVoraussetzungen(c, id, d).length} · Voraussetzung: {perkVoraussetzungen(c, id, d).map((v) => v.art === 'stat' ? `${mitZeichen('stat', v.id, d)} ${v.min}` : mitZeichen('perk', v.id, d)).join(', ')}{/if}</p>
            {#if wirkt.length}
              <p class="wirkt">Wirkt auf:
                {#each wirkt as m, i (i)}
                  {#if springbar(m)}<button class="link flach" onclick={() => springe(m.ziel.art, m.ziel.id!)}>{zielText(m, d)} {wirkungText(m)}</button>
                  {:else}<span>{zielText(m, d)} {wirkungText(m)}</span>{/if}
                {/each}
              </p>
            {/if}
            {#if schreiben}<button class="gefahr" onclick={() => k({ art: 'perk', id, hat: false })}>Perk entfernen</button>{/if}
          </div>
        {/if}
      </li>
    {:else}
      <li class="hinweis">Keine Perks.</li>
    {/each}
  </ul>
  {#if schreiben}
    <div class="hinzu">
      <select bind:value={neuerPerk} aria-label="Perk hinzufügen">
        <option value="">Perk hinzufügen …</option>
        {#each d.perks.eintraege.filter((p) => !c.perks.includes(p.id)) as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
      </select>
      <button disabled={!neuerPerk} onclick={() => { k({ art: 'perk', id: neuerPerk, hat: true }); neuerPerk = ''; }}>Hinzufügen</button>
    </div>
  {/if}
</section>

<Grundwerte {c} {d} {modus} bind:offen={offenGrundwert} onkorrektur={k} onspringe={springe} />

<Anpassungen {c} {d} {modus} onanpassen={anp} onspringe={springe} />

{#if kauf}
  <Bericht titel="Aufstieg" zeilen={kauf.zeilen} weiter="Kaufen" onweiter={kaufBestaetigen} onzurueck={() => (kauf = null)} />
{/if}
{#if rankUp}
  <StatrankUp {d} statId={rankUp} alt={c.stats[rankUp]!} freie={c.freie_punkte} modus={abweichungModus}
    onwurf={(w) => onaendern(statrankUp(c, rankUp!, w, d))} onschliessen={() => (rankUp = null)} />
{/if}

<style>
  .leiste { position: sticky; top: 56px; z-index: 4; text-align: center; padding: 10px; }
  summary { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; }
  summary h2 { margin: 0; font-size: 1.1rem; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: var(--abstand-2) var(--abstand-3); margin: 0; align-items: center; }
  .stamm { padding-top: var(--abstand-2); }
  dt { color: var(--text-2); }
  dd { margin: 0; }
  .zahl { width: 90px; }
  .hintergrund { margin: 0; padding-left: var(--abstand-4); display: flex; flex-direction: column; gap: var(--abstand-1); }
  .kopf { display: flex; justify-content: space-between; align-items: center; }
  .kopf h2 { margin: 0; }

  /* Stat in einer Zeile: Name (mit Rang-Marke) | Statwert groß | Zielwerte bei ▼1 … ▼n, von links nach rechts absteigend.
     Kopfreihe und Zeilen teilen dieselben Spalten, damit die Zahlen untereinander stehen. */
  /* Spaltenbreiten in rem, damit „Decision“ bei 360 Pixel Breite neben fünf Steps passt. */
  .statgitter, .zeile.statgitter { display: grid; grid-template-columns: minmax(0, 1fr) 2.6rem repeat(var(--spalten), 1.6rem) 1rem; align-items: center;
    column-gap: 2px; font-variant-numeric: tabular-nums; }
  .statwert, .step { font-family: var(--schrift-zahl); }
  .stat { padding: var(--abstand-1) 0; }
  .statname { display: flex; align-items: center; flex-wrap: wrap; gap: var(--abstand-1) var(--abstand-2); min-width: 0; hyphens: auto; overflow-wrap: anywhere; }
  /* Rang: kleine umrandete Marke am Namen, sieht anders aus als Werte und Steps. */
  .rang { font-size: 0.75rem; font-weight: 400; line-height: 1; padding: 3px 6px; border: 1px solid var(--text-2); border-radius: 6px; color: var(--text-2); }
  .statwert { font-size: 1.35rem; text-align: right; white-space: nowrap; }
  .step { text-align: right; font-size: 0.85rem; color: var(--text-2); }
  .gilt { outline: 2px solid var(--akzent); outline-offset: 1px; border-radius: 4px; color: var(--text); font-weight: 400; }
  .kopfreihe { font-size: 0.75rem; color: var(--text-2); border-bottom: 1px solid var(--linie); padding-bottom: 2px; }
  .kopfreihe > span { text-align: right; }

  .skill { display: flex; align-items: center; gap: 8px; }
  .skill .name { flex: 1; min-width: 0; }
  .skillname { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; }
  .klein { font-size: 0.8rem; margin: 0 0 var(--abstand-2); }
  .plus { padding: 0; width: 44px; font-size: 1.2rem; }
  .perk { align-items: flex-start; }
  .perk > span:first-child { display: flex; flex-direction: column; }
  .wirkt { display: flex; flex-wrap: wrap; align-items: center; gap: 0 8px; }
  .mods { list-style: none; margin: 0; padding: 0; }
  .mods li { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .zwei { display: grid; grid-template-columns: 1fr 1fr; gap: var(--abstand-3); }
  .hinzu { display: grid; grid-template-columns: 1fr auto; gap: var(--abstand-2); }
</style>
