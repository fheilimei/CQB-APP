<script lang="ts">
  // Aktionsleiste (konzept.md § 3.7a): nur im Gefecht, über dem Wählrad. Vier Knöpfe Main · Break · Bewegung · Stand mit
  // Zähler (bei 0 ausgegraut). Getroffen steht im Reiter Figur, wie in Ruhe. Langer Druck: ±1 von Hand. Kampfunfähig: Warnmarkierung, Ausführen nur nach Bestätigung.
  import type { Spieldaten } from '../../daten/typen';
  import { AKTIONEN, eigenerStand, korrigieren, zaehler } from '../../regeln/aktionen';
  import { gefechtVon } from '../../regeln/probenrechner';
  import type { Aktion, Charakter } from '../../speicher/charakter';
  import { AKTION_NAME, bewegungName, standAdjektiv } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    kampfunfaehig: boolean;
    onoeffnen: (a: Aktion) => void;
    onaendern: (c: Charakter) => void;
  }
  let { c, d, kampfunfaehig, onoeffnen, onaendern }: Props = $props();

  const z = $derived(zaehler(c, d));
  const g = $derived(gefechtVon(c)!);
  let korrektur = $state<Aktion | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let langGedrueckt = false;

  function druck(a: Aktion) {
    langGedrueckt = false;
    clearTimeout(timer);
    timer = setTimeout(() => { langGedrueckt = true; korrektur = a; }, 550);
  }
  function loslassen() { clearTimeout(timer); }
  function tippen(a: Aktion) {
    if (langGedrueckt) { langGedrueckt = false; return; }
    if (kampfunfaehig && !confirm('Du bist kampfunfähig. Trotzdem handeln? (Die SL entscheidet.)')) return;
    onoeffnen(a);
  }
  const unterzeile: Record<Aktion, () => string> = {
    main: () => (g.konzentration ? `Konzentration ${g.konzentration}` : ''),
    break: () => '',
    bewegung: () => (g.gehechtet ? bewegungName('hechten', d) : g.bewegt ? bewegungName(g.bewegt, d) : ''),
    stand: () => standAdjektiv(eigenerStand(g, d), d)
  };
</script>

<div class="leiste" role="group" aria-label="Aktionen der Runde">
  {#each AKTIONEN as a (a)}
    <button class="aktion" class:leer={z[a] === 0} class:warnung={kampfunfaehig}
      aria-label="{AKTION_NAME[a]}, noch {z[a]}"
      onpointerdown={() => druck(a)} onpointerup={loslassen} onpointerleave={loslassen} onpointercancel={loslassen}
      oncontextmenu={(ev) => ev.preventDefault()} onclick={() => tippen(a)}>
      <span class="name">{#if kampfunfaehig}⚠ {/if}{AKTION_NAME[a]}</span>
      <span class="zahl">{z[a]}</span>
      <small>{unterzeile[a]()}</small>
    </button>
  {/each}
</div>

{#if korrektur}
  {@const a = korrektur}
  <div class="korrektur karte" role="dialog" aria-label="Zähler {AKTION_NAME[a]} von Hand ändern">
    <span>{AKTION_NAME[a]}: <strong>{z[a]}</strong></span>
    <span class="stepper">
      <button aria-label="eins weniger" disabled={z[a] === 0} onclick={() => onaendern(korrigieren(c, a, -1, d))}>−</button>
      <button aria-label="eins mehr" onclick={() => onaendern(korrigieren(c, a, 1, d))}>+</button>
    </span>
    <button class="betont" onclick={() => (korrektur = null)}>Fertig</button>
  </div>
{/if}

<style>
  .leiste { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); background: var(--flaeche); border-top: 1px solid var(--linie);
    user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  .aktion { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px 2px; min-height: 60px; line-height: 1.1;
    touch-action: manipulation; }
  .aktion .name { font-weight: 700; font-size: 0.95rem; }
  .aktion .zahl { position: absolute; top: 3px; right: 5px; font-size: 0.8rem; font-weight: 800; background: var(--akzent); color: var(--akzent-text);
    border-radius: 999px; min-width: 1.4em; padding: 0 4px; }
  .aktion small { font-size: 0.7rem; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; min-height: 1em; }
  .aktion.leer { opacity: 0.45; }
  .aktion.leer .zahl { background: var(--text-2); }
  .aktion.warnung { border-color: var(--gefahr); }
  .korrektur { position: absolute; left: 8px; right: 8px; bottom: calc(100% + 6px); z-index: 20; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; }
</style>
