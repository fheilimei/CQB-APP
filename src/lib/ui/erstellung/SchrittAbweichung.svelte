<script lang="ts">
  // Schritt 3: Abweichung (konzept.md § 3.0). Je Stat zwei W10: Positiv − Negativ. Würfe sind endgültig.
  import type { Spieldaten } from '../../daten/typen';
  import { statwert } from '../../regeln/probe';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import { wuerfle, type Wurf } from '../../wuerfel/wuerfel';
  import Begriff from '../Begriff.svelte';
  import Wuerfel from '../Wuerfel.svelte';
  import { vorzeichen, wurfText } from '../texte';

  interface Props { c: Charakter; d: Spieldaten; abweichungModus: Quelle }
  let { c = $bindable(), d, abweichungModus }: Props = $props();
  const offen = $derived(d.stats.eintraege.filter((s) => !c.stats[s.id]!.wurf));

  function setze(id: string, w: Wurf) {
    c.stats[id] = { ...c.stats[id]!, wurf: { positiv: w.werte[0]!, negativ: w.werte[1]!, quelle: w.quelle } };
  }
  function alleWuerfeln() {
    for (const s of offen) setze(s.id, wuerfle('2W10'));
  }
</script>

<p class="hinweis">Abweichung = Positivwürfel − Negativwürfel (−9 bis +9). Statwert = Rang + Abweichung. Ein Wurf lässt sich nicht zurücknehmen.</p>

{#if offen.length && abweichungModus === 'app'}
  <button class="haupt breit" onclick={alleWuerfeln}>Fehlende Abweichungen würfeln ({offen.length})</button>
{/if}

<ul class="stats">
  {#each d.stats.eintraege as s (s.id)}
    {@const e = c.stats[s.id]!}
    <li class="karte">
      <div class="kopf">
        <Begriff art="stat" name={s.name} darstellung={d.darstellung} />
        <span>Rang {e.rang ?? '–'}</span>
      </div>
      {#if e.wurf}
        <div class="ergebnis">
          <span>{wurfText(e.wurf)} = <strong>{vorzeichen(e.wurf.positiv - e.wurf.negativ)}</strong>
            <span class="hinweis">({e.wurf.quelle === 'app' ? 'App' : 'von Hand'})</span></span>
          <span class="statwert">{statwert(e, d.regeln) ?? ''}</span>
        </div>
      {:else}
        <Wuerfel art="2W10" modus={abweichungModus} titel="Abweichung" onwurf={(w) => setze(s.id, w)} />
      {/if}
    </li>
  {/each}
</ul>

<style>
  .breit { width: 100%; margin-bottom: 12px; }
  .stats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .stats li { padding: 12px; }
  .kopf, .ergebnis { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .ergebnis { margin-top: 6px; }
  .statwert { font-size: 1.3rem; font-weight: 700; }
</style>
