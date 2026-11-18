<script lang="ts">
  // Nächste Runde (konzept.md § 3.7, Abläufe): Rundenende mit Checkliste der Auslöser und freiwilliger Nerve-Probe,
  // Bericht, dann neue Runde. Die Initiative folgt im Anschluss (App).
  import type { Spieldaten } from '../../daten/typen';
  import { naechsteRunde, standNachRundenende, zustaendeNachRunde } from '../../regeln/gefecht';
  import { anstiegMalsteps, overTheEdge } from '../../regeln/leiter';
  import { gefechtVon, probeStellen } from '../../regeln/probenrechner';
  import type { Charakter, Gefecht, Quelle } from '../../speicher/charakter';
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

  const g = $derived(gefechtVon(c) as Gefecht);
  let ausloeser = $state<string[]>([]);
  $effect.pre(() => { ausloeser = [...(gefechtVon(c)?.ausloeser_diese_runde ?? [])]; });
  let verzichtet = $state(false);
  let ergebnis = $state<ProbenErgebnis | null>(null);
  let bericht = $state<Zeile[] | null>(null);

  const probe = $derived(d.regeln.leiter.proben.nerve_anstieg!);
  const zusatz = $derived(anstiegMalsteps(ausloeser.length, d.regeln));
  const anfrage = $derived({ stat: probe.stat, skill: probe.skill, probe: 'nerve_anstieg', zusatz });
  const moeglich = $derived(probeStellen(c, d, anfrage).wert?.moeglich ?? false);
  const mitProbe = $derived(!g.gesenkt_diese_runde && ausloeser.length > 0);
  const bereit = $derived(!mitProbe || verzichtet || !moeglich || !!ergebnis);
  const probeErgebnis = $derived(mitProbe && moeglich && !verzichtet && ergebnis ? ergebnis.stufe : null);

  function umschalten(id: string) {
    ausloeser = ausloeser.includes(id) ? ausloeser.filter((x) => x !== id) : [...ausloeser, id];
  }

  function weiter() {
    const eingabe = { ausloeser, probe: probeErgebnis };
    const nach = standNachRundenende(c, eingabe, d);
    const namen = d.regeln.leiter.ausloeser.filter((a) => ausloeser.includes(a.id)).map((a) => a.name);
    const zeilen: Zeile[] = [{ text: `Runde ${g.runde} endet.`, fett: true }];
    if (g.gesenkt_diese_runde) zeilen.push({ text: 'Du hast in dieser Runde gesenkt: kein Anstieg, keine Probe.' });
    else if (!namen.length) zeilen.push({ text: 'Keine Auslöser in dieser Runde: keine Probe, die Stufe bleibt.' });
    else {
      zeilen.push({ text: `Auslöser: ${namen.join(', ')}.` });
      if (!moeglich) zeilen.push({ text: `Keine Probe möglich (${malstepsText(ausloeser.length)}): Du steigst.` });
      else if (!probeErgebnis) zeilen.push({ text: 'Du verzichtest auf die Probe und steigst.' });
      else {
        const w = ergebnis!.probe.wert!;
        zeilen.push({ text: `Deine ${mitZeichen('stat', probe.stat, d)}-Probe gegen den Anstieg ist ${ERGEBNIS_SATZ[probeErgebnis]} (${ergebnis!.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(ergebnis!.wurf)}`}, Zielwert ${w.zielwert}, Krit ≤ ${w.krit_schwelle}).` });
      }
    }
    if (nach === g.leiter) zeilen.push({ text: g.leiter === 0 ? 'Du bleibst bei 0.' : `Du bleibst bei ${standText(g.leiter, d)}.` });
    else zeilen.push({ text: `${nach > g.leiter ? 'Du steigst' : 'Du sinkst'} von ${standText(g.leiter, d)} auf ${standText(nach, d)}.`, fett: overTheEdge(nach, d.regeln) });
    if (overTheEdge(nach, d.regeln) && !g.adrenalin4_erreicht)
      zeilen.push({ text: 'Over the Edge: nur 1 Aktion pro Runde. Nach dem Gefecht folgt ein Adrenalinschock.', fett: true });
    // Zustände am Rundenende (Sprengwirkung, Blendung und Reizgas).
    const z = zustaendeNachRunde(g);
    if (g.geblendet_bis && !z.geblendet_bis) zeilen.push({ text: 'Du bist nicht mehr geblendet.' });
    else if (z.geblendet_bis) zeilen.push({ text: z.geblendet_bis === g.runde + 1 ? 'Du bist auch in der nächsten Runde noch geblendet, danach nicht mehr.' : `Du bist noch bis Runde ${z.geblendet_bis} geblendet.` });
    if (g.reizgas?.gereizt && !z.reizgas) zeilen.push({ text: 'Du hast die Reizgaswolke verlassen; du bist nicht mehr gereizt.' });
    else if (z.reizgas?.gereizt) zeilen.push({ text: 'Du stehst noch in der Reizgaswolke und bleibst gereizt.' });
    else if (z.reizgas && !z.reizgas.gasmaske) zeilen.push({ text: 'Du stehst noch in der Reizgaswolke: Zu Beginn deines Zuges legst du eine Grit-Probe ab (Zustand oben antippen).' });
    zeilen.push({ text: `Runde ${g.runde + 1} beginnt. Danach folgt die Initiative.` });
    bericht = zeilen;
  }
</script>

{#if bericht}
  <Bericht titel="Nächste Runde" zeilen={bericht} onweiter={() => onfertig(naechsteRunde(c, { ausloeser, probe: probeErgebnis }, d))}
    onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Ende von Runde {g.runde}">
    {#if g.gesenkt_diese_runde}
      <p><strong>Du hast in dieser Runde gesenkt:</strong> kein Anstieg, keine Probe.</p>
    {:else}
      <div class="gruppe">
      <h3 class="abschnitt-titel">Was ist dir in dieser Runde passiert?</h3>
      <p class="hinweis">Jeder Auslöser zählt einmal.</p>
      <ul class="liste">
        {#each d.regeln.leiter.ausloeser as a (a.id)}
          <li><label class="schalter gross"><input type="checkbox" checked={ausloeser.includes(a.id)} onchange={() => umschalten(a.id)} /> {a.name}</label></li>
        {/each}
      </ul>
      </div>
      {#if mitProbe}
        <h3 class="abschnitt-titel trenner">Nerve-Probe gegen den Anstieg (freiwillig)</h3>
        {#if verzichtet}
          <p>Du verzichtest und steigst. <button class="flach link" onclick={() => (verzichtet = false)}>Doch würfeln</button></p>
        {:else}
          <ProbeKern {c} {d} {anfrage} hinweise={['leiter']} {wuerfelModus} mitAusgang bind:ergebnis {onaendern} />
          {#if moeglich}<button class="breit" onclick={() => (verzichtet = true)}>Verzichten</button>{/if}
        {/if}
      {:else}
        <p class="hinweis">Ohne Auslöser keine Probe; die Stufe bleibt.</p>
      {/if}
    {/if}
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!bereit} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}

<style>
  .liste { list-style: none; margin: 0; padding: 0; }
  .gross input { width: 28px; height: 28px; }
  .trenner { border-top: 1px solid var(--linie); padding-top: var(--abstand-3); }
  .breit { width: 100%; }
</style>
