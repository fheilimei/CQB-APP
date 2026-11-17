<script lang="ts">
  // Schritt 5: freie Punkte ausgeben, wie im Aufstiegsmodus (konzept.md § 3.0). Skill- und Perk-Käufe lassen sich
  // bis zum Abschluss zurückgeben; ein Statrank-Up nicht, weil sein Wurf fest ist.
  import type { Spieldaten } from '../../daten/typen';
  import { moeglichkeiten, type Moeglichkeit } from '../../regeln/aufstieg';
  import { erstellungAnwenden, kaufHinzufuegen, kaufZurueckgeben } from '../../regeln/erstellung';
  import type { Charakter, Erstellungskauf, Quelle } from '../../speicher/charakter';
  import Begriff from '../Begriff.svelte';
  import Kaufliste from '../Kaufliste.svelte';
  import StatrankUp from '../StatrankUp.svelte';
  import { perkName, punkte, skillName, statName } from '../texte';

  interface Props { c: Charakter; d: Spieldaten; abweichungModus: Quelle }
  let { c = $bindable(), d, abweichungModus }: Props = $props();
  const ergebnis = $derived(erstellungAnwenden(c, d));
  const x = $derived(ergebnis.charakter);
  const liste = $derived(moeglichkeiten(x, d));
  let rankUp = $state<string | null>(null);

  function kaufen(m: Moeglichkeit) {
    if (m.art === 'statrank_up') rankUp = m.id;
    else c = kaufHinzufuegen(c, { art: m.art, id: m.id }, d);
  }
  const ungueltig = (i: number) => ergebnis.ungueltig.some((u) => u.index === i);
  function beschreibe(k: Erstellungskauf): { art: 'stat' | 'skill' | 'perk'; name: string } {
    if (k.art === 'statrank_up') return { art: 'stat', name: `${statName(k.id, d)}: Statrank-Up` };
    return k.art === 'skill' ? { art: 'skill', name: `${skillName(k.id, d)} +1` } : { art: 'perk', name: perkName(k.id, d) };
  }
</script>

<div class="leiste karte" aria-live="polite"><strong>{punkte(x.freie_punkte)} frei</strong></div>
<p class="hinweis">Nicht ausgegebene Punkte bleiben dir erhalten.</p>

{#if c.erstellung!.kaeufe.length}
  <div class="gruppe">
  <h3 class="abschnitt-titel">Gekauft</h3>
  <ul class="gekauft">
    {#each c.erstellung!.kaeufe as k, i (i)}
      {@const b = beschreibe(k)}
      <li class:ungueltig={ungueltig(i)}>
        <span><Begriff art={b.art} name={b.name} darstellung={d.darstellung} />
          {#if ungueltig(i)}<span class="fehler"> · gilt nicht mehr (Voraussetzung oder Zugang fehlt)</span>{/if}</span>
        {#if k.art !== 'statrank_up'}
          <button class="flach" onclick={() => (c = kaufZurueckgeben(c, i))}>Zurückgeben</button>
        {:else}
          <span class="hinweis">fest</span>
        {/if}
      </li>
    {/each}
  </ul>
  </div>
{/if}

<Kaufliste c={x} {d} {liste} onkaufen={kaufen} />

{#if rankUp}
  <StatrankUp {d} statId={rankUp} alt={x.stats[rankUp]!} freie={x.freie_punkte} modus={abweichungModus}
    onwurf={(w) => (c = kaufHinzufuegen(c, { art: 'statrank_up', id: rankUp!, wurf: w }, d))}
    onschliessen={() => (rankUp = null)} />
{/if}

<style>
  .leiste { position: sticky; top: 0; z-index: 2; text-align: center; padding: var(--abstand-2); }
  .gekauft { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--abstand-1); }
  .gekauft li { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .ungueltig { color: var(--gefahr); }
</style>
