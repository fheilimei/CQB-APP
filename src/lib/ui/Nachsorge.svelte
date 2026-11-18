<script lang="ts">
  // Nachsorge einer versorgten Wunde (konzept.md § 3.12, § 4.9; Regelwerk: Schaden, Blutung und Verletzungen, Wunden heilen).
  // Einmal je Wunde, nach dem Versorgen: Probe auf Erste Hilfe, bei einer kritischen Wunde auf Operation.
  // Krit halbiert die Heildauer, gelungen lässt sie, misslungen verdoppelt sie (wie ohne Nachsorge).
  // Wer: du selbst (Probe) oder jemand anders (der Spieler tippt den Ausgang), wie beim Versorgen.
  import type { Spieldaten } from '../daten/typen';
  import { heildauer, nachsorgeAnfrage, nachsorgeSetzen, type Nachsorge } from '../regeln/heilung';
  import { wundenText } from '../regeln/wunden';
  import type { Charakter, Quelle } from '../speicher/charakter';
  import Bericht from './Bericht.svelte';
  import Dialog from './Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from './probe/ProbeKern.svelte';
  import { ERGEBNIS_SATZ, mitZeichen, wurfZahl, type Zeile } from './texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    wundId: string;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, wundId, wuerfelModus, onaendern, onfertig, onabbrechen }: Props = $props();

  let wer = $state<'selbst' | 'andere'>('selbst');
  let ergebnis = $state<ProbenErgebnis | null>(null);
  let fremd = $state<Nachsorge | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const wunde = $derived(c.spielstand.wunden.find((w) => w.id === wundId) ?? null);
  const anfrage = $derived(wunde ? nachsorgeAnfrage(wunde, d) : null);
  const ausgang = $derived<Nachsorge | null>(
    wer === 'andere' ? fremd : ergebnis ? (ergebnis.stufe === 'krit' ? 'krit' : ergebnis.stufe === 'erfolg' ? 'gelungen' : 'misslungen') : null
  );
  const tage = (n: number) => `${n} ${n === 1 ? 'Ruhetag' : 'Ruhetage'}`;
  const AUSGANG_NAME: Record<Nachsorge, string> = { krit: 'Krit', gelungen: 'gelungen', misslungen: 'misslungen' };

  function werWaehlen(w: 'selbst' | 'andere') { wer = w; ergebnis = null; fremd = null; }

  function weiter() {
    if (!wunde || !ausgang) return;
    const zeilen: Zeile[] = [];
    if (wer === 'selbst' && ergebnis) {
      const p = ergebnis.probe.wert!;
      zeilen.push({ text: `Deine Nachsorge mit ${mitZeichen('skill', anfrage!.skill!, d)} ist ${ERGEBNIS_SATZ[ergebnis.stufe]} (${ergebnis.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(ergebnis.wurf)}`}, Zielwert ${p.zielwert}, Krit ≤ ${p.krit_schwelle}).` });
    } else zeilen.push({ text: `Jemand übernimmt die Nachsorge; sie ist ${ausgang === 'krit' ? 'ein Krit' : ausgang}.` });
    const nach = nachsorgeSetzen(c, wunde.id, ausgang);
    const neu = nach.spielstand.wunden.find((w) => w.id === wunde.id)!;
    const satz = ausgang === 'krit' ? 'Die Heildauer halbiert sich' : ausgang === 'gelungen' ? 'Die Heildauer bleibt' : 'Die Heildauer verdoppelt sich, wie ohne Nachsorge';
    zeilen.push({ text: `${satz}: ${tage(heildauer(neu, d))}${neu.ruhetage_geheilt ? `, davon ${tage(neu.ruhetage_geheilt)} schon geheilt` : ''}.`, fett: true });
    bericht = { zeilen, nach };
  }
</script>

{#if bericht}
  <Bericht titel="Nachsorge" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Nachsorge">
    <div class="abschnitte">
      {#if wunde}
        <p>{wundenText(wunde, d)}</p>
        <p class="hinweis">Einmal je Wunde. Krit halbiert die Heildauer, gelungen lässt sie, misslungen oder keine Nachsorge verdoppelt sie.</p>
        <section class="abschnitt">
          <div class="gruppe">
            <h3 class="gruppe-titel">Wer übernimmt die Nachsorge: {wer === 'selbst' ? 'du selbst' : 'jemand anders'}</h3>
            <div class="auswahlreihe gleich">
              <button aria-pressed={wer === 'selbst'} onclick={() => werWaehlen('selbst')}>du selbst</button>
              <button aria-pressed={wer === 'andere'} onclick={() => werWaehlen('andere')}>jemand anders</button>
            </div>
          </div>
        </section>
        <section class="abschnitt">
          {#if wer === 'selbst' && anfrage}
            <ProbeKern {c} {d} {anfrage} hinweise={['heilung']} {wuerfelModus} mitAusgang bind:ergebnis {onaendern} />
          {:else}
            <div class="gruppe">
              <h3 class="gruppe-titel">Die Nachsorge ist: {fremd ? AUSGANG_NAME[fremd] : '…'}</h3>
              <div class="auswahlreihe gleich">
                {#each ['krit', 'gelungen', 'misslungen'] as const as a (a)}
                  <button aria-pressed={fremd === a} onclick={() => (fremd = a)}>{AUSGANG_NAME[a]}</button>
                {/each}
              </div>
            </div>
          {/if}
        </section>
      {/if}
    </div>
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!ausgang} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}
