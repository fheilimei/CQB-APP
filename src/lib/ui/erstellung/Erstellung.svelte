<script lang="ts">
  // Geführte Charaktererstellung (konzept.md § 3.0): ein Bildschirm pro Schritt, oben die Fortschrittsleiste,
  // unten Zurück und Weiter. „Weiter“ nennt, was noch fehlt. Jede Änderung wird sofort gespeichert.
  import { untrack } from 'svelte';
  import type { Spieldaten } from '../../daten/typen';
  import { erstellungAbschliessen, erstellungAnwenden, erstellungsklasse, postenText, rueckzahlung, schrittFehlt, startgeld } from '../../regeln/erstellung';
  import { statwert } from '../../regeln/probe';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Bericht from '../Bericht.svelte';
  import { fehltText, geld, type Zeile, klasseName, laufbahnName, perkName, punkte, skillName, statName, stufeName } from '../texte';
  import SchrittAbweichung from './SchrittAbweichung.svelte';
  import SchrittAusruestung from './SchrittAusruestung.svelte';
  import SchrittHintergrund from './SchrittHintergrund.svelte';
  import SchrittKlasse from './SchrittKlasse.svelte';
  import SchrittPunkte from './SchrittPunkte.svelte';
  import SchrittRaenge from './SchrittRaenge.svelte';
  import SchrittSkills from './SchrittSkills.svelte';

  interface Props {
    start: Charakter;
    d: Spieldaten;
    abweichungModus: Quelle;
    onspeichern: (c: Charakter) => void;
    onverlassen: () => void;
    onfertig: (c: Charakter) => void;
  }
  let p: Props = $props();
  let c = $state<Charakter>(untrack(() => $state.snapshot(p.start) as Charakter));
  const d = $derived(p.d);

  const SCHRITTE = ['Klasse', 'Ränge', 'Abweichung', 'Skills', 'Punkte', 'Hintergrund', 'Ausrüstung'];
  const schritt = $derived(c.erstellung!.schritt);
  const fehlt = $derived(schrittFehlt(c, schritt, d));
  const erledigt = $derived(SCHRITTE.map((_, i) => schrittFehlt(c, i + 1, d).length === 0));
  /** Ein Schritt ist erreichbar, wenn alle davor erledigt sind. */
  const erreichbar = (s: number) => erledigt.slice(0, s - 1).every(Boolean);
  let bericht = $state<Zeile[] | null>(null);
  let inhalt: HTMLElement | undefined = $state();

  $effect(() => {
    const kopie = $state.snapshot(c) as Charakter;
    untrack(() => p.onspeichern(kopie));
  });

  function gehe(s: number) {
    c.erstellung!.schritt = s;
    inhalt?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }
  function weiter() {
    if (fehlt.length) return;
    if (schritt < SCHRITTE.length) gehe(schritt + 1);
    else bericht = abschlussBericht();
  }
  function zurueck() {
    if (schritt > 1) gehe(schritt - 1);
    else p.onverlassen();
  }

  function abschlussBericht(): Zeile[] {
    const x = erstellungAnwenden(c, d).charakter;
    const k = erstellungsklasse(c.erstellung!, d);
    const sg = startgeld(c, d);
    const s = c.hintergrund.schulden;
    const skills = Object.entries(x.skills).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    return [
      { text: `${c.name} ist fertig.`, fett: true },
      { text: k ? `Klasse: ${k.name} (${stufeName(k.stufe, d)}, ${laufbahnName(k.laufbahn, d)}). Weg: ${x.klassenweg.map((w) => klasseName(w.klasse, d)).join(' → ')}.` : 'Ohne Klasse.' },
      { text: `■ Stats: ${d.stats.eintraege.map((st) => `${st.name} ${statwert(x.stats[st.id], d.regeln)}`).join(', ')}.` },
      { text: `⬢ Skills: ${skills.length ? skills.map(([id, v]) => `${skillName(id, d)} ${v}`).join(', ') : 'keine'}.` },
      { text: `◆ Perks: ${x.perks.length ? x.perks.map((id) => perkName(id, d)).join(', ') : 'keine'}.` },
      { text: `Freie Punkte übrig: ${punkte(x.freie_punkte)}. Sie bleiben dir erhalten.` },
      { text: `Startgeld ${geld(sg.summe)} (${sg.posten.map(postenText).join(' + ')}) wird ins Kassenbuch gebucht.` },
      ...(s ? [{ text: `Du schuldest ${s.glaeubiger || 'deinem Gläubiger'} ${geld(rueckzahlung(s.groesse, d))}; Frist: ${s.frist_auftraege} Aufträge.` }] : []),
      { text: 'Danach änderst du Werte nur noch im Aufstiegs- oder Schreibmodus (Menü).' }
    ];
  }
  function abschliessen() {
    const fertig = erstellungAbschliessen($state.snapshot(c) as Charakter, d);
    bericht = null;
    p.onfertig(fertig);
  }
