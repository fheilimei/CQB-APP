<script lang="ts">
  // Dialog über dem aktuellen Reiter; auf dem Handy bildschirmfüllend, Knöpfe unten im Daumenbereich.
  import type { Snippet } from 'svelte';
  interface Props { titel: string; children: Snippet; knoepfe: Snippet }
  let { titel, children, knoepfe }: Props = $props();
</script>

<div class="schleier" role="presentation"></div>
<div class="dialog" role="dialog" aria-modal="true" aria-label={titel}>
  <h2>{titel}</h2>
  <div class="inhalt">{@render children()}</div>
  <div class="knoepfe">{@render knoepfe()}</div>
</div>

<style>
  .schleier { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); z-index: 40; }
  .dialog { position: fixed; left: 0; right: 0; bottom: 0; max-height: 92vh; z-index: 41; display: flex; flex-direction: column;
    background: var(--flaeche); border-radius: var(--radius) var(--radius) 0 0; border-top: 1px solid var(--linie); }
  @media (min-width: 640px) { .dialog { left: 50%; width: 560px; transform: translateX(-50%); bottom: 24px; border-radius: var(--radius); border: 1px solid var(--linie); } }
  h2 { margin: 0; padding: 16px 16px 8px; font-size: 1.2rem; }
  .inhalt { overflow-y: auto; padding: 0 16px 8px; }
  .knoepfe { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 12px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--linie); }
</style>
