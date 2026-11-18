<script lang="ts">
  // Detail zum Rad (konzept.md § 3.7): Steps je Gruppe mit den Stats, Symptome im Volltext, Senken,
  // Verbündete verschieben, Rückgängig.
  import type { Spieldaten } from '../../daten/typen';
  import type { Gefechtsereignis } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';
  import { standText } from '../texte';

  interface Props {
    stand: number;
    d: Spieldaten;
    letzte: Gefechtsereignis | null;
    onsenken: () => void;
    onverschieben: () => void;
    onrueckgaengig: () => void;
    onschliessen: () => void;
  }
  let { stand, d, letzte, onsenken, onverschieben, onrueckgaengig, onschliessen }: Props = $props();

  const stufe = $derived(d.regeln.leiter.stufen[String(stand)]!);
  const gruppen = $derived(
    (['A', 'B', 'C'] as const).map((g) => {
      const wert = g === 'A' ? stufe.gruppe_a : g === 'B' ? stufe.gruppe_b : 0;
      return { g, stats: d.stats.eintraege.filter((s) => s.gruppe === g).map((s) => s.name), wert };
    })
  );
  const steps = (w: number) => (w > 0 ? `▲${w} (${w === 1 ? 'Stepshield' : 'Stepshields'})` : w < 0 ? `▼${-w} (${w === -1 ? 'Malstep' : 'Malsteps'})` : 'keine Steps');
</script>

<Dialog titel={stufe.name ?? 'Adrenalin'}>
  {#if stufe.over_the_edge}
    <p class="warnung">Over the Edge: nur 1 Aktion pro Runde. Nach dem Gefecht folgt ein Adrenalinschock.</p>
  {/if}
  <ul class="gruppen">
    {#each gruppen as x (x.g)}
      <li><span><strong>Gruppe {x.g}</strong> <span class="hinweis">{x.stats.join(', ')}</span></span><span>{steps(x.wert)}</span></li>
    {/each}
  </ul>
  {#if stufe.symptome.length}
    <div class="gruppe">
    <h3 class="abschnitt-titel">Symptome</h3>
    <ul class="symptome">
      {#each stufe.symptome as id (id)}
        {@const s = d.regeln.symptome[id]!}
        {#if !stufe.symptome_nur_verluste}<li>✔ {s.gewinn}</li>{/if}
        <li>✖ {s.verlust}</li>
      {/each}
    </ul>
    </div>
  {:else}
    <p class="hinweis">Bei 0 gibt es keine Steps und keine Symptome.</p>
  {/if}
  <div class="aktionen">
    <button onclick={onsenken}>Senken</button>
    <button onclick={onverschieben}>Verbündete verschieben</button>
    <button disabled={!letzte} onclick={onrueckgaengig}>
      {!letzte ? 'Nichts rückgängig zu machen' : letzte.von === letzte.nach ? 'Rückgängig: Senken' : `Rückgängig: ${standText(letzte.nach, d)} → ${standText(letzte.von, d)}`}
    </button>
  </div>
  {#snippet knoepfe()}
    <button class="betont" onclick={onschliessen}>Schließen</button>
  {/snippet}
</Dialog>

<style>
  .gruppen, .symptome { list-style: none; margin: 0; padding: 0; }
  .gruppen li { display: flex; justify-content: space-between; gap: var(--abstand-2); padding: var(--abstand-2) 0; border-bottom: 1px solid var(--linie); }
  .symptome { display: flex; flex-direction: column; gap: var(--abstand-1); }
  .aktionen { display: flex; flex-direction: column; gap: var(--abstand-2); }
</style>
