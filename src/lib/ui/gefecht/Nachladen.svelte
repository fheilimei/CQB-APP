<script lang="ts">
  // Nachladen (konzept.md § 3.8; Regelwerk: Kampfsystem, Nachladen). Ablauf nach Ladeart: Magazin aus der Reserve
  // (vorgewählt das vollste), Schnelllader/Ladestreifen, einzeln laden (leichte Konzentration), Werfer (volle Konzentration).
  // Im Gefecht kostet es die Main (mit Perk auch Break), außerhalb des Gefechts nichts.
  import type { Spieldaten } from '../../daten/typen';
  import { konzentrationMoeglich, konzentrationSetzen, protokolliere, verbrauchen } from '../../regeln/aktionen';
  import {
    eintragErsetzen, einzelnLaden, kapazitaet, magazinWechseln, mitZubehoerLaden, nachladearten, nachladenAlsBreak,
    nachladenKonzentration, sprengwaffe, waffeVon, werferLaden, type Nachladeart
  } from '../../regeln/waffen';
  import type { Charakter } from '../../speicher/charakter';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import { AKTION_NAME, patronenText, type Zeile } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    eintragId: string;
    /** Aktion, die das Nachladen verbraucht; null = außerhalb des Gefechts. */
    als: 'main' | 'break' | null;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, eintragId, als, onfertig, onabbrechen }: Props = $props();

  const e = $derived(c.ausruestung.waffen.find((x) => x.id === eintragId)!);
  const w = $derived(waffeVon(e, d));
  const arten = $derived(nachladearten(c, e, d).filter((a) => als !== 'break' || nachladenAlsBreak(c, a.art, d)));
  let gewaehlt = $state<number>(0);
  let magazin = $state<number | null>(null);
  let einzeln = $state<number | null>(null);
  let geschoss = $state<string | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const art = $derived<Nachladeart | undefined>(arten[gewaehlt]);
  const konz = $derived(art && als ? nachladenKonzentration(art.art, d) : null);
  const gesperrt = $derived(!!konz && !konzentrationMoeglich(c));
  const artName: Record<Nachladeart['art'], string> = { magazin: 'Magazin wechseln', zubehoer: '', einzeln: 'Einzeln laden', werfer: 'Werfer laden' };
  const zubehoerName = (id: string) => d.aufsaetze.zubehoer.find((z) => z.id === id)?.name ?? id;

  function weiter() {
    if (!art) return;
    const zeilen: Zeile[] = [];
    let nach: Charakter;
    const vorher = e.im_magazin;
    switch (art.art) {
      case 'magazin': {
        const i = magazin ?? art.vorwahl;
        const neu = magazinWechseln(e, i, d);
        nach = eintragErsetzen(c, neu);
        zeilen.push({ text: `Du setzt ein Magazin mit ${patronenText(e.reserve[i]!)} ein.`, fett: true });
        zeilen.push({ text: `In der Waffe: ${vorher} → ${neu.im_magazin}.` });
        const imLauf = w.patrone_im_lauf && vorher > 0 ? 1 : 0;
        if (vorher - imLauf > 0) zeilen.push({ text: `Das alte Magazin kommt mit ${patronenText(vorher - imLauf)} in die Reserve.` });
        else if (vorher > 0) zeilen.push({ text: 'Das alte Magazin war leer; die Patrone im Lauf bleibt in der Waffe.' });
        zeilen.push({ text: `Ersatzmagazine: ${neu.reserve.length ? neu.reserve.join(' · ') : 'keine mehr'}.` });
        break;
      }
      case 'zubehoer': {
        const neu = mitZubehoerLaden(e, art.zubehoer, d);
        nach = eintragErsetzen(c, neu);
        zeilen.push({ text: `Du lädst mit ${zubehoerName(art.zubehoer)}.`, fett: true });
        zeilen.push({ text: `In der Waffe: ${vorher} → ${neu.im_magazin}.` });
        if (vorher) zeilen.push({ text: `${patronenText(vorher)} aus der Waffe kommen zu den losen Patronen.` });
        break;
      }
      case 'einzeln': {
        const n = einzeln ?? art.patronen;
        const neu = einzelnLaden(e, n, d);
        nach = eintragErsetzen(c, neu);
        zeilen.push({ text: `Du lädst ${patronenText(neu.im_magazin - vorher)} einzeln.`, fett: true });
        zeilen.push({ text: `In der Waffe: ${vorher} → ${neu.im_magazin} von ${kapazitaet(e, d)}. Lose Patronen: ${neu.lose_patronen}.` });
        if (als) zeilen.push({ text: 'Wirst du unterbrochen, fehlen nur die Patronen dieser Runde.' });
        break;
      }
      case 'werfer': {
        const id = geschoss ?? art.geschosse[0]!.id;
        nach = werferLaden(c, e, id);
        zeilen.push({ text: `Du lädst ${sprengwaffe(id, d)?.name ?? id}.`, fett: true });
        zeilen.push({ text: `Vorrat: ${art.geschosse.find((g) => g.id === id)!.anzahl} → ${art.geschosse.find((g) => g.id === id)!.anzahl - 1}.` });
        break;
      }
    }
    if (als) {
      nach = verbrauchen(nach, als);
      zeilen.push({ text: `${AKTION_NAME[als]} −1.` });
      if (konz) {
        nach = konzentrationSetzen(nach, konz);
        zeilen.push({ text: `Konzentration (${konz}): In dieser Runde keine Breakaction mehr${konz === 'voll' ? ', keine Bewegung und kein Standwechsel' : ', höchstens Gehen'}.` });
      }
      nach = protokolliere(nach, `${w.name}: ${zeilen[0]!.text}`);
    }
    bericht = { zeilen, nach };
  }
