<script lang="ts" module>
  import type { Ergebnisstufe } from '../../regeln/probe';
  import type { Probe } from '../../regeln/probenrechner';
  /** Was der Spieler eingetragen hat: ein Wurf (die App wertet aus) oder nur der Ausgang. */
  export interface ProbenErgebnis { stufe: Ergebnisstufe; wurf: number | null; probe: Probe }
</script>

<script lang="ts">
  // Gemeinsamer Teil jeder Probe (konzept.md § 3.6, § 3.8c ohne Block 2): Kopfzeile mit Zielwert und Krit-Schwelle,
  // automatische Steps als Chips (× schaltet für diese Probe aus), Steps der SL, Hinweise der Perks, Würfel, Ansage.
  import type { Spieldaten } from '../../daten/typen';
  import { grundMerken, sichtstufeSetzen, slGefechtHinzu, slGefechtLoeschen } from '../../regeln/gefecht';
  import { auswerten } from '../../regeln/probe';
  import { gefechtVon, perkHinweise, probeStellen, type ProbenAnfrage, type SlSteps } from '../../regeln/probenrechner';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Begriff from '../Begriff.svelte';
  import Wuerfel, { type Ausgang } from '../Wuerfel.svelte';
  import { ansage, malstepsText, mitZeichen, skillName, statName, stepsText } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    anfrage: Omit<ProbenAnfrage, 'sl' | 'ausgeschaltet' | 'braucht_sicht'>;
    /** Stellen der Perk-Hinweise (hinweis_bei), z. B. ['probe'] oder ['leiter']. */
    hinweise: string[];
    wuerfelModus: Quelle;
    /** Schalter „braucht Sicht“ anbieten (nur im Probenrechner). */
    sichtSchalter?: boolean;
    /** Drei Knöpfe Krit · gelungen · misslungen zusätzlich zum Wurf. */
    mitAusgang?: boolean;
    /** Bei Misserfolg den Zielwert mit ansagen (Initiative). */
    zielwertAnsagen?: boolean;
    ergebnis?: ProbenErgebnis | null;
    onaendern: (c: Charakter) => void;
  }
  let {
    c, d, anfrage, hinweise, wuerfelModus, sichtSchalter = false, mitAusgang = false, zielwertAnsagen = false,
    ergebnis = $bindable(null), onaendern
  }: Props = $props();

  let ausgeschaltet = $state<string[]>([]);
  let sl = $state<SlSteps>({ malsteps: 0, stepshields: 0, grund: '' });
  let brauchtSicht = $state(false);
  /** Sichtstufe außerhalb des Gefechts; leer = die erste Stufe aus regeln.json. */
  let sichtRuhe = $state('');
  let eingabe = $state<{ wurf: number } | { stufe: Ergebnisstufe } | null>(null);
  let aufgeklappt = $state(false);

  const g = $derived(gefechtVon(c));
  const p = $derived(probeStellen(c, d, { ...anfrage, sl, ausgeschaltet, braucht_sicht: brauchtSicht, sichtstufe: sichtRuhe || undefined }));
  const w = $derived(p.wert);
  const perks = $derived(perkHinweise(c, d, hinweise));
  const sichtstufe = $derived(g?.sichtstufe ?? (sichtRuhe || d.regeln.sicht.stufen[0]!.id));

  // Ergebnis folgt der Eingabe und der aktuellen Rechnung: Ändert der Spieler danach Steps, wertet die App neu aus.
  $effect(() => {
    if (!eingabe || !w) { ergebnis = null; return; }
    const stufe = 'wurf' in eingabe ? auswerten(eingabe.wurf, w) : eingabe.stufe;
    ergebnis = { stufe, wurf: 'wurf' in eingabe ? eingabe.wurf : null, probe: p };
  });

  function umschalten(id: string) {
    ausgeschaltet = ausgeschaltet.includes(id) ? ausgeschaltet.filter((x) => x !== id) : [...ausgeschaltet, id];
  }
  function zaehler(feld: 'malsteps' | 'stepshields', n: number) {
    sl = { ...sl, [feld]: Math.max(0, sl[feld] + n) };
  }
  function fuersGefecht() {
    let neu = slGefechtHinzu(c, { malsteps: sl.malsteps, stepshields: sl.stepshields, grund: sl.grund.trim() });
    neu = grundMerken(neu, sl.grund);
    sl = { malsteps: 0, stepshields: 0, grund: '' };
    onaendern(neu);
  }
  function merken() {
    if (g && sl.grund.trim() && (sl.malsteps || sl.stepshields)) onaendern(grundMerken(c, sl.grund));
  }
  function gewuerfelt(wurf: number) {
    eingabe = { wurf };
    merken();
  }
  function ausgang(a: Ausgang) {
    eingabe = { stufe: a === 'krit' ? 'krit' : a === 'gelungen' ? 'erfolg' : 'misserfolg' };
    merken();
  }
  function sichtWaehlen(id: string) {
    if (g) onaendern(sichtstufeSetzen(c, id));
    else sichtRuhe = id;
  }
  const zeichen = (herkunft: string) => d.darstellung.herkunft[herkunft];
