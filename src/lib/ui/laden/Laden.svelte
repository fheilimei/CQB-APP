<script lang="ts">
  // Reiter Laden (konzept.md § 3.14): Geld, Kaufen und Verkaufen mit Korb, Verhandlung über den ganzen Korb,
  // Vorratslevel mit ⬢ Beschaffen. Gerechnet wird im Regelkern (regeln/laden.ts); hier nur Anzeige und Auswahl.
  import type { Spieldaten } from '../../daten/typen';
  import { kontostand } from '../../regeln/geld';
  import {
    beschaffenAnfrage, kaufAnwenden, kaufPruefen, kontakteStufen, korbPreis, korbRahmen, NICHT_VERHANDELT, postenRahmen,
    postenText, preisrahmen, sortiment, verkaufAnwenden, verkaufPreis, verkaufRahmen, verkaufTeile, verkaufText, wareVon,
    zielWaffen, zugang, type KaufPosten, type Verhandlung, type VerkaufPosten, type Ware, type Warenart
  } from '../../regeln/laden';
  import { vorratslevel } from '../../regeln/aufstieg';
  import { gefechtVon } from '../../regeln/probenrechner';
  import { kaliberName, waffeVon } from '../../regeln/waffen';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import Farbtext from '../Farbtext.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';
  import Probenrechner from '../probe/Probenrechner.svelte';
  import { dkMw, geld, mitZeichen, trageortName, type Zeile } from '../texte';
  import { korb, korbFuer, korbLeeren, verkaufSchluessel } from './korb.svelte';

  interface Props { c: Charakter; d: Spieldaten; wuerfelModus: Quelle; onaendern: (c: Charakter) => void }
  let { c, d, wuerfelModus, onaendern }: Props = $props();

  $effect.pre(() => korbFuer(c.id));

  const stand = $derived(kontostand(c));
  const imGefecht = $derived(!!gefechtVon(c));
  const vl = $derived(vorratslevel(c, d));
  const zustaende = $derived(d.regeln.waffenzustand.stufen);
  const zName = (z: string) => d.regeln.waffenzustand.namen[z] ?? z;
  const je = $derived(d.regeln.laden.munition_je);
  const spanneText = (s: { min: number; max: number }) => (s.min === s.max ? geld(s.min) : `${s.min.toLocaleString('de-DE')}–${geld(s.max)}`);

  // ---------- Kaufen

  const KATEGORIEN: { name: string; arten: Warenart[] }[] = [
    { name: 'Waffen', arten: ['waffe'] }, { name: 'Munition', arten: ['munition'] }, { name: 'Magazine', arten: ['magazin'] },
    { name: 'Nahkampf', arten: ['nahkampf'] }, { name: 'Sprengmittel', arten: ['spreng'] }, { name: 'Rüstung', arten: ['ruestung', 'schild'] },
    { name: 'Aufsätze', arten: ['aufsatz'] }, { name: 'Zubehör', arten: ['zubehoer'] }
  ];
  const waren = $derived(sortiment(d));
  let nurErreichbar = $state(false);
  let kontakte = $state(false);
  const kontaktePerk = $derived(c.perks.find((p) => (d.regeln.perk_wirkungen[p] ?? []).some((w) => w.art === 'vorratslevel_weniger')) ?? null);
  const kontakteMoeglich = $derived(kontakteStufen(c, d) > 0);

  function kernwerte(w: Ware): string {
    if (w.art === 'waffe') {
      const x = d.waffen.eintraege.find((y) => y.id === w.id)!;
      return `${x.kategorie} · ${kaliberName(x, d)}`;
    }
    if (w.art === 'munition') {
      const t = d.munition.eintraege.find((m) => m.id === w.id)?.typen[w.typ!];
      return t ? dkMw(t.dk, t.mw, t.stumpf) : '';
    }
    if (w.art === 'magazin') return `${d.waffen.eintraege.find((y) => y.id === w.id)?.magazin ?? '?'} Schuss`;
    return '';
  }

  /** Aufgeklappte Ware (Schlüssel) mit der Auswahl darin. */
  let offen = $state<string | null>(null);
  let wahlZustand = $state('');
  let menge = $state(1);
  let ziel = $state('');

  function aufklappen(w: Ware) {
    if (offen === w.schluessel) { offen = null; return; }
    offen = w.schluessel;
    wahlZustand = d.regeln.waffenzustand.neu;
    menge = w.art === 'munition' ? je : 1;
    ziel = zielWaffen(c, w, d)[0]?.id ?? '';
  }
  const posten = (w: Ware, preis_sl?: number): KaufPosten => ({
    ware: w.schluessel, zustand: w.verbrauch ? null : wahlZustand, menge,
    ...(ziel && (w.art === 'magazin' || w.art === 'zubehoer') ? { ziel } : {}),
    ...(preis_sl !== undefined ? { preis_sl } : {})
  });
  function inDenKorb(p: KaufPosten) {
    const gleich = korb.kauf.findIndex((x) => x.ware === p.ware && x.zustand === p.zustand && x.ziel === p.ziel && x.preis_sl === undefined && p.preis_sl === undefined);
    if (gleich >= 0) korb.kauf[gleich] = { ...korb.kauf[gleich]!, menge: korb.kauf[gleich]!.menge + p.menge };
    else korb.kauf.push(p);
    korb.preisSl = null;
    offen = null;
  }

  // ---------- Beschaffen (Stats, Skills und Perks, Beschaffen)

  let beschaffen = $state<{ ware: Ware; posten: KaufPosten; stufen: number } | null>(null);
  let beschaffenErgebnis = $state<ProbenErgebnis | null>(null);
  let beschaffenPreis = $state<number | null>(null);
  function beschaffenOeffnen(w: Ware, stufen: number) {
    beschaffen = { ware: w, posten: posten(w), stufen };
    beschaffenErgebnis = null;
    beschaffenPreis = null;
  }
  const beschaffenGelungen = $derived(beschaffenErgebnis?.stufe === 'krit' || beschaffenErgebnis?.stufe === 'erfolg');
  /** Vorschlag für den Preis der SL: Krit → Untergrenze der Spanne, sonst die Mitte des Abschnitts. */
  const beschaffenVorschlag = $derived.by(() => {
    if (!beschaffen) return 0;
    if (beschaffenErgebnis?.stufe === 'krit') {
      const einheiten = beschaffen.ware.art === 'munition' ? beschaffen.posten.menge / je : beschaffen.posten.menge;
      return Math.round(beschaffen.ware.preis.min * einheiten);
    }
    return korbPreis([beschaffen.posten], NICHT_VERHANDELT, d);
  });

  // ---------- Verkaufen

  interface Angebot { kat: string; p: VerkaufPosten; name: string; unter: string; max: number }
  function zusammen(namen: string[]): string {
    const n = new Map<string, number>();
    for (const x of namen) n.set(x, (n.get(x) ?? 0) + 1);
    return [...n.entries()].map(([x, k]) => (k > 1 ? `${k} × ${x}` : x)).join(', ');
  }
  const imVerkaufskorb = $derived(new Set(korb.verkauf.map(verkaufSchluessel)));
  const angebote = $derived.by(() => {
    const a = c.ausruestung;
    const liste: Angebot[] = [];
    const zText = (z: string) => `Zustand ${z} (${zName(z)})`;
    const waffeImKorb = (id: string) => imVerkaufskorb.has(`waffe:${id}`);
    for (const e of a.waffen) {
      const teile = verkaufTeile(c, { art: 'waffe', id: e.id }, d);
      liste.push({ kat: 'Waffen', p: { art: 'waffe', id: e.id }, name: teile[0]?.name ?? e.waffe,
        unter: teile.length > 1 ? `${zText(e.zustand)} · mit ${zusammen(teile.slice(1).map((t) => t.name))}` : zText(e.zustand), max: 1 });
    }
    for (const e of a.waffen) {
      if (waffeImKorb(e.id)) continue;
      const w = waffeVon(e, d);
      e.magazine.forEach((m, index) => liste.push({ kat: 'Magazine', p: { art: 'magazin', waffe: e.id, index }, name: `Magazin ${w.name}`,
        unter: `${m.inhalt ? `${m.inhalt} ${m.typ}` : 'leer'} · ${zText(m.zustand)}`, max: 1 }));
      e.zubehoer.forEach((z, index) => liste.push({ kat: 'Zubehör', p: { art: 'zubehoer', waffe: e.id, index },
        name: d.aufsaetze.zubehoer.find((x) => x.id === z.art)?.name ?? z.art, unter: `für ${w.name} · ${z.inhalt ? `${z.inhalt} ${z.typ}` : 'leer'} · ${zText(z.zustand)}`, max: 1 }));
    }
    for (const m of a.munition)
      liste.push({ kat: 'Munition', p: { art: 'munition', kaliber: m.kaliber, typ: m.typ, menge: Math.min(je, m.anzahl) },
        name: `${d.munition.eintraege.find((x) => x.id === m.kaliber)?.name ?? m.kaliber} ${m.typ}`, unter: `${m.anzahl} Schuss lose`, max: m.anzahl });
    for (const n of a.nahkampfwaffen)
      liste.push({ kat: 'Nahkampf', p: { art: 'nahkampf', id: n.id, menge: 1 }, name: d.nahkampfwaffen.eintraege.find((x) => x.id === n.waffe)?.name ?? n.waffe,
        unter: `${(n.anzahl ?? 1) > 1 ? `${n.anzahl} Stück · ` : ''}${zText(n.zustand)}`, max: n.anzahl ?? 1 });
    for (const v of a.vorrat)
      liste.push({ kat: 'Sprengmittel', p: { art: 'spreng', id: v.id, menge: 1 }, name: d.wurf_und_sprengwaffen.eintraege.find((x) => x.id === v.id)?.name ?? v.id,
        unter: `${v.anzahl} Stück · ${trageortName(v.trageort, d)}`, max: v.anzahl });
    a.ruestung.forEach((t, index) => liste.push({ kat: 'Rüstung', p: { art: 'ruestung', index }, name: d.schutz.ruestung.find((x) => x.id === t.id)?.name ?? t.id, unter: zText(t.zustand), max: 1 }));
    if (a.schild) liste.push({ kat: 'Rüstung', p: { art: 'schild' }, name: d.schutz.schilde.find((x) => x.id === a.schild!.id)?.name ?? a.schild.id, unter: zText(a.schild.zustand), max: 1 });
    a.aufsaetze.forEach((t, index) => liste.push({ kat: 'Aufsätze', p: { art: 'aufsatz', index }, name: d.aufsaetze.eintraege.find((x) => x.id === t.id)?.name ?? t.id, unter: `lose · ${zText(t.zustand)}`, max: 1 }));
    // Nur, was einen Preis hat und noch nicht im Korb liegt
    return liste.filter((x) => !imVerkaufskorb.has(verkaufSchluessel(x.p)) && verkaufTeile(c, x.p, d).length);
  });
  const VERKAUF_KATEGORIEN = ['Waffen', 'Munition', 'Magazine', 'Nahkampf', 'Sprengmittel', 'Rüstung', 'Aufsätze', 'Zubehör'];

  let offenV = $state<string | null>(null);
  let mengeV = $state(1);
  function aufklappenV(x: Angebot) {
    const k = verkaufSchluessel(x.p);
    if (offenV === k) { offenV = null; return; }
    offenV = k;
    mengeV = 'menge' in x.p ? x.p.menge : 1;
  }
  const mitMenge = (p: VerkaufPosten, n: number): VerkaufPosten => ('menge' in p ? { ...p, menge: n } : p);
  function inDenVerkaufskorb(x: Angebot) {
    korb.verkauf.push(mitMenge(x.p, mengeV));
    korb.preisSl = null;
    offenV = null;
  }

  // ---------- Korb, Verhandlung, Bericht

  const VERHANDLUNG: [Verhandlung['ergebnis'], string][] = [['keine', 'nicht verhandelt'], ['gewonnen', 'gewonnen'], ['verloren', 'verloren'], ['unentschieden', 'unentschieden']];
  const kauf = $derived(korb.art === 'kauf');
  const korbZeilen = $derived(kauf
    ? korb.kauf.map((p, i) => ({ i, text: postenText(p, d), rahmen: postenRahmen(p, d), sl: p.preis_sl !== undefined }))
    : korb.verkauf.map((p, i) => ({ i, text: verkaufText(c, p, d), rahmen: verkaufRahmen(c, [p], d), sl: false })));
  const rahmen = $derived(kauf ? korbRahmen(korb.kauf, d) : verkaufRahmen(c, korb.verkauf, d));
  const errechnet = $derived(kauf ? korbPreis(korb.kauf, korb.verhandlung, d) : verkaufPreis(c, korb.verkauf, korb.verhandlung, d));
  const preis = $derived(korb.preisSl ?? errechnet);
  const fehler = $derived(kauf ? kaufPruefen(c, korb.kauf, preis, d) : preis < 0 ? ['Der Preis kann nicht negativ sein.'] : []);
  const nachher = $derived(kauf ? stand - preis : stand + preis);
  let verhandelnProbe = $state(false);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  function verhandlungSetzen(v: Verhandlung) { korb.verhandlung = v; korb.preisSl = null; }
  function entfernen(i: number) {
    if (kauf) korb.kauf.splice(i, 1); else korb.verkauf.splice(i, 1);
    korb.preisSl = null;
    if (!korbZeilen.length) korb.offen = false;
  }
  function abschliessen() {
    const liste = korbZeilen.map((z) => z.text).join(', ');
    const zeilen: Zeile[] = [];
    if (kauf) {
      const nach = kaufAnwenden(c, korb.kauf, preis, d);
      zeilen.push({ text: `Du kaufst ${liste} für ${geld(preis)}.` });
      if (korb.kauf.some((p) => wareVon(p.ware, d)?.art === 'waffe'))
        zeilen.push({ text: `Die Waffen liegen ungeladen im Trageort ${trageortName(d.regeln.laden.trageort, d)}; ihre Magazine sind leer.` });
      zeilen.push({ text: `Dein Kontostand sinkt von ${geld(stand)} auf ${geld(nachher)}.` });
      bericht = { zeilen, nach };
    } else {
      const nach = verkaufAnwenden(c, korb.verkauf, preis, d);
      zeilen.push({ text: `Du verkaufst ${liste} für ${geld(preis)}.` });
      if (korb.verkauf.some((p) => p.art === 'waffe' || p.art === 'magazin' || p.art === 'zubehoer'))
        zeilen.push({ text: 'Patronen darin behältst du als lose Munition.' });
      zeilen.push({ text: `Dein Kontostand steigt von ${geld(stand)} auf ${geld(nachher)}.` });
      bericht = { zeilen, nach };
    }
  }
  function berichtWeiter() {
    if (!bericht) return;
    onaendern(bericht.nach);
    korbLeeren();
    bericht = null;
  }
  function artWechseln(a: 'kauf' | 'verkauf') {
    korb.art = a;
    korb.verhandlung = { ...NICHT_VERHANDELT };
    korb.preisSl = null;
    offen = null;
    offenV = null;
  }
