<script lang="ts">
  // Steps einer Quelle: „▼2“, „▲1“, „Krit-Schwelle +1“. Kommen die Steps aus Adrenalin oder Ruhepuls,
  // ist der Pfeil rot bzw. blau (darstellung.json `leiter_pfeile`, Wunsch 18.11.2026).
  import type { Darstellung } from '../daten/typen';
  import { vorzeichen } from './texte';
  interface Props {
    q: { malsteps?: number; stepshields?: number; krit_schwelle?: number; richtung?: 'adrenalin' | 'ruhepuls' };
    darstellung: Darstellung;
  }
  let { q, darstellung }: Props = $props();
  const teile = $derived.by(() => {
    const t: { pfeil: '▲' | '▼'; n: number }[] = [];
    if (q.malsteps) t.push(q.malsteps > 0 ? { pfeil: '▼', n: q.malsteps } : { pfeil: '▲', n: -q.malsteps });
    if (q.stepshields) t.push(q.stepshields > 0 ? { pfeil: '▲', n: q.stepshields } : { pfeil: '▼', n: -q.stepshields });
    return t;
  });
  const farbe = $derived(q.richtung ? darstellung.leiter_pfeile[q.richtung] : undefined);
</script>

{#each teile as t, i (i)}{#if i > 0}{' '}{/if}<span class="zahl"><span class:leiterpfeil={!!farbe} style:color={farbe}>{t.pfeil}</span>{t.n}</span>{/each}{#if q.krit_schwelle}{teile.length ? ' ' : ''}Krit-Schwelle {vorzeichen(q.krit_schwelle)}{/if}
