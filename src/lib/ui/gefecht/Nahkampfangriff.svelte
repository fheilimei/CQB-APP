<script lang="ts">
  // Nahkampfangriff, ausgehend (konzept.md § 3.8b, § 3.7c; Regelwerk: Kampfsystem, Nahkampf): Waffe · Stand beider
  // Seiten · Ansage · Angriffsprobe (Agility + Nahkampf) · Ausgang, den die SL nach dem Vergleich ansagt · Zone und
  // Bericht mit Block „Für die SL“. „Weiter“ im Bericht verbraucht Main bzw. Break und schreibt ins Gefechtsprotokoll.
  import type { Spieldaten } from '../../daten/typen';
  import { eigenerStand } from '../../regeln/aktionen';
  import {
    alsBreak, angriffsSteps, angriffsTreffer, angriffsWaffen, angriffUebernehmen, eigeneKampfkunst, malstepsDesGegners, ueberlegen
  } from '../../regeln/nahkampf';
  import { gefechtVon, leiterStand } from '../../regeln/probenrechner';
  import { ansageMoeglich, type Ansage } from '../../regeln/schiessen';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import type { Wurf } from '../../wuerfel/wuerfel';
  import Bericht from '../Bericht.svelte';
  import Dialog from '../Dialog.svelte';
  import ProbeKern, { type ProbenErgebnis } from '../probe/ProbeKern.svelte';
  import { AKTION_NAME, ERGEBNIS_SATZ, malstepsText, mitZeichen, standAdjektiv, standVerb, wurfZahl, zoneName, type Zeile } from '../texte';
  import Wuerfel from '../Wuerfel.svelte';

  interface Props {
    c: Charakter;
    d: Spieldaten;
    als: 'main' | 'break';
    zonenModus: Quelle;
    wuerfelModus: Quelle;
    onaendern: (c: Charakter) => void;
    onfertig: (c: Charakter) => void;
    onabbrechen: () => void;
  }
  let { c, d, als, zonenModus, wuerfelModus, onaendern, onfertig, onabbrechen }: Props = $props();

  const g = $derived(gefechtVon(c)!);
  const r = $derived(d.regeln);
  /** Als Breakaction nur Waffen, deren Länge das erlaubt (kurz: Armeslänge, lang: Abfangen). */
  const waffen = $derived(angriffsWaffen(c, d).filter((w) => als === 'main' || alsBreak(w.laenge, d) !== null));
  let waffeId = $state('');
  $effect.pre(() => { if (!waffen.some((w) => w.id === waffeId)) waffeId = waffen[0]?.id ?? ''; });
  const waffe = $derived(waffen.find((w) => w.id === waffeId));

  let gegnerStand = $state('');
  $effect.pre(() => { if (!gegnerStand) gegnerStand = r.staende[0]!.id; });
  let langeWaffe = $state(false);
  let ansage = $state<Ansage>('keine');
  let ansageZone = $state<string | null>(null);
  let probe = $state<ProbenErgebnis | null>(null);
  let ausgang = $state<'getroffen' | 'daneben' | null>(null);
  let kritHand = $state<boolean | null>(null);
  let wirkung = $state<string | null>(null);
  let w8Zone = $state<string | null>(null);
  let bericht = $state<{ zeilen: Zeile[]; nach: Charakter } | null>(null);

  const meinStand = $derived(eigenerStand(g, d));
  const ueber = $derived(ueberlegen(meinStand, gegnerStand, d));
  const istLang = $derived(waffe?.laenge === 'lang');
  const lage = $derived({ eigenerStand: meinStand, gegnerStand, langeWaffeInArmeslaenge: istLang && langeWaffe, ansage });
  const ansageGeht = $derived(ansageMoeglich(leiterStand(c), g.sichtstufe, r));
  $effect.pre(() => { if (!ansageGeht && ansage !== 'keine') ansage = 'keine'; });
  const zonen = $derived(d.koerperzonen.eintraege.filter((z) => z.w8 !== null));
  const rumpf = $derived(d.koerperzonen.eintraege.find((z) => z.w8 === null));
  /** Krit: vorbelegt aus dem eigenen Wurf, von Hand änderbar. */
  const krit = $derived(kritHand ?? probe?.stufe === 'krit');
  // R35 (entschieden): Kampfkunst-Wirkungen nur beim Angriff mit einer Kampfkunst, und nur deren Wirkungen.
  const kampfkunst = $derived(waffe?.kampfkunst ? eigeneKampfkunst(c, meinStand, gegnerStand, d, waffe.kampfkunst) : []);
  /** Hättest du mit einer deiner Kampfkünste hier eine Wirkung? Dann ein Hinweis, wenn eine andere Waffe gewählt ist. */
  const kunstMoeglich = $derived(!waffe?.kampfkunst && eigeneKampfkunst(c, meinStand, gegnerStand, d).length > 0);
  $effect.pre(() => { if (wirkung && !kampfkunst.some((k) => k.wirkung.id === wirkung)) wirkung = null; });
  const zone = $derived(ansage === 'zone' ? ansageZone : ansage === 'rumpf' ? (rumpf?.id ?? null) : w8Zone);
  const treffer = $derived(waffe && zone ? angriffsTreffer(c, waffe, zone, d) : null);
  const kannWeiter = $derived(!!waffe && !!ausgang && (ausgang === 'daneben' || !!zone) && (ansage !== 'zone' || !!ansageZone));

  function standWahl(id: string) { gegnerStand = id; wirkung = null; }
  function zoneAusWurf(w: Wurf) { w8Zone = d.koerperzonen.eintraege.find((z) => z.w8 === w.ergebnis)?.id ?? null; }
  const ortVon = (id: string) => d.koerperzonen.eintraege.find((z) => z.id === id)?.ort ?? `an der Zone ${zoneName(id, d)}`;

  function weiter() {
    if (!waffe || !ausgang) return;
    const zeilen: Zeile[] = [];
    const bedingung = als === 'break' ? alsBreak(waffe.laenge, d) : null;
    zeilen.push({ text: `Du greifst im Nahkampf an, mit ${waffe.name} (${waffe.art}, ${waffe.laenge})${bedingung ? `, als Breakaction ${bedingung}` : ''}.`, fett: true });
    zeilen.push({ text: `Du ${standVerb(meinStand, 'du', d)}, der Gegner ${standVerb(gegnerStand, 'er', d)}.` });
    if (ueber === 'a') zeilen.push({ text: `Du hast den überlegenen Stand: Der Gegner hat ${malstepsText(r.nahkampf.ueberlegener_stand_malsteps)}.` });
    else if (ueber === 'b') zeilen.push({ text: `Der Gegner hat den überlegenen Stand: ${malstepsText(r.nahkampf.ueberlegener_stand_malsteps)} für dich.` });
    if (lage.langeWaffeInArmeslaenge) zeilen.push({ text: `Der Gegner steht in Armeslänge: Deine lange Waffe bringt dir ${malstepsText(r.nahkampf.lange_waffe_in_armeslaenge)}.` });
    if (ansage !== 'keine' && zone) zeilen.push({ text: `Du sagst ${zoneName(zone, d)} an.` });
    const w = probe?.probe.wert;
    const pr = mitZeichen('skill', r.nahkampf.skill, d);
    if (probe && w) {
      zeilen.push({ text: `Deine ${pr}-Probe ist ${ERGEBNIS_SATZ[probe.stufe]} (${probe.wurf === null ? 'Ausgang eingetragen' : `Wurf ${wurfZahl(probe.wurf)}`}, Zielwert ${w.zielwert}, Krit ≤ ${w.krit_schwelle}).` });
    }
    const sl: string[] = [];
    if (ausgang === 'daneben') {
      zeilen.push({ text: 'Die SL vergleicht: Dein Angriff trifft nicht.', fett: true });
      sl.push('kein Treffer');
    } else if (zone && treffer) {
      zeilen.push({ text: `Die SL vergleicht: Du triffst den Gegner ${ortVon(zone)}.`, fett: true });
      if (krit) zeilen.push({ text: `Dein Krit: ${treffer.krit_folge}${/[.!]$/.test(treffer.krit_folge) ? '' : '.'}`, fett: true });
      sl.push(zoneName(zone, d));
      sl.push(treffer.dk === null ? 'stumpf' : `DK ${treffer.dk}`);
      sl.push(`MW ${treffer.mw} (Nahkampfschaden ${treffer.nahkampfschaden} + Waffe ${waffe.mw})`);
      if (krit) sl.push(`Krit: ${treffer.krit_folge.replace(/\.$/, '')}`);
      const ew = kampfkunst.find((x) => x.wirkung.id === wirkung);
      if (ew) {
        const perks = ew.perks.map((id) => mitZeichen('perk', id, d)).join(', ');
        zeilen.push({ text: `Mit dem überlegenen Stand (${perks}) ${ew.wirkung.tat_du}: Er ${ew.wirkung.folge}.` });
        sl.push(`${ew.wirkung.name}: ${ew.wirkung.folge}`);
      }
    }
    zeilen.push({ text: `Für die SL: ${sl.join(' · ')}`, fett: true });
    zeilen.push({ text: `${AKTION_NAME[als]} −1.` });
    const text = `Nahkampfangriff (${als === 'main' ? 'Main' : 'Break'}): ${waffe.name}, ${ausgang === 'daneben' ? 'kein Treffer' : `Treffer ${zone ? zoneName(zone, d) : ''}${krit ? ', Krit' : ''}`}`;
    bericht = { zeilen, nach: angriffUebernehmen(c, als, text) };
  }
