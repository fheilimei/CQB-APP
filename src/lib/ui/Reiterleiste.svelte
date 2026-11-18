<script lang="ts">
  /**
   * Senkrechte Reiterleiste am rechten Bildschirmrand (Daumenbereich unten rechts).
   * Bildzeichen statt Text: Figur (Silhouette), Werte (Tabelle), Ausrüstung (Rucksack), Verlauf (Uhr mit Pfeil zurück).
   * Lässt sich einklappen; dann bleibt eine schmale Lasche am Rand.
   */
  type Reiter = 'figur' | 'werte' | 'ausruestung' | 'verlauf';
  let { reiter, eingeklappt, onwahl, onklappen }: {
    reiter: Reiter; eingeklappt: boolean; onwahl: (r: Reiter) => void; onklappen: (zu: boolean) => void;
  } = $props();

  const REITER: { id: Reiter; name: string }[] = [
    { id: 'figur', name: 'Figur' }, { id: 'werte', name: 'Werte' },
    { id: 'ausruestung', name: 'Ausrüstung' }, { id: 'verlauf', name: 'Verlauf' },
  ];
  const name = $derived(REITER.find((r) => r.id === reiter)?.name ?? '');
</script>

{#if eingeklappt}
  <button class="lasche" aria-expanded="false" aria-label="Reiter ausklappen (jetzt: {name})"
    onclick={() => onklappen(false)}><span aria-hidden="true">◂</span></button>
{:else}
  <nav class="leiste" aria-label="Reiter">
    {#each REITER as r (r.id)}
      <button class="flach" class:an={reiter === r.id} aria-current={reiter === r.id ? 'page' : undefined}
        aria-label={r.name} title={r.name} onclick={() => onwahl(r.id)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {#if r.id === 'figur'}
            <circle cx="12" cy="7" r="3.5" />
            <path d="M4.5 21v-2.5a7.5 7.5 0 0 1 15 0V21" />
          {:else if r.id === 'werte'}
            <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
            <path d="M3.5 9.5h17M3.5 14.5h17M10 4.5v15" />
          {:else if r.id === 'ausruestung'}
            <path d="M9 6V4.5a3 3 0 0 1 6 0V6" />
            <rect x="5" y="6" width="14" height="15" rx="3" />
            <path d="M8.5 13h7v4h-7z M5 11h14" />
          {:else}
            <path d="M4 12a8 8 0 1 0 2.4-5.7" />
            <path d="M4 4v4h4" />
            <path d="M12 8v4.5l3 2" />
          {/if}
        </svg>
      </button>
    {/each}
    <button class="flach einklappen" aria-expanded="true" aria-label="Reiter einklappen"
      onclick={() => onklappen(true)}><span aria-hidden="true">▸</span></button>
  </nav>
{/if}

<style>
  /* Liegt in der unteren Leiste und steht immer direkt über allem, was unten fest steht. */
  .leiste { position: absolute; right: 0; bottom: calc(100% + var(--abstand-2)); z-index: 6; width: var(--tipp);
    display: flex; flex-direction: column; background: var(--flaeche); border: 1px solid var(--linie); border-right: none;
    border-radius: var(--radius) 0 0 var(--radius); box-shadow: -2px 0 6px rgb(0 0 0 / 0.2); overflow: hidden; }
  .leiste button { border-radius: 0; padding: 0; min-width: 0; width: 100%; color: var(--text-2);
    display: flex; align-items: center; justify-content: center; }
  .leiste button + button { border-top: 1px solid var(--linie); }
  svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  /* Gewählter Reiter: Akzentfarbe, Fläche und Balken am linken Rand, nicht nur Farbe. */
  .leiste button.an { color: var(--akzent); background: var(--gewaehlt); box-shadow: inset 3px 0 0 var(--akzent); }
  .leiste button.an svg { stroke-width: 2.3; }
  .einklappen { min-height: 40px; font-size: 0.9rem; }
  /* Eingeklappt: schmale Lasche am rechten Rand. Sichtbar nur so breit wie der Rand des Inhalts;
     die Tippfläche (48 px) reicht unsichtbar nach links. */
  .lasche { position: absolute; right: 0; bottom: calc(100% + var(--abstand-2)); z-index: 6; width: var(--tipp); height: 56px;
    padding: 0; border: none; background: transparent; border-radius: 0; }
  .lasche span { position: absolute; top: 0; bottom: 0; right: 0; width: var(--abstand-3); display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; color: var(--akzent); background: var(--flaeche); border: 1px solid var(--linie); border-right: none;
    border-radius: var(--radius) 0 0 var(--radius); box-shadow: -2px 0 6px rgb(0 0 0 / 0.2); }
  /* Ohne feste Leiste unten liegt alles über dem sicheren Bereich am unteren Bildschirmrand. */
  :global(.unten:not(.im-gefecht)) .leiste, :global(.unten:not(.im-gefecht)) .lasche {
    bottom: calc(var(--abstand-2) + env(safe-area-inset-bottom)); }
</style>
