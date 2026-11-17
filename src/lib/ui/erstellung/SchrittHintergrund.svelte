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
    <div class="wahl" role="group" aria-label="Größe der Schulden">
      <span>Größe:</span>
      {#each groessen as gr (gr)}
        <button aria-pressed={c.hintergrund.schulden.groesse === gr} onclick={() => (c.hintergrund.schulden!.groesse = gr)}>{GROESSEN[gr]}</button>
      {/each}
    </div>
    <p>+{geld(g.schulden[c.hintergrund.schulden.groesse])} · Rückzahlung {geld(rueckzahlung(c.hintergrund.schulden.groesse, d))} bis zur Frist</p>
    <label for="gl">Gläubiger</label><input id="gl" bind:value={c.hintergrund.schulden.glaeubiger} />
    <label for="fr">Frist (in Aufträgen)</label><input id="fr" type="number" inputmode="numeric" min="1" bind:value={c.hintergrund.schulden.frist_auftraege} />
    <label for="si">Sicherheit</label><input id="si" bind:value={c.hintergrund.schulden.sicherheit} />
  {/if}
</section>

<section class="karte option" class:an={h.coup}>
  <label class="schalter"><input type="checkbox" checked={!!h.coup}
    onchange={(e) => (c.hintergrund.coup = (e.target as HTMLInputElement).checked ? { groesse: 'klein', beute: '', feind: '' } : null)} />
    <strong>Coup</strong> <span class="hinweis">Du hast etwas erbeutet und zu Geld gemacht.</span></label>
  {#if c.hintergrund.coup}
    <div class="wahl" role="group" aria-label="Größe des Coups">
      <span>Größe:</span>
      {#each groessen as gr (gr)}
        <button aria-pressed={c.hintergrund.coup.groesse === gr} onclick={() => (c.hintergrund.coup!.groesse = gr)}>{GROESSEN[gr]}</button>
      {/each}
    </div>
    <p>+{geld(g.coup[c.hintergrund.coup.groesse])} · Feind: {FEINDE[c.hintergrund.coup.groesse]}</p>
    <label for="be">Beute</label><input id="be" bind:value={c.hintergrund.coup.beute} />
    <label for="fe">Feind</label><input id="fe" bind:value={c.hintergrund.coup.feind} />
  {/if}
</section>

<section class="karte option" class:an={h.vertrag}>
  <label class="schalter"><input type="checkbox" checked={!!h.vertrag}
    onchange={(e) => (c.hintergrund.vertrag = (e.target as HTMLInputElement).checked ? { auftraggeber: '', verpflichtung: '' } : null)} />
    <strong>Vertrag</strong> <span class="hinweis">Du bist einem Auftraggeber verpflichtet.</span></label>
  {#if c.hintergrund.vertrag}
    <p>Gehalt pro Auftrag: {k ? geld(k.gehalt) : 'keins (ohne Klasse)'}{k && k.stufe >= g.einstiegsgehalt_ab_stufe ? ` · Einstiegsgehalt +${geld(k.gehalt)}` : ''}</p>
    <label for="ag">Auftraggeber</label><input id="ag" bind:value={c.hintergrund.vertrag.auftraggeber} />
    <label for="vp">Verpflichtung</label><input id="vp" bind:value={c.hintergrund.vertrag.verpflichtung} />
  {/if}
</section>

<label for="ort">Geburtsort</label><input id="ort" bind:value={c.hintergrund.geburtsort} />
<label for="pers">Wichtige Personen</label><textarea id="pers" rows="2" bind:value={c.hintergrund.personen}></textarea>
<label for="lm">Lebensmittelpunkt</label><input id="lm" bind:value={c.hintergrund.lebensmittelpunkt} />

<style>
  .startgeld { position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 10px 16px; }
  .startgeld strong { font-size: 1.2rem; }
  .teile { grid-column: 1 / -1; }
  .option { margin-top: 12px; }
  .option.an { border-color: var(--akzent); }
  .schalter { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0; font-weight: 400; min-height: 44px; }
  .schalter input { width: 22px; height: 22px; min-height: 0; }
  .wahl { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
</style>
