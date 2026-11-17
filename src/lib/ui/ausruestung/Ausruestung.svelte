<script lang="ts">
  // Reiter Ausrüstung (konzept.md § 3.8, § 3.9): aktive Waffe, Schusswaffen mit Magazinstand und Reserve,
  // Nahkampfwaffen und Vorrat mit Anzahl, Rüstung. Im Schreibmodus lässt sich alles eintragen und ändern
  // (der Laden folgt später); im Gefecht läuft der Waffenwechsel über die Aktionsleiste.
  import type { Spieldaten } from '../../daten/typen';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { magazinText } from '../../regeln/schuss';
  import {
    eintragErsetzen, freieId, istWerfer, kaliberName, kapazitaet, magazinGroesse, munitionstypen, munitionswerte, nachladearten,
    magazineFuellen, neuerWaffenEintrag, passendeAufsaetze, sprengwaffe, waffeAktivieren, waffeVon
  } from '../../regeln/waffen';
  import Bericht from '../Bericht.svelte';
  import type { Charakter, WaffenEintrag } from '../../speicher/charakter';
  import { dkMw, patronenText, trageortName, zustandName, type Modus, type Zeile } from '../texte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    modus: Modus;
    onaendern: (c: Charakter) => void;
    onnachladen: (id: string) => void;
    onladehemmung: (id: string) => void;
  }
  let { c, d, modus, onaendern, onnachladen, onladehemmung }: Props = $props();

  const schreiben = $derived(modus === 'schreiben');
  const imGefecht = $derived(!!gefechtVon(c));
  const trageorte = $derived(Object.keys(d.regeln.waffe_wechseln.trageorte));
  let offen = $state<string | null>(null);
  let neueWaffe = $state('');
  let neueNk = $state('');
  let neuerVorrat = $state('');
  let neueRuestung = $state('');
  let bericht = $state<{ zeilen: Zeile[]; nach: WaffenEintrag } | null>(null);

  /** Magazine füllen (außerhalb des Gefechts): Bericht vor der Sammeländerung (konzept.md § 3.0c). */
  function fuellenFrage(e: WaffenEintrag) {
    const f = magazineFuellen(e, d);
    const zeilen: Zeile[] = [{ text: `Du füllst aus den losen Patronen nach (${patronenText(f.patronen)}).`, fett: true }];
    if (f.waffe) zeilen.push({ text: `In der Waffe: ${f.waffe[0]} → ${f.waffe[1]}.` });
    for (const r of f.reserve) zeilen.push({ text: `Angebrochenes Magazin: ${r.vorher} → ${r.nachher}.` });
    if (f.leere) zeilen.push({ text: `${f.leere} ${f.leere === 1 ? 'leeres Magazin wird' : 'leere Magazine werden'} gefüllt.` });
    for (const z of f.zubehoer) zeilen.push({ text: `${d.aufsaetze.zubehoer.find((x) => x.id === z.art)?.name ?? z.art}: ${z.anzahl} gefüllt.` });
    if (f.eintrag.reserve.length) zeilen.push({ text: `Ersatzmagazine danach: ${f.eintrag.reserve.join(' · ')}.` });
    zeilen.push({ text: `Lose Patronen: ${e.lose_patronen ?? 0} → ${f.eintrag.lose_patronen ?? 0}.` });
    bericht = { zeilen, nach: f.eintrag };
  }

  const kategorien = $derived([...new Set(d.waffen.eintraege.map((w) => w.kategorie))]);

  function setze(e: WaffenEintrag) { onaendern(eintragErsetzen(c, e)); }
  function ausr(teil: Partial<Charakter['ausruestung']>) {
    onaendern({ ...c, geaendert: new Date().toISOString(), ausruestung: { ...c.ausruestung, ...teil } });
  }

  function waffeHinzu() {
    if (!neueWaffe) return;
    const e = neuerWaffenEintrag(neueWaffe, d, freieId(c, 'wf'), trageorte[0]!);
    ausr({ waffen: [...c.ausruestung.waffen, e], aktive_waffe: c.ausruestung.aktive_waffe ?? e.id });
    neueWaffe = '';
    offen = e.id;
  }
  function waffeEntfernen(e: WaffenEintrag) {
    if (!confirm(`${waffeVon(e, d).name} aus der Ausrüstung entfernen?`)) return;
    const waffen = c.ausruestung.waffen.filter((x) => x.id !== e.id);
    ausr({ waffen, aktive_waffe: c.ausruestung.aktive_waffe === e.id ? (waffen[0]?.id ?? null) : c.ausruestung.aktive_waffe });
  }
  function aufsatzUmschalten(e: WaffenEintrag, id: string, an: boolean) {
    const neu = passendeAufsaetze(waffeVon(e, d), d).find((a) => a.id === id);
    // Es passt nur ein Magazin: ein neues ersetzt ein vorhandenes erweitertes Magazin bzw. eine Trommel.
    let liste = e.aufsaetze.filter((x) => x !== id);
    if (an && neu?.werte?.magazin) liste = liste.filter((x) => !d.aufsaetze.eintraege.find((a) => a.id === x)?.werte?.magazin);
    if (an) liste.push(id);
    const kap = kapazitaet({ ...e, aufsaetze: liste }, d);
    setze({ ...e, aufsaetze: liste, im_magazin: Math.min(e.im_magazin, kap) });
  }
  function zahl(text: string, min = 0): number {
    const n = Math.floor(Number(text));
    return Number.isFinite(n) ? Math.max(min, n) : min;
  }
  function reserveText(e: WaffenEintrag): string {
    return e.reserve.length ? e.reserve.join(' · ') : 'keine';
  }
  function reserveSetzen(e: WaffenEintrag, text: string) {
    const groesse = magazinGroesse(e, d);
    const liste = text.split(/[^0-9]+/).filter(Boolean).map((x) => Math.min(groesse, zahl(x))).filter((n) => n > 0);
    setze({ ...e, reserve: liste });
  }

  function nkAnzahl(id: string, n: number) {
    ausr({ nahkampfwaffen: c.ausruestung.nahkampfwaffen.map((x) => (x.id === id ? { ...x, anzahl: Math.max(0, n) } : x)) });
  }
  function vorratAnzahl(id: string, n: number) {
    ausr({ vorrat: c.ausruestung.vorrat.map((x) => (x.id === id ? { ...x, anzahl: Math.max(0, n) } : x)) });
  }
