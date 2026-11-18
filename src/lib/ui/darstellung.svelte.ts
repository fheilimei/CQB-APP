// Geladene Darstellung (darstellung.json) für Stellen, die nur Text bekommen (Bericht, Hinweise):
// So färbt Farbtext die Zeichen ■ ⬢ ◆, ohne dass jede Komponente die Spieldaten weiterreichen muss.
import type { Darstellung } from '../daten/typen';

export const anzeige = $state<{ darstellung: Darstellung | null }>({ darstellung: null });