</script>

<div class="erstellung">
  <header>
    <div class="titel"><strong>{c.name || 'Neuer Charakter'}</strong><span class="status">Erstellung</span></div>
    <ol class="fortschritt" aria-label="Schritte der Erstellung">
      {#each SCHRITTE as name, i (name)}
        {@const s = i + 1}
        <li>
          <button class="flach" class:aktuell={s === schritt} class:fertig={erledigt[i] && s !== schritt}
            aria-current={s === schritt ? 'step' : undefined} disabled={!erreichbar(s)} onclick={() => gehe(s)}
            aria-label="Schritt {s}: {name}{erledigt[i] ? ', erledigt' : ''}">
            <span class="punkt">{erledigt[i] && s !== schritt ? '✓' : s}</span>
          </button>
        </li>
      {/each}
    </ol>
    <h2>{schritt}. {SCHRITTE[schritt - 1]}</h2>
  </header>

  <main class="inhalt" bind:this={inhalt}>
    {#if schritt === 1}<SchrittKlasse bind:c {d} />
    {:else if schritt === 2}<SchrittRaenge bind:c {d} abweichungModus={p.abweichungModus} />
    {:else if schritt === 3}<SchrittAbweichung bind:c {d} abweichungModus={p.abweichungModus} />
    {:else if schritt === 4}<SchrittSkills bind:c {d} />
    {:else if schritt === 5}<SchrittPunkte bind:c {d} abweichungModus={p.abweichungModus} />
    {:else if schritt === 6}<SchrittHintergrund bind:c {d} />
    {:else}<SchrittAusruestung {c} {d} />{/if}
  </main>

  <footer>
    <button onclick={zurueck}>{schritt === 1 ? 'Später' : 'Zurück'}</button>
    <button class="haupt" class:fehlt={fehlt.length > 0} aria-disabled={fehlt.length > 0} onclick={weiter}>
      {fehlt.length ? fehltText(fehlt[0]!, d) : schritt === SCHRITTE.length ? 'Abschließen' : 'Weiter'}
    </button>
  </footer>
</div>

{#if bericht}
  <Bericht titel="Erstellung abschließen" zeilen={bericht} weiter="Abschließen" onweiter={abschliessen} onzurueck={() => (bericht = null)} />
{/if}

<style>
  .erstellung { flex: 1; display: flex; flex-direction: column; }
  header { padding: calc(8px + env(safe-area-inset-top)) 16px 0; background: var(--flaeche); border-bottom: 1px solid var(--linie); }
  .titel { display: flex; align-items: center; gap: 8px; }
  .status { font-size: 0.8rem; padding: 2px 8px; border-radius: 999px; background: var(--flaeche-2); color: var(--text-2); }
  .fortschritt { list-style: none; display: grid; grid-template-columns: repeat(7, 1fr); margin: 8px 0 0; padding: 0; }
  .fortschritt button { width: 100%; padding: 0; min-width: 0; }
  .punkt { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%;
    border: 2px solid var(--linie); font-size: 0.85rem; font-weight: 600; }
  .aktuell .punkt { border-color: var(--akzent); background: var(--akzent); color: var(--akzent-text); }
  .fertig .punkt { border-color: var(--ok); color: var(--ok); }
  h2 { margin: var(--abstand-1) 0 var(--abstand-2); font-size: 1.15rem; }
  .inhalt { flex: 1; padding: var(--abstand-3) var(--abstand-3) var(--abstand-4); display: flex; flex-direction: column; gap: var(--abstand-3); }
  .inhalt > :global(*) { margin: 0; }
  footer { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--linie); background: var(--flaeche); position: sticky; bottom: 0; z-index: 5; }
  footer .fehlt { background: var(--flaeche-2); color: var(--text); font-weight: 500; }
</style>
