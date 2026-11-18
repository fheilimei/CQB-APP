<script lang="ts">
  // Wurfaktion (konzept.md § 3.8a; Regelwerk: Kampfsystem, Werfen; Sprengwirkung): Gegenstand · Entfernung und Ansage
  // bzw. Zielpunkt · Lage · Wurfprobe auf Agility · Würfe (W100, W8 für Zone, Beteiligten oder Richtung) · Bericht mit
  // Block „Für die SL“. „Weiter“ verbraucht Main bzw. Break (Quickthrow), zieht den Gegenstand ab, setzt den Auslöser
  // und schreibt ins Gefechtsprotokoll.
  import type { BandId, Spieldaten } from '../../daten/typen';
  import { lageWaehlen, neuesZiel } from '../../regeln/aktionen';
  import { auswerten } from '../../regeln/probe';
  import { gefechtVon, probeStellen, type SlSteps } from '../../regeln/probenrechner';
  import type { Ansage } from '../../regeln/schiessen';
  import { entfernungsgruppe, lageAuswahl } from '../../regeln/schuss';
  import {
    bandSteps, brauchtW8, kochenMoeglich, wurfAblauf, wurfAuswerten, wurfgegenstaende, wurfStellen, wurfUebernehmen,
    type Wurfeinstellung
  } from '../../regeln/werfen';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import type { Wurf } from '../../wuerfel/wuerfel';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import ProbeKern from '../probe/ProbeKern.svelte';
  import Wuerfelbereich, { type Wurfstelle } from '../Wuerfelbereich.svelte';
  import {
    AKTION_NAME, ERGEBNIS_NAME, ERGEBNIS_SATZ, bandName, dkMw, malstepsText, mitZeichen, stepsText, trageortName, wurfZahl, zoneName, type Zeile
  } from '../texte';
  import LageUmstaende from './LageUmstaende.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    als: 'main' | 'break';
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, als, wuerfelModus, onaendern, onfertig, onabbrechen }: Props = $props();

  const g = $derived(gefechtVon(c)!);
  const r = $derived(d.regeln);
  const liste = $derived(wurfgegenstaende(c, d));
  let wahlId = $state('');
  $effect.pre(() => { if (!liste.some((x) => x.id === wahlId)) wahlId = liste[0]?.id ?? ''; });
  const gg = $derived(liste.find((x) => x.id === wahlId) ?? liste[0]!);

  let ansage = $state<Ansage>('keine');
  let ansageZone = $state<string | null>(null);
  let kochen = $state(false);
  let sl = $state<SlSteps>({ malsteps: 0, stepshields: 0, grund: '' });
  let ausgeschaltet = $state<string[]>([]);
  let wurf = $state<number | null>(null);
  let w8 = $state<number | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const s = $derived<Wurfeinstellung>({ ansage: gg.art === 'sprengwaffe' ? 'keine' : ansage, ansage_zone: ansageZone, kochen: kochen && kochenMoeglich(gg) });
  const v = $derived(wurfStellen(c, d, gg, s));
  $effect.pre(() => { if (!v.ansage_moeglich && ansage !== 'keine') ansage = 'keine'; });
  const auswahl = $derived(lageAuswahl(g, d));
  const eg = $derived(entfernungsgruppe(d));
  const zonen = $derived(d.koerperzonen.eintraege.filter((z) => z.w8 !== null));
  const p = $derived(probeStellen(c, d, { ...v.anfrage, braucht_sicht: true, sl, ausgeschaltet }).wert);
  const stufe = $derived(wurf !== null && p ? (p.moeglich ? auswerten(wurf, p) : 'misserfolg') : null);
  const w8Noetig = $derived(brauchtW8(v, s, stufe));
  const w8Moeglich = $derived(gg.art === 'sprengwaffe' || s.ansage === 'keine' || v.nahkampf);
  const fertig = $derived(wurf !== null && (!w8Noetig || w8 !== null));
  const granate = $derived(gg.art === 'sprengwaffe' ? gg.spreng : null);
  const wuerfe = $derived<Wurfstelle[]>([
    { id: 'wurf', art: 'W100', titel: 'Wurfprobe (W100)' },
    ...(w8Moeglich ? [{ id: 'w8', art: 'W8' as const, sichtbar: w8Noetig,
      titel: granate ? 'Richtung (W8)' : stufe === 'misserfolg' ? 'Zone beim Beteiligten (W8)' : 'Trefferzone (W8)' }] : [])
  ]);
  const trageort = $derived(
    gg.art === 'wurfwaffe' ? c.ausruestung.nahkampfwaffen.find((x) => x.id === gg.eintrag)?.trageort
      : gg.art === 'sprengwaffe' ? c.ausruestung.vorrat.find((x) => x.id === gg.eintrag)?.trageort : undefined
  );

  function gegenstandWahl(id: string) { wahlId = id; kochen = false; w8 = null; }
  function bandWahl(gruppe: string, id: string) { onaendern(lageWaehlen(c, gruppe, id)); }
  function gewuerfelt(id: string, x: Wurf) { if (id === 'wurf') wurf = x.ergebnis; else w8 = x.ergebnis; }
  const ortVon = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.ort ?? `an der Zone ${zoneName(id, d)}`;
  const steps = (band: BandId) => bandSteps(gg, band, v.wurfweite, d);
  const summe = (q: { malsteps?: number }[]) => q.reduce((n, x) => n + (x.malsteps ?? 0), 0);

  function zuenderText(): string {
    if (!granate) return '';
    const z = granate.zuender === 'zeit' ? 'Zeitzünder' : granate.zuender === 'aufschlag' ? 'Aufschlagzünder' : granate.zuender === 'kontakt' ? 'Kontaktzünder' : 'ohne Zünder';
    const vz = typeof granate.verzoegerung === 'number' ? `, Verzögerung ${granate.verzoegerung}` : '';
    return `${z}${vz}`;
  }
  function splitterText(): string {
    if (!granate?.bereiche) return '';
    return r.schiessen.reichweitenbaender.filter((b) => granate.bereiche![b.id] != null)
      .map((b) => `${b.name} ${granate.bereiche![b.id]}${granate.kern?.includes(b.id) ? ' (Kern)' : ''}`).join(', ');
  }

  function weiter() {
    if (wurf === null || !stufe) return;
    const b = wurfAuswerten(c, d, v, s, stufe, w8Noetig ? w8 : null);
    const zeilen: Zeile[] = [];
    const sl2: string[] = [];
    const band = v.band ? bandName(v.band, d) : '';
    if (granate) {
      zeilen.push({ text: `Du wirfst ${granate.name} auf einen Zielpunkt (${band})${s.kochen ? ' und lässt sie vorher kochen' : ''}.`, fett: true });
    } else {
      zeilen.push({ text: `Du wirfst ${gg.art === 'wurfwaffe' ? gg.name : 'einen Gegenstand'} auf ein Ziel (${band}).`, fett: true });
      if (s.ansage !== 'keine') zeilen.push({ text: `Du sagst ${s.ansage === 'rumpf' ? 'den Rumpf' : zoneName(s.ansage_zone ?? '', d)} an.` });
    }
    const pr = mitZeichen('skill', v.anfrage.skill ?? '', d);
    zeilen.push({ text: `Deine Wurfprobe mit ${pr} ist ${ERGEBNIS_SATZ[stufe]} (Wurf ${wurfZahl(wurf)}, Zielwert ${p?.zielwert ?? '–'}, Krit ≤ ${p?.krit_schwelle ?? '–'}).` });
    if (granate && b.landepunkt) {
      zeilen.push({ text: `Sie landet ${b.landepunkt.text}${b.landepunkt.richtung ? ` (W8 ${w8}: ${b.landepunkt.richtung})` : ''}.`, fett: true });
      if (b.verzoegerung === 0) zeilen.push({ text: 'Sie detoniert, sobald sie landet.' });
      else if (b.verzoegerung !== null) zeilen.push({ text: `Sie detoniert zu Beginn deines Zuges in ${b.verzoegerung} ${b.verzoegerung === 1 ? 'Runde' : 'Runden'}.` });
      else zeilen.push({ text: 'Sie detoniert beim Aufschlag.' });
      sl2.push(`${granate.name}: ${b.landepunkt.text}${b.landepunkt.richtung ? `, ${b.landepunkt.richtung}` : ''}`);
      sl2.push(b.verzoegerung === null ? 'detoniert beim Aufschlag' : b.verzoegerung === 0 ? 'detoniert beim Landen' : `Verzögerung ${b.verzoegerung}`);
      if (splitterText()) sl2.push(`Splitter ${dkMw(granate.splitter?.dk ?? 0, granate.splitter?.mw ?? 0)}, je Band: ${splitterText()}`);
      if (granate.druckwelle?.mw) sl2.push(`Druckwelle MW ${granate.druckwelle.mw} im Kern`);
      if (granate.sonderwirkung) sl2.push(granate.sonderwirkung.text);
    } else if (!b.zone) {
      zeilen.push({ text: 'Der Wurf geht daneben. Wo der Gegenstand landet, legt die SL fest.', fett: true });
      sl2.push('kein Treffer');
    } else {
      if (b.beteiligter) zeilen.push({ text: `Fehlwurf in den Nahkampf: Er trifft einen anderen Beteiligten ${ortVon(b.zone)}, auch einen Verbündeten (nie kritisch).`, fett: true });
      else zeilen.push({ text: `Du triffst ${ortVon(b.zone)}.`, fett: true });
      if (b.krit && b.treffer) zeilen.push({ text: `Dein Krit: ${b.treffer.krit_folge}${/[.!]$/.test(b.treffer.krit_folge) ? '' : '.'}`, fett: true });
      sl2.push(`${zoneName(b.zone, d)}${b.beteiligter ? ' beim Beteiligten' : ''}`);
      if (b.treffer && gg.art === 'wurfwaffe') {
        sl2.push(b.treffer.dk === null ? 'stumpf' : `DK ${b.treffer.dk}`);
        sl2.push(`MW ${b.treffer.mw} (Nahkampfschaden ${b.treffer.nahkampfschaden} + Waffe ${gg.waffe.mw})`);
      } else sl2.push('Schaden legt die SL fest');
      if (b.krit && b.treffer) sl2.push(`Krit: ${b.treffer.krit_folge.replace(/\.$/, '')}`);
    }
    if (gg.art !== 'sonstiges') {
      const rest = gg.anzahl - 1;
      zeilen.push({ text: `${gg.name}: ${gg.anzahl} → ${rest}${rest === 0 ? '. Du hast keine mehr dabei.' : '.'}` });
    }
    zeilen.push({ text: 'Für das Rundenende: Du hast selbst angegriffen (zählt wie ein eigener Schuss).' });
    zeilen.push({ text: `${AKTION_NAME[als]} −1.` });
    zeilen.push({ text: `Für die SL: ${sl2.join(' · ')}`, fett: true });
    const text = `Wurfaktion (${AKTION_NAME[als]}): ${gg.name}, ${ERGEBNIS_NAME[stufe]}${b.zone ? `, ${zoneName(b.zone, d)}${b.krit ? ' Krit' : ''}` : ''}${b.landepunkt ? `, ${b.landepunkt.text.split(';')[0]}` : ''}`;
    bericht = { zeilen, nach: wurfUebernehmen(c, d, gg, als, text) };
  }
