<script lang="ts">
  // Wählrad „Adrenalin“ (konzept.md § 3.7): nur im Gefecht, unten im Daumenbereich. Waagerechtes Wischen dreht um
  // eine Stufe (nach links wischen: höher), die Nachbarstufen lassen sich auch antippen. Mitte antippen: Detail.
  // Senkrechtes Scrollen dreht das Rad nie.
  import type { Spieldaten } from '../../daten/typen';
  import { symptome } from '../../regeln/leiter';
  import { symptomKurz } from '../texte';

  interface Props { stand: number; d: Spieldaten; onsetzen: (stand: number) => void; ondetail: () => void }
  let { stand, d, onsetzen, ondetail }: Props = $props();

  const r = $derived(d.regeln.leiter);
  const name = (s: number) => r.stufen[String(s)]?.name ?? null;
  const farbe = $derived(d.darstellung.leiter_farben[String(stand)] ?? '#9e9e9e');
  const hell = $derived(helligkeit(farbe) > 0.55);
  const lage = $derived(symptome(stand, d.regeln));
  const plus = $derived(zusammenfassung('gewinn'));
  const minus = $derived(zusammenfassung('verlust'));

  /** Kurzform der Symptome; Over the Edge hat nur die Verluste (symptome() aus dem Regelkern). */
  function zusammenfassung(seite: 'gewinn' | 'verlust'): string[] {
    const ohneGewinn = seite === 'gewinn' && lage.gewinne.length === 0;
    if (ohneGewinn) return [];
    return lage.symptome.map((id) => symptomKurz(d.regeln.symptome[id]![seite]));
  }

  /** Relative Helligkeit einer Hex-Farbe (0–1), damit die Schrift lesbar bleibt. */
  function helligkeit(hex: string): number {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  function drehen(schritt: 1 | -1) {
    const neu = stand + schritt;
    if (neu < r.min || neu > r.max) { federn = schritt; setTimeout(() => (federn = 0), 200); return; }
    navigator.vibrate?.(10);
    onsetzen(neu);
  }

  // Wischen: Start merken, erst ab deutlicher waagerechter Bewegung als Drehung werten.
  let start: { x: number; y: number } | null = null;
  let gewischt = false;
  let federn = $state(0);
  function runter(e: PointerEvent) { start = { x: e.clientX, y: e.clientY }; gewischt = false; }
  function hoch(e: PointerEvent) {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) { gewischt = true; drehen(dx < 0 ? 1 : -1); }
  }
  /** Nach einem Wischen keinen Tipp auslösen. */
  function tipp(aktion: () => void) { if (gewischt) { gewischt = false; return; } aktion(); }
</script>

<div class="zeile" style:--farbe={farbe} class:hell>
  <div class="rad" class:federn-l={federn < 0} class:federn-r={federn > 0} role="group" aria-label="Adrenalin"
    onpointerdown={runter} onpointerup={hoch} onpointercancel={() => (start = null)}>
    <button class="nachbar" disabled={stand <= r.min} aria-label={stand > r.min ? `eine Stufe tiefer: ${name(stand - 1) ?? '0'}` : 'tiefste Stufe'}
      onclick={() => tipp(() => drehen(-1))}>{stand > r.min ? (name(stand - 1) ?? '0') : ''}</button>
    <button class="mitte" aria-label="{name(stand) ?? 'Adrenalin 0'}: Details" onclick={() => tipp(ondetail)}>
      {#if name(stand)}<strong>{name(stand)}</strong>{:else}<span class="strich" aria-hidden="true">—</span>{/if}
    </button>
    <button class="nachbar" disabled={stand >= r.max} aria-label={stand < r.max ? `eine Stufe höher: ${name(stand + 1) ?? '0'}` : 'höchste Stufe'}
      onclick={() => tipp(() => drehen(1))}>{stand < r.max ? (name(stand + 1) ?? '0') : ''}</button>
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
  .zeile { background: var(--farbe); color: #fff; padding: 4px 8px 6px; transition: background 0.2s; }
  .zeile.hell { color: #1b1d22; }
  .rad { display: grid; grid-template-columns: 1fr 1.6fr 1fr; align-items: center; gap: 4px; touch-action: pan-y; user-select: none; }
  .rad button { color: inherit; background: transparent; border: none; min-height: 48px; padding: 0 4px; }
  .nachbar { font-size: 0.8rem; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nachbar:disabled { opacity: 0; }
  .mitte { font-size: 1.15rem; background: rgb(255 255 255 / 0.15) !important; border-radius: var(--radius); }
  .strich { font-size: 1.4rem; }
  .symptome { margin: 2px 0 0; font-size: 0.8rem; text-align: center; line-height: 1.3; }
  .federn-l { animation: federn-l 0.2s; }
  .federn-r { animation: federn-r 0.2s; }
  @keyframes federn-l { 50% { transform: translateX(10px); } }
  @keyframes federn-r { 50% { transform: translateX(-10px); } }
</style>