</script>

{#if bericht}
  <Bericht titel="Nachladen" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Nachladen: {w.name}">
    {#if !arten.length}
      <p class="fehler">Nichts zum Nachladen da{als === 'break' ? ' (als Breakaction nur mit Magazin, Schnelllader oder Ladestreifen)' : ''}.</p>
      <p class="hinweis">Ersatzmagazine, lose Patronen und Geschosse trägst du im Reiter Ausrüstung ein.</p>
    {:else}
      {#if arten.length > 1}
        <div class="wahl" role="group" aria-label="Art">
          {#each arten as a, i (i)}
            <button class:an={gewaehlt === i} aria-pressed={gewaehlt === i} onclick={() => (gewaehlt = i)}>
              {a.art === 'zubehoer' ? zubehoerName(a.zubehoer) : artName[a.art]}</button>
          {/each}
        </div>
      {/if}
      {#if art?.art === 'magazin'}
        <p>Welches Magazin?</p>
        <div class="wahl" role="group" aria-label="Magazin">
          {#each e.reserve as n, i (i)}
            <button class:an={(magazin ?? art.vorwahl) === i} aria-pressed={(magazin ?? art.vorwahl) === i} onclick={() => (magazin = i)}>{n}</button>
          {/each}
        </div>
      {:else if art?.art === 'einzeln'}
        <p>Wie viele Patronen? (höchstens {art.patronen} pro Mainaction)</p>
        <div class="wahl" role="group" aria-label="Patronen">
          {#each Array.from({ length: art.patronen }, (_, i) => i + 1) as n (n)}
            <button class:an={(einzeln ?? art.patronen) === n} aria-pressed={(einzeln ?? art.patronen) === n} onclick={() => (einzeln = n)}>{n}</button>
          {/each}
        </div>
      {:else if art?.art === 'werfer'}
        <p>Welches Geschoss?</p>
        <div class="wahl" role="group" aria-label="Geschoss">
          {#each art.geschosse as g (g.id)}
            <button class:an={(geschoss ?? art.geschosse[0]!.id) === g.id} aria-pressed={(geschoss ?? art.geschosse[0]!.id) === g.id}
              onclick={() => (geschoss = g.id)}>{sprengwaffe(g.id, d)?.name ?? g.id} ({g.anzahl})</button>
          {/each}
        </div>
      {:else if art?.art === 'zubehoer'}
        <p>{zubehoerName(art.zubehoer)}: {art.gefuellt} gefüllt. Füllt die Waffe auf einmal.</p>
      {/if}
      {#if als}
        <p class="hinweis">Kostet {AKTION_NAME[als]}{konz ? ` mit Konzentration (${konz})` : ''}.</p>
      {:else}
        <p class="hinweis">Außerhalb des Gefechts kostet Nachladen keine Aktion.</p>
      {/if}
      {#if gesperrt}<p class="fehler">Konzentration geht nicht mehr: Du hast in dieser Runde schon eine Breakaction eingesetzt.</p>{/if}
    {/if}
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!art || gesperrt} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}

<style>
  .wahl { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .wahl button.an { border: 2px solid var(--akzent); background: var(--flaeche-2); font-weight: 700; }
</style>
