<script lang="ts">
  // Initiative (konzept.md § 3.7b): Probe auf den Stat aus regeln.json, ohne Skill; die App zeigt, was anzusagen ist.
  import type { Spieldaten } from '../../daten/typen';
  import { initiativeEintragen } from '../../regeln/gefecht';
  import { gefechtVon, initiativeZusatz } from '../../regeln/probenrechner';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onschliessen: () => void;
  }
  let { c, d, wuerfelModus, onaendern, onschliessen }: Props = $props();

  let ergebnis = $state<ProbenErgebnis | null>(null);
  const r = $derived(d.regeln.initiative);
  const runde = $derived(gefechtVon(c)?.runde ?? 1);

  function eintragen() {
    if (!ergebnis) return;
    onaendern(initiativeEintragen(c, { wurf: ergebnis.wurf, stufe: ergebnis.stufe, zielwert: ergebnis.probe.wert?.zielwert ?? 0 }));
    onschliessen();
  }
</script>

<Dialog titel="Initiative · Runde {runde}">
  <ProbeKern {c} {d} anfrage={{ stat: r.stat, skill: r.skill, probe: 'initiative', zusatz: initiativeZusatz(c, d) }}
    hinweise={['initiative']} {wuerfelModus} mitAusgang zielwertAnsagen bind:ergebnis {onaendern} />
  {#if ergebnis?.stufe === 'krit'}
    <p><strong>Krit:</strong> {r.krit_break_extra === 1 ? 'eine zusätzliche Breakaction' : `${r.krit_break_extra} zusätzliche Breakactions`} in dieser Runde.</p>
  {/if}
  <p class="hinweis">Sag Stufe und Wurf an; die Reihenfolge legt die SL fest.</p>
  {#snippet knoepfe()}
    <button onclick={onschliessen}>Später</button>
    <button class="haupt" disabled={!ergebnis} onclick={eintragen}>Eintragen</button>
  {/snippet}
</Dialog>
