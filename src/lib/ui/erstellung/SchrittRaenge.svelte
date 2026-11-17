<script lang="ts">
  // Schritt 2: Ränge eintragen (konzept.md § 3.0). Mit Klasse wird jeder Rang des Rank-Sets genau einmal vergeben;
  // zugeordnete Ränge lassen sich tauschen. Hat ein Stat einen Rang und noch keinen Wurf, würfelt die App die
  // Abweichung sofort (wenn eingestellt). Der Wurf bleibt beim Stat.
  import type { Rang, Spieldaten } from '../../daten/typen';
  import { offeneRaenge, rankSetFuer, raengeTauschen, rangSetzen, statVoraussetzungen } from '../../regeln/erstellung';
  import { rangfolge, statwert } from '../../regeln/probe';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import { wuerfle } from '../../wuerfel/wuerfel';
  import Begriff from '../Begriff.svelte';

  interface Props { c: Charakter; d: Spieldaten; abweichungModus: Quelle }
  let { c = $bindable(), d, abweichungModus }: Props = $props();

  const set = $derived(rankSetFuer(c.erstellung!, d));
  const offen = $derived(set ? offeneRaenge(c, set, d) : []);
  const voraussetzung = $derived(statVoraussetzungen(c.erstellung!, d));
  let rangWahl = $state<number | null>(null); // Index in offen
  let statWahl = $state<string | null>(null);

  function setze(id: string, rang: Rang | null) {
    let x = rangSetzen(c, id, rang);
    if (rang && !x.stats[id]!.wurf && abweichungModus === 'app') {
      const w = wuerfle('2W10');
      x = { ...x, stats: { ...x.stats, [id]: { rang, wurf: { positiv: w.werte[0]!, negativ: w.werte[1]!, quelle: 'app' } } } };
    }
    c = x;
  }

  function tippStat(id: string) {
    if (rangWahl !== null) {
      setze(id, offen[rangWahl]!);
      rangWahl = null;
    } else if (statWahl === null) {
      if (c.stats[id]!.rang) statWahl = id;
    } else if (statWahl === id) {
      statWahl = null;
    } else {
      c = raengeTauschen(c, statWahl, id);
      statWahl = null;
    }
  }
  function tippRang(i: number) {
    statWahl = null;
    rangWahl = rangWahl === i ? null : i;
  }
  const verlangt = (id: string) => voraussetzung.find((v) => v.stat === id);
</script>

{#if set}
  <p class="hinweis">Rank-Set: {set.join(', ')}. Tippe einen Rang und dann einen Stat. Zum Tauschen tippe zwei Stats nacheinander.</p>
  {#if voraussetzung.length}
    <p>Deine Klasse verlangt {voraussetzung.map((v) => `■ ${d.stats.eintraege.find((s) => s.id === v.stat)?.name} auf Rang ${v.rang}`).join(' und ')}.</p>
  {/if}
  <div class="pool" role="group" aria-label="Noch zu vergeben">
    {#each offen as r, i (i)}
      <button class="rang" class:an={rangWahl === i} aria-pressed={rangWahl === i} onclick={() => tippRang(i)}>{r}</button>
    {:else}
      <p class="hinweis">Alle Ränge sind vergeben.</p>
    {/each}
  </div>
{:else}
  <p class="hinweis">Ohne Klasse: Wähle für jeden Stat einen Rang.</p>
{/if}

<ul class="stats">
  {#each d.stats.eintraege as s (s.id)}
    {@const e = c.stats[s.id]!}
    {@const wert = statwert(e, d.regeln)}
    {@const v = verlangt(s.id)}
    <li>
      {#if set}
        <button class="zeile" class:an={statWahl === s.id} aria-pressed={statWahl === s.id} onclick={() => tippStat(s.id)}>
          <span><Begriff art="stat" name={s.name} darstellung={d.darstellung} />
            {#if v}<span class="hinweis"> · braucht {v.rang}</span>{/if}</span>
          <span class="werte"><strong class="rangfeld">{e.rang ?? '–'}</strong><span class="wert">{wert ?? ''}</span></span>
        </button>
      {:else}
        <label class="zeile ohne">
          <Begriff art="stat" name={s.name} darstellung={d.darstellung} />
          <select value={e.rang ?? ''} onchange={(ev) => setze(s.id, ((ev.target as HTMLSelectElement).value || null) as Rang | null)}>
            <option value="">–</option>
            {#each rangfolge(d.regeln) as r (r)}<option value={r}>{r} ({d.regeln.raenge[r]})</option>{/each}
          </select>
        </label>
      {/if}
    </li>
  {/each}
</ul>
{#if statWahl && set}
  <button class="breit" onclick={() => { setze(statWahl!, null); statWahl = null; }}>Rang von {d.stats.eintraege.find((s) => s.id === statWahl)?.name} zurücklegen</button>
{/if}

<style>
  .pool { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; min-height: 48px; }
  .rang { font-weight: 700; font-size: 1.1rem; min-width: 48px; padding: 0 12px; }
  .rang.an, .zeile.an { border-color: var(--akzent); box-shadow: inset 0 0 0 2px var(--akzent); }
  .stats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .zeile { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; text-align: left; }
  .ohne { margin: 0; font-weight: 400; }
  .ohne select { width: 120px; }
  .werte { display: flex; gap: 12px; align-items: baseline; }
  .rangfeld { font-size: 1.1rem; min-width: 1.2em; text-align: center; }
  .wert { color: var(--text-2); min-width: 2em; text-align: right; }
  .breit { width: 100%; margin-top: 12px; }
</style>