</script>

{#if bericht}
  <Bericht titel="Wurfaktion" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Wurfaktion">
    <div class="abschnitte">
      <section class="abschnitt">
        <h3 class="abschnitt-titel">Was wirfst du?</h3>
        <label class="feld">Gegenstand
          <select value={gg.id} onchange={(ev) => gegenstandWahl((ev.target as HTMLSelectElement).value)}>
            {#each liste as x (x.id)}<option value={x.id}>{x.name}{x.art !== 'sonstiges' && x.anzahl > 1 ? ` (${x.anzahl})` : ''}</option>{/each}
          </select>
        </label>
        {#if gg.art === 'wurfwaffe'}
          <p class="hinweis">{gg.waffe.art} · {gg.waffe.dk === null ? 'keine DK' : `DK ${gg.waffe.dk}`} · MW Nahkampfschaden + {gg.waffe.mw}</p>
        {:else if granate}
          <p class="hinweis">{zuenderText()}{splitterText() ? ` · Splitter je Band: ${splitterText()}` : ''}</p>
          {#if granate.sonderwirkung}<p class="hinweis">{granate.besonderheiten}</p>{/if}
        {:else}
          <p class="hinweis">Ein Gegenstand ohne Werte; was er anrichtet, legt die SL fest.</p>
        {/if}
        {#if trageort}<p class="hinweis">Getragen: {trageortName(trageort, d)}. Bereit machen kostet je nach Trageort; das trägst du vorher selbst ein.</p>{/if}
        {#if kochenMoeglich(gg)}
          <label class="schalter"><input type="checkbox" bind:checked={kochen} /> Kochen lassen</label>
          <p class="hinweis">{malstepsText(r.werfen.kochen_malsteps)} auf den Wurf, die Verzögerung sinkt um 1.</p>
        {/if}
      </section>

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Wohin wirfst du? <button class="flach link klein-link" onclick={() => onaendern(neuesZiel(c, d))}>Neues Ziel</button></h3>
        {#if eg}
          <div class="gruppe" role="group" aria-label="Entfernung zum Ziel">
            <span class="gruppe-titel">Entfernung zum Ziel:</span>
            <div class="auswahlreihe">
              {#each r.schiessen.reichweitenbaender as b (b.id)}
                {@const st = steps(b.id)}
                <button aria-pressed={auswahl[eg] === b.id} disabled={st === null}
                  onclick={() => bandWahl(eg, b.id)}>{b.name}<small>{st === null ? 'n/A' : summe(st) ? stepsText({ malsteps: summe(st) }) : '±0'}</small></button>
              {/each}
            </div>
            <p class="hinweis">Genau wirfst du bis {bandName(v.wurfweite, d)}; ein Band weiter {malstepsText(r.werfen.ueber_wurfweite_malsteps)}{gg.art === 'wurfwaffe' ? ', dazu die Wurf-Reichweite der Waffe' : ''}.</p>
            {#if v.sperre === 'entfernung'}<p class="fehler">Wähle die Entfernung zum Ziel.</p>
            {:else if v.sperre === 'band'}<p class="fehler">So weit kannst du {gg.art === 'wurfwaffe' ? 'diese Waffe' : ''} nicht werfen.</p>{/if}
          </div>
        {/if}
        {#if granate}
          <p class="hinweis">Sag der SL den Zielpunkt an. Zielst du auf eine Person, ist ihr Standort der Zielpunkt.</p>
        {:else}
          <div class="gruppe" role="group" aria-label="Ansage">
            <span class="gruppe-titel">Ansage:</span>
            <div class="auswahlreihe">
              {#each [['keine', 'keine (W8)'], ['rumpf', 'Rumpf'], ['zone', 'Zone']] as [id, text] (id)}
                <button aria-pressed={ansage === id} disabled={id !== 'keine' && !v.ansage_moeglich} onclick={() => (ansage = id as Ansage)}>{text}</button>
              {/each}
            </div>
            {#if !v.ansage_moeglich}<p class="hinweis">Keine Ansage möglich (Adrenalin oder keine Sicht).</p>{/if}
          </div>
          {#if ansage === 'zone'}
            <div class="gruppe" role="group" aria-label="Angesagte Zone">
              <span class="gruppe-titel">Angesagte Zone:</span>
              <div class="auswahlreihe">
                {#each zonen as z (z.id)}<button aria-pressed={ansageZone === z.id} onclick={() => (ansageZone = z.id)}>{z.name}</button>{/each}
              </div>
              {#if !ansageZone}<p class="fehler">Wähle die angesagte Zone.</p>{/if}
            </div>
          {/if}
        {/if}
      </section>

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Ziel und Werfer</h3>
        <LageUmstaende {c} {d} ablauf={wurfAblauf(gg)} band={v.band} {onaendern} />
      </section>

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Wurfprobe</h3>
        <ProbeKern {c} {d} anfrage={v.anfrage} hinweise={['werfen']} {wuerfelModus} sichtVorgewaehlt ohneWurf bind:sl bind:ausgeschaltet {onaendern} />
      </section>

      <Wuerfelbereich modus={wuerfelModus} {wuerfe} onwurf={gewuerfelt}
        gesperrt={v.sperre === 'entfernung' ? 'Erst oben die Entfernung wählen, dann würfeln.'
          : v.sperre === 'band' ? 'Erst oben eine erreichbare Entfernung wählen, dann würfeln.'
          : s.ansage === 'zone' && !ansageZone ? 'Erst oben die angesagte Zone wählen, dann würfeln.' : null}>
        {#if stufe}
          <div class="wuerfel-ergebnis" aria-live="polite"><p class="ansage {stufe}">{ERGEBNIS_NAME[stufe]} · {wurfZahl(wurf!)}</p></div>
        {/if}
      </Wuerfelbereich>
    </div>

    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!fertig || !!v.sperre || (s.ansage === 'zone' && !ansageZone)} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}

<style>
  select { width: 100%; }
</style>
