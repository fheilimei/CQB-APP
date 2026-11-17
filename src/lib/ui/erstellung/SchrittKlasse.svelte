<script lang="ts">
  // Schritt 1: Name, Aussehen und Klasse (konzept.md § 3.0, Schritte 0 und 1).
  import { untrack } from 'svelte';
  import type { Spieldaten } from '../../daten/typen';
  import { klasseWaehlen, rankSetDer, rankSetFuer, raengePassen, stufe4Optionen } from '../../regeln/erstellung';
  import type { Charakter } from '../../speicher/charakter';
  import { geld, laufbahnName, punkte, stufeName } from '../texte';

  interface Props { c: Charakter; d: Spieldaten }
  let { c = $bindable(), d }: Props = $props();
  const e = $derived(c.erstellung!);
  const gewaehlt = $derived(e.ohne_klasse ? null : d.klassen.eintraege.find((k) => k.id === e.klasse) ?? null);

  let laufbahn = $state<string | null>(untrack(() => (c.erstellung!.ohne_klasse ? 'ohne' : d.klassen.eintraege.find((k) => k.id === c.erstellung!.klasse)?.laufbahn ?? null)));
  const klassen = $derived(d.klassen.eintraege.filter((k) => k.laufbahn === laufbahn).sort((a, b) => a.stufe - b.stufe));

  function waehle(id: string | null) {
    const set = id ? rankSetDer(id, d) : null;
    const vergeben = Object.values(c.stats).some((s) => s.rang);
    if (set && vergeben && !raengePassen(c, set) &&
      !confirm('Die verteilten Ränge passen nicht zum Rank-Set dieser Stufe und werden zurückgesetzt. Die Würfe der Abweichung bleiben. Fortfahren?')) return;
    c = klasseWaehlen(c, id, d);
  }
  function waehleLaufbahn(id: string) {
    laufbahn = id;
    if (id === 'ohne') waehle(null);
  }
</script>

<label for="name">Name</label>
<input id="name" bind:value={c.name} autocomplete="off" enterkeyhint="next" />
<label for="aussehen">Aussehen <span class="hinweis">(optional)</span></label>
<textarea id="aussehen" rows="3" bind:value={c.aussehen} placeholder="z. B. Größe, Statur, Gesicht, Kleidung, Merkmale"></textarea>

<h3>Laufbahn</h3>
<div class="wahl" role="group" aria-label="Laufbahn">
  {#each d.klassen.laufbahnen as l (l.id)}
    <button aria-pressed={laufbahn === l.id} onclick={() => waehleLaufbahn(l.id)}>{l.name}</button>
  {/each}
  <button aria-pressed={laufbahn === 'ohne'} onclick={() => waehleLaufbahn('ohne')}>ohne Klasse</button>
</div>

{#if laufbahn === 'ohne'}
  <p class="hinweis">Freie Erstellung, z. B. für Tests: Ränge und Vorratslevel setzt du von Hand, ohne Prüfung gegen ein Rank-Set. Alle Skills und Perks sind zugänglich.</p>
  <label for="vorrat">Vorratslevel</label>
  <input id="vorrat" type="number" inputmode="numeric" min="1" max="5"
    value={c.vorratslevel_manuell ?? ''} oninput={(ev) => (c.vorratslevel_manuell = Number((ev.target as HTMLInputElement).value) || null)} />
  <label for="punkte">Freie Punkte zu Beginn</label>
  <input id="punkte" type="number" inputmode="numeric" min="0" bind:value={c.erstellung!.freie_punkte_start} />
{:else if laufbahn}
  <h3>Klasse</h3>
  <ul class="klassen">
    {#each klassen as k (k.id)}
      <li>
        <button class="zeile" aria-pressed={gewaehlt?.id === k.id} onclick={() => waehle(k.id)}>
          <strong>{k.name}</strong>
          <span class="hinweis">{stufeName(k.stufe, d)} · Stufe {k.stufe}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

{#if gewaehlt}
  <section class="karte detail">
    <h3>{gewaehlt.name}</h3>
    <p>{gewaehlt.beschreibung}</p>
    <dl>
      <dt>Laufbahn</dt><dd>{laufbahnName(gewaehlt.laufbahn, d)}, {stufeName(gewaehlt.stufe, d)}</dd>
      <dt>Rank-Set</dt><dd>{rankSetFuer(e, d)?.join(', ')}</dd>
      <dt>Vorratslevel</dt><dd>{gewaehlt.vorratslevel}</dd>
      <dt>Gehalt</dt><dd>{geld(gewaehlt.gehalt)} pro Auftrag (nur mit Vertrag)</dd>
      <dt>Freie Punkte</dt><dd>{punkte(gewaehlt.freie_punkte_start)}</dd>
    </dl>
    {#if gewaehlt.art === 'meister'}
      <h4>Stufe-4-Klasse, aus der du kommst</h4>
      <div class="wahl spalte" role="group" aria-label="Stufe-4-Klasse">
        {#each stufe4Optionen(gewaehlt.id, d) as s4 (s4.id)}
          <button aria-pressed={e.stufe4 === s4.id}
            onclick={() => (c.erstellung = { ...c.erstellung!, stufe4: s4.id, meister_skills: [] })}>{s4.name}</button>
        {/each}
      </div>
      <p class="hinweis">Ihre Mindestskills gelten. Dein Weg: ihre Spezialisierung → sie → {gewaehlt.name}.</p>
    {:else if gewaehlt.art === 'erweiterte_form'}
      <p class="hinweis">Dein Weg: {d.klassen.eintraege.find((k) => k.id === gewaehlt.erweitert)?.name} → {gewaehlt.name}.</p>
    {/if}
  </section>
{/if}

<style>
  h3 { margin: 20px 0 8px; }
  .wahl { display: flex; flex-wrap: wrap; gap: 8px; }
  .wahl.spalte { flex-direction: column; }
  .klassen { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .zeile { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; text-align: left; }
  .detail { margin-top: 16px; }
  .detail h3 { margin-top: 0; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; }
  dt { color: var(--text-2); }
  dd { margin: 0; }
</style>