</script>

{#if p.statwert === null}
  <p class="fehler">{mitZeichen('stat', anfrage.stat, d)} hat noch keinen Wert.</p>
{:else if w}
  <button class="kopfzeile flach" aria-expanded={aufgeklappt} onclick={() => (aufgeklappt = !aufgeklappt)}>
    <span class="steps">▼ {w.malsteps} · ▲ {w.abzug - (p.skillstufe ?? 0)}{#if p.skillstufe}{' · '}{d.darstellung.typen.skill.zeichen} {p.skillstufe}{/if} · netto {w.netto}</span>
    {#if w.moeglich}
      <span class="ziel"><span class="hinweis">Zielwert</span> <strong>{w.zielwert}</strong> <span class="hinweis">Krit ≤</span> <strong>{w.krit_schwelle}</strong></span>
    {:else}
      <strong class="fehler">keine Probe möglich</strong>
    {/if}
  </button>
  {#if aufgeklappt}
    <table class="rechnung">
      <tbody>
        <tr><td><Begriff art="stat" name={statName(anfrage.stat, d)} darstellung={d.darstellung} /></td><td>{p.statwert}</td></tr>
        {#if anfrage.skill}
          <tr><td><Begriff art="skill" name={skillName(anfrage.skill, d)} darstellung={d.darstellung} /> {p.skillstufe}</td>
            <td>{p.skillstufe === 0 ? `▼${d.regeln.steps.skill_null_malsteps} (Stufe 0)` : `gleicht ${p.skillstufe} aus`}</td></tr>
        {/if}
        {#each p.quellen as q (q.id)}
          {@const h = zeichen(q.herkunft)}
          <tr><td>{#if h}<span style:color={h.farbe}>{h.zeichen}</span> {/if}{q.name}</td><td>{stepsText(q)}</td></tr>
        {/each}
        <tr class="summe"><td>netto {malstepsText(w.netto)}{w.uebrig ? `, ${w.uebrig} übrig für die Krit-Schwelle` : ''}</td>
          <td>{w.moeglich ? `${w.zielwert} · Krit ≤ ${w.krit_schwelle}` : 'keine Probe'}</td></tr>
      </tbody>
    </table>
  {/if}
{/if}

{#if p.automatisch.length}
  <h3>Automatisch</h3>
  <ul class="chips">
    {#each p.automatisch as q (q.id)}
      {@const aus = ausgeschaltet.includes(q.id!)}
      {@const h = zeichen(q.herkunft)}
      <li class="chip" class:aus>
        <span>{#if h}<span style:color={h.farbe} aria-hidden="true">{h.zeichen}</span> {/if}{q.name} <strong>{stepsText(q)}</strong></span>
        <button class="flach klein" aria-label={aus ? `${q.name} wieder einschalten` : `${q.name} für diese Probe ausschalten`}
          onclick={() => umschalten(q.id!)}>{aus ? '↺' : '×'}</button>
        {#if q.id?.startsWith('sl_gefecht:')}
          <button class="flach klein gefahr-text" aria-label="{q.name} für das Gefecht löschen"
            onclick={() => onaendern(slGefechtLoeschen(c, q.id!.slice('sl_gefecht:'.length)))}>löschen</button>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

{#if sichtSchalter}
  <label class="schalter"><input type="checkbox" bind:checked={brauchtSicht} /> braucht Sicht</label>
  {#if brauchtSicht}
    <div class="auswahl" role="group" aria-label="Sicht">
      <span class="hinweis">Sicht:</span>
      {#each d.regeln.sicht.stufen as s (s.id)}
        <button class:an={sichtstufe === s.id} aria-pressed={sichtstufe === s.id} onclick={() => sichtWaehlen(s.id)}>{s.name}</button>
      {/each}
    </div>
  {/if}
{/if}

<h3>SL</h3>
<div class="sl">
  <div class="zaehler">
    <span>+ Malstep</span>
    <span class="stepper">
      <button aria-label="einen Malstep weniger" disabled={!sl.malsteps} onclick={() => zaehler('malsteps', -1)}>−</button>
      <strong>▼{sl.malsteps}</strong>
      <button aria-label="einen Malstep mehr" onclick={() => zaehler('malsteps', 1)}>+</button>
    </span>
  </div>
  <div class="zaehler">
    <span>+ Stepshield</span>
    <span class="stepper">
      <button aria-label="einen Stepshield weniger" disabled={!sl.stepshields} onclick={() => zaehler('stepshields', -1)}>−</button>
      <strong>▲{sl.stepshields}</strong>
      <button aria-label="einen Stepshield mehr" onclick={() => zaehler('stepshields', 1)}>+</button>
    </span>
  </div>
  <input placeholder="Grund (optional)" aria-label="Grund" bind:value={sl.grund} />
  {#if g?.lage.letzte_gruende.length}
    <div class="gruende">
      {#each g.lage.letzte_gruende as grund (grund)}<button class="klein" onclick={() => (sl = { ...sl, grund })}>{grund}</button>{/each}
    </div>
  {/if}
  {#if g && (sl.malsteps || sl.stepshields)}
    <button onclick={fuersGefecht}>Für das ganze Gefecht merken</button>
  {/if}
</div>

{#if perks.length}
  <ul class="perks">
    {#each perks as perk (perk.id)}
      <li><Begriff art="perk" name={perk.name} darstellung={d.darstellung} />: {perk.kurz}</li>
    {/each}
  </ul>
{/if}

{#if w?.moeglich}
  <Wuerfel art="W100" modus={wuerfelModus} titel="Wurf" {mitAusgang} onwurf={(x) => gewuerfelt(x.ergebnis)} onausgang={ausgang} />
{/if}

{#if ergebnis}
  <p class="ansage {ergebnis.stufe}" aria-live="polite">
    {ansage(ergebnis.stufe, ergebnis.wurf, zielwertAnsagen && w ? w.zielwert : undefined)}
  </p>
{/if}

<style>
  h3 { font-size: 0.9rem; color: var(--text-2); margin: 16px 0 6px; }
  .kopfzeile { width: 100%; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 12px;
    padding: 8px 12px; background: var(--flaeche-2); border-radius: var(--radius); text-align: left; position: sticky; top: 0; z-index: 1; }
  .steps { font-variant-numeric: tabular-nums; }
  .ziel strong { font-size: 1.4rem; }
  .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .chip { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 0 0 12px;
    border: 1px solid var(--linie); border-radius: var(--radius); }
  .chip.aus > span { text-decoration: line-through; color: var(--text-2); }
  .klein { min-width: 44px; padding: 0 10px; }
  .gefahr-text { color: var(--gefahr); }
  .auswahl { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .auswahl button { padding: 0 12px; }
  .auswahl button.an, .gruende button:hover { background: var(--flaeche-2); font-weight: 700; border-color: var(--text-2); }
  .sl { display: flex; flex-direction: column; gap: 8px; }
  .zaehler { display: flex; justify-content: space-between; align-items: center; }
  .gruende { display: flex; flex-wrap: wrap; gap: 6px; }
  .perks { margin: 12px 0; padding-left: 20px; }
  .ansage { font-size: 1.8rem; font-weight: 800; text-align: center; margin: 12px 0; padding: 12px; border-radius: var(--radius);
    background: var(--flaeche-2); }
  .ansage.krit, .ansage.erfolg { color: var(--ok); }
  .ansage.misserfolg { color: var(--gefahr); }
  :global(.dialog) .ansage { margin-bottom: 4px; }
</style>
