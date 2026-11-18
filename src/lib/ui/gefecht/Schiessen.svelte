<script lang="ts">
  // Schießen (konzept.md § 3.8, § 3.8c; Regelwerk: Kampfsystem, Treffen): Feuermodus und Schüsse, Ansage, Lage
  // (Entfernung, Ziel, Schütze), Aufsätze im Einsatz, Trefferwert mit Herkunft der Steps, Haltezahl, Ladehemmung,
  // Würfe, Bericht mit Block „Für die SL“. „Weiter“ übernimmt: Magazin, Break −1, Auslöser, Protokoll.
  import type { BandId, Spieldaten } from '../../daten/typen';
  import { lageWaehlen, neuesZiel } from '../../regeln/aktionen';
  import { auswerten } from '../../regeln/probe';
  import { gefechtVon, type SlSteps } from '../../regeln/probenrechner';
  import { reichweitenSteps, type Ansage } from '../../regeln/schiessen';
  import {
    entfernungsgruppe, feuermodus, lageAuswahl, magazinText, schussAuswerten, schussStellen, schussUebernehmen, type Modus,
    type Schusseinstellung
  } from '../../regeln/schuss';
  import { aktiverEintrag, aufsaetzeVon, kaliberName, munitionswerte, sprengwaffe } from '../../regeln/waffen';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import { modusFuer } from '../../wuerfel/wuerfel';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import ProbeKern from '../probe/ProbeKern.svelte';
  import Wuerfelbereich, { type Wurfstelle } from '../Wuerfelbereich.svelte';
  import type { Wurf } from '../../wuerfel/wuerfel';
  import { ERGEBNIS_NAME, bandName, dkMw, kugelnText, stepsText, wurfZahl, zoneName, type Zeile } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    einstellungen: Record<string, Quelle>;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, einstellungen, onaendern, onfertig, onabbrechen }: Props = $props();

  const e = $derived(aktiverEintrag(c)!);
  const g = $derived(gefechtVon(c)!);
  let modus = $state<Modus>('EF');
  let anzahl = $state(1);
  let ansage = $state<Ansage>('keine');
  let ansageZone = $state<string | null>(null);
  let schalter = $state<string[]>([]);
  let sl = $state<SlSteps>({ malsteps: 0, stepshields: 0, grund: '' });
  let ausgeschaltet = $state<string[]>([]);
  let wurf = $state<number | null>(null);
  let w8 = $state<number | null>(null);
  let rueckstoss = $state<number | null>(null);
  let haltezahlAuf = $state(false);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const s = $derived<Schusseinstellung>({ modus, anzahl, ansage, ansage_zone: ansageZone, schalter, ausgeschaltet, sl });
  const v = $derived(schussStellen(c, d, e, s));
  const auswahl = $derived(lageAuswahl(g, d));
  const eg = $derived(entfernungsgruppe(d));
  const modi = $derived(Object.keys(v.waffe.feuermodi) as Modus[]);
  /** Tatsächlicher Feuermodus (fehlt der gewählte an der Waffe, der erste vorhandene). */
  const aktModus = $derived(feuermodus(v.waffe, modus).modus);
  const schalterAufsaetze = $derived(aufsaetzeVon(e, d).filter((a) => a.einsatz === 'schalter'));
  const mun = $derived(munitionswerte(e, d));
  const zonen = $derived(d.koerperzonen.eintraege.filter((z) => z.w8 !== null));
  const p = $derived(v.probe.wert);
  const stufe = $derived(wurf !== null && p ? (p.moeglich ? auswerten(wurf, p) : 'misserfolg') : null);
  const lhAb = $derived(v.lh_rate > 0 ? 101 - v.lh_rate : null);
  const lhJetzt = $derived(wurf !== null && lhAb !== null && wurf >= lhAb);
  // W8: Zone ohne Ansage; beim Fehlschuss in den Nahkampf und beim Werfer-Misserfolg erst nach dem Wurf.
  const brauchtW8 = $derived(!lhJetzt && (v.werfer ? stufe === 'misserfolg' : ansage === 'keine' || (v.nahkampf && stufe === 'misserfolg')));
  const brauchtRueckstoss = $derived(!lhJetzt && !v.werfer && v.schuesse > 1);
  const fertig = $derived(wurf !== null && (!brauchtW8 || w8 !== null) && (!brauchtRueckstoss || rueckstoss !== null));
  /** Alle Würfe, die gebraucht werden könnten; sichtbar nur die, die nach dem Stand nötig sind. „App würfelt“ würfelt alle. */
  const w8Moeglich = $derived(v.werfer || ansage === 'keine' || v.nahkampf);
  const wuerfe = $derived<Wurfstelle[]>([
    { id: 'treffer', art: 'W100', titel: 'Trefferwurf (W100)' },
    ...(w8Moeglich ? [{ id: 'w8', art: 'W8' as const, sichtbar: brauchtW8,
      titel: v.werfer ? 'Richtung (W8)' : stufe === 'misserfolg' ? 'Zone beim Beteiligten (W8)' : 'Trefferzone (W8)' }] : []),
    ...(!v.werfer ? [{ id: 'rueckstoss', art: 'W10' as const, titel: 'Rückstoßwürfel (W10)', sichtbar: brauchtRueckstoss }] : [])
  ]);
  const gruppen = $derived(d.regeln.lage.gruppen);
  const ablauf = $derived(v.werfer ? 'werfer' : 'schiessen');

  function umstandWahl(gruppe: string, id: string, art: 'eins' | 'schalter') {
    if (art === 'eins') onaendern(lageWaehlen(c, gruppe, id));
    else {
      const liste = (auswahl[gruppe] as string[]) ?? [];
      onaendern(lageWaehlen(c, gruppe, liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]));
    }
  }
  function schalterUm(id: string) {
    schalter = schalter.includes(id) ? schalter.filter((x) => x !== id) : [...schalter, id];
  }
  function gewuerfelt(id: string, x: Wurf) {
    if (id === 'treffer') wurf = x.ergebnis;
    else if (id === 'w8') w8 = x.ergebnis;
    else rueckstoss = x.ergebnis;
  }
  function modusWahl(m: Modus) {
    modus = m;
    anzahl = 1;
  }

  function weiter() {
    if (wurf === null) return;
    const b = schussAuswerten(c, d, v, s, { wurf, w8: brauchtW8 ? w8 : null, rueckstoss: brauchtRueckstoss ? rueckstoss : null });
    const zeilen: Zeile[] = [];
    const name = v.waffe.name;
    const sl2: string[] = [];
    if (b.ladehemmung !== 'keine') {
      zeilen.push({ text: `${b.ladehemmung === 'schwer' ? 'Schwere Ladehemmung' : 'Ladehemmung'}! Wurf ${wurfZahl(wurf)}: Kein Schuss geht ab.`, fett: true });
      zeilen.push({ text: b.ladehemmung === 'schwer' ? 'Die Waffe ist blockiert und im Gefecht nicht zu beheben.' : 'Die Waffe ist blockiert, bis du die Ladehemmung behebst (Main).' });
      zeilen.push({ text: `Das Magazin bleibt bei ${b.magazin_vorher}.` });
      sl2.push('Ladehemmung, kein Schuss');
    } else {
      const schussText = v.werfer ? 'Du feuerst' : `Du gibst ${v.schuesse} ${v.schuesse === 1 ? 'Schuss' : 'Schüsse'} ab (${aktModus})`;
      zeilen.push({ text: `${schussText} mit ${name}.` });
      zeilen.push({ text: `Trefferwurf ${wurfZahl(wurf)} gegen Zielwert ${p?.zielwert ?? '–'} (Krit ≤ ${p?.krit_schwelle ?? '–'}): ${ERGEBNIS_NAME[b.stufe!]}.`, fett: true });
      if (b.landepunkt) {
        const lp = d.regeln.sprengwirkung.landepunkt[b.landepunkt.stufe];
        zeilen.push({ text: `Landepunkt: ${lp}${b.landepunkt.richtung ? ` (W8 ${w8}: ${b.landepunkt.richtung})` : ''}.`, fett: true });
        sl2.push(`${sprengwaffe(e.munitionstyp, d)?.name ?? e.munitionstyp}: ${lp}${b.landepunkt.richtung ? `, ${b.landepunkt.richtung}` : ''}`);
      } else if (b.stufe === 'misserfolg' && !b.fehlschuss_beteiligter) {
        zeilen.push({ text: 'Alle Schüsse gehen ins Leere.' });
        sl2.push('kein Treffer');
      } else {
        if (b.fehlschuss_beteiligter) zeilen.push({ text: 'Fehlschuss in den Nahkampf: Er trifft einen zufälligen anderen Beteiligten, auch einen Verbündeten (nie kritisch).', fett: true });
        if (v.haltezahl && rueckstoss !== null) zeilen.push({ text: `Haltezahl ${v.haltezahl.wert} − Rückstoßwürfel ${rueckstoss} = ${b.folgetreffer} ${b.folgetreffer === 1 ? 'Folgetreffer' : 'Folgetreffer'}.` });
        for (const t of b.treffer) {
          const text = `${zoneName(t.zone, d)}: ${kugelnText(t.kugeln)}${t.krit ? ', Krit' : ''}${t.folgetreffer ? ' (Folgetreffer)' : ''}`;
          zeilen.push({ text, fett: t.krit });
          sl2.push(`${zoneName(t.zone, d)} ${kugelnText(t.kugeln)}${t.krit ? ' Krit' : ''}`);
        }
      }
      zeilen.push({ text: `Magazin ${b.magazin_vorher} → ${b.magazin_nachher}.` });
      if (g.zielen) zeilen.push({ text: g.zielen.runde === g.runde ? 'Dein Zielen ist verbraucht.' : 'Du hast geschossen: Dein Zielen für die nächste Runde verfällt.' });
      zeilen.push({ text: 'Auslöser für das Rundenende: selbst auf jemanden geschossen.' });
    }
    zeilen.push({ text: 'Break −1.' });
    if (!v.werfer && mun && b.ladehemmung === 'keine') sl2.push(`${kaliberName(v.waffe, d)} ${e.munitionstyp}: ${dkMw(mun.dk, mun.mw, mun.stumpf)}${v.kugeln > 1 ? ' je Kugel' : ''}`);
    zeilen.push({ text: `Für die SL: ${sl2.join(' · ')}`, fett: true });
    const nach = schussUebernehmen(c, d, e, b, zeilen.map((z) => z.text));
    bericht = { zeilen, nach };
  }

  const bandSteps = (band: BandId) => reichweitenSteps(v.waffe, band, d.regeln);
