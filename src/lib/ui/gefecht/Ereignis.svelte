<script lang="ts">
  // Knopf Ereignis neben der Figur (konzept.md § 3.7a, § 3.10): setzt einen Auslöser für das Rundenende, ohne Treffer.
  // Ein Tipp auf einen Eintrag setzt ihn sofort (nur ein Wert ändert sich, daher kein Bericht); die Meldung danach bietet Rückgängig.
  import type { Spieldaten } from '../../daten/typen';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { ausloeserSetzen } from '../../regeln/wunden';
  import type { Charakter } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    onfertig: (c: Charakter, text: string) => void;
    onabbrechen: () => void;
  }
  let { c, d, onfertig, onabbrechen }: Props = $props();

  const gesetzt = $derived(gefechtVon(c)?.ausloeser_diese_runde ?? []);
</script>

<Dialog titel="Ereignis">
  <div class="gruppe">
    <span class="gruppe-titel">Was passiert?</span>
    <ul class="auswahlliste">
      {#each d.regeln.ereignis as e (e.ausloeser)}
        {@const schon = gesetzt.includes(e.ausloeser)}
        <li>
          <button disabled={schon} onclick={() => onfertig(ausloeserSetzen(c, [e.ausloeser]), `${e.name} zählt am Rundenende.`)}>
            {e.name}
            <small>{schon ? 'Zählt in dieser Runde schon.' : e.hinweis}</small>
          </button>
        </li>
      {/each}
    </ul>
  </div>
  <p class="hinweis">Wirst du getroffen oder explodiert etwas in deiner Nähe, nimm Getroffen. Das zählt „beschossen“ mit.</p>

  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Zurück</button>
  {/snippet}
</Dialog>
