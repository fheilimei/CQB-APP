<script lang="ts" module>
  /** Färbung einer Zone in der Vorschau eines Treffers (konzept.md § 3.0f). */
  export type Zonenfarbe = 'gestoppt' | 'wucht' | 'durchschlag';
  /** Zeichen je Zone in der Vorschau: Stagger, kampfunfähig, tödlich. */
  export const ZEICHEN = { stagger: '↯', kampfunfaehig: '✕', tot: '✝' } as const;
</script>

<script lang="ts">
  // Körperbild (konzept.md § 3.0f): ein Baustein, der überall gleich aussieht. Jede Instanz blendet die Schichten ein,
  // die sie braucht (Rüstung, Wunden, Vorschau). Vorerst nur die Haltung „stehend“.
  // Die Lage der Flächen ist Zeichnung, keine Regel: Zonen-IDs aus koerperzonen.json; Zonen ohne Fläche (Rumpf nach
  // Ansage) werden nicht gezeichnet. Rechts und links aus Sicht des Charakters (er schaut den Betrachter an).
  import type { Spieldaten } from '../daten/typen';
  import type { Wunde } from '../speicher/charakter';

  interface Props {
    d: Spieldaten;
    /** Vorschau: Farbe je Zone. */
    farben?: Record<string, Zonenfarbe | null>;
    /** Vorschau: Zeichen je Zone (ZEICHEN). */
    zeichen?: Record<string, string>;
    /** Rüstung: Schutzwert je Zone (0 = nichts anzeigen). */
    ruestung?: Record<string, number>;
    /** Deckung: verdeckte Zonen, schraffiert. */
    verdeckt?: string[];
    /** Wunden: Punkt je Wunde. */
    wunden?: Wunde[];
    gewaehlt?: string | null;
    /** Ohne onwahl ist die Figur nur Anzeige. */
    onwahl?: (zone: string) => void;
    beschriftung?: string;
    /** Ohne leeren Rand links und rechts, für eine Figur mit Knöpfen daneben (Reiter Figur). Die Breite gibt dann der Behälter vor. */
    knapp?: boolean;
  }
  let { d, farben = {}, zeichen = {}, ruestung = {}, verdeckt = [], wunden = [], gewaehlt = null, onwahl, beschriftung = 'Körperzonen', knapp = false }: Props = $props();

  // Zeichenfläche 200 × 300; dargestellt mit 240 px Breite (Faktor 1,2), damit jede Zone mindestens 44 × 44 px hat.
  const FLAECHEN: Record<string, { x: number; y: number; b: number; h: number; r: number; kurz: string }> = {
    kopf: { x: 78, y: 4, b: 44, h: 46, r: 20, kurz: 'Kopf' },
    brust: { x: 63, y: 54, b: 74, h: 52, r: 10, kurz: 'Brust' },
    bauch: { x: 63, y: 108, b: 74, h: 40, r: 4, kurz: 'Bauch' },
    unterleib: { x: 63, y: 150, b: 74, h: 40, r: 6, kurz: 'Unterleib' },
    arm_r: { x: 23, y: 54, b: 38, h: 128, r: 14, kurz: 'R' },
    arm_l: { x: 139, y: 54, b: 38, h: 128, r: 14, kurz: 'L' },
    bein_r: { x: 63, y: 192, b: 36, h: 104, r: 12, kurz: 'R' },
    bein_l: { x: 101, y: 192, b: 36, h: 104, r: 12, kurz: 'L' }
  };
  /** Eindeutige ID für das Schraffurmuster, falls mehrere Figuren gleichzeitig zu sehen sind. */
  const uid = $props.id();
  const muster = `schraffur-${uid}`;
  const zonen = $derived(d.koerperzonen.eintraege.filter((z) => FLAECHEN[z.id]));

  function wundenIn(zone: string): Wunde[] {
    return wunden.filter((w) => w.zone === zone || (w.zone === 'rumpf' && zone === 'bauch'));
  }
  function wundKlasse(w: Wunde): string {
    // Rot, solange sie blutet (auch mit Druckverband am Rumpf, der nur die Frist verlängert).
    const blutet = w.blutung.status === 'offen';
    return `wunde${blutet ? ' blutet' : ' versorgt'}`;
  }
</script>

