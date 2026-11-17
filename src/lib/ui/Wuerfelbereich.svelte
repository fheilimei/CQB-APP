<script lang="ts" module>
  import type { Wuerfelart } from '../wuerfel/wuerfel';

  /** Ein Wurf im Würfelbereich. „sichtbar: false“ = vielleicht nötig (hängt vom Ergebnis ab); die App würfelt ihn mit. */
  export interface Wurfstelle {
    id: string;
    art: Exclude<Wuerfelart, '2W10'>;
    titel: string;
    sichtbar?: boolean;
  }
</script>

<script lang="ts">
  // Würfelbereich für mehrere Würfe eines Ablaufs (konzept.md § 2, Leitlinie 6; z. B. Schießen: Trefferwurf,
  // Trefferzone, Rückstoß). Ein Umschalter für alle Würfe: „App würfelt“ würfelt alle auf einmal (auch die, die erst
  // je nach Ergebnis gebraucht werden), „von Hand“ zeigt je Wurf ein Feld und einen gemeinsamen Knopf „Übernehmen“.
  // Das Ergebnis des Ablaufs (Ansage) kommt als children und steht unten im Kasten.
  import type { Snippet } from 'svelte';
  import type { Quelle } from '../speicher/charakter';
  import { spanne, vonHand, wuerfle, type Wurf } from '../wuerfel/wuerfel';

  interface Props {
    titel?: string;
    modus: Quelle;
    wuerfe: Wurfstelle[];
    onwurf: (id: string, w: Wurf) => void;
    /** Statt der Würfe ein Hinweis, was vorher fehlt. */
    gesperrt?: string | null;
    children?: Snippet;
  }
  let { titel = 'Würfeln', modus, wuerfe, onwurf, gesperrt = null, children }: Props = $props();

  let aktiv = $state<Quelle>('hand');
  $effect.pre(() => { aktiv = modus; });
  let ergebnisse = $state<Record<string, Wurf>>({});
  let eingabe = $state<Record<string, number | null>>({});

  const sichtbare = $derived(wuerfe.filter((w) => w.sichtbar !== false));
  const fehlend = $derived(sichtbare.filter((w) => !ergebnisse[w.id]));
  /** Gültige Eingaben von Hand je Wurf. */
  const gueltig = $derived(Object.fromEntries(sichtbare.map((w) => [w.id, vonHand(w.art, [eingabe[w.id] ?? NaN])])));
  const allesGueltig = $derived(sichtbare.every((w) => gueltig[w.id]));
  const uebernommen = $derived(
    sichtbare.every((w) => ergebnisse[w.id]?.quelle === 'hand' && ergebnisse[w.id]?.ergebnis === gueltig[w.id]?.ergebnis)
  );

  function setze(id: string, w: Wurf) {
    ergebnisse = { ...ergebnisse, [id]: w };
    onwurf(id, w);
  }
  /** Fehlen sichtbare Würfe, würfelt die App nur diese nach (z. B. Rückstoß, wenn mehr Schüsse eingestellt werden). */
  function appWuerfelt() {
    const teil = fehlend.length && fehlend.length < sichtbare.length;
    for (const w of wuerfe) if (!teil || !ergebnisse[w.id]) setze(w.id, wuerfle(w.art));
  }
  function uebernehmen() {
    for (const w of sichtbare) {
      const g = gueltig[w.id];
      if (g) setze(w.id, g);
    }
  }
  const knopfText = $derived(!fehlend.length ? 'Neu würfeln' : fehlend.length < sichtbare.length ? 'Rest würfeln' : 'Würfeln');
</script>

<section class="abschnitt wuerfelbereich" aria-label={titel}>
  <div class="kopf">
    <h3 class="abschnitt-titel">{titel}</h3>
    {#if !gesperrt}
      <div class="umschalter" role="group" aria-label="Wer würfelt">
        <button class:an={aktiv === 'app'} aria-pressed={aktiv === 'app'} onclick={() => (aktiv = 'app')}>App würfelt</button>
        <button class:an={aktiv === 'hand'} aria-pressed={aktiv === 'hand'} onclick={() => (aktiv = 'hand')}>von Hand</button>
      </div>
    {/if}
  </div>

  {#if gesperrt}
    <p class="hinweis">{gesperrt}</p>
  {:else}
    {#if aktiv === 'app'}
      {#if Object.keys(ergebnisse).length}
        <ul class="werte" aria-live="polite">
          {#each sichtbare as w (w.id)}
            <li><span>{w.titel}</span><strong>{ergebnisse[w.id]?.ergebnis ?? '–'}</strong></li>
          {/each}
        </ul>
      {/if}
      <button class="breit" class:haupt={fehlend.length > 0} onclick={appWuerfelt}>{knopfText}</button>
    {:else}
      <div class="felder">
        {#each sichtbare as w (w.id)}
          {@const g = spanne(w.art)}
          <label>{w.titel}
            <input type="number" inputmode="numeric" min={g.min} max={g.max} placeholder="{g.min}–{g.max}" bind:value={eingabe[w.id]} />
          </label>
        {/each}
      </div>
      <button class="breit" class:haupt={!uebernommen} disabled={!allesGueltig} onclick={uebernehmen}>
        {uebernommen ? '✓ Übernommen' : 'Übernehmen'}</button>
    {/if}
    {#if children}{@render children()}{/if}
  {/if}
</section>

<style>
  .kopf { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); flex-wrap: wrap; }
  .breit { width: 100%; }
  .werte { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--abstand-1); }
  .werte li { display: flex; justify-content: space-between; align-items: baseline; gap: var(--abstand-2); }
  .werte strong { font-size: 1.5rem; font-variant-numeric: tabular-nums; }
  .felder { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: var(--abstand-3); }
  .felder label { margin: 0; font-weight: 400; display: flex; flex-direction: column; justify-content: space-between; gap: var(--abstand-1); }
</style>
