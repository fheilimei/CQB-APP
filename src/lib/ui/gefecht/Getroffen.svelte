<script lang="ts">
  // Getroffen (konzept.md § 3.7c eingehend, § 3.10): Art · Geschoss · Zone mit Vorschau auf der Silhouette · Bericht.
  // Vorerst die Arten Schuss und Sonstiges; Nahkampf und Splitter folgen. Im Gefecht und in Ruhe.
  import type { Spieldaten } from '../../daten/typen';
  import { gefechtVon, lebenslageDes } from '../../regeln/probenrechner';
  import { ruestungswert } from '../../regeln/schaden';
  import { ausgang, ausloeserVon, deckungFuer, folgeSaetze, schadenDirekt, trefferUebernehmen, vorschau, type Ausgang, type Eingang } from '../../regeln/wunden';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import type { Wurf } from '../../wuerfel/wuerfel';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import Silhouette, { ZEICHEN, type Zonenfarbe } from '../Silhouette.svelte';
  import { type Zeile } from '../texte';
  import Wuerfel from '../Wuerfel.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    zonenModus: Quelle;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, zonenModus, onfertig, onabbrechen }: Props = $props();

  type Art = 'schuss' | 'sonstiges';
  let art = $state<Art>('schuss');
  let eingabe = $state<'kaliber' | 'direkt'>('kaliber');
  let kaliber = $state('');
  $effect.pre(() => { if (!kaliber) kaliber = d.munition.eintraege[0]?.id ?? ''; });
  let typ = $state('');
  let dk = $state(1);
  let mw = $state(1);
  let stumpf = $state(false);
  let kugeln = $state(1);
  let krit = $state(false);
  /** ID aus schutz.json (deckung) oder '' = Zone nicht verdeckt; nur wenn das Gefecht keine Deckung kennt. */
  let deckungId = $state('');
  let zone = $state<string | null>(null);
  let direktSchaden = $state(1);
  let direktArt = $state<'wunde' | 'prellung'>('wunde');
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const imGefecht = $derived(!!gefechtVon(c));
  const kal = $derived(d.munition.eintraege.find((m) => m.id === kaliber));
  const typen = $derived(Object.keys(kal?.typen ?? {}));
  $effect.pre(() => { if (!typen.includes(typ)) typ = typen[0] ?? ''; });
  const munTyp = $derived(kal?.typen[typ]);
  const deckungen = $derived([...d.schutz.deckung].sort((a, b) => a.wert - b.wert));
  /** Im Gefecht gilt die Deckung auf der Figur (konzept.md § 3.9); außerhalb die Angabe in diesem Dialog. */
  const gefechtsDeckung = $derived(imGefecht);
  const deckungAufFigur = $derived(gefechtVon(c)?.deckung ?? null);
  const handDeckung = $derived(deckungen.find((x) => x.id === deckungId)?.wert ?? null);

  const geschoss = $derived(
    eingabe === 'kaliber' && munTyp
      ? { dk: munTyp.stumpf ? null : munTyp.dk, mw: munTyp.mw }
      : { dk: stumpf ? null : dk, mw }
  );
  const deckungJeZone = (z: string) => (gefechtsDeckung ? deckungFuer(z, c, d) : handDeckung);
  const vor = $derived(vorschau(c, { ...geschoss, kugeln, krit, deckung: null }, d, deckungJeZone));
  const farben = $derived(art === 'schuss' ? Object.fromEntries(Object.entries(vor).map(([z, a]) => [z, a.art as Zonenfarbe])) : {});
  const zeichen = $derived(art === 'schuss' ? Object.fromEntries(Object.entries(vor).map(([z, a]) => [z, zeichenFuer(a)]).filter(([, t]) => t)) : {});
  const ruestung = $derived(Object.fromEntries(d.koerperzonen.eintraege.map((z) => [z.id, ruestungswert(z.id, c.ausruestung.ruestung, d)])));
  const eingang = $derived<Eingang | null>(zone ? { ...geschoss, kugeln, krit, zone, deckung: deckungJeZone(zone) } : null);
  const gewaehlt = $derived<Ausgang | null>(eingang && art === 'schuss' ? ausgang(c, eingang, d) : null);
  const zonenName = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.name ?? id;
  const rumpf = $derived(d.koerperzonen.eintraege.find((z) => z.w8 === null));

  function zeichenFuer(a: Ausgang): string {
    if (a.tot) return ZEICHEN.tot;
    if (a.kampfunfaehig) return ZEICHEN.kampfunfaehig;
    if (a.stagger) return ZEICHEN.stagger;
    return '';
  }
  function artText(a: Ausgang): string {
    if (a.art === 'gestoppt') return 'gestoppt, kein Schaden';
    return `${a.art === 'wucht' ? 'Wuchttreffer' : 'Durchschlag'}, ${a.schaden} Schaden`;
  }
  function zoneAusWurf(w: Wurf) {
    const z = d.koerperzonen.eintraege.find((x) => x.w8 === w.ergebnis);
    if (z) zone = z.id;
  }

  /** „beschossen und getroffen“, „beschossen, getroffen und verletzt“. */
  const aufzaehlung = (t: string[]) => (t.length < 2 ? t.join('') : `${t.slice(0, -1).join(', ')} und ${t.at(-1)}`);

  /** Ortsangabe der Zone im Satz („am Kopf“). */
  const ortVon = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.ort ?? `an der Zone ${zonenName(id)}`;

  /** Bericht als kleine Erzählung (wie beim Schießen): was trifft, was hält, was bleibt. */
  function weiter() {
    if (!zone) return;
    const zeilen: Zeile[] = [];
    let nach: Charakter;
    let hpVorher: number;
    let hpNachher: number;
    if (art === 'sonstiges') {
      nach = schadenDirekt(c, zone, direktSchaden, direktArt, d);
      hpVorher = ausgang(c, { zone, dk: 0, mw: 0, kugeln: 1, krit: false, deckung: null }, d).hp_vorher;
      hpNachher = hpVorher - direktSchaden;
      if (direktSchaden <= 0) {
        zeilen.push({ text: `Du wirst ${ortVon(zone)} getroffen, erleidest aber keinen Schaden.`, fett: true });
      } else if (direktArt === 'wunde') {
        zeilen.push({ text: `Du erleidest ${ortVon(zone)} eine Wunde mit ${direktSchaden} Schaden.`, fett: true });
        zeilen.push({ text: 'Die Wunde blutet.' });
      } else {
        zeilen.push({ text: `Du erleidest ${ortVon(zone)} eine Prellung mit ${direktSchaden} Schaden.`, fett: true });
        zeilen.push({ text: 'Sie kommt nach einer Nacht Ruhe als HP zurück.' });
      }
      if (direktSchaden > 0) zeilen.push({ text: `Deine HP sinken von ${hpVorher} auf ${hpNachher}.` });
      if (imGefecht && direktSchaden > 0) zeilen.push({ text: 'Für das Rundenende: Du wurdest verletzt.' });
    } else {
      const e = eingang!;
      const a = gewaehlt!;
      nach = trefferUebernehmen(c, e, { quelle: 'Schuss', schuss: true }, d);
      const mehrere = e.kugeln > 1;
      const er = mehrere ? 'Sie' : 'Er';
      const was = eingabe === 'kaliber' && kal
        ? `${kal.name}, ${typ}`
        : e.dk === null ? `stumpf, Mannstoppwirkung ${e.mw}` : `Durchschlagskraft ${e.dk}, Mannstoppwirkung ${e.mw}`;
      zeilen.push({ text: `${mehrere ? `${e.kugeln} Kugeln` : 'Ein Schuss'} (${was}) ${mehrere ? 'treffen' : 'trifft'} dich ${ortVon(zone)}.${e.krit ? ' Die SL sagt einen Krit an.' : ''}`, fett: true });

      if (a.art === 'gestoppt') {
        zeilen.push({ text: `Deine Deckung (Schutz ${e.deckung}) hält ${mehrere ? 'sie' : 'ihn'} auf. Du bleibst unverletzt.`, fett: true });
      } else {
        if (e.deckung !== null && e.dk !== null) {
          zeilen.push({ text: `${er} ${mehrere ? 'durchdringen' : 'durchdringt'} deine Deckung (Schutz ${e.deckung}) und ${mehrere ? 'haben' : 'hat'} danach noch Durchschlagskraft ${a.rest_dk}.` });
        }
        if (a.art === 'durchschlag') {
          const mult = d.koerperzonen.eintraege.find((z) => z.id === zone)!.multiplikator;
          const durch = a.ruestung > 0
            ? `${er} ${mehrere ? 'durchschlagen' : 'durchschlägt'} deine Rüstung (Schutz ${a.ruestung})`
            : `Keine Rüstung hält ${mehrere ? 'sie' : 'ihn'} auf`;
          const rechnung = `Mannstoppwirkung ${e.mw} × ${mult}${mehrere ? ` × ${e.kugeln} Kugeln` : ''}`;
          if (a.schaden > 0) {
            zeilen.push({ text: `${durch}: Du erleidest eine${a.folge === 'krit' ? ' kritische' : ''} Wunde mit ${a.schaden} Schaden (${rechnung}).` });
            for (const satz of folgeSaetze(a, c, d)) zeilen.push({ text: satz, fett: a.folge === 'krit' });
          } else {
            zeilen.push({ text: `${durch}, ${mehrere ? 'richten' : 'richtet'} aber keinen Schaden an.` });
          }
        } else if (e.dk === null) {
          // Stumpf: immer Wuchttreffer, die Rüstung fängt ihren vollen Wert ab.
          if (a.ruestung > 0) zeilen.push({ text: `Deine Rüstung (Schutz ${a.ruestung}) fängt ${Math.min(a.ruestung, e.mw)} der Wucht ab.` });
          zeilen.push({ text: a.schaden > 0
            ? `Es bleibt eine Prellung mit ${a.schaden} Schaden; sie kommt nach einer Nacht Ruhe als HP zurück.`
            : 'Du bleibst unverletzt.' });
        } else {
          zeilen.push({ text: a.schaden > 0
            ? `Deine Rüstung (Schutz ${a.ruestung}) hält, doch die Wucht kommt durch: eine Prellung mit ${a.schaden} Schaden. Sie kommt nach einer Nacht Ruhe als HP zurück.`
            : `Deine Rüstung (Schutz ${a.ruestung}) hält und fängt die Wucht ganz ab. Du bleibst unverletzt.` });
          if (e.krit) zeilen.push({ text: 'Die Rüstung schützt dich auch vor dem Krit.' });
        }
      }
      hpVorher = a.hp_vorher;
      hpNachher = a.hp_nachher;
      if (a.schaden > 0) zeilen.push({ text: `Deine HP sinken von ${hpVorher} auf ${hpNachher}.` });
      if (a.stagger) zeilen.push({ text: imGefecht
        ? 'Der Treffer bringt dich ins Wanken (Stagger): Deine Breakaction dieser Runde verfällt, und eine Aktion mit Konzentration ist unterbrochen.'
        : 'Der Treffer bringt dich ins Wanken (Stagger).', fett: true });
      if (imGefecht) {
        const g = gefechtVon(c)!;
        const neu = ausloeserVon(a, true, d).filter((x) => !g.ausloeser_diese_runde.includes(x));
        const name = (id: string) => d.regeln.leiter.ausloeser.find((x) => x.id === id)?.name ?? id;
        // Stagger passt nicht in „Du wurdest …“ und hängt als eigener Satzteil an.
        const st = d.regeln.eingehend.ausloeser.stagger;
        const teile = neu.filter((x) => x !== st).map(name);
        const satz = [teile.length ? `wurdest ${aufzaehlung(teile)}` : '', neu.includes(st) ? 'hast Stagger erlitten' : ''].filter(Boolean).join(' und ');
        if (satz) zeilen.push({ text: `Für das Rundenende: Du ${satz}.` });
      }
    }
    const vorher = lebenslageDes(c, d);
    const danach = lebenslageDes(nach, d);
    if (danach === 'tot' && vorher !== 'tot') zeilen.push({ text: 'Du bist tot.', fett: true });
    else if (danach === 'kampfunfaehig' && vorher === 'einsatzfaehig') zeilen.push({ text: 'Du bist kampfunfähig.', fett: true });
    bericht = { zeilen, nach };
  }
