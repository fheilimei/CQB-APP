<script lang="ts">
  // Menü ☰ (konzept.md § 3.0g): Seitenleiste von links; schließt mit Wischen nach links oder Tipp daneben.
  import type { Charakter } from '../speicher/charakter';
  import type { Einstellungen } from '../speicher/ablage';
  import { WUERFELSTELLEN, modusFuer, type Wuerfelstelle } from '../wuerfel/wuerfel';
  import type { Klasse } from '../daten/typen';
  import type { Modus } from './texte';

  interface Props {
    offen: boolean;
    charaktere: Charakter[];
    aktiveId: string | null;
    klassen: Klasse[];
    einstellungen: Einstellungen;
    appVersion: string;
    datenstand: string;
    onschliessen: () => void;
    onwechseln: (id: string) => void;
    onneu: () => void;
    onimportieren: () => void;
    onexportieren: (c: Charakter) => void;
    onduplizieren: (c: Charakter) => void;
    onloeschen: (c: Charakter) => void;
    oneinstellungen: (e: Einstellungen) => void;
    /** Modus des aktiven Charakters; null, wenn kein fertiger Charakter offen ist. */
    modus: Modus | null;
    imGefecht: boolean;
    onmodus: (m: Modus) => void;
    onsession: () => void;
  }
  let p: Props = $props();

  let ansicht = $state<'haupt' | 'einstellungen' | 'ueber'>('haupt');
  let aktionenFuer = $state<string | null>(null);
  let loeschKandidat = $state<Charakter | null>(null);
  let loeschEingabe = $state('');

  function klassenname(c: Charakter): string {
    const id = c.klassenweg.at(-1)?.klasse;
    return id ? (p.klassen.find((k) => k.id === id)?.name ?? id) : (c.status === 'erstellung' ? 'Entwurf' : 'ohne Klasse');
  }

  let startX = 0;
  function wischStart(e: TouchEvent) { startX = e.touches[0]?.clientX ?? 0; }
  function wischEnde(e: TouchEvent) {
    const x = e.changedTouches[0]?.clientX ?? 0;
    if (startX - x > 60) p.onschliessen();
  }

  function setzeDarstellung(d: Einstellungen['darstellung']) {
    p.oneinstellungen({ ...p.einstellungen, darstellung: d });
  }
  function setzeWuerfeln(stelle: Wuerfelstelle, quelle: 'app' | 'hand') {
    p.oneinstellungen({ ...p.einstellungen, wuerfeln: { ...p.einstellungen.wuerfeln, [stelle]: quelle } });
  }
  function bestaetigeLoeschen() {
    if (loeschKandidat && loeschEingabe.trim() === loeschKandidat.name.trim()) {
      p.onloeschen(loeschKandidat);
      loeschKandidat = null;
      loeschEingabe = '';
    }
  }
  $effect(() => { if (!p.offen) { ansicht = 'haupt'; aktionenFuer = null; } });
</script>

