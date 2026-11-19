<script lang="ts">
  // Feste Leiste unten im Reiter Laden (konzept.md § 3.14): „Warenkorb · 3 Posten · 610–720 $“. Antippen öffnet den Warenkorb.
  import type { Spieldaten } from '../../daten/typen';
  import { korbRahmen, verkaufRahmen } from '../../regeln/laden';
  import type { Charakter } from '../../speicher/charakter';
  import { geld } from '../texte';
  import { korb, korbFuer } from './korb.svelte';

  let { c, d }: { c: Charakter; d: Spieldaten } = $props();
  $effect.pre(() => korbFuer(c.id));

  const kauf = $derived(korb.art === 'kauf');
  const anzahl = $derived(kauf ? korb.kauf.length : korb.verkauf.length);
  const r = $derived(kauf ? korbRahmen(korb.kauf, d) : verkaufRahmen(c, korb.verkauf, d));
</script>

{#if anzahl}
  <button class="betont korbleiste" aria-expanded={korb.offen} onclick={() => (korb.offen = true)}>
    <span>{kauf ? 'Warenkorb' : 'Verkaufskorb'} · {anzahl} Posten · <span class="zahl">{r.min === r.max ? geld(r.min) : `${r.min.toLocaleString('de-DE')}–${geld(r.max)}`}</span></span>
    <span class="klapppfeil" aria-hidden="true">›</span>
  </button>
{/if}

<style>
  /* Flach und über die ganze Breite; die Reiterleiste schwebt darüber (mit-leiste in App.svelte).
     Deckende Fläche bis an den unteren Bildschirmrand (Wunsch 19.11.2026: vorher durchsichtig); nur oben ein Akzentstrich,
     weil Rahmen an Seiten und unten auf Geräten mit runden Bildschirmecken abgeschnitten werden. Text und Pfeil rücken
     nach innen und über den unteren Rand (mindestens Abstand 2), damit die runden Ecken sie nicht anschneiden. */
  .korbleiste { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2);
    border-radius: 0; border-width: 2px 0 0; background: var(--flaeche);
    padding: var(--abstand-2) var(--abstand-4) max(var(--abstand-3), env(safe-area-inset-bottom)); }
</style>
