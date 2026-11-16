# CQB-App: Regeln für die Arbeit in diesem Repo

Diese Datei gehört als `CLAUDE.md` ins Wurzelverzeichnis des App-Repos. Im Planungs-Repo CQB heißt sie `App/docs/CLAUDE-app-repo.md`, damit sie dort nicht als Arbeitsanweisung gilt. Sie gilt für jede Arbeit an der App.

## Worum es geht

Die App ist ein digitaler Charakterbogen für das Tabletop-Rollenspiel **CQB**, gedacht für das Handy am Spieltisch. Was sie können soll und wie sie bedient wird, steht in `docs/konzept.md`. Wie die Daten aussehen, steht in `docs/datenformat.md`.

**Der Nutzer programmiert nicht.** Er entscheidet über Regeln und Bedienung; alle Änderungen am Code macht Claude Code. Daraus folgt:
- Erkläre Ergebnisse in einfachem Deutsch: was jetzt geht, was sich für den Spieler ändert, was offen ist. Keine Code-Begriffe in Zusammenfassungen, außer der Nutzer fragt danach.
- Frage vor Entscheidungen, die die Bedienung oder eine Regel betreffen und in den Dokumenten nicht festgelegt sind. Technische Entscheidungen innerhalb der Leitlinien triffst du selbst und nennst sie kurz.
- Wenn der Nutzer etwas am Handy testen soll, sag genau, was er antippen soll und was er sehen müsste.

## Quellen und Vorrang

| Ordner | Inhalt | Ändern? |
| --- | --- | --- |
| `regelwerk/` | Regelwerk als Markdown (Kopie aus dem Repo CQB) | **Nie.** Nur auf ausdrücklichen Auftrag als Ganzes neu übernehmen (unten). |
| `docs/konzept.md` | Funktionen, Abläufe, Bedienung, Regelkern | Ja, wenn eine Entscheidung fällt oder sich ändert. |
| `docs/datenformat.md` | JSON-Formate der Daten und des Charakters | Ja, zusammen mit der Änderung an Daten oder Code. |
| `docs/offen.md` | offene Fragen und Punkte | Ja (unten). |

**Vorrang bei Widerspruch:** Für Regeln und Zahlen gilt das **Regelwerk**. Für Bedienung und Aufbau der App gilt das **Konzept**. Findest du einen Widerspruch zwischen Konzept bzw. Datenformat und Regelwerk, folge dem Regelwerk, korrigiere das Dokument und nenne die Stelle in deiner Zusammenfassung.

Verweise in den Dokumenten der Form „(Kampfsystem, Lage)“ nennen Datei und Abschnitt in `regelwerk/`.

## Technik

- **Svelte 5 mit Vite**, **TypeScript**. Tests mit **Vitest**. PWA mit `vite-plugin-pwa`. Speicher in IndexedDB (eine kleine Hilfsbibliothek wie `idb` ist erlaubt).
- Weitere Abhängigkeiten nur, wenn sie deutlich Code sparen. Keine Server, keine Konten, keine Analyse- oder Tracking-Dienste.
- **Veröffentlichung:** Eine GitHub Action baut bei jedem Push auf `main` und stellt die App auf GitHub Pages. Vorher laufen Typprüfung, Tests und Datenprüfung; schlägt etwas fehl, wird nicht veröffentlicht.
- Der Pfad unter GitHub Pages (Repo-Name) muss in der Vite-Konfiguration als `base` stehen, sonst findet die installierte App ihre Dateien nicht.

## Aufbau: drei Schichten

```
public/data/        Spieldaten als JSON (regeln.json, waffen.json, klassen.json …)
src/lib/regeln/     Regelkern: reine TypeScript-Funktionen, ohne Svelte, ohne Speicher, ohne UI
src/lib/daten/      Laden und Prüfen der JSON-Daten, Typen
src/lib/speicher/   Charaktere speichern, laden, migrieren, exportieren, importieren
src/lib/ui/         Svelte-Komponenten
tests/              Vitest-Tests (Regelkern, Daten, Speicher)
```

1. **Daten:** Jede Zahl, die eine Regel festlegt, steht in `public/data/`, nie im Code (Step-Faktoren, Malsteps, Fristen, Preise …). Eine geänderte Regelzahl darf nur eine Zeile JSON betreffen.
2. **Regelkern:** Funktionen bekommen Charakter und Daten als Eingabe und geben Ergebnisse zurück. Kein Zugriff auf Oberfläche oder Speicher. Jede Funktion hat Tests.
3. **Oberfläche:** zeigt an und ruft den Regelkern auf. Abgeleitete Werte (Statwert, Zielwert, Krit-Schwelle, Zugang, Kampfunfähigkeit, Kontostand …) werden immer berechnet, nie als Kopie gespeichert.

Keine Skill-, Perk-, Waffen- oder Klassen-ID fest im Code. Neue Einträge in den Daten müssen ohne Codeänderung funktionieren (offene Listen, `docs/datenformat.md`).

## Daten

