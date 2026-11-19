<script lang="ts">
  // Reiter Figur (konzept.md § Aufbau der App): HP, Silhouette mit Rüstung und Wunden. Antippen einer Zone zeigt darunter
  // ihre Übersicht (Rüstung, Deckung, Wunden mit Status, Frist und Folge; Versorgen und „Frist abgelaufen“).
  // Rechts neben der Figur: oben Stand und Bewegung (Gefecht), darunter aktive Zustände (Zustandsanzeige), unten Deckung, Ereignis (nur im Gefecht) und Getroffen (Deckung und Getroffen im Gefecht und in Ruhe). Verdeckte Zonen sind schraffiert.
  import type { Spieldaten } from '../daten/typen';
  import { grundwerte, hpAktuell } from '../regeln/modifikatoren';
  import { gefechtVon, lebenslageDes } from '../regeln/probenrechner';
  import { ruestungswert } from '../regeln/schaden';
  import { deckungFuer, gehaltenerSchild } from '../regeln/wunden';
  import { blutet, massnahmenFuer } from '../regeln/blutung';
  import { nachsorgeMoeglich } from '../regeln/heilung';
  import { wundStatus } from './verlauf';
  import type { Charakter, Wunde } from '../speicher/charakter';
  import Haltungsanzeige from './Haltungsanzeige.svelte';
  import Silhouette from './Silhouette.svelte';
  import Zustandsanzeige from './Zustandsanzeige.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    ongetroffen: () => void;
    ondeckung: () => void;
    onereignis: () => void;
    onversorgen: (wundId: string) => void;
    onfrist: (wundId: string) => void;
    /** Nachsorge einer versorgten Wunde (nur in Ruhe). */
    onnachsorge: (wundId: string) => void;
    /** Ruhe: Nacht oder Ruhetag (nur in Ruhe). */
    onruhe: () => void;
    kampfunfaehig: boolean;
    ongefechtstart: () => void;
    onnaechsteRunde: () => void;
    ongefechtende: () => void;
    /** Antippen eines Zustands neben der Figur. */
    onschock: () => void;
    ongeblendet: () => void;
    onreizgas: () => void;
  }
  let { c, d, ongetroffen, ondeckung, onereignis, onversorgen, onfrist, onnachsorge, onruhe, kampfunfaehig, ongefechtstart, onnaechsteRunde, ongefechtende, onschock, ongeblendet, onreizgas }: Props = $props();

  let zone = $state<string | null>(null);
  /** Bildzeichen Mauer (Deckung), auf dem Knopf Deckung und in der Übersicht der Zone. */
  const MAUER = 'M1 3h6v3H1zM8 3h7v3H8zM1 7h3v3H1zM5 7h6v3H5zM12 7h3v3h-3zM1 11h6v3H1zM8 11h7v3H8z';

  const hp = $derived(hpAktuell(c, d));
  const hpMax = $derived(grundwerte(c, d).hp);
  const lage = $derived(lebenslageDes(c, d));
  const imGefecht = $derived(!!gefechtVon(c));
  const ruestung = $derived(Object.fromEntries(d.koerperzonen.eintraege.map((z) => [z.id, ruestungswert(z.id, c.ausruestung.ruestung.map((t) => t.id), d)])));
  const wunden = $derived(c.spielstand.wunden);
  const prellungen = $derived(c.spielstand.prellungen);
  const gewaehlt = $derived(d.koerperzonen.eintraege.find((z) => z.id === zone) ?? null);
  /** Wunden der Zone; Wunden am Rumpf (nach Ansage) zeigt die Figur am Bauch, also auch hier. */
  const zonenWunden = $derived(zone ? wunden.filter((w) => w.zone === zone || (w.zone === 'rumpf' && zone === 'bauch')) : []);
  const deckung = $derived(zone ? deckungFuer(zone, c, d) : null);
  const deckungJetzt = $derived(c.spielstand.deckung ?? null);
  /** Deckung und Schild in der Hand zusammen, je Zone der höhere Wert (R37). */
  const schild = $derived(gehaltenerSchild(c, d));
  const deckungJeZone = $derived(Object.fromEntries(d.koerperzonen.eintraege.flatMap((z) => { const w = deckungFuer(z.id, c, d); return w === null ? [] : [[z.id, w]]; })) as Record<string, number>);
  const nurSchild = $derived(zone !== null && schild !== null && deckung === schild.deckung && deckungFuer(zone, c, d, { schild: false }) !== deckung);
  const deckungName = $derived(deckungJetzt?.art ? [...d.schutz.deckung, ...d.schutz.fahrzeugpanzerung].find((x) => x.id === deckungJetzt.art)?.name ?? null : null);
  const zonenName = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.name ?? id;
  /** Nach dem Gefecht laufen die Fristen der blutenden Wunden. Regelfrage R29 (docs/offen.md): vorläufig auch bei Wunden aus einem Treffer in Ruhe sofort. */
  const blutend = $derived(imGefecht ? 0 : wunden.filter(blutet).length);

  const status = (w: Wunde) => wundStatus(w, d, imGefecht);
  function folge(w: Wunde): string {
    const z = d.koerperzonen.eintraege.find((x) => x.id === w.zone);
    return (w.kritisch ? z?.krit.text : z?.normal.text) ?? '';
  }
