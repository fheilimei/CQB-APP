<script lang="ts">
  /**
   * Senkrechte Reiterleiste am rechten Bildschirmrand.
   * Bildzeichen statt Text: Figur (Silhouette), Werte (Tabelle), Ausrüstung (Rucksack), Verlauf (aufgeschlagenes Buch).
   * Schwebt über dem Inhalt (der Inhalt läuft darunter durch). Lässt sich einklappen; dann bleibt eine Lasche am Rand.
   * Leiste und Lasche lassen sich mit senkrechtem Wischen am Rand hoch und runter schieben; beide teilen sich die
   * gemerkte Stelle, so geht die Leiste dort auf, wo die Lasche hängt.
   */
  type Reiter = 'figur' | 'werte' | 'ausruestung' | 'verlauf';
  let { reiter, eingeklappt, onwahl, onklappen, laschenHoehe, kopfHoehe, onlasche }: {
    reiter: Reiter; eingeklappt: boolean; onwahl: (r: Reiter) => void; onklappen: (zu: boolean) => void;
    /** 0 = ganz unten (über den unteren Leisten), 1 = ganz oben (unter der Kopfzeile). */
    laschenHoehe: number; kopfHoehe: number; onlasche: (h: number) => void;
  } = $props();

  const REITER: { id: Reiter; name: string }[] = [
    { id: 'figur', name: 'Figur' }, { id: 'werte', name: 'Werte' },
    { id: 'ausruestung', name: 'Ausrüstung' }, { id: 'verlauf', name: 'Verlauf' },
  ];
  const name = $derived(REITER.find((r) => r.id === reiter)?.name ?? '');

  // Schieben: Erst eine senkrechte Bewegung von mehr als 8 px zählt als Schieben, sonst ist es ein Tipp.
  // Die Stelle ist ein Anteil des freien Wegs, damit sie für Leiste und Lasche (verschieden hoch) und nach
  // Drehen des Handys passt. Bei gleichem Anteil liegt die Mitte der Lasche immer innerhalb der Leiste.
  let el: HTMLElement | undefined = $state();
  /** Eigene Höhe in px (gemessen), für den freien Weg im Stil. */
  let eigen = $state(0);
  let ziehHoehe = $state<number | null>(null);
  const hoehe = $derived(ziehHoehe ?? laschenHoehe);
  let zug: { y: number; h: number; frei: number; zieht: boolean } | null = null;
  let gezogen = false;

  function runter(e: PointerEvent) {
    if (!el) return;
    const unten = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect().top ?? window.innerHeight;
    // freier Weg = Rand zwischen Kopfzeile und unteren Leisten, abzüglich eigener Höhe und je ein Abstand oben und unten
    const frei = Math.max(1, unten - kopfHoehe - el.offsetHeight - 16);
    zug = { y: e.clientY, h: laschenHoehe, frei, zieht: false };
    gezogen = false;
  }
  function bewegen(e: PointerEvent) {
    if (!zug) return;
    const dy = e.clientY - zug.y;
    if (!zug.zieht) {
      if (Math.abs(dy) < 8) return;
      zug.zieht = true;
      gezogen = true;
      el?.setPointerCapture(e.pointerId);
    }
    ziehHoehe = Math.min(1, Math.max(0, zug.h - dy / zug.frei));
  }
  function hoch() {
    if (zug?.zieht && ziehHoehe !== null) onlasche(Math.round(ziehHoehe * 1000) / 1000);
    zug = null;
  }
  // Nach dem Speichern die gezogene Stelle halten, bis sie aus den Einstellungen zurückkommt (kein Zurückspringen).
  $effect(() => { if (!zug && ziehHoehe !== null && Math.abs(ziehHoehe - laschenHoehe) < 0.002) ziehHoehe = null; });
  function abbrechen() { zug = null; ziehHoehe = null; }
  /** Nach einem Schieben keinen Tipp auslösen. */
  function tipp(aktion: () => void) { if (gezogen) { gezogen = false; return; } aktion(); }
</script>

