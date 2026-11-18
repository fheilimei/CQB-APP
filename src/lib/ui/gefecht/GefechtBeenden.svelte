<script lang="ts">
  // Bericht „Gefecht beenden“ (konzept.md § 3.7, § 3.0c) mit der Auswahl, ob der Adrenalinschock gilt.
  // Vorgewählt: ja, wenn im Gefecht Over the Edge erreicht wurde (Wunsch des Nutzers 18.11.2026).
  import { untrack } from 'svelte';
  import type { Spieldaten } from '../../daten/typen';
  import { blutet, fristMinuten } from '../../regeln/blutung';
  import { gefechtBeenden } from '../../regeln/gefecht';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { wundenText } from '../../regeln/wunden';
  import type { Charakter } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';
  import { standText } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, onfertig, onabbrechen }: Props = $props();

  const g = $derived(gefechtVon(c));
  const erreicht = untrack(() => !!gefechtVon(c)?.adrenalin4_erreicht);
  let schock = $state(erreicht);
  const stunden = $derived(d.regeln.zustaende.adrenalinschock.ende_ruhe_stunden);
  const blutend = $derived(c.spielstand.wunden.filter(blutet));
  const minuten = (n: number | null) => `${n} ${n === 1 ? 'Minute' : 'Minuten'}`;
</script>

<Dialog titel="Gefecht beenden">
  <div class="gruppe">
    <p>Das Gefecht endet.</p>
    {#if g}<p>{g.leiter === 0 ? 'Du bist bei 0 und bleibst dort.' : `${standText(g.leiter, d)} fällt auf 0.`}</p>{/if}
  </div>

  <div class="gruppe">
    <span class="gruppe-titel">Adrenalinschock</span>
    <div class="umschalter" role="group" aria-label="Adrenalinschock">
      <button aria-pressed={schock} onclick={() => (schock = true)}>ja</button>
      <button aria-pressed={!schock} onclick={() => (schock = false)}>nein</button>
    </div>
    <p class="hinweis">{erreicht ? 'Du hast in diesem Gefecht Over the Edge erreicht.' : 'Du hast in diesem Gefecht Over the Edge nicht erreicht.'}</p>
    {#if schock}
      <p>Du erleidest einen Adrenalinschock. Alle Proben sind erschwert, bis du {stunden} Stunden ununterbrochen ruhst.</p>
    {/if}
  </div>

  {#if g?.lage.sl_gefecht.length}<p>Die Steps der SL für dieses Gefecht entfallen.</p>{/if}
  {#if blutend.length}
    <div class="gruppe">
      <p>Jetzt beginnen die Blutungsfristen: {blutend.map((w) => `${wundenText(w, d)}, ${minuten(fristMinuten(w, d))}`).join('; ')}.</p>
      <p>Versorge die Wunden über die Figur. Sagt die SL, dass eine Frist abgelaufen ist, tippe dort „Frist abgelaufen“.</p>
    </div>
  {/if}

  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Zurück</button>
    <button class="haupt" onclick={() => onfertig(gefechtBeenden(c, schock))}>Weiter</button>
  {/snippet}
</Dialog>

<style>
  .umschalter button { flex: 1; min-height: 44px; }
</style>
