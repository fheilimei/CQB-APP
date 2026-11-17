<script lang="ts">
  // Schritt 4: Mindestskills und vorgegebene Perks der Klasse; Meister wählen zwei Skills auf 5, einer exklusiv.
  import type { Spieldaten } from '../../daten/typen';
  import { basisPerks, basisSkills, erstellungsklasse, meisterExklusiv, meisterWahlOptionen } from '../../regeln/erstellung';
  import type { Charakter } from '../../speicher/charakter';
  import Begriff from '../Begriff.svelte';
  import { perkName, skillName } from '../texte';

  interface Props { c: Charakter; d: Spieldaten }
  let { c = $bindable(), d }: Props = $props();
  const e = $derived(c.erstellung!);
  const k = $derived(erstellungsklasse(e, d));
  const wahl = $derived(k?.mindestskills_wahl);
  const skills = $derived(Object.entries(basisSkills({ ...e, meister_skills: [] }, d)).sort((a, b) => b[1] - a[1]));
  const perks = $derived(basisPerks(e, d));
  const optionen = $derived(meisterWahlOptionen(e, d));
  const exklusiv = $derived(meisterExklusiv(e, d));

  function umschalten(id: string) {
    const liste = e.meister_skills.includes(id) ? e.meister_skills.filter((x) => x !== id) : [...e.meister_skills, id];
    if (wahl && liste.length > wahl.anzahl) return;
    c.erstellung = { ...e, meister_skills: liste };
  }
</script>

{#if !k}
  <p class="hinweis">Ohne Klasse gibt es keine Mindestskills und keine vorgegebenen Perks. Skills und Perks kaufst du im nächsten Schritt mit freien Punkten.</p>
{:else}
  <h3>Mindestskills</h3>
  {#if skills.length}
    <ul class="liste">
      {#each skills as [id, stufe] (id)}
        <li><Begriff art="skill" name={skillName(id, d)} darstellung={d.darstellung} /><strong>{stufe}</strong></li>
      {/each}
    </ul>
  {:else}
    <p class="hinweis">Keine.</p>
  {/if}

  <h3>Vorgegebene Perks</h3>
  {#if perks.length}
    <ul class="liste">{#each perks as id (id)}<li><Begriff art="perk" name={perkName(id, d)} darstellung={d.darstellung} /></li>{/each}</ul>
  {:else}
    <p class="hinweis">Keine vorgegeben.</p>
  {/if}

  {#if wahl}
    <h3>{wahl.anzahl} Skills auf {wahl.wert}</h3>
    <p class="hinweis">Davon {wahl.davon_exklusiv === 1 ? 'einer' : wahl.davon_exklusiv} ein exklusiver Skill deiner Spezialisierung (markiert). Gewählt: {e.meister_skills.length} von {wahl.anzahl}.</p>
    <ul class="liste wahl">
      {#each optionen as id (id)}
        {@const an = e.meister_skills.includes(id)}
        <li>
          <button class="zeile" class:an aria-pressed={an} disabled={!an && e.meister_skills.length >= wahl.anzahl} onclick={() => umschalten(id)}>
            <Begriff art="skill" name={skillName(id, d)} darstellung={d.darstellung} />
            <span class="hinweis">{exklusiv.includes(id) ? 'exklusiv' : ''}{an ? ' ✓' : ''}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  h3 { margin: 20px 0 8px; }
  .liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .liste li { display: flex; justify-content: space-between; align-items: center; min-height: 32px; }
  .wahl li { min-height: 0; }
  .zeile { width: 100%; display: flex; justify-content: space-between; align-items: center; text-align: left; }
  .zeile.an { border-color: var(--akzent); box-shadow: inset 0 0 0 2px var(--akzent); }
</style>
