<script lang="ts">
  // Herkunftsmarkierung oben rechts am Wert (konzept.md § 3.0b): ein Zeichen je Quelle, aus darstellung.json.
  import type { Darstellung } from '../daten/typen';
  interface Props { quellen: string[]; darstellung: Darstellung }
  let { quellen, darstellung }: Props = $props();
  const zeichen = $derived([...new Set(quellen)].map((q) => darstellung.herkunft[q]).filter((h) => !!h));
</script>

{#if zeichen.length}
  <sup class="herkunft">{#each zeichen as h (h.name)}<span style:color={h.farbe} title={h.name}>{h.zeichen}</span><span class="sr">{h.name} </span>{/each}</sup>
{/if}

<style>
  .herkunft { font-size: 0.7em; margin-left: 2px; letter-spacing: 1px; }
  :global(:root[data-theme='dunkel']) .herkunft span { filter: brightness(1.6); }
  @media (prefers-color-scheme: dark) { :global(:root:not([data-theme='hell'])) .herkunft span { filter: brightness(1.6); } }
</style>
