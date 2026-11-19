<script lang="ts">
  // Feste Leiste unten im Reiter Laden (konzept.md § 3.14): „Korb · 3 Posten · 610–720 $“. Antippen öffnet den Korb.
  import type { Spieldaten } from '../../daten/typen';
  import { korbRahmen, verkaufRahmen } from '../../regeln/laden';
  import type { Charakter } from '../../speicher/charakter';
  import { geld } from '../texte';
  import { korb, korbFuer } from './korb.svelte';

  let { c, d }: { c: Charakter; d: Spieldaten } = $props();
  $effect.pre(() => korbFuer(c.id));

  const kauf = $derived(korb.art === 'kauf');
  const anzahl = $derived(kauf ? korb.kauf.length : korb.verkauf.length);
  const r = $derived(kauf ? korbRahmen(korb.kauf, d) : verkaufRahmen(c, korb.verkauf, d));
</script>

{#if anzahl}
  <button class="betont korbleiste" aria-expanded={korb.offen} onclick={() => (korb.offen = true)}>
    <span>{kauf ? 'Korb' : 'Verkaufskorb'} · {anzahl} Posten · <span class="zahl">{r.min === r.max ? geld(r.min) : `${r.min.toLocaleString('de-DE')}–${geld(r.max)}`}</span></span>
    <span class="klapppfeil" aria-hidden="true">›</span>
  </button>
{/if}

<style>
  /* Flach und über die ganze Breite; die Reiterleiste schwebt darüber (mit-leiste in App.svelte). */
  .korbleiste { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2);
    border-radius: 0; padding: 0 var(--abstand-3); margin-bottom: env(safe-area-inset-bottom); }
</style>
