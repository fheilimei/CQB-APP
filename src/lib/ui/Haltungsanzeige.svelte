<script lang="ts">
  // Anzeige neben der Figur (konzept.md § Aufbau der App, Figur): eigener Stand, Bewegung dieser Runde und laufende
  // Konzentration, je eine Zeile mit kleiner Beschriftung links und Feld rechts (Piktogramm bzw. Stufe). Nur im Gefecht. Bilder und Pfeilzahl aus darstellung.json (stand_bilder, bewegung_pfeile).
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
  const konzentration = $derived(g.konzentration);
  const text = $derived(`Dein Stand: ${standAdjektiv(stand, d)}${bewegung ? `; Bewegung: ${bewegungName(bewegung, d)}` : ''}${konzentration ? `; Konzentration: ${konzentration}` : ''}`);
</script>

<div class="anzeige" role="img" aria-label={text} title={text}>
  <span class="titel" aria-hidden="true">Stand</span>
  <span class="feld" aria-hidden="true">
    {#if bild}
      <svg viewBox="0 0 24 24" class="bild"><path d={bild} /></svg>
    {:else}
      <span class="ersatz">{standAdjektiv(stand, d)}</span>
    {/if}
  </span>
  {#if pfeile}
    <span class="titel" aria-hidden="true">Bewegung</span>
    <span class="feld" aria-hidden="true">
      {#if pfeile === 'sprung'}
        <svg viewBox="0 0 24 24" class="bild pfeil"><path d="M3 19Q11 3 21 17M21 17l-.6-5M21 17l-4.8-1.6" /></svg>
      {:else}
        <svg viewBox="0 0 {pfeilBreite} 24" class="bild pfeil" style:width="{pfeilBreite}px">
          {#each { length: pfeile } as _, i (i)}<path d="M{3 + i * 6} 6l6 6l-6 6" />{/each}
        </svg>
      {/if}
    </span>
  {/if}
  {#if konzentration}
    <span class="titel" aria-hidden="true">Konzentration</span>
    <!-- Halber Kreis = leicht, voller Kreis = voll. -->
    <span class="feld" aria-hidden="true">
      <svg viewBox="0 0 16 16" class="kreis">
        <circle cx="8" cy="8" r="6.25" class="ring" />
        {#if konzentration === 'voll'}<circle cx="8" cy="8" r="6.25" />{:else}<path d="M8 1.75a6.25 6.25 0 0 0 0 12.5z" />{/if}
      </svg>
    </span>
  {/if}
</div>

<style>
  /* Zwei Spalten: Beschriftung rechtsbündig, daneben das Feld. */
  .anzeige { display: grid; grid-template-columns: auto auto; align-items: center; justify-items: end; gap: var(--abstand-1) var(--abstand-2); }
  .titel { justify-self: end; font-size: 0.7rem; color: var(--text-2); }
  .feld { display: flex; align-items: center; justify-content: center; min-width: 52px; min-height: 40px; /* gleich breit wie die Felder der Zustände */ padding: var(--abstand-1); border-radius: 8px;
    background: var(--flaeche-2); border: 1px solid var(--linie); }
  /* Gleicher Stil wie die Zeichen auf Deckung und Getroffen: einfarbig in Textfarbe, dünne Linien (etwa 1,5 px). */
  .bild { width: 24px; height: 24px; display: block; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .kreis { width: 16px; height: 16px; display: block; fill: currentColor; }
  .kreis .ring { fill: none; stroke: currentColor; stroke-width: 1.5; }
  .ersatz { font-size: 0.85rem; }
</style>
