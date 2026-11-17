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
  import { dialogKopf } from '../dialogkopf';
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
    /** Sicht von Anfang an einrechnen (Abläufe, die Sicht verlangen: Schießen, Ladehemmung beheben, Reaktion). */
    sichtVorgewaehlt?: boolean;
    /** Ohne Würfel und Ansage: Der Ablauf (Schießen) würfelt selbst. */
    ohneWurf?: boolean;
    /** Steps der SL für diese Probe und ausgeschaltete Chips; bindbar, damit ein Ablauf damit weiterrechnen kann. */
    sl?: SlSteps;
    ausgeschaltet?: string[];
    /** Drei Knöpfe Krit · gelungen · misslungen zusätzlich zum Wurf. */
    mitAusgang?: boolean;
    /** Bei Misserfolg den Zielwert mit ansagen (Initiative). */
    zielwertAnsagen?: boolean;
    ergebnis?: ProbenErgebnis | null;
    onaendern: (c: Charakter) => void;
  }
  let {
    c, d, anfrage, hinweise, wuerfelModus, sichtSchalter = false, sichtVorgewaehlt = false, ohneWurf = false, mitAusgang = false,
    zielwertAnsagen = false, ergebnis = $bindable(null), sl = $bindable({ malsteps: 0, stepshields: 0, grund: '' }),
    ausgeschaltet = $bindable([]), onaendern
  }: Props = $props();

  let brauchtSicht = $state(false);
  $effect.pre(() => { brauchtSicht = sichtVorgewaehlt; });
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
  // Im Dialog stehen Zielwert und Krit-Schwelle im festen Kopf und bleiben beim Scrollen sichtbar.
  const dk = dialogKopf();
  const imDialog = !!dk;
  $effect(() => {
    if (!dk) return;
    dk.setzen(kopf);
    return () => dk.setzen(null);
  });
</script>

<div class="probe">
{#if !imDialog}{@render kopf()}{/if}

{#if p.automatisch.length}
  <div class="gruppe">
  <h3 class="gruppe-titel">Automatisch</h3>
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
  </div>
{/if}

{#if sichtSchalter}
  <label class="schalter"><input type="checkbox" bind:checked={brauchtSicht} /> braucht Sicht</label>
{/if}
{#if sichtSchalter || sichtVorgewaehlt}
  {#if brauchtSicht}
    <div class="gruppe" role="group" aria-label="Sicht">
      <span class="gruppe-titel">Sicht:</span>
      <div class="auswahlreihe">
      {#each d.regeln.sicht.stufen as s (s.id)}
        <button aria-pressed={sichtstufe === s.id} onclick={() => sichtWaehlen(s.id)}>{s.name}</button>
      {/each}
      </div>
    </div>
  {/if}
{/if}

<div class="gruppe">
<h3 class="gruppe-titel">Steps der SL</h3>
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
</div>

{#if perks.length}
  <ul class="perks">
    {#each perks as perk (perk.id)}
      <li><Begriff art="perk" name={perk.name} darstellung={d.darstellung} />: {perk.kurz}</li>
    {/each}
  </ul>
{/if}

{#if w?.moeglich && !ohneWurf}
  <Wuerfel art="W100" modus={wuerfelModus} titel="Wurf" {mitAusgang} onwurf={(x) => gewuerfelt(x.ergebnis)} onausgang={ausgang}>
    {#if ergebnis}
      <p class="ansage {ergebnis.stufe}">{ansage(ergebnis.stufe, ergebnis.wurf, zielwertAnsagen && w ? w.zielwert : undefined)}</p>
    {/if}
  </Wuerfel>
{/if}

</div>

{#snippet kopf()}
{#if p.statwert === null}
  <p class="fehler">{mitZeichen('stat', anfrage.stat, d)} hat noch keinen Wert.</p>
{:else if w}
  <div class="gruppe">
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
  </div>
{/if}
{/snippet}

<style>
  .probe { display: flex; flex-direction: column; gap: var(--abstand-3); }
  .kopfzeile { width: 100%; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: var(--abstand-1) var(--abstand-3);
    padding: var(--abstand-2) var(--abstand-3); background: var(--flaeche-2); border-radius: var(--radius); text-align: left; }
  .steps { font-variant-numeric: tabular-nums; }
  .ziel strong { font-size: 1.4rem; }
  .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--abstand-2); }
  .chip { display: flex; align-items: center; justify-content: space-between; gap: var(--abstand-2); padding: 0 0 0 var(--abstand-3);
    border: 1px solid var(--linie); border-radius: var(--radius); }
  .chip.aus > span { text-decoration: line-through; color: var(--text-2); }
  .klein { min-width: 44px; padding: 0 var(--abstand-2); }
  .gefahr-text { color: var(--gefahr); }
  .gruende button:hover { background: var(--flaeche-2); }
  .sl { display: flex; flex-direction: column; gap: var(--abstand-2); }
  .zaehler { display: flex; justify-content: space-between; align-items: center; }
  .gruende { display: flex; flex-wrap: wrap; gap: var(--abstand-2); }
  .perks { margin: 0; padding-left: var(--abstand-4); }
</style>
