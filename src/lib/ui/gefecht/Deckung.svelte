<script lang="ts">
  // Deckung auf der Figur (konzept.md § 3.9; Regelwerk: Deckung und Rüstung, Deckung). Nur im Gefecht.
  // Abschnitte: Figur mit Schraffur (Zonen antippen) · Deckungskante (Richtung und Stufe) · Deckungswert
  // (Zähler mit den passenden Deckungen in Klammern; darunter aufklappbar die Liste der Deckungen, Pfeil wie im Menü).
  // Die Kante wird über Knöpfe gesetzt statt gezogen (docs/offen.md, Schritt 7). Ein Wert ändert sich; kein Bericht nötig.
  import { untrack } from 'svelte';
  import type { Spieldaten } from '../../daten/typen';
  import { deckungSetzen, deckungZonen, kantenstufen } from '../../regeln/gefecht';
  import { gefechtVon } from '../../regeln/probenrechner';
  import type { Charakter, Deckungskante } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';
  import Silhouette from '../Silhouette.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, onfertig, onabbrechen }: Props = $props();

  const alt = untrack(() => gefechtVon(c)?.deckung ?? null);
  // Ältere Einträge ohne Kante und Antippen: die gespeicherten Zonen gelten als angetippt.
  let kante = $state<Deckungskante | null>(alt ? (alt.kante ?? null) : null);
  let getippt = $state<string[]>(alt ? (alt.getippt ?? (alt.kante ? [] : alt.zonen)) : []);
  let art = $state<string | null>(alt?.art ?? null);
  let wert = $state<number | null>(alt ? alt.wert : null);
  let hinweis = $state('');

  const richtungen = $derived(['unten', ...Object.keys(d.regeln.deckung.kante_seite)]);
  const stufen = $derived(kante ? kantenstufen(kante.richtung, d) : []);
  const zonen = $derived(deckungZonen(kante, getippt, d));
  const durchKante = $derived(deckungZonen(kante, [], d));
  const werte = $derived([...d.schutz.deckung, ...d.schutz.fahrzeugpanzerung].sort((a, b) => a.wert - b.wert));
  const zonenName = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.name ?? id;
  /** Name ohne Zusatz in Klammern („dünne Holztür (5 cm)“ → „dünne Holztür“), damit er in die Klammer am Zähler passt. */
  const kurzname = (n: string) => n.replace(/\s*\(.*\)\s*$/, '');
  const passend = $derived(wert === null ? [] : werte.filter((x) => x.wert === wert).map((x) => kurzname(x.name)));
  let listeOffen = $state(false);

  function richtungWaehlen(r: string | null) {
    hinweis = '';
    if (r === null) kante = null;
    else if (kante?.richtung !== r) kante = { richtung: r, stufe: Math.min(kante?.stufe ?? 0, kantenstufen(r, d).length - 1) };
  }

  /** Zone antippen: verdecken oder wieder freigeben. Was die Kante verdeckt, gibt nur die Kante frei. */
  function antippen(z: string) {
    hinweis = '';
    if (durchKante.includes(z)) {
      hinweis = `${zonenName(z)} verdeckt die Kante. Stell die Kante niedriger, um die Zone freizugeben.`;
      return;
    }
    // Jede Zone zählt für sich, auch am Rumpf (Regelfrage R31, entschieden).
    getippt = zonen.includes(z) ? getippt.filter((x) => x !== z) : [...getippt, z];
  }

  function wertWaehlen(id: string | null, w: number) {
    art = id;
    wert = w;
    if (id) listeOffen = false;
  }

  const kantenText = $derived(
    kante ? `Kante von ${kante.richtung} bis: ${stufen[kante.stufe]?.name ?? ''}` : 'Keine Kante'
  );
</script>

<Dialog titel="Deckung">
  <div class="abschnitte">
    <section class="abschnitt">
      <h3 class="abschnitt-titel">Was ist verdeckt?</h3>
      <Silhouette {d} verdeckt={zonen} onwahl={antippen} beschriftung="Körperbild mit Deckung; Zone antippen, um sie zu verdecken" />
      {#if hinweis}<p class="warnung" aria-live="polite">{hinweis}</p>{/if}
      <p class="hinweis">Schraffiert ist verdeckt. Tippe Zonen an, um sie einzeln zu verdecken (z. B. am Fenster nur den Kopf frei lassen).</p>
    </section>

    <section class="abschnitt">
      <h3 class="abschnitt-titel">Deckungskante</h3>
      <div class="gruppe">
        <span class="gruppe-titel">Kante von: {kante ? kante.richtung : 'keine'}</span>
        <div class="auswahlreihe gleich" role="group" aria-label="Richtung der Deckungskante">
          <button aria-pressed={kante === null} onclick={() => richtungWaehlen(null)}>keine</button>
          {#each richtungen as r (r)}
            <button aria-pressed={kante?.richtung === r} onclick={() => richtungWaehlen(r)}>{r}</button>
          {/each}
        </div>
      </div>
      {#if kante}
        <div class="gruppe">
          <span class="gruppe-titel">{kantenText}</span>
          <div class="auswahlreihe" role="group" aria-label="Höhe der Deckungskante">
            {#each stufen as s, i (s.name)}
              <button aria-pressed={kante.stufe === i} onclick={() => { hinweis = ''; kante = { richtung: kante!.richtung, stufe: i }; }}>{s.name}</button>
            {/each}
          </div>
        </div>
        {#if kante.richtung === 'unten'}
          <p class="hinweis">Reicht die Kante bis zur Brust, sind auch beide Arme verdeckt.</p>
        {:else}
          <p class="hinweis">Von der Seite verdeckt die Kante nur den Arm dieser Seite (R und L auf der Figur).</p>
        {/if}
      {/if}
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
      {#if wert === null && zonen.length}<p class="warnung">Wähle den Deckungswert.</p>{/if}
      <button class="flach aufklapper" class:offen={listeOffen} aria-expanded={listeOffen} onclick={() => (listeOffen = !listeOffen)}>
        <span>Deckung auswählen</span><span class="pfeil" aria-hidden="true">›</span>
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
  </div>
  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Abbrechen</button>
    <button onclick={() => onfertig(deckungSetzen(c, { wert: 0, art: null, kante: null, getippt: [] }, d))}>Keine Deckung</button>
    <button class="haupt" disabled={zonen.length > 0 && wert === null}
      onclick={() => onfertig(deckungSetzen(c, { wert: wert ?? 0, art, kante, getippt }, d))}>Eintragen</button>
  {/snippet}
</Dialog>

<style>
  .zaehler { display: flex; align-items: center; flex-wrap: wrap; gap: var(--abstand-2); }
  .zaehler strong { font-size: 1.3rem; }
  /* Aufklappen wie im Menü: Pfeil › zu, nach unten gedreht offen. */
  .aufklapper { display: flex; align-items: center; justify-content: space-between; width: 100%; }
  .pfeil { display: inline-block; font-size: 1.5rem; line-height: 1; color: var(--text-2); transition: transform 150ms ease-out; }
  .aufklapper.offen .pfeil { transform: rotate(90deg); color: var(--akzent); }
  @media (prefers-reduced-motion: reduce) { .pfeil { transition: none; } }
</style>
