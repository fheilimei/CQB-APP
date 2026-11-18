<script lang="ts" module>
  /** Abläufe mit eigenem Bildschirm, die das Menü öffnet. */
  export type Ablauf =
    | { art: 'probe_main' }
    | { art: 'schiessen' }
    | { art: 'nachladen'; als: 'main' | 'break' }
    | { art: 'ladehemmung' }
    | { art: 'wechseln' }
    | { art: 'senken' }
    | { art: 'verschieben' }
    | { art: 'versorgen' };
</script>

<script lang="ts">
  // Menüs der Aktionsleiste (konzept.md § 3.7a, § 3.7b). Optionen ohne Rechnung zeigen den Regeltext und „Ausführen“
  // (verbraucht den Zähler); Optionen mit Rechnung führen in ihren Ablauf. Break hat zwei Schritte: erst eigener oder
  // fremder Zug (dort Probe Reaktion oder Antizipation), dann mit „Weiter“ die Wahl der Aktion.
  import type { Spieldaten } from '../../daten/typen';
  import {
    bewegen, bewegungsarten, breakZusatz, eigenerStand, hechten, hechtenSperre, konzentrationMoeglich, konzentrationSetzen,
    perkWirkungen, protokolliere, standWechseln, verbrauchen, verfuegbar, zielen, zielenAlsMain, zielwirkung
  } from '../../regeln/aktionen';
  import { hatWirkung } from '../../regeln/leiter';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { aktiverEintrag, eintragErsetzen, istWerfer, kapazitaet, nachladearten, nachladenAlsBreak, passendeAufsaetze, waffeVon } from '../../regeln/waffen';
  import type { Aktion, Charakter, Quelle } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';
  import { AKTION_NAME, bewegungName, standAdjektiv } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    aktion: Aktion;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    /** Änderung übernehmen und Menü schließen. */
    onfertig: (c: Charakter) => void;
    onablauf: (a: Ablauf) => void;
    onschliessen: () => void;
  }
  let { c, d, aktion, wuerfelModus, onaendern, onfertig, onablauf, onschliessen }: Props = $props();

  type Ansicht =
    | { art: 'liste' }
    | { art: 'text'; titel: string; text: string; als: Aktion; konzentration?: boolean; freitext?: boolean }
    | { art: 'hechten'; als: 'main' | 'break' }
    | { art: 'zielen'; als: 'main' | 'break' }
    | { art: 'stand' }
    | { art: 'aufsatz' };
  let ansicht = $state<Ansicht>({ art: 'liste' });
  let freitext = $state('');
  let konz = $state<'keine' | 'leicht' | 'voll'>('keine');
  let wahl = $state<string | null>(null);
  let liegendAufgelegt = $state(false);
  let breakZug = $state<'eigener' | 'fremder' | null>(null);
  let breakProbe = $state<'ohne' | 'reaktion' | 'antizipation' | null>(null);
  let breakSchritt = $state<'zug' | 'aktion'>('zug');
  let breakErgebnis = $state<ProbenErgebnis | null>(null);

  const g = $derived(gefechtVon(c)!);
  const e = $derived(aktiverEintrag(c));
  const kommt = 'folgt in einer der nächsten Versionen';
  const r = $derived(d.regeln);

  interface Option { text: string; info?: string; sperre?: string | null; los: () => void }

  function textOption(titel: string, text: string, als: Aktion, mehr: Partial<Extract<Ansicht, { art: 'text' }>> = {}): () => void {
    return () => { freitext = ''; konz = 'keine'; ansicht = { art: 'text', titel, text, als, ...mehr }; };
  }

  const waffeSperre = $derived.by(() => {
    if (!e) return 'keine Schusswaffe aktiv';
    if (e.ladehemmung) return 'Ladehemmung';
    if (e.im_magazin <= 0) return 'Waffe leer';
    return null;
  });

  const mainOptionen = $derived.by<Option[]>(() => {
    const liste: Option[] = [
      { text: 'Skill oder Probe einsetzen', info: 'Probenrechner; Konzentration wählst du dort', los: () => onablauf({ art: 'probe_main' }) },
      { text: 'Nachladen', sperre: !e ? 'keine Schusswaffe aktiv' : !nachladearten(c, e, d).length ? (e.im_magazin >= kapazitaet(e, d) && !istWerfer(waffeVon(e, d)) ? 'Waffe ist voll' : 'nichts zum Nachladen da') : null,
        los: () => onablauf({ art: 'nachladen', als: 'main' }) },
      { text: 'Ladehemmung beheben', sperre: !e?.ladehemmung ? 'keine Ladehemmung' : null, los: () => onablauf({ art: 'ladehemmung' }) },
      { text: 'Waffe wechseln', sperre: c.ausruestung.waffen.length < 2 && e ? 'keine weitere Schusswaffe' : !c.ausruestung.waffen.length ? 'keine Schusswaffe' : null, los: () => onablauf({ art: 'wechseln' }) },
      { text: 'Aufsatz anbringen oder abnehmen', info: 'mit leichter Konzentration', sperre: !e || !passendeAufsaetze(waffeVon(e, d), d).length ? 'kein passender Aufsatz' : !konzentrationMoeglich(c) ? 'schon Breakaction eingesetzt' : null,
        los: () => { ansicht = { art: 'aufsatz' }; } },
      { text: 'Adrenalin senken', info: 'Nerve-Probe', los: () => onablauf({ art: 'senken' }) },
      { text: 'Verbündete verschieben', info: 'Empathy-Probe mit Führung', los: () => onablauf({ art: 'verschieben' }) },
      { text: 'Hechten', info: hechtInfo(), sperre: hechtSperreText(), los: () => hechtOeffnen('main') }
    ];
    if (zielenAlsMain(c, d)) liste.push({ text: 'Zielen', info: 'Ruhige Hand: schon für den nächsten Schuss dieser Runde', los: () => { ansicht = { art: 'zielen', als: 'main' }; } });
    liste.push(
      { text: 'Wunde versorgen', info: 'Druckverband, Tourniquet oder Operation; mit Konzentration', sperre: !konzentrationMoeglich(c) ? 'schon Breakaction eingesetzt' : null,
        los: () => onablauf({ art: 'versorgen' }) },
      { text: 'Wurfaktion', sperre: kommt, los: () => {} },
      { text: 'Nahkampfangriff', sperre: kommt, los: () => {} },
      { text: 'Sonderfähigkeit', info: 'z. B. Offangle, Overwatch, eine Aktion über mehrere Runden', los: textOption('Sonderfähigkeit', 'Beschreibe kurz, was du tust. Braucht die Aktion Konzentration, wähle die Stufe.', 'main', { konzentration: true, freitext: true }) }
    );
    return liste;
  });

  const breakOptionen = $derived.by<Option[]>(() => {
    const liste: Option[] = [
      { text: 'Schießen', sperre: waffeSperre, los: () => onablauf({ art: 'schiessen' }) },
      { text: 'Zielen', info: 'Stepshield für den nächsten Schuss in der nächsten Runde', los: () => { liegendAufgelegt = eigenerStand(g, d) === r.staende.find((s) => s.liegend)?.id; ansicht = { art: 'zielen', als: 'break' }; } },
      { text: 'Hechten', info: hechtInfo(), sperre: hechtSperreText(), los: () => hechtOeffnen('break') },
      { text: 'Standwechsel', los: () => { wahl = null; ansicht = { art: 'stand' }; } },
      { text: 'Nahkampfangriff, Abfangen', sperre: kommt, los: () => {} }
    ];
    if (e && nachladearten(c, e, d).some((a) => nachladenAlsBreak(c, a.art, d))) liste.push({ text: 'Nachladen', info: 'mit Magazin, Schnelllader oder Ladestreifen', los: () => onablauf({ art: 'nachladen', als: 'break' }) });
    if (perkWirkungen(c, d, 'werfen_als_break').length) liste.push({ text: 'Werfen', sperre: kommt, los: () => {} });
    if (perkWirkungen(c, d, 'eingreifen_als_break').length) {
      const perk = c.perks.find((p) => (r.perk_wirkungen[p] ?? []).some((w) => w.art === 'eingreifen_als_break'))!;
      liste.push({ text: 'Eingreifen', los: textOption('Eingreifen', d.perks.eintraege.find((p) => p.id === perk)?.wirkung ?? '', 'break') });
    }
    return liste;
  });

  const hechtZiele = $derived(r.hechten.staende);
  const hechtZielText = () => hechtZiele.map((s) => standAdjektiv(s, d)).join(' oder ');
  function hechtInfo(): string { return `bis ${r.bewegung.hechten.meter} m, danach ${hechtZielText()}`; }
  function hechtOeffnen(als: 'main' | 'break') { wahl = hechtZiele.length === 1 ? hechtZiele[0]! : null; ansicht = { art: 'hechten', als }; }
  function hechtSperreText(): string | null {
    const s = hechtenSperre(c, d);
    return s === 'stand' ? 'nicht aus dem Liegen' : s === 'symptom' ? 'Ruhepuls 2: kein Hechten' : null;
  }

  // Breakaction: Probe vorab (Reaktion, Antizipation)
  const tunnelblick = $derived(hatWirkung(g.leiter, 'keine_antizipation', r));
  const breakAnfrage = $derived(breakProbe === 'reaktion' || breakProbe === 'antizipation'
    ? { stat: r.breakaction[breakProbe].stat, skill: r.breakaction[breakProbe].skill, probe: breakProbe, zusatz: breakZusatz(c, d) }
    : null);
  const breakWeiter = $derived(breakZug === 'eigener' || (breakZug === 'fremder' && (breakProbe === 'ohne' || !!breakErgebnis)));
  function zugWaehlen(z: 'eigener' | 'fremder') { breakZug = z; breakProbe = z === 'eigener' ? 'ohne' : null; breakErgebnis = null; }
  function probeWaehlen(p: 'ohne' | 'reaktion' | 'antizipation') { breakProbe = p; breakErgebnis = null; }
  const stufeName: Record<string, string> = { krit: 'Krit', erfolg: 'Erfolg', misserfolg: 'Misserfolg' };
  const breakAnsage = $derived.by(() => {
    if (breakZug === 'eigener') return 'In deinem Zug, ohne Probe.';
    if (breakProbe === 'ohne') return 'Im fremden Zug, ohne Wurf: Die SL lässt die Unterbrechung zu.';
    if (!breakErgebnis) return '';
    const art = breakProbe === 'reaktion' ? 'Reaktion' : 'Antizipation';
    const st = stufeName[breakErgebnis.stufe] ?? breakErgebnis.stufe;
    return `Im fremden Zug mit ${art}: ${st}${breakErgebnis.wurf !== null && breakErgebnis.stufe !== 'misserfolg' ? ` · ${String(breakErgebnis.wurf).padStart(2, '0')}` : ''}.`;
  });
  const info = (k: string) => d.darstellung.informationen[k] ?? k;
  const malstepListe = (m: Record<string, number>) => Object.entries(m).map(([k, n]) => `${info(k)} ${n}`).join(', ');

  function ausfuehren(nach: Charakter, als: Aktion, text: string, k: 'leicht' | 'voll' | null = null) {
    let x = verbrauchen(nach, als);
    if (k) x = konzentrationSetzen(x, k);
    onfertig(protokolliere(x, text));
  }

  const titel = $derived(aktion === 'break' ? 'Breakaction' : aktion === 'main' ? 'Mainaction' : aktion === 'bewegung' ? 'Bewegung' : 'Standwechsel');
