<script lang="ts">
  // Aktive Zustände neben der Figur (konzept.md § 3.11, 19.11.2026): je Zustand eine Zeile wie Stand und Bewegung
  // (Haltungsanzeige.svelte), kleine Beschriftung links, Feld mit Bildzeichen rechts, Rand in der Zustandsfarbe.
  // Antippen zeigt die Wirkung (Geblendet, Adrenalinschock) bzw. öffnet das Fenster Reizgas. Bilder aus darstellung.json (zustand_bilder).
  import type { Spieldaten } from '../daten/typen';
  import { gefechtVon } from '../regeln/probenrechner';
  import { geblendetRunden } from '../regeln/zustaende';
  import type { Charakter } from '../speicher/charakter';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    onschock: () => void;
    ongeblendet: () => void;
    onreizgas: () => void;
  }
  let { c, d, onschock, ongeblendet, onreizgas }: Props = $props();

  interface Eintrag { id: string; name: string; zahl: number | null; hilfe: string; aktion: () => void }

  const eintraege = $derived.by(() => {
    const g = gefechtVon(c);
    const liste: Eintrag[] = [];
    const runden = g ? geblendetRunden(g) : 0;
    if (runden > 0) liste.push({ id: 'geblendet', name: 'Geblendet', zahl: runden, hilfe: `Geblendet, noch ${runden} ${runden === 1 ? 'Runde' : 'Runden'}`, aktion: ongeblendet });
    if (c.spielstand.adrenalinschock.aktiv) liste.push({ id: 'adrenalinschock', name: 'Adrenalinschock', zahl: null, hilfe: 'Adrenalinschock', aktion: onschock });
    if (g?.reizgas) {
      const name = g.reizgas.gereizt ? 'Gereizt' : 'in Reizgas';
      liste.push({ id: 'gereizt', name, zahl: null, hilfe: name, aktion: onreizgas });
    }
    return liste;
  });
</script>

{#if eintraege.length}
  <div class="anzeige">
    {#each eintraege as e (e.id)}
      <span class="titel" aria-hidden="true">{e.name}</span>
      <button class="feld" aria-label="{e.hilfe}: Wirkung zeigen" onclick={e.aktion}>
        {#if d.darstellung.zustand_bilder?.[e.id]}
          <svg viewBox="0 0 24 24" class="bild" aria-hidden="true"><path d={d.darstellung.zustand_bilder[e.id]} /></svg>
        {:else}
          <span class="ersatz">{e.name}</span>
        {/if}
        {#if e.zahl !== null}<span class="zahl">{e.zahl}</span>{/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  /* Gleiches Raster wie Haltungsanzeige: Beschriftung rechtsbündig, daneben das Feld. */
  .anzeige { display: grid; grid-template-columns: auto auto; align-items: center; justify-items: end; gap: var(--abstand-1) var(--abstand-2); }
  .titel { font-size: 0.7rem; color: var(--text-2); }
  /* Feld so groß wie Stand und Bewegung (min-width 52px, Höhe 44px = Mindestgröße der Tippfläche); Zustand am farbigen Rand erkennbar. */
  .feld { display: flex; align-items: center; justify-content: center; gap: var(--abstand-1); min-width: 52px; min-height: 44px; padding: var(--abstand-1);
    border-radius: 8px; background: var(--flaeche-2); border: 2px solid var(--zustand); }
  .bild { width: 24px; height: 24px; display: block; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .zahl { font-size: 1rem; }
  .ersatz { font-size: 0.85rem; }
</style>
