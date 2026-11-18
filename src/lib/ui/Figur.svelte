<script lang="ts">
  // Reiter Figur (konzept.md § Aufbau der App): HP, Silhouette mit Rüstung und Wunden, Wundliste; in Ruhe der Knopf
  // Getroffen (im Gefecht steht er an der Aktionsleiste).
  import type { Spieldaten } from '../daten/typen';
  import { grundwerte, hpAktuell } from '../regeln/modifikatoren';
  import { gefechtVon, lebenslageDes } from '../regeln/probenrechner';
  import { ruestungswert } from '../regeln/schaden';
  import type { Charakter, Wunde } from '../speicher/charakter';
  import Silhouette from './Silhouette.svelte';

  interface Props { c: Charakter; d: Spieldaten; ongetroffen: () => void }
  let { c, d, ongetroffen }: Props = $props();

  const hp = $derived(hpAktuell(c, d));
  const hpMax = $derived(grundwerte(c, d).hp);
  const lage = $derived(lebenslageDes(c, d));
  const ruestung = $derived(Object.fromEntries(d.koerperzonen.eintraege.map((z) => [z.id, ruestungswert(z.id, c.ausruestung.ruestung, d)])));
  const wunden = $derived(c.spielstand.wunden);
  const zonenName = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.name ?? id;

  function status(w: Wunde): string {
    if (w.versorgt) return `versorgt (${w.versorgt === 'druckverband' ? 'Druckverband' : w.versorgt === 'tourniquet' ? 'Tourniquet' : 'Operation'})`;
    if (w.blutung.status === 'offen') return 'blutet';
    if (w.blutung.status === 'gestoppt') return 'Blutung gestoppt';
    return 'ausgeblutet, unversorgt';
  }
</script>

<section class="karte">
  <div class="hp" aria-label="Lebenspunkte {hp} von {hpMax}">
    <span class="zahl"><strong>HP {hp}</strong> / {hpMax}</span>
    <div class="balken"><div class="fuellung" class:niedrig={hp <= hpMax / 4} style:width="{Math.max(0, Math.min(1, hp / hpMax)) * 100}%"></div></div>
  </div>
  {#if lage === 'tot'}
    <p class="warnung">tot</p>
  {:else if lage === 'kampfunfaehig'}
    <p class="warnung">kampfunfähig{gefechtVon(c) ? ': im Gefecht keine Aktionen' : ''}</p>
  {/if}
  <Silhouette {d} {ruestung} {wunden} beschriftung="Körperbild mit Rüstung und Wunden" />
  {#if !gefechtVon(c)}
    <button class="betont" onclick={ongetroffen}>Getroffen</button>
  {/if}
</section>

<section class="karte">
  <h3 class="abschnitt-titel">Wunden</h3>
  {#if !wunden.length && !c.spielstand.prellungen}
    <p class="hinweis">Keine Wunden.</p>
  {:else}
    <ul class="zeilen">
      {#each wunden as w (w.id)}
        <li class="wundzeile">
          <span><strong>{zonenName(w.zone)}</strong>{#if w.kritisch} <span class="warnung">kritisch</span>{/if}
            <small class="hinweis">{status(w)}</small></span>
          <span class="wert">{w.schaden}</span>
        </li>
      {/each}
      {#if c.spielstand.prellungen}
        <li class="wundzeile">
          <span><strong>Prellungen</strong> <small class="hinweis">zurück nach einer Nacht Ruhe</small></span>
          <span class="wert">{c.spielstand.prellungen}</span>
        </li>
      {/if}
    </ul>
    {#if gefechtVon(c) && wunden.some((w) => w.blutung.status === 'offen' && !w.versorgt)}
      <p class="hinweis">Im Gefecht blutet niemand; die Fristen beginnen mit dem Gefechtsende.</p>
    {/if}
  {/if}
</section>

<style>
  .hp { display: flex; flex-direction: column; gap: var(--abstand-1); }
  .zahl strong { font-size: 1.4rem; }
  .balken { height: 10px; border-radius: 999px; background: var(--flaeche-2); overflow: hidden; border: 1px solid var(--linie); }
  .fuellung { height: 100%; background: var(--ok); }
  .fuellung.niedrig { background: var(--gefahr); }
  .warnung { margin: 0; }
  .wundzeile { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); min-height: 44px; }
  .wundzeile small { display: block; }
</style>
