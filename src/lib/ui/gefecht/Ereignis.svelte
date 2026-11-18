<script lang="ts">
  // Knopf Ereignis neben der Figur (konzept.md § 3.7a, § 3.10): setzt einen Auslöser für das Rundenende, ohne Treffer.
  // Ein Tipp auf einen Eintrag setzt ihn sofort (nur ein Wert ändert sich, daher kein Bericht); die Meldung danach bietet Rückgängig.
  // Darunter Schalter für Geblendet (mit Runden) und Gereizt: wirken sofort, das Fenster bleibt offen; Ausschalten nimmt es zurück.
  import type { Spieldaten } from '../../daten/typen';
  import { geblendetGenau, reizgasSetzen } from '../../regeln/gefecht';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { geblendetRunden, istGereizt } from '../../regeln/zustaende';
  import { ausloeserSetzen } from '../../regeln/wunden';
  import type { Charakter } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    onfertig: (c: Charakter, text: string) => void;
    /** Schalter Geblendet und Gereizt: ändern sofort, ohne das Fenster zu schließen. */
    onaendern: (c: Charakter) => void;
    /** Öffnet das Fenster Reizgas (Zustand Gereizt). */
    onreizgas: () => void;
    onabbrechen: () => void;
  }
  let { c, d, onfertig, onaendern, onreizgas, onabbrechen }: Props = $props();

  const g = $derived(gefechtVon(c));
  const gesetzt = $derived(g?.ausloeser_diese_runde ?? []);
  const geblendet = $derived(geblendetRunden(g));
  const gereizt = $derived(istGereizt(g));
  const malsteps = $derived(d.regeln.zustaende.gereizt.malsteps);

  function gereiztSchalten(an: boolean) {
    // Von Hand gereizt: in der Wolke, bis du sie verlässt (Fenster Reizgas). Ausschalten nimmt Reizgas ganz weg.
    const r = g?.reizgas;
    onaendern(reizgasSetzen(c, an ? { in_wolke: r?.in_wolke ?? true, gereizt: true, gasmaske: r?.gasmaske ?? false }
      : { in_wolke: false, gereizt: false, gasmaske: false }));
  }
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
    <label class="schalter"><input type="checkbox" checked={geblendet > 0}
      onchange={(e) => onaendern(geblendetGenau(c, e.currentTarget.checked ? 1 : 0))} /> Du bist geblendet</label>
    {#if geblendet > 0}
      <div class="zeile-stepper">
        <span>Noch</span>
        <span class="stepper">
          <button aria-label="Eine Runde weniger" onclick={() => onaendern(geblendetGenau(c, geblendet - 1))}>−</button>
          <strong>{geblendet}</strong>
          <button aria-label="Eine Runde mehr" onclick={() => onaendern(geblendetGenau(c, geblendet + 1))}>+</button>
        </span>
        <span>{geblendet === 1 ? 'Runde, diese eingeschlossen' : 'Runden, diese eingeschlossen'}</span>
      </div>
      <p class="hinweis">Du siehst nichts (Sichtstufe keine). Am Rundenende zählt es herunter.</p>
    {/if}
    <label class="schalter"><input type="checkbox" checked={gereizt}
      onchange={(e) => gereiztSchalten(e.currentTarget.checked)} /> Du bist gereizt</label>
    {#if gereizt}<p class="hinweis">{malsteps} Malsteps auf alle Proben. Verlässt du die Wolke, trag es unter Reizgas ein; dann endet es am Ende der Runde.</p>{/if}
    <ul class="auswahlliste">
      <li><button onclick={onreizgas}>Reizgas<small>Wolke, Gasmaske und Grit-Probe zu Beginn deines Zuges.</small></button></li>
    </ul>
  </div>
  <p class="hinweis">Wirst du getroffen, auch von Splittern oder der Druckwelle, nimm Getroffen. Das zählt „beschossen“ mit.</p>

  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Fertig</button>
  {/snippet}
</Dialog>

<style>
  .zeile-stepper { display: flex; align-items: center; flex-wrap: wrap; gap: var(--abstand-2); }
</style>
