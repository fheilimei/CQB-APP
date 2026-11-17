<script lang="ts">
  // Reiter Werte (konzept.md § Aufbau der App, § 3.1–3.5) mit den Modi Lesen, Aufstieg und Schreiben (§ 3.0a).
  // Lesen: alles gesperrt. Aufstieg: Kaufen gegen freie Punkte, mit Bericht. Schreiben: direkt ändern, ohne Prüfung.
  import type { Rang, Spieldaten } from '../daten/typen';
  import {
    aktuelleKlasse, eingefroreneSkills, moeglichkeiten, perkKaufen, perkVoraussetzungen, skillSteigern,
    skillSteigernSperre, statrankUp, statrankUpSperre, vorratslevel, type Moeglichkeit
  } from '../regeln/aufstieg';
  import { korrigiere, type Korrektur } from '../regeln/korrektur';
  import { rangfolge, statwert } from '../regeln/probe';
  import type { Charakter, Quelle } from '../speicher/charakter';
  import Begriff from './Begriff.svelte';
  import Bericht from './Bericht.svelte';
  import Kaufliste from './Kaufliste.svelte';
  import StatrankUp from './StatrankUp.svelte';
  import { geld, klasseName, laufbahnName, mitZeichen, perkName, punkte, skillName, stufeName, vorzeichen, wurfText, type Modus, type Zeile } from './texte';

  interface Props { c: Charakter; d: Spieldaten; modus: Modus; abweichungModus: Quelle; onaendern: (c: Charakter) => void }
  let { c, d, modus, abweichungModus, onaendern }: Props = $props();

  const klasse = $derived.by(() => { const id = aktuelleKlasse(c); return id ? d.klassen.eintraege.find((k) => k.id === id) ?? null : null; });
  const eingefroren = $derived(new Set(eingefroreneSkills(c, d)));
  const liste = $derived(modus === 'aufstieg' ? moeglichkeiten(c, d) : []);
  const markiert = (pfad: string) => c.ueberschrieben.includes(pfad);

  let offenStat = $state<string | null>(null);
  let offenPerk = $state<string | null>(null);
  let alleSkills = $state(false);
  let rankUp = $state<string | null>(null);
  let kauf = $state<{ m: Moeglichkeit; zeilen: Zeile[] } | null>(null);
  let neuerPerk = $state('');

  const skillsSichtbar = $derived(d.skills.eintraege.filter((s) => alleSkills || (c.skills[s.id] ?? 0) > 0));

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
  function wurfSetzen(id: string, feld: 'positiv' | 'negativ', wert: number) {
    const alt = c.stats[id]!.wurf ?? { positiv: 5, negativ: 5, quelle: 'hand' as const };
    if (!Number.isInteger(wert) || wert < 1 || wert > 10) return;
    k({ art: 'wurf', id, wurf: { ...alt, [feld]: wert } });
  }
</script>

