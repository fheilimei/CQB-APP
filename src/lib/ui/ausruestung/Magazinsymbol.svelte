<script lang="ts">
  // Kleines Magazin als Bildzeichen (Wunsch 19.11.2026): Umriss in Textfarbe, Füllstand von unten in der Farbe des
  // Munitionstyps (darstellung.json `munitionsfarben`). Ohne Farbe für den Typ: Textfarbe gedämpft.
  interface Props {
    inhalt: number;
    groesse: number;
    farbe?: string | null;
    /** klein: in der Zeile der Waffe; sonst als Kachel. */
    klein?: boolean;
  }
  let { inhalt, groesse, farbe = null, klein = false }: Props = $props();

  // Feld 16 × 40: Lippe oben (y 1–5), Körper y 5–39. Füllung innen mit 1,5 Rand.
  const innenOben = 6.5;
  const innenHoehe = 31;
  const anteil = $derived(groesse > 0 ? Math.max(0, Math.min(1, inhalt / groesse)) : 0);
  const hoehe = $derived(innenHoehe * anteil);
</script>

<svg class="magazin" class:klein viewBox="0 0 16 40" aria-hidden="true" style:--mfarbe={farbe ?? 'var(--text-2)'}>
  <rect class="leer" x="2.5" y={innenOben} width="11" height={innenHoehe} rx="1" />
  {#if hoehe > 0}<rect class="voll" x="2.5" y={innenOben + innenHoehe - hoehe} width="11" height={hoehe} rx="1" />{/if}
  <path class="umriss" d="M4 5V1.75H12V5M1.75 5H14.25V38.25H1.75Z" />
</svg>

<style>
  /* Größen sind Bildmaße, kein Abstand. */
  .magazin { width: 18px; height: 45px; flex: none; display: block; }
  .magazin.klein { width: 11px; height: 28px; }
  .leer { fill: var(--flaeche-2); }
  .voll { fill: var(--mfarbe); }
  .umriss { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
</style>