{#if p.offen}
  <div class="schleier" onclick={p.onschliessen} role="presentation"></div>
  <nav class="leiste" aria-label="Menü" ontouchstart={wischStart} ontouchend={wischEnde}>
    {#if ansicht === 'haupt'}
      <div class="kopf"><h2>Menü</h2><button class="flach" aria-label="Menü schließen" onclick={p.onschliessen}>✕</button></div>

      <div class="titelzeile">
        <h3>Charaktere</h3>
        <div class="knoepfe">
          <button class="klein" onclick={p.onneu}>+ Neu</button>
          <button class="klein" onclick={p.onimportieren}>Importieren</button>
        </div>
      </div>
      <ul class="liste">
        {#each p.charaktere as c (c.id)}
          {@const offen = aktionenFuer === c.id}
          <li class:aktiv={c.id === p.aktiveId}>
            <button class="flach zeile" onclick={() => p.onwechseln(c.id)}>
              <span class="name">{c.name || 'ohne Namen'}</span>
              <span class="hinweis">{klassenname(c)}</span>
            </button>
            <button class="flach" aria-label="Aktionen für {c.name}" aria-expanded={offen}
              onclick={() => (aktionenFuer = offen ? null : c.id)}><span class="klapppfeil" aria-hidden="true">›</span></button>
          </li>
          {#if offen}
            <li class="aktionen">
              <button class="klein" onclick={() => p.onexportieren(c)}>Exportieren</button>
              <button class="klein" onclick={() => p.onduplizieren(c)}>Duplizieren</button>
              <button class="klein gefahr" onclick={() => { loeschKandidat = c; loeschEingabe = ''; }}>Löschen</button>
            </li>
          {/if}
        {/each}
      </ul>

      {#if p.modus}
        <h3>Modus</h3>
        <div class="knoepfe">
          <button class="klein" aria-pressed={p.modus === 'aufstieg'} disabled={p.imGefecht}
            onclick={() => p.onmodus(p.modus === 'aufstieg' ? 'lesen' : 'aufstieg')}>Aufstieg</button>
          <button class="klein" aria-pressed={p.modus === 'schreiben'}
            onclick={() => p.onmodus(p.modus === 'schreiben' ? 'lesen' : 'schreiben')}>Schreibmodus</button>
          <button class="klein" onclick={p.onsession}>Session abschließen</button>
        </div>
        {#if p.imGefecht}<p class="hinweis">Im Gefecht ist der Aufstieg gesperrt.</p>{/if}
      {/if}

      <h3>Weiteres</h3>
      <button class="flach eintrag" onclick={() => (ansicht = 'einstellungen')}>Einstellungen</button>
      <button class="flach eintrag" onclick={() => (ansicht = 'ueber')}>Über die App</button>
    {:else if ansicht === 'einstellungen'}
      <div class="kopf"><button class="flach" onclick={() => (ansicht = 'haupt')}>‹ Zurück</button><h2>Einstellungen</h2></div>
      <h3>Darstellung</h3>
      <div class="umschalter" role="group" aria-label="Darstellung">
        {#each [['system', 'wie System'], ['hell', 'hell'], ['dunkel', 'dunkel']] as [wert, text] (wert)}
          <button aria-pressed={p.einstellungen.darstellung === wert}
            onclick={() => setzeDarstellung(wert as Einstellungen['darstellung'])}>{text}</button>
        {/each}
      </div>
      <h3>Würfeln</h3>
      {#each Object.entries(WUERFELSTELLEN) as [stelle, info] (stelle)}
        {@const m = modusFuer(stelle as Wuerfelstelle, p.einstellungen.wuerfeln)}
        <p class="stelle">{info.name}:</p>
        <div class="umschalter" role="group" aria-label="Würfeln: {info.name}">
          <button aria-pressed={m === 'app'} onclick={() => setzeWuerfeln(stelle as Wuerfelstelle, 'app')}>App würfelt</button>
          <button aria-pressed={m === 'hand'} onclick={() => setzeWuerfeln(stelle as Wuerfelstelle, 'hand')}>von Hand</button>
        </div>
      {/each}
    {:else}
      <div class="kopf"><button class="flach" onclick={() => (ansicht = 'haupt')}>‹ Zurück</button><h2>Über die App</h2></div>
      <p>App-Version {p.appVersion}<br />Datenstand {p.datenstand}</p>
      <p class="hinweis">Neue Versionen lädt die App beim nächsten Start mit Netz. Steht ein Update bereit, erscheint unten ein Hinweis; ein Tipp darauf lädt es.</p>
      <h3>Sicherung</h3>
      <p class="hinweis">Charaktere liegen nur auf diesem Gerät. Wird der Browser-Speicher gelöscht, sind sie weg. Exportiere deshalb regelmäßig: Menü → Pfeil › neben dem Charakter → Exportieren. Die Datei lässt sich auf jedem Gerät mit „Importieren“ wieder öffnen.</p>
    {/if}
  </nav>
{/if}

{#if loeschKandidat}
  <div class="schleier oben" role="presentation"></div>
  <div class="dialog karte" role="alertdialog" aria-labelledby="loeschtitel">
    <h3 id="loeschtitel">„{loeschKandidat.name}“ löschen?</h3>
    <p>Das lässt sich nicht rückgängig machen. Zur Bestätigung den Namen eintippen:</p>
    <input bind:value={loeschEingabe} autocomplete="off" aria-label="Name zur Bestätigung" />
    <div class="zwei">
      <button onclick={() => (loeschKandidat = null)}>Abbrechen</button>
      <button class="gefahr" disabled={loeschEingabe.trim() !== loeschKandidat.name.trim()} onclick={bestaetigeLoeschen}>Endgültig löschen</button>
    </div>
  </div>
{/if}

<style>
  .schleier { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); z-index: 10; }
  .schleier.oben { z-index: 30; }
  .leiste { position: fixed; top: 0; bottom: 0; left: 0; width: min(86vw, 360px); background: var(--hg); z-index: 20;
    overflow-y: auto; padding: calc(8px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));
    box-shadow: 4px 0 24px rgb(0 0 0 / 0.3); animation: rein 160ms ease-out; }
  @keyframes rein { from { transform: translateX(-100%); } }
  .kopf { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .kopf h2 { margin: 0; flex: 1; }
  h3 { margin: 20px 0 8px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-2); }
  .liste { list-style: none; margin: 0; padding: 0; }
  .liste li { display: flex; align-items: center; border-radius: var(--radius); }
  .liste li.aktiv { background: var(--flaeche-2); }
  .zeile { flex: 1; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; text-align: left; padding: 6px 12px; }
  .name { font-weight: 400; }
  /* Aufgeklappte Aktionen: eingerückt, mit Linie links, damit sie sichtbar zum Charakter darüber gehören. */
  .aktionen { gap: var(--abstand-2); flex-wrap: wrap; margin: var(--abstand-1) 0 var(--abstand-2) var(--abstand-3);
    padding-left: var(--abstand-2); border-left: 2px solid var(--akzent); border-radius: 0; }
  .titelzeile { display: flex; align-items: center; justify-content: space-between; gap: var(--abstand-2); margin: 20px 0 8px; }
  .titelzeile h3 { margin: 0; }
  .knoepfe { display: flex; flex-wrap: wrap; gap: var(--abstand-2); }
  /* Kleine Knöpfe: schmaler und kleinere Schrift, Tippfläche bleibt 44 px hoch. */
  button.klein { padding: 0 var(--abstand-2); font-size: 0.85rem; }
  .zwei { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  .eintrag { width: 100%; text-align: left; }
  .stelle { margin: 12px 0 6px; }
  .dialog { position: fixed; left: 16px; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 40; }
  .dialog h3 { text-transform: none; letter-spacing: 0; font-size: 1.1rem; color: var(--text); margin-top: 0; }
</style>
