<script lang="ts">
  // Waffe wechseln (konzept.md § 3.7a; Regelwerk: Kampfsystem, Waffe wechseln). Kosten nach Trageort der alten und
  // der neuen Waffe (der teurere zählt): ohne Aktion, Main, Main mit leichter Konzentration, Rucksack 2 Runden.
  import type { Spieldaten, Wechselkosten } from '../../daten/typen';
  import { konzentrationMoeglich, konzentrationSetzen, protokolliere, verbrauchen, verfuegbar } from '../../regeln/aktionen';
  import { aktiverEintrag, waffeAktivieren, waffeVon, wechselkosten } from '../../regeln/waffen';
  import type { Charakter } from '../../speicher/charakter';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import { trageortName, type Zeile } from '../texte';

  interface Props { c: Charakter; d: Spieldaten; onfertig: (c: Charakter) => void; onabbrechen: () => void }
  let { c, d, onfertig, onabbrechen }: Props = $props();

  const alt = $derived(aktiverEintrag(c));
  const andere = $derived(c.ausruestung.waffen.filter((w) => w.id !== c.ausruestung.aktive_waffe));
  let ziel = $state<string | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  function kostenText(k: Wechselkosten): string {
    if (k === 'ohne') return 'ohne Aktion';
    if (k === 'main') return 'Mainaction';
    return `Mainaction mit Konzentration (${k.konzentration})${k.runden && k.runden > 1 ? `, ${k.runden} Runden` : ''}`;
  }
  function moeglich(k: Wechselkosten): string | null {
    if (k === 'ohne') return null;
    if (verfuegbar(c, 'main', d) <= 0) return 'Keine Mainaction mehr in dieser Runde.';
    if (typeof k === 'object' && !konzentrationMoeglich(c)) return 'Konzentration geht nicht mehr: Du hast in dieser Runde schon eine Breakaction eingesetzt.';
    return null;
  }

  function weiter() {
    const neu = c.ausruestung.waffen.find((w) => w.id === ziel);
    if (!neu) return;
    const { kosten, perk } = wechselkosten(c, neu.id, d);
    const name = waffeVon(neu, d).name;
    const zeilen: Zeile[] = [{ text: `Aktive Waffe: ${alt ? waffeVon(alt, d).name : 'keine'} → ${name}.`, fett: true }];
    let nach = waffeAktivieren(c, neu.id);
    zeilen.push({ text: `Kosten: ${kostenText(kosten)}${perk ? ` (◆ ${perk})` : ''}.` });
    if (kosten !== 'ohne') {
      nach = verbrauchen(nach, 'main');
      zeilen.push({ text: 'Main −1.' });
      if (typeof kosten === 'object') {
        nach = konzentrationSetzen(nach, kosten.konzentration);
        zeilen.push({ text: `Konzentration (${kosten.konzentration}): In dieser Runde keine Breakaction mehr.` });
        if (kosten.runden && kosten.runden > 1)
          zeilen.push({ text: `Das dauert ${kosten.runden} Runden. Setze in der nächsten Runde erneut deine Mainaction dafür ein (Main → Sonderfähigkeit).` });
      }
    }
    nach = protokolliere(nach, `Waffe gewechselt: ${name}`);
    bericht = { zeilen, nach };
  }
</script>

{#if bericht}
  <Bericht titel="Waffe wechseln" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Waffe wechseln">
    {#if alt}<p>Jetzt in der Hand: <strong>{waffeVon(alt, d).name}</strong> ({trageortName(alt.trageort, d)})</p>{/if}
    {#if andere.length}
      <ul class="auswahlliste">
        {#each andere as w (w.id)}
          {@const k = wechselkosten(c, w.id, d)}
          {@const sperre = moeglich(k.kosten)}
          <li>
            <button aria-pressed={ziel === w.id} disabled={!!sperre} onclick={() => (ziel = w.id)}>
              <strong>{waffeVon(w, d).name}</strong>
              <small>{trageortName(w.trageort, d)} · {kostenText(k.kosten)}{k.perk ? ` (◆ ${k.perk})` : ''}</small>
              {#if sperre}<small class="sperre">{sperre}</small>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="hinweis">Du hast keine weitere Schusswaffe. Neue trägst du im Reiter Ausrüstung ein (Schreibmodus).</p>
    {/if}
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!ziel} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}
