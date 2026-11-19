<script lang="ts">
  // Deckung auf der Figur (konzept.md § 3.9; Regelwerk: Deckung und Rüstung, Deckung). Im Gefecht und in Ruhe.
  // Abschnitte: Figur mit Schraffur (Zonen antippen) · Deckungswert (Zähler mit den passenden Deckungen in Klammern;
  // darunter aufklappbar die Liste der Deckungen, Pfeil wie im Menü). Deckung nur durch Antippen (18.11.2026);
  // keine Zone angetippt = keine Deckung. Ein Wert ändert sich; kein Bericht nötig.
  import { untrack } from 'svelte';
  import type { Spieldaten } from '../../daten/typen';
  import { deckungSetzen, deckungZonen, schildHalten } from '../../regeln/gefecht';
  import { gefechtVon } from '../../regeln/probenrechner';
  import type { Charakter } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';
  import Silhouette from '../Silhouette.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, onfertig, onabbrechen }: Props = $props();

  const alt = untrack(() => c.spielstand.deckung ?? null);
  let getippt = $state<string[]>(alt ? (alt.getippt ?? alt.zonen) : []);
  let art = $state<string | null>(alt?.art ?? null);
  let wert = $state<number | null>(alt ? alt.wert : null);

  const zonen = $derived(deckungZonen(getippt, d));
  const werte = $derived([...d.schutz.deckung, ...d.schutz.fahrzeugpanzerung].sort((a, b) => a.wert - b.wert));
  /** Name ohne Zusatz in Klammern („dünne Holztür (5 cm)“ → „dünne Holztür“), damit er in die Klammer am Zähler passt. */
  const kurzname = (n: string) => n.replace(/\s*\(.*\)\s*$/, '');
  const passend = $derived(wert === null ? [] : werte.filter((x) => x.wert === wert).map((x) => kurzname(x.name)));
  let listeOffen = $state(false);

  // Ballistischer Schild: mitgeführte Deckung (Deckung und Rüstung, Ballistischer Schild). Außerhalb des Gefechts hier
  // umschaltbar; im Gefecht kostet Aufnehmen und Ablegen eine Mainaction und läuft über Main (Jede Aktion über ihren Knopf).
  const schild = $derived(c.ausruestung.schild ? (d.schutz.schilde.find((x) => x.id === c.ausruestung.schild!.id) ?? null) : null);
  const imGefecht = $derived(!!gefechtVon(c));
  let inHand = $state(untrack(() => !!c.spielstand.schild_gehalten));

  /** Zone antippen: verdecken oder wieder freigeben. */
  function antippen(z: string) {
    // Jede Zone zählt für sich, auch am Rumpf (Regelfrage R31, entschieden).
    getippt = zonen.includes(z) ? getippt.filter((x) => x !== z) : [...getippt, z];
  }

  function wertWaehlen(id: string | null, w: number) {
    art = id;
    wert = w;
    if (id) listeOffen = false;
  }
</script>

<Dialog titel="Deckung">
  <div class="abschnitte">
    <section class="abschnitt">
      <h3 class="abschnitt-titel">Was ist verdeckt?</h3>
      <Silhouette {d} verdeckt={zonen} deckungswert={wert} onwahl={antippen} beschriftung="Körperbild mit Deckung; Zone antippen, um sie zu verdecken" />
      <p class="hinweis">Schraffiert ist verdeckt. Tippe eine Zone an, um sie zu verdecken, noch einmal, um sie freizugeben. Ohne verdeckte Zone hast du keine Deckung.</p>
    </section>

    <section class="abschnitt">
      <h3 class="abschnitt-titel">Deckungswert</h3>
      <div class="zaehler">
        <span class="stepper">
          <button aria-label="Schutz eins weniger" disabled={(wert ?? 0) <= 0} onclick={() => wertWaehlen(null, (wert ?? 1) - 1)}>−</button>
          <strong aria-live="polite">{wert ?? '–'}</strong>
          <button aria-label="Schutz eins mehr" onclick={() => wertWaehlen(null, (wert ?? -1) + 1)}>+</button>
        </span>
        {#if passend.length}<span>({passend.join(', ')})</span>{/if}
      </div>
      {#if wert === null && zonen.length}<p class="warnung">Wähle einen Deckungswert oder eine Deckung aus.</p>{/if}
      <button class="flach aufklapper" aria-expanded={listeOffen} onclick={() => (listeOffen = !listeOffen)}>
        <span>Deckung auswählen</span><span class="klapppfeil" aria-hidden="true">›</span>
      </button>
      {#if listeOffen}
        <ul class="auswahlliste" role="group" aria-label="Deckung">
          {#each werte as x (x.id)}
            <li><button aria-pressed={art === x.id} onclick={() => wertWaehlen(x.id, x.wert)}>
              {x.name}<small>Schutz {x.wert}</small>
            </button></li>
          {/each}
        </ul>
      {/if}
    </section>
    {#if schild}
      <section class="abschnitt">
        <h3 class="abschnitt-titel">Schild</h3>
        {#if imGefecht}
          <p>{schild.name}: {inHand ? 'in der Hand' : 'nicht in der Hand'}.</p>
          <p class="hinweis">Aufnehmen, Ablegen und Fallenlassen über Main → {inHand ? 'Schild ablegen' : 'Schild aufnehmen'}.</p>
        {:else}
          <div class="gruppe">
            <span class="gruppe-titel">Dein Schild ist</span>
            <div class="umschalter" role="group" aria-label="Dein Schild ist">
              <button aria-pressed={inHand} onclick={() => (inHand = true)}>in der Hand</button>
              <button aria-pressed={!inHand} onclick={() => (inHand = false)}>abgelegt</button>
            </div>
          </div>
        {/if}
        {#if inHand}
          <p class="hinweis">Deckung mit Schutz {schild.deckung} für Kopf, Rumpf und Arme, nur gegen Angriffe von vorn. Beim Getroffen fragt die App, ob der Angriff von vorn kommt.</p>
        {/if}
      </section>
    {/if}
  </div>
  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Abbrechen</button>
    <button class="haupt" disabled={zonen.length > 0 && wert === null}
      onclick={() => onfertig(deckungSetzen(imGefecht || !schild ? c : schildHalten(c, inHand), { wert: wert ?? 0, art, getippt }, d))}>Eintragen</button>
  {/snippet}
</Dialog>

<style>
  .zaehler { display: flex; align-items: center; flex-wrap: wrap; gap: var(--abstand-2); }
  .zaehler strong { font-size: 1.3rem; }
  .aufklapper { display: flex; align-items: center; justify-content: space-between; width: 100%; }
</style>