{#if eingeklappt}
  <button class="lasche schiebbar" bind:this={el} style:--hoehe={hoehe} style:--kopf="{kopfHoehe}px" class:zieht={ziehHoehe !== null}
    aria-expanded="false" aria-label="Reiter ausklappen (jetzt: {name}); zum Verschieben hoch oder runter ziehen"
    onpointerdown={runter} onpointermove={bewegen} onpointerup={hoch} onpointercancel={abbrechen}
    onclick={() => tipp(() => onklappen(false))}><span aria-hidden="true">◂</span></button>
{:else}
  <nav class="leiste schiebbar" bind:this={el} bind:offsetHeight={eigen} style:--eigen="{eigen}px" style:--hoehe={hoehe} style:--kopf="{kopfHoehe}px" class:zieht={ziehHoehe !== null}
    aria-label="Reiter (zum Verschieben hoch oder runter wischen)"
    onpointerdown={runter} onpointermove={bewegen} onpointerup={hoch} onpointercancel={abbrechen}>
    {#each REITER as r (r.id)}
      <button class="flach" class:an={reiter === r.id} aria-current={reiter === r.id ? 'page' : undefined}
        aria-label={r.name} title={r.name} onclick={() => tipp(() => onwahl(r.id))}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {#if r.id === 'figur'}
            <circle cx="12" cy="7" r="3.5" />
            <path d="M4.5 21v-2.5a7.5 7.5 0 0 1 15 0V21" />
          {:else if r.id === 'werte'}
            <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
            <path d="M3.5 9.5h17M3.5 14.5h17M10 4.5v15" />
          {:else if r.id === 'ausruestung'}
            <path d="M9 6V4.5a3 3 0 0 1 6 0V6" />
            <rect x="5" y="6" width="14" height="15" rx="3" />
            <path d="M8.5 13h7v4h-7z M5 11h14" />
          {:else}
            <path d="M12 6.5C10 5 7 4.5 3 5v13.5c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z" />
            <path d="M12 6.5V20" />
          {/if}
        </svg>
      </button>
    {/each}
    <button class="flach einklappen" aria-expanded="true" aria-label="Reiter einklappen"
      onclick={() => tipp(() => onklappen(true))}><span aria-hidden="true">▸</span></button>
  </nav>
{/if}

<style>
  /* Leiste und Lasche hängen am rechten Rand an derselben Stelle (--hoehe, 0 = unten, 1 = oben).
     --sockel ist die Oberkante der unteren Leisten, --kopf die Höhe der Kopfzeile; der freie Weg dazwischen
     ist 100dvh minus beides, minus eigene Höhe (--eigen) und je ein Abstand oben und unten. */
  .schiebbar { --sockel: 100%; position: absolute; right: 0; z-index: 6; touch-action: none;
    bottom: calc(var(--sockel) + var(--abstand-2) + var(--hoehe) * (100dvh - var(--sockel) - var(--kopf, 0px) - var(--eigen) - 2 * var(--abstand-2))); }
  /* Ohne feste Leiste unten liegt alles über dem sicheren Bereich am unteren Bildschirmrand. */
  :global(.unten:not(.im-gefecht)) .schiebbar { --sockel: env(safe-area-inset-bottom); }

  .leiste { width: var(--tipp);
    display: flex; flex-direction: column; background: var(--flaeche); border: 1px solid var(--linie); border-right: none;
    border-radius: var(--radius) 0 0 var(--radius); box-shadow: -2px 0 6px rgb(0 0 0 / 0.2); overflow: hidden; }
  .leiste button { border-radius: 0; padding: 0; min-width: 0; width: 100%; color: var(--text-2);
    display: flex; align-items: center; justify-content: center; }
  .leiste button + button { border-top: 1px solid var(--linie); }
  svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  /* Gewählter Reiter: Akzentfarbe, Fläche und Balken am linken Rand, nicht nur Farbe. */
  .leiste button.an { color: var(--akzent); background: var(--gewaehlt); box-shadow: inset 3px 0 0 var(--akzent); }
  .leiste button.an svg { stroke-width: 2.3; }
  .einklappen { min-height: 40px; font-size: 0.9rem; }

  /* Eingeklappt: Lasche, flacher und breiter (Wunsch 18.11.2026): sichtbar 32 × 52 px, ragt in den Inhalt.
     Die Tippfläche (48 px breit) reicht unsichtbar etwas weiter nach links. */
  .lasche { --eigen: 52px; width: var(--tipp); height: var(--eigen); padding: 0; border: none; background: transparent; border-radius: 0; }
  .lasche span { position: absolute; top: 0; bottom: 0; right: 0; width: calc(var(--abstand-4) + var(--abstand-2)); display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; color: var(--akzent); background: var(--flaeche); border: 1px solid var(--linie); border-right: none;
    border-radius: var(--radius) 0 0 var(--radius); box-shadow: -2px 0 6px rgb(0 0 0 / 0.2); }
  .lasche:not(:disabled):active { transform: none; filter: none; }

  /* Beim Schieben: Akzentrahmen, damit man sieht, dass Leiste bzw. Lasche am Finger hängt. */
  .lasche.zieht span, .leiste.zieht { border-color: var(--akzent); box-shadow: -2px 0 10px rgb(0 0 0 / 0.35); }
</style>
