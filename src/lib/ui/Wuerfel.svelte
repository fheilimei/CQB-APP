<script lang="ts">
  // Gemeinsame Würfelkomponente (konzept.md § 2, Leitlinie 6): App würfelt oder Eingabe von Hand.
  // Wo nur der Ausgang zählt, bietet sie zusätzlich die drei Knöpfe Krit · gelungen · misslungen.
  // Gestaltung: eigener abgesetzter Kasten; der gewählte Ausgang bleibt markiert; das Ergebnis steht im Kasten
  // (Zahl und, über children, die Ansage des Ablaufs).
  import type { Snippet } from 'svelte';
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
    /** Ansage des Ergebnisses (z. B. „Erfolg · 47“); steht im Kasten unter der gewürfelten Zahl. */
    children?: Snippet;
    /** Teil eines Wuerfelbereichs: ohne eigenen Kasten, Trennlinie zum vorigen Wurf. */
    eingebettet?: boolean;
  }

  let { art, modus, titel = '', mitAusgang = false, onwurf, onausgang, children, eingebettet = false }: Props = $props();

  let aktiv = $state<Quelle>('hand');
  $effect.pre(() => { aktiv = modus; });
  let eingabe = $state<(number | null)[]>([null, null]);
  let letzter = $state<Wurf | null>(null);
  let ausgangGewaehlt = $state<Ausgang | null>(null);

  const zwei = $derived(art === '2W10');
  const grenzen = $derived(spanne(art));
  const gueltig = $derived(vonHand(art, (zwei ? eingabe : eingabe.slice(0, 1)).map((x) => x ?? NaN)));
  /** Die Eingabe von Hand ist genau die zuletzt übernommene: Knopf zeigt „Übernommen“. */
  const uebernommen = $derived(
    !!letzter && letzter.quelle === 'hand' && !!gueltig && gueltig.ergebnis === letzter.ergebnis &&
      gueltig.werte.join() === letzter.werte.join()
  );
  const AUSGAENGE: [Ausgang, string][] = [['krit', 'Krit'], ['gelungen', 'gelungen'], ['misslungen', 'misslungen']];

  function appWuerfelt() {
    letzter = wuerfle(art);
    ausgangGewaehlt = null;
    onwurf(letzter);
  }
  function uebernehmen() {
    if (!gueltig) return;
    letzter = gueltig;
    ausgangGewaehlt = null;
    onwurf(gueltig);
  }
  function ausgangWaehlen(a: Ausgang) {
    ausgangGewaehlt = a;
    letzter = null;
    onausgang?.(a);
  }
  function beschreibe(w: Wurf): string {
    if (w.art === '2W10') return `${w.ergebnis > 0 ? '+' : ''}${w.ergebnis}`;
    return String(w.ergebnis);
  }
</script>

<section class={eingebettet ? 'wuerfel-teil' : 'abschnitt wuerfelbereich'} aria-label={titel || art}>
  <div class="kopf">
    <svelte:element this={eingebettet ? 'h4' : 'h3'} class="titel">{titel || art}</svelte:element>
    <div class="umschalter" role="group" aria-label="Wer würfelt">
      <button aria-pressed={aktiv === 'app'} onclick={() => (aktiv = 'app')}>App würfelt</button>
      <button aria-pressed={aktiv === 'hand'} onclick={() => (aktiv = 'hand')}>von Hand</button>
    </div>
  </div>

  {#if aktiv === 'app'}
    <button class="breit" class:haupt={!letzter} onclick={appWuerfelt}>{letzter ? 'Neu würfeln' : `${art} würfeln`}</button>
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
    <button class="breit" class:haupt={!uebernommen} disabled={!gueltig} onclick={uebernehmen}>
      {uebernommen ? '✓ Übernommen' : 'Übernehmen'}</button>
  {/if}

  {#if mitAusgang && onausgang && aktiv === 'hand'}
    <div class="ausgang-gruppe">
      <span class="hinweis">Oder nur den Ausgang eintragen:</span>
      <div class="ausgang" role="group" aria-label="Ausgang">
        {#each AUSGAENGE as [id, text] (id)}
          <button aria-pressed={ausgangGewaehlt === id} onclick={() => ausgangWaehlen(id)}>{text}</button>
        {/each}
      </div>
    </div>
  {/if}

  {#if letzter || (ausgangGewaehlt && children)}
    <div class="wuerfel-ergebnis" aria-live="polite">
      {#if letzter}
        <p class="zahl"><span class="hinweis">{letzter.quelle === 'app' ? 'Gewürfelt' : 'Eingetragen'}</span>
          <strong>{beschreibe(letzter)}</strong>
          {#if letzter.art === '2W10'}<span class="hinweis">({letzter.werte[0]} − {letzter.werte[1]})</span>{/if}</p>
      {/if}
      {@render children?.()}
    </div>
  {/if}
</section>

<style>
  /* Kasten und Ergebnisbereich: .wuerfelbereich, .wuerfel-teil, .wuerfel-ergebnis in app.css. */
  .kopf { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); flex-wrap: wrap; }
  .titel { margin: 0; font-size: 1.05rem; }
  .eingabe { display: flex; gap: var(--abstand-3); }
  .eingabe label { flex: 1; margin: 0; font-weight: 400; display: flex; flex-direction: column; gap: var(--abstand-1); }
  .breit { width: 100%; }
  .ausgang-gruppe { display: flex; flex-direction: column; gap: var(--abstand-2); }
  .ausgang { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--abstand-2); }
  .ausgang button { padding: 0 var(--abstand-1); }
  .zahl { margin: 0; display: flex; align-items: baseline; justify-content: center; gap: var(--abstand-2); }
  .zahl strong { font-size: 2rem; font-variant-numeric: tabular-nums; }
</style>
