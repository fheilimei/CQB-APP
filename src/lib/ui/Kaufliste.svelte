<script lang="ts">
  // „Jetzt möglich“ (konzept.md § 3.0a): alles, was bezahlbar ist und dessen Voraussetzungen erfüllt sind.
  // Gemeinsam für den Aufstiegsmodus und Schritt 5 der Erstellung.
  import type { Spieldaten } from '../daten/typen';
  import type { Moeglichkeit } from '../regeln/aufstieg';
  import { naechsterRang, statwert } from '../regeln/probe';
  import type { Charakter } from '../speicher/charakter';
  import Begriff from './Begriff.svelte';
  import { perkName, punkte, skillName, sperreText, statName } from './texte';

  interface Props { c: Charakter; d: Spieldaten; liste: Moeglichkeit[]; onkaufen: (m: Moeglichkeit) => void }
  let { c, d, liste, onkaufen }: Props = $props();
  let inReichweite = $state(false);

  const sichtbar = $derived(liste.filter((m) => m.sperre === null || (inReichweite && m.sperre === 'punkte')));
  const gruppen = $derived([
    { titel: 'Skills', art: 'skill' as const, eintraege: sichtbar.filter((m) => m.art === 'skill') },
    { titel: 'Statrank-Ups', art: 'statrank_up' as const, eintraege: sichtbar.filter((m) => m.art === 'statrank_up') },
    { titel: 'Perks', art: 'perk' as const, eintraege: sichtbar.filter((m) => m.art === 'perk') }
  ]);

  function was(m: Moeglichkeit): string {
    if (m.art === 'skill') return `${c.skills[m.id] ?? 0} → ${(c.skills[m.id] ?? 0) + 1}`;
    if (m.art === 'statrank_up') {
      const r = c.stats[m.id]?.rang;
      return r ? `${r} → ${naechsterRang(r, d.regeln)}` : '';
    }
    return d.perks.eintraege.find((p) => p.id === m.id)?.kurz ?? '';
  }
  const name = (m: Moeglichkeit) => (m.art === 'skill' ? skillName(m.id, d) : m.art === 'perk' ? perkName(m.id, d) : statName(m.id, d));
  const typ = (m: Moeglichkeit) => (m.art === 'statrank_up' ? 'stat' : m.art);
  const hinweis = (m: Moeglichkeit) =>
    sperreText(m.sperre, m.kosten, m.id, c.freie_punkte, d, (id) => statwert(c.stats[id], d.regeln), (id) => c.perks.includes(id));
</script>

<section class="kaufliste stapel">
  <div class="kopf">
    <h3>Jetzt möglich</h3>
    <label class="schalter"><input type="checkbox" bind:checked={inReichweite} /> in Reichweite</label>
  </div>
  {#if sichtbar.length === 0}
    <p class="hinweis">Mit {punkte(c.freie_punkte)} ist gerade nichts möglich.</p>
  {/if}
  {#each gruppen as g (g.art)}
    {#if g.eintraege.length}
      <div class="gruppe">
      <h4 class="gruppe-titel">{g.titel}</h4>
      <ul>
        {#each g.eintraege as m (m.art + m.id)}
          <li>
            <button class="zeile" disabled={m.sperre !== null} onclick={() => onkaufen(m)}>
              <span class="links">
                <Begriff art={typ(m)} name={name(m)} darstellung={d.darstellung} />
                <span class="hinweis">{m.sperre ? hinweis(m) : was(m)}</span>
              </span>
              <span class="kosten">{punkte(m.kosten)}</span>
            </button>
          </li>
        {/each}
      </ul>
      </div>
    {/if}
  {/each}
</section>

<style>
  .kopf { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); }
  h3 { margin: 0; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--abstand-2); }
  .zeile { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-3); text-align: left; padding: var(--abstand-2) var(--abstand-3); }
  .links { display: flex; flex-direction: column; min-width: 0; }
  .links .hinweis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .kosten { white-space: nowrap; font-weight: 600; }
</style>
