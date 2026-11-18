<script lang="ts">
  // Lage-Auswahl Block 2 ohne Entfernung (konzept.md § 3.8c): Bewegung, Stand und Größe des Ziels, Schütze. Gemeinsam
  // für Schießen und Werfen; Umstände mit `nicht_fuer` für den Ablauf fehlen. Die Wahl gilt im Gefecht weiter.
  import type { BandId, Spieldaten } from '../../daten/typen';
  import { lageWaehlen } from '../../regeln/aktionen';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { lageAuswahl } from '../../regeln/schuss';
  import type { Charakter, Gefecht } from '../../speicher/charakter';
  import { bandName, stepsText } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    /** Abläufe für `nicht_fuer` (z. B. ['schiessen'] oder ['werfen', 'sprengwaffe']). */
    ablauf: string[];
    band: BandId | null;
    onaendern: (c: Charakter) => void;
  }
  let { c, d, ablauf, band, onaendern }: Props = $props();

  const g = $derived(gefechtVon(c) as Gefecht);
  const auswahl = $derived(lageAuswahl(g, d));
  const gruppen = $derived(d.regeln.lage.gruppen.filter((gr) => gr.quelle !== 'reichweite'));

  function umstandWahl(gruppe: string, id: string, art: 'eins' | 'schalter') {
    if (art === 'eins') onaendern(lageWaehlen(c, gruppe, id));
    else {
      const liste = (auswahl[gruppe] as string[]) ?? [];
      onaendern(lageWaehlen(c, gruppe, liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]));
    }
  }
</script>

{#each gruppen as gr (gr.id)}
  {@const umst = d.regeln.lage.umstaende.filter((u) => u.gruppe === gr.id && !u.nicht_fuer?.some((a) => ablauf.includes(a)))}
  {#if umst.length}
    <div class="gruppe" role="group" aria-label={gr.name}>
      <span class="gruppe-titel">{gr.name}:</span>
      <div class="auswahlreihe">
        {#each umst as u (u.id)}
          {@const an = gr.auswahl === 'eins' ? auswahl[gr.id] === u.id : ((auswahl[gr.id] as string[]) ?? []).includes(u.id)}
          {@const gesperrt = !!u.nur_ohne_eigene_bewegung && (!!g.bewegt || g.gehechtet)}
          {@const wirktNicht = !!band && !!u.nicht_in_baendern?.includes(band)}
          <button class:wirkungslos={wirktNicht} aria-pressed={an} disabled={gesperrt} onclick={() => umstandWahl(gr.id, u.id, gr.auswahl)}>
            {u.name}<small>{stepsText(u) || '±0'}</small></button>
        {/each}
      </div>
      {#each umst as u (u.id)}
        {@const an = gr.auswahl === 'eins' ? auswahl[gr.id] === u.id : ((auswahl[gr.id] as string[]) ?? []).includes(u.id)}
        {#if an && u.hinweis}<p class="hinweis">{u.name}: {u.hinweis}.</p>{/if}
        {#if an && band && u.nicht_in_baendern?.includes(band)}<p class="hinweis">{u.name}: wirkt nicht im Band {bandName(band, d)}.</p>{/if}
        {#if u.nur_ohne_eigene_bewegung && (g.bewegt || g.gehechtet)}<p class="hinweis">{u.name}: gesperrt, du hast dich in dieser Runde bewegt.</p>{/if}
      {/each}
    </div>
  {/if}
{/each}
