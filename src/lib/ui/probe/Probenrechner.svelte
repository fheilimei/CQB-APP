<script lang="ts">
  // Probenrechner (konzept.md § 3.6): Stat (Pflicht), Skill (optional, austauschbar), Lage ohne Entfernung, Wurf.
  // Er ändert nichts am Charakter außer den Steps der SL für das ganze Gefecht und der Sichtstufe des Gefechts.
  import type { Spieldaten } from '../../daten/typen';
  import { konzentrationMoeglich, konzentrationSetzen, protokolliere, verbrauchen } from '../../regeln/aktionen';
  import { statwert } from '../../regeln/probe';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Dialog from '../Dialog.svelte';
  import { mitZeichen } from '../texte';
  import ProbeKern from './ProbeKern.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    stat: string | null;
    skill: string | null;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onschliessen: () => void;
    /** Aus der Aktionsleiste (Main → Skill oder Probe): „Ausgeführt“ verbraucht die Mainaction, mit Konzentration nach Wahl. */
    alsMain?: boolean;
    onfertig?: (c: Charakter) => void;
  }
  let { c, d, stat: startStat, skill: startSkill, wuerfelModus, onaendern, onschliessen, alsMain = false, onfertig }: Props = $props();
  let konz = $state<'keine' | 'leicht' | 'voll'>('keine');

  function ausgefuehrt() {
    let x = verbrauchen(c, 'main');
    if (konz !== 'keine') x = konzentrationSetzen(x, konz);
    const name = skill ? (d.skills.eintraege.find((s) => s.id === skill)?.name ?? skill) : (d.stats.eintraege.find((s) => s.id === stat)?.name ?? '');
    onfertig?.(protokolliere(x, `Probe: ${name}${konz !== 'keine' ? ` (Konzentration ${konz})` : ''}`));
  }

  let stat = $state<string | null>(null);
  let skill = $state<string>('');
  $effect.pre(() => {
    stat = startStat ?? (startSkill ? (d.skills.eintraege.find((s) => s.id === startSkill)?.stat ?? null) : null);
    skill = startSkill ?? '';
  });

  /** Skills mit Stufe ≥ 1 zuerst, dann die übrigen; jeweils in der Reihenfolge von skills.json. */
  const vorhanden = $derived(d.skills.eintraege.filter((s) => (c.skills[s.id] ?? 0) > 0));
  const uebrige = $derived(d.skills.eintraege.filter((s) => !((c.skills[s.id] ?? 0) > 0)));

  function skillWaehlen(id: string) {
    skill = id;
    // Ohne gewählten Stat übernimmt die App den Stat des Skills; sonst bleibt der Stat (Skill austauschen).
    if (id && !stat) stat = d.skills.eintraege.find((s) => s.id === id)?.stat ?? null;
  }
</script>

<Dialog titel="Probe">
  <div class="stats" role="group" aria-label="Stat der Probe">
    {#each d.stats.eintraege as s (s.id)}
      <button class:an={stat === s.id} aria-pressed={stat === s.id} onclick={() => (stat = s.id)}>
        <span class="name"><span style:color={d.darstellung.typen.stat.farbe} aria-hidden="true">{d.darstellung.typen.stat.zeichen}</span> {s.name}</span>
        <span class="wert">{statwert(c.stats[s.id], d.regeln) ?? '–'}</span>
      </button>
    {/each}
  </div>

  <label for="probe-skill">Skill</label>
  <select id="probe-skill" value={skill} onchange={(e) => skillWaehlen((e.target as HTMLSelectElement).value)}>
    <option value="">ohne Skill</option>
    <optgroup label="Deine Skills">
      {#each vorhanden as s (s.id)}<option value={s.id}>{s.name} {c.skills[s.id]}</option>{/each}
    </optgroup>
    <optgroup label="Weitere Skills (Stufe 0: 1 Malstep)">
      {#each uebrige as s (s.id)}<option value={s.id}>{s.name} 0</option>{/each}
    </optgroup>
  </select>
  {#if skill && stat}
    {@const eigener = d.skills.eintraege.find((s) => s.id === skill)?.stat}
    {#if eigener && eigener !== stat}
      <p class="hinweis">Skill ausgetauscht: Er gehört sonst zu {mitZeichen('stat', eigener, d)}. Das muss die SL erlauben.</p>
    {/if}
  {/if}

  {#if stat}
    <div class="kern">
      <ProbeKern {c} {d} anfrage={{ stat, skill: skill || null }} hinweise={['probe']} {wuerfelModus} sichtSchalter {onaendern} />
    </div>
  {:else}
    <p class="hinweis">Wähle einen Stat oder einen Skill.</p>
  {/if}

  {#if alsMain}
    <h3 class="konz-titel">Konzentration der Aktion</h3>
    <div class="konz" role="group" aria-label="Konzentration">
      {#each [['keine', 'keine'], ['leicht', 'leicht'], ['voll', 'voll']] as [id, text] (id)}
        <button class:an={konz === id} aria-pressed={konz === id} disabled={id !== 'keine' && !konzentrationMoeglich(c)} onclick={() => (konz = id as typeof konz)}>{text}</button>
      {/each}
    </div>
    <p class="hinweis">Skills, die Feinarbeit oder Ruhe brauchen, verlangen Konzentration (nach SL). Konzentration: keine Breakaction mehr in dieser Runde.</p>
  {/if}

  {#snippet knoepfe()}
    {#if alsMain}
      <button onclick={onschliessen}>Abbrechen</button>
      <button class="haupt" disabled={!stat} onclick={ausgefuehrt}>Ausgeführt (Main −1)</button>
    {:else}
      <button class="haupt" onclick={onschliessen}>Schließen</button>
    {/if}
  {/snippet}
</Dialog>

<style>
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .stats button { display: flex; flex-direction: column; align-items: flex-start; padding: 6px 8px; min-height: 52px; }
  .stats button.an { border: 2px solid var(--akzent); background: var(--flaeche-2); }
  .name { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .wert { font-weight: 700; font-size: 1.1rem; }
  .kern { margin-top: 16px; }
  label { margin-top: 12px; }
  .konz-titel { font-size: 0.9rem; color: var(--text-2); margin: 16px 0 6px; }
  .konz { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .konz button.an { border: 2px solid var(--akzent); background: var(--flaeche-2); font-weight: 700; }
</style>