</script>

<Dialog {titel}>
  {#if ansicht.art === 'liste'}
    {#if aktion === 'main' || aktion === 'break'}
      <p class="hinweis">Noch {verfuegbar(c, aktion, d)} × {AKTION_NAME[aktion]} in dieser Runde.</p>
    {/if}

    {#if aktion === 'break' && breakSchritt === 'zug'}
      <section class="abschnitt">
        <h3 class="abschnitt-titel">Wann handelst du?</h3>
        <div class="auswahlreihe gleich" role="group" aria-label="Wann handelst du?">
          <button aria-pressed={breakZug === 'eigener'} onclick={() => zugWaehlen('eigener')}>In deinem Zug</button>
          <button aria-pressed={breakZug === 'fremder'} onclick={() => zugWaehlen('fremder')}>Im fremden Zug</button>
        </div>
        {#if breakZug === 'eigener'}
          <p class="hinweis">Im eigenen Zug brauchst du keine Probe. Tippe auf Weiter und wähle die Aktion.</p>
        {:else if breakZug === 'fremder'}
          <p class="hinweis">Du unterbrichst einen anderen Akteur. Dafür musst du ihn wahrnehmen oder antizipieren.</p>
        {/if}
      </section>

      {#if breakZug === 'fremder'}
        <section class="abschnitt">
          <h3 class="abschnitt-titel">Probe auf</h3>
          <div class="auswahlreihe gleich" role="group" aria-label="Probe auf">
            <button aria-pressed={breakProbe === 'reaktion'} onclick={() => probeWaehlen('reaktion')}>Reaktion</button>
            <button aria-pressed={breakProbe === 'antizipation'} disabled={tunnelblick} onclick={() => probeWaehlen('antizipation')}>Antizipation</button>
            <button aria-pressed={breakProbe === 'ohne'} onclick={() => probeWaehlen('ohne')}>ohne Wurf</button>
          </div>
          {#if tunnelblick}<p class="hinweis">Tunnelblick: keine Antizipation.</p>{/if}
          {#if breakProbe === 'ohne'}<p class="hinweis">Nur wenn die SL die Unterbrechung ohne Wurf zulässt.</p>{/if}
          {#if breakProbe && breakAnfrage}
            <p class="hinweis"><strong>Braucht eine Information über den Akteur.</strong>
              {#if breakProbe === 'reaktion'}Malsteps nach Wahrnehmung im Moment: {malstepListe(r.breakaction.reaktion.malsteps)} (gesehen: dazu die Sicht).
              {:else}Malsteps nach Güte ({malstepListe(r.breakaction.antizipation.malsteps_guete)}) und Alter ({malstepListe(r.breakaction.antizipation.malsteps_alter)}), zusammengezählt.{/if}
              Die SL legt sie fest; trag sie unten bei SL ein.</p>
            {#key breakProbe}
              <ProbeKern {c} {d} anfrage={breakAnfrage} hinweise={['breakaction']} {wuerfelModus} sichtSchalter sichtVorgewaehlt={breakProbe === 'reaktion'}
                mitAusgang bind:ergebnis={breakErgebnis} {onaendern} />
            {/key}
            <p class="hinweis">Sag das Ergebnis an. Die Reihenfolge legt die SL fest. Mit Weiter wählst du die Aktion.</p>
          {/if}
        </section>
      {/if}
    {/if}

    {#if aktion === 'break' && breakSchritt === 'aktion'}
      <p><strong>{breakAnsage}</strong></p>
      <h3 class="abschnitt-titel">Was tust du?</h3>
    {/if}

    {#if aktion === 'main' || (aktion === 'break' && breakSchritt === 'aktion')}
      <ul class="auswahlliste">
        {#each aktion === 'main' ? mainOptionen : breakOptionen as o (o.text)}
          <li><button disabled={!!o.sperre} onclick={o.los}>
            <span>{o.text}</span>
            {#if o.sperre}<small class="sperre">{o.sperre}</small>{:else if o.info}<small>{o.info}</small>{/if}
          </button></li>
        {/each}
      </ul>
    {:else if aktion === 'bewegung'}
      {@const arten = bewegungsarten(c, d)}
      <p class="hinweis">Dein Stand: {standAdjektiv(eigenerStand(g, d), d)}. Noch {verfuegbar(c, 'bewegung', d)} × Bewegung.{#if g.bewegt} Bisher: {bewegungName(g.bewegt, d)}.{/if}</p>
      <ul class="auswahlliste">
        {#each arten as b (b.id)}
          {@const art = r.bewegung.arten[b.id]!}
          {@const m = typeof art.meter === 'number' ? art.meter : (art.meter[eigenerStand(g, d)] ?? Math.max(...Object.values(art.meter)))}
          <li><button aria-pressed={wahl === b.id} disabled={!b.erlaubt} onclick={() => (wahl = b.id)}>
            <span>{bewegungName(b.id, d)}</span>
            <small class:sperre={!b.erlaubt}>{b.erlaubt ? `${m} m · hörbar bis ${d.regeln.schiessen.reichweitenbaender.find((x) => x.id === art.hoerbar)?.name}` : b.grund === 'stand' ? 'nicht in diesem Stand' : b.grund === 'konzentration' ? 'Konzentration' : 'Rüstung oder Schild: höchstens Gehen'}</small>
          </button></li>
        {/each}
      </ul>
      <p class="hinweis">Bewegung bringt dir bis Rundenende Malsteps beim Schießen und Werfen; das trägt die App selbst ein.</p>
    {:else if aktion === 'stand'}
      {@render standWahl()}
    {/if}

  {:else if ansicht.art === 'text'}
    <p>{ansicht.text}</p>
    {#if ansicht.freitext}<input placeholder="Was tust du? (optional)" aria-label="Beschreibung" bind:value={freitext} />{/if}
    {#if ansicht.konzentration}
      <div class="auswahlreihe gleich" role="group" aria-label="Konzentration">
        {#each [['keine', 'ohne Konzentration'], ['leicht', 'leicht'], ['voll', 'voll']] as [id, text] (id)}
          <button aria-pressed={konz === id} disabled={id !== 'keine' && !konzentrationMoeglich(c)} onclick={() => (konz = id as typeof konz)}>{text}</button>
        {/each}
      </div>
      {#if konz !== 'keine'}<p class="hinweis">Konzentration: In dieser Runde keine Breakaction mehr; {konz === 'leicht' ? 'Bewegung höchstens Gehen' : 'keine Bewegung und kein Standwechsel'}.</p>{/if}
    {/if}
    <p class="hinweis">Ausführen: {AKTION_NAME[ansicht.als]} −1.</p>

  {:else if ansicht.art === 'hechten'}
    <p>Du springst bis zu {r.bewegung.hechten.meter} m weit und bist danach {hechtZielText()} (hörbar bis {d.regeln.schiessen.reichweitenbaender.find((x) => x.id === r.bewegung.hechten.hoerbar)?.name}).
      Bis Rundenende bist du schwerer zu treffen, und eigene Schüsse haben die Malsteps fürs Hechten. Hechten ist keine Bewegung.</p>
    {#if hechtZiele.length > 1}
      <div class="auswahlreihe gleich" role="group" aria-label="Zielstand">
        {#each hechtZiele as s (s)}
          <button aria-pressed={wahl === s} onclick={() => (wahl = s)}>{r.staende.find((x) => x.id === s)?.name ?? s}</button>
        {/each}
      </div>
    {/if}
    <p class="hinweis">Ausführen: {AKTION_NAME[ansicht.als]} −1.</p>

  {:else if ansicht.art === 'zielen'}
    {@const zw = zielwirkung(c, d, liegendAufgelegt)}
    <p>Wenn du dein Ziel nicht aus den Augen verlierst und {ansicht.als === 'break' ? 'in dieser Runde nicht schießt' : 'als Nächstes schießt'}, bringt dein nächster Schuss
      {ansicht.als === 'break' ? 'in der nächsten Runde' : 'in dieser Runde'}:
      <strong>{zw.ohne_reichweite ? 'keine Malsteps der Reichweite' : `${zw.stepshields} ${zw.stepshields === 1 ? 'Stepshield' : 'Stepshields'}`}</strong>{#if zw.perk} (◆ {zw.perk}){/if}.</p>
    {#if perkWirkungen(c, d, 'zielen_stepshields').some((p) => p.bedingung === 'liegend_oder_aufgelegt')}
      <label class="schalter"><input type="checkbox" bind:checked={liegendAufgelegt} /> Ich liege oder meine Waffe ist aufgelegt</label>
    {/if}
    {#if perkWirkungen(c, d, 'zielen_ohne_reichweite').length && g.bewegt}<p class="hinweis">Du hast dich bewegt: kein „ohne Reichweite“ in dieser Runde.</p>{/if}
    <p class="hinweis">Ausführen: {AKTION_NAME[ansicht.als]} −1.</p>

  {:else if ansicht.art === 'stand'}
    {@render standWahl()}

  {:else if ansicht.art === 'aufsatz' && e}
    {@const w = waffeVon(e, d)}
    <p>Mainaction mit leichter Konzentration. Hake an, was danach an {w.name} angebracht ist. Wähle nur Aufsätze, die du dabeihast.</p>
    {#each passendeAufsaetze(w, d) as a (a.id)}
      <label class="schalter"><input type="checkbox" checked={e.aufsaetze.includes(a.id)}
        onchange={(ev) => { const an = (ev.target as HTMLInputElement).checked; onaendern(eintragErsetzen(c, { ...e, aufsaetze: an ? [...e.aufsaetze, a.id] : e.aufsaetze.filter((x) => x !== a.id) })); }} /> {a.name}</label>
    {/each}
    <p class="hinweis">Ausführen: Main −1, Konzentration (leicht).</p>
  {/if}

  {#snippet knoepfe()}
    {#if ansicht.art === 'liste' && aktion === 'break' && breakSchritt === 'aktion'}
      <button onclick={() => (breakSchritt = 'zug')}>Zurück</button>
    {:else if ansicht.art === 'liste'}
      <button onclick={onschliessen}>Schließen</button>
      {#if aktion === 'break'}
        <button class="haupt" disabled={!breakWeiter} onclick={() => (breakSchritt = 'aktion')}>Weiter</button>
      {:else if aktion === 'bewegung'}
        <button class="haupt" disabled={!wahl || verfuegbar(c, 'bewegung', d) <= 0} onclick={() => wahl && onfertig(protokolliere(bewegen(c, wahl, d), `Bewegung: ${bewegungName(wahl, d)}`))}>Ausführen</button>
      {:else if aktion === 'stand'}
        <button class="haupt" disabled={!wahl || verfuegbar(c, 'stand', d) <= 0} onclick={() => wahl && onfertig(protokolliere(standWechseln(c, wahl, 'stand'), `Standwechsel: ${standAdjektiv(wahl, d)}`))}>Ausführen</button>
      {/if}
    {:else}
      <button onclick={() => (ansicht = { art: 'liste' })}>Zurück</button>
      {#if ansicht.art === 'text'}
        {@const v = ansicht}
        <button class="haupt" onclick={() => ausfuehren(c, v.als, `${v.titel}${freitext.trim() ? `: ${freitext.trim()}` : ''}`, konz === 'keine' ? null : konz)}>Ausführen</button>
      {:else if ansicht.art === 'hechten'}
        {@const v = ansicht}
        <button class="haupt" disabled={!wahl} onclick={() => wahl && onfertig(protokolliere(hechten(c, wahl, v.als), `Hechten: ${standAdjektiv(wahl, d)}`))}>Ausführen</button>
      {:else if ansicht.art === 'zielen'}
        {@const v = ansicht}
        <button class="haupt" onclick={() => onfertig(protokolliere(zielen(c, d, v.als, liegendAufgelegt), 'Zielen'))}>Ausführen</button>
      {:else if ansicht.art === 'stand'}
        <button class="haupt" disabled={!wahl} onclick={() => wahl && onfertig(protokolliere(standWechseln(c, wahl, 'break'), `Standwechsel (Break): ${standAdjektiv(wahl, d)}`))}>Ausführen</button>
      {:else if ansicht.art === 'aufsatz'}
        <button class="haupt" onclick={() => ausfuehren(c, 'main', 'Aufsatz angebracht oder abgenommen', 'leicht')}>Ausführen</button>
      {/if}
    {/if}
  {/snippet}
</Dialog>

{#snippet standWahl()}
  <p class="hinweis">Dein Stand: {standAdjektiv(eigenerStand(g, d), d)}.</p>
  {#if aktion === 'stand' && verfuegbar(c, 'stand', d) <= 0}
    <p class="warnung">Dein Standwechsel dieser Runde ist verbraucht. Einen zweiten machst du über Break → Standwechsel.</p>
  {:else if aktion === 'break'}
    <p class="hinweis">Kostet deine Breakaction.</p>
  {/if}
  <div class="auswahlreihe gleich" role="group" aria-label="Neuer Stand">
    {#each r.staende as s (s.id)}
      <button aria-pressed={wahl === s.id} disabled={s.id === eigenerStand(g, d)} onclick={() => (wahl = s.id)}>{s.name}</button>
    {/each}
  </div>
  <p class="hinweis">Liegend: 1 Stepshield nur auf die Haltezahl; Hocke und Liegen machen dich zum kleineren Ziel.</p>
{/snippet}


