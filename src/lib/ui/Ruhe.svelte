<script lang="ts">
  // Ruhe (konzept.md § 3.12, § 4.9; Regelwerk: Schaden, Blutung und Verletzungen, Heilung). Nur außerhalb des Gefechts.
  // Abschnitte: Wie lange ruhst du (eine Nacht · einen Ruhetag) · Pflege · Erholungsprobe · Bericht (Sammeländerung).
  // Ein Ruhetag schließt die Nacht davor ein (Prellungen, Adrenalinschock); die Erholungsprobe rechnet schon ohne Schock.
  import type { Spieldaten } from '../daten/typen';
  import { erholungAnfrage, nachtRuhe, pflegeSkill, ruhen, unversorgteWunden, type Nachsorge } from '../regeln/heilung';
  import { lebenslageDes } from '../regeln/probenrechner';
  import type { Charakter, Quelle, Wunde } from '../speicher/charakter';
  import Bericht from './Bericht.svelte';
  import Dialog from './Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from './probe/ProbeKern.svelte';
  import { ERGEBNIS_SATZ, malstepsText, mitZeichen, wurfZahl, type Zeile } from './texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    wuerfelModus: Quelle;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, wuerfelModus, onfertig, onabbrechen }: Props = $props();

  let dauer = $state<'nacht' | 'ruhetag'>('nacht');
  let pflege = $state<Nachsorge | null>(null);
  let ergebnis = $state<ProbenErgebnis | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const tot = $derived(c.spielstand.tot);
  /** Stand nach der Nacht: Die Erholungsprobe gilt am Tag danach (ohne Adrenalinschock). */
  const nachNacht = $derived(nachtRuhe(c));
  const unversorgt = $derived(unversorgteWunden(c, d).length);
  const anfrage = $derived(erholungAnfrage(c, pflege, d));
  const malsteps = $derived(d.regeln.heilung.malsteps_je_unversorgte_wunde);
  const bereit = $derived(dauer === 'nacht' || (!tot && !!ergebnis));
  const ort = (w: Wunde) => d.koerperzonen.eintraege.find((z) => z.id === w.zone)?.ort ?? w.zone;
  const tage = (n: number) => `${n} ${n === 1 ? 'Ruhetag' : 'Ruhetage'}`;

  function dauerWaehlen(x: 'nacht' | 'ruhetag') { dauer = x; ergebnis = null; }
  function pflegeWaehlen(x: Nachsorge | null) { pflege = x; }

  function weiter() {
    const { nach, bericht: b } = ruhen(c, dauer === 'ruhetag' ? ergebnis!.stufe : null, d);
    const zeilen: Zeile[] = [];
    zeilen.push({ text: b.prellungen ? `Nach einer Nacht Ruhe hast du die ${b.prellungen} HP aus Prellungen zurück.` : 'Du ruhst eine Nacht.' });
    if (b.adrenalinschock_vorbei) zeilen.push({ text: 'Dein Adrenalinschock ist vorbei.' });
    if (dauer === 'ruhetag' && ergebnis) {
      const p = ergebnis.probe.wert!;
      if (pflege === 'gelungen' || pflege === 'krit') zeilen.push({ text: `Dein Betreuer pflegt dich${pflege === 'krit' ? ' mit einem Krit' : ''}.` });
      zeilen.push({ text: `Deine Erholungsprobe auf ${mitZeichen('stat', d.regeln.heilung.erholungsprobe.stat, d)} ist ${ERGEBNIS_SATZ[ergebnis.stufe]} (${ergebnis.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(ergebnis.wurf)}`}, Zielwert ${p.zielwert}, Krit ≤ ${p.krit_schwelle}).` });
      const moeglich = ruhenHp();
      if (b.hp_gewonnen) zeilen.push({ text: `Du gewinnst ${b.hp_gewonnen} HP zurück${b.hp_gewonnen < moeglich ? '; mehr als deine höchsten HP geht nicht' : ''}.` });
      else zeilen.push({ text: moeglich ? 'Du gewinnst keine HP zurück, weil deine HP schon voll sind.' : 'Du gewinnst keine HP zurück.' });
      for (const g of b.geheilt) {
        zeilen.push({ text: g.rest ? `Die Wunde ${ort(g.wunde)} heilt einen Tag: noch ${tage(g.rest)}.` : `Die Wunde ${ort(g.wunde)} ist verheilt und wird gestrichen.` });
      }
      for (const w of b.heilen_nicht) zeilen.push({ text: `Die Wunde ${ort(w)} ist nicht versorgt und heilt nicht.` });
    }
    if (b.hp_nachher !== b.hp_vorher) zeilen.push({ text: `HP ${b.hp_vorher} → ${b.hp_nachher}.`, fett: true });
    if (lebenslageDes(c, d) === 'kampfunfaehig' && lebenslageDes(nach, d) === 'einsatzfaehig') zeilen.push({ text: 'Du bist nicht mehr kampfunfähig.', fett: true });
    bericht = { zeilen, nach };
  }
  /** HP, die die Probe bringen würde, ohne die Grenze der höchsten HP. */
  function ruhenHp(): number {
    const e = d.regeln.heilung.erholungsprobe;
    return ergebnis?.stufe === 'krit' ? e.krit : ergebnis?.stufe === 'erfolg' ? e.gelungen : e.misslungen;
  }
</script>

{#if bericht}
  <Bericht titel="Ruhe" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Ruhe">
    <div class="abschnitte">
      <section class="abschnitt">
        <div class="gruppe">
          <h3 class="gruppe-titel">Du ruhst {dauer === 'nacht' ? 'eine Nacht' : 'einen Ruhetag'}</h3>
          <div class="auswahlreihe gleich">
            <button aria-pressed={dauer === 'nacht'} onclick={() => dauerWaehlen('nacht')}>eine Nacht</button>
            <button aria-pressed={dauer === 'ruhetag'} onclick={() => dauerWaehlen('ruhetag')}>einen Ruhetag</button>
          </div>
        </div>
        {#if dauer === 'nacht'}
          <p class="hinweis">Nach einer Nacht Ruhe hast du die HP aus Prellungen zurück, und ein Adrenalinschock ist vorbei.</p>
        {:else}
          <p class="hinweis">Ein Tag ohne Gefecht und ohne schwere Anstrengung, mit der Nacht davor. Du legst eine Erholungsprobe ab, und jede versorgte Wunde heilt einen Tag.</p>
        {/if}
      </section>

      {#if dauer === 'ruhetag'}
        {#if tot}
          <p class="warnung">Du bist tot; es gibt keine Heilung.</p>
        {:else}
          <section class="abschnitt">
            <div class="gruppe">
              <h3 class="gruppe-titel">Pflege durch einen Betreuer: {pflege === null ? 'keine' : pflege === 'krit' ? 'Krit' : pflege}</h3>
              <div class="auswahlreihe gleich">
                <button aria-pressed={pflege === null} onclick={() => pflegeWaehlen(null)}>keine</button>
                <button aria-pressed={pflege === 'misslungen'} onclick={() => pflegeWaehlen('misslungen')}>misslungen</button>
                <button aria-pressed={pflege === 'gelungen'} onclick={() => pflegeWaehlen('gelungen')}>gelungen</button>
                <button aria-pressed={pflege === 'krit'} onclick={() => pflegeWaehlen('krit')}>Krit</button>
              </div>
              <p class="hinweis">Der Betreuer würfelt einmal am Tag auf {mitZeichen('skill', pflegeSkill(c, d), d)}. Gelungen: 1 Stepshield auf deine Erholungsprobe, Krit: 2.</p>
            </div>
          </section>

          <section class="abschnitt">
            <h3 class="abschnitt-titel">Erholungsprobe</h3>
            {#if unversorgt}
              <p class="hinweis">{unversorgt === 1 ? 'Eine Wunde ist' : `${unversorgt} Wunden sind`} nicht versorgt: {malstepsText(unversorgt * malsteps)}. Versorge sie vorher über die Figur, dann heilen sie auch.</p>
            {/if}
            <p class="hinweis">Schlechte Umstände (Feldlager, Kälte, Schmutz) trägst du als Malsteps der SL ein.</p>
            <!-- Außerhalb des Gefechts ändert die Probe selbst nichts am Charakter; deshalb kein Speichern aus dem Probenteil. -->
            <ProbeKern c={nachNacht} {d} {anfrage} hinweise={['heilung']} {wuerfelModus} mitAusgang bind:ergebnis onaendern={() => {}} />
          </section>
        {/if}
      {/if}
    </div>
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!bereit} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}
