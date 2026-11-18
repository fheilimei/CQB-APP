<script lang="ts">
  // Grundwerte (konzept.md § 3.3, § 4.10) mit Herkunftsmarkierung und Aufschlüsselung (§ 3.0b).
  // Schreibmodus: Wert von Hand setzen oder wieder berechnen lassen.
  import type { Spieldaten } from '../../daten/typen';
  import type { Korrektur } from '../../regeln/korrektur';
  import { grundwerteAufgeschluesselt } from '../../regeln/modifikatoren';
  import type { Charakter } from '../../speicher/charakter';
  import Herkunft from '../Herkunft.svelte';
  import { grundwertName, grundwertWert, type Modus } from '../texte';

  interface Props {
    c: Charakter; d: Spieldaten; modus: Modus; offen: string | null;
    onkorrektur: (k: Korrektur) => void; onspringe: (art: string, id: string) => void;
  }
  let { c, d, modus, offen = $bindable(), onkorrektur, onspringe }: Props = $props();

  const zeilen = $derived(grundwerteAufgeschluesselt(c, d));
  const baender = $derived(d.regeln.schiessen.reichweitenbaender);
  const zeichen = (q: string) => d.darstellung.herkunft[q]!;

  function setzen(id: string, wert: number | string) {
    onkorrektur({ art: 'grundwert', id, wert });
  }
</script>

<section class="karte">
  <h2>Grundwerte</h2>
  <ul class="zeilen">
    {#each zeilen as g (g.id)}
      {@const auf = offen === g.id}
      {@const quellen = [...g.beitraege.map((b) => b.herkunft), ...(g.hand !== null ? ['manuell'] : [])]}
      <li id="grundwert-{g.id}">
        <button class="zeile flach" aria-expanded={auf} onclick={() => (offen = auf ? null : g.id)}>
          <span>{grundwertName(g.id, d)}</span>
          <strong class="wert" class:hand={g.hand !== null}>{grundwertWert(g.ergebnis, d)}<Herkunft {quellen} darstellung={d.darstellung} /></strong>
          <span class="klapppfeil" aria-hidden="true">›</span>
        </button>
        {#if auf}
          <div class="detail">
            <table class="rechnung">
              <tbody>
                <tr><td>Start</td><td>{grundwertWert(g.start, d)}</td></tr>
                {#each g.beitraege as b (b.quelle)}
                  <tr>
                    <td><button class="link flach" onclick={() => onspringe(b.herkunft, b.quelle)}>
                      <span style:color={zeichen(b.herkunft).farbe}>{zeichen(b.herkunft).zeichen}</span> {b.name}</button></td>
                    <td>{b.wert > 0 ? '+' : '−'}{Math.abs(b.wert)}{g.id === 'wurfweite_band' ? (Math.abs(b.wert) === 1 ? ' Band' : ' Bänder') : ''}</td>
                  </tr>
                {/each}
                {#if g.hand !== null}
                  <tr><td>{zeichen('manuell').zeichen} von Hand gesetzt</td><td>{grundwertWert(g.hand, d)}</td></tr>
                  <tr class="hinweis"><td colspan="2">Berechnet wäre {grundwertWert(g.berechnet, d)}.</td></tr>
                {/if}
                <tr class="summe"><td>Ergebnis</td><td>{grundwertWert(g.ergebnis, d)}</td></tr>
              </tbody>
            </table>
            {#if modus === 'schreiben'}
              <div class="schreiben">
                {#if typeof g.start === 'string'}
                  <label class="inline">Wurfweite von Hand
                    <select value={g.hand ?? ''} onchange={(e) => setzen(g.id, (e.target as HTMLSelectElement).value)}>
                      {#if g.hand === null}<option value="" disabled>– berechnet –</option>{/if}
                      {#each baender as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
                    </select></label>
                {:else}
                  {@const wert = g.ergebnis as number}
                  <span class="stepper">
                    <button aria-label="{grundwertName(g.id, d)} senken" disabled={wert <= 0} onclick={() => setzen(g.id, wert - 1)}>−</button>
                    <strong>{wert}</strong>
                    <button aria-label="{grundwertName(g.id, d)} erhöhen" onclick={() => setzen(g.id, wert + 1)}>+</button>
                  </span>
                {/if}
                {#if g.hand !== null}
                  <button onclick={() => onkorrektur({ art: 'grundwert', id: g.id, wert: null })}>Wieder berechnen</button>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</section>
