<script lang="ts">
  // Statrank-Up (konzept.md § 3.0a): erst bestätigen, dann Abweichung neu würfeln (App oder von Hand).
  // Der Wurf gilt sofort und lässt sich nicht zurücknehmen; danach alter und neuer Statwert.
  import { untrack } from 'svelte';
  import type { Spieldaten } from '../daten/typen';
  import { naechsterRang, statwert } from '../regeln/probe';
  import type { Abweichungswurf, Quelle, StatEintrag } from '../speicher/charakter';
  import { wuerfle, type Wurf } from '../wuerfel/wuerfel';
  import Dialog from './Dialog.svelte';
  import Wuerfel from './Wuerfel.svelte';
  import { punkte, statName, vorzeichen, wurfText } from './texte';

  interface Props {
    d: Spieldaten;
    statId: string;
    alt: StatEintrag;
    freie: number;
    modus: Quelle;
    /** Übernimmt den Wurf (zieht den Punkt ab, hebt den Rang). */
    onwurf: (w: Abweichungswurf) => void;
    onschliessen: () => void;
  }
  let props: Props = $props();
  const { d, statId, modus, onwurf, onschliessen } = untrack(() => props);
  // Stand vor dem Steigern festhalten: Nach dem Wurf liefert der Aufrufer schon den neuen Stat.
  const alt = untrack(() => $state.snapshot(props.alt) as StatEintrag);
  const freie = untrack(() => props.freie);
  let phase = $state<'frage' | 'wurf' | 'ergebnis'>('frage');
  let neu = $state<Abweichungswurf | null>(null);
  const kosten = $derived(d.regeln.aufstieg.statrank_up_kosten);
  const neuerRang = $derived(naechsterRang(alt.rang!, d.regeln));
  const name = $derived(statName(statId, d));

  function uebernehmen(w: Wurf) {
    neu = { positiv: w.werte[0]!, negativ: w.werte[1]!, quelle: w.quelle };
    onwurf(neu);
    phase = 'ergebnis';
  }
  function bestaetigen() {
    if (modus === 'app') uebernehmen(wuerfle('2W10'));
    else phase = 'wurf';
  }
</script>

{#if phase === 'frage'}
  <Dialog titel="Statrank-Up: {name}">
    <p>Du steigerst ■ {name} von Rang {alt.rang} auf {neuerRang}. Das kostet {punkte(kosten)}; danach hast du {punkte(freie - kosten)} frei.</p>
    <p>Die Abweichung wird neu gewürfelt. Der Statwert kann dabei auch sinken. Der Wurf lässt sich nicht zurücknehmen.</p>
    {#snippet knoepfe()}
      <button onclick={onschliessen}>Zurück</button>
      <button class="haupt" onclick={bestaetigen}>Steigern</button>
    {/snippet}
  </Dialog>
{:else if phase === 'wurf'}
  <Dialog titel="Abweichung für {name}">
    <p class="hinweis">Würfle zwei W10: zuerst den Positiv-, dann den Negativwürfel.</p>
    <Wuerfel art="2W10" modus="hand" titel="Abweichung" onwurf={uebernehmen} />
    {#snippet knoepfe()}
      <button onclick={() => (phase = 'frage')}>Zurück</button>
    {/snippet}
  </Dialog>
{:else if neu}
  {@const vorher = statwert(alt, d.regeln)}
  {@const nachher = statwert({ rang: neuerRang, wurf: neu }, d.regeln)}
  <Dialog titel="Statrank-Up: {name}">
    <p>Rang {alt.rang} → <strong>{neuerRang}</strong></p>
    <p>Abweichung {alt.wurf ? `${vorzeichen(alt.wurf.positiv - alt.wurf.negativ)}` : '–'} → <strong>{vorzeichen(neu.positiv - neu.negativ)}</strong>
      <span class="hinweis">({wurfText(neu)}, {neu.quelle === 'app' ? 'von der App gewürfelt' : 'von Hand'})</span></p>
    <p>Statwert {vorher ?? '–'} → <strong>{nachher}</strong>{#if vorher !== null && nachher !== null && nachher < vorher} <span class="fehler">(gesunken)</span>{/if}</p>
    {#snippet knoepfe()}
      <button class="betont" onclick={onschliessen}>Fertig</button>
    {/snippet}
  </Dialog>
{/if}
