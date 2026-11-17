<script lang="ts">
  // Schritt 7: Ausrüstung. Der Laden (konzept.md § 3.14) folgt in einer späteren Version; bis dahin wird nur
  // das Startgeld gebucht, und Ausrüstung wird später im Reiter Ausrüstung gekauft.
  import type { Spieldaten } from '../../daten/typen';
  import { erstellungsklasse, startgeld } from '../../regeln/erstellung';
  import type { Charakter } from '../../speicher/charakter';
  import { geld } from '../texte';

  interface Props { c: Charakter; d: Spieldaten }
  let { c, d }: Props = $props();
  const k = $derived(erstellungsklasse(c.erstellung!, d));
</script>

<div class="karte">
  <p>Startgeld: <strong>{geld(startgeld(c, d).summe)}</strong></p>
  <p>Vorratslevel: <strong>{k?.vorratslevel ?? c.vorratslevel_manuell ?? '–'}</strong></p>
  <p class="hinweis">Der Laden kommt in einer der nächsten Versionen. Mit „Abschließen“ wird dein Startgeld ins Kassenbuch gebucht; deine Ausrüstung kaufst du dann im Reiter Ausrüstung.</p>
</div>
