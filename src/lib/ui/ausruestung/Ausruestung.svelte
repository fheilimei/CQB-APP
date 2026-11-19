<script lang="ts">
  // Reiter Ausrüstung (konzept.md § 3.8, § 3.9): aktive Waffe, Schusswaffen mit eingesetztem Magazin, lose Munition nach
  // Kaliber und Typ, Magazine bei ihrer Waffe (antippen: einsetzen, befüllen, leeren), lose Aufsätze, Nahkampfwaffen und Vorrat mit Anzahl, Rüstung. Im Schreibmodus
  // lässt sich alles eintragen und ändern; im Gefecht läuft der Waffenwechsel über die Aktionsleiste.
  import type { Spieldaten } from '../../daten/typen';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { magazinText } from '../../regeln/schuss';
  import {
    aufsatzAbnehmen, aufsatzAnbringen, eintragErsetzen, freieId, istWerfer, kaliberName, kaliberVon,
    kapazitaet, loseAufsaetzeFuer, loseTypen, magazineFuellen, magazineFuer, magazinLeeren, magazinPlatz, magazinSorte,
    magazinHerausnehmen, magazinsorteSetzen, magazinWechseln, mitLaderLaden, munitionstypen, munitionswerte, nachladearten, neuerWaffenEintrag,
    passendeAufsaetze, passendeMagazine, platzFuer, sprengwaffe, waffeAktivieren, waffeLeeren, waffeVon, type Fuellziel
  } from '../../regeln/waffen';
  import Bericht from '../Bericht.svelte';
  import Magazinsymbol from './Magazinsymbol.svelte';
  import type { Charakter, Magazin, WaffenEintrag } from '../../speicher/charakter';
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
  const neu = $derived(d.regeln.waffenzustand.neu);
  let offen = $state<string | null>(null);
  /** Angetipptes Magazin: an welcher Waffe, welches Ziel (Waffe selbst oder Magazin beim Charakter); `typen` = Befüllen offen. */
  let wahl = $state<{ waffe: string; ziel: Fuellziel; typen: boolean } | null>(null);
  let neueWaffe = $state('');
  let neueNk = $state('');
  let neuerVorrat = $state('');
  let neueRuestung = $state('');
  let neueMunition = $state('');
  let neuerAufsatz = $state('');
  let neuesMagazin = $state('');
  let bericht = $state<{ titel: string; zeilen: Zeile[]; nach: Charakter } | null>(null);

  const sorteName = (id: string) => magazinSorte(id, d)?.name ?? id;
  /** Munitionstypen, die in ein Magazin passen: die der ersten Waffe, an die es passt. */
  function sorteTypen(id: string): string[] {
    const w = d.waffen.eintraege.find((x) => magazinSorte(id, d)?.passt_an.includes(x.id));
    return w ? munitionstypen(w, d) : [];
  }
  /** Magazine, die an keine Waffe des Charakters passen (alle anderen stehen bei ihrer Waffe). */
  const ohneWaffe = $derived(c.ausruestung.magazine.flatMap((m, index) =>
    c.ausruestung.waffen.some((e) => magazinSorte(m.id, d)?.passt_an.includes(e.waffe)) ? [] : [{ m, index }]));
  const gleichesZiel = (a: Fuellziel, b: Fuellziel) =>
    a.art === 'waffe' ? b.art === 'waffe' : b.art === 'magazin' && a.index === b.index;
  const istGewaehlt = (e: WaffenEintrag, z: Fuellziel) => !!wahl && wahl.waffe === e.id && gleichesZiel(wahl.ziel, z);
  function antippen(e: WaffenEintrag, z: Fuellziel) {
    wahl = istGewaehlt(e, z) ? null : { waffe: e.id, ziel: z, typen: false };
  }
  const zielInhalt = (e: WaffenEintrag, z: Fuellziel) =>
    z.art === 'waffe' ? { inhalt: e.im_magazin, typ: e.munitionstyp } : c.ausruestung.magazine[z.index]!;
  const aufsatzName = (id: string) => d.aufsaetze.eintraege.find((a) => a.id === id)?.name ?? id;
  /** Farbe des Munitionstyps im Magazinsymbol (darstellung.json `munitionsfarben`). */
  const mfarbe = (typ: string) => d.darstellung.munitionsfarben?.[typ] ?? null;
  const kaliberText = (id: string) => d.munition.eintraege.find((m) => m.id === id)?.name ?? id;

  function zielName(z: Fuellziel): string {
    if (z.art === 'waffe') return 'In der Waffe';
    return sorteName(c.ausruestung.magazine[z.index]!.id);
  }

  /** Typen, mit denen sich dieses eine Ziel füllen lässt: lose Munition da und Platz (Schnelllader nur ganz). */
  function fuellTypen(e: WaffenEintrag, z: Fuellziel) {
    return loseTypen(c, waffeVon(e, d), d).filter((t) => t.anzahl > 0 && magazineFuellen(c, e, t.typ, d, [z]).patronen > 0);
  }

  /** Ein Magazin bzw. die Waffe befüllen (außerhalb des Gefechts): Bericht vor der Sammeländerung (konzept.md § 3.0c). */
  function fuellenFrage(e: WaffenEintrag, z: Fuellziel, typ: string) {
    const f = magazineFuellen(c, e, typ, d, [z]);
    const k = kaliberVon(waffeVon(e, d))!;
    const vorher = loseTypen(c, waffeVon(e, d), d).find((t) => t.typ === typ)?.anzahl ?? 0;
    const zeilen: Zeile[] = [{ text: `Du füllst mit ${patronenText(f.patronen)} ${typ} aus der losen Munition.`, fett: true }];
    for (const s of f.schritte) zeilen.push({ text: `${zielName(s.ziel)}: ${s.vorher ? `${s.vorher} ${typ}` : 'leer'} → ${s.nachher} ${typ}.` });
    zeilen.push({ text: `Lose ${kaliberText(k)} ${typ}: ${vorher} → ${vorher - f.patronen}.` });
    bericht = { titel: 'Befüllen', zeilen, nach: f.nach };
    wahl = null;
  }

  /** Dieses Magazin (bzw. diesen Schnelllader oder Ladestreifen) in die Waffe laden: Bericht vorher. */
  function ladenFrage(e: WaffenEintrag, index: number) {
    const m = c.ausruestung.magazine[index]!;
    const w = waffeVon(e, d);
    const vorher = e.im_magazin;
    const zeilen: Zeile[] = [];
    let nach: Charakter;
    if (w.ladeart === 'wechselmagazin') {
      nach = magazinWechseln(c, e, index, d);
      const imLauf = w.patrone_im_lauf && vorher > 0 ? 1 : 0;
      zeilen.push({ text: m.inhalt > 0 ? `Du setzt das ${sorteName(m.id)} mit ${patronenText(m.inhalt)} ${m.typ} ein.` : `Du setzt das ${sorteName(m.id)} leer ein.`, fett: true });
      zeilen.push({ text: `In der Waffe: ${vorher} → ${nach.ausruestung.waffen.find((x) => x.id === e.id)!.im_magazin}.` });
      if (vorher - imLauf > 0) zeilen.push({ text: `Das alte Magazin steckst du mit ${patronenText(vorher - imLauf)} ${e.munitionstyp} ein.` });
      else if (e.magazin) zeilen.push({ text: 'Das alte Magazin steckst du leer ein.' });
      if (imLauf && e.munitionstyp !== m.typ) zeilen.push({ text: `Die Patrone im Lauf (${e.munitionstyp}) bleibt in der Waffe.` });
    } else {
      nach = mitLaderLaden(c, e, m.id, m.typ, d);
      zeilen.push({ text: `Du lädst mit ${sorteName(m.id)} (${m.typ}).`, fett: true });
      zeilen.push({ text: `In der Waffe: ${vorher} → ${nach.ausruestung.waffen.find((x) => x.id === e.id)!.im_magazin}.` });
      if (vorher) zeilen.push({ text: `${patronenText(vorher)} ${e.munitionstyp} aus der Waffe kommen zur losen Munition.` });
    }
    bericht = { titel: 'Laden', zeilen, nach };
    wahl = null;
  }

  /** Eingesetztes Magazin herausnehmen: Bericht vorher (Waffe und Magazine ändern sich). */
  function herausnehmenFrage(e: WaffenEintrag) {
    if (!e.magazin) return;
    const nach = magazinHerausnehmen(c, e, d);
    const imLauf = nach.ausruestung.waffen.find((x) => x.id === e.id)!.im_magazin;
    const rest = e.im_magazin - imLauf;
    const zeilen: Zeile[] = [{ text: `Du nimmst das ${sorteName(e.magazin.id)} aus der Waffe und steckst es ${rest > 0 ? `mit ${patronenText(rest)} ${e.munitionstyp}` : 'leer'} ein.`, fett: true }];
    zeilen.push({ text: imLauf > 0 ? `Die Patrone im Lauf (${e.munitionstyp}) bleibt in der Waffe.` : 'Die Waffe ist jetzt leer und hat kein Magazin.' });
    bericht = { titel: 'Herausnehmen', zeilen, nach };
    wahl = null;
  }

  /** Leeren: die Patronen kommen zur losen Munition. */
  function leeren(e: WaffenEintrag, z: Fuellziel) {
    onaendern(z.art === 'waffe' ? waffeLeeren(c, e, d) : magazinLeeren(c, z.index, d));
    wahl = null;
  }

  function magazinHinzu() {
    if (!neuesMagazin) return;
    ausr({ magazine: [...c.ausruestung.magazine, { id: neuesMagazin, inhalt: 0, typ: '', zustand: neu }] });
    neuesMagazin = '';
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
  /** Schreibmodus: Aufsatz frei an- oder abhaken (ohne lose Aufsätze). */
  function aufsatzUmschalten(e: WaffenEintrag, id: string, an: boolean) {
    const liste = e.aufsaetze.filter((x) => x.id !== id);
    if (an) liste.push({ id, zustand: neu });
    setze({ ...e, aufsaetze: liste });
  }
  function zahl(text: string, min = 0): number {
    const n = Math.floor(Number(text));
    return Number.isFinite(n) ? Math.max(min, n) : min;
  }
  /** Schreibmodus: Inhalt bzw. Typ eines Magazins beim Charakter ändern. */
  function magazinSetzen(i: number, teil: Partial<Magazin>) {
    ausr({ magazine: c.ausruestung.magazine.map((m, j) => {
      if (j !== i) return m;
      const x = { ...m, ...teil, inhalt: Math.min(magazinPlatz(m.id, d), teil.inhalt ?? m.inhalt) };
      return x.inhalt > 0 ? { ...x, typ: x.typ || (sorteTypen(m.id)[0] ?? '') } : { ...x, typ: '' };
    }) });
  }

  function munitionAnzahl(i: number, n: number) {
    ausr({ munition: c.ausruestung.munition.map((m, j) => (j === i ? { ...m, anzahl: Math.max(0, n) } : m)).filter((m) => m.anzahl > 0) });
  }
  function munitionHinzu() {
    const [kaliber, typ] = neueMunition.split('|');
    if (!kaliber || !typ) return;
    if (!c.ausruestung.munition.some((m) => m.kaliber === kaliber && m.typ === typ))
      ausr({ munition: [...c.ausruestung.munition, { kaliber, typ, anzahl: 10 }] });
    neueMunition = '';
  }

  function nkAnzahl(id: string, n: number) {
    ausr({ nahkampfwaffen: c.ausruestung.nahkampfwaffen.map((x) => (x.id === id ? { ...x, anzahl: Math.max(0, n) } : x)) });
  }
  function vorratAnzahl(id: string, n: number) {
    ausr({ vorrat: c.ausruestung.vorrat.map((x) => (x.id === id ? { ...x, anzahl: Math.max(0, n) } : x)) });
  }
</script>

{#snippet typWahl(typen: string[], wert: string, onwahl: (t: string) => void)}
  <select aria-label="Munitionstyp" value={wert} onchange={(ev) => onwahl((ev.target as HTMLSelectElement).value)}>
    {#each typen as t (t)}<option value={t}>{t}</option>{/each}
  </select>
{/snippet}

{#snippet magInhalt(inhalt: number, groesse: number, typ: string, unter: string)}
  <Magazinsymbol {inhalt} {groesse} farbe={inhalt > 0 ? mfarbe(typ) : null} />
  <span class="zahl">{inhalt}</span>
  <small>{inhalt > 0 ? typ : 'leer'}</small>
  {#if unter}<small class="unter">{unter}</small>{/if}
{/snippet}

{#snippet magKnopf(e: WaffenEintrag, z: Fuellziel, groesse: number, unter: string)}
  {@const x = zielInhalt(e, z)}
  <button class="mag-kachel" class:eingesetzt={z.art === 'waffe'} aria-pressed={istGewaehlt(e, z)} onclick={() => antippen(e, z)}
    aria-label="{unter || 'Magazin'}: {x.inhalt > 0 ? `${x.inhalt} ${x.typ}` : 'leer'}">
    {@render magInhalt(x.inhalt, groesse, x.typ, unter)}
  </button>
{/snippet}

{#snippet magMenue(e: WaffenEintrag, z: Fuellziel)}
  {@const wechsel = waffeVon(e, d).ladeart === 'wechselmagazin'}
  {@const x = zielInhalt(e, z)}
  {@const typen = fuellTypen(e, z)}
  <div class="gruppe mag-menue" role="group" aria-label="Magazin">
    <span class="gruppe-titel">{z.art === 'waffe' ? (wechsel && !e.magazin ? 'Ohne Magazin' : 'In der Waffe') : sorteName(c.ausruestung.magazine[z.index]!.id)}: {x.inhalt > 0 ? `${x.inhalt} ${x.typ}` : 'leer'}</span>
    {#if imGefecht}
      <p class="hinweis">Im Gefecht lädst du über Main → Nachladen. Befüllen und Leeren gehen erst nach dem Gefecht.</p>
    {:else}
      <div class="auswahlreihe">
        {#if z.art === 'magazin'}
          <button disabled={!wechsel && x.inhalt <= 0} onclick={() => ladenFrage(e, z.index)}>{wechsel ? 'Einsetzen' : 'Laden'}</button>
        {:else if wechsel && e.magazin}
          <button onclick={() => herausnehmenFrage(e)}>Herausnehmen</button>
        {/if}
        <button disabled={!typen.length} aria-expanded={wahl?.typen ?? false} onclick={() => (wahl = wahl && { ...wahl, typen: !wahl.typen })}>Befüllen <span class="klapppfeil" aria-hidden="true">›</span></button>
        <button disabled={x.inhalt <= 0} onclick={() => leeren(e, z)}>Leeren</button>
      </div>
      {#if z.art === 'waffe' && wechsel && !e.magazin}
        <p class="hinweis">Die Waffe hat kein Magazin. Tippe ein Magazin daneben an, um es einzusetzen.</p>
      {:else if !typen.length}
        <p class="hinweis">{x.inhalt > 0 && platzFuer(c, e, z, x.typ, d) <= 0 ? 'Es ist voll.' : 'Keine passende lose Munition zum Befüllen (kaufen im Laden).'}</p>
      {:else if wahl?.typen}
        <div class="auswahlreihe" role="group" aria-label="Befüllen mit">
          {#each typen as t (t.typ)}<button onclick={() => fuellenFrage(e, z, t.typ)}><span class="typpunkt" style:--mfarbe={mfarbe(t.typ)}></span>{t.typ} ({t.anzahl})</button>{/each}
        </div>
        {#if x.inhalt > 0}<p class="hinweis">Ein Magazin hält nur einen Typ; für einen anderen erst leeren.</p>{/if}
      {/if}
    {/if}
  </div>
{/snippet}

{#snippet waffe(e: WaffenEintrag)}
  {@const w = waffeVon(e, d)}
  {@const mun = munitionswerte(e, d)}
  {@const aktiv = c.ausruestung.aktive_waffe === e.id}
  {@const auf = offen === e.id}
  {@const wechsel = w.ladeart === 'wechselmagazin'}
  {@const werfer = istWerfer(w)}
  {@const dabei = magazineFuer(c, e, d)}
  {@const aufsatzTeil = passendeAufsaetze(w, d).length > 0 || e.aufsaetze.length > 0}
  <li class:aktiv>
    <button class="zeile flach" aria-expanded={auf} onclick={() => (offen = auf ? null : e.id)}>
      <span class="name">
        <strong>{w.name}</strong>
        <span class="hinweis">{w.kategorie} · {trageortName(e.trageort, d)}{#if aktiv} · <span class="aktiv-text">aktiv</span>{/if}</span>
      </span>
      <span class="stand">
        {#if e.ladehemmung}<span class="lh">Ladehemmung</span>{/if}
        {#if werfer}{e.munitionstyp ? (sprengwaffe(e.munitionstyp, d)?.name ?? e.munitionstyp) : 'leer'}{:else}
          <span class="stand-mag">
            <Magazinsymbol klein inhalt={e.im_magazin} groesse={kapazitaet(e, d)} farbe={e.im_magazin > 0 ? mfarbe(e.munitionstyp) : null} />
            <span class="stand-text">{magazinText(e, d)}{#if e.im_magazin > 0 && e.munitionstyp}<span class="hinweis">{e.munitionstyp}</span>{/if}</span>
          </span>
        {/if}
      </span>
      <span class="klapppfeil" aria-hidden="true">›</span>
    </button>
    {#if auf}
      <div class="detail abschnitte">
        <section class="abschnitt">
          {#if werfer}
            <p>Geschosse: {kaliberName(w, d)}. Geladen wird aus dem Vorrat.</p>
          {:else}
            <p>{kaliberName(w, d)}{#if e.im_magazin > 0}, geladen {e.munitionstyp}{#if mun}: {dkMw(mun.dk, mun.mw, mun.stumpf)}{/if}{:else}, leer{/if}</p>
          {/if}
          <p>Zustand {zustandName(e.zustand, d)}</p>
          {#if e.ladehemmung}<p class="fehler">{e.ladehemmung === 'schwer' ? 'Schwere Ladehemmung: nur außerhalb des Gefechts behebbar.' : 'Einfache Ladehemmung: Die Waffe ist blockiert.'}</p>{/if}
          {#if w.besonderheiten}<p class="hinweis">{w.besonderheiten}</p>{/if}
          {#if schreiben}
            <div class="bearbeiten">
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
            </div>
          {/if}
        </section>

        {#if !werfer}
          <section class="abschnitt teil">
            <h3 class="abschnitt-titel">Magazine</h3>
            {#if schreiben}
              <div class="mag-reihe">
                <div class="mag-kachel eingesetzt">{@render magInhalt(e.im_magazin, kapazitaet(e, d), e.munitionstyp, 'in der Waffe')}</div>
              </div>
              {#each dabei as { m, index } (index)}
                <div class="mag-bearbeiten">
                  <Magazinsymbol inhalt={m.inhalt} groesse={magazinPlatz(m.id, d)} farbe={m.inhalt > 0 ? mfarbe(m.typ) : null} klein />
                  <input type="number" inputmode="numeric" min="0" max={magazinPlatz(m.id, d)} value={m.inhalt} aria-label="Inhalt"
                    onchange={(ev) => magazinSetzen(index, { inhalt: zahl((ev.target as HTMLInputElement).value) })} />
                  {#if m.inhalt > 0}{@render typWahl(sorteTypen(m.id), m.typ, (t) => magazinSetzen(index, { typ: t }))}{:else}<span class="hinweis">leer</span>{/if}
                  <button class="klein gefahr-text" aria-label="Magazin entfernen" onclick={() => ausr({ magazine: c.ausruestung.magazine.filter((_, j) => j !== index) })}>✕</button>
                </div>
              {/each}
            {:else}
              <div class="mag-reihe">
                {@render magKnopf(e, { art: 'waffe' }, kapazitaet(e, d), wechsel && !e.magazin ? 'kein Magazin' : 'in der Waffe')}
                {#each dabei as { m, index } (index)}
                  {@render magKnopf(e, { art: 'magazin', index }, magazinPlatz(m.id, d), '')}
                {/each}
              </div>
              {#if wahl?.waffe === e.id}
                {@render magMenue(e, wahl.ziel)}
              {:else}
                <p class="hinweis">{wechsel ? 'Tippe auf ein Magazin, um es einzusetzen, herauszunehmen, zu befüllen oder zu leeren.' : 'Tippe auf einen Schnelllader bzw. Ladestreifen, um ihn zu laden, zu befüllen oder zu leeren.'}</p>
              {/if}
              {#if !dabei.length && passendeMagazine(e.waffe, d).length}
                <p class="hinweis">{wechsel ? 'Keine weiteren passenden Magazine dabei.' : 'Keine passenden Schnelllader bzw. Ladestreifen dabei.'}</p>
              {/if}
            {/if}
            {#if wechsel && e.magazin}
              <p class="hinweis">Eingesetzt: {sorteName(e.magazin.id)} · Zustand {zustandName(e.magazin.zustand, d)}</p>
            {/if}
            {#if schreiben}
              <div class="bearbeiten">
                <label>Munition in der Waffe
                  {@render typWahl(munitionstypen(w, d), e.munitionstyp, (t) => setze({ ...e, munitionstyp: t }))}
                </label>
                {#if wechsel}
                  <label>Eingesetztes Magazin
                    <select value={e.magazin?.id ?? ''} onchange={(ev) => { const v = (ev.target as HTMLSelectElement).value; onaendern(v ? magazinsorteSetzen(c, e, v, d) : magazinHerausnehmen(c, e, d)); }}>
                      <option value="">kein Magazin</option>
                      {#each passendeMagazine(e.waffe, d) as m (m.id)}<option value={m.id}>{m.name}</option>{/each}
                    </select>
                  </label>
                {/if}
                <label>In der Waffe (höchstens {kapazitaet(e, d)})
                  <input type="number" inputmode="numeric" min="0" max={kapazitaet(e, d)} value={e.im_magazin}
                    onchange={(ev) => setze({ ...e, im_magazin: Math.min(kapazitaet(e, d), zahl((ev.target as HTMLInputElement).value)), munitionstyp: e.munitionstyp || (munitionstypen(w, d)[0] ?? '') })} />
                </label>
                {#if passendeMagazine(e.waffe, d).length}
                  <div class="neu">
                    <select aria-label="Magazin hinzufügen" bind:value={neuesMagazin}>
                      <option value="">{wechsel ? 'Magazin' : 'Schnelllader bzw. Ladestreifen'} hinzufügen …</option>
                      {#each passendeMagazine(e.waffe, d) as m (m.id)}<option value={m.id}>{m.name}</option>{/each}
                    </select>
                    <button class="haupt" disabled={!neuesMagazin} onclick={magazinHinzu}>Hinzufügen</button>
                  </div>
                {/if}
              </div>
            {/if}
          </section>
        {:else if !imGefecht && nachladearten(c, e, d).length}
          <div class="knoepfe"><button onclick={() => onnachladen(e.id)}>Nachladen</button></div>
        {/if}

        {#if aufsatzTeil}
          <section class="abschnitt teil">
            <h3 class="abschnitt-titel">Aufsätze</h3>
            {#if schreiben}
              {#each passendeAufsaetze(w, d) as a (a.id)}
                <label class="schalter"><input type="checkbox" checked={e.aufsaetze.some((t) => t.id === a.id)}
                  onchange={(ev) => aufsatzUmschalten(e, a.id, (ev.target as HTMLInputElement).checked)} /> {a.name}</label>
              {/each}
            {:else}
              {#each e.aufsaetze as t (t.id)}
                <div class="mag-zeile"><span>{aufsatzName(t.id)} <span class="hinweis">· Zustand {zustandName(t.zustand, d)}</span></span>
                  {#if !imGefecht}<button class="klein" aria-label="{aufsatzName(t.id)} abnehmen" onclick={() => onaendern(aufsatzAbnehmen(c, e, t.id, d))}>✕</button>{/if}
                </div>
              {:else}
                <p class="hinweis">Kein Aufsatz angebracht.</p>
              {/each}
              {#if !imGefecht}
                {#each loseAufsaetzeFuer(c, e, d) as l (l.index)}
                  <div class="mag-zeile"><span class="hinweis">{l.aufsatz.name} (lose)</span>
                    <button class="klein" aria-label="{l.aufsatz.name} anbringen" onclick={() => onaendern(aufsatzAnbringen(c, e, l.index, d))}>✓</button>
                  </div>
                {/each}
              {:else}
                <p class="hinweis">Im Gefecht: Main → Aufsatz anbringen oder abnehmen.</p>
              {/if}
            {/if}
          </section>
        {/if}

        {#if !imGefecht && (!aktiv || e.ladehemmung)}
          <div class="knoepfe">
            {#if !aktiv}<button onclick={() => onaendern(waffeAktivieren(c, e.id))}>Als aktive Waffe nehmen</button>{/if}
            {#if e.ladehemmung}<button onclick={() => onladehemmung(e.id)}>Ladehemmung beheben</button>{/if}
          </div>
        {/if}
        {#if schreiben}
          <div class="knoepfe">
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
  <h2>Munition</h2>
  {#if c.ausruestung.munition.length}
    <ul class="zeilen">
      {#each c.ausruestung.munition as m, i (`${m.kaliber}|${m.typ}`)}
        <li class="anzahl-zeile">
          <span class="name"><strong>{kaliberText(m.kaliber)} · {m.typ}</strong></span>
          {#if schreiben}
            <input class="anzahl-feld" type="number" inputmode="numeric" min="0" value={m.anzahl} aria-label="Anzahl"
              onchange={(ev) => munitionAnzahl(i, zahl((ev.target as HTMLInputElement).value))} />
          {:else}
            <strong class="zahl">{m.anzahl}</strong>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hinweis">Keine lose Munition.</p>
  {/if}
  {#if schreiben}
    <div class="neu">
      <select aria-label="Munition hinzufügen" bind:value={neueMunition}>
        <option value="">Kaliber und Typ wählen …</option>
        {#each d.munition.eintraege as k (k.id)}
          <optgroup label={k.name}>{#each Object.keys(k.typen) as t (t)}<option value={`${k.id}|${t}`}>{k.name} · {t}</option>{/each}</optgroup>
        {/each}
      </select>
      <button class="haupt" disabled={!neueMunition} onclick={munitionHinzu}>Hinzufügen</button>
    </div>
  {/if}
</section>

{#if ohneWaffe.length}
  <section class="karte">
    <h2>Magazine ohne Waffe</h2>
    <p class="hinweis">Diese Magazine passen an keine deiner Waffen. Alle anderen stehen bei ihrer Waffe.</p>
    <div class="mag-reihe">
      {#each ohneWaffe as { m, index } (index)}
        <div class="mag-spalte">
          <div class="mag-kachel">{@render magInhalt(m.inhalt, magazinPlatz(m.id, d), m.typ, sorteName(m.id))}</div>
          {#if schreiben}
            <button class="klein gefahr-text" aria-label="Magazin entfernen" onclick={() => ausr({ magazine: c.ausruestung.magazine.filter((_, j) => j !== index) })}>✕</button>
          {:else if !imGefecht && m.inhalt > 0}
            <button class="klein" onclick={() => onaendern(magazinLeeren(c, index, d))}>Leeren</button>
          {/if}
        </div>
      {/each}
    </div>
  </section>
{/if}

{#if c.ausruestung.aufsaetze.length || schreiben}
  <section class="karte">
    <h2>Aufsätze</h2>
    {#if c.ausruestung.aufsaetze.length}
      <ul class="zeilen">
        {#each c.ausruestung.aufsaetze as t, i (i)}
          <li class="anzahl-zeile"><span class="name"><strong>{aufsatzName(t.id)}</strong><span class="hinweis">Zustand {zustandName(t.zustand, d)}</span></span>
            {#if schreiben}<button class="flach klein gefahr-text" onclick={() => ausr({ aufsaetze: c.ausruestung.aufsaetze.filter((_, j) => j !== i) })}>entfernen</button>{/if}
          </li>
        {/each}
      </ul>
      <p class="hinweis">Anbringen: Waffe aufklappen, unter Aufsätze ✓ tippen.</p>
    {:else}
      <p class="hinweis">Keine losen Aufsätze.</p>
    {/if}
    {#if schreiben}
      <div class="neu">
        <select aria-label="Aufsatz hinzufügen" bind:value={neuerAufsatz}>
          <option value="">Aufsatz wählen …</option>
          {#each d.aufsaetze.eintraege.filter((a) => !a.waffe && !a.nahkampfwaffe) as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
        </select>
        <button class="haupt" disabled={!neuerAufsatz} onclick={() => { ausr({ aufsaetze: [...c.ausruestung.aufsaetze, { id: neuerAufsatz, zustand: neu }] }); neuerAufsatz = ''; }}>Hinzufügen</button>
      </div>
    {/if}
  </section>
{/if}

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
            <span class="hinweis">Zustand {zustandName(n.zustand, d)}</span>
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
      <button class="haupt" disabled={!neueNk} onclick={() => { ausr({ nahkampfwaffen: [...c.ausruestung.nahkampfwaffen, { id: freieId(c, 'nk'), waffe: neueNk, trageort: trageorte[0]!, anzahl: 1, zustand: neu }] }); neueNk = ''; }}>Hinzufügen</button>
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
      {#each c.ausruestung.ruestung as t (t.id)}
        <li class="anzahl-zeile"><span class="name"><strong>{d.schutz.ruestung.find((r) => r.id === t.id)?.name ?? t.id}</strong><span class="hinweis">Zustand {zustandName(t.zustand, d)}</span></span>
          {#if schreiben}<button class="flach klein gefahr-text" onclick={() => ausr({ ruestung: c.ausruestung.ruestung.filter((x) => x !== t) })}>entfernen</button>{/if}
        </li>
      {/each}
      {#if c.ausruestung.schild}
        <li class="anzahl-zeile"><span class="name"><strong>{d.schutz.schilde.find((s) => s.id === c.ausruestung.schild!.id)?.name}</strong><span class="hinweis">Zustand {zustandName(c.ausruestung.schild.zustand, d)}</span></span>
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
          {#each d.schutz.ruestung.filter((r) => !c.ausruestung.ruestung.some((t) => t.id === r.id)) as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
        </optgroup>
        <optgroup label="Schild">
          {#each d.schutz.schilde as s (s.id)}<option value={`schild:${s.id}`}>{s.name}</option>{/each}
        </optgroup>
      </select>
      <button class="haupt" disabled={!neueRuestung} onclick={() => {
        if (neueRuestung.startsWith('schild:')) ausr({ schild: { id: neueRuestung.slice(7), zustand: neu } });
        else ausr({ ruestung: [...c.ausruestung.ruestung, { id: neueRuestung, zustand: neu }] });
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
  <Bericht titel={bericht.titel} zeilen={bericht.zeilen} onweiter={() => { onaendern(bericht!.nach); bericht = null; }} onzurueck={() => (bericht = null)} />
{/if}

<style>
  .name { display: flex; flex-direction: column; min-width: 0; }
  /* Magazine und Aufsätze als eigene Fläche, damit sie sich von den Werten oben abheben (Wunsch 19.11.2026). */
  .detail .abschnitt.teil { background: var(--flaeche-2); border-radius: var(--radius); padding: var(--abstand-3); border-top: none; }
  .detail.abschnitte { gap: var(--abstand-3); }
  .abschnitt h3.abschnitt-titel { font-size: 0.95rem; }
  .mag-reihe { display: flex; flex-wrap: wrap; gap: var(--abstand-2); align-items: flex-start; }
  .mag-spalte { display: flex; flex-direction: column; align-items: center; gap: var(--abstand-1); }
  .mag-kachel { display: flex; flex-direction: column; align-items: center; gap: var(--abstand-1); min-width: 52px;
    padding: var(--abstand-2) var(--abstand-1); border: 1px solid var(--linie); border-radius: var(--radius); background: var(--flaeche); }
  .mag-kachel.eingesetzt { border: 2px solid var(--akzent); }
  button.mag-kachel { min-height: var(--tipp); }
  /* Angetippt: Fläche wie jede Auswahl, dazu ein Strich unten, damit es sich vom eingesetzten (Akzentrahmen) unterscheidet. */
  button.mag-kachel[aria-pressed='true'] { background: var(--gewaehlt); box-shadow: inset 0 -4px 0 var(--akzent); }
  .mag-menue { border-top: 1px solid var(--linie); padding-top: var(--abstand-2); }
  .mag-kachel .zahl { font-size: 1.1rem; line-height: 1; }
  .mag-kachel small { font-size: 0.75rem; color: var(--text-2); line-height: 1.1; text-align: center; }
  .mag-kachel .unter { color: var(--akzent); }
  .stand-mag { display: flex; align-items: center; gap: var(--abstand-2); }
  .stand-text { display: flex; flex-direction: column; align-items: flex-end; }
  .typpunkt { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--mfarbe); margin-right: var(--abstand-1); vertical-align: middle; }
  .stand { text-align: right; font-family: var(--schrift-zahl); font-variant-numeric: tabular-nums; white-space: nowrap; display: flex; flex-direction: column; align-items: flex-end; }
  .aktiv-text { color: var(--akzent); font-weight: 400; }
  li.aktiv .zeile strong { color: var(--akzent); }
  .lh { color: var(--gefahr); font-size: 0.8rem; font-weight: 400; }
  .knoepfe { display: flex; flex-wrap: wrap; gap: var(--abstand-2); }
  .bearbeiten { display: flex; flex-direction: column; gap: var(--abstand-3); }
  .bearbeiten label:not(.schalter) { margin: 0; display: flex; flex-direction: column; gap: var(--abstand-1); font-weight: 400; }
  .neu { display: flex; gap: var(--abstand-2); }
  .neu select { flex: 1; min-width: 0; }
  .anzahl-zeile { display: flex; align-items: center; gap: var(--abstand-2); justify-content: space-between; padding: var(--abstand-1) 0; min-height: 52px; }
  .klein { min-width: 44px; padding: 0 8px; }
  .ort { padding: 4px 8px; min-height: 40px; margin-top: 4px; }
  .gefahr-text { color: var(--gefahr); }
  .mag-zeile { display: flex; align-items: center; justify-content: space-between; gap: var(--abstand-2); min-height: 44px; }
  .mag-bearbeiten { display: flex; align-items: center; gap: var(--abstand-2); }
  .mag-bearbeiten input { width: 5em; flex: none; }
  .mag-bearbeiten select { flex: 1; min-width: 0; }
  .anzahl-feld { width: 6em; }
</style>