</script>

{#snippet waffe(e: WaffenEintrag)}
  {@const w = waffeVon(e, d)}
  {@const mun = munitionswerte(e, d)}
  {@const aktiv = c.ausruestung.aktive_waffe === e.id}
  {@const auf = offen === e.id}
  <li class:aktiv>
    <button class="zeile flach" aria-expanded={auf} onclick={() => (offen = auf ? null : e.id)}>
      <span class="name">
        <strong>{w.name}</strong>
        <span class="hinweis">{w.kategorie} · {trageortName(e.trageort, d)}{#if aktiv} · <span class="aktiv-text">aktiv</span>{/if}</span>
      </span>
      <span class="stand">
        {#if e.ladehemmung}<span class="lh">Ladehemmung</span>{/if}
        {#if istWerfer(w)}{e.munitionstyp ? (sprengwaffe(e.munitionstyp, d)?.name ?? e.munitionstyp) : 'leer'}{:else}{magazinText(e, d)}{/if}
      </span>
    </button>
    {#if auf}
      <div class="detail">
        {#if istWerfer(w)}
          <p>Geschosse: {kaliberName(w, d)}. Geladen wird aus dem Vorrat.</p>
        {:else}
          <p>{kaliberName(w, d)}, {e.munitionstyp}{#if mun}: {dkMw(mun.dk, mun.mw, mun.stumpf)}{/if}</p>
          {#if w.ladeart === 'wechselmagazin'}<p>Ersatzmagazine: {reserveText(e)}</p>{/if}
          {#if (e.leere_magazine ?? 0) > 0}<p>Leere Magazine: {e.leere_magazine}</p>{/if}
          {#if e.lose_patronen !== undefined}<p>Lose Patronen: {e.lose_patronen}</p>{/if}
          {#each e.zubehoer ?? [] as z (z.art)}
            <p>{d.aufsaetze.zubehoer.find((x) => x.id === z.art)?.name ?? z.art}: {z.gefuellt} gefüllt, {z.leer} leer</p>
          {/each}
        {/if}
        <p>Zustand {zustandName(e.zustand, d)}{#if e.aufsaetze.length} · Aufsätze: {e.aufsaetze.map((id) => d.aufsaetze.eintraege.find((a) => a.id === id)?.name ?? id).join(', ')}{/if}</p>
        {#if e.ladehemmung}<p class="fehler">{e.ladehemmung === 'schwer' ? 'Schwere Ladehemmung: nur außerhalb des Gefechts behebbar.' : 'Einfache Ladehemmung: Die Waffe ist blockiert.'}</p>{/if}
        {#if w.besonderheiten}<p class="hinweis">{w.besonderheiten}</p>{/if}

        {#if !imGefecht}
          <div class="knoepfe">
            {#if !aktiv}<button onclick={() => onaendern(waffeAktivieren(c, e.id))}>Als aktive Waffe nehmen</button>{/if}
            {#if nachladearten(c, e, d).length}<button onclick={() => onnachladen(e.id)}>Nachladen</button>{/if}
            {#if magazineFuellen(e, d).patronen > 0}<button onclick={() => fuellenFrage(e)}>Magazine füllen</button>{/if}
            {#if e.ladehemmung}<button onclick={() => onladehemmung(e.id)}>Ladehemmung beheben</button>{/if}
          </div>
        {/if}

        {#if schreiben}
          <div class="bearbeiten">
            {#if !istWerfer(w)}
              <label>Munitionstyp
                <select value={e.munitionstyp} onchange={(ev) => setze({ ...e, munitionstyp: (ev.target as HTMLSelectElement).value })}>
                  {#each munitionstypen(w, d) as t (t)}<option value={t}>{t}</option>{/each}
                </select>
              </label>
              <label>In der Waffe (höchstens {kapazitaet(e, d)})
                <input type="number" inputmode="numeric" min="0" max={kapazitaet(e, d)} value={e.im_magazin}
                  onchange={(ev) => setze({ ...e, im_magazin: Math.min(kapazitaet(e, d), zahl((ev.target as HTMLInputElement).value)) })} />
              </label>
              {#if w.ladeart === 'wechselmagazin'}
                <label>Ersatzmagazine (Inhalt, z. B. „30 30 12“)
                  <input inputmode="numeric" value={e.reserve.join(' ')} onchange={(ev) => reserveSetzen(e, (ev.target as HTMLInputElement).value)} />
                </label>
                <button onclick={() => setze({ ...e, reserve: [...e.reserve, magazinGroesse(e, d)] })}>+ volles Magazin ({magazinGroesse(e, d)})</button>
                <label>Leere Magazine
                  <input type="number" inputmode="numeric" min="0" value={e.leere_magazine ?? 0}
                    onchange={(ev) => setze({ ...e, leere_magazine: zahl((ev.target as HTMLInputElement).value) })} />
                </label>
              {/if}
                <label>Lose Patronen
                  <input type="number" inputmode="numeric" min="0" value={e.lose_patronen ?? 0}
                    onchange={(ev) => setze({ ...e, lose_patronen: zahl((ev.target as HTMLInputElement).value) })} />
                </label>
              {#if w.ladeart !== 'wechselmagazin'}
                {#each e.zubehoer ?? [] as z (z.art)}
                  {@const name = d.aufsaetze.zubehoer.find((x) => x.id === z.art)?.name ?? z.art}
                  <label>{name}: gefüllt
                    <input type="number" inputmode="numeric" min="0" value={z.gefuellt}
                      onchange={(ev) => setze({ ...e, zubehoer: e.zubehoer!.map((x) => (x.art === z.art ? { ...x, gefuellt: zahl((ev.target as HTMLInputElement).value) } : x)) })} />
                  </label>
                  <label>{name}: leer
                    <input type="number" inputmode="numeric" min="0" value={z.leer}
                      onchange={(ev) => setze({ ...e, zubehoer: e.zubehoer!.map((x) => (x.art === z.art ? { ...x, leer: zahl((ev.target as HTMLInputElement).value) } : x)) })} />
                  </label>
                {/each}
              {/if}
            {/if}
            <label>Zustand
              <select value={e.zustand} onchange={(ev) => setze({ ...e, zustand: (ev.target as HTMLSelectElement).value })}>
                {#each d.regeln.waffenzustand.stufen as z (z)}<option value={z}>{zustandName(z, d)}</option>{/each}
              </select>
            </label>
            <label>Trageort
              <select value={e.trageort} onchange={(ev) => setze({ ...e, trageort: (ev.target as HTMLSelectElement).value })}>
                {#each trageorte as t (t)}<option value={t}>{trageortName(t, d)}</option>{/each}
              </select>
            </label>
            {#if passendeAufsaetze(w, d).length}
              <fieldset>
                <legend>Aufsätze</legend>
                {#each passendeAufsaetze(w, d) as a (a.id)}
                  <label class="schalter"><input type="checkbox" checked={e.aufsaetze.includes(a.id)}
                    onchange={(ev) => aufsatzUmschalten(e, a.id, (ev.target as HTMLInputElement).checked)} /> {a.name}</label>
                {/each}
              </fieldset>
            {/if}
            {#if e.ladehemmung}<button onclick={() => setze({ ...e, ladehemmung: null })}>Ladehemmung von Hand entfernen</button>{/if}
            <button class="gefahr" onclick={() => waffeEntfernen(e)}>Waffe entfernen</button>
          </div>
        {/if}
      </div>
    {/if}
  </li>
{/snippet}

<section class="karte">
  <h2>Schusswaffen</h2>
  {#if c.ausruestung.waffen.length}
    <ul class="zeilen">
      {#each [...c.ausruestung.waffen].sort((a, b) => Number(b.id === c.ausruestung.aktive_waffe) - Number(a.id === c.ausruestung.aktive_waffe)) as e (e.id)}
        {@render waffe(e)}
      {/each}
    </ul>
  {:else}
    <p class="hinweis">Noch keine Schusswaffe.{#if !schreiben} Im Schreibmodus (Menü ☰) trägst du deine Ausrüstung ein; der Laden folgt später.{/if}</p>
  {/if}
  {#if imGefecht}<p class="hinweis">Im Gefecht wechselst du die Waffe über Main → Waffe wechseln.</p>{/if}
  {#if schreiben}
    <div class="neu">
      <select aria-label="Waffe hinzufügen" bind:value={neueWaffe}>
        <option value="">Waffe wählen …</option>
        {#each kategorien as k (k)}
          <optgroup label={k}>{#each d.waffen.eintraege.filter((w) => w.kategorie === k) as w (w.id)}<option value={w.id}>{w.name}</option>{/each}</optgroup>
        {/each}
      </select>
      <button class="haupt" disabled={!neueWaffe} onclick={waffeHinzu}>Hinzufügen</button>
    </div>
  {/if}
</section>

<section class="karte">
  <h2>Nahkampfwaffen</h2>
  {#if c.ausruestung.nahkampfwaffen.length}
    <ul class="zeilen">
      {#each c.ausruestung.nahkampfwaffen as n (n.id)}
        {@const nw = d.nahkampfwaffen.eintraege.find((x) => x.id === n.waffe)}
        <li class="anzahl-zeile">
          <span class="name"><strong>{nw?.name ?? n.waffe}</strong>
            {#if schreiben}
              <select class="ort" aria-label="Trageort" value={n.trageort}
                onchange={(ev) => ausr({ nahkampfwaffen: c.ausruestung.nahkampfwaffen.map((x) => (x.id === n.id ? { ...x, trageort: (ev.target as HTMLSelectElement).value } : x)) })}>
                {#each trageorte as t (t)}<option value={t}>{trageortName(t, d)}</option>{/each}
              </select>
            {:else}<span class="hinweis">{trageortName(n.trageort, d)}</span>{/if}
          </span>
          <span class="stepper">
            <button aria-label="eine weniger" disabled={!schreiben || (n.anzahl ?? 1) <= 0} onclick={() => nkAnzahl(n.id, (n.anzahl ?? 1) - 1)}>−</button>
            <strong>{n.anzahl ?? 1}</strong>
            <button aria-label="eine mehr" onclick={() => nkAnzahl(n.id, (n.anzahl ?? 1) + 1)}>+</button>
          </span>
          {#if schreiben}
            <button class="flach klein gefahr-text" onclick={() => ausr({ nahkampfwaffen: c.ausruestung.nahkampfwaffen.filter((x) => x.id !== n.id) })}>entfernen</button>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hinweis">Keine eigenen Nahkampfwaffen. Körperwaffen und Kolben hast du immer.</p>
  {/if}
  {#if schreiben}
    <div class="neu">
      <select aria-label="Nahkampfwaffe hinzufügen" bind:value={neueNk}>
        <option value="">Nahkampfwaffe wählen …</option>
        {#each d.nahkampfwaffen.eintraege.filter((x) => !x.immer_verfuegbar && !x.mit_waffe?.length) as n (n.id)}<option value={n.id}>{n.name}</option>{/each}
      </select>
      <button class="haupt" disabled={!neueNk} onclick={() => { ausr({ nahkampfwaffen: [...c.ausruestung.nahkampfwaffen, { id: freieId(c, 'nk'), waffe: neueNk, trageort: trageorte[0]!, anzahl: 1 }] }); neueNk = ''; }}>Hinzufügen</button>
    </div>
  {/if}
</section>

<section class="karte">
  <h2>Granaten und Geschosse</h2>
  {#if c.ausruestung.vorrat.length}
    <ul class="zeilen">
      {#each c.ausruestung.vorrat as v (v.id)}
        <li class="anzahl-zeile">
          <span class="name"><strong>{sprengwaffe(v.id, d)?.name ?? v.id}</strong>
            {#if schreiben}
              <select class="ort" aria-label="Trageort" value={v.trageort}
                onchange={(ev) => ausr({ vorrat: c.ausruestung.vorrat.map((x) => (x.id === v.id ? { ...x, trageort: (ev.target as HTMLSelectElement).value } : x)) })}>
                {#each trageorte as t (t)}<option value={t}>{trageortName(t, d)}</option>{/each}
              </select>
            {:else}<span class="hinweis">{trageortName(v.trageort, d)}</span>{/if}
          </span>
          <span class="stepper">
            <button aria-label="eins weniger" disabled={!schreiben || v.anzahl <= 0} onclick={() => vorratAnzahl(v.id, v.anzahl - 1)}>−</button>
            <strong>{v.anzahl}</strong>
            <button aria-label="eins mehr" onclick={() => vorratAnzahl(v.id, v.anzahl + 1)}>+</button>
          </span>
          {#if schreiben}
            <button class="flach klein gefahr-text" onclick={() => ausr({ vorrat: c.ausruestung.vorrat.filter((x) => x.id !== v.id) })}>entfernen</button>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hinweis">Kein Vorrat.</p>
  {/if}
  {#if schreiben}
    <div class="neu">
      <select aria-label="Vorrat hinzufügen" bind:value={neuerVorrat}>
        <option value="">Granate oder Geschoss wählen …</option>
        {#each d.wurf_und_sprengwaffen.eintraege.filter((s) => !c.ausruestung.vorrat.some((v) => v.id === s.id)) as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
      </select>
      <button class="haupt" disabled={!neuerVorrat} onclick={() => { ausr({ vorrat: [...c.ausruestung.vorrat, { id: neuerVorrat, anzahl: 1, trageort: trageorte[0]! }] }); neuerVorrat = ''; }}>Hinzufügen</button>
    </div>
  {/if}
</section>

<section class="karte">
  <h2>Rüstung</h2>
  {#if c.ausruestung.ruestung.length || c.ausruestung.schild}
    <ul class="zeilen">
      {#each c.ausruestung.ruestung as id (id)}
        <li class="anzahl-zeile"><span class="name"><strong>{d.schutz.ruestung.find((r) => r.id === id)?.name ?? id}</strong></span>
          {#if schreiben}<button class="flach klein gefahr-text" onclick={() => ausr({ ruestung: c.ausruestung.ruestung.filter((x) => x !== id) })}>entfernen</button>{/if}
        </li>
      {/each}
      {#if c.ausruestung.schild}
        <li class="anzahl-zeile"><span class="name"><strong>{d.schutz.schilde.find((s) => s.id === c.ausruestung.schild)?.name}</strong></span>
          {#if schreiben}<button class="flach klein gefahr-text" onclick={() => ausr({ schild: null })}>entfernen</button>{/if}
        </li>
      {/if}
    </ul>
  {:else}
    <p class="hinweis">Keine Rüstung.</p>
  {/if}
  {#if schreiben}
    <div class="neu">
      <select aria-label="Rüstung hinzufügen" bind:value={neueRuestung}>
        <option value="">Rüstung oder Schild wählen …</option>
        <optgroup label="Rüstung">
          {#each d.schutz.ruestung.filter((r) => !c.ausruestung.ruestung.includes(r.id)) as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
        </optgroup>
        <optgroup label="Schild">
          {#each d.schutz.schilde as s (s.id)}<option value={`schild:${s.id}`}>{s.name}</option>{/each}
        </optgroup>
      </select>
      <button class="haupt" disabled={!neueRuestung} onclick={() => {
        if (neueRuestung.startsWith('schild:')) ausr({ schild: neueRuestung.slice(7) });
        else ausr({ ruestung: [...c.ausruestung.ruestung, neueRuestung] });
        neueRuestung = '';
      }}>Hinzufügen</button>
    </div>
  {/if}
</section>

<section class="karte">
  <h2>Sonstiges</h2>
  {#if schreiben}
    <textarea rows="3" aria-label="Sonstige Ausrüstung" value={c.ausruestung.sonstiges}
      onchange={(ev) => ausr({ sonstiges: (ev.target as HTMLTextAreaElement).value })}></textarea>
  {:else}
    <p class:hinweis={!c.ausruestung.sonstiges}>{c.ausruestung.sonstiges || 'nichts eingetragen'}</p>
  {/if}
</section>

{#if bericht}
  <Bericht titel="Magazine füllen" zeilen={bericht.zeilen} onweiter={() => { setze(bericht!.nach); bericht = null; }} onzurueck={() => (bericht = null)} />
{/if}

<style>
  .name { display: flex; flex-direction: column; min-width: 0; }
  .stand { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; display: flex; flex-direction: column; align-items: flex-end; }
  .aktiv-text { color: var(--akzent); font-weight: 700; }
  li.aktiv .zeile strong { color: var(--akzent); }
  .lh { color: var(--gefahr); font-size: 0.8rem; font-weight: 700; }
  .knoepfe { display: flex; flex-wrap: wrap; gap: var(--abstand-2); }
  .bearbeiten { display: flex; flex-direction: column; gap: var(--abstand-3); border-top: 1px dashed var(--linie); padding-top: var(--abstand-3); }
  .bearbeiten label:not(.schalter) { margin: 0; display: flex; flex-direction: column; gap: var(--abstand-1); font-weight: 600; }
  fieldset { border: 1px solid var(--linie); border-radius: var(--radius); margin: 0; }
  .neu { display: flex; gap: var(--abstand-2); }
  .neu select { flex: 1; min-width: 0; }
  .anzahl-zeile { display: flex; align-items: center; gap: var(--abstand-2); justify-content: space-between; padding: var(--abstand-1) 0; min-height: 52px; }
  .klein { min-width: 44px; padding: 0 8px; }
  .ort { padding: 4px 8px; min-height: 40px; margin-top: 4px; }
  .gefahr-text { color: var(--gefahr); }
</style>
