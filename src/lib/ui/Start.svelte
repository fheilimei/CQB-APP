<script lang="ts">
  import type { Charakter } from '../speicher/charakter';
  // Erster Start ohne Charakter (konzept.md § 3.0g): zwei große Knöpfe.
  interface Props {
    onerstellen: () => void;
    onimportieren: () => void;
    meldung?: string;
    /** Angefangene Erstellungen, die sich fortsetzen lassen. */
    entwuerfe?: Charakter[];
    onfortsetzen?: (id: string) => void;
  }
  let { onerstellen, onimportieren, meldung = '', entwuerfe = [], onfortsetzen }: Props = $props();
</script>

<main class="start">
  <div class="oben">
    <h1>CQB</h1>
    <p class="hinweis">Charakterbogen für den Spieltisch</p>
  </div>
  {#if meldung}<p class="fehler" role="alert">{meldung}</p>{/if}
  <div class="knoepfe">
    {#each entwuerfe as e (e.id)}
      <button class="gross" onclick={() => onfortsetzen?.(e.id)}>Erstellung fortsetzen: {e.name}</button>
    {/each}
    <button class="haupt gross" onclick={onerstellen}>Charakter erstellen</button>
    <button class="gross" onclick={onimportieren}>Charakter importieren</button>
  </div>
</main>

<style>
  .start { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px 16px calc(24px + env(safe-area-inset-bottom)); }
  .oben { margin-top: 20vh; text-align: center; }
  h1 { font-size: 3rem; margin: 0; letter-spacing: 0.1em; }
  .knoepfe { display: flex; flex-direction: column; gap: 12px; }
  .gross { min-height: 64px; font-size: 1.15rem; }
</style>
