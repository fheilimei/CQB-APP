<script lang="ts">
  /**
   * Senkrechte Reiterleiste am rechten Bildschirmrand (Daumenbereich unten rechts).
   * Bildzeichen statt Text: Figur (Silhouette), Werte (Tabelle), Ausrüstung (Rucksack), Verlauf (aufgeschlagenes Buch).
   * Schwebt über dem Inhalt (der Inhalt läuft darunter durch). Lässt sich einklappen; dann bleibt eine Lasche am Rand,
   * die sich am Rand hoch und runter ziehen lässt (Stelle wird gemerkt). Ausgeklappt steht die Leiste immer unten.
   */
  type Reiter = 'figur' | 'werte' | 'ausruestung' | 'verlauf';
  let { reiter, eingeklappt, onwahl, onklappen, laschenHoehe, kopfHoehe, onlasche }: {
    reiter: Reiter; eingeklappt: boolean; onwahl: (r: Reiter) => void; onklappen: (zu: boolean) => void;
    /** 0 = ganz unten, 1 = ganz oben (unter der Kopfzeile). */
    laschenHoehe: number; kopfHoehe: number; onlasche: (h: number) => void;
  } = $props();

  // Lasche ziehen: Erst eine senkrechte Bewegung von mehr als 8 px zählt als Ziehen, sonst ist es ein Tipp (ausklappen).
  // Die Höhe ist ein Anteil des freien Rands, damit sie auch nach Drehen oder anderer Fenstergröße passt.
  const LASCHE = 72; // Höhe der Lasche in px, muss zu --lasche im Stil passen
  let laschenEl: HTMLButtonElement | undefined = $state();
  let ziehHoehe = $state<number | null>(null);
  const hoehe = $derived(ziehHoehe ?? laschenHoehe);
  let zug: { y: number; h: number; frei: number; zieht: boolean } | null = null;
  let gezogen = false;

  function runter(e: PointerEvent) {
    const unten = (laschenEl?.offsetParent as HTMLElement | null)?.getBoundingClientRect().top ?? window.innerHeight;
    // freier Weg = Rand zwischen Kopfzeile und unteren Leisten, abzüglich Lasche und je ein Abstand oben und unten
    const frei = Math.max(1, unten - kopfHoehe - LASCHE - 16);
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
      laschenEl?.setPointerCapture(e.pointerId);
    }
    ziehHoehe = Math.min(1, Math.max(0, zug.h - dy / zug.frei));
  }
  function hoch() {
    if (zug?.zieht && ziehHoehe !== null) onlasche(Math.round(ziehHoehe * 1000) / 1000);
    zug = null;
  }
  // Nach dem Speichern die gezogene Höhe halten, bis sie aus den Einstellungen zurückkommt (kein Zurückspringen).
  $effect(() => { if (!zug && ziehHoehe !== null && Math.abs(ziehHoehe - laschenHoehe) < 0.002) ziehHoehe = null; });
  function abbrechen() { zug = null; ziehHoehe = null; }
  function tipp() { if (gezogen) { gezogen = false; return; } onklappen(false); }

  const REITER: { id: Reiter; name: string }[] = [
    { id: 'figur', name: 'Figur' }, { id: 'werte', name: 'Werte' },
    { id: 'ausruestung', name: 'Ausrüstung' }, { id: 'verlauf', name: 'Verlauf' },
  ];
  const name = $derived(REITER.find((r) => r.id === reiter)?.name ?? '');
</script>

{#if eingeklappt}
  <button class="lasche" bind:this={laschenEl} style:--hoehe={hoehe} class:zieht={ziehHoehe !== null} style:--kopf="{kopfHoehe}px"
    aria-expanded="false" aria-label="Reiter ausklappen (jetzt: {name}); zum Verschieben hoch oder runter ziehen"
    onpointerdown={runter} onpointermove={bewegen} onpointerup={hoch} onpointercancel={abbrechen}
    onclick={tipp}><span aria-hidden="true">◂</span></button>
{:else}
  <nav class="leiste" aria-label="Reiter">
    {#each REITER as r (r.id)}
      <button class="flach" class:an={reiter === r.id} aria-current={reiter === r.id ? 'page' : undefined}
        aria-label={r.name} title={r.name} onclick={() => onwahl(r.id)}>
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
      onclick={() => onklappen(true)}><span aria-hidden="true">▸</span></button>
  </nav>
{/if}

<style>
  /* Liegt in der unteren Leiste und steht immer direkt über allem, was unten fest steht. */
  .leiste { position: absolute; right: 0; bottom: calc(100% + var(--abstand-2)); z-index: 6; width: var(--tipp);
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
  /* Eingeklappt: Lasche am rechten Rand, ragt etwas über den Inhalt (Wunsch 18.11.2026: größer). Sichtbar 24 px breit,
     die Tippfläche (48 px) reicht unsichtbar nach links. Lässt sich am Rand hoch und runter ziehen:
     --hoehe 0 = direkt über den unteren Leisten, 1 = direkt unter der Kopfzeile. --sockel ist die Oberkante der unteren Leisten. */
  .lasche { --lasche: 72px; --sockel: 100%; position: absolute; right: 0; z-index: 6; width: var(--tipp); height: var(--lasche);
    bottom: calc(var(--sockel) + var(--abstand-2) + var(--hoehe) * (100dvh - var(--sockel) - var(--kopf, 0px) - var(--lasche) - 2 * var(--abstand-2)));
    padding: 0; border: none; background: transparent; border-radius: 0; touch-action: none; }
  .lasche span { position: absolute; top: 0; bottom: 0; right: 0; width: var(--abstand-4); display: flex; align-items: center; justify-content: center;
    font-size: 1rem; color: var(--akzent); background: var(--flaeche); border: 1px solid var(--linie); border-right: none;
    border-radius: var(--radius) 0 0 var(--radius); box-shadow: -2px 0 6px rgb(0 0 0 / 0.2); }
  /* Beim Ziehen: Akzentrahmen, damit man sieht, dass die Lasche am Finger hängt. */
  .lasche.zieht span { border-color: var(--akzent); box-shadow: -2px 0 10px rgb(0 0 0 / 0.35); }
  .lasche:not(:disabled):active { transform: none; filter: none; }
  /* Ohne feste Leiste unten liegt alles über dem sicheren Bereich am unteren Bildschirmrand. */
  :global(.unten:not(.im-gefecht)) .leiste { bottom: calc(var(--abstand-2) + env(safe-area-inset-bottom)); }
  :global(.unten:not(.im-gefecht)) .lasche { --sockel: env(safe-area-inset-bottom); }
</style>
