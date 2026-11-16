# CQB-App

Digitaler Charakterbogen für das Rollenspiel CQB, als installierbare Web-App (PWA) fürs Handy.
Was die App kann und wie sie bedient wird: `docs/konzept.md`. Datenformat: `docs/datenformat.md`. Offene Fragen: `docs/offen.md`.

## Auf dem Handy installieren

1. Die Adresse der App im Browser öffnen: <https://fheilimei.github.io/CQB-APP/>
2. **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
   **iPhone (Safari):** Teilen-Knopf → „Zum Home-Bildschirm“.
3. Nach dem ersten Start funktioniert die App ohne Netz. Neue Versionen lädt sie beim nächsten Start mit Netz; dann erscheint unten „Eine neue Version ist da“.

Charaktere liegen nur auf dem Gerät. Regelmäßig exportieren (Menü ☰ → ⋯ → Exportieren).

## Spieldaten ändern

Alle Zahlen und Listen aus dem Regelwerk stehen in `public/data/*.json` (eine Datei je Bereich). Eine geänderte Regelzahl ist eine geänderte Zeile dort; der Code bleibt unberührt. Neue Waffen, Skills, Perks oder Klassen sind neue Einträge.
Nach jeder Änderung prüft `npm test` die Daten (Pflichtfelder, IDs, Verweise zwischen den Dateien). Schlägt die Prüfung fehl, wird nicht veröffentlicht.

## Für die Entwicklung

- `npm install`, dann `npm run dev` (lokal), `npm test` (Tests und Datenprüfung), `npm run check` (Typprüfung), `npm run build`.
- Bei jedem Push auf `main` prüft, baut und veröffentlicht die GitHub Action `.github/workflows/pages.yml`.
- Aufbau: `src/lib/daten` (Laden, Typen, Prüfung), `src/lib/regeln` (Regelkern), `src/lib/speicher` (Speichern, Migration, Export/Import), `src/lib/wuerfel` (Würfel), `src/lib/ui` (Oberfläche).
