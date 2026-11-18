<script lang="ts">
  // Reizgas im Gefecht (konzept.md § 3.11; Regelwerk: Sprengwirkung, Reizgas). Wer zu Beginn seines Zuges in der Wolke steht,
  // legt eine Grit-Probe ab; misslingt sie, ist er Gereizt. Gereizt hält an, solange er in der Wolke steht, und endet am Ende
  // der Runde, in der er sie verlässt. Mit Gasmaske keine Probe. Geöffnet über Ereignis → Reizgas oder den Zustand oben.
  // Es ändert sich nur der Zustand Reizgas; kein Bericht nötig.
  import { untrack } from 'svelte';
  import type { Spieldaten } from '../../daten/typen';
  import { reizgasSetzen } from '../../regeln/gefecht';
  import { gefechtVon } from '../../regeln/probenrechner';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, wuerfelModus, onaendern, onfertig, onabbrechen }: Props = $props();

  const alt = untrack(() => gefechtVon(c)?.reizgas ?? null);
  let inWolke = $state(alt?.in_wolke ?? true);
  let gasmaske = $state(alt?.gasmaske ?? false);
  let ergebnis = $state<ProbenErgebnis | null>(null);

  const schonGereizt = $derived(!!alt?.gereizt);
  const probeNoetig = $derived(inWolke && !gasmaske && !schonGereizt);
  const misslungen = $derived(probeNoetig && ergebnis?.stufe === 'misserfolg');
  const gereizt = $derived(schonGereizt || misslungen);
  const malsteps = $derived(d.regeln.zustaende.gereizt.malsteps);
</script>

<Dialog titel="Reizgas">
  <div class="abschnitte">
    <section class="abschnitt">
      <h3 class="abschnitt-titel">Wo bist du?</h3>
      <div class="gruppe">
        <span class="gruppe-titel">Du stehst</span>
        <div class="umschalter" role="group" aria-label="Du stehst">
          <button aria-pressed={inWolke} onclick={() => (inWolke = true)}>in der Wolke</button>
          <button aria-pressed={!inWolke} onclick={() => (inWolke = false)}>außerhalb</button>
        </div>
      </div>
      <label class="schalter"><input type="checkbox" bind:checked={gasmaske} /> Du trägst eine Gasmaske</label>
      {#if gasmaske && inWolke && !schonGereizt}<p class="hinweis">Mit Gasmaske legst du keine Probe ab.</p>{/if}
    </section>

    {#if probeNoetig}
      <section class="abschnitt">
        <h3 class="abschnitt-titel">Probe zu Beginn deines Zuges</h3>
        <p class="hinweis">Misslingt sie, bist du gereizt ({malsteps} Malsteps auf alle Proben). Kommt dein Zug erst noch, trag jetzt nur ein, dass du in der Wolke stehst, und würfle zu Beginn deines Zuges über den Zustand oben.</p>
        <ProbeKern {c} {d} anfrage={{ stat: d.regeln.zustaende.gereizt.probe, skill: null, probe: 'reizgas' }} hinweise={['probe']} {wuerfelModus}
          mitAusgang bind:ergebnis {onaendern} />
      </section>
    {/if}

    <p class="ansage">
      {#if gereizt && inWolke}Du bist gereizt: {malsteps} Malsteps auf alle Proben, solange du in der Wolke stehst.
      {:else if gereizt}Du bist gereizt bis zum Ende dieser Runde.
      {:else if inWolke && probeNoetig && ergebnis}Du hältst dem Gas stand. Zu Beginn deines nächsten Zuges in der Wolke würfelst du wieder.
      {:else if inWolke}Du stehst in der Wolke, bist aber nicht gereizt.
      {:else}Keine Wirkung.{/if}
    </p>
  </div>
  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Abbrechen</button>
    <button class="haupt" onclick={() => onfertig(reizgasSetzen(c, { in_wolke: inWolke, gereizt, gasmaske }))}>Eintragen</button>
  {/snippet}
</Dialog>
