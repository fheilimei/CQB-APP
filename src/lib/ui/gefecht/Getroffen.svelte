<script lang="ts">
  // Getroffen (konzept.md § 3.7c eingehend, § 3.10): Art · Geschoss · Zone mit Vorschau auf der Silhouette · Bericht.
  // Arten Schuss, Nahkampf (§ 3.8b eingehend: Verteidigung, Ausgang, Kampfkunst) und Sonstiges; Splitter folgt. Im Gefecht und in Ruhe.
  import type { Spieldaten } from '../../daten/typen';
  import { eigenerStand } from '../../regeln/aktionen';
  import {
    angriffEintragen, eigeneKampfkunst, gegnerKampfkunst, gegnerWirkungAnwenden, malstepsDesGegners, nahkampfTreffer,
    nahkampfwaffenWahl, ueberlegen, verteidigungsSteps, wirkungsFolge, type Wirkung
  } from '../../regeln/nahkampf';
  import { gefechtVon, lebenslageDes } from '../../regeln/probenrechner';
  import { ruestungswert } from '../../regeln/schaden';
  import { ausgang, deckungFuer, folgeSaetze, schadenDirekt, trefferUebernehmen, vorschau, type Ausgang, type Eingang } from '../../regeln/wunden';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import type { Wurf } from '../../wuerfel/wuerfel';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';
  import Silhouette, { ZEICHEN, type Zonenfarbe } from '../Silhouette.svelte';
  import { ERGEBNIS_SATZ, malstepsText, mitZeichen, standAdjektiv, wurfZahl, type Zeile } from '../texte';
  import Wuerfel from '../Wuerfel.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    zonenModus: Quelle;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, zonenModus, wuerfelModus, onaendern, onfertig, onabbrechen }: Props = $props();

  type Art = 'schuss' | 'nahkampf' | 'sonstiges';
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
  let zone = $state<string | null>(null);
  let direktSchaden = $state(1);
  let direktArt = $state<'wunde' | 'prellung'>('wunde');
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  // Nahkampf (konzept.md § 3.8b, eingehend)
  const waffenListe = $derived(nahkampfwaffenWahl(d));
  let nkEingabe = $state<'waffe' | 'direkt'>('waffe');
  let nkWaffe = $state('');
  $effect.pre(() => { if (!nkWaffe) nkWaffe = waffenListe[0]?.id ?? ''; });
  let nkSchaden = $state(0);
  $effect.pre(() => { if (!nkSchaden) nkSchaden = d.regeln.grundwerte.nahkampfschaden; });
  let standRuhe = $state('');
  let gegnerStand = $state('');
  $effect.pre(() => { if (!gegnerStand) gegnerStand = d.regeln.staende[0]!.id; });
  let wahrgenommen = $state(true);
  let langeWaffe = $state(false);
  let probe = $state<ProbenErgebnis | null>(null);
  let nkAusgang = $state<'getroffen' | 'abgewehrt' | 'unentschieden' | null>(null);
  let eigeneWirkung = $state<string | null>(null);
  let gegnerWirkung = $state<string | null>(null);

  const gef = $derived(gefechtVon(c));
  const meinStand = $derived(gef ? eigenerStand(gef, d) : standRuhe || d.regeln.staende[0]!.id);
  const nkLage = $derived({ eigenerStand: meinStand, gegnerStand, langeWaffeInArmeslaenge: langeWaffe });
  const ueber = $derived(ueberlegen(meinStand, gegnerStand, d));
  const nkWahl = $derived(waffenListe.find((w) => w.id === nkWaffe));
  const nkTreffer = $derived(
    nkEingabe === 'waffe' && nkWahl ? nahkampfTreffer(nkWahl, nkSchaden) : { dk: stumpf ? null : dk, mw }
  );
  const eigeneWirkungen = $derived(eigeneKampfkunst(c, meinStand, gegnerStand, d));
  const gegnerWirkungen = $derived(gegnerKampfkunst(nkLage, d));
  const wirkungVon = (id: string | null): Wirkung | undefined => d.regeln.nahkampf.wirkungen.find((w) => w.id === id);
  /** Treffer, die eine Zone brauchen: Schuss, Sonstiges, Nahkampf nur bei „getroffen“. */
  const mitZone = $derived(art !== 'nahkampf' || nkAusgang === 'getroffen');
  const mitVorschau = $derived(art === 'schuss' || (art === 'nahkampf' && nkAusgang === 'getroffen'));
  const kannWeiter = $derived(art === 'nahkampf' ? !!nkAusgang && (nkAusgang !== 'getroffen' || !!zone) : !!zone);

  const kal = $derived(d.munition.eintraege.find((m) => m.id === kaliber));
  const typen = $derived(Object.keys(kal?.typen ?? {}));
  $effect.pre(() => { if (!typen.includes(typ)) typ = typen[0] ?? ''; });
  const munTyp = $derived(kal?.typen[typ]);
  /** Es gilt die Deckung auf der Figur (konzept.md § 3.9), im Gefecht und in Ruhe. */
  const deckungAufFigur = $derived(c.spielstand.deckung ?? null);

  const geschoss = $derived(
    art === 'nahkampf'
      ? nkTreffer
      : eingabe === 'kaliber' && munTyp
        ? { dk: munTyp.stumpf ? null : munTyp.dk, mw: munTyp.mw }
        : { dk: stumpf ? null : dk, mw }
  );
  const anzahl = $derived(art === 'nahkampf' ? 1 : kugeln);
  const deckungJeZone = (z: string) => deckungFuer(z, c, d);
  const vor = $derived(vorschau(c, { ...geschoss, kugeln: anzahl, krit, deckung: null }, d, deckungJeZone));
  const farben = $derived(mitVorschau ? Object.fromEntries(Object.entries(vor).map(([z, a]) => [z, a.art as Zonenfarbe])) : {});
  const zeichen = $derived(mitVorschau ? Object.fromEntries(Object.entries(vor).map(([z, a]) => [z, zeichenFuer(a)]).filter(([, t]) => t)) : {});
  const ruestung = $derived(Object.fromEntries(d.koerperzonen.eintraege.map((z) => [z.id, ruestungswert(z.id, c.ausruestung.ruestung, d)])));
  const eingang = $derived<Eingang | null>(zone ? { ...geschoss, kugeln: anzahl, krit, zone, deckung: deckungJeZone(zone) } : null);
  const gewaehlt = $derived<Ausgang | null>(eingang && mitVorschau ? ausgang(c, eingang, d) : null);
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

  /** Ausgang des Schadensablaufs als Sätze (Schuss und Nahkampf); `er` ist das Fürwort für das, was trifft. */
  function schadenSaetze(e: Eingang, a: Ausgang, zeilen: Zeile[]) {
    const mehrere = e.kugeln > 1;
    const er = mehrere ? 'Sie' : 'Er';
    if (a.art === 'gestoppt') {
      zeilen.push({ text: `Deine Deckung (Schutz ${e.deckung}) hält ${mehrere ? 'sie' : 'ihn'} auf. Du bleibst unverletzt.`, fett: true });
      return;
    }
    if (e.deckung !== null && e.dk !== null) {
      zeilen.push({ text: `${er} ${mehrere ? 'durchdringen' : 'durchdringt'} deine Deckung (Schutz ${e.deckung}) und ${mehrere ? 'haben' : 'hat'} danach noch Durchschlagskraft ${a.rest_dk}.` });
    }
    if (a.art === 'durchschlag') {
      const mult = d.koerperzonen.eintraege.find((z) => z.id === e.zone)!.multiplikator;
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

  const STAGGER_SATZ = (imG: boolean) => imG
    ? 'Der Treffer bringt dich ins Wanken (Stagger): Deine Breakaction dieser Runde verfällt, und eine Aktion mit Konzentration ist unterbrochen.'
    : 'Der Treffer bringt dich ins Wanken (Stagger).';

  /** „Für das Rundenende: …“ aus den Auslösern, die zwischen vorher und nachher neu gesetzt wurden (Reihenfolge wie in regeln.json). */
  function rundenendeSatz(vorher: Charakter, nach: Charakter): Zeile | null {
    const gv = gefechtVon(vorher);
    const gn = gefechtVon(nach);
    if (!gv || !gn) return null;
    const neu = d.regeln.leiter.ausloeser.filter((x) => gn.ausloeser_diese_runde.includes(x.id) && !gv.ausloeser_diese_runde.includes(x.id));
    // Stagger passt nicht in „Du wurdest …“ und hängt als eigener Satzteil an.
    const st = d.regeln.eingehend.ausloeser.stagger;
    const teile = neu.filter((x) => x.id !== st).map((x) => x.name);
    const satz = [teile.length ? `wurdest ${aufzaehlung(teile)}` : '', neu.some((x) => x.id === st) ? 'hast Stagger erlitten' : ''].filter(Boolean).join(' und ');
    return satz ? { text: `Für das Rundenende: Du ${satz}.` } : null;
  }

  /** Bericht für Getroffen → Nahkampf: Angriff, Verteidigung, Ausgang, Schaden, Kampfkunst, Auslöser. */
  function nahkampfBericht(): { zeilen: Zeile[]; nach: Charakter } {
    const zeilen: Zeile[] = [];
    const waffeText = nkEingabe === 'waffe' && nkWahl
      ? `${nkWahl.name}, ${nkWahl.art}`
      : geschoss.dk === null ? 'stumpf' : `Durchschlagskraft ${geschoss.dk}`;
    zeilen.push({ text: `Ein Gegner greift dich im Nahkampf an (${waffeText}). Er steht ${standAdjektiv(gegnerStand, d)}, du ${standAdjektiv(meinStand, d)}.`, fett: true });
    if (ueber === 'b') zeilen.push({ text: `Er hat den überlegenen Stand: ${malstepsText(d.regeln.nahkampf.ueberlegener_stand_malsteps)} für dich.` });
    else if (ueber === 'a') zeilen.push({ text: `Du hast den überlegenen Stand: Der Gegner hat ${malstepsText(d.regeln.nahkampf.ueberlegener_stand_malsteps)}.` });

    if (!wahrgenommen) {
      zeilen.push({ text: 'Du hast den Angreifer nicht wahrgenommen und kannst dich nicht verteidigen. Gelingt seine Probe, trifft er.' });
    } else {
      const w = probe?.probe.wert;
      const pr = mitZeichen('skill', d.regeln.nahkampf.skill, d);
      zeilen.push({ text: probe && w
        ? `Du verteidigst dich: Deine ${pr}-Probe ist ${ERGEBNIS_SATZ[probe.stufe]} (${probe.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(probe.wurf)}`}, Zielwert ${w.zielwert}, Krit ≤ ${w.krit_schwelle}). Das kostet keine Aktion.`
        : `Du verteidigst dich mit ${pr}. Das kostet keine Aktion.` });
      if (gef?.konzentration) zeilen.push({ text: 'Deine Aktion mit Konzentration ist dadurch unterbrochen.' });
    }

    let nach = angriffEintragen(c, wahrgenommen, d);
    if (nkAusgang === 'abgewehrt' || nkAusgang === 'unentschieden') {
      zeilen.push({ text: nkAusgang === 'abgewehrt' ? 'Du wehrst den Angriff ab.' : wahrgenommen ? 'Unentschieden: Der Angriff trifft nicht.' : 'Der Angriff geht daneben.', fett: true });
      if (nkAusgang === 'abgewehrt' && probe?.stufe === 'krit') {
        zeilen.push({ text: 'Dein Krit: Abstand bestimmen. Du bewegst dich sofort in Armeslänge zum Angreifer oder aus dem Band bedrängt heraus, ohne Aktion.' });
      }
      const ew = nkAusgang === 'abgewehrt' ? eigeneWirkungen.find((x) => x.wirkung.id === eigeneWirkung) : undefined;
      if (ew) {
        const perks = ew.perks.map((id) => mitZeichen('perk', id, d)).join(', ');
        zeilen.push({ text: `Für die SL: Mit dem überlegenen Stand (${perks}) wirkst du ${ew.wirkung.name}: Der Gegner ${ew.wirkung.folge}.` });
      }
    } else {
      const e = eingang!;
      const a = gewaehlt!;
      zeilen.push({ text: `Der Angriff trifft dich ${ortVon(e.zone)} (Mannstoppwirkung ${e.mw}).${e.krit ? ' Die SL sagt einen Krit an.' : ''}`, fett: true });
      nach = trefferUebernehmen(nach, e, { quelle: 'Nahkampf', schuss: false }, d);
      schadenSaetze(e, a, zeilen);
      if (a.schaden > 0) zeilen.push({ text: `Deine HP sinken von ${a.hp_vorher} auf ${a.hp_nachher}.` });
      if (a.stagger) zeilen.push({ text: STAGGER_SATZ(!!gef), fett: true });
      const gw = wirkungVon(gegnerWirkung);
      if (gw) {
        const f = wirkungsFolge(nach, gw, d);
        if (f.stagger_verhindert) zeilen.push({ text: `Der Gegner wirkt ${gw.name}, doch du ignorierst den Schmerz und erleidest keinen Stagger.` });
        else if (gw.stagger && a.stagger) zeilen.push({ text: `Der Gegner wirkt zusätzlich ${gw.name}.` });
        else zeilen.push({ text: `Der Gegner wirkt ${gw.name}: ${gw.folge_du}${gw.stagger && gef ? ' Deine Breakaction dieser Runde verfällt, und eine Aktion mit Konzentration ist unterbrochen.' : ''}`, fett: true });
        nach = gegnerWirkungAnwenden(nach, gw, d);
      }
    }
    const r = rundenendeSatz(c, nach);
    if (r) zeilen.push(r);
    return { zeilen, nach };
  }

  /** Bericht als kleine Erzählung (wie beim Schießen): was trifft, was hält, was bleibt. */
  function weiter() {
    let zeilen: Zeile[] = [];
    let nach: Charakter;
    if (art === 'nahkampf') {
      ({ zeilen, nach } = nahkampfBericht());
    } else if (!zone) {
      return;
    } else if (art === 'sonstiges') {
      nach = schadenDirekt(c, zone, direktSchaden, direktArt, d);
      const hpVorher = ausgang(c, { zone, dk: 0, mw: 0, kugeln: 1, krit: false, deckung: null }, d).hp_vorher;
      const hpNachher = hpVorher - direktSchaden;
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
      const r = rundenendeSatz(c, nach);
      if (r) zeilen.push(r);
    } else {
      const e = eingang!;
      const a = gewaehlt!;
      nach = trefferUebernehmen(c, e, { quelle: 'Schuss', schuss: true }, d);
      const mehrere = e.kugeln > 1;
      const was = eingabe === 'kaliber' && kal
        ? `${kal.name}, ${typ}`
        : e.dk === null ? `stumpf, Mannstoppwirkung ${e.mw}` : `Durchschlagskraft ${e.dk}, Mannstoppwirkung ${e.mw}`;
      zeilen.push({ text: `${mehrere ? `${e.kugeln} Kugeln` : 'Ein Schuss'} (${was}) ${mehrere ? 'treffen' : 'trifft'} dich ${ortVon(zone)}.${e.krit ? ' Die SL sagt einen Krit an.' : ''}`, fett: true });
      schadenSaetze(e, a, zeilen);
      if (a.schaden > 0) zeilen.push({ text: `Deine HP sinken von ${a.hp_vorher} auf ${a.hp_nachher}.` });
      if (a.stagger) zeilen.push({ text: STAGGER_SATZ(!!gef), fett: true });
      const r = rundenendeSatz(c, nach);
      if (r) zeilen.push(r);
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
          <button aria-pressed={art === 'nahkampf'} onclick={() => (art = 'nahkampf')}>Nahkampf</button>
          <button aria-pressed={art === 'sonstiges'} onclick={() => (art = 'sonstiges')}>Sonstiges</button>
        </div>
        <p class="hinweis">Splitter und Explosion folgen in einer der nächsten Versionen.</p>

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
          <p class="hinweis">{deckungAufFigur ? `Deckung Schutz ${deckungAufFigur.wert} vor den schraffierten Zonen` : 'Keine Deckung eingetragen'}; ändern über den Knopf Deckung auf der Figur.</p>
        {:else if art === 'nahkampf'}
          <div class="gruppe">
            <span class="gruppe-titel">Waffe des Angreifers angeben als</span>
            <div class="umschalter" role="group" aria-label="Waffe des Angreifers angeben als">
              <button aria-pressed={nkEingabe === 'waffe'} onclick={() => (nkEingabe = 'waffe')}>Waffe</button>
              <button aria-pressed={nkEingabe === 'direkt'} onclick={() => (nkEingabe = 'direkt')}>DK und MW</button>
            </div>
          </div>
          {#if nkEingabe === 'waffe'}
            <label class="feld">Waffe
              <select bind:value={nkWaffe}>
                {#each waffenListe as w (w.id)}<option value={w.id}>{w.name}</option>{/each}
              </select>
            </label>
            <div class="gruppe">
              <span class="gruppe-titel">Nahkampfschaden des Angreifers</span>
              <span class="stepper">
                <button aria-label="eins weniger" disabled={nkSchaden <= 0} onclick={() => (nkSchaden -= 1)}>−</button>
                <strong class="zahl">{nkSchaden}</strong>
                <button aria-label="eins mehr" onclick={() => (nkSchaden += 1)}>+</button>
              </span>
            </div>
            {#if nkWahl}
              <p class="hinweis">{nkWahl.art}, {nkWahl.laenge} · {nkTreffer.dk === null ? 'keine DK' : `DK ${nkTreffer.dk}`} · MW {nkSchaden} + {nkWahl.mw} = {nkTreffer.mw}</p>
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
            <label class="schalter"><input type="checkbox" bind:checked={stumpf} /> stumpf (Knüppel, Kolben, Faust): keine DK</label>
            <p class="hinweis">MW mit dem Nahkampfschaden des Angreifers.</p>
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

      {#if art === 'nahkampf'}
        <section class="abschnitt">
          <h3 class="abschnitt-titel">Wie steht ihr?</h3>
          {#if gef}
            <p>Dein Stand: {standAdjektiv(meinStand, d)}</p>
            <p class="hinweis">Ändern vor der Verteidigung über Break → Standwechsel.</p>
          {:else}
            <div class="gruppe">
              <span class="gruppe-titel">Dein Stand:</span>
              <div class="auswahlreihe gleich" role="group" aria-label="Dein Stand">
                {#each d.regeln.staende as st (st.id)}
                  <button aria-pressed={meinStand === st.id} onclick={() => (standRuhe = st.id)}>{st.adjektiv}</button>
                {/each}
              </div>
            </div>
          {/if}
          <div class="gruppe">
            <span class="gruppe-titel">Stand des Gegners:</span>
            <div class="auswahlreihe gleich" role="group" aria-label="Stand des Gegners">
              {#each d.regeln.staende as st (st.id)}
                <button aria-pressed={gegnerStand === st.id} onclick={() => { gegnerStand = st.id; eigeneWirkung = null; gegnerWirkung = null; }}>{st.adjektiv}</button>
              {/each}
            </div>
          </div>
          {#if ueber === 'a'}
            <p class="ansage">Gegner hat {malstepsText(malstepsDesGegners(nkLage, d))}</p>
            <p class="hinweis">Du hast den überlegenen Stand.</p>
          {:else if ueber === 'b'}
            <p class="hinweis">Der Gegner hat den überlegenen Stand: {malstepsText(d.regeln.nahkampf.ueberlegener_stand_malsteps)} für dich.</p>
          {:else}
            <p class="hinweis">Gleicher Stand: Keiner hat einen Vorteil.</p>
          {/if}
        </section>

        <section class="abschnitt">
          <h3 class="abschnitt-titel">Verteidigung</h3>
          <label class="schalter"><input type="checkbox" bind:checked={wahrgenommen} onchange={() => { if (!wahrgenommen && nkAusgang === 'abgewehrt') nkAusgang = null; }} /> Angreifer wahrgenommen</label>
          {#if wahrgenommen}
            <label class="schalter"><input type="checkbox" bind:checked={langeWaffe} /> du verteidigst mit langer Waffe in Armeslänge</label>
            <p class="hinweis">Kostet keine Aktion{gef?.konzentration ? '; unterbricht deine Aktion mit Konzentration' : ''}.</p>
            <ProbeKern {c} {d} anfrage={{ stat: d.regeln.nahkampf.stat, skill: d.regeln.nahkampf.skill, probe: 'nahkampf', zusatz: verteidigungsSteps(c, nkLage, d) }}
              hinweise={['nahkampf']} {wuerfelModus} mitAusgang bind:ergebnis={probe} {onaendern} />
          {:else}
            <p class="hinweis">Ohne Wahrnehmung keine Verteidigung: Gelingt die Probe des Angreifers, trifft er.</p>
          {/if}
        </section>

        <section class="abschnitt">
          <h3 class="abschnitt-titel">Ausgang (sagt die SL)</h3>
          <div class="auswahlreihe gleich" role="group" aria-label="Ausgang">
            <button aria-pressed={nkAusgang === 'getroffen'} onclick={() => (nkAusgang = 'getroffen')}>getroffen</button>
            {#if wahrgenommen}
              <button aria-pressed={nkAusgang === 'abgewehrt'} onclick={() => (nkAusgang = 'abgewehrt')}>abgewehrt</button>
              <button aria-pressed={nkAusgang === 'unentschieden'} onclick={() => (nkAusgang = 'unentschieden')}>unentschieden</button>
            {:else}
              <button aria-pressed={nkAusgang === 'unentschieden'} onclick={() => (nkAusgang = 'unentschieden')}>daneben</button>
            {/if}
          </div>
          {#if nkAusgang === 'abgewehrt'}
            {#if probe?.stufe === 'krit'}
              <p class="hinweis">Dein Krit: Abstand bestimmen. Du bewegst dich sofort in Armeslänge oder aus dem Band bedrängt, ohne Aktion.</p>
            {/if}
            {#if eigeneWirkungen.length}
              <div class="gruppe">
                <span class="gruppe-titel">Deine Kampfkunst-Wirkung:</span>
                <div class="auswahlreihe" role="group" aria-label="Deine Kampfkunst-Wirkung">
                  <button aria-pressed={eigeneWirkung === null} onclick={() => (eigeneWirkung = null)}>keine</button>
                  {#each eigeneWirkungen as w (w.wirkung.id)}
                    <button aria-pressed={eigeneWirkung === w.wirkung.id} onclick={() => (eigeneWirkung = w.wirkung.id)}>{w.wirkung.name}</button>
                  {/each}
                </div>
              </div>
            {/if}
          {:else if nkAusgang === 'getroffen'}
            <label class="schalter"><input type="checkbox" bind:checked={krit} /> Krit des Angreifers (sagt die SL an)</label>
            {#if gegnerWirkungen.length}
              <div class="gruppe">
                <span class="gruppe-titel">Wirkung des Gegners (sagt die SL an):</span>
                <div class="auswahlreihe" role="group" aria-label="Wirkung des Gegners">
                  <button aria-pressed={gegnerWirkung === null} onclick={() => (gegnerWirkung = null)}>keine</button>
                  {#each gegnerWirkungen as w (w.id)}
                    <button aria-pressed={gegnerWirkung === w.id} onclick={() => (gegnerWirkung = w.id)}>{w.name}</button>
                  {/each}
                </div>
              </div>
              {#if wirkungVon(gegnerWirkung)}<p class="hinweis">{wirkungVon(gegnerWirkung)!.folge_du}</p>{/if}
            {/if}
          {/if}
        </section>
      {/if}

      {#if mitZone}
      <section class="abschnitt">
        <h3 class="abschnitt-titel">Wo trifft es dich?</h3>
        <Silhouette {d} verdeckt={deckungAufFigur?.zonen ?? []} deckungswert={deckungAufFigur?.wert ?? null} {farben} {zeichen} {ruestung} gewaehlt={zone} onwahl={(z) => (zone = z)} beschriftung="Getroffene Zone wählen" />
        {#if mitVorschau}
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
      {/if}
    </div>
  {#snippet knoepfe()}
    <button onclick={onabbrechen}>Abbrechen</button>
    <button class="haupt" disabled={!kannWeiter} onclick={weiter}>Weiter</button>
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
