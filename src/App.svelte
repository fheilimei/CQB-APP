<script lang="ts">
  import { onMount } from 'svelte';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import { datenstand, ladeSpieldaten } from './lib/daten/laden';
  import type { Spieldaten } from './lib/daten/typen';
  import { anzeige } from './lib/ui/darstellung.svelte';
  import { Ablage, STANDARD_EINSTELLUNGEN, type Einstellungen } from './lib/speicher/ablage';
  import Reiterleiste from './lib/ui/Reiterleiste.svelte';
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
  import { adrenalinschockBeenden, geblendetBeenden, leiterSetzen, letzteLeiterAenderung, rueckgaengig } from './lib/regeln/gefecht';
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
  import Deckung from './lib/ui/gefecht/Deckung.svelte';
  import Ereignis from './lib/ui/gefecht/Ereignis.svelte';
  import Nachsorge from './lib/ui/Nachsorge.svelte';
  import Ruhe from './lib/ui/Ruhe.svelte';
  import Reizgas from './lib/ui/gefecht/Reizgas.svelte';
  import Getroffen from './lib/ui/gefecht/Getroffen.svelte';
  import Nahkampfangriff from './lib/ui/gefecht/Nahkampfangriff.svelte';
  import Werfen from './lib/ui/gefecht/Werfen.svelte';
  import Versorgen from './lib/ui/gefecht/Versorgen.svelte';
  import GefechtBeenden from './lib/ui/gefecht/GefechtBeenden.svelte';
  import { blutungsart, fristAblaufen, fristablauf } from './lib/regeln/blutung';
  import { wundenText } from './lib/regeln/wunden';
  import Figur from './lib/ui/Figur.svelte';
  import type { Aktion } from './lib/speicher/charakter';
  import { AKTION_NAME, ansage, standText } from './lib/ui/texte';

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
  let bericht = $state<{ titel: string; zeilen: Zeile[]; weiter: () => void; knopf?: string } | null>(null);
  /** Offener Dialog des Spiels: Probenrechner, Abläufe rund um Gefecht und Adrenalin. */
  type Spieldialog =
    | { art: 'probe'; stat: string | null; skill: string | null; alsMain?: boolean }
    | { art: 'start' | 'initiative' | 'runde' | 'senken' | 'verschieben' | 'detail' | 'schiessen' | 'wechseln' | 'getroffen' | 'deckung' | 'ereignis' | 'reizgas' | 'ende' }
    | { art: 'aktion'; aktion: Aktion }
    | { art: 'nachladen'; id: string; als: 'main' | 'break' | null }
    | { art: 'ladehemmung'; id: string }
    | { art: 'versorgen'; wundId: string | null }
    | { art: 'nachsorge'; wundId: string }
    | { art: 'ruhe' }
    | { art: 'nahkampf'; als: 'main' | 'break' }
    | { art: 'werfen'; als: 'main' | 'break' };
  let dialog = $state<Spieldialog | null>(null);
  /** Kurze Meldung mit „Rückgängig“ nach einer Aktion der Aktionsleiste oder einem Treffer (konzept.md § 3.7a). */
  let rueckgaengigText = $state('');

  const aktiv = $derived(charaktere.find((c) => c.id === aktiveId) ?? null);
  /** Charakter in Erstellung: neuer, noch ungespeicherter Entwurf oder ein gespeicherter Entwurf. */
  const inErstellung = $derived(entwurf ?? (aktiv?.status === 'erstellung' ? aktiv : null));
  const entwuerfe = $derived(charaktere.filter((c) => c.status === 'erstellung'));
  const abweichungModus = $derived(modusFuer('abweichung', einstellungen.wuerfeln));
  const imGefecht = $derived(!!aktiv?.spielstand.gefecht.aktiv);
  const gefecht = $derived(aktiv ? gefechtVon(aktiv) : null);
  const probeModus = $derived(modusFuer('probe', einstellungen.wuerfeln));
  const zonenModus = $derived(modusFuer('trefferzone', einstellungen.wuerfeln));
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
      anzeige.darstellung = geladen.daten.darstellung;
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
  /** Was „Rückgängig“ in der kurzen Meldung tut. */
  let rueckAktion: (() => Promise<void>) | null = null;
  function zeigeRueckgaengig(text: string, aktion: () => Promise<void>) {
    rueckAktion = aktion;
    rueckgaengigText = text;
    clearTimeout(rueckgaengigZeit);
    rueckgaengigZeit = setTimeout(() => (rueckgaengigText = ''), 5000);
  }

  /** Wählrad: ohne Meldung „Rückgängig“ (Wunsch des Nutzers 18.11.2026); zurück geht es über das Detail am Rad. */
  async function leiterDrehen(stand: number) {
    if (!aktiv || !gefecht) return;
    await speichern(leiterSetzen(aktiv, stand, daten!));
  }

  async function zuruecknehmen() {
    rueckgaengigText = '';
    const a = rueckAktion;
    rueckAktion = null;
    if (a) await a();
  }

  /** Stand vor einer Aktion aus der Aktionsleiste (Main, Bewegung, Stand, Break), für „Rückgängig“ nach dem Ablauf. */
  let vorAktion: { c: Charakter; aktion: Aktion } | null = null;
  function aktionOeffnen(a: Aktion) {
    vorAktion = { c: $state.snapshot(aktiv) as Charakter, aktion: a };
    dialog = { art: 'aktion', aktion: a };
  }
  // Schließt sich der Dialog ohne Ergebnis, gilt der gemerkte Stand nicht mehr.
  $effect(() => { if (!dialog) vorAktion = null; });

  /** Nach einem Ablauf mit Bericht: speichern; kam er aus der Aktionsleiste, mit Meldung „Rückgängig“. */
  async function nachAblauf(c: Charakter, folgt: Spieldialog | null = null) {
    const vorher = vorAktion;
    vorAktion = null;
    await speichern(c);
    dialog = folgt;
    if (vorher && !folgt) {
      // Text der Meldung: der Eintrag, den die Aktion ins Protokoll schrieb, sonst der Name des Knopfs.
      const alt = gefechtVon(vorher.c)?.protokoll.length ?? 0;
      const neu = (gefechtVon(c)?.protokoll ?? []).slice(alt).filter((e) => e.art === 'aktion').at(-1);
      zeigeRueckgaengig(neu && 'text' in neu ? neu.text : AKTION_NAME[vorher.aktion], async () => { await speichern(vorher.c); });
    }
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
      case 'versorgen': dialog = { art: 'versorgen', wundId: null }; break;
      case 'nahkampf': dialog = { art: 'nahkampf', als: a.als }; break;
      case 'werfen': dialog = { art: 'werfen', als: a.als }; break;
    }
  }

  /** Treffer übernehmen; die Meldung bietet „Rückgängig“ (stellt den Stand vor dem Treffer wieder her). */
  async function trefferFertig(c: Charakter) {
    const vorher = $state.snapshot(aktiv) as Charakter;
    await speichern(c);
    dialog = null;
    zeigeRueckgaengig('Treffer eingetragen', async () => { await speichern(vorher); });
  }

  /** Ereignis: ein Auslöser ohne Treffer; die Meldung bietet „Rückgängig“. */
  async function ereignisFertig(c: Charakter, text: string) {
    const vorher = $state.snapshot(aktiv) as Charakter;
    await speichern(c);
    dialog = null;
    zeigeRueckgaengig(text, async () => { await speichern(vorher); });
  }

  function gefechtStarten() {
    if (modus === 'aufstieg') modus = 'lesen';
    dialog = { art: 'start' };
  }

  function gefechtEndeFrage() {
    if (gefecht) dialog = { art: 'ende' };
  }

  /** Frist einer blutenden Wunde abgelaufen (konzept.md § 3.10, § 4.8): Bericht vor der Änderung. */
  function fristFrage(wundId: string) {
    if (!aktiv) return;
    const c = aktiv;
    const w = c.spielstand.wunden.find((x) => x.id === wundId);
    if (!w) return;
    const f = fristablauf(c, wundId, daten!);
    const b = blutungsart(w, daten!);
    const zeilen: Zeile[] = [{ text: `Die Frist der Wunde (${wundenText(w, daten!)}) ist abgelaufen, ohne dass die Blutung gestoppt wurde.` }];
    if (b?.art.bei_ablauf === 'tod') zeilen.push({ text: 'Du verblutest. Dein Charakter ist tot.', fett: true });
    else {
      zeilen.push({ text: `Die Wunde blutet noch einmal: ${f.schaden} Schaden, er zählt zur Wunde (jetzt ${w.schaden + f.schaden}). Danach hört sie auf zu bluten.` });
      zeilen.push({ text: `HP ${f.hp_vorher} → ${f.hp_nachher}.`, fett: true });
      if (f.tot) zeilen.push({ text: 'Damit bist du tot.', fett: true });
      else if (f.kampfunfaehig) zeilen.push({ text: 'Damit bist du kampfunfähig.', fett: true });
      zeilen.push({ text: 'Die Wunde ist nicht versorgt; sie heilt erst, wenn sie versorgt ist.' });
    }
    bericht = { titel: 'Frist abgelaufen', zeilen, weiter: () => { void speichern(fristAblaufen(c, wundId, daten!)); bericht = null; } };
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

  /** Geblendet (Sprengwirkung, Blendung): Wirkung und Ende; die SL kann es früher beenden. */
  function geblendetFrage() {
    if (!aktiv || !gefecht) return;
    const c = aktiv;
    const bis = gefecht.geblendet_bis!;
    bericht = {
      titel: 'Geblendet',
      zeilen: [
        { text: 'Für dich gilt die Sichtstufe keine, unabhängig vom Licht. Antizipation geht nur über das Gehör.' },
        { text: bis === gefecht.runde ? 'Das endet am Ende dieser Runde.' : `Das endet am Ende von Runde ${bis}.` },
        { text: 'Sagt die SL, dass es schon vorbei ist? Dann beende es hier.', fett: true }
      ],
      knopf: 'Beenden',
      weiter: () => { void speichern(geblendetBeenden(c)); bericht = null; }
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

  function reiterKlappen(zu: boolean) {
    void einstellungenSetzen({ ...einstellungen, reiterEingeklappt: zu });
  }
  /** Höhe der Kopfzeile: bis dorthin darf die Lasche der Reiterleiste nach oben gezogen werden. */
  let kopfHoehe = $state(0);

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
    <header class="kopfzeile" class:im-gefecht={!!gefecht} bind:offsetHeight={kopfHoehe}>
      <button class="flach" aria-label="Menü öffnen" onclick={() => (menueOffen = true)}>☰</button>
      <div class="titel">
        <strong>{aktiv.name || 'ohne Namen'}</strong>
      </div>
      <div class="modus">
        {#if gefecht}
          <button class="flach initiative" onclick={() => (dialog = { art: 'initiative' })}>
            <small>Runde {gefecht.runde} · Initiative</small>
            <span>{gefecht.initiative ? ansage(gefecht.initiative.stufe, gefecht.initiative.wurf, gefecht.initiative.zielwert) : 'würfeln'}</span>
          </button>
        {/if}
        {#if modus !== 'lesen'}
          <span class="status an">{MODUS_NAME[modus]}</span>
          <button class="betont klein" onclick={() => (modus = 'lesen')}>Fertig</button>
        {/if}
      </div>
    </header>

    <main class="bogen">
      {#if reiter === 'figur'}
        <Figur c={aktiv} d={daten} ongetroffen={() => (dialog = { art: 'getroffen' })} ondeckung={() => (dialog = { art: 'deckung' })}
          onereignis={() => (dialog = { art: 'ereignis' })}
          onversorgen={(id) => (dialog = { art: 'versorgen', wundId: id })} onfrist={fristFrage}
          onnachsorge={(id) => (dialog = { art: 'nachsorge', wundId: id })} onruhe={() => (dialog = { art: 'ruhe' })}
          {kampfunfaehig} ongefechtstart={gefechtStarten} onnaechsteRunde={() => (dialog = { art: 'runde' })} ongefechtende={gefechtEndeFrage}
          onschock={schockFrage} ongeblendet={geblendetFrage} onreizgas={() => (dialog = { art: 'reizgas' })} />
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

    <div class="unten" class:im-gefecht={!!gefecht && reiter === 'figur'}>
    {#if rueckgaengigText}
      <div class="toast karte rueck" role="status">
        <span>{rueckgaengigText}</span>
        <button class="flach link" onclick={zuruecknehmen}>Rückgängig</button>
      </div>
    {:else if meldung}<div class="toast karte" role="status">{meldung}</div>{/if}
    <!-- Rad und Aktionsleiste nur im Reiter Figur (Wunsch des Nutzers, 18.11.2026). -->
    {#if gefecht && reiter === 'figur'}
      {#if overTheEdge(gefecht.leiter, daten.regeln)}
        <div class="banner" role="status">Over the Edge: nur 1 Aktion pro Runde</div>
      {/if}
      <!-- Rad über der Aktionsleiste: am unteren Bildschirmrand fängt Android waagerechtes Wischen als App-Wechsel ab. -->
      <Adrenalinrad stand={gefecht.leiter} d={daten} onsetzen={leiterDrehen} ondetail={() => (dialog = { art: 'detail' })} />
      <Aktionsleiste c={aktiv} d={daten} {kampfunfaehig} onaendern={aendern} onoeffnen={aktionOeffnen} />
    {/if}
    <Reiterleiste {reiter} eingeklappt={einstellungen.reiterEingeklappt} onwahl={(r) => (reiter = r)} onklappen={reiterKlappen}
      laschenHoehe={einstellungen.laschenHoehe} {kopfHoehe} onlasche={(h) => void einstellungenSetzen({ ...einstellungen, laschenHoehe: h })} />
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
    {:else if dialog.art === 'versorgen'}
      <Versorgen c={aktiv} d={daten} wundId={dialog.wundId} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'nachsorge' && !gefecht}
      <Nachsorge c={aktiv} d={daten} wundId={dialog.wundId} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'ruhe' && !gefecht}
      <Ruhe c={aktiv} d={daten} wuerfelModus={probeModus} onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'nahkampf' && gefecht}
      <Nahkampfangriff c={aktiv} d={daten} als={dialog.als} {zonenModus} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'werfen' && gefecht}
      <Werfen c={aktiv} d={daten} als={dialog.als} wuerfelModus={probeModus} onaendern={aendern}
        onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'deckung'}
      <Deckung c={aktiv} d={daten} onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'ende' && gefecht}
      <GefechtBeenden c={aktiv} d={daten} onfertig={(c) => { void speichern(c); dialog = null; }} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'ereignis' && gefecht}
      <Ereignis c={aktiv} d={daten} onfertig={ereignisFertig} onaendern={aendern} onreizgas={() => (dialog = { art: 'reizgas' })} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'reizgas' && gefecht}
      <Reizgas c={aktiv} d={daten} wuerfelModus={probeModus} onaendern={aendern} onfertig={(c) => nachAblauf(c)} onabbrechen={() => (dialog = null)} />
    {:else if dialog.art === 'getroffen'}
      <Getroffen c={aktiv} d={daten} {zonenModus} wuerfelModus={probeModus} onaendern={aendern} onfertig={trefferFertig} onabbrechen={() => (dialog = null)} />
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
        onrueckgaengig={() => { void speichern(rueckgaengig(aktiv!, daten!)); dialog = null; }} onschliessen={() => (dialog = null)} />
    {/if}
  {/if}

  <Menue offen={menueOffen} {charaktere} {aktiveId} klassen={daten.klassen.eintraege} {einstellungen}
    appVersion={APP_VERSION} datenstand={datenstand(daten)}
    onschliessen={() => (menueOffen = false)} onwechseln={oeffne} onneu={erstellen} onimportieren={importieren}
    onexportieren={exportieren} onduplizieren={duplizieren} onloeschen={loeschen} oneinstellungen={einstellungenSetzen}
    modus={aktiv && !inErstellung ? modus : null} {imGefecht}
    onmodus={(m) => { modus = m; menueOffen = false; if (m !== 'lesen') reiter = 'werte'; }} onsession={sessionFrage} />

  {#if bericht}
    <Bericht titel={bericht.titel} zeilen={bericht.zeilen} weiter={bericht.knopf} onweiter={bericht.weiter} onzurueck={() => (bericht = null)} />
  {/if}
{/if}

{#if $needRefresh}
  <div class="update karte" role="status">
    <span>Eine neue Version ist da.</span>
    <button class="betont" onclick={() => updateServiceWorker(true)}>Jetzt laden</button>
  </div>
{/if}

<style>
  .mitte { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 16px; text-align: center; }
  .kopfzeile { display: flex; align-items: center; gap: 8px; padding: calc(4px + env(safe-area-inset-top)) 8px 4px;
    background: var(--flaeche); border-bottom: 1px solid var(--linie); position: sticky; top: 0; z-index: 5; }
  .titel { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .titel strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Name der Figur und Banner Over the Edge in der Schablonenschrift wie die Überschriften (app.css). */
  .titel strong, .banner { font-family: var(--schrift-titel); font-weight: 400; font-synthesis: none; text-transform: uppercase; letter-spacing: 0.03em; }
  .titel strong { font-size: 1.15rem; }
  .modus { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .status.an { color: var(--akzent); box-shadow: inset 0 0 0 2px var(--akzent); font-weight: 400; }
  .klein { min-height: 40px; padding: 0 12px; }
  .status { font-size: 0.8rem; padding: 2px 8px; border-radius: 999px; background: var(--flaeche-2); color: var(--text-2); }
  .bogen { flex: 1; padding: var(--abstand-3); display: flex; flex-direction: column; gap: var(--abstand-3); }
  .unten { position: sticky; bottom: 0; z-index: 5; }
  /* Gefecht: Kopfzeile und untere Leisten tragen einen Akzentrand. */
  .kopfzeile.im-gefecht { border-bottom: 2px solid var(--akzent); }
  .unten.im-gefecht { border-top: 2px solid var(--akzent); }
  /* Schriftzug „IM GEFECHT“ klein in der Zahlenschrift genau auf der oberen Linie, links auf Höhe der Figur (Wunsch 19.11.2026).
     Die Fläche dahinter unterbricht die Linie; sie ist halb Kopfzeile, halb Seitengrund, damit nichts übersteht. */
  .kopfzeile.im-gefecht::after {
    content: 'IM GEFECHT'; position: absolute; left: var(--abstand-4); z-index: 2; pointer-events: none;
    padding: 0 var(--abstand-1); font-family: var(--schrift-zahl); font-size: 0.7rem; line-height: 1; letter-spacing: 0.12em;
    color: var(--akzent); }
  /* Mitte des Schriftzugs auf der Mitte der 2 px starken Linie. */
  .kopfzeile.im-gefecht::after { bottom: -1px; transform: translateY(50%); background: linear-gradient(var(--flaeche) 50%, var(--hg) 50%); }
  .toast { position: absolute; left: 16px; right: 16px; bottom: calc(100% + 8px); z-index: 15; }
  .rueck { display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 4px 4px 16px; }
  .banner { background: var(--flaeche); color: var(--gefahr); border-top: 2px solid var(--gefahr); text-align: center; font-weight: 400; padding: var(--abstand-1); }
  .kopfzeile { flex-wrap: wrap; }
  .titel { flex-wrap: wrap; }
  /* Runde und Initiative als Info oben rechts in der Kopfzeile; antippbar (öffnet die Initiative). */
  .initiative { padding: 0 var(--abstand-1); min-height: 40px; display: flex; flex-direction: column; align-items: flex-end; justify-content: center;
    line-height: 1.15; text-align: right; font-weight: 400; font-size: 0.9rem; }
  .initiative span { font-family: var(--schrift-zahl); }
  .initiative small { font-size: 0.75rem; font-weight: 400; color: var(--text-2); }
  .update { position: fixed; left: 16px; right: 16px; bottom: calc(72px + env(safe-area-inset-bottom)); z-index: 50;
    display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: var(--abstand-3); }
  .datenfehler { margin: var(--abstand-2) var(--abstand-3) 0; border-color: var(--gefahr); display: block; }
  .datenfehler summary { color: var(--gefahr); font-weight: 400; min-height: 44px; display: flex; align-items: center; }
</style>
