<script lang="ts">
  // Reiter Figur (konzept.md § Aufbau der App): HP, Silhouette mit Rüstung und Wunden. Antippen einer Zone zeigt darunter
  // ihre Übersicht (Rüstung, Deckung, Wunden mit Status, Frist und Folge; Versorgen und „Frist abgelaufen“).
  // Darunter der Knopf Getroffen, im Gefecht und in Ruhe.
  import type { Spieldaten } from '../daten/typen';
  import { grundwerte, hpAktuell } from '../regeln/modifikatoren';
  import { gefechtVon, lebenslageDes } from '../regeln/probenrechner';
  import { ruestungswert } from '../regeln/schaden';
  import { deckungFuer } from '../regeln/wunden';
  import { blutet, fristMinuten, fristVerlaengert, massnahmenFuer } from '../regeln/blutung';
  import type { Charakter, Wunde } from '../speicher/charakter';
  import Haltungsanzeige from './Haltungsanzeige.svelte';
  import Silhouette from './Silhouette.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    ongetroffen: () => void;
    onversorgen: (wundId: string) => void;
    onfrist: (wundId: string) => void;
  }
  let { c, d, ongetroffen, onversorgen, onfrist }: Props = $props();

  let zone = $state<string | null>(null);

  const hp = $derived(hpAktuell(c, d));
  const hpMax = $derived(grundwerte(c, d).hp);
  const lage = $derived(lebenslageDes(c, d));
  const imGefecht = $derived(!!gefechtVon(c));
  const ruestung = $derived(Object.fromEntries(d.koerperzonen.eintraege.map((z) => [z.id, ruestungswert(z.id, c.ausruestung.ruestung, d)])));
  const wunden = $derived(c.spielstand.wunden);
  const prellungen = $derived(c.spielstand.prellungen);
  const gewaehlt = $derived(d.koerperzonen.eintraege.find((z) => z.id === zone) ?? null);
  /** Wunden der Zone; Wunden am Rumpf (nach Ansage) zeigt die Figur am Bauch, also auch hier. */
  const zonenWunden = $derived(zone ? wunden.filter((w) => w.zone === zone || (w.zone === 'rumpf' && zone === 'bauch')) : []);
  const deckung = $derived(zone && imGefecht ? deckungFuer(zone, c, d) : null);
  const zonenName = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.name ?? id;
  /** Nach dem Gefecht laufen die Fristen der blutenden Wunden. Regelfrage R29 (docs/offen.md): vorläufig auch bei Wunden aus einem Treffer in Ruhe sofort. */
  const blutend = $derived(imGefecht ? 0 : wunden.filter(blutet).length);

  function status(w: Wunde): string {
    const mit = w.versorgt ? (d.regeln.versorgen[w.versorgt]?.name ?? w.versorgt) : '';
    if (blutet(w)) {
      const frist = fristMinuten(w, d);
      const fristText = frist === null ? '' : `, Frist ${frist} ${frist === 1 ? 'Minute' : 'Minuten'}${imGefecht ? ' ab Gefechtsende' : ''}`;
      return `blutet${fristText}${fristVerlaengert(w, d) ? ` (${mit})` : ''}`;
    }
    if (w.versorgt) return `versorgt (${mit})`;
    if (w.blutung.status === 'gestoppt') return 'Blutung gestoppt';
    return 'ausgeblutet, unversorgt';
  }
  function folge(w: Wunde): string {
    const z = d.koerperzonen.eintraege.find((x) => x.id === w.zone);
    return (w.kritisch ? z?.krit.text : z?.normal.text) ?? '';
  }
</script>

<section class="karte">
  <div class="hp" aria-label="Lebenspunkte {hp} von {hpMax}">
    <span class="zahl"><strong>HP {hp}</strong> / {hpMax}</span>
    <div class="balken"><div class="fuellung" class:niedrig={hp <= hpMax / 4} style:width="{Math.max(0, Math.min(1, hp / hpMax)) * 100}%"></div></div>
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
    <p class="warnung">kampfunfähig{imGefecht ? ': im Gefecht keine Aktionen' : ''}</p>
  {/if}
  <div class="figurbox">
    <Silhouette {d} {ruestung} {wunden} gewaehlt={zone} onwahl={(z) => (zone = zone === z ? null : z)}
      beschriftung="Körperbild mit Rüstung und Wunden; Zone antippen für Einzelheiten" />
    {#if gefechtVon(c)}
      <div class="haltung"><Haltungsanzeige g={gefechtVon(c)!} {d} /></div>
    {/if}
  </div>

  {#if gewaehlt}
    <div class="zone gruppe" aria-live="polite">
      <div class="kopf">
        <h3 class="abschnitt-titel">{gewaehlt.name}</h3>
        <button class="flach" aria-label="Übersicht der Zone schließen" onclick={() => (zone = null)}>✕</button>
      </div>
      <p>Rüstung: {ruestung[gewaehlt.id] ? `Schutz ${ruestung[gewaehlt.id]}` : 'keine'}{#if deckung !== null} · Deckung: Schutz {deckung}{/if}</p>
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
            {#if massnahmenFuer(w, d).length || (!imGefecht && blutet(w))}
              <li class="wundknoepfe">
                {#if massnahmenFuer(w, d).length}<button class="betont" onclick={() => onversorgen(w.id)}>Versorgen</button>{/if}
                {#if !imGefecht && blutet(w)}<button onclick={() => onfrist(w.id)}>Frist abgelaufen</button>{/if}
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

  <button class="betont" onclick={ongetroffen}>Getroffen</button>
</section>

<style>
  .hp { display: flex; flex-direction: column; gap: var(--abstand-1); }
  .zahl strong { font-size: 1.4rem; }
  .balken { height: 10px; border-radius: 999px; background: var(--flaeche-2); overflow: hidden; border: 1px solid var(--linie); }
  .fuellung { height: 100%; background: var(--ok); }
  .fuellung.niedrig { background: var(--gefahr); }
  .warnung { margin: 0; }
  p { margin: 0; }
  /* Stand und Bewegung oben rechts in der freien Ecke neben dem Kopf der Figur. */
  .figurbox { position: relative; }
  .haltung { position: absolute; top: 0; right: 0; }
  .mitte { text-align: center; }
  /* Übersicht der gewählten Zone: eigene Fläche mit Akzentstreifen, passend zum Akzentrahmen der Zone in der Figur. */
  .zone { background: var(--flaeche-2); border-left: 3px solid var(--akzent); border-radius: 8px; padding: var(--abstand-2) var(--abstand-3); }
  .kopf { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); }
  .wundzeile { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); min-height: 44px; }
  .wundzeile small { display: block; color: var(--text-2); }
  .wundknoepfe { display: flex; gap: var(--abstand-2); justify-content: flex-end; }
</style>
