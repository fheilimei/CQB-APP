<script lang="ts">
  // Anzeige neben der Figur (konzept.md § Aufbau der App, Figur): eigener Stand und Bewegung dieser Runde als Piktogramme,
  // ohne Text. Nur im Gefecht. Bilder und Pfeilzahl aus darstellung.json (stand_bilder, bewegung_pfeile).
  import type { Spieldaten } from '../daten/typen';
  import { eigenerStand } from '../regeln/aktionen';
  import type { Gefecht } from '../speicher/charakter';
  import { bewegungName, standAdjektiv } from './texte';

  interface Props { g: Gefecht; d: Spieldaten }
  let { g, d }: Props = $props();

  const stand = $derived(eigenerStand(g, d));
  const bild = $derived(d.darstellung.stand_bilder[stand]);
  const bewegung = $derived(g.gehechtet ? 'hechten' : g.bewegt);
  const pfeile = $derived(bewegung ? d.darstellung.bewegung_pfeile[bewegung] ?? 1 : null);
  /** Breite des Pfeilfelds: je Pfeil 6 Einheiten, dazu Rand. */
  const pfeilBreite = $derived(typeof pfeile === 'number' ? 6 * pfeile + 6 : 24);
  const text = $derived(`Dein Stand: ${standAdjektiv(stand, d)}${bewegung ? `; Bewegung: ${bewegungName(bewegung, d)}` : ''}`);
</script>

<div class="anzeige" role="img" aria-label={text} title={text}>
  {#if bild}
    <svg viewBox="0 0 24 24" class="bild"><path d={bild} /></svg>
  {:else}
    <span class="ersatz">{standAdjektiv(stand, d)}</span>
  {/if}
  {#if pfeile === 'sprung'}
    <svg viewBox="0 0 24 24" class="bild pfeil"><path d="M3 19Q11 3 21 17M21 17l-.6-5M21 17l-4.8-1.6" /></svg>
  {:else if typeof pfeile === 'number'}
    <svg viewBox="0 0 {pfeilBreite} 24" class="bild pfeil" style:width="{(pfeilBreite / 24) * 32}px">
      {#each { length: pfeile } as _, i (i)}<path d="M{3 + i * 6} 6l6 6l-6 6" />{/each}
    </svg>
  {/if}
</div>

<style>
  .anzeige { display: flex; flex-direction: column; align-items: center; gap: var(--abstand-1); padding: var(--abstand-1); border-radius: 8px;
    background: var(--flaeche-2); border: 1px solid var(--linie); }
  /* 32 px: groß genug, um die Haltung auf einen Blick zu erkennen, klein genug für die freie Ecke neben dem Kopf der Figur. */
  .bild { width: 32px; height: 32px; display: block; fill: none; stroke: var(--text); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .pfeil { stroke: var(--akzent); stroke-width: 2.5; }
  .ersatz { font-size: 0.85rem; }
</style>
