<script lang="ts">
  // Schritt 7: Ausrüstung (konzept.md § 3.0, § 3.14). Derselbe Laden wie im Reiter, nur Kaufen, mit dem
  // Startgeld. Der Korb steht im Entwurf (erstellung.korb), bleibt also auch über „Später“ erhalten, und wird
  // erst mit „Abschließen“ gebucht. Der Laden arbeitet mit der Vorschau (fertiger Charakter mit Startgeld).
  import { onDestroy, untrack } from 'svelte';
  import type { Spieldaten } from '../../daten/typen';
  import type { KaufPosten, Verhandlung } from '../../regeln/laden';
  import type { Charakter, Quelle } from '../../speicher/charakter';
  import Laden from '../laden/Laden.svelte';
  import { korb, korbFuer } from '../laden/korb.svelte';

  interface Props { c: Charakter; d: Spieldaten; vorschau: Charakter; wuerfelModus: Quelle }
  let { c = $bindable(), d, vorschau, wuerfelModus }: Props = $props();

  // Korb aus dem Entwurf in den gemeinsamen Korb des Ladens holen …
  untrack(() => {
    const k = $state.snapshot(c.erstellung!.korb);
    korbFuer(c.id);
    korb.art = 'kauf';
    korb.kauf = k.kauf as KaufPosten[];
    korb.verhandlung = k.verhandlung as Verhandlung;
    korb.preisSl = k.preis_sl;
  });
  // … jede Änderung in den Entwurf zurückschreiben (wird von der Erstellung gespeichert) …
  $effect(() => {
    if (korb.charakter !== untrack(() => c.id)) return; // schon verlassen: den Entwurf nicht überschreiben
    const neu = { kauf: $state.snapshot(korb.kauf) as KaufPosten[], verhandlung: $state.snapshot(korb.verhandlung) as Verhandlung, preis_sl: korb.preisSl };
    untrack(() => { c.erstellung!.korb = neu; });
  });
  // … und beim Verlassen des Schritts den gemeinsamen Korb wieder leeren.
  onDestroy(() => korbFuer(''));
</script>

<Laden c={vorschau} {d} {wuerfelModus} erstellung onaendern={() => {}} />