</script>

{#if bericht}
  <Bericht titel="Schießen" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Schießen">
    <div class="abschnitte">
    <p class="waffe"><strong>{v.waffe.name}</strong>
      <span class="hinweis">{#if v.werfer}{e.munitionstyp ? (sprengwaffe(e.munitionstyp, d)?.name ?? e.munitionstyp) : 'nicht geladen'}{:else}{e.munitionstyp}{#if mun} · {dkMw(mun.dk, mun.mw, mun.stumpf)}{/if} · {magazinText(e, d)}{/if}</span></p>

    {#if v.sperre === 'leer' || v.sperre === 'ladehemmung'}
      <p class="fehler">{v.sperre === 'leer' ? 'Die Waffe ist leer. Lade nach (Main → Nachladen).' : 'Die Waffe hat eine Ladehemmung (Main → Ladehemmung beheben).'}</p>
    {:else}
      {#if !v.werfer}
        <section class="abschnitt">
          <h3 class="abschnitt-titel">Feuer</h3>
          {#if modi.length > 1}
            <div class="gruppe" role="group" aria-label="Feuermodus">
              <span class="gruppe-titel">Feuermodus:</span>
              <div class="auswahlreihe">
                {#each modi as m (m)}<button aria-pressed={aktModus === m} onclick={() => modusWahl(m)}>{m}</button>{/each}
              </div>
            </div>
          {/if}
          <div class="gruppe">
            <div class="zaehler">
              <span class="gruppe-titel">{aktModus === 'Burst' ? `Bursts (je ${v.modus.burst_laenge}):` : 'Schüsse:'}</span>
              <span class="stepper">
                <button aria-label="weniger" disabled={anzahl <= 1} onclick={() => (anzahl = Math.max(1, anzahl - 1))}>−</button>
                <strong>{anzahl}</strong>
                <button aria-label="mehr" disabled={anzahl >= v.anzahl_max} onclick={() => (anzahl = Math.min(v.anzahl_max, anzahl + 1))}>+</button>
              </span>
            </div>
            <p class="hinweis">{v.schuesse} {v.schuesse === 1 ? 'Schuss' : 'Schüsse'} (höchstens Feuerrate {v.modus.feuerrate}, im Magazin {e.im_magazin}).</p>
          </div>

          <div class="gruppe" role="group" aria-label="Ansage">
            <span class="gruppe-titel">Ansage:</span>
            <div class="auswahlreihe">
              {#each [['keine', 'keine (W8)'], ['rumpf', 'Rumpf'], ['zone', 'Zone']] as [id, text] (id)}
                <button aria-pressed={ansage === id} disabled={id !== 'keine' && !v.ansage_moeglich}
                  onclick={() => (ansage = id as Ansage)}>{text}</button>
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
        </section>
      {/if}

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Ziel und Schütze <button class="flach link klein-link" onclick={() => onaendern(neuesZiel(c, d))}>Neues Ziel</button></h3>
        {#each gruppen as gr (gr.id)}
          {#if gr.quelle === 'reichweite'}
            <div class="gruppe" role="group" aria-label={gr.name}>
              <span class="gruppe-titel">{gr.name}:</span>
              <div class="auswahlreihe">
                {#each d.regeln.schiessen.reichweitenbaender as b (b.id)}
                  {@const st = bandSteps(b.id)}
                  <button aria-pressed={auswahl[gr.id] === b.id} disabled={st === null}
                    onclick={() => umstandWahl(gr.id, b.id, 'eins')}>{b.name}<small>{st === null ? 'n/A' : st.length ? stepsText(st[0]!) : '±0'}</small></button>
                {/each}
              </div>
              {#if v.sperre === 'entfernung'}<p class="fehler">Wähle die Entfernung zum Ziel.</p>
              {:else if v.sperre === 'band'}<p class="fehler">Die Waffe reicht nicht bis {bandName(v.band!, d)}.</p>{/if}
            </div>
          {:else}
            {@const umst = d.regeln.lage.umstaende.filter((u) => u.gruppe === gr.id && !u.nicht_fuer?.includes(ablauf))}
            {#if umst.length}
              <div class="gruppe" role="group" aria-label={gr.name}>
                <span class="gruppe-titel">{gr.name}:</span>
                <div class="auswahlreihe">
                  {#each umst as u (u.id)}
                    {@const an = gr.auswahl === 'eins' ? auswahl[gr.id] === u.id : ((auswahl[gr.id] as string[]) ?? []).includes(u.id)}
                    {@const gesperrt = !!u.nur_ohne_eigene_bewegung && (!!g.bewegt || g.gehechtet)}
                    {@const wirktNicht = !!v.band && !!u.nicht_in_baendern?.includes(v.band)}
                    <button class:wirkungslos={wirktNicht} aria-pressed={an} disabled={gesperrt} onclick={() => umstandWahl(gr.id, u.id, gr.auswahl)}>
                      {u.name}<small>{stepsText(u) || '±0'}</small></button>
                  {/each}
                </div>
                {#each umst as u (u.id)}
                  {@const an = gr.auswahl === 'eins' ? auswahl[gr.id] === u.id : ((auswahl[gr.id] as string[]) ?? []).includes(u.id)}
                  {#if an && u.hinweis}<p class="hinweis">{u.name}: {u.hinweis}.</p>{/if}
                  {#if an && v.band && u.nicht_in_baendern?.includes(v.band)}<p class="hinweis">{u.name}: wirkt nicht im Band {bandName(v.band, d)}.</p>{/if}
                  {#if u.nur_ohne_eigene_bewegung && (g.bewegt || g.gehechtet)}<p class="hinweis">{u.name}: gesperrt, du hast dich in dieser Runde bewegt.</p>{/if}
                {/each}
              </div>
            {/if}
          {/if}
        {/each}
      </section>

      {#if schalterAufsaetze.length}
        <section class="abschnitt">
          <h3 class="abschnitt-titel">Aufsätze im Einsatz</h3>
          <div class="gruppe">
            {#each schalterAufsaetze as a (a.id)}
              <label class="schalter"><input type="checkbox" checked={schalter.includes(a.id)} onchange={() => schalterUm(a.id)} /> {a.schalter_text ?? a.name}</label>
              {#if schalter.includes(a.id) && a.hinweis}<p class="hinweis">{a.hinweis}</p>{/if}
            {/each}
          </div>
        </section>
      {/if}

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Trefferwert</h3>
        <ProbeKern {c} {d} anfrage={v.anfrage} hinweise={['schiessen']} wuerfelModus={modusFuer('probe', einstellungen)} sichtVorgewaehlt ohneWurf
          bind:sl bind:ausgeschaltet {onaendern} />

        {#if v.haltezahl}
          <div class="gruppe">
            <button class="flach zeile-knopf" aria-expanded={haltezahlAuf} onclick={() => (haltezahlAuf = !haltezahlAuf)}>
              <span>Haltezahl (Rückstoß {v.modus.rueckstoss})</span><strong>{v.haltezahl.wert}</strong><span class="klapppfeil" aria-hidden="true">›</span></button>
            {#if haltezahlAuf}
              <ul class="haltezahl">
                {#each v.haltezahl.quellen as q, i (i)}<li>{q.name} <strong>{stepsText(q)}</strong></li>{/each}
                {#if !v.haltezahl.quellen.length}<li class="hinweis">nur Rückstoß und Skill Rückstoßkontrolle</li>{/if}
              </ul>
            {/if}
            <p class="hinweis">Folgetreffer = Haltezahl − Rückstoßwürfel{v.garbenfaktor > 1 ? `, je ${v.garbenfaktor} Kugeln (Garbenfaktor)` : ''}; zusammen höchstens {v.schuesse - 1} {v.schuesse - 1 === 1 ? 'Kugel' : 'Kugeln'}.</p>
          </div>
        {/if}
        {#if v.kugeln > 1}<p class="hinweis">Schrot: {kugelnText(v.kugeln)} je Treffer im Band {bandName(v.band!, d)}, Zonen fortlaufend nach unten.</p>{/if}
        <p class="hinweis">{lhAb === null ? 'Keine Ladehemmung möglich (Rate 0 %).' : `Ladehemmung bei Wurf ${lhAb === 100 ? '100' : `${lhAb}–100`} (Rate ${v.lh_rate} %); 100 = schwer.`}</p>
      </section>

      <Wuerfelbereich modus={modusFuer('probe', einstellungen)} wuerfe={wuerfe} onwurf={gewuerfelt}
        gesperrt={v.sperre === 'entfernung' ? 'Erst oben die Entfernung wählen, dann würfeln.'
          : v.sperre === 'band' ? 'Erst oben eine erreichbare Entfernung wählen, dann würfeln.'
          : ansage === 'zone' && !ansageZone ? 'Erst oben die angesagte Zone wählen, dann würfeln.' : null}>
        {#if lhJetzt || stufe}
          <div class="wuerfel-ergebnis" aria-live="polite">
            {#if lhJetzt}<p class="ansage fehler">Ladehemmung!</p>{:else if stufe}<p class="ansage {stufe}">{ERGEBNIS_NAME[stufe]} · {wurfZahl(wurf!)}</p>{/if}
          </div>
        {/if}
      </Wuerfelbereich>
    {/if}
    </div>

    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!fertig || !!v.sperre || (ansage === 'zone' && !ansageZone)} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}

<style>
  .waffe { display: flex; flex-direction: column; gap: var(--abstand-1); margin: 0; }
  .klein-link { font-size: 0.9rem; font-weight: 400; color: var(--akzent); }
  .zaehler { display: flex; justify-content: space-between; align-items: center; }
  .zeile-knopf { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 var(--abstand-3);
    background: var(--flaeche-2); border-radius: var(--radius); }
  .haltezahl { margin: 0; padding-left: var(--abstand-4); }
</style>
