// Korb des Ladens (konzept.md § 3.14): gilt für den gerade geöffneten Charakter und bleibt beim Wechsel der Reiter
// erhalten. Er wird nicht gespeichert; ein anderer Charakter beginnt mit leerem Korb.
import { NICHT_VERHANDELT, type KaufPosten, type Verhandlung, type VerkaufPosten } from '../../regeln/laden';

export const korb = $state({
  charakter: '',
  art: 'kauf' as 'kauf' | 'verkauf',
  kauf: [] as KaufPosten[],
  verkauf: [] as VerkaufPosten[],
  verhandlung: { ...NICHT_VERHANDELT } as Verhandlung,
  /** Preis der SL für den ganzen Korb; null = der errechnete Preis. */
  preisSl: null as number | null,
  /** Korb aufgeklappt (Fenster Korb). */
  offen: false
});

/** Korb leeren, Verhandlung zurücksetzen. */
export function korbLeeren(art: 'kauf' | 'verkauf' = korb.art) {
  if (art === 'kauf') korb.kauf = [];
  else korb.verkauf = [];
  korb.verhandlung = { ...NICHT_VERHANDELT };
  korb.preisSl = null;
  korb.offen = false;
}

/** Beim Öffnen eines anderen Charakters beginnt der Korb leer. */
export function korbFuer(id: string) {
  if (korb.charakter === id) return;
  korb.charakter = id;
  korb.kauf = [];
  korb.verkauf = [];
  korb.verhandlung = { ...NICHT_VERHANDELT };
  korb.preisSl = null;
  korb.offen = false;
}

/** Schlüssel eines Verkaufspostens, damit nichts doppelt im Korb landet. */
export function verkaufSchluessel(p: VerkaufPosten): string {
  switch (p.art) {
    case 'waffe': return `waffe:${p.id}`;
    case 'magazin': case 'aufsatz': case 'ruestung': return `${p.art}:${p.index}`;
    case 'munition': return `munition:${p.kaliber}:${p.typ}`;
    case 'nahkampf': case 'spreng': return `${p.art}:${p.id}`;
    case 'schild': return 'schild';
  }
}