</script>

{#if bericht}
  <Bericht titel="Getroffen" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Getroffen">
    <div class="abschnitte">
      <section class="abschnitt">
        <h3 class="abschnitt-titel">Was trifft dich?</h3>
        <div class="auswahlreihe gleich" role="group" aria-label="Art des Treffers">
          <button aria-pressed={art === 'schuss'} onclick={() => (art = 'schuss')}>Schuss</button>
          <button aria-pressed={art === 'sonstiges'} onclick={() => (art = 'sonstiges')}>Sonstiges</button>
        </div>
        <p class="hinweis">Nahkampf und Splitter folgen in einer der nächsten Versionen.</p>

        {#if art === 'schuss'}
          <div class="gruppe">
            <span class="gruppe-titel">Geschoss angeben als</span>
            <div class="umschalter" role="group" aria-label="Geschoss angeben als">
              <button aria-pressed={eingabe === 'kaliber'} onclick={() => (eingabe = 'kaliber')}>Kaliber</button>
              <button aria-pressed={eingabe === 'direkt'} onclick={() => (eingabe = 'direkt')}>DK und MW</button>
            </div>
          </div>
          {#if eingabe === 'kaliber'}
            <div class="zwei">
              <label class="feld">Kaliber
                <select bind:value={kaliber}>
                  {#each d.munition.eintraege as m (m.id)}<option value={m.id}>{m.name}</option>{/each}
                </select>
              </label>
              <label class="feld">Munitionstyp
                <select bind:value={typ}>
                  {#each typen as t (t)}<option value={t}>{t}</option>{/each}
                </select>
              </label>
            </div>
            {#if munTyp}
              <p class="hinweis">{munTyp.stumpf ? 'stumpf (keine DK)' : `DK ${munTyp.dk}`} · MW {munTyp.mw}</p>
            {/if}
          {:else}
            <div class="zwei">
              <div class="gruppe">
                <span class="gruppe-titel">Durchschlagskraft (DK)</span>
                <span class="stepper">
                  <button aria-label="DK eins weniger" disabled={stumpf || dk <= 0} onclick={() => (dk -= 1)}>−</button>
                  <strong>{stumpf ? '–' : dk}</strong>
                  <button aria-label="DK eins mehr" disabled={stumpf} onclick={() => (dk += 1)}>+</button>
                </span>
              </div>
              <div class="gruppe">
                <span class="gruppe-titel">Mannstoppwirkung (MW)</span>
                <span class="stepper">
                  <button aria-label="MW eins weniger" disabled={mw <= 0} onclick={() => (mw -= 1)}>−</button>
                  <strong>{mw}</strong>
                  <button aria-label="MW eins mehr" onclick={() => (mw += 1)}>+</button>
                </span>
              </div>
            </div>
            <label class="schalter"><input type="checkbox" bind:checked={stumpf} /> stumpf (Gummigeschoss, Druckwelle): keine DK</label>
          {/if}
          <div class="zwei">
            <div class="gruppe">
              <span class="gruppe-titel">Kugeln</span>
              <span class="stepper">
                <button aria-label="eine Kugel weniger" disabled={kugeln <= 1} onclick={() => (kugeln -= 1)}>−</button>
                <strong>{kugeln}</strong>
                <button aria-label="eine Kugel mehr" onclick={() => (kugeln += 1)}>+</button>
              </span>
            </div>
            <label class="schalter"><input type="checkbox" bind:checked={krit} /> Krit (sagt die SL an)</label>
          </div>
          {#if gefechtsDeckung}
            <p class="hinweis">{deckungAufFigur ? `Deckung Schutz ${deckungAufFigur.wert} vor den schraffierten Zonen` : 'Keine Deckung eingetragen'}; ändern über den Knopf Deckung auf der Figur.</p>
          {:else}
            <label class="feld">Deckung vor der getroffenen Zone
              <select bind:value={deckungId}>
                <option value="">keine</option>
                {#each deckungen as x (x.id)}<option value={x.id}>{x.name} ({x.wert})</option>{/each}
              </select>
            </label>
          {/if}
        {:else}
          <div class="zwei">
            <div class="gruppe">
              <span class="gruppe-titel">Schaden</span>
              <span class="stepper">
                <button aria-label="eins weniger" disabled={direktSchaden <= 0} onclick={() => (direktSchaden -= 1)}>−</button>
                <strong>{direktSchaden}</strong>
                <button aria-label="eins mehr" onclick={() => (direktSchaden += 1)}>+</button>
              </span>
            </div>
            <div class="gruppe">
              <span class="gruppe-titel">Eintragen als</span>
              <div class="umschalter" role="group" aria-label="Eintragen als">
                <button aria-pressed={direktArt === 'wunde'} onclick={() => (direktArt = 'wunde')}>Wunde</button>
                <button aria-pressed={direktArt === 'prellung'} onclick={() => (direktArt = 'prellung')}>Prellung</button>
              </div>
            </div>
          </div>
          <p class="hinweis">Für Sturz, Falle und Ähnliches: ohne Deckung, Rüstung und Folgen der Zone.</p>
        {/if}
      </section>

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Wo trifft es dich?</h3>
        <Silhouette {d} verdeckt={deckungAufFigur?.zonen ?? []} {farben} {zeichen} {ruestung} gewaehlt={zone} onwahl={(z) => (zone = z)} beschriftung="Getroffene Zone wählen" />
        {#if art === 'schuss'}
          <p class="legende">
            <span class="muster gestoppt"></span>gestoppt
            <span class="muster wucht"></span>Wucht
            <span class="muster durchschlag"></span>Durchschlag
            <span>{ZEICHEN.stagger} Stagger · {ZEICHEN.kampfunfaehig} kampfunfähig · {ZEICHEN.tot} tödlich</span>
          </p>
        {/if}
        {#if rumpf}
          <div class="auswahlreihe">
            <button aria-pressed={zone === rumpf.id} onclick={() => (zone = rumpf.id)}>{rumpf.name} (Ansage)</button>
          </div>
        {/if}
        {#if zone}
          <p class="ergebnis" aria-live="polite"><strong>{zonenName(zone)}</strong>
            {#if gewaehlt}: {artText(gewaehlt)}{#if gewaehlt.schaden > 0}, HP {gewaehlt.hp_vorher} → {gewaehlt.hp_nachher}{/if}{/if}</p>
        {:else}
          <p class="hinweis">Tippe die Zone an oder trag den W8 der SL ein.</p>
        {/if}
      </section>

      <Wuerfel art="W8" modus={zonenModus} titel="Trefferzone (W8)" onwurf={zoneAusWurf}>
        {#if zone}<p class="ansage">{zonenName(zone)}</p>{/if}
      </Wuerfel>
    </div>
  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Abbrechen</button>
    <button class="haupt" disabled={!zone} onclick={weiter}>Weiter</button>
  {/snippet}
  </Dialog>
{/if}

<style>
  .zwei { display: grid; grid-template-columns: 1fr 1fr; gap: var(--abstand-3); align-items: end; }
  select { width: 100%; }
  .legende { margin: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--abstand-1) var(--abstand-2); font-size: 0.85rem; color: var(--text-2); }
  /* Farbmuster der Legende: kleines Quadrat in der Farbe der Vorschau. */
  .muster { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--linie); }
  .muster.gestoppt { background: var(--treffer-gestoppt); }
  .muster.wucht { background: var(--treffer-wucht); }
  .muster.durchschlag { background: var(--treffer-durchschlag); }
  .ergebnis { margin: 0; text-align: center; font-size: 1.1rem; }
</style>
