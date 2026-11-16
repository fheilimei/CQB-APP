<script lang="ts">
  import { untrack } from 'svelte';
  // Erstellung, Schritt 0: Name (Pflicht) und Aussehen (optional) (konzept.md § 3.0).
  interface Props {
    name: string;
    aussehen: string;
    onweiter: (name: string, aussehen: string) => void;
    onzurueck: () => void;
  }
  let props: Props = $props();
  // Startwerte einmalig übernehmen; danach gehört die Eingabe diesem Schritt.
  let name = $state(untrack(() => props.name));
  let aussehen = $state(untrack(() => props.aussehen));
  const fehlt = $derived(name.trim() === '' ? 'Name fehlt' : '');
</script>

<main class="schritt">
  <header><h2>Neuer Charakter</h2><p class="hinweis">Name und Aussehen</p></header>
  <div class="inhalt">
    <label for="name">Name</label>
    <input id="name" bind:value={name} autocomplete="off" enterkeyhint="next" />
    <label for="aussehen">Aussehen <span class="hinweis">(optional)</span></label>
    <textarea id="aussehen" rows="4" bind:value={aussehen}
      placeholder="z. B. Größe, Statur, Gesicht, Kleidung, Merkmale"></textarea>
    <p class="hinweis">Die weiteren Schritte der Erstellung (Klasse, Ränge, Abweichung …) folgen in einer der nächsten Versionen. Der Charakter wird als Entwurf gespeichert.</p>
  </div>
  <footer>
    <button onclick={props.onzurueck}>Zurück</button>
    <button class="haupt" onclick={() => !fehlt && props.onweiter(name.trim(), aussehen.trim())}>{fehlt || 'Weiter'}</button>
  </footer>
</main>

<style>
  .schritt { flex: 1; display: flex; flex-direction: column; }
  header { padding: 16px; }
  h2 { margin: 0; }
  .inhalt { flex: 1; padding: 0 16px; }
  footer { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--linie); background: var(--flaeche); position: sticky; bottom: 0; }
</style>
