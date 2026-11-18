<script lang="ts">
  import { onMount } from 'svelte';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import { datenstand, ladeSpieldaten } from './lib/daten/laden';
  import type { Spieldaten } from './lib/daten/typen';
  import { Ablage, STANDARD_EINSTELLUNGEN, type Einstellungen } from './lib/speicher/ablage';
  import { dateiname, exportiereText, importiereText } from './lib/speicher/austausch';
  import { neuerCharakter, type Charakter } from './lib/speicher/charakter';
  import { dateiOeffnen, dateiSpeichern } from './lib/ui/datei';
  import { sessionAbschliessen } from './lib/regeln/aufstieg';
  import Bericht from './lib/ui/Bericht.svelte';
  import Erstellung from './lib/ui/erstellung/Erstellung.svelte';
  import Menue from './lib/ui/Menue.svelte';
  import Start from './lib/ui/Start.svelte';
  import { MODUS_NAME, punkte, type Modus, type Zeile } from './lib/ui/texte';
  import Werte from './lib/ui/Werte.svelte';
  import { modusFuer } from './lib/wuerfel/wuerfel';
  import { adrenalinschockBeenden, gefechtBeenden, leiterSetzen, letzteLeiterAenderung, rueckgaengig } from './lib/regeln/gefecht';
  import { overTheEdge } from './lib/regeln/leiter';
  import { gefechtVon, lebenslageDes } from './lib/regeln/probenrechner';
  import Adrenalinrad from './lib/ui/gefecht/Adrenalinrad.svelte';
  import GefechtStarten from './lib/ui/gefecht/GefechtStarten.svelte';
  import Initiative from './lib/ui/gefecht/Initiative.svelte';
  import LeiterDetail from './lib/ui/gefecht/LeiterDetail.svelte';
  import LeiterProbe from './lib/ui/gefecht/LeiterProbe.svelte';
  import NaechsteRunde from './lib/ui/gefecht/NaechsteRunde.svelte';
  import Probenrechner from './lib/ui/probe/Probenrechner.svelte';
  import Ausruestung from './lib/ui/ausruestung/Ausruestung.svelte';
  import Aktionsleiste from './lib/ui/gefecht/Aktionsleiste.svelte';
  import Aktionsmenue, { type Ablauf } from './lib/ui/gefecht/Aktionsmenue.svelte';
  import LadehemmungBeheben from './lib/ui/gefecht/LadehemmungBeheben.svelte';
  import Nachladen from './lib/ui/gefecht/Nachladen.svelte';
  import Schiessen from './lib/ui/gefecht/Schiessen.svelte';
  import WaffeWechseln from './lib/ui/gefecht/WaffeWechseln.svelte';
  import type { Aktion } from './lib/speicher/charakter';
  import { ansage, standText } from './lib/ui/texte';

  const APP_VERSION = __APP_VERSION__;

  let daten = $state<Spieldaten | null>(null);
  let datenFehler = $state<string[]>([]);
  let ladeFehler = $state('');
  let ablage: Ablage | null = null;
  let charaktere = $state<Charakter[]>([]);
  let aktiveId = $state<string | null>(null);
  let entwurf = $state<Charakter | null>(null);
  let einstellungen = $state<Einstellungen>(STANDARD_EINSTELLUNGEN);
  let menueOffen = $state(false);
  let meldung = $state('');
  let reiter = $state<'figur' | 'werte' | 'ausruestung' | 'verlauf'>('figur');

  let modus = $state<Modus>('lesen');
  let bericht = $state<{ titel: string; zeilen: Zeile[]; weiter: () => void } | null>(null);
  /** Offener Dialog des Spiels: Probenrechner, Abläufe rund um Gefecht und Adrenalin. */
  type Spieldialog =
    | { art: 'probe'; stat: string | null; skill: string | null; alsMain?: boolean }
    | { art: 'start' | 'initiative' | 'runde' | 'senken' | 'verschieben' | 'detail' | 'schiessen' | 'wechseln' }
    | { art: 'aktion'; aktion: Aktion }
    | { art: 'nachladen'; id: string; als: 'main' | 'break' | null }
    | { art: 'ladehemmung'; id: string };
  let dialog = $state<Spieldialog | null>(null);
  /** Kurze Meldung mit „Rückgängig“ nach einer Änderung von Adrenalin bzw. Ruhepuls (konzept.md § 3.7). */
  let rueckgaengigText = $state('');

  const aktiv = $derived(charaktere.find((c) => c.id === aktiveId) ?? null);
  /** Charakter in Erstellung: neuer, noch ungespeicherter Entwurf oder ein gespeicherter Entwurf. */
  const inErstellung = $derived(entwurf ?? (aktiv?.status === 'erstellung' ? aktiv : null));
  const entwuerfe = $derived(charaktere.filter((c) => c.status === 'erstellung'));
  const abweichungModus = $derived(modusFuer('abweichung', einstellungen.wuerfeln));
  const imGefecht = $derived(!!aktiv?.spielstand.gefecht.aktiv);
  const gefecht = $derived(aktiv ? gefechtVon(aktiv) : null);
  const probeModus = $derived(modusFuer('probe', einstellungen.wuerfeln));
  const kampfunfaehig = $derived(!!aktiv && !!daten && lebenslageDes(aktiv, daten) !== 'einsatzfaehig');

  const { needRefresh, updateServiceWorker } = useRegisterSW();

  $effect(() => {
    const d = einstellungen.darstellung;
    if (d === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = d;
  });

  onMount(async () => {
    try {
      const geladen = await ladeSpieldaten();
      daten = geladen.daten;
      datenFehler = geladen.fehler;
      ablage = await Ablage.oeffnen();
      einstellungen = await ablage.einstellungen();
      const alle = await ablage.alle();
      charaktere = alle.charaktere;
      if (alle.fehler.length) meldung = `Nicht lesbar: ${alle.fehler.join('; ')}`;
      const zuletzt = await ablage.zuletztGeoeffnet();
      aktiveId = charaktere.some((c) => c.id === zuletzt) ? zuletzt! : (charaktere[0]?.id ?? null);
    } catch (e) {
      ladeFehler = (e as Error).message;
    }
  });

  function zeige(text: string) {
    meldung = text;
    setTimeout(() => { if (meldung === text) meldung = ''; }, 4000);
  }

  async function speichern(c: Charakter) {
    // Kopie ohne Svelte-Proxys: IndexedDB kann nur einfache Objekte ablegen.
    const kopie = $state.snapshot(c) as Charakter;
    await ablage!.speichern(kopie);
    charaktere = charaktere.some((x) => x.id === c.id) ? charaktere.map((x) => (x.id === c.id ? kopie : x)) : [...charaktere, kopie];
  }

  async function oeffne(id: string) {
    aktiveId = id;
    entwurf = null;
    menueOffen = false;
    reiter = 'figur';
    modus = 'lesen';
    await ablage!.setzeZuletztGeoeffnet(id);
  }

  function erstellen() {
    entwurf = neuerCharakter(daten!.stats.eintraege.map((s) => s.id));
    menueOffen = false;
    modus = 'lesen';
  }

  /** Entwurf speichern, sobald er einen Namen hat (oder schon gespeichert ist). */
  async function entwurfSpeichern(c: Charakter) {
    const bekannt = charaktere.some((x) => x.id === c.id);
    if (!bekannt && !c.name.trim()) return;
    await speichern({ ...c, geaendert: new Date().toISOString() });
    if (!bekannt) {
      aktiveId = c.id;
      entwurf = null;
      await ablage!.setzeZuletztGeoeffnet(c.id);
    }
  }

  /** Erstellung unterbrechen: Der Entwurf bleibt gespeichert und lässt sich über das Menü fortsetzen. */
  async function erstellungVerlassen() {
    const id = inErstellung?.id;
    entwurf = null;
    const anderer = charaktere.find((c) => c.id !== id && c.status === 'fertig');
    if (anderer) await oeffne(anderer.id);
    else aktiveId = null;
  }

  async function erstellungFertig(c: Charakter) {
    await speichern(c);
    await oeffne(c.id);
    reiter = 'werte';
    zeige(`„${c.name}“ ist fertig.`);
  }

  async function aendern(c: Charakter) {
    await speichern(c);
  }

  function sessionFrage() {
    if (!aktiv) return;
    const c = aktiv;
    const nach = sessionAbschliessen(c, daten!);
    menueOffen = false;
    bericht = {
      titel: 'Session abschließen',
      zeilen: [
        { text: 'Du schließt die Session ab.', fett: true },
        { text: `Du erhältst ${punkte(nach.freie_punkte - c.freie_punkte)}. Deine freien Punkte steigen von ${c.freie_punkte} auf ${nach.freie_punkte}.` }
      ],
      weiter: () => { void speichern(nach); bericht = null; }
    };
  }

  // ---- Gefecht und Adrenalin (konzept.md § 3.0e, § 3.7)

  let rueckgaengigZeit: ReturnType<typeof setTimeout> | undefined;
  function zeigeRueckgaengig(text: string) {
    rueckgaengigText = text;
    clearTimeout(rueckgaengigZeit);
    rueckgaengigZeit = setTimeout(() => (rueckgaengigText = ''), 5000);
  }

  async function leiterDrehen(stand: number) {
    if (!aktiv || !gefecht) return;
    const von = gefecht.leiter;
    await speichern(leiterSetzen(aktiv, stand, daten!));
    zeigeRueckgaengig(`${standText(von, daten!)} → ${standText(stand, daten!)}`);
  }

  async function zuruecknehmen() {
    if (!aktiv) return;
    rueckgaengigText = '';
    await speichern(rueckgaengig(aktiv, daten!));
  }

  /** Nach einem Ablauf mit Bericht: speichern, Änderung von Adrenalin melden. */
  async function nachAblauf(c: Charakter, folgt: Spieldialog | null = null) {
    const von = gefecht?.leiter ?? 0;
    await speichern(c);
    const nach = gefechtVon(c)?.leiter ?? 0;
    dialog = folgt;
    if (von !== nach && !folgt) zeigeRueckgaengig(`${standText(von, daten!)} → ${standText(nach, daten!)}`);
  }

  /** Ablauf aus dem Menü der Aktionsleiste öffnen (konzept.md § 3.7a). */
  function ablauf(a: Ablauf) {
    const aktiveWaffe = aktiv?.ausruestung.aktive_waffe ?? '';
    switch (a.art) {
      case 'probe_main': dialog = { art: 'probe', stat: null, skill: null, alsMain: true }; break;
      case 'schiessen': dialog = { art: 'schiessen' }; break;
      case 'nachladen': dialog = { art: 'nachladen', id: aktiveWaffe, als: a.als }; break;
      case 'ladehemmung': dialog = { art: 'ladehemmung', id: aktiveWaffe }; break;
      case 'wechseln': dialog = { art: 'wechseln' }; break;
      case 'senken': dialog = { art: 'senken' }; break;
      case 'verschieben': dialog = { art: 'verschieben' }; break;
    }
  }

  function gefechtStarten() {
    if (modus === 'aufstieg') modus = 'lesen';
    dialog = { art: 'start' };
  }

  function gefechtEndeFrage() {
    if (!aktiv || !gefecht) return;
    const c = aktiv;
    const g = gefecht;
    const zeilen: Zeile[] = [{ text: 'Das Gefecht endet.', fett: true }];
    zeilen.push({ text: g.leiter === 0 ? 'Du bist bei 0 und bleibst dort.' : `${standText(g.leiter, daten!)} fällt auf 0.` });
    if (g.adrenalin4_erreicht) {
      const r = daten!.regeln.zustaende.adrenalinschock;
      zeilen.push({ text: `Du hast Over the Edge erreicht: Du erleidest einen Adrenalinschock. Alle Proben sind erschwert, bis du ${r.ende_ruhe_stunden} Stunden ununterbrochen ruhst.`, fett: true });
    }
    if (g.lage.sl_gefecht.length) zeilen.push({ text: 'Die Steps der SL für dieses Gefecht entfallen.' });
    bericht = { titel: 'Gefecht beenden', zeilen, weiter: () => { void speichern(gefechtBeenden(c)); bericht = null; dialog = null; } };
  }

  function schockFrage() {
    if (!aktiv) return;
    const c = aktiv;
    const stunden = daten!.regeln.zustaende.adrenalinschock.ende_ruhe_stunden;
    bericht = {
      titel: 'Adrenalinschock',
      zeilen: [
        { text: `Der Adrenalinschock endet nach ${stunden} Stunden ununterbrochener Ruhe.` },
        { text: `Hattest du diese Ruhe? Dann endet er jetzt.`, fett: true }
      ],
      weiter: () => { void speichern(adrenalinschockBeenden(c)); bericht = null; }
    };
  }

  async function importieren() {
    menueOffen = false;
    const text = await dateiOeffnen();
    if (text === null) return;
    try {
      const c = importiereText(text);
      const vorhanden = charaktere.find((x) => x.id === c.id);
      if (vorhanden && !confirm(`„${vorhanden.name}“ ist schon auf diesem Gerät. Mit der Datei überschreiben?`)) return;
      await speichern(c);
      await oeffne(c.id);
      zeige(`„${c.name}“ importiert.`);
    } catch (e) {
      zeige((e as Error).message);
    }
  }

  function exportieren(c: Charakter) {
    void dateiSpeichern(dateiname(c), exportiereText($state.snapshot(c) as Charakter));
  }

  async function duplizieren(c: Charakter) {
    const kopie = { ...(structuredClone($state.snapshot(c)) as Charakter), id: neuerCharakter([]).id, name: `${c.name} (Kopie)` };
    await speichern(kopie);
    zeige(`„${kopie.name}“ angelegt.`);
  }

  async function loeschen(c: Charakter) {
    await ablage!.loeschen(c.id);
    charaktere = charaktere.filter((x) => x.id !== c.id);
    if (aktiveId === c.id) aktiveId = charaktere.find((x) => x.status === 'fertig')?.id ?? null;
    zeige(`„${c.name}“ gelöscht.`);
  }

  const REITER_NAMEN = { figur: 'Figur', werte: 'Werte', ausruestung: 'Ausrüstung', verlauf: 'Verlauf' } as const;
  function reiterKlappen(zu: boolean) {
    void einstellungenSetzen({ ...einstellungen, reiterEingeklappt: zu });
  }

  async function einstellungenSetzen(e: Einstellungen) {
    einstellungen = e;
    await ablage!.speichereEinstellungen($state.snapshot(e) as Einstellungen);
  }
</script>

{#if ladeFehler}
  <main class="mitte"><h2>Die App konnte nicht starten</h2><p class="fehler">{ladeFehler}</p>
    <button onclick={() => location.reload()}>Neu laden</button></main>
{:else if !daten}
  <main class="mitte"><p class="hinweis">Lade …</p></main>
{:else}
  {#if datenFehler.length}
    <details class="datenfehler karte">
      <summary>Die Spieldaten enthalten {datenFehler.length} Fehler</summary>
      <ul>{#each datenFehler as f (f)}<li>{f}</li>{/each}</ul>
    </details>
  {/if}

  {#if inErstellung}
    {#key inErstellung.id}
      <Erstellung start={inErstellung} d={daten} {abweichungModus} onspeichern={entwurfSpeichern}
        onverlassen={erstellungVerlassen} onfertig={erstellungFertig} />
    {/key}
  {:else if !aktiv}
    <Start onerstellen={erstellen} onimportieren={importieren} meldung={meldung} {entwuerfe} onfortsetzen={oeffne} />
  {:else}
    <header class="kopfzeile">
      <button class="flach" aria-label="Menü öffnen" onclick={() => (menueOffen = true)}>☰</button>
      <div class="titel">
        <strong>{aktiv.name || 'ohne Namen'}</strong>
        {#if gefecht && gefecht.leiter !== 0}<span class="chip-klein" style:background={daten.darstellung.leiter_farben[String(gefecht.leiter)]}>{standText(gefecht.leiter, daten)}</span>{/if}
        {#if aktiv.spielstand.adrenalinschock.aktiv}
          <button class="chip-klein zustand" onclick={schockFrage}>Adrenalinschock</button>
        {/if}
      </div>
      {#if modus !== 'lesen' || !gefecht}
        <div class="modus">
          {#if modus !== 'lesen'}
            <span class="status an">{MODUS_NAME[modus]}</span>
            <button class="haupt klein" onclick={() => (modus = 'lesen')}>Fertig</button>
          {/if}
          {#if !gefecht}
            <button class="betont klein" class:warnung={kampfunfaehig} onclick={gefechtStarten}>
              {#if kampfunfaehig}⚠ {/if}Gefecht starten</button>
          {/if}
        </div>
      {/if}
      {#if !gefecht && kampfunfaehig}
        <p class="fehler kampfunfaehig">kampfunfähig: im Gefecht keine Aktionen</p>
      {/if}
      {#if gefecht}
        <div class="gefechtszeile">
          <span class="status an">Gefecht · Runde {gefecht.runde}</span>
          {#if gefecht.initiative}
            <button class="flach initiative" onclick={() => (dialog = { art: 'initiative' })}>Initiative: {ansage(gefecht.initiative.stufe, gefecht.initiative.wurf, gefecht.initiative.zielwert)}</button>
          {:else}
            <button class="flach initiative" onclick={() => (dialog = { art: 'initiative' })}>Initiative würfeln</button>
          {/if}
          <span class="rechts">
            <button class="klein" onclick={() => (dialog = { art: 'runde' })}>Nächste Runde</button>
            <button class="klein" onclick={gefechtEndeFrage}>Gefecht beenden</button>
          </span>
        </div>
      {/if}
    </header>

    <main class="bogen" class:ohne-reiter={einstellungen.reiterEingeklappt}>
      {#if reiter === 'figur'}
        <section class="karte">
          <h2>{aktiv.name}</h2>
          {#if aktiv.aussehen}<p>{aktiv.aussehen}</p>{/if}
          <p class="hinweis">Hier entsteht die Figur mit Silhouette. Deine Werte findest du im Reiter Werte.</p>
        </section>
      {:else if reiter === 'werte'}
        <Werte c={aktiv} d={daten} {modus} {abweichungModus} onaendern={aendern}
          onprobe={(stat, skill) => (dialog = { art: 'probe', stat, skill })} />
      {:else if reiter === 'ausruestung'}
        <Ausruestung c={aktiv} d={daten} {modus} onaendern={aendern}
          onnachladen={(id) => (dialog = { art: 'nachladen', id, als: null })} onladehemmung={(id) => (dialog = { art: 'ladehemmung', id })} />
      {:else}
        <section class="karte"><p class="hinweis">Dieser Reiter folgt in einer der nächsten Versionen.</p></section>
      {/if}
    </main>

    <div class="unten">
    {#if rueckgaengigText}
      <div class="toast karte rueck" role="status">
        <span>{rueckgaengigText}</span>
        <button class="flach link" onclick={zuruecknehmen}>Rückgängig</button>
      </div>
    {:else if meldung}<div class="toast karte" role="status">{meldung}</div>{/if}
    {#if gefecht}
      {#if overTheEdge(gefecht.leiter, daten.regeln)}
        <div class="banner" role="status">Over the Edge: nur 1 Aktion pro Runde</div>
      {/if}
      <Aktionsleiste c={aktiv} d={daten} {kampfunfaehig} onaendern={aendern} onoeffnen={(a) => (dialog = { art: 'aktion', aktion: a })} />
      <Adrenalinrad stand={gefecht.leiter} d={daten} onsetzen={leiterDrehen} ondetail={() => (dialog = { art: 'detail' })} />
    {/if}
    {#if einstellungen.reiterEingeklappt}
      <button class="reiter-griff" aria-expanded="false" aria-label="Reiter ausklappen (jetzt: {REITER_NAMEN[reiter]})"
        onclick={() => reiterKlappen(false)}><span aria-hidden="true">▴</span> {REITER_NAMEN[reiter]}</button>
    {:else}
      <nav class="reiter" aria-label="Reiter">
        {#each Object.entries(REITER_NAMEN) as [id, text] (id)}
          <button class="flach" class:an={reiter === id} aria-current={reiter === id ? 'page' : undefined}
            onclick={() => (reiter = id as typeof reiter)}>{text}</button>
        {/each}
        <button class="flach einklappen" aria-expanded="true" aria-label="Reiter einklappen"
          onclick={() => reiterKlappen(true)}><span aria-hidden="true">▾</span></button>
      </nav>
    {/if}
    </div>
  {/if}

  {#if aktiv && !inErstellung && dialog}
    {#if dialog.art === 'probe'}
      <Probenrechner c={aktiv} d={daten} stat={dialog.stat} skill={dialog.skill} wuerfelModus={probeModus} onaendern={aendern}
        onschliessen={() => (dialog = null)} alsMain={!!dialog.alsMain && !!gefecht} onfertig={(c) => nachAblauf(c)} />
    {:else if dialog.art === 'aktion' && gefecht}
      <Aktionsmenue c={aktiv} d={daten} aktion={dialog.aktion} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c)} onablauf={ablauf} onschliessen={() => (dialog = null)} />
    {:else if dialog.art === 'schiessen' && gefecht && aktiv.ausruestung.aktive_waffe}
      <Schiessen c={aktiv} d={daten} einstellungen={einstellungen.wuerfeln} onaendern={aendern}
        onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'nachladen' && aktiv.ausruestung.waffen.some((w) => dialog?.art === 'nachladen' && w.id === dialog.id)}
      <Nachladen c={aktiv} d={daten} eintragId={dialog.id} als={gefecht ? dialog.als : null}
        onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'ladehemmung' && aktiv.ausruestung.waffen.some((w) => dialog?.art === 'ladehemmung' && w.id === dialog.id)}
      <LadehemmungBeheben c={aktiv} d={daten} eintragId={dialog.id} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'wechseln' && gefecht}
      <WaffeWechseln c={aktiv} d={daten} onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'start'}
      <GefechtStarten c={aktiv} d={daten} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c, { art: 'initiative' })} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'initiative' && gefecht}
      <Initiative c={aktiv} d={daten} wuerfelModus={probeModus} onaendern={aendern} onschliessen={() => (dialog = null)} />
    {:else if dialog.art === 'runde' && gefecht}
      <NaechsteRunde c={aktiv} d={daten} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c, { art: 'initiative' })} onabbrechen={() => (dialog = null)} />
    {:else if (dialog.art === 'senken' || dialog.art === 'verschieben') && gefecht}
      <LeiterProbe art={dialog.art} c={aktiv} d={daten} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c)} onschliessen={() => (dialog = null)} />
    {:else if dialog.art === 'detail' && gefecht}
      <LeiterDetail stand={gefecht.leiter} d={daten} letzte={letzteLeiterAenderung(aktiv)}
        onsenken={() => (dialog = { art: 'senken' })} onverschieben={() => (dialog = { art: 'verschieben' })}
        onrueckgaengig={() => { void zuruecknehmen(); dialog = null; }} onschliessen={() => (dialog = null)} />
    {/if}
  {/if}

  <Menue offen={menueOffen} {charaktere} {aktiveId} klassen={daten.klassen.eintraege} {einstellungen}
    appVersion={APP_VERSION} datenstand={datenstand(daten)}
    onschliessen={() => (menueOffen = false)} onwechseln={oeffne} onneu={erstellen} onimportieren={importieren}
    onexportieren={exportieren} onduplizieren={duplizieren} onloeschen={loeschen} oneinstellungen={einstellungenSetzen}
    modus={aktiv && !inErstellung ? modus : null} {imGefecht}
    onmodus={(m) => { modus = m; menueOffen = false; if (m !== 'lesen') reiter = 'werte'; }} onsession={sessionFrage} />

  {#if bericht}
    <Bericht titel={bericht.titel} zeilen={bericht.zeilen} onweiter={bericht.weiter} onzurueck={() => (bericht = null)} />
  {/if}
{/if}

{#if $needRefresh}
  <div class="update karte" role="status">
    <span>Eine neue Version ist da.</span>
    <button class="haupt" onclick={() => updateServiceWorker(true)}>Jetzt laden</button>
  </div>
{/if}

<style>
  .mitte { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 16px; text-align: center; }
  .kopfzeile { display: flex; align-items: center; gap: 8px; padding: calc(4px + env(safe-area-inset-top)) 8px 4px;
    background: var(--flaeche); border-bottom: 1px solid var(--linie); position: sticky; top: 0; z-index: 5; }
  .titel { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .titel strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .modus { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .status.an { background: var(--akzent); color: var(--akzent-text); font-weight: 600; }
  .klein { min-height: 40px; padding: 0 12px; }
  .status { font-size: 0.8rem; padding: 2px 8px; border-radius: 999px; background: var(--flaeche-2); color: var(--text-2); }
  .bogen { flex: 1; padding: var(--abstand-3); display: flex; flex-direction: column; gap: var(--abstand-3); }
  .unten { position: sticky; bottom: 0; z-index: 5; }
  .reiter { display: grid; grid-template-columns: repeat(4, 1fr) var(--tipp); background: var(--flaeche); border-top: 1px solid var(--linie);
    padding-bottom: env(safe-area-inset-bottom); }
  .reiter button { border-radius: 0; padding: 0 4px; font-size: 0.9rem; color: var(--text-2); min-height: 56px; }
  .reiter .einklappen { min-width: 0; font-size: 1.2rem; border-left: 1px solid var(--linie); }
  /* Eingeklappt: nur ein kleiner Griff unten rechts, der über dem Inhalt schwebt und keinen eigenen Streifen braucht. */
  .reiter-griff { position: absolute; right: var(--abstand-3); bottom: calc(var(--abstand-2) + env(safe-area-inset-bottom)); z-index: 6;
    background: var(--flaeche); color: var(--text-2); font-size: 0.85rem; padding: 0 var(--abstand-3); border-radius: 999px;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.25); }
  .unten:has(> :not(.reiter-griff):not(.toast)) .reiter-griff { bottom: calc(100% + var(--abstand-2)); }
  /* Platz unter dem letzten Inhalt, damit der Griff nichts verdeckt (Höhe des Griffs + Abstand). */
  .bogen.ohne-reiter { padding-bottom: calc(var(--tipp) + var(--abstand-4)); }
  .reiter button.an { color: var(--akzent); font-weight: 700; box-shadow: inset 0 3px 0 var(--akzent); }
  .toast { position: absolute; left: 16px; right: 16px; bottom: calc(100% + 8px); z-index: 15; }
  .rueck { display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 4px 4px 16px; }
  .banner { background: #2b0a0a; color: #fff; text-align: center; font-weight: 700; padding: 6px; }
  .kopfzeile { flex-wrap: wrap; }
  .titel { flex-wrap: wrap; }
  .chip-klein { font-size: 0.8rem; padding: 2px 8px; border-radius: 999px; color: #fff; white-space: nowrap; min-height: 0; min-width: 0; }
  .chip-klein.zustand { background: #7d3c98; border: none; min-height: 32px; }
  .gefechtszeile { flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
  .gefechtszeile .rechts { margin-left: auto; display: flex; gap: 6px; }
  .gefechtszeile .klein { padding: 0 10px; font-size: 0.9rem; }
  .initiative { padding: 0 6px; font-size: 0.9rem; min-height: 40px; text-decoration: underline; text-underline-offset: 3px; }
  .kampfunfaehig { flex-basis: 100%; margin: 0; text-align: right; font-size: 0.85rem; }
  .update { position: fixed; left: 16px; right: 16px; bottom: calc(72px + env(safe-area-inset-bottom)); z-index: 50;
    display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: var(--abstand-3); }
  .datenfehler { margin: var(--abstand-2) var(--abstand-3) 0; border-color: var(--gefahr); display: block; }
  .datenfehler summary { color: var(--gefahr); font-weight: 600; min-height: 44px; display: flex; align-items: center; }
</style>