- **Quelle der Spieldaten ist `regelwerk/`.** Die JSON-Dateien werden daraus erstellt und bei Änderungen daraus nachgeführt. Ideen und Notizen, die im Regelwerk nicht ausformuliert sind, werden nicht übernommen.
- **Datenprüfung:** Für jede JSON-Datei gibt es einen Typ und einen Test: Pflichtfelder, gültige IDs (`a–z`, `0–9`, `_`), Verweise zwischen Dateien, Rank-Vorschlag passt zum Rank-Set, keine doppelten IDs.
- Vorläufige Werte tragen `"vorlaeufig": true`, wo das Regelwerk sie als vorläufig kennzeichnet.

## Tests

- Jede Regelfunktion hat Unit-Tests. Die Prüfwerte in `docs/konzept.md` § 4 (z. B. Statwert 79 → 67, 50, 33, 18, 8) sind Pflichttests.
- Rechnungen, die das Regelwerk Schritt für Schritt beschreibt (Schadensablauf, Haltezahl, Krit-Schwelle, Zugang einer Klasse), werden mit Fällen aus dem Regelwerk getestet, auch mit Grenzfällen (genau getroffen, 6 Malsteps, DK gleich Schutzwert).
- Speicherformat: Test für Export → Import ohne Verlust und für die Migration jeder älteren Schemaversion.

## Oberfläche

- **Handy zuerst:** Hochformat, Bedienung mit einer Hand, Breite ab 360 Pixel. Tippflächen mindestens 44 × 44 Pixel. Wichtige Knöpfe im Daumenbereich unten.
- **Hell und dunkel** (Einstellung, Standard: System).
- **Texte in der Oberfläche** nach `docs/konzept.md` § 2, Abschnitt „Texte in der Oberfläche“. Besonders:
	- Deutsch, Begriffe exakt wie im Regelwerk (Malstep, Stepshield, Breakaction, Haltezahl …).
	- Das Wort „Leiter“ erscheint nie in der Oberfläche; angezeigt wird der Stand („Adrenalin 2“, „Ruhepuls 1“, „Over the Edge“; bei 0 nichts). Keine Kürzel wie A1 oder R2.
	- Auswahlknöpfe bilden mit ihrer Überschrift einen Satz („Stand des Ziels: stehend“).
	- Vor Namen von Stats, Skills und Perks stehen Zeichen und Farbe aus `darstellung.json` (■ Stat, ⬢ Skill, ◆ Perk). ▲ und ▼ bedeuten nur Stepshields und Malsteps.
- **Bericht vor jeder Sammeländerung** (Konzept § 3.0c): Ändert die App mehr als einen Wert auf einmal, zeigt sie vorher, was passiert.
- **Würfel:** Jede Stelle, an der ein Würfelergebnis entsteht, läuft über die gemeinsame Würfelkomponente (Konzept § 2, Leitlinie 6).

## Speicher

- Jeder Charakter trägt eine Schemaversion. Ändert sich das Format, gibt es eine Migration und einen Test dafür. Kein Charakter darf durch ein Update unlesbar werden.
- Export und Import einzelner Charaktere als JSON-Datei funktionieren von Anfang an.

## Arbeitsweise

- **Reihenfolge** nach `docs/konzept.md` § 5. Arbeite in kleinen Schritten; jeder Schritt endet mit grünen Tests und einem Commit.
- **Commits** auf `main`, Nachricht auf Deutsch, die sagt, was sich für den Spieler ändert. Vorher den aktuellen Stand holen (`git pull --rebase`).
- **Dokumente mitführen:** Ändert sich eine Entscheidung zu Bedienung, Daten oder Ablauf, wird `docs/konzept.md` bzw. `docs/datenformat.md` im selben Commit angepasst.
- **Offene Punkte:** Stößt du auf eine offene Frage (Regel unklar, Bedienung nicht festgelegt, Widerspruch), trage sie in `docs/offen.md` ein, ohne zu fragen, und arbeite mit der nächstliegenden Lösung weiter, wenn sie sich leicht ändern lässt. Sonst frag.
- **Offline prüfen:** Nach Änderungen am Service Worker oder an den Daten prüfen, ob die App nach dem ersten Laden ohne Netz startet und die Daten hat.

## Regelwerk neu übernehmen

Nur auf Auftrag des Nutzers („Übernimm das aktuelle Regelwerk“):
1. Die Ordner `Grundmechanik/`, `Ausrüstung/` und `Charaktererstellung und Aufstieg/` aus dem Repo CQB (Zweig `main`) nach `regelwerk/` kopieren. Ordner, deren Name mit `Sicherungskopie_` beginnt, und `.base`-Dateien nicht übernehmen.
2. Unterschiede zur bisherigen Kopie auflisten.
3. Für jeden Unterschied prüfen, ob `public/data/`, der Regelkern, `docs/konzept.md` oder `docs/datenformat.md` angepasst werden müssen, und das tun.
4. Dem Nutzer in einfachen Worten sagen, was sich in der App dadurch ändert.
