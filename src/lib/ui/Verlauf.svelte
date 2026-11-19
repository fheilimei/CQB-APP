<script lang="ts">
  // Reiter Verlauf (konzept.md § „Aufbau der App“): Gefechtsprotokoll (nur im laufenden Gefecht), Aufstiegsprotokoll,
  // Kassenbuch mit Kontostand, Wunden mit Heildauer, Notizen. Nur Anzeige; einzig die Notizen sind änderbar
  // (kein Wert des Charakters: in jedem Modus, ohne Eintrag im Protokoll). Neueste Einträge stehen oben.
  import type { Spieldaten } from '../daten/typen';
  import { kontostand } from '../regeln/geld';
  import { gefechtVon } from '../regeln/probenrechner';
  import type { Charakter, Gefecht } from '../speicher/charakter';
  import Farbtext from './Farbtext.svelte';
  import { geld } from './texte';
  import { aufstiegseintragText, betragText, buchungText, gefechtseintragText, wundStatus, zeitText } from './verlauf';

  interface Props { c: Charakter; d: Spieldaten; onaendern: (c: Charakter) => void }
  let { c, d, onaendern }: Props = $props();

  const gefecht = $derived(gefechtVon(c));
  /** Runden des Gefechts, neueste zuerst; innerhalb der Runde der neueste Eintrag oben. */
  const runden = $derived.by(() => {
    if (!gefecht) return [];
    const m = new Map<number, Gefecht['protokoll']>();
    for (const e of gefecht.protokoll) m.set(e.runde, [...(m.get(e.runde) ?? []), e]);
    return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([runde, eintraege]) => ({ runde, eintraege: [...eintraege].reverse() }));
  });
  const aufstieg = $derived([...c.protokoll].reverse());
  const buchungen = $derived([...c.kassenbuch].reverse());
  const stand = $derived(kontostand(c));
  const wunden = $derived(c.spielstand.wunden);
  const zoneName = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.titel ?? d.koerperzonen.eintraege.find((z) => z.id === id)?.name ?? id;
  const anzahl = (n: number, eins: string, viele: string) => (n === 0 ? 'keine' : `${n} ${n === 1 ? eins : viele}`);

  function notizen(text: string) {
    if (text !== c.notizen) onaendern({ ...c, notizen: text, geaendert: new Date().toISOString() });
  }
</script>

{#if gefecht}
  <section class="karte">
    <details open>
      <summary><h2>Gefecht</h2><span class="hinweis zahl">Runde {gefecht.runde}</span><span class="klapppfeil" aria-hidden="true">›</span></summary>
      <div class="stapel klappinhalt">
        {#if runden.length}
          {#each runden as r (r.runde)}
            <div class="gruppe">
              <h3 class="gruppe-titel">Runde {r.runde}</h3>
              <ul class="zeilen">
                {#each r.eintraege as e, i (i)}
                  {@const t = gefechtseintragText(e, d)}
                  <li class="eintrag">
                    <span>{t.text}</span>
                    {#each t.mehr as m, j (j)}<small class="hinweis"><Farbtext text={m} /></small>{/each}
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        {:else}
          <p class="hinweis">Noch nichts eingetragen.</p>
        {/if}
        <p class="hinweis">Das Protokoll gilt nur für das laufende Gefecht und wird beim Gefechtsende gelöscht.</p>
      </div>
    </details>
  </section>
{/if}

<section class="karte">
  <details>
    <summary><h2>Aufstieg</h2><span class="hinweis">{anzahl(aufstieg.length, 'Eintrag', 'Einträge')}</span><span class="klapppfeil" aria-hidden="true">›</span></summary>
    <div class="stapel klappinhalt">
      {#if aufstieg.length}
        <ul class="zeilen">
          {#each aufstieg as e, i (i)}
            <li class="eintrag"><span><Farbtext text={aufstiegseintragText(e, d)} /></span><small class="hinweis zahl">{zeitText(e.zeit)}</small></li>
          {/each}
        </ul>
      {:else}
        <p class="hinweis">Noch keine Einträge. Hier erscheinen Sessions, Käufe mit freien Punkten, Klassenwechsel und Änderungen im Schreibmodus.</p>
      {/if}
    </div>
  </details>
</section>

<section class="karte">
  <details>
    <summary><h2>Geld</h2><span class="zahl" aria-label="Kontostand {geld(stand)}">{geld(stand)}</span><span class="klapppfeil" aria-hidden="true">›</span></summary>
    <div class="stapel klappinhalt">
      {#if c.schulden}
        <p class:warnung={c.schulden.frist_auftraege <= 0}>Schulden: noch <span class="zahl">{geld(c.schulden.rest)}</span>,
          {c.schulden.frist_auftraege <= 0 ? 'Frist abgelaufen' : `Frist ${c.schulden.frist_auftraege} ${c.schulden.frist_auftraege === 1 ? 'Auftrag' : 'Aufträge'}`}</p>
      {/if}
      <div class="gruppe">
        <h3 class="gruppe-titel">Kassenbuch</h3>
        {#if buchungen.length}
          <ul class="zeilen">
            {#each buchungen as b, i (i)}
              <li class="buchung">
                <span class="eintrag"><span>{buchungText(b)}</span><small class="hinweis zahl">{zeitText(b.zeit)}</small></span>
                <span class="wert">{betragText(b.betrag)}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="hinweis">Noch keine Buchungen.</p>
        {/if}
      </div>
    </div>
  </details>
</section>

<section class="karte">
  <details>
    <summary><h2>Wunden</h2><span class="hinweis">{anzahl(wunden.length, 'Wunde', 'Wunden')}</span><span class="klapppfeil" aria-hidden="true">›</span></summary>
    <div class="stapel klappinhalt">
      {#if wunden.length}
        <ul class="zeilen">
          {#each wunden as w (w.id)}
            <li class="buchung">
              <span class="eintrag">
                <span>{zoneName(w.zone)}{#if w.kritisch} <span class="warnung">kritisch</span>{/if}</span>
                <small class="hinweis">{wundStatus(w, d, !!gefecht)}</small>
              </span>
              <span class="wert">{w.schaden}</span>
            </li>
          {/each}
        </ul>
        <p class="hinweis">Versorgen und Nachsorge gehen im Reiter Figur: Zone antippen.</p>
      {:else}
        <p class="hinweis">Keine Wunden.</p>
      {/if}
    </div>
  </details>
</section>

<section class="karte">
  <label class="feld">Notizen
    <textarea id="verlauf-notizen" rows="6" value={c.notizen} onchange={(e) => notizen((e.target as HTMLTextAreaElement).value)}></textarea></label>
</section>

<style>
  .eintrag { display: flex; flex-direction: column; gap: var(--abstand-1); padding: var(--abstand-2) 0; }
  .buchung { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); }
  .buchung .wert { font-family: var(--schrift-zahl); }
</style>
