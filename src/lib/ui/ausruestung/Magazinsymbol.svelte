<script lang="ts">
  // Kleines Magazin als Bildzeichen (Wunsch 19.11.2026): Umriss in Textfarbe, Füllstand von unten in der Farbe des
  // Munitionstyps (darstellung.json `munitionsfarben`). Ohne Farbe für den Typ: Textfarbe gedämpft.
  // Drei Formen (Wunsch 19.11.2026): einfaches Magazin (gerader Kasten), erweitertes (länger, mit Bodenplatte),
  // Trommelmagazin (runde Trommel mit kurzem Hals). Die Form kommt aus magazine.json (`erweitert`, `trommel`).
  import type { MagazinSorte } from '../../daten/typen';

  interface Props {
    inhalt: number;
    groesse: number;
    farbe?: string | null;
    /** klein: in der Zeile der Waffe; sonst als Kachel. */
    klein?: boolean;
    /** Magazinsorte für die Form; ohne Sorte (oder Schnelllader, Ladestreifen) das einfache Magazin. */
    sorte?: MagazinSorte | null;
  }
  let { inhalt, groesse, farbe = null, klein = false, sorte = null }: Props = $props();

  const clipId = $props.id();
  const form = $derived(sorte?.trommel ? 'trommel' : sorte?.erweitert ? 'erweitert' : 'einfach');

  // Je Form: Bildfeld, Umriss, Innenfläche (für die Füllung) und deren oberer/unterer Rand.
  const formen = {
    einfach: { b: 16, h: 40, umriss: 'M4 5V1.75H12V5M1.75 5H14.25V38.25H1.75Z',
      innen: 'M2.5 6.5H13.5V37.5H2.5Z', oben: 6.5, unten: 37.5 },
    erweitert: { b: 16, h: 50, umriss: 'M4 5V1.75H12V5M1.75 5H14.25V44.5H1.75ZM0.75 44.5H15.25V48.5H0.75Z',
      innen: 'M2.5 6.5H13.5V43.75H2.5Z', oben: 6.5, unten: 43.75 },
    trommel: { b: 30, h: 40, umriss: 'M11 5V1.75H19V5M9.75 5H20.25V14.93A12.25 12.25 0 1 1 9.75 14.93Z',
      innen: 'M11.25 6.5H18.75V15.93A10.75 10.75 0 1 1 11.25 15.93Z', oben: 6.5, unten: 36.75 },
  } as const;
  const f = $derived(formen[form]);

  // Bildmaße in Pixeln je Einheit des Bildfelds (einfaches Magazin: 18 × 45 bzw. klein 11 × 27,5).
  const massstab = $derived(klein ? 11 / 16 : 18 / 16);
  const anteil = $derived(groesse > 0 ? Math.max(0, Math.min(1, inhalt / groesse)) : 0);
  const hoehe = $derived((f.unten - f.oben) * anteil);
</script>

<svg class="magazin" viewBox="0 0 {f.b} {f.h}" aria-hidden="true" style:--mfarbe={farbe ?? 'var(--text-2)'}
  style:width="{f.b * massstab}px" style:height="{f.h * massstab}px">
  <defs><clipPath id={clipId}><path d={f.innen} /></clipPath></defs>
  <path class="leer" d={f.innen} />
  {#if hoehe > 0}<rect class="voll" clip-path="url(#{clipId})" x="0" y={f.unten - hoehe} width={f.b} height={hoehe} />{/if}
  <path class="umriss" d={f.umriss} />
</svg>

<style>
  .magazin { flex: none; display: block; }
  .leer { fill: var(--flaeche-2); }
  .voll { fill: var(--mfarbe); }
  .umriss { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
</style>
