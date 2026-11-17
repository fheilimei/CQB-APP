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

  const aktiv = $derived(charaktere.find((c) => c.id === aktiveId) ?? null);
  /** Charakter in Erstellung: neuer, noch ungespeicherter Entwurf oder ein gespeicherter Entwurf. */
  const inErstellung = $derived(entwurf ?? (aktiv?.status === 'erstellung' ? aktiv : null));
  const entwuerfe = $derived(charaktere.filter((c) => c.status === 'erstellung'));
  const abweichungModus = $derived(modusFuer('abweichung', einstellungen.wuerfeln));
  const imGefecht = $derived(!!aktiv?.spielstand.gefecht.aktiv);

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
      </div>
      {#if modus !== 'lesen'}
        <div class="modus">
          <span class="status an">{MODUS_NAME[modus]}</span>
          <button class="haupt klein" onclick={() => (modus = 'lesen')}>Fertig</button>
        </div>
      {/if}
    </header>

    <main class="bogen">
      {#if reiter === 'figur'}
        <section class="karte">
          <h2>{aktiv.name}</h2>
          {#if aktiv.aussehen}<p>{aktiv.aussehen}</p>{/if}
          <p class="hinweis">Hier entsteht die Figur mit Silhouette. Deine Werte findest du im Reiter Werte.</p>
        </section>
      {:else if reiter === 'werte'}
        <Werte c={aktiv} d={daten} {modus} {abweichungModus} onaendern={aendern} />
      {:else}
        <section class="karte"><p class="hinweis">Dieser Reiter folgt in einer der nächsten Versionen.</p></section>
      {/if}
    </main>

    <nav class="reiter" aria-label="Reiter">
      {#each [['figur', 'Figur'], ['werte', 'Werte'], ['ausruestung', 'Ausrüstung'], ['verlauf', 'Verlauf']] as [id, text] (id)}
        <button class="flach" class:an={reiter === id} aria-current={reiter === id ? 'page' : undefined}
          onclick={() => (reiter = id as typeof reiter)}>{text}</button>
      {/each}
    </nav>

    {#if meldung}<div class="toast karte" role="status">{meldung}</div>{/if}
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
  .bogen { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .bogen h2 { margin-top: 0; }
  .reiter { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--flaeche); border-top: 1px solid var(--linie);
    position: sticky; bottom: 0; padding-bottom: env(safe-area-inset-bottom); }
  .reiter button { border-radius: 0; padding: 0 4px; font-size: 0.9rem; color: var(--text-2); min-height: 56px; }
  .reiter button.an { color: var(--akzent); font-weight: 700; box-shadow: inset 0 3px 0 var(--akzent); }
  .toast { position: fixed; left: 16px; right: 16px; bottom: calc(72px + env(safe-area-inset-bottom)); z-index: 15; }
  .update { position: fixed; left: 16px; right: 16px; bottom: calc(72px + env(safe-area-inset-bottom)); z-index: 50;
    display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .datenfehler { margin: 8px 16px 0; border-color: var(--gefahr); }
  .datenfehler summary { color: var(--gefahr); font-weight: 600; min-height: 44px; display: flex; align-items: center; }
</style>
