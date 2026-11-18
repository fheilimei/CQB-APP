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
    /** Öffnet das Fenster Reizgas (Zustand Gereizt). */
    onreizgas: () => void;
    onabbrechen: () => void;
  }
  let { c, d, onfertig, onreizgas, onabbrechen }: Props = $props();

  const gesetzt = $derived(gefechtVon(c)?.ausloeser_diese_runde ?? []);
  /** Meldung nach dem Tipp; heißt der Eintrag anders als sein Auslöser (Explosion → beschossen), nennt sie den Auslöser. */
  function text(e: Spieldaten['regeln']['ereignis'][number]): string {
    const name = d.regeln.leiter.ausloeser.find((a) => a.id === e.ausloeser)?.name ?? e.ausloeser;
    return e.name.toLowerCase() === name.toLowerCase() ? `${e.name} zählt am Rundenende.` : `${e.name} zählt am Rundenende als ${name}.`;
  }
</script>

<Dialog titel="Ereignis">
  <div class="gruppe">
    <span class="gruppe-titel">Was passiert?</span>
    <ul class="auswahlliste">
      <!-- Explosion in der Nähe setzt denselben Auslöser wie Beschossen (Sprengwirkung, Adrenalin); zählt er schon, sind beide grau. -->
      {#each d.regeln.ereignis as e (e.id)}
        {@const schon = gesetzt.includes(e.ausloeser)}
        <li>
          <button disabled={schon} onclick={() => onfertig(ausloeserSetzen(c, [e.ausloeser]), text(e))}>
            {e.name}
            <small>{schon ? 'Zählt in dieser Runde schon.' : e.hinweis}</small>
          </button>
        </li>
      {/each}
    </ul>
  </div>
  <div class="gruppe">
    <span class="gruppe-titel">Zustand</span>
    <ul class="auswahlliste">
      <li><button onclick={onreizgas}>Reizgas<small>Du stehst in einer Gaswolke: Grit-Probe, sonst gereizt.</small></button></li>
    </ul>
  </div>
  <p class="hinweis">Wirst du getroffen, auch von Splittern oder der Druckwelle, nimm Getroffen. Das zählt „beschossen“ mit.</p>

  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Zurück</button>
  {/snippet}
</Dialog>
