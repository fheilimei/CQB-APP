// Datei speichern und öffnen im Browser (Export und Import von Charakteren).

/**
 * Gibt die Datei ab: über das Teilen-Menü des Geräts, wenn es Dateien teilen kann
 * (behält den Dateinamen auch in Browsern, die ihn beim Herunterladen verwerfen),
 * sonst als Download. Muss direkt aus einem Antippen heraus aufgerufen werden.
 */
export async function dateiSpeichern(name: string, inhalt: string): Promise<void> {
  const datei = new File([inhalt], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: name });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return; // Spieler hat das Menü geschlossen
      // sonst: Teilen ging schief, weiter mit Download
    }
  }
  herunterladen(name, inhalt);
}

function herunterladen(name: string, inhalt: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Öffnet die Dateiauswahl; liefert den Text der gewählten Datei oder null bei Abbruch. */
export function dateiOeffnen(): Promise<string | null> {
  return new Promise((fertig) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => fertig((await input.files?.[0]?.text()) ?? null));
    input.addEventListener('cancel', () => fertig(null));
    input.click();
  });
}
