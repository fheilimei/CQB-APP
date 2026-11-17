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
  h2 { margin: 0; padding: var(--abstand-3) var(--abstand-3) var(--abstand-2); font-size: 1.2rem; }
  /* Einheitliche Abstände in allen Dialogen: Abstand am Behälter, keine eigenen Ränder der Kinder. */
  .inhalt { overflow-y: auto; padding: var(--abstand-2) var(--abstand-3) var(--abstand-3); display: flex; flex-direction: column; gap: var(--abstand-3); }
  .inhalt > :global(*) { margin: 0; flex-shrink: 0; }
  .knoepfe { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: var(--abstand-3);
    padding: var(--abstand-3) var(--abstand-3) calc(var(--abstand-3) + env(safe-area-inset-bottom)); border-top: 1px solid var(--linie); }
</style>
