<script lang="ts">
  // Senken und Verbündete verschieben (konzept.md § 3.7; Regelwerk: Adrenalin, Senken; Verbündete verschieben).
  // Senken ändert den eigenen Stand (mit Bericht); Verschieben zeigt nur, um wie viel der Verbündete sich verschiebt.
  import type { Spieldaten } from '../../daten/typen';
  import { protokolliere, verbrauchen } from '../../regeln/aktionen';
  import { senkenEintragen } from '../../regeln/gefecht';
  import { senken, verschiebung } from '../../regeln/leiter';
  import { leiterStand } from '../../regeln/probenrechner';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';
  import { ERGEBNIS_SATZ, mitZeichen, standText, wurfZahl, type Zeile } from '../texte';

  interface Props {
    art: 'senken' | 'verschieben';
    c: Charakter;
    d: Spieldaten;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onschliessen: () => void;
  }
  let { art, c, d, wuerfelModus, onaendern, onfertig, onschliessen }: Props = $props();

  let ergebnis = $state<ProbenErgebnis | null>(null);
  let bericht = $state<Zeile[] | null>(null);
  const probenart = $derived(art === 'senken' ? 'nerve_senken' : 'verschieben');
  const probe = $derived(d.regeln.leiter.proben[probenart]!);
  const stand = $derived(leiterStand(c));
  const stufen = (n: number) => (n === 1 ? '1 Stufe' : `${n} Stufen`);

  function weiter() {
    if (!ergebnis) return;
    const nach = senken(stand, ergebnis.stufe, d.regeln);
    const w = ergebnis.probe.wert!;
    bericht = [
      { text: 'Du versuchst, dich zu beruhigen (Mainaction).', fett: true },
      { text: `Deine ${mitZeichen('stat', probe.stat, d)}-Probe ist ${ERGEBNIS_SATZ[ergebnis.stufe]} (${ergebnis.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(ergebnis.wurf)}`}, Zielwert ${w.zielwert}, Krit ≤ ${w.krit_schwelle}).` },
      nach === stand ? { text: `Du bleibst bei ${standText(stand, d)}.` } : { text: `Du sinkst von ${standText(stand, d)} auf ${standText(nach, d)}.` },
      { text: 'Am Ende dieser Runde steigst du nicht.' },
      { text: 'Main −1.' }
    ];
  }
</script>

{#if bericht}
  <Bericht titel="Senken" zeilen={bericht} onweiter={() => ergebnis && onfertig(senkenEintragen(c, ergebnis.stufe, d))} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel={art === 'senken' ? 'Senken' : 'Verbündete verschieben'}>
    {#if art === 'senken'}
      <p class="hinweis">Mainaction. Gelungen: {stufen(-d.regeln.leiter.senken.gelungen)} tiefer, Krit: {stufen(-d.regeln.leiter.senken.krit)}. Auch in den Ruhepuls.
        Ob gelungen oder nicht: Am Ende dieser Runde steigst du nicht.</p>
    {:else}
      <p class="hinweis">Mainaction. Der Verbündete muss dich hören können, auch über Funk. Gelungen: {stufen(d.regeln.leiter.verschieben.gelungen)},
        Krit: {stufen(d.regeln.leiter.verschieben.krit)}; du wählst, ob er steigt oder sinkt.</p>
    {/if}
    <ProbeKern {c} {d} anfrage={{ stat: probe.stat, skill: probe.skill, probe: probenart }} hinweise={['leiter']} {wuerfelModus}
      mitAusgang bind:ergebnis {onaendern} />
    {#if art === 'verschieben' && ergebnis}
      {@const n = verschiebung(ergebnis.stufe, d.regeln)}
      <p class="ergebnis">{n ? `Du verschiebst einen Verbündeten um ${stufen(n)}, nach oben oder unten.` : 'Der Verbündete bleibt, wo er ist.'}</p>
    {/if}
    {#snippet knoepfe()}
      {#if art === 'senken'}
        <button onclick={onschliessen}>Abbrechen</button>
        <button class="haupt" disabled={!ergebnis} onclick={weiter}>Weiter</button>
      {:else}
        <button onclick={onschliessen}>Abbrechen</button>
        <button class="haupt" disabled={!ergebnis} onclick={() => onfertig(protokolliere(verbrauchen(c, 'main'), 'Verbündete verschieben'))}>Ausgeführt (Main −1)</button>
      {/if}
    {/snippet}
  </Dialog>
{/if}

<style>
  .ergebnis { font-weight: 400; }
</style>
