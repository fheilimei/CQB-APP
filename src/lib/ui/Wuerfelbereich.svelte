<script lang="ts">
  // Hülle für mehrere Würfe eines Ablaufs (z. B. Schießen: Trefferwurf, Trefferzone, Rückstoß): ein gemeinsamer
  // abgesetzter Kasten. Die Würfe darin verwenden Wuerfel mit „eingebettet“; das Ergebnis steht in .wuerfel-ergebnis.
  import type { Snippet } from 'svelte';

  interface Props { titel?: string; children: Snippet }
  let { titel = 'Würfeln', children }: Props = $props();
</script>

<section class="abschnitt wuerfelbereich" aria-label={titel}>
  <h3 class="abschnitt-titel">{titel}</h3>
  {@render children()}
</section>
