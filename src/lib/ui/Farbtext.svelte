<script lang="ts">
  // Text, in dem die Zeichen für Stat, Skill und Perk (■ ⬢ ◆) immer in ihrer Farbe stehen (darstellung.json `typen`).
  import { anzeige } from './darstellung.svelte';
  interface Props { text: string }
  let { text }: Props = $props();
  const teile = $derived.by(() => {
    const typen = anzeige.darstellung ? Object.values(anzeige.darstellung.typen) : [];
    const farbe = new Map(typen.map((t) => [t.zeichen, t.farbe]));
    const out: { text: string; farbe?: string }[] = [];
    for (const ch of text) {
      const f = farbe.get(ch);
      const letzt = out.at(-1);
      if (f) out.push({ text: ch, farbe: f });
      else if (letzt && !letzt.farbe) letzt.text += ch;
      else out.push({ text: ch });
    }
    return out;
  });
</script>

{#each teile as t, i (i)}{#if t.farbe}<span class="typzeichen-text" style:color={t.farbe}>{t.text}</span>{:else}{t.text}{/if}{/each}