</script>

<section class="karte geld">
  <h2>Geld</h2>
  <p class="kontostand zahl">{geld(stand)}</p>
  {#if c.schulden && c.schulden.rest > 0}
    <p class="hinweis">Schulden: noch <span class="zahl">{geld(c.schulden.rest)}</span>, Frist {c.schulden.frist_auftraege} {c.schulden.frist_auftraege === 1 ? 'Auftrag' : 'Aufträge'}</p>
  {/if}
</section>

{#if imGefecht}
  <p class="warnung">Im Gefecht wird nicht gehandelt.</p>
{:else}
  <div class="umschalter" role="group" aria-label="Kaufen oder Verkaufen">
    <button aria-pressed={kauf} onclick={() => artWechseln('kauf')}>Kaufen</button>
    <button aria-pressed={!kauf} onclick={() => artWechseln('verkauf')}>Verkaufen</button>
  </div>

  {#if kauf}
    <div class="stapel">
      <label class="schalter"><input type="checkbox" bind:checked={nurErreichbar} /> Nur, was ich bekomme{#if vl !== null} (Vorratslevel {vl}){/if}</label>
      {#if kontakteMoeglich && kontaktePerk}
        <label class="schalter"><input type="checkbox" bind:checked={kontakte} /> <Farbtext text={`${mitZeichen('perk', kontaktePerk, d)} einsetzen`} /></label>
      {/if}
    </div>
    {#each KATEGORIEN as k (k.name)}
      {@const liste = waren.filter((w) => k.arten.includes(w.art)).map((w) => ({ w, z: zugang(c, w, kontakte, d) })).filter((x) => !nurErreichbar || x.z.art === 'frei')}
      {#if liste.length}
        <section class="karte">
          <details>
            <summary><h2>{k.name}</h2><span class="hinweis zahl">{liste.length}</span><span class="klapppfeil" aria-hidden="true">›</span></summary>
            <ul class="zeilen klappinhalt">
              {#each liste as { w, z } (w.schluessel)}
                {@const auf = offen === w.schluessel}
                <li class:gesperrt={z.art !== 'frei'}>
                  <button class="zeile flach" aria-expanded={auf} onclick={() => aufklappen(w)}>
                    <span class="name">
                      <span>{w.name}</span>
                      <span class="hinweis">{#if kernwerte(w)}{kernwerte(w)} · {/if}Vorratslevel {w.vorratslevel}{#if z.art === 'beschaffen'} · nur über Beschaffen{:else if z.art === 'nicht'} · nicht erhältlich{/if}</span>
                    </span>
                    <span class="wert">{spanneText(w.preis)}</span>
                  </button>
                  {#if auf}
                    {@const p = posten(w)}
                    {@const ziele = zielWaffen(c, w, d)}
                    <div class="detail">
                      {#if w.verbrauch}
                        <p class="hinweis">Verbrauchsware ist immer neu; der Preis liegt in der ganzen Spanne{#if w.art === 'munition'} (je {je} Schuss){/if}.</p>
                      {:else}
                        <div class="gruppe" role="group" aria-label="Zustand">
                          <span class="gruppe-titel">Zustand: {zName(wahlZustand)}</span>
                          <div class="auswahlreihe gleich">
                            {#each zustaende as s (s)}
                              {@const r = preisrahmen(w.preis, s, d)}
                              <button aria-pressed={wahlZustand === s} onclick={() => (wahlZustand = s)}>{s}<small class="zahl">{r.min}–{r.max}</small></button>
                            {/each}
                          </div>
                        </div>
                      {/if}
                      <div class="gruppe">
                        <span class="gruppe-titel">Menge: {menge}{w.art === 'munition' ? ' Schuss' : ' Stück'}</span>
                        <div class="stepper">
                          <button aria-label="weniger" disabled={menge <= (w.art === 'munition' ? je : 1) || w.art === 'schild'} onclick={() => (menge -= w.art === 'munition' ? je : 1)}>−</button>
                          <strong>{menge}</strong>
                          <button aria-label="mehr" disabled={w.art === 'schild'} onclick={() => (menge += w.art === 'munition' ? je : 1)}>+</button>
                        </div>
                      </div>
                      {#if (w.art === 'magazin' || w.art === 'zubehoer') && ziele.length > 1}
                        <label class="feld">Für welche Waffe?
                          <select bind:value={ziel}>
                            {#each ziele as e (e.id)}<option value={e.id}>{waffeVon(e, d).name} ({trageortName(e.trageort, d)})</option>{/each}
                          </select>
                        </label>
                      {:else if (w.art === 'magazin' || w.art === 'zubehoer') && !ziele.length}
                        <p class="hinweis">Du hast keine passende Waffe. Kaufst du sie im selben Korb, kommt es an sie.</p>
                      {/if}
                      <p>Preis: <span class="zahl">{spanneText(postenRahmen(p, d))}</span></p>
                      {#if z.art === 'frei'}
                        <button class="haupt" onclick={() => inDenKorb(p)}>In den Korb</button>
                      {:else if z.art === 'beschaffen'}
                        <p class="hinweis">{z.stufen} {z.stufen === 1 ? 'Stufe' : 'Stufen'} über deinem Vorratslevel: nur über <Farbtext text={mitZeichen('skill', d.regeln.laden.beschaffen.skill, d)} />, {z.stufen * d.regeln.laden.beschaffen.malsteps_je_stufe} Malsteps.</p>
                        <button class="betont" onclick={() => beschaffenOeffnen(w, z.stufen)}>Probe <Farbtext text={mitZeichen('skill', d.regeln.laden.beschaffen.skill, d)} /></button>
                      {:else}
                        <p class="hinweis">Mehr als {d.regeln.laden.beschaffen.stufen_max} Stufen über deinem Vorratslevel: nicht zu bekommen.</p>
                      {/if}
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          </details>
        </section>
      {/if}
    {/each}
  {:else}
    {#if !angebote.length && !korb.verkauf.length}
      <p class="hinweis">Du hast nichts, was sich verkaufen lässt.</p>
    {/if}
    {#each VERKAUF_KATEGORIEN as k (k)}
      {@const liste = angebote.filter((x) => x.kat === k)}
      {#if liste.length}
        <section class="karte">
          <details>
            <summary><h2>{k}</h2><span class="hinweis zahl">{liste.length}</span><span class="klapppfeil" aria-hidden="true">›</span></summary>
            <ul class="zeilen klappinhalt">
              {#each liste as x (verkaufSchluessel(x.p))}
                {@const auf = offenV === verkaufSchluessel(x.p)}
                <li>
                  <button class="zeile flach" aria-expanded={auf} onclick={() => aufklappenV(x)}>
                    <span class="name"><span>{x.name}</span><span class="hinweis">{x.unter}</span></span>
                    <span class="wert">{spanneText(verkaufRahmen(c, [x.p], d))}</span>
                  </button>
                  {#if auf}
                    {@const schritt = x.p.art === 'munition' ? je : 1}
                    <div class="detail">
                      {#if x.max > 1}
                        <div class="gruppe">
                          <span class="gruppe-titel">Menge: {mengeV}{x.p.art === 'munition' ? ' Schuss' : ' Stück'}</span>
                          <div class="stepper">
                            <button aria-label="weniger" disabled={mengeV <= Math.min(schritt, x.max)} onclick={() => (mengeV = Math.max(1, mengeV - schritt))}>−</button>
                            <strong>{mengeV}</strong>
                            <button aria-label="mehr" disabled={mengeV >= x.max} onclick={() => (mengeV = Math.min(x.max, mengeV + schritt))}>+</button>
                          </div>
                        </div>
                      {/if}
                      <p>Preis: <span class="zahl">{spanneText(verkaufRahmen(c, [mitMenge(x.p, mengeV)], d))}</span></p>
                      <button class="haupt" onclick={() => inDenVerkaufskorb(x)}>In den Korb</button>
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          </details>
        </section>
      {/if}
    {/each}
  {/if}
{/if}

{#if bericht}
  <Bericht titel={kauf ? 'Kauf' : 'Verkauf'} zeilen={bericht.zeilen} onweiter={berichtWeiter} onzurueck={() => (bericht = null)} />
{:else if beschaffen}
  {@const b = beschaffen}
  <Dialog titel="Beschaffen">
    <p>{postenText(b.posten, d)}: {b.stufen} {b.stufen === 1 ? 'Stufe' : 'Stufen'} über deinem Vorratslevel.</p>
    <ProbeKern {c} {d} anfrage={beschaffenAnfrage(b.stufen, d)} hinweise={['probe']} {wuerfelModus} mitAusgang bind:ergebnis={beschaffenErgebnis} {onaendern} />
    {#if beschaffenGelungen}
      <label class="feld">Preis der SL
        <input class="zahl" type="number" inputmode="numeric" min="0" value={beschaffenPreis ?? beschaffenVorschlag}
          oninput={(e) => (beschaffenPreis = Number((e.target as HTMLInputElement).value) || 0)} />
      </label>
      <p class="hinweis">{beschaffenErgebnis?.stufe === 'krit' ? 'Krit: Der Preis liegt an der Untergrenze der Spanne.' : 'Preis und Lieferzeit legt die SL fest.'} Beschaffte Ware verhandelt nicht mit.</p>
    {:else if beschaffenErgebnis}
      <p class="hinweis">Ein neuer Versuch ist frühestens im nächsten Auftrag möglich.</p>
    {/if}
    {#snippet knoepfe()}
      <button onclick={() => (beschaffen = null)}>{beschaffenErgebnis && !beschaffenGelungen ? 'Schließen' : 'Abbrechen'}</button>
      <button class="haupt" disabled={!beschaffenGelungen} onclick={() => { inDenKorb({ ...b.posten, preis_sl: beschaffenPreis ?? beschaffenVorschlag }); beschaffen = null; }}>In den Korb</button>
    {/snippet}
  </Dialog>
{:else if korb.offen && korbZeilen.length}
  <Dialog titel={kauf ? 'Korb' : 'Verkaufskorb'}>
    <div class="gruppe">
      <h3 class="gruppe-titel">{kauf ? 'Was du kaufst' : 'Was du verkaufst'}</h3>
      <ul class="zeilen">
        {#each korbZeilen as z (z.i)}
          <li class="posten">
            <span class="name"><span>{z.text}</span><span class="hinweis zahl">{z.sl ? `Preis der SL ${geld(z.rahmen.min)}` : spanneText(z.rahmen)}</span></span>
            <button class="flach klein gefahr-text" onclick={() => entfernen(z.i)}>entfernen</button>
          </li>
        {/each}
      </ul>
    </div>

    <div class="gruppe" role="group" aria-label="Verhandlung">
      <span class="gruppe-titel">Die Verhandlung: {VERHANDLUNG.find(([id]) => id === korb.verhandlung.ergebnis)?.[1]}</span>
      <div class="auswahlreihe">
        {#each VERHANDLUNG as [id, text] (id)}
          <button aria-pressed={korb.verhandlung.ergebnis === id} onclick={() => verhandlungSetzen({ ergebnis: id, krit: false })}>{text}</button>
        {/each}
      </div>
      {#if korb.verhandlung.ergebnis === 'gewonnen' || korb.verhandlung.ergebnis === 'verloren'}
        <label class="schalter"><input type="checkbox" checked={korb.verhandlung.krit}
          onchange={(e) => verhandlungSetzen({ ...korb.verhandlung, krit: (e.target as HTMLInputElement).checked })} /> mit Krit {korb.verhandlung.ergebnis === 'gewonnen' ? 'von dir' : 'des Händlers'}</label>
      {/if}
      <button class="betont" onclick={() => (verhandelnProbe = true)}>Probe <Farbtext text={`${mitZeichen('stat', d.regeln.laden.verhandeln.stat, d)} + ${mitZeichen('skill', d.regeln.laden.verhandeln.skill, d)}`} /></button>
      <p class="hinweis">Ein Versuch für den ganzen {kauf ? 'Einkauf' : 'Verkauf'}, gegen den Wurf {kauf ? 'des Händlers' : 'des Käufers'}. Gewonnen: {kauf ? 'Untergrenze' : 'Obergrenze'}, verloren: {kauf ? 'Obergrenze' : 'Untergrenze'}, sonst die Mitte des Abschnitts.</p>
    </div>

    <div class="gruppe">
      <label class="feld">Preis der SL
        <input class="zahl" type="number" inputmode="numeric" min="0" value={preis}
          oninput={(e) => (korb.preisSl = Number((e.target as HTMLInputElement).value) || 0)} />
      </label>
      <p class="hinweis">Errechnet: <span class="zahl">{geld(errechnet)}</span> (Rahmen <span class="zahl">{spanneText(rahmen)}</span>)</p>
      <p>Kontostand: <span class="zahl">{geld(stand)} → {geld(nachher)}</span></p>
      {#each fehler as f (f)}<p class="warnung">{f}</p>{/each}
    </div>
    {#snippet knoepfe()}
      <button onclick={() => (korb.offen = false)}>Schließen</button>
      <button class="haupt" disabled={fehler.length > 0} onclick={abschliessen}>{kauf ? 'Kaufen' : 'Verkaufen'}</button>
    {/snippet}
  </Dialog>
  {#if verhandelnProbe}
    <Probenrechner {c} {d} stat={d.regeln.laden.verhandeln.stat} skill={d.regeln.laden.verhandeln.skill} {wuerfelModus} {onaendern}
      onschliessen={() => (verhandelnProbe = false)} />
  {/if}
{/if}

<style>
  .geld { gap: var(--abstand-1); }
  .kontostand { font-size: 2rem; margin: 0; }
  .zeilen .name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .gesperrt .zeile .name > span:first-child { color: var(--text-2); }
  .posten { display: flex; justify-content: space-between; align-items: center; gap: var(--abstand-2); min-height: var(--tipp); }
</style>