</script>

<section class="karte">
  <div class="hp" aria-label="Lebenspunkte {hp} von {hpMax}">
    <div class="hp-zeile">
      <span class="zahl"><strong>HP {hp}</strong> / {hpMax}</span>
      <div class="balken"><div class="fuellung" class:niedrig={hp <= hpMax / 4} style:width="{Math.max(0, Math.min(1, hp / hpMax)) * 100}%"></div></div>
    </div>
    {#if blutend}
      <small class="warnung">{blutend === 1 ? 'Eine Wunde blutet' : `${blutend} Wunden bluten`}. Tippe die rote Stelle an, um zu versorgen.</small>
    {/if}
    {#if prellungen}
      <small class="hinweis">davon {prellungen} durch Prellungen, zurück nach einer Nacht Ruhe</small>
    {/if}
  </div>
  {#if lage === 'tot'}
    <p class="warnung">tot</p>
  {:else if lage === 'kampfunfaehig'}
    <p class="warnung">kampfunfähig: im Gefecht keine Aktionen</p>
  {/if}
  <div class="figurbox">
    <div class="figurplatz">
      <Silhouette {d} {ruestung} {wunden} verdeckt={Object.keys(deckungJeZone)} deckungswerte={deckungJeZone} gewaehlt={zone} onwahl={(z) => (zone = zone === z ? null : z)}
        knapp beschriftung="Körperbild mit Rüstung und Wunden; Zone antippen für Einzelheiten" />
    </div>
    <div class="seite">
      {#if gefechtVon(c)}
        <Haltungsanzeige g={gefechtVon(c)!} {d} />
      {/if}
      <Zustandsanzeige {c} {d} {onschock} {ongeblendet} {onreizgas} />
      {#if schild}
        <!-- Schild in der Hand: Zustand als Bildzeichen neben der Figur (Wappenschild, dünne Linie), wenig Text. -->
        <p class="schildmarke" title="{schild.name} in der Hand, Deckung {schild.deckung} von vorn">
          <svg class="zeichen" viewBox="0 0 16 16" aria-hidden="true"><path class="linie" d="M8 1.5l5.5 2v4c0 3.6-2.6 6-5.5 7-2.9-1-5.5-3.4-5.5-7v-4z" /></svg>
          Schild
        </p>
      {/if}
      <div class="knoepfe">
        <!-- Bildzeichen: Mauer für Deckung, Ausrufezeichen für Ereignis, Einschlag für Getroffen. -->
        <!-- Beide Knöpfe öffnen nur einen Dialog; ob man in Deckung oder getroffen ist, zeigt die Figur (Schraffur mit Mauer und Zahl, Wunden). -->
        <button onclick={ondeckung} aria-label={deckungJetzt ? `Deckung mit Schutz ${deckungJetzt.wert} ändern` : 'Deckung eintragen'}>
          <svg class="zeichen" viewBox="0 0 16 16" aria-hidden="true"><path d={MAUER} /></svg>
          Deckung
        </button>
        <!-- Ereignis nur im Gefecht: es setzt nur Auslöser für das Rundenende, die es in Ruhe nicht gibt. Zeichen: Ausrufezeichen. -->
        {#if imGefecht}
          <button onclick={onereignis}>
            <svg class="zeichen" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 1h3l-.6 9.5H7.1z" /><circle cx="8" cy="13.5" r="1.6" /></svg>
            Ereignis</button>
        {/if}
        <button onclick={ongetroffen}>
          <svg class="zeichen" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0l1.4 4.6L13.7 2.3 11.4 6.6 16 8l-4.6 1.4 2.3 4.3-4.3-2.3L8 16l-1.4-4.6-4.3 2.3 2.3-4.3L0 8l4.6-1.4L2.3 2.3l4.3 2.3z" /></svg>
          Getroffen</button>
      </div>
    </div>
  </div>

  {#if gewaehlt}
    <div class="zone gruppe" aria-live="polite">
      <div class="kopf">
        <h3 class="abschnitt-titel">{#if gewaehlt.w8 !== null}<span class="zonenzahl">{gewaehlt.w8}</span> {/if}{gewaehlt.titel ?? gewaehlt.name}</h3>
        <button class="flach" aria-label="Übersicht der Zone schließen" onclick={() => (zone = null)}>✕</button>
      </div>
      <!-- Gleiche Zeichen wie an der Figur: ⛨ für Rüstung, Mauer für Deckung. -->
      <p class="schutzzeile">
        <span>⛨ Rüstung: {#if ruestung[gewaehlt.id]}Schutz <span class="zahl">{ruestung[gewaehlt.id]}</span>{:else}keine{/if}</span>
        {#if deckung !== null}
          <span><svg class="zeichen mauer" viewBox="0 0 16 16" aria-hidden="true"><path d={MAUER} /></svg> Deckung: {nurSchild ? `${schild!.name}, nur von vorn, ` : deckungName ? `${deckungName}, ` : ''}Schutz <span class="zahl">{deckung}</span></span>
        {/if}
      </p>
      {#if zonenWunden.length}
        <ul class="zeilen">
          {#each zonenWunden as w (w.id)}
            <li class="wundzeile">
              <span>
                <strong>Wunde{w.zone !== gewaehlt.id ? ` (${zonenName(w.zone)})` : ''}</strong>{#if w.kritisch} <span class="warnung">kritisch</span>{/if}
                <small>{status(w)}{#if folge(w)} · Folge: {folge(w)}{/if}</small>
              </span>
              <span class="wert">{w.schaden}</span>
            </li>
            {#if massnahmenFuer(w, d).length || (!imGefecht && (blutet(w) || nachsorgeMoeglich(w, d)))}
              <li class="wundknoepfe">
                {#if massnahmenFuer(w, d).length}<button class="betont" onclick={() => onversorgen(w.id)}>Versorgen</button>{/if}
                {#if !imGefecht && blutet(w)}<button onclick={() => onfrist(w.id)}>Frist abgelaufen</button>{/if}
                {#if !imGefecht && nachsorgeMoeglich(w, d)}<button onclick={() => onnachsorge(w.id)}>Nachsorge</button>{/if}
              </li>
            {/if}
          {/each}
        </ul>
        {#if imGefecht && zonenWunden.some(blutet)}
          <p class="hinweis">Im Gefecht blutet niemand; die Fristen beginnen mit dem Gefechtsende.</p>
        {/if}
      {:else}
        <p class="hinweis">Keine Wunden.</p>
      {/if}
    </div>
  {:else if wunden.length}
    <p class="hinweis mitte">Tippe eine Zone an, um ihre Wunden zu sehen.</p>
  {/if}
</section>

  <!-- Gefecht starten bzw. Nächste Runde und Gefecht beenden unter dem Kasten der Figur (18.11.2026, vorher in der Kopfzeile, dann im Kasten).
       Bildzeichen als SVG statt Unicode (▶ ⏹ ⏭), weil Android diese sonst als bunte Emoji zeigt und ■ ▲ ▼ belegt sind. -->
  <div class="gefecht-knoepfe">
    {#if imGefecht}
      <button onclick={onnaechsteRunde}>
        <svg class="zeichen" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l7 5-7 5z" /><rect x="11" y="3" width="2" height="10" /></svg>
        Nächste Runde</button>
      <button onclick={ongefechtende}>
        <svg class="zeichen" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1" /></svg>
        Gefecht beenden</button>
    {:else}
      <button class="betont" class:warnung={kampfunfaehig} onclick={ongefechtstart}>
        {#if kampfunfaehig}⚠{:else}<svg class="zeichen" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5l9 5.5-9 5.5z" /></svg>{/if}
        Gefecht starten</button>
      <!-- Ruhe (Nacht, Ruhetag) nur außerhalb des Gefechts, neben Gefecht starten. Zeichen: Mondsichel. -->
      <button onclick={onruhe}>
        <svg class="zeichen" viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 1.5A6.5 6.5 0 1 0 14.5 11 5.5 5.5 0 0 1 10.5 1.5z" /></svg>
        Ruhe</button>
    {/if}
  </div>


<style>
  .hp { display: flex; flex-direction: column; gap: var(--abstand-1); }
  .zahl strong { font-size: 1.4rem; }
  /* HP-Zahl links, Balken rechts daneben auf der restlichen Breite. */
  .hp-zeile { display: flex; align-items: center; gap: var(--abstand-3); }
  .hp-zeile .zahl { flex: none; }
  .balken { flex: 1 1 auto; height: 10px; border-radius: 999px; background: var(--flaeche-2); overflow: hidden; border: 1px solid var(--linie); }
  .fuellung { height: 100%; background: var(--ok); }
  .fuellung.niedrig { background: var(--gefahr); }
  .warnung { margin: 0; }
  p { margin: 0; }
  /* Figur links, rechts daneben eine Spalte: oben Stand und Bewegung, unten (Daumenbereich) Deckung, Ereignis und Getroffen untereinander, gleich breit. */
  .figurbox { display: flex; gap: var(--abstand-2); align-items: stretch; }
  .figurplatz { flex: 1 1 auto; min-width: 0; max-width: 240px; }
  .seite { flex: 0 0 auto; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; gap: var(--abstand-2); margin-left: auto; }
  /* margin-top: auto hält die Knöpfe unten, auch in Ruhe, wenn oben keine Haltungsanzeige steht. */
  .knoepfe { display: flex; flex-direction: column; gap: var(--abstand-2); align-self: stretch; margin-top: auto; }
  .knoepfe button { width: 100%; padding: 0 var(--abstand-2); display: inline-flex; align-items: center; justify-content: center; gap: var(--abstand-2);
    font-family: var(--schrift-text); text-transform: none; letter-spacing: normal; }
  .mitte { text-align: center; }
  .gefecht-knoepfe { display: flex; gap: var(--abstand-2); }
  .gefecht-knoepfe button { flex: 1 1 0; display: inline-flex; align-items: center; justify-content: center; gap: var(--abstand-2); }
  .zeichen { width: 14px; height: 14px; fill: currentColor; flex: none; }
  /* Übersicht der gewählten Zone: eigene Fläche mit Akzentstreifen, passend zum Akzentrahmen der Zone in der Figur. */
  .zone { background: var(--flaeche-2); border-left: 3px solid var(--akzent); border-radius: 8px; padding: var(--abstand-2) var(--abstand-3); }
  .schutzzeile { display: flex; flex-wrap: wrap; column-gap: var(--abstand-3); row-gap: var(--abstand-1); }
  .schutzzeile > span { display: inline-flex; align-items: center; gap: var(--abstand-1); }
  .mauer { fill: var(--deckung); }
  /* Zahl und Name der Zone nebeneinander am Anfang, nicht auseinandergezogen. */
  .kopf h3 { justify-content: flex-start; }
  .kopf { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); }
  .wundzeile { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); min-height: 44px; }
  .wundzeile small { display: block; color: var(--text-2); }
  .wundknoepfe { display: flex; gap: var(--abstand-2); justify-content: flex-end; }
  .schildmarke { display: flex; align-items: center; gap: var(--abstand-1); margin: 0; }
  .schildmarke .linie { fill: none; stroke: currentColor; stroke-width: 1.5; }
</style>
