<script lang="ts">
  // Nachladen (konzept.md § 3.8; Regelwerk: Kampfsystem, Nachladen). Ablauf nach Ladeart: eines der passenden Magazine
  // (vorgewählt das vollste vom bisherigen Typ), Schnelllader/Ladestreifen, einzeln laden (leichte Konzentration; nur ein
  // Typ je Ladung), Werfer (volle Konzentration).
  // Im Gefecht kostet es die Main (mit Perk auch Break), außerhalb des Gefechts nichts.
  import type { Spieldaten } from '../../daten/typen';
  import { konzentrationMoeglich, konzentrationSetzen, protokolliere, verbrauchen } from '../../regeln/aktionen';
  import {
    einzelnLaden, kapazitaet, magazineFuer, magazinSorte, magazinWechseln, mitLaderLaden, nachladearten, nachladenAlsBreak,
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
  let typ = $state<string | null>(null);
  let geschoss = $state<string | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const art = $derived<Nachladeart | undefined>(arten[gewaehlt]);
  const konz = $derived(art && als ? nachladenKonzentration(art.art, d) : null);
  const gesperrt = $derived(!!konz && !konzentrationMoeglich(c));
  const artName: Record<Nachladeart['art'], string> = { magazin: 'Magazin wechseln', lader: '', einzeln: 'Einzeln laden', werfer: 'Werfer laden' };
  const sorteName = (id: string) => magazinSorte(id, d)?.name ?? id;
  /** Volle bzw. angebrochene passende Magazine (zur Auswahl). */
  const volle = $derived(magazineFuer(c, e, d).filter((x) => x.m.inhalt > 0));
  /** Mehrere Sorten passen: dann steht die Sorte mit am Knopf. */
  const mehrereSorten = $derived(new Set(volle.map((x) => x.m.id)).size > 1);
  const ersatzText = (n: Charakter) => {
    const m = magazineFuer(n, n.ausruestung.waffen.find((x) => x.id === eintragId)!, d).filter((x) => x.m.inhalt > 0);
    return m.length ? `noch ${m.length} gefüllt` : 'keins mehr gefüllt';
  };
  const einzelnTyp = $derived(art?.art === 'einzeln' ? (art.typen.find((t) => t.typ === typ) ?? art.typen[0]!) : null);

  function weiter() {
    if (!art) return;
    const zeilen: Zeile[] = [];
    let nach: Charakter;
    const vorher = e.im_magazin;
    switch (art.art) {
      case 'magazin': {
        const i = magazin ?? art.vorwahl;
        const m = c.ausruestung.magazine[i]!;
        nach = magazinWechseln(c, e, i, d);
        const neu = nach.ausruestung.waffen.find((x) => x.id === e.id)!;
        zeilen.push({ text: `Du setzt ein ${sorteName(m.id)} mit ${patronenText(m.inhalt)} ${m.typ} ein.`, fett: true });
        zeilen.push({ text: `In der Waffe: ${vorher} → ${neu.im_magazin}.` });
        const imLauf = w.patrone_im_lauf && vorher > 0 ? 1 : 0;
        if (vorher - imLauf > 0) zeilen.push({ text: `Das alte Magazin steckst du mit ${patronenText(vorher - imLauf)} ${e.munitionstyp} ein.` });
        else if (vorher > 0) zeilen.push({ text: `Das alte Magazin war leer; die Patrone im Lauf bleibt in der Waffe${e.munitionstyp !== m.typ ? ` (${e.munitionstyp})` : ''}.` });
        zeilen.push({ text: `Passende Magazine: ${ersatzText(nach)}.` });
        break;
      }
      case 'lader': {
        nach = mitLaderLaden(c, e, art.sorte, art.typ, d);
        const neu = nach.ausruestung.waffen.find((x) => x.id === e.id)!;
        zeilen.push({ text: `Du lädst mit ${sorteName(art.sorte)} (${art.typ}).`, fett: true });
        zeilen.push({ text: `In der Waffe: ${vorher} → ${neu.im_magazin}.` });
        if (vorher) zeilen.push({ text: `${patronenText(vorher)} ${e.munitionstyp} aus der Waffe kommen zur losen Munition.` });
        break;
      }
      case 'einzeln': {
        const n = einzeln ?? art.patronen;
        const t = einzelnTyp!.typ;
        nach = einzelnLaden(c, e, n, t, d);
        const neu = nach.ausruestung.waffen.find((x) => x.id === e.id)!;
        zeilen.push({ text: `Du lädst ${patronenText(neu.im_magazin - vorher)} ${t} einzeln.`, fett: true });
        zeilen.push({ text: `In der Waffe: ${vorher} → ${neu.im_magazin} von ${kapazitaet(e, d)}. Lose ${t}: ${einzelnTyp!.anzahl} → ${einzelnTyp!.anzahl - (neu.im_magazin - vorher)}.` });
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
      <p class="hinweis">Magazine füllst du im Reiter Ausrüstung; lose Munition, Magazine und Geschosse kaufst du im Laden.</p>
    {:else}
      {#if arten.length > 1}
        <div class="auswahlreihe" role="group" aria-label="Art">
          {#each arten as a, i (i)}
            <button aria-pressed={gewaehlt === i} onclick={() => (gewaehlt = i)}>
              {a.art === 'lader' ? `${sorteName(a.sorte)} ${a.typ}` : artName[a.art]}</button>
          {/each}
        </div>
      {/if}
      {#if art?.art === 'magazin'}
        <div class="gruppe" role="group" aria-label="Magazin">
        <span class="gruppe-titel">Welches Magazin?</span>
        <div class="auswahlreihe">
          {#each volle as { index, m } (index)}
            <button aria-pressed={(magazin ?? art.vorwahl) === index} onclick={() => (magazin = index)}>{m.inhalt} {m.typ}{#if mehrereSorten}<small>{sorteName(m.id)}</small>{/if}</button>
          {/each}
        </div>
        </div>
      {:else if art?.art === 'einzeln'}
        <div class="gruppe" role="group" aria-label="Munitionstyp">
        <span class="gruppe-titel">Munition: {einzelnTyp?.typ}</span>
        {#if art.typen.length > 1}
          <div class="auswahlreihe">
            {#each art.typen as t (t.typ)}
              <button aria-pressed={einzelnTyp?.typ === t.typ} onclick={() => (typ = t.typ)}>{t.typ} ({t.anzahl})</button>
            {/each}
          </div>
        {:else if e.im_magazin > 0}
          <p class="hinweis">In der Waffe steckt {e.munitionstyp}; einen anderen Typ lädst du erst, wenn sie leer ist.</p>
        {/if}
        </div>
        <div class="gruppe" role="group" aria-label="Patronen">
        <span class="gruppe-titel">Wie viele Patronen? (höchstens {art.patronen} pro Mainaction)</span>
        <div class="auswahlreihe">
          {#each Array.from({ length: art.patronen }, (_, i) => i + 1) as n (n)}
            <button aria-pressed={(einzeln ?? art.patronen) === n} onclick={() => (einzeln = n)}>{n}</button>
          {/each}
        </div>
        </div>
      {:else if art?.art === 'werfer'}
        <div class="gruppe" role="group" aria-label="Geschoss">
        <span class="gruppe-titel">Welches Geschoss?</span>
        <div class="auswahlreihe">
          {#each art.geschosse as g (g.id)}
            <button aria-pressed={(geschoss ?? art.geschosse[0]!.id) === g.id}
              onclick={() => (geschoss = g.id)}>{sprengwaffe(g.id, d)?.name ?? g.id} ({g.anzahl})</button>
          {/each}
        </div>
        </div>
      {:else if art?.art === 'lader'}
        <p>{sorteName(art.sorte)} mit {art.typ}: {art.gefuellt} gefüllt. Füllt die Waffe auf einmal.</p>
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
