// Fester Kopfbereich eines Dialogs unter dem Titel: scrollt nicht mit. Eine Komponente im Dialog (z. B. ProbeKern mit
// Zielwert und Krit-Schwelle) kann dort einen Teil anzeigen, damit er beim Scrollen sichtbar bleibt.
import { getContext, setContext, type Snippet } from 'svelte';

const SCHLUESSEL = Symbol('dialogkopf');

export interface DialogKopf {
  setzen: (s: Snippet | null) => void;
}

export function dialogKopfAnbieten(k: DialogKopf): void {
  setContext(SCHLUESSEL, k);
}

/** Kopfbereich des umgebenden Dialogs, oder null außerhalb eines Dialogs. */
export function dialogKopf(): DialogKopf | null {
  return getContext<DialogKopf | undefined>(SCHLUESSEL) ?? null;
}
