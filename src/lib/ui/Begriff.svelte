<script lang="ts">
  // Name eines Stats, Skills oder Perks mit Zeichen und Farbe aus darstellung.json (konzept.md § 2, Texte).
  import type { Darstellung } from '../daten/typen';
  interface Props { art: 'stat' | 'skill' | 'perk'; name: string; darstellung: Darstellung }
  let { art, name, darstellung }: Props = $props();
  const t = $derived(darstellung.typen[art]);
</script>

<span class="begriff"><span class="zeichen" style:color={t.farbe} title={t.name} aria-hidden="true">{t.zeichen}</span><span class="sr">{t.name} </span>{name}</span>

<style>
  .begriff { white-space: nowrap; }
  .zeichen { margin-right: 0.3em; }
  :global(:root[data-theme='dunkel']) .zeichen { filter: brightness(1.7); }
  @media (prefers-color-scheme: dark) { :global(:root:not([data-theme='hell'])) .zeichen { filter: brightness(1.7); } }
</style>