<svg class="figur" class:knapp viewBox={knapp ? '21 2 158 296' : '0 0 200 300'} role={onwahl ? 'group' : 'img'} aria-label={beschriftung}>
  {#if verdeckt.length}
    <defs>
      <pattern id={muster} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line class="schraffur" x1="0" y1="0" x2="0" y2="8" />
      </pattern>
    </defs>
  {/if}
  {#each zonen as z (z.id)}
    {@const f = FLAECHEN[z.id]!}
    {@const farbe = farben[z.id] ?? null}
    {@const ws = wundenIn(z.id)}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (role ist „button“, sobald die Figur antippbar ist) -->
    <g class="zone {farbe ?? ''}" class:gewaehlt={gewaehlt === z.id} class:tippbar={!!onwahl}
      role={onwahl ? 'button' : undefined} tabindex={onwahl ? 0 : undefined}
      aria-label="{z.name}{verdeckt.includes(z.id) ? ', verdeckt' : ''}{gewaehlt === z.id ? ', gewählt' : ''}" aria-pressed={onwahl ? gewaehlt === z.id : undefined}
      onclick={() => onwahl?.(z.id)} onkeydown={(e) => { if (onwahl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onwahl(z.id); } }}>
      <rect x={f.x} y={f.y} width={f.b} height={f.h} rx={f.r} />
      {#if verdeckt.includes(z.id)}
        <rect class="verdeckt" x={f.x} y={f.y} width={f.b} height={f.h} rx={f.r} style:fill="url(#{muster})" style:stroke="none" />
      {/if}
      <text class="name" x={f.x + f.b / 2} y={f.y + (f.h > 60 ? 18 : f.h / 2 - 2)}>{f.kurz}</text>
      {#if ruestung[z.id]}
        <text class="schutz" x={f.x + f.b / 2} y={f.y + (f.h > 60 ? 34 : f.h / 2 + 12)}>⛨{ruestung[z.id]}</text>
      {/if}
      {#if zeichen[z.id]}
        <text class="zeichen" x={f.x + f.b / 2} y={f.y + f.h - (f.h > 60 ? 12 : 4)}>{zeichen[z.id]}</text>
      {/if}
      {#each ws as w, i (w.id)}
        {@const cx = f.x + 10 + (i % 3) * 12}
        {@const cy = f.y + f.h - 10 - Math.floor(i / 3) * 12}
        <circle class={wundKlasse(w)} {cx} {cy} r="4" />
        {#if w.kritisch}<circle class="ring" {cx} {cy} r="6.5" />{/if}
      {/each}
    </g>
  {/each}
</svg>

<style>
  /* Feste Breite: 240 px ergibt mindestens 44 × 44 px je Zone (Arme und Beine 38 bzw. 36 Einheiten × 1,2). */
  .figur { width: 240px; max-width: 100%; height: auto; display: block; margin: 0 auto; user-select: none; -webkit-user-select: none; }
  /* Knapp: Zeichenfläche nur 158 Einheiten breit; bei rund 195 px Breite (360-px-Handy, Knöpfe daneben) bleibt jede Zone etwa 44 px breit. */
  .figur.knapp { width: 100%; margin: 0; }
  .zone rect { fill: var(--zone-leer); stroke: var(--linie); stroke-width: 1.5; }
  .zone.gestoppt rect { fill: var(--treffer-gestoppt); }
  .zone.wucht rect { fill: var(--treffer-wucht); }
  .zone.durchschlag rect { fill: var(--treffer-durchschlag); }
  .zone.tippbar { cursor: pointer; }
  .zone.tippbar:active rect { filter: brightness(0.88); }
  .zone:focus { outline: none; }
  .zone:focus-visible rect { stroke: var(--akzent); stroke-width: 3; }
  /* Gewählte Zone: dicker Akzentrahmen, nicht nur Farbe. */
  .zone.gewaehlt rect { stroke: var(--akzent); stroke-width: 4; }
  /* Deckung: Schraffur über der Zonenfarbe, damit Vorschau-Farben sichtbar bleiben. */
  .verdeckt { pointer-events: none; }
  .schraffur { stroke: var(--deckung); stroke-width: 3; }
  text { text-anchor: middle; dominant-baseline: middle; fill: var(--text); pointer-events: none; }
  .name { font-size: 11px; font-weight: 600; }
  .zone.gewaehlt .name { font-weight: 800; }
  .schutz { font-size: 10px; fill: var(--text-2); }
  .zeichen { font-size: 15px; font-weight: 800; }
  /* Wunden: rot gefüllt = blutet, grau = versorgt, zusätzlicher roter Ring = kritisch. */
  .wunde.blutet { fill: var(--gefahr); }
  .wunde.versorgt { fill: var(--text-2); }
  .ring { fill: none; stroke: var(--gefahr); stroke-width: 2; }
</style>
