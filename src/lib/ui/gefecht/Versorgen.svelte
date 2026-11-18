<script lang="ts">
  // Wunde versorgen (konzept.md § 3.10, § 4.8; Regelwerk: Schaden, Blutung und Verletzungen, Versorgen).
  // Abschnitte: Welche Wunde (nur ohne Vorgabe) · Maßnahme · Wer versorgt · Probe bzw. Ergebnis · Bericht.
  // Selbst: Probe auf den Skill der Maßnahme (nach dem Gefecht ggf. trivial); im Gefecht Mainaction mit Konzentration.
  // Jemand anders: Der Spieler tippt nur, ob es gelungen ist (Entscheidung des Nutzers, 18.11.2026).
  import type { Spieldaten } from '../../daten/typen';
  import { konzentrationMoeglich, konzentrationSetzen, protokolliere, verbrauchen } from '../../regeln/aktionen';
  import {
    fristMinuten, massnahmenFuer, versorgbareWunden, versorgen, versorgenAnfrage, versorgenKonzentration, versorgenTrivial,
    type MoeglicheMassnahme
  } from '../../regeln/blutung';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { wundenText } from '../../regeln/wunden';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';
  import { ERGEBNIS_SATZ, skillName, wurfZahl, type Zeile } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    /** Vorgegebene Wunde (aus der Übersicht der Zone); null = wählen (Main → Wunde versorgen). */
    wundId: string | null;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, wundId, wuerfelModus, onaendern, onfertig, onabbrechen }: Props = $props();

  const VERBUENDETER = '__verbuendeter';
  let wahlWunde = $state<string | null>(null);
  $effect.pre(() => { wahlWunde = wundId; });
  let wahlMassnahme = $state<string | null>(null);
  let wer = $state<'selbst' | 'andere'>('selbst');
  let ergebnis = $state<ProbenErgebnis | null>(null);
  let fremdGelungen = $state<boolean | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const imGefecht = $derived(!!gefechtVon(c));
  const wunden = $derived(versorgbareWunden(c, d));
  const wunde = $derived(wahlWunde && wahlWunde !== VERBUENDETER ? c.spielstand.wunden.find((w) => w.id === wahlWunde) ?? null : null);
  const fuerVerbuendeten = $derived(wahlWunde === VERBUENDETER);
  /** Beim Verbündeten kennt die App die Wunde nicht: alle Maßnahmen zur Wahl. */
  const massnahmen = $derived<MoeglicheMassnahme[]>(
    wunde ? massnahmenFuer(wunde, d) : fuerVerbuendeten ? Object.entries(d.regeln.versorgen).map(([id, massnahme]) => ({ id, massnahme, wirkung: 'stoppt' as const })) : []
  );
  $effect.pre(() => {
    // Gibt es nur eine Maßnahme, ist sie gewählt; passt die Wahl nicht mehr (andere Wunde), fällt sie weg.
    if (massnahmen.length === 1) wahlMassnahme = massnahmen[0]!.id;
    else if (wahlMassnahme && !massnahmen.some((m) => m.id === wahlMassnahme)) wahlMassnahme = null;
  });
  const gewaehlt = $derived(massnahmen.find((m) => m.id === wahlMassnahme) ?? null);
  const selbst = $derived(fuerVerbuendeten || wer === 'selbst');
  const trivial = $derived(!!gewaehlt && selbst && versorgenTrivial(c, gewaehlt.id, d));
  const konzentration = $derived(gewaehlt ? versorgenKonzentration(c, gewaehlt.id, d) : 'voll');
  const gesperrt = $derived(imGefecht && selbst && !konzentrationMoeglich(c));
  const anfrage = $derived(gewaehlt ? versorgenAnfrage(gewaehlt.id, d) : null);

  const bereit = $derived(
    !!gewaehlt && !gesperrt && (trivial || (selbst ? !!ergebnis : fremdGelungen !== null))
  );

  function wirkungText(m: MoeglicheMassnahme): string {
    if (fuerVerbuendeten) return `Probe auf ${skillName(m.massnahme.skill, d)}`;
    return m.wirkung === 'stoppt' ? 'stoppt die Blutung' : `verlängert die Frist ×${m.wirkung.frist_faktor} (einmal)`;
  }
  function wundeWaehlen(id: string) { wahlWunde = id; ergebnis = null; fremdGelungen = null; }
  function massnahmeWaehlen(id: string) { wahlMassnahme = id; ergebnis = null; }
  function werWaehlen(w: 'selbst' | 'andere') { wer = w; ergebnis = null; fremdGelungen = null; }

  function weiter() {
    if (!gewaehlt) return;
    const name = gewaehlt.massnahme.name;
    const gelungen = trivial || (selbst ? ergebnis!.stufe !== 'misserfolg' : !!fremdGelungen);
    const zeilen: Zeile[] = [];
    if (trivial) zeilen.push({ text: `Mit ${skillName(gewaehlt.massnahme.skill, d)} ${c.skills[gewaehlt.massnahme.skill] ?? 0} legst du nach dem Gefecht einen ${name} ohne Probe an.` });
    else if (selbst) {
      const p = ergebnis!.probe.wert!;
      zeilen.push({ text: `Deine Probe auf ${skillName(gewaehlt.massnahme.skill, d)} ist ${ERGEBNIS_SATZ[ergebnis!.stufe]} (${ergebnis!.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(ergebnis!.wurf)}`}, Zielwert ${p.zielwert}, Krit ≤ ${p.krit_schwelle}).` });
    } else zeilen.push({ text: `Jemand versorgt dich mit einem ${name}; es ist ${gelungen ? 'gelungen' : 'misslungen'}.` });

    let nach = c;
    if (fuerVerbuendeten) {
      zeilen.push({ text: gelungen ? `Der ${name} beim Verbündeten sitzt. Sag es der SL bzw. dem Spieler des Verbündeten.` : 'Die Versorgung ist misslungen. Du darfst es erneut versuchen, solange die Frist läuft.', fett: true });
    } else if (wunde) {
      if (gelungen) {
        nach = versorgen(c, wunde.id, gewaehlt.id, d);
        const neu = nach.spielstand.wunden.find((w) => w.id === wunde.id)!;
        if (gewaehlt.wirkung === 'stoppt') zeilen.push({ text: wunde.blutung.status === 'offen' ? 'Die Blutung ist gestoppt.' : 'Die Wunde ist jetzt versorgt und kann heilen.', fett: true });
        else zeilen.push({ text: `Die Wunde blutet weiter, aber langsamer: Die Frist beträgt jetzt ${fristMinuten(neu, d)} Minuten ab Gefechtsende. Stoppen kann sie nur eine Operation.`, fett: true });
      } else zeilen.push({ text: 'Die Wunde ist nicht versorgt. Du darfst es erneut versuchen, solange die Frist läuft.', fett: true });
    }
    if (imGefecht && selbst) {
      nach = konzentrationSetzen(verbrauchen(nach, 'main'), konzentration);
      zeilen.push({ text: `Main −1. Du bist ${konzentration === 'voll' ? 'voll' : 'leicht'} konzentriert und hast in dieser Runde keine Breakaction mehr.` });
      nach = protokolliere(nach, `${name}${wunde ? ` (${wundenText(wunde, d)})` : ' beim Verbündeten'}: ${gelungen ? 'gelungen' : 'misslungen'}`);
    }
    bericht = { zeilen, nach };
  }
</script>

{#if bericht}
  <Bericht titel="Wunde versorgen" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Wunde versorgen">
    <div class="abschnitte">
      {#if wundId === null}
        <section class="abschnitt">
          <h3 class="abschnitt-titel">Welche Wunde?</h3>
          <div class="auswahlliste">
            {#each wunden as w (w.id)}
              <button aria-pressed={wahlWunde === w.id} onclick={() => wundeWaehlen(w.id)}>
                {wundenText(w, d)}
                <small>{w.blutung.status === 'offen' ? `blutet · Frist ${fristMinuten(w, d)} Minuten` : 'ausgeblutet, unversorgt'}</small>
              </button>
            {/each}
            <button aria-pressed={fuerVerbuendeten} onclick={() => wundeWaehlen(VERBUENDETER)}>
              eines Verbündeten
              <small>nur deine Probe; die Wunde führt er selbst</small>
            </button>
          </div>
        </section>
      {:else if wunde}
        <p><strong>{wundenText(wunde, d)}</strong> · {wunde.blutung.status === 'offen' ? `blutet, Frist ${fristMinuten(wunde, d)} Minuten` : 'ausgeblutet, unversorgt'}</p>
      {/if}

      {#if massnahmen.length}
        <section class="abschnitt">
          <div class="gruppe">
            <h3 class="gruppe-titel">Maßnahme: {gewaehlt?.massnahme.name ?? '…'}</h3>
            <div class="auswahlliste">
              {#each massnahmen as m (m.id)}
                <button aria-pressed={wahlMassnahme === m.id} onclick={() => massnahmeWaehlen(m.id)}>
                  {m.massnahme.name}<small>{wirkungText(m)}</small>
                </button>
              {/each}
            </div>
          </div>
          {#if !fuerVerbuendeten}
            <div class="gruppe">
              <h3 class="gruppe-titel">Wer versorgt: {wer === 'selbst' ? 'du selbst' : 'jemand anders'}</h3>
              <div class="auswahlreihe gleich">
                <button aria-pressed={wer === 'selbst'} onclick={() => werWaehlen('selbst')}>du selbst</button>
                <button aria-pressed={wer === 'andere'} onclick={() => werWaehlen('andere')}>jemand anders</button>
              </div>
            </div>
          {/if}
        </section>
      {/if}

      {#if gewaehlt}
        <section class="abschnitt">
          {#if selbst && imGefecht}
            <p class="hinweis">Mainaction mit {konzentration === 'voll' ? 'voller' : 'leichter'} Konzentration: danach keine Breakaction in dieser Runde{konzentration === 'voll' ? ', keine Bewegung und kein Standwechsel' : ', Bewegung höchstens Gehen'}.</p>
            {#if gesperrt}<p class="fehler">Du hast in dieser Runde schon eine Breakaction eingesetzt; Konzentration geht erst in der nächsten Runde.</p>{/if}
          {/if}
          {#if selbst && gewaehlt.massnahme.mehrere_runden}
            <p class="hinweis">Eine {gewaehlt.massnahme.name} dauert mehrere Runden; wie viele, legt die SL nach der Wunde fest. Du würfelst in der letzten Runde.</p>
          {/if}
          {#if trivial}
            <p class="ansage">Ohne Probe</p>
            <p class="hinweis">Nach dem Gefecht ist ein {gewaehlt.massnahme.name} ab {skillName(gewaehlt.massnahme.skill, d)} {gewaehlt.massnahme.trivial_nach_gefecht_ab} trivial.</p>
          {:else if selbst && anfrage && !gesperrt}
            {#key gewaehlt.id}
              <ProbeKern {c} {d} {anfrage} hinweise={['heilung']} {wuerfelModus} mitAusgang bind:ergebnis {onaendern} />
            {/key}
          {:else if !selbst}
            <div class="gruppe">
              <h3 class="gruppe-titel">Die Versorgung ist: {fremdGelungen === null ? '…' : fremdGelungen ? 'gelungen' : 'misslungen'}</h3>
              <div class="auswahlreihe gleich">
                <button aria-pressed={fremdGelungen === true} onclick={() => (fremdGelungen = true)}>gelungen</button>
                <button aria-pressed={fremdGelungen === false} onclick={() => (fremdGelungen = false)}>misslungen</button>
              </div>
            </div>
          {/if}
        </section>
      {:else if wahlWunde === null && !wunden.length}
        <p class="hinweis">Keine deiner Wunden braucht eine Versorgung.</p>
      {/if}
    </div>
    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!bereit} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}