{#if modus === 'aufstieg'}
  <div class="leiste karte" aria-live="polite"><strong>{punkte(c.freie_punkte)} frei</strong></div>
{/if}

<section class="karte">
  <details>
    <summary><h2>Stammdaten</h2></summary>
    <dl>
      <dt>Klasse</dt><dd>{klasse ? klasse.name : 'ohne Klasse'}</dd>
      {#if klasse}
        <dt>Weg</dt><dd>{c.klassenweg.map((w) => klasseName(w.klasse, d)).join(' → ')}</dd>
        <dt>Laufbahn</dt><dd>{laufbahnName(klasse.laufbahn, d)}</dd>
        <dt>Stufe</dt><dd>{klasse.stufe} ({stufeName(klasse.stufe, d)})</dd>
        <dt>Gehalt</dt><dd>{geld(klasse.gehalt)} pro Auftrag{c.hintergrund.vertrag ? '' : ' (kein Vertrag)'}</dd>
      {/if}
      <dt>Vorratslevel</dt>
      <dd class:hand={markiert('vorratslevel')}>
        {#if modus === 'schreiben'}
          <input class="zahl" type="number" inputmode="numeric" min="1" max="5" value={vorratslevel(c, d) ?? ''}
            onchange={(e) => k({ art: 'vorratslevel', wert: Number((e.target as HTMLInputElement).value) || null })} />
        {:else}{vorratslevel(c, d) ?? '–'}{/if}
      </dd>
      <dt>Freie Punkte</dt>
      <dd class:hand={markiert('freie_punkte')}>
        {#if modus === 'schreiben'}
          <span class="stepper">
            <button aria-label="einen Punkt weniger" onclick={() => k({ art: 'freie_punkte', wert: c.freie_punkte - 1 })}>−</button>
            <strong>{c.freie_punkte}</strong>
            <button aria-label="einen Punkt mehr" onclick={() => k({ art: 'freie_punkte', wert: c.freie_punkte + 1 })}>+</button>
          </span>
        {:else}{c.freie_punkte}{/if}
      </dd>
    </dl>
    {#if c.aussehen}<p class="hinweis">{c.aussehen}</p>{/if}
  </details>
</section>

{#if modus === 'aufstieg'}
  <section class="karte"><Kaufliste {c} {d} {liste} onkaufen={kaufen} /></section>
{/if}

<section class="karte">
  <h2>Stats</h2>
  <ul class="zeilen">
    {#each d.stats.eintraege as s (s.id)}
      {@const e = c.stats[s.id]!}
      {@const offen = offenStat === s.id}
      <li>
        <button class="zeile flach" aria-expanded={offen} onclick={() => (offenStat = offen ? null : s.id)}>
          <Begriff art="stat" name={s.name} darstellung={d.darstellung} />
          <span class="werte"><span class="hinweis">{e.rang}</span><strong class="wert" class:hand={markiert(`stats.${s.id}`)}>{statwert(e, d.regeln) ?? '–'}</strong></span>
        </button>
        {#if offen}
          <div class="detail">
            {#if modus === 'schreiben'}
              <label class="inline">Rang
                <select value={e.rang ?? ''} onchange={(ev) => k({ art: 'rang', id: s.id, rang: (ev.target as HTMLSelectElement).value as Rang })}>
                  {#each rangfolge(d.regeln) as r (r)}<option value={r}>{r} ({d.regeln.raenge[r]})</option>{/each}
                </select></label>
              <div class="zwei">
                <label class="inline">Positivwürfel <input type="number" inputmode="numeric" min="1" max="10" value={e.wurf?.positiv ?? ''}
                  onchange={(ev) => wurfSetzen(s.id, 'positiv', Number((ev.target as HTMLInputElement).value))} /></label>
                <label class="inline">Negativwürfel <input type="number" inputmode="numeric" min="1" max="10" value={e.wurf?.negativ ?? ''}
                  onchange={(ev) => wurfSetzen(s.id, 'negativ', Number((ev.target as HTMLInputElement).value))} /></label>
              </div>
            {:else}
              <p>Rang {e.rang} ({e.rang ? d.regeln.raenge[e.rang] : '–'}) · Abweichung {e.wurf ? vorzeichen(e.wurf.positiv - e.wurf.negativ) : '–'}
                {#if e.wurf}<span class="hinweis">({wurfText(e.wurf)}, {e.wurf.quelle === 'app' ? 'von der App gewürfelt' : 'von Hand'})</span>{/if}</p>
              {#if modus === 'aufstieg' && statrankUpSperre(c, s.id, d) === null}
                <button class="haupt" onclick={() => (rankUp = s.id)}>Statrank-Up ({punkte(d.regeln.aufstieg.statrank_up_kosten)})</button>
              {/if}
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
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
      <li class="zeile skill">
        <span class="name"><Begriff art="skill" name={s.name} darstellung={d.darstellung} />
          {#if kalt}<span class="schloss" title="eingefroren">🔒</span>{/if}
          {#if modus === 'aufstieg' && kalt}<span class="hinweis klein">eingefroren: nicht im Zugang von {klasse?.name}</span>{/if}</span>
        <span class="werte">
          {#if modus === 'schreiben'}
            <span class="stepper">
              <button aria-label="{s.name} senken" disabled={stufe <= 0} onclick={() => k({ art: 'skill', id: s.id, stufe: stufe - 1 })}>−</button>
              <strong class:hand={markiert(`skills.${s.id}`)}>{stufe}</strong>
              <button aria-label="{s.name} steigern" disabled={stufe >= d.regeln.aufstieg.skill_max} onclick={() => k({ art: 'skill', id: s.id, stufe: stufe + 1 })}>+</button>
            </span>
          {:else}
            <strong class="wert" class:hand={markiert(`skills.${s.id}`)}>{stufe}</strong>
            {#if modus === 'aufstieg' && skillSteigernSperre(c, s.id, d) === null}
              <button class="plus" aria-label="{s.name} auf {stufe + 1} steigern" onclick={() => skillPlus(s.id)}>+</button>
            {/if}
          {/if}
        </span>
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
      <li>
        <button class="zeile flach perk" aria-expanded={offen} onclick={() => (offenPerk = offen ? null : id)}>
          <span><Begriff art="perk" name={perkName(id, d)} darstellung={d.darstellung} />
            <span class="hinweis kurz">{p?.kurz}</span></span>
          {#if modus === 'aufstieg'}<span class="hinweis">Rang {p?.rang}</span>{/if}
        </button>
        {#if offen && p}
          <div class="detail">
            <p>{p.wirkung}</p>
            <p class="hinweis">Rang {p.rang} (= Kosten){#if perkVoraussetzungen(c, id, d).length} · Voraussetzung: {perkVoraussetzungen(c, id, d).map((v) => v.art === 'stat' ? `${mitZeichen('stat', v.id, d)} ${v.min}` : mitZeichen('perk', v.id, d)).join(', ')}{/if}</p>
            {#if modus === 'schreiben'}<button class="gefahr" onclick={() => k({ art: 'perk', id, hat: false })}>Perk entfernen</button>{/if}
          </div>
        {/if}
      </li>
    {:else}
      <li class="hinweis">Keine Perks.</li>
    {/each}
  </ul>
  {#if modus === 'schreiben'}
    <div class="hinzu">
      <select bind:value={neuerPerk} aria-label="Perk hinzufügen">
        <option value="">Perk hinzufügen …</option>
        {#each d.perks.eintraege.filter((p) => !c.perks.includes(p.id)) as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
      </select>
      <button disabled={!neuerPerk} onclick={() => { k({ art: 'perk', id: neuerPerk, hat: true }); neuerPerk = ''; }}>Hinzufügen</button>
    </div>
  {/if}
</section>

{#if kauf}
  <Bericht titel="Aufstieg" zeilen={kauf.zeilen} weiter="Kaufen" onweiter={kaufBestaetigen} onzurueck={() => (kauf = null)} />
{/if}
{#if rankUp}
  <StatrankUp {d} statId={rankUp} alt={c.stats[rankUp]!} freie={c.freie_punkte} modus={abweichungModus}
    onwurf={(w) => onaendern(statrankUp(c, rankUp!, w, d))} onschliessen={() => (rankUp = null)} />
{/if}

<style>
  .leiste { position: sticky; top: 56px; z-index: 4; text-align: center; padding: 10px; }
  h2 { margin: 0 0 8px; font-size: 1.1rem; }
  summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; }
  summary h2 { margin: 0; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 8px 0 0; align-items: center; }
  dt { color: var(--text-2); }
  dd { margin: 0; }
  .zahl { width: 90px; }
  .kopf { display: flex; justify-content: space-between; align-items: center; }
  .kopf h2 { margin: 0; }
  .schalter { display: flex; align-items: center; gap: 8px; margin: 0; font-weight: 400; min-height: 44px; }
  .schalter input { width: 22px; height: 22px; min-height: 0; }
  .zeilen { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .zeilen > li { border-top: 1px solid var(--linie); }
  .zeilen > li:first-child { border-top: none; }
  .zeile { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; text-align: left; padding: 4px 0; min-height: 48px; border-radius: 0; }
  .skill .name { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; }
  .klein { font-size: 0.8rem; width: 100%; }
  .perk { align-items: flex-start; }
  .perk > span:first-child { display: flex; flex-direction: column; }
  .werte { display: flex; align-items: center; gap: 12px; }
  .wert { font-size: 1.15rem; min-width: 1.6em; text-align: right; }
  .hand { outline: 2px dashed var(--text-2); outline-offset: 2px; border-radius: 4px; }
  .detail { padding: 0 0 12px; }
  .detail p { margin: 4px 0 8px; }
  .inline { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; font-weight: 400; }
  .zwei { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .stepper { display: inline-flex; align-items: center; gap: 8px; }
  .stepper strong { min-width: 1.4em; text-align: center; }
  .stepper button, .plus { padding: 0; width: 44px; font-size: 1.2rem; }
  .hinzu { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 12px; }
</style>
