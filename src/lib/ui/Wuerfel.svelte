<script lang="ts">
  // Gemeinsame Würfelkomponente (konzept.md § 2, Leitlinie 6): App würfelt oder Eingabe von Hand.
  // Wo nur der Ausgang zählt, bietet sie zusätzlich die drei Knöpfe Krit · gelungen · misslungen.
  import { spanne, vonHand, wuerfle, type Wuerfelart, type Wurf } from '../wuerfel/wuerfel';
  import type { Quelle } from '../speicher/charakter';

  export type Ausgang = 'krit' | 'gelungen' | 'misslungen';

  interface Props {
    art: Wuerfelart;
    /** Startmodus dieser Stelle (aus Einstellungen bzw. Standard der Stelle). */
    modus: Quelle;
    titel?: string;
    /** Ausgangsknöpfe zusätzlich anbieten. */
    mitAusgang?: boolean;
    onwurf: (w: Wurf) => void;
    onausgang?: (a: Ausgang) => void;
  }

  let { art, modus, titel = '', mitAusgang = false, onwurf, onausgang }: Props = $props();

  let aktiv = $state<Quelle>('hand');
  $effect.pre(() => { aktiv = modus; });
  let eingabe = $state<(number | null)[]>([null, null]);
  let letzter = $state<Wurf | null>(null);

  const zwei = $derived(art === '2W10');
  const grenzen = $derived(spanne(art));
  const gueltig = $derived(vonHand(art, (zwei ? eingabe : eingabe.slice(0, 1)).map((x) => x ?? NaN)));

  function appWuerfelt() {
    letzter = wuerfle(art);
    onwurf(letzter);
  }
  function uebernehmen() {
    if (!gueltig) return;
    letzter = gueltig;
    onwurf(gueltig);
  }
  function beschreibe(w: Wurf): string {
    if (w.art === '2W10') return `${w.werte[0]} − ${w.werte[1]} = ${w.ergebnis > 0 ? '+' : ''}${w.ergebnis}`;
    return String(w.ergebnis);
  }
</script>

<div class="wuerfel karte">
  <div class="kopf">
    <span class="titel">{titel || art}</span>
    <div class="umschalter" role="group" aria-label="Wer würfelt">
      <button class:an={aktiv === 'app'} aria-pressed={aktiv === 'app'} onclick={() => (aktiv = 'app')}>App würfelt</button>
      <button class:an={aktiv === 'hand'} aria-pressed={aktiv === 'hand'} onclick={() => (aktiv = 'hand')}>von Hand</button>
    </div>
  </div>

  {#if aktiv === 'app'}
    <button class="haupt breit" onclick={appWuerfelt}>{art} würfeln</button>
  {:else}
    <div class="eingabe">
      {#if zwei}
        <label>Positivwürfel
          <input type="number" inputmode="numeric" min={grenzen.min} max={grenzen.max} bind:value={eingabe[0]} />
        </label>
        <label>Negativwürfel
          <input type="number" inputmode="numeric" min={grenzen.min} max={grenzen.max} bind:value={eingabe[1]} />
        </label>
      {:else}
        <label>Ergebnis ({grenzen.min}–{grenzen.max})
          <input type="number" inputmode="numeric" min={grenzen.min} max={grenzen.max} bind:value={eingabe[0]} />
        </label>
      {/if}
    </div>
    <button class="haupt breit" disabled={!gueltig} onclick={uebernehmen}>Übernehmen</button>
  {/if}

  {#if letzter}
    <p class="ergebnis" aria-live="polite">Ergebnis: <strong>{beschreibe(letzter)}</strong>
      <span class="hinweis">({letzter.quelle === 'app' ? 'von der App gewürfelt' : 'von Hand'})</span></p>
  {/if}

  {#if mitAusgang && onausgang}
    <div class="ausgang" role="group" aria-label="Nur den Ausgang eintragen">
      <button onclick={() => onausgang('krit')}>Krit</button>
      <button onclick={() => onausgang('gelungen')}>gelungen</button>
      <button onclick={() => onausgang('misslungen')}>misslungen</button>
    </div>
  {/if}
</div>

<style>
  .wuerfel { display: flex; flex-direction: column; gap: 12px; }
  .kopf { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .titel { font-weight: 600; }
  .umschalter { display: flex; border: 1px solid var(--linie); border-radius: var(--radius); overflow: hidden; }
  .umschalter button { border: none; border-radius: 0; background: transparent; padding: 0 12px; }
  .umschalter button.an { background: var(--flaeche-2); font-weight: 600; }
  .eingabe { display: flex; gap: 12px; }
  .eingabe label { flex: 1; margin: 0; font-weight: 400; }
  .breit { width: 100%; }
  .ergebnis { margin: 0; }
  .ausgang { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
</style>
