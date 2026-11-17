<script lang="ts">
  // Gefecht starten (konzept.md § 3.7, Abläufe): normal oder überrascht → Nerve-Probe → Bericht → Startstufe.
  import type { Spieldaten } from '../../daten/typen';
  import { gefechtStarten } from '../../regeln/gefecht';
  import { overTheEdge, startStand } from '../../regeln/leiter';
  import { initiativeZusatz, lebenslageDes } from '../../regeln/probenrechner';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';
  import { ERGEBNIS_SATZ, malstepsText, mitZeichen, standText, wurfZahl, type Zeile } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, wuerfelModus, onaendern, onfertig, onabbrechen }: Props = $props();

  let ueberrascht = $state(false);
  let ergebnis = $state<ProbenErgebnis | null>(null);
  let bericht = $state<Zeile[] | null>(null);

  const probe = $derived(d.regeln.leiter.proben.nerve_start!);
  const kampfunfaehig = $derived(lebenslageDes(c, d) !== 'einsatzfaehig');

  function weiter() {
    if (!ergebnis) return;
    const nach = gefechtStarten(c, ueberrascht, ergebnis.stufe, d);
    const stand = startStand(ergebnis.stufe, ueberrascht, d.regeln);
    const w = ergebnis.probe.wert!;
    const zeilen: Zeile[] = [
      { text: ueberrascht ? 'Das Gefecht beginnt und überrascht dich.' : 'Das Gefecht beginnt.', fett: true },
      { text: `Deine ${mitZeichen('stat', probe.stat, d)}-Probe ist ${ERGEBNIS_SATZ[ergebnis.stufe]} (${ergebnis.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(ergebnis.wurf)}`}, Zielwert ${w.zielwert}, Krit ≤ ${w.krit_schwelle}).` },
      stand === 0
        ? { text: 'Du startest bei 0, ohne Adrenalin und ohne Ruhepuls.' }
        : { text: `Du startest mit ${standText(stand, d)}.`, fett: overTheEdge(stand, d.regeln) }
    ];
    const zusatz = initiativeZusatz(nach, d);
    if (ueberrascht) {
      zeilen.push({ text: zusatz.length
        ? `In Runde 1 hast du ${malstepsText(zusatz[0]!.malsteps ?? 0)} auf Initiative und Breakaction.`
        : 'Überrascht, aber ohne Malstep auf Initiative und Breakaction (◆ Perk).' });
    }
    zeilen.push({ text: 'Danach folgt die Initiative der ersten Runde.' });
    bericht = zeilen;
  }
</script>

{#if bericht}
  <Bericht titel="Gefecht starten" zeilen={bericht} onweiter={() => ergebnis && onfertig(gefechtStarten(c, ueberrascht, ergebnis.stufe, d))}
    onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Gefecht starten">
    {#if kampfunfaehig}
      <p class="warnung">⚠ kampfunfähig: Im Gefecht hast du keine Aktionen. Die SL entscheidet.</p>
    {/if}
    <div class="auswahl" role="group" aria-label="Beginn des Gefechts">
      <span>Beginn des Gefechts:</span>
      <button class:an={!ueberrascht} aria-pressed={!ueberrascht} onclick={() => (ueberrascht = false)}>normal</button>
      <button class:an={ueberrascht} aria-pressed={ueberrascht} onclick={() => (ueberrascht = true)}>überrascht</button>
    </div>
    <p class="hinweis">Nerve-Probe vor dem Gefecht mit {mitZeichen('skill', probe.skill ?? '', d)}. Umstände trägt die SL als Malsteps ein.
      Krit, gelungen, misslungen: {['krit', 'gelungen', 'misslungen'].map((k) => standText(d.regeln.leiter.start[ueberrascht ? 'ueberrascht' : 'normal']![k as 'krit'], d)).join(' · ')}.</p>
    <ProbeKern {c} {d} anfrage={{ stat: probe.stat, skill: probe.skill, probe: 'nerve_start' }} hinweise={['leiter']} {wuerfelModus}
      mitAusgang bind:ergebnis {onaendern} />
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!ergebnis} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}

<style>
  .auswahl { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .auswahl button.an { border: 2px solid var(--akzent); background: var(--flaeche-2); font-weight: 700; }
  .warnung { color: var(--gefahr); font-weight: 700; }
</style>
