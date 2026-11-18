<script lang="ts">
  // Wählrad „Adrenalin“ (konzept.md § 3.7): nur im Gefecht, unten im Daumenbereich. Waagerechtes Ziehen dreht das Rad
  // unter dem Finger, rastet je Stufe ein (nach links: höher), die Nachbarstufen lassen sich auch antippen. Mitte: Detail.
  // Senkrechtes Scrollen dreht das Rad nie.
  import type { Spieldaten } from '../../daten/typen';
  import { symptome } from '../../regeln/leiter';
  import { symptomKurz } from '../texte';

  interface Props { stand: number; d: Spieldaten; onsetzen: (stand: number) => void; ondetail: () => void }
  let { stand, d, onsetzen, ondetail }: Props = $props();

  const r = $derived(d.regeln.leiter);
  /** Stufe, die das Rad gerade zeigt: beim Ziehen die eingerastete Vorschau, sonst der Stand. */
  let vorschau = $state<number | null>(null);
  const anzeige = $derived(vorschau ?? stand);
  const name = (s: number) => r.stufen[String(s)]?.name ?? null;
  const farbe = $derived(d.darstellung.leiter_farben[String(anzeige)] ?? '#9e9e9e');
  /** Alle Stufen von unten nach oben, für die Skala über dem Rad. */
  const stufen = $derived(Array.from({ length: r.max - r.min + 1 }, (_, i) => r.min + i));
  const lage = $derived(symptome(anzeige, d.regeln));
  const plus = $derived(zusammenfassung('gewinn'));
  const minus = $derived(zusammenfassung('verlust'));

  /** Kurzform der Symptome; Over the Edge hat nur die Verluste (symptome() aus dem Regelkern). */
  function zusammenfassung(seite: 'gewinn' | 'verlust'): string[] {
    const ohneGewinn = seite === 'gewinn' && lage.gewinne.length === 0;
    if (ohneGewinn) return [];
    return lage.symptome.map((id) => symptomKurz(d.regeln.symptome[id]![seite]));
  }

  function drehen(schritt: 1 | -1) {
    const neu = stand + schritt;
    if (neu < r.min || neu > r.max) { federn = schritt; setTimeout(() => (federn = 0), 200); return; }
    navigator.vibrate?.(10);
    onsetzen(neu);
  }

  // Ziehen: Die Stufen laufen unter dem Finger mit. Erreicht der Finger die nächste Stufe, rastet sie ein (Anzeige,
  // Farbe, kurzes Vibrieren). Hinter dem Ende geht das Rad gebremst mit und federt beim Loslassen zurück.
  // Übernommen wird beim Loslassen, als eine Änderung. Erst eine deutlich waagerechte Bewegung zählt als Ziehen.
  let radEl: HTMLDivElement | undefined = $state();
  let breite = $state(0);
  let start: { x: number; y: number; ziehen: boolean } | null = null;
  let gewischt = false;
  let federn = $state(0);
  let versatz = $state(0);
  let zieht = $state(false);
  // Beim Halten oder Ziehen klappt das Rad nach oben auf: die Stufennamen stehen dann über dem Daumen.
  let gehalten = $state(false);
  let haltZeit: ReturnType<typeof setTimeout> | undefined;
  const offen = $derived(zieht || gehalten);
  /** Abstand zwischen der Mitte und einer Nachbarstufe in Pixeln (Spalten 1 : 1.6 : 1). */
  const schrittweite = $derived(Math.max(40, (breite / 3.6) * 1.3));

  // Nach dem Übernehmen die Vorschau halten, bis der neue Stand gespeichert angekommen ist (kein Zurückspringen).
  $effect(() => {
    if (!zieht && vorschau !== null && stand === vorschau) vorschau = null;
  });

  function runter(e: PointerEvent) {
    start = { x: e.clientX, y: e.clientY, ziehen: false };
    gewischt = false;
    clearTimeout(haltZeit);
    // Erst nach kurzem Halten aufklappen, damit ein schneller Tipp die Knöpfe nicht unter dem Finger verschiebt.
    haltZeit = setTimeout(() => { if (start) { gehalten = true; gewischt = true; radEl?.setPointerCapture(e.pointerId); } }, 200);
  }
  function zuklappen() { clearTimeout(haltZeit); gehalten = false; }
  function bewegen(e: PointerEvent) {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.ziehen) {
      if (!gehalten && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { start = null; zuklappen(); return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
      start.ziehen = true;
      zieht = true;
      gewischt = true;
      radEl?.setPointerCapture(e.pointerId);
    }
    const roh = stand + Math.round(-dx / schrittweite);
    const ziel = Math.min(r.max, Math.max(r.min, roh));
    if (ziel !== anzeige) navigator.vibrate?.(8);
    vorschau = ziel;
    let rest = dx + (ziel - stand) * schrittweite;
    if (roh !== ziel) rest = (dx + (ziel - stand) * schrittweite) * 0.25; // hinter dem Ende: gebremst
    versatz = rest;
  }
  function hoch() {
    zuklappen();
    if (!start) return;
    const warZiehen = start.ziehen;
    start = null;
    if (!warZiehen) return;
    zieht = false;
    versatz = 0;
    if (vorschau !== null && vorschau !== stand) onsetzen(vorschau);
    else vorschau = null;
    setTimeout(() => { if (!zieht) vorschau = null; }, 1500);
  }
  function abbrechen() {
    zuklappen();
    start = null;
    zieht = false;
    versatz = 0;
    vorschau = null;
  }
  /** Nach einem Ziehen keinen Tipp auslösen. */
  function tipp(aktion: () => void) { if (gewischt) { gewischt = false; return; } aktion(); }
</script>

<div class="zeile" style:--farbe={farbe}>
  <!-- Skala: alle Stufen als schmale Farbstreifen; die aktuelle leuchtet und ist höher. Zeigt auf einen Blick, wo man steht. -->
  <div class="skala" aria-hidden="true">
    {#each stufen as s (s)}<span class:an={s === anzeige} style:--stufe={d.darstellung.leiter_farben[String(s)] ?? '#9e9e9e'}></span>{/each}
  </div>
  <div class="rad" class:offen bind:this={radEl} bind:clientWidth={breite} class:federn-l={federn < 0} class:federn-r={federn > 0} role="group" aria-label="Adrenalin"
    onpointerdown={runter} onpointermove={bewegen} onpointerup={hoch} onpointercancel={abbrechen}>
    <!-- Band aus fünf Stufen (zwei außerhalb des Sichtbereichs), verschoben um den Versatz unter dem Finger. -->
    <div class="band" class:zieht style:transform="translateX({versatz}px)">
      <span class="aussen" aria-hidden="true">{anzeige - 2 >= r.min ? (name(anzeige - 2) ?? '0') : ''}</span>
      <button class="nachbar" disabled={anzeige <= r.min} aria-label={anzeige > r.min ? `eine Stufe tiefer: ${name(anzeige - 1) ?? '0'}` : 'tiefste Stufe'}
        onclick={() => tipp(() => drehen(-1))}>{anzeige > r.min ? (name(anzeige - 1) ?? '0') : ''}</button>
      <button class="mitte" aria-label="{name(anzeige) ?? 'Adrenalin 0'}: Details" onclick={() => tipp(ondetail)}>
        {#key anzeige}<span class="einrasten">{#if name(anzeige)}<strong>{name(anzeige)}</strong>{:else}<span class="strich" aria-hidden="true">—</span>{/if}</span>{/key}
      </button>
      <button class="nachbar" disabled={anzeige >= r.max} aria-label={anzeige < r.max ? `eine Stufe höher: ${name(anzeige + 1) ?? '0'}` : 'höchste Stufe'}
        onclick={() => tipp(() => drehen(1))}>{anzeige < r.max ? (name(anzeige + 1) ?? '0') : ''}</button>
      <span class="aussen" aria-hidden="true">{anzeige + 2 <= r.max ? (name(anzeige + 2) ?? '0') : ''}</span>
    </div>
  </div>
  {#if plus.length || minus.length}
    <p class="symptome">
      {#if plus.length}<span>✔ {plus.join(', ')}</span>{/if}
      {#if plus.length && minus.length}{' · '}{/if}
      {#if minus.length}<span>✖ {minus.join(', ')}</span>{/if}
    </p>
  {/if}
</div>

<style>
  /* Neutral wie die übrigen Leisten (Wunsch 18.11.2026: keine Vollfarbe). Die Stufenfarbe steht nur in der Skala
     und im Rahmen des Fensters in der Mitte. Flach gehalten: wenig Rand über und unter den Stufennamen. */
  .zeile { --auf: 40px; position: relative; z-index: 1; background: var(--flaeche); color: var(--text);
    padding: var(--abstand-1) var(--abstand-2) var(--abstand-1); display: flex; flex-direction: column; gap: var(--abstand-1); }
  /* 8 Streifen, Lücke 2 px (Rahmenstärke, kein Abstand aus dem Raster). */
  .skala { display: flex; gap: 2px; align-items: flex-end; height: 6px; padding: 0 calc(100% / 3.6 / 2); }
  .skala span { flex: 1; height: 3px; border-radius: 2px; background: var(--stufe); opacity: 0.3; transition: height 0.15s, opacity 0.15s; }
  .skala span.an { height: 6px; opacity: 1; }
  /* Fenster des Rads: Rahmen in der Stufenfarbe in der Mitte, darunter läuft das Band. */
  .rad { position: relative; overflow: hidden; touch-action: pan-y; user-select: none; -webkit-user-select: none;
    background: var(--flaeche); border-radius: var(--radius); transition: margin-top 0.15s ease-out, padding-bottom 0.15s ease-out; }
  /* Aufgeklappt wächst das Rad nach oben (über den Inhalt), ohne dass sich darunter etwas verschiebt;
     die Namen stehen oben, der Daumen liegt im unteren, leeren Teil. */
  .rad.offen { margin-top: calc(-1 * var(--auf)); padding-bottom: var(--auf); box-shadow: 0 -4px 12px rgb(0 0 0 / 0.25); }
  .rad::before { content: ''; position: absolute; top: 0; bottom: 0; left: calc(100% / 3.6); width: calc(100% * 1.6 / 3.6);
    background: color-mix(in srgb, var(--farbe) 16%, transparent); border: 2px solid var(--farbe); border-radius: var(--radius);
    box-sizing: border-box; pointer-events: none; transition: border-color 0.2s, background 0.2s; }
  /* Fünf Spalten 1 : 1 : 1.6 : 1 : 1; die äußeren liegen links und rechts außerhalb des Fensters. */
  .band { display: grid; grid-template-columns: 1fr 1fr 1.6fr 1fr 1fr; align-items: center; width: calc(100% * 5.6 / 3.6);
    margin-left: calc(-100% / 3.6); transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); will-change: transform; }
  .band.zieht { transition: none; }
  .rad.offen::before { bottom: var(--auf); }
  /* 36 statt 44 Pixel hoch (Ausnahme vom Mindestmaß, Wunsch des Nutzers): das Rad ist breit genug, um sicher getroffen zu werden. */
  .rad button { color: inherit; background: transparent; border: none; min-height: 36px; padding: 0 var(--abstand-1); min-width: 0; }
  .rad button:active { transform: none; }
  .nachbar, .aussen { font-size: 0.8rem; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
  .aussen { opacity: 0.5; }
  .nachbar:disabled { opacity: 0; }
  .mitte { font-size: 1.15rem; }
  .einrasten { display: inline-block; animation: einrasten 0.18s ease-out; }
  @keyframes einrasten { from { transform: scale(0.85); opacity: 0.6; } }
  .strich { font-size: 1.4rem; color: var(--text-2); }
  .symptome { margin: 0; font-size: 0.8rem; color: var(--text-2); text-align: center; line-height: 1.3; }
  .federn-l { animation: federn-l 0.2s; }
  .federn-r { animation: federn-r 0.2s; }
  @keyframes federn-l { 50% { transform: translateX(10px); } }
  @keyframes federn-r { 50% { transform: translateX(-10px); } }
  @media (prefers-reduced-motion: reduce) { .band, .rad, .skala span { transition: none; } .einrasten { animation: none; } }
</style>
