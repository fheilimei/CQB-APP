<script lang="ts">
  // Ladehemmung beheben (konzept.md § 3.8; Regelwerk: Kampfsystem, Ladehemmung). Einfach: Probe auf Control mit dem
  // Waffenskill (Malsteps LH-Behebenmod. + Sicht + Leiter); im Gefecht Mainaction, Krit verbraucht sie nicht.
  // Schwer: nur außerhalb des Gefechts, Intellect mit Mechanik, etwa 10 Minuten; senkt den Zustand der Waffe.
  import type { Spieldaten } from '../../daten/typen';
  import { protokolliere, verbrauchen } from '../../regeln/aktionen';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { eintragErsetzen, ladehemmungBeheben, lhBehebenAnfrage, schwerBehebenAnfrage, waffeVon } from '../../regeln/waffen';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';
  import { ERGEBNIS_SATZ, wurfZahl, zustandName, type Zeile } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    eintragId: string;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, eintragId, wuerfelModus, onaendern, onfertig, onabbrechen }: Props = $props();

  const e = $derived(c.ausruestung.waffen.find((x) => x.id === eintragId)!);
  const w = $derived(waffeVon(e, d));
  const imGefecht = $derived(!!gefechtVon(c));
  const schwer = $derived(e.ladehemmung === 'schwer');
  const anfrage = $derived(schwer ? schwerBehebenAnfrage(e, d) : lhBehebenAnfrage(e, d));
  let ergebnis = $state<ProbenErgebnis | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  function weiter() {
    if (!ergebnis) return;
    const neu = ladehemmungBeheben(e, ergebnis.stufe, d);
    const p = ergebnis.probe.wert!;
    const zeilen: Zeile[] = [
      { text: `Deine Probe ist ${ERGEBNIS_SATZ[ergebnis.stufe]} (${ergebnis.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(ergebnis.wurf)}`}, Zielwert ${p.zielwert}, Krit ≤ ${p.krit_schwelle}).` }
    ];
    if (ergebnis.stufe === 'misserfolg') {
      zeilen.push({ text: schwer ? `Die Waffe bleibt blockiert. Weitere ${d.regeln.ladehemmung.schwer_beheben.minuten} Minuten, dann würfelst du erneut.` : 'Die Waffe bleibt blockiert. Du kannst es in einer späteren Runde erneut versuchen.', fett: true });
    } else {
      zeilen.push({ text: `${w.name} ist wieder bereit.`, fett: true });
      if (schwer) zeilen.push({ text: `Der Zustand sinkt: ${zustandName(e.zustand, d)} → ${zustandName(neu.zustand, d)}.` });
    }
    let nach = eintragErsetzen(c, neu);
    if (imGefecht) {
      if (ergebnis.stufe === 'krit') zeilen.push({ text: 'Krit: Die Aktion verbraucht keine Mainaction.' });
      else { nach = verbrauchen(nach, 'main'); zeilen.push({ text: 'Main −1.' }); }
      nach = protokolliere(nach, `${w.name}: Ladehemmung ${ergebnis.stufe === 'misserfolg' ? 'nicht behoben' : 'behoben'}`);
    }
    bericht = { zeilen, nach };
  }
</script>

{#if bericht}
  <Bericht titel="Ladehemmung beheben" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Ladehemmung: {w.name}">
    {#if schwer && imGefecht}
      <p class="fehler">Eine schwere Ladehemmung lässt sich im Gefecht nicht beheben.</p>
      <p class="hinweis">Nach dem Gefecht: Waffe zerlegen und zusammensetzen, etwa {d.regeln.ladehemmung.schwer_beheben.minuten} Minuten, Probe im Reiter Ausrüstung. Bis dahin: Waffe wechseln.</p>
    {:else}
      <p class="hinweis">
        {#if schwer}Schwere Ladehemmung: etwa {d.regeln.ladehemmung.schwer_beheben.minuten} Minuten. Gelingt es, sinkt der Zustand der Waffe um eine Stufe.
        {:else if imGefecht}Mainaction. Krit: Die Mainaction ist nicht verbraucht.{:else}Einfache Ladehemmung.{/if}
      </p>
      <ProbeKern {c} {d} {anfrage} hinweise={['probe']} {wuerfelModus} sichtVorgewaehlt={!schwer} mitAusgang bind:ergebnis {onaendern} />
    {/if}
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!ergebnis || (schwer && imGefecht)} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}