</script>

{#if bericht}
  <Bericht titel="Nahkampfangriff" zeilen={bericht.zeilen} onweiter={() => onfertig(bericht!.nach)} onzurueck={() => (bericht = null)} />
{:else}
  <Dialog titel="Nahkampfangriff">
    <div class="abschnitte">
      <section class="abschnitt">
        <h3 class="abschnitt-titel">Womit greifst du an?</h3>
        {#if waffen.length}
          <label class="feld">Waffe
            <select bind:value={waffeId}>
              {#each waffen as x (x.id)}<option value={x.id}>{x.name}</option>{/each}
            </select>
          </label>
          {#if waffe}
            {@const nks = angriffsTreffer(c, waffe, rumpf?.id ?? '', d)}
            <p class="hinweis">{waffe.art}, {waffe.laenge} · {nks.dk === null ? 'keine DK' : `DK ${nks.dk}`} · MW {nks.nahkampfschaden} + {waffe.mw} = {nks.mw}</p>
            {#if als === 'break'}<p class="hinweis">Als Breakaction: {alsBreak(waffe.laenge, d)}.</p>{/if}
          {/if}
        {:else}
          <p class="fehler">Als Breakaction brauchst du eine kurze oder lange Nahkampfwaffe.</p>
        {/if}
      </section>

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Wie steht ihr?</h3>
        <p>Dein Stand: {standAdjektiv(meinStand, d)}</p>
        <div class="gruppe">
          <span class="gruppe-titel">Stand des Gegners:</span>
          <div class="auswahlreihe gleich" role="group" aria-label="Stand des Gegners">
            {#each r.staende as st (st.id)}
              <button aria-pressed={gegnerStand === st.id} onclick={() => standWahl(st.id)}>{st.adjektiv}</button>
            {/each}
          </div>
        </div>
        {#if ueber === 'a'}
          <p class="ansage klein">Gegner hat {malstepsText(malstepsDesGegners(lage, d))}</p>
          <p class="hinweis">Du hast den überlegenen Stand.</p>
        {:else if ueber === 'b'}
          <p class="ansage klein">Du hast {malstepsText(r.nahkampf.ueberlegener_stand_malsteps)}</p>
          <p class="hinweis">Der Gegner hat den überlegenen Stand.</p>
        {:else}
          <p class="ansage klein">Kein Vorteil</p>
          <p class="hinweis">Gleicher Stand: Keiner hat den überlegenen Stand.</p>
        {/if}
        {#if istLang}
          <label class="schalter"><input type="checkbox" bind:checked={langeWaffe} /> Gegner steht in Armeslänge</label>
          <p class="hinweis">Mit einer langen Waffe gegen ein Ziel in Armeslänge: {malstepsText(r.nahkampf.lange_waffe_in_armeslaenge)}.</p>
        {/if}
      </section>

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Wohin zielst du?</h3>
        <div class="gruppe" role="group" aria-label="Ansage">
          <span class="gruppe-titel">Ansage:</span>
          <div class="auswahlreihe">
            {#each [['keine', 'keine (W8)'], ['rumpf', 'Rumpf'], ['zone', 'Zone']] as [id, text] (id)}
              <button aria-pressed={ansage === id} disabled={id !== 'keine' && !ansageGeht} onclick={() => (ansage = id as Ansage)}>{text}</button>
            {/each}
          </div>
          {#if !ansageGeht}<p class="hinweis">Keine Ansage möglich (Adrenalin oder keine Sicht).</p>{/if}
        </div>
        {#if ansage === 'zone'}
          <div class="gruppe" role="group" aria-label="Angesagte Zone">
            <span class="gruppe-titel">Angesagte Zone:</span>
            <div class="auswahlreihe">
              {#each zonen as z (z.id)}<button aria-pressed={ansageZone === z.id} onclick={() => (ansageZone = z.id)}>{z.name}</button>{/each}
            </div>
            {#if !ansageZone}<p class="fehler">Wähle die angesagte Zone.</p>{/if}
          </div>
        {/if}
      </section>

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Angriffsprobe</h3>
        <ProbeKern {c} {d} anfrage={{ stat: r.nahkampf.stat, skill: r.nahkampf.skill, probe: 'nahkampf', zusatz: angriffsSteps(lage, d) }}
          hinweise={['nahkampf']} {wuerfelModus} sichtVorgewaehlt mitAusgang bind:ergebnis={probe} {onaendern} />
        <p class="hinweis">Sag Stufe und Wurf an. Die SL vergleicht mit der Verteidigung des Gegners.</p>
      </section>

      <section class="abschnitt">
        <h3 class="abschnitt-titel">Ausgang (sagt die SL)</h3>
        <div class="auswahlreihe gleich" role="group" aria-label="Ausgang">
          <button aria-pressed={ausgang === 'getroffen'} onclick={() => (ausgang = 'getroffen')}>getroffen</button>
          <button aria-pressed={ausgang === 'daneben'} onclick={() => (ausgang = 'daneben')}>nicht getroffen</button>
        </div>
        {#if ausgang === 'getroffen'}
          <label class="schalter"><input type="checkbox" checked={krit} onchange={(ev) => (kritHand = (ev.target as HTMLInputElement).checked)} /> Krit (dein Wurf)</label>
          {#if kunstMoeglich}
            <p class="hinweis">Kampfkunst-Wirkungen gibt es nur, wenn du oben statt einer Waffe deine Kampfkunst wählst.</p>
          {/if}
          {#if kampfkunst.length}
            <div class="gruppe">
              <span class="gruppe-titel">Deine Kampfkunst-Wirkung:</span>
              <div class="auswahlreihe" role="group" aria-label="Deine Kampfkunst-Wirkung">
                <button aria-pressed={wirkung === null} onclick={() => (wirkung = null)}>keine</button>
                {#each kampfkunst as k (k.wirkung.id)}
                  <button aria-pressed={wirkung === k.wirkung.id} onclick={() => (wirkung = k.wirkung.id)}>{k.wirkung.name}</button>
                {/each}
              </div>
            </div>
          {/if}
          {#if zone && treffer}
            <p class="ergebnis" aria-live="polite">{zoneName(zone, d)}: {treffer.dk === null ? 'stumpf' : `DK ${treffer.dk}`} · MW {treffer.mw}{#if krit} · Krit{/if}</p>
          {/if}
        {/if}
      </section>

      {#if ausgang === 'getroffen' && ansage === 'keine'}
        <Wuerfel art="W8" modus={zonenModus} titel="Trefferzone (W8)" onwurf={zoneAusWurf}>
          {#if w8Zone}<p class="ansage">{zoneName(w8Zone, d)}</p>{/if}
        </Wuerfel>
      {/if}
    </div>

    {#snippet knoepfe()}
      <button onclick={onabbrechen}>Abbrechen</button>
      <button class="haupt" disabled={!kannWeiter} onclick={weiter}>Weiter</button>
    {/snippet}
  </Dialog>
{/if}

<style>
  select { width: 100%; }
  /* Standvorteil: wie eine Ansage, aber kleiner, weil er nur eine Zwischeninfo ist (wie in Getroffen). */
  .ansage.klein { font-size: 1.3rem; padding: var(--abstand-2); }
  .ergebnis { margin: 0; text-align: center; font-size: 1.1rem; }
</style>
