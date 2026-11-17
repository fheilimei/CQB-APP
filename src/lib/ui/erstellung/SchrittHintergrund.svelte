<script lang="ts">
  // Schritt 6: Hintergrund (konzept.md § 3.0; Regelwerk: Schulden, Coups und Verträge). Startgeld läuft live mit.
  import type { Spieldaten } from '../../daten/typen';
  import { erstellungsklasse, GROESSEN, postenText, rueckzahlung, startgeld } from '../../regeln/erstellung';
  import type { Charakter } from '../../speicher/charakter';
  import { geld } from '../texte';

  interface Props { c: Charakter; d: Spieldaten }
  let { c = $bindable(), d }: Props = $props();
  const h = $derived(c.hintergrund);
  const sg = $derived(startgeld(c, d));
  const k = $derived(erstellungsklasse(c.erstellung!, d));
  const g = $derived(d.regeln.geld);
  const groessen = ['klein', 'mittel', 'gross'] as const;
  const FEINDE = { klein: 'ein Einzelner', mittel: 'eine Bande oder Firma', gross: 'eine Organisation oder Behörde' };
</script>

<div class="startgeld karte" aria-live="polite">
  <span>Startgeld</span><strong>{geld(sg.summe)}</strong>
  <span class="hinweis teile">{sg.posten.map(postenText).join(' + ')}</span>
</div>

<section class="karte option" class:an={h.schulden}>
  <label class="schalter"><input type="checkbox" checked={!!h.schulden}
    onchange={(e) => (c.hintergrund.schulden = (e.target as HTMLInputElement).checked ? { groesse: 'klein', glaeubiger: '', frist_auftraege: 0, sicherheit: '' } : null)} />
    <strong>Schulden</strong> <span class="hinweis">Du hast dir Geld geliehen.</span></label>
  {#if c.hintergrund.schulden}
    <div class="gruppe" role="group" aria-label="Größe der Schulden">
      <span class="gruppe-titel">Größe:</span>
      <div class="auswahlreihe">
      {#each groessen as gr (gr)}
        <button aria-pressed={c.hintergrund.schulden.groesse === gr} onclick={() => (c.hintergrund.schulden!.groesse = gr)}>{GROESSEN[gr]}</button>
      {/each}
      </div>
    </div>
    <p>+{geld(g.schulden[c.hintergrund.schulden.groesse])} · Rückzahlung {geld(rueckzahlung(c.hintergrund.schulden.groesse, d))} bis zur Frist</p>
    <label class="feld">Gläubiger
  <input id="gl" bind:value={c.hintergrund.schulden.glaeubiger} /></label>
    <label class="feld">Frist (in Aufträgen)
  <input id="fr" type="number" inputmode="numeric" min="1" bind:value={c.hintergrund.schulden.frist_auftraege} /></label>
    <label class="feld">Sicherheit
  <input id="si" bind:value={c.hintergrund.schulden.sicherheit} /></label>
  {/if}
</section>

<section class="karte option" class:an={h.coup}>
  <label class="schalter"><input type="checkbox" checked={!!h.coup}
    onchange={(e) => (c.hintergrund.coup = (e.target as HTMLInputElement).checked ? { groesse: 'klein', beute: '', feind: '' } : null)} />
    <strong>Coup</strong> <span class="hinweis">Du hast etwas erbeutet und zu Geld gemacht.</span></label>
  {#if c.hintergrund.coup}
    <div class="gruppe" role="group" aria-label="Größe des Coups">
      <span class="gruppe-titel">Größe:</span>
      <div class="auswahlreihe">
      {#each groessen as gr (gr)}
        <button aria-pressed={c.hintergrund.coup.groesse === gr} onclick={() => (c.hintergrund.coup!.groesse = gr)}>{GROESSEN[gr]}</button>
      {/each}
      </div>
    </div>
    <p>+{geld(g.coup[c.hintergrund.coup.groesse])} · Feind: {FEINDE[c.hintergrund.coup.groesse]}</p>
    <label class="feld">Beute
  <input id="be" bind:value={c.hintergrund.coup.beute} /></label>
    <label class="feld">Feind
  <input id="fe" bind:value={c.hintergrund.coup.feind} /></label>
  {/if}
</section>

<section class="karte option" class:an={h.vertrag}>
  <label class="schalter"><input type="checkbox" checked={!!h.vertrag}
    onchange={(e) => (c.hintergrund.vertrag = (e.target as HTMLInputElement).checked ? { auftraggeber: '', verpflichtung: '' } : null)} />
    <strong>Vertrag</strong> <span class="hinweis">Du bist einem Auftraggeber verpflichtet.</span></label>
  {#if c.hintergrund.vertrag}
    <p>Gehalt pro Auftrag: {k ? geld(k.gehalt) : 'keins (ohne Klasse)'}{k && k.stufe >= g.einstiegsgehalt_ab_stufe ? ` · Einstiegsgehalt +${geld(k.gehalt)}` : ''}</p>
    <label class="feld">Auftraggeber
  <input id="ag" bind:value={c.hintergrund.vertrag.auftraggeber} /></label>
    <label class="feld">Verpflichtung
  <input id="vp" bind:value={c.hintergrund.vertrag.verpflichtung} /></label>
  {/if}
</section>

<label class="feld">Geburtsort
  <input id="ort" bind:value={c.hintergrund.geburtsort} /></label>
<label class="feld">Wichtige Personen
  <textarea id="pers" rows="2" bind:value={c.hintergrund.personen}></textarea></label>
<label class="feld">Lebensmittelpunkt
  <input id="lm" bind:value={c.hintergrund.lebensmittelpunkt} /></label>

<style>
  .startgeld { position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: 1fr auto; gap: 2px var(--abstand-2); padding: var(--abstand-2) var(--abstand-3); }
  .startgeld strong { font-size: 1.2rem; }
  .teile { grid-column: 1 / -1; }
  .option.an { border-color: var(--akzent); }
  .schalter { flex-wrap: wrap; }
</style>
