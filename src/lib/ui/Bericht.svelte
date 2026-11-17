<script lang="ts">
  // Bericht „Was ist passiert“ (konzept.md § 3.0c): vor jeder Sammeländerung. Erst „Weiter“ übernimmt.
  import Dialog from './Dialog.svelte';
  import type { Zeile } from './texte';
  interface Props { titel: string; zeilen: Zeile[]; weiter?: string; onweiter: () => void; onzurueck: () => void }
  let { titel, zeilen, weiter = 'Weiter', onweiter, onzurueck }: Props = $props();
</script>

<Dialog {titel}>
  {#each zeilen as z, i (i)}
    <p class:fett={z.fett}>{z.text}</p>
  {/each}
  {#snippet knoepfe()}
    <button onclick={onzurueck}>Zurück</button>
    <button class="haupt" onclick={onweiter}>{weiter}</button>
  {/snippet}
</Dialog>

<style>
  p { margin: 0 0 8px; }
  .fett { font-weight: 700; }
</style>
