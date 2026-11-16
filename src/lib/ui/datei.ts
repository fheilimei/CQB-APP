// Datei speichern und öffnen im Browser (Export und Import von Charakteren).

export function dateiSpeichern(name: string, inhalt: string): void {
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
