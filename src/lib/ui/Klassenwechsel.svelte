<script lang="ts">
  // Klassenwechsel im Aufstiegsmodus (konzept.md § 3.0d; Regelwerk: Charakteraufstieg, Klassenwechsel; Klassen).
  // Abschnitte: Wohin (Beförderung · Zweite Spezialisierung · Laufbahnwechsel, je Klasse mit Kurzprüfung) ·
  // Prüfung (je Bedingung erfüllt oder was fehlt, dazu die Freigabe der SL) · Was sich ändert · Bericht.
  // Fehlendes kauft der Spieler vorher im Aufstiegsmodus; der Wechsel selbst kostet nichts und ist nicht rücknehmbar.
  import type { Spieldaten } from '../daten/typen';
  import {
    aktuelleKlasse, gehalt, klassenwechselPruefen, klasseWechseln, vorratslevel, wechselVorschau, wechselZiele,
    type Pruefpunkt, type Wechselart, type Wechselziel
  } from '../regeln/aufstieg';
  import type { Charakter } from '../speicher/charakter';
  import Bericht from './Bericht.svelte';
  import Dialog from './Dialog.svelte';
  import Farbtext from './Farbtext.svelte';
  import { geld, klasseName, laufbahnName, mitZeichen, punkte, stufeName, type Zeile } from './texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, onfertig, onabbrechen }: Props = $props();

  let gewaehlt = $state<Wechselziel | null>(null);
  let freigabe = $state(false);
  let bericht = $state<Zeile[] | null>(null);

  const ziele = $derived(wechselZiele(c, d));
  const ohneKlasse = $derived(aktuelleKlasse(c) === null);
  const ARTEN: { art: Wechselart; titel: string }[] = [
    { art: 'befoerderung', titel: 'Beförderung' },
    { art: 'zweite_spezialisierung', titel: 'Zweite Spezialisierung' },
    { art: 'wechsel', titel: 'Laufbahnwechsel' }
  ];
  const klasse = (id: string) => d.klassen.eintraege.find((k) => k.id === id)!;
  const pruefen = (z: Wechselziel) => klassenwechselPruefen(c, z.klasse, d, z.art === 'zweite_spezialisierung');
  const kosten = (p: Pruefpunkt[]) => p.reduce((s, x) => s + (x.erfuellt ? 0 : x.kosten ?? 0), 0);
  const alleErfuellt = (p: Pruefpunkt[]) => p.every((x) => x.erfuellt);

  const punkteListe = $derived(gewaehlt ? pruefen(gewaehlt) : []);
  const vorschau = $derived(gewaehlt ? wechselVorschau(c, gewaehlt.klasse, d, gewaehlt.art === 'zweite_spezialisierung') : null);
  const danach = $derived(gewaehlt ? klasseWechseln(c, gewaehlt) : null);
  const zielStufe = $derived(gewaehlt ? klasse(gewaehlt.klasse).stufe + (gewaehlt.art === 'zweite_spezialisierung' ? 1 : 0) : 0);
  const bereit = $derived(!!gewaehlt && alleErfuellt(punkteListe) && freigabe);

  function waehlen(z: Wechselziel) { gewaehlt = z; freigabe = false; }

  function pruefText(p: Pruefpunkt): string {
    const k = klasse(gewaehlt!.klasse);
    switch (p.art) {
      case 'rank_set': return `Rank-Set der Stufe ${zielStufe} (${stufeName(zielStufe, d)})${p.erfuellt ? '' : `: dir fehlen mindestens ${p.kosten} Statrank-Ups`}`;
      case 'mindestskills': {
        if (p.erfuellt) return 'Mindestskills';
        const fehlt = Object.entries(p.fehlt ?? {}).map(([id, w]) => `${mitZeichen('skill', id, d)} ${w} (du hast ${c.skills[id] ?? 0})`);
        return `Mindestskills: ${fehlt.join(', ')}`;
      }
      case 'mindestskills_wahl': {
        const w = k.mindestskills_wahl!;
        return `${w.anzahl} Skills auf ${w.wert}, davon ${w.davon_exklusiv} exklusiv aus einer Spezialisierung deines Wegs`;
      }
      case 'stat_rang': {
        const v = k.voraussetzung_stat!;
        return `${mitZeichen('stat', v.stat, d)} auf Rang ${v.rang}${p.erfuellt ? '' : ` (du hast ${c.stats[v.stat]?.rang ?? '–'})`}`;
      }
      case 'weg':
        if (k.art === 'erweiterte_form') return `${klasseName(k.erweitert!, d)} in deinem Klassenweg`;
        if (k.art === 'meister') return `Du kommst aus einer Klasse der Stufe 4 der Laufbahn ${laufbahnName(k.laufbahn, d)}`;
        return `Eine andere Spezialisierung der Laufbahn ${laufbahnName(k.laufbahn, d)} in deinem Klassenweg`;
    }
  }
  const namen = (art: 'skill' | 'perk', ids: string[]) => ids.map((id) => mitZeichen(art, id, d)).join(', ');

  function weiter() {
    if (!gewaehlt || !vorschau || !danach) return;
    const k = klasse(gewaehlt.klasse);
    const art = ARTEN.find((a) => a.art === gewaehlt!.art)!.titel;
    const z: Zeile[] = [{ text: `${art}: Du wirst ${k.name} (Stufe ${zielStufe}, ${laufbahnName(k.laufbahn, d)}).`, fett: true }];
    z.push({ text: 'Deine Stats, Skills und Perks bleiben, wie sie sind. Der Wechsel kostet keine Punkte.' });
    if (vorschau.eingefroren.length) z.push({ text: `Eingefroren (behalten ihren Wert, aber du kannst sie nicht mehr steigern): ${namen('skill', vorschau.eingefroren)}.` });
    if (vorschau.wieder_steigerbar.length) z.push({ text: `Wieder steigerbar: ${namen('skill', vorschau.wieder_steigerbar)}.` });
    z.push({ text: `Vorratslevel ${vorratslevel(danach, d) ?? '–'}, Gehalt ${geld(gehalt(danach, d) ?? 0)} pro Auftrag${c.hintergrund.vertrag ? '' : ' (nur mit Vertrag)'}.` });
    z.push({ text: 'Ein Klassenwechsel lässt sich nicht zurücknehmen.' });
    bericht = z;
  }
