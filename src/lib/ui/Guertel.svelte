<script lang="ts">
  // Gürtelgrad eines Skills (Wunsch 18.11.2026): ein Gürtel mit einem Streifen je Stufe am Ende,
  // ab der höchsten Stufe (regeln.json `aufstieg.skill_max`) ganz gefüllt. Einfarbig wie alle Bildzeichen.
  interface Props { stufe: number; max: number }
  let { stufe, max }: Props = $props();
  const voll = $derived(stufe >= max);
  /** Streifen auf dem rechten Ende (x 21,5 … 29,5), gleichmäßig verteilt für max − 1 Plätze. */
  const streifen = $derived(Array.from({ length: voll ? 0 : Math.max(0, stufe) }, (_, i) => 21.5 + (i * 8) / Math.max(1, max - 2)));
</script>

<svg class="guertel" viewBox="0 0 32 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">
  <rect x="1" y="3.5" width="30" height="6" rx="1" fill={voll ? 'currentColor' : 'none'} />
  <rect x="12.5" y="2.5" width="5" height="8" rx="1" fill={voll ? 'currentColor' : 'var(--flaeche)'} />
  <path d="M13.5 10.5L11 15M16.5 10.5L19 15" />
  {#each streifen as x (x)}<path d="M{x} 3.5V9.5" stroke-width="1.6" />{/each}
</svg>

<style>
  .guertel { width: 2.2rem; height: 1.1rem; flex: none; color: var(--text-2); }
</style>
