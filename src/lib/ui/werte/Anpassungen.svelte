<script lang="ts">
  // Dauerhafte Anpassungen der SL (konzept.md § 3.0a, Schreibmodus; § 3.0b, Zeichen ★).
  // Anlegen, ab- und anschalten, löschen nur im Schreibmodus; sonst nur Anzeige, wenn es welche gibt.
  import type { Modifikator, Spieldaten } from '../../daten/typen';
  import type { Anpassungsaktion } from '../../regeln/korrektur';
  import type { Charakter } from '../../speicher/charakter';
  import { grundwertName, wirkungText, zielText, type Modus } from '../texte';

  interface Props {
    c: Charakter; d: Spieldaten; modus: Modus;
    onanpassen: (a: Anpassungsaktion) => void; onspringe: (art: string, id: string) => void;
  }
  let { c, d, modus, onanpassen, onspringe }: Props = $props();

  const stern = $derived(d.darstellung.herkunft.anpassung!);
  const schreiben = $derived(modus === 'schreiben');

  // ---- Formular für eine neue Anpassung
  let grund = $state('');
  let ziel = $state('');
  let richtung = $state<'bonus' | 'malus'>('bonus');
  let anzahl = $state(1);
  const zielArt = $derived(ziel.split(':')[0] as Modifikator['ziel']['art'] | '');
  const istGrundwert = $derived(zielArt === 'grundwert');
  const fehlt = $derived(!grund.trim() ? 'Grund fehlt' : !ziel ? 'Ziel wählen' : '');

  function anlegen() {
    if (fehlt) return;
    const [art, id] = ziel.split(':') as [Modifikator['ziel']['art'], string | undefined];
    const wirkung: Modifikator['wirkung'] = istGrundwert
      ? { wert: richtung === 'bonus' ? anzahl : -anzahl }
      : richtung === 'bonus' ? { stepshields: anzahl } : { malsteps: anzahl };
    onanpassen({ art: 'neu', anpassung: { ziel: id ? { art, id } : { art }, wirkung, grund: grund.trim() } });
    grund = ''; ziel = ''; richtung = 'bonus'; anzahl = 1;
  }

  function loeschen(id: string, name: string) {
    if (confirm(`Anpassung „${name}“ löschen?`)) onanpassen({ art: 'loeschen', id });
  }
</script>

{#if schreiben || c.anpassungen.length}
  <section class="karte">
    <h2>Anpassungen der SL</h2>
    <ul class="zeilen">
      {#each c.anpassungen as a (a.id)}
        <li id="anpassung-{a.id}" class="anpassung" class:aus={!a.aktiv}>
          <div>
            <strong><span style:color={stern.farbe}>{stern.zeichen}</span> {a.grund}</strong>
            <span class="hinweis">
              {#if a.ziel.art === 'grundwert' || a.ziel.art === 'stat' || a.ziel.art === 'skill'}
                <button class="link flach" onclick={() => onspringe(a.ziel.art, a.ziel.id!)}>{zielText(a, d)}</button>
              {:else}{zielText(a, d)}{/if}
              {wirkungText(a)}{a.aktiv ? '' : ' · abgeschaltet'}
            </span>
          </div>
          {#if schreiben}
            <div class="knoepfe">
              <label class="schalter"><input type="checkbox" checked={a.aktiv}
                onchange={(e) => onanpassen({ art: 'aktiv', id: a.id, aktiv: (e.target as HTMLInputElement).checked })} /> wirkt</label>
              <button class="gefahr" aria-label="Anpassung {a.grund} löschen" onclick={() => loeschen(a.id, a.grund)}>Löschen</button>
            </div>
          {/if}
        </li>
      {:else}
        <li class="hinweis">Keine Anpassungen.</li>
      {/each}
    </ul>

    {#if schreiben}
      <details class="neu">
        <summary>Neue Anpassung</summary>
        <label for="anp-grund">Grund</label>
        <input id="anp-grund" bind:value={grund} placeholder="z. B. Bonus der SL: Ortskenntnis" />
        <label for="anp-ziel">Wirkt auf</label>
        <select id="anp-ziel" bind:value={ziel}>
          <option value="" disabled>– wählen –</option>
          <optgroup label="Grundwerte">
            {#each Object.keys(d.regeln.grundwerte) as id (id)}<option value="grundwert:{id}">{grundwertName(id, d)}</option>{/each}
          </optgroup>
          <optgroup label="Proben auf einen Stat">
            {#each d.stats.eintraege as s (s.id)}<option value="stat:{s.id}">{d.darstellung.typen.stat.zeichen} {s.name}</option>{/each}
          </optgroup>
          <optgroup label="Proben mit einem Skill">
            {#each d.skills.eintraege as s (s.id)}<option value="skill:{s.id}">{d.darstellung.typen.skill.zeichen} {s.name}</option>{/each}
          </optgroup>
          <option value="alle">alle Proben</option>
        </select>
        <div class="wahl" role="group" aria-label="Art der Anpassung">
          <span>Art:</span>
          <button class:an={richtung === 'bonus'} aria-pressed={richtung === 'bonus'} onclick={() => (richtung = 'bonus')}>
            {istGrundwert ? 'erhöhend (+)' : 'erleichternd (▲)'}</button>
          <button class:an={richtung === 'malus'} aria-pressed={richtung === 'malus'} onclick={() => (richtung = 'malus')}>
            {istGrundwert ? 'senkend (−)' : 'erschwerend (▼)'}</button>
        </div>
        <div class="wahl">
          <span>{istGrundwert ? (ziel === 'grundwert:wurfweite_band' ? 'Bänder' : 'Betrag') : richtung === 'bonus' ? 'Stepshields' : 'Malsteps'}:</span>
          <span class="stepper">
            <button aria-label="weniger" disabled={anzahl <= 1} onclick={() => anzahl--}>−</button>
            <strong>{anzahl}</strong>
            <button aria-label="mehr" disabled={anzahl >= 5} onclick={() => anzahl++}>+</button>
          </span>
        </div>
        <button class="haupt breit" onclick={anlegen} disabled={!!fehlt}>{fehlt || 'Anpassung anlegen'}</button>
      </details>
    {/if}
  </section>
{/if}

<style>
  .anpassung { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 0; flex-wrap: wrap; }
  .anpassung > div:first-child { display: flex; flex-direction: column; min-width: 0; }
  .aus { opacity: 0.6; }
  .knoepfe { display: flex; align-items: center; gap: 8px; }
  .neu { margin-top: 12px; border-top: 1px solid var(--linie); padding-top: 4px; }
  .neu summary { min-height: 44px; display: flex; align-items: center; font-weight: 600; cursor: pointer; }
  .wahl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .wahl button.an { border-color: var(--akzent); box-shadow: inset 0 0 0 2px var(--akzent); font-weight: 600; }
  .breit { width: 100%; margin-top: 16px; }
</style>