</script>

{#if bericht && danach}
  <Bericht titel="Klasse wechseln" zeilen={bericht} onweiter={() => onfertig(danach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Klasse wechseln">
    <div class="abschnitte">
      <section class="abschnitt">
        <h3 class="abschnitt-titel">Wohin?</h3>
        {#each ARTEN as a (a.art)}
          {@const liste = ziele.filter((z) => z.art === a.art)}
          {#if liste.length}
            <div class="gruppe">
              {#if !ohneKlasse}<span class="gruppe-titel">{a.titel}</span>{/if}
              <div class="auswahlliste">
                {#each liste as z (z.klasse + z.art)}
                  {@const p = pruefen(z)}
                  {@const kz = klasse(z.klasse)}
                  <button aria-pressed={gewaehlt?.klasse === z.klasse && gewaehlt.art === z.art} onclick={() => waehlen(z)}>
                    {kz.name}
                    <small>Stufe {kz.stufe + (z.art === 'zweite_spezialisierung' ? 1 : 0)}{a.art === 'wechsel' ? ` · ${laufbahnName(kz.laufbahn, d)}` : ''} ·
                      {alleErfuellt(p) ? '✓ alles erfüllt' : kosten(p) ? `fehlt: mindestens ${punkte(kosten(p))}` : 'fehlt noch etwas'}</small>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
        {#if !ziele.length}<p class="hinweis">Es gibt keine Klasse, in die du wechseln kannst.</p>{/if}
      </section>

      {#if gewaehlt && vorschau && danach}
        <section class="abschnitt">
          <h3 class="abschnitt-titel">Prüfung</h3>
          <ul class="pruefung">
            {#each punkteListe as p, i (i)}
              <li class:fehlt={!p.erfuellt}><span class="marke" aria-label={p.erfuellt ? 'erfüllt' : 'fehlt'}>{p.erfuellt ? '✓' : '✗'}</span>
                <span><Farbtext text={pruefText(p)} /></span></li>
            {/each}
          </ul>
          {#if !alleErfuellt(punkteListe)}
            <p class="hinweis">Fehlendes kaufst du vorher im Aufstiegsmodus{kosten(punkteListe) ? `: mindestens ${punkte(kosten(punkteListe))}, du hast ${c.freie_punkte}` : ''}.</p>
          {/if}
          <label class="schalter"><input type="checkbox" bind:checked={freigabe} /> Die SL gibt den Wechsel frei</label>
          <p class="hinweis">{gewaehlt.art === 'befoerderung' ? 'Bei der Beförderung entscheidet die SL, ob die Bedingungen der Laufbahn erfüllt sind.' : 'Den Anlass liefert die Geschichte; die SL gibt den Wechsel frei.'}</p>
        </section>

        <section class="abschnitt">
          <h3 class="abschnitt-titel">Was sich ändert</h3>
          <ul class="aenderungen">
            <li>Vorratslevel {vorratslevel(c, d) ?? '–'} → {vorratslevel(danach, d) ?? '–'}, Gehalt {geld(gehalt(c, d) ?? 0)} → {geld(gehalt(danach, d) ?? 0)} pro Auftrag</li>
            {#if vorschau.eingefroren.length}<li><Farbtext text={`Eingefroren: ${namen('skill', vorschau.eingefroren)}`} /></li>{/if}
            {#if vorschau.wieder_steigerbar.length}<li><Farbtext text={`Wieder steigerbar: ${namen('skill', vorschau.wieder_steigerbar)}`} /></li>{/if}
            {#if vorschau.neue_skills.length}<li><Farbtext text={`Neu im Zugang: ${namen('skill', vorschau.neue_skills)}`} /></li>{/if}
            {#if vorschau.neue_perks.length}<li><Farbtext text={`Neue Perks im Zugang: ${namen('perk', vorschau.neue_perks)}`} /></li>{/if}
          </ul>
        </section>
      {/if}
    </div>
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!bereit} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}

<style>
  .pruefung, .aenderungen { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--abstand-2); }
  .pruefung li { display: flex; gap: var(--abstand-2); align-items: baseline; }
  .marke { flex: none; width: 1.2em; text-align: center; color: var(--ok); }
  .fehlt .marke { color: var(--gefahr); }
</style>
