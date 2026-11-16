<script lang="ts">
  import { onMount } from 'svelte';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import { datenstand, ladeSpieldaten } from './lib/daten/laden';
  import type { Spieldaten } from './lib/daten/typen';
  import { Ablage, STANDARD_EINSTELLUNGEN, type Einstellungen } from './lib/speicher/ablage';
  import { dateiname, exportiereText, importiereText } from './lib/speicher/austausch';
  import { neuerCharakter, type Charakter } from './lib/speicher/charakter';
  import { dateiOeffnen, dateiSpeichern } from './lib/ui/datei';
  import Menue from './lib/ui/Menue.svelte';
  import NameSchritt from './lib/ui/NameSchritt.svelte';
  import Start from './lib/ui/Start.svelte';

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

  const aktiv = $derived(charaktere.find((c) => c.id === aktiveId) ?? null);

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
    await ablage!.speichern(c);
    const kopie = $state.snapshot(c) as Charakter;
    charaktere = charaktere.some((x) => x.id === c.id) ? charaktere.map((x) => (x.id === c.id ? kopie : x)) : [...charaktere, kopie];
  }

  async function oeffne(id: string) {
    aktiveId = id;
    menueOffen = false;
    reiter = 'figur';
    await ablage!.setzeZuletztGeoeffnet(id);
  }

  function erstellen() {
    entwurf = neuerCharakter(daten!.stats.eintraege.map((s) => s.id));
    menueOffen = false;
  }

  async function nameFertig(name: string, aussehen: string) {
    const c = { ...$state.snapshot(entwurf!), name, aussehen } as Charakter;
    await speichern(c);
    entwurf = null;
    await oeffne(c.id);
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
    if (aktiveId === c.id) aktiveId = charaktere[0]?.id ?? null;
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

  {#if entwurf}
    <NameSchritt name={entwurf.name} aussehen={entwurf.aussehen} onweiter={nameFertig} onzurueck={() => (entwurf = null)} />
  {:else if !aktiv}
    <Start onerstellen={erstellen} onimportieren={importieren} meldung={meldung} />
  {:else}
    <header class="kopfzeile">
      <button class="flach" aria-label="Menü öffnen" onclick={() => (menueOffen = true)}>☰</button>
      <div class="titel">
        <strong>{aktiv.name || 'ohne Namen'}</strong>
        {#if aktiv.status === 'erstellung'}<span class="status">Entwurf</span>{/if}
      </div>
    </header>

    <main class="bogen">
      {#if reiter === 'figur'}
        <section class="karte">
          <h2>{aktiv.name}</h2>
          {#if aktiv.aussehen}<p>{aktiv.aussehen}</p>{/if}
          <p class="hinweis">Hier entsteht der Bogen. In dieser Version funktionieren: Charaktere anlegen (Name und Aussehen), wechseln, exportieren, importieren, duplizieren und löschen; Darstellung hell/dunkel; Offline-Betrieb.</p>
        </section>
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
    onexportieren={exportieren} onduplizieren={duplizieren} onloeschen={loeschen} oneinstellungen={einstellungenSetzen} />
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
