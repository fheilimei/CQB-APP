---
name: oberflaeche
description: Gestaltung und Prüfung der Oberfläche der CQB-App (Svelte-Komponenten in src/lib/ui, Stile in src/app.css). Immer laden, bevor ein Bildschirm, Dialog, Knopf, Abstand, eine Farbe oder ein Stil gebaut oder geändert wird. Aufruf mit /oberflaeche <Bildschirm> prüft einen vorhandenen Bildschirm gegen die Checkliste und behebt die Fehler gleich.
---

# Oberfläche der CQB-App

Ziel: Der Spieler findet am Spieltisch, mit einer Hand und bei schlechtem Licht, sofort, was er braucht. **Übersichtlichkeit geht vor Vollständigkeit.**

Die Regeln aus `CLAUDE.md` (Abschnitt „Oberfläche“) und `docs/konzept.md` § 2 („Texte in der Oberfläche“, „Leitlinien für die Umsetzung“) gelten weiter. Lies sie, bevor du anfängst. Dieser Skill ergänzt sie um Gestaltung und einen festen Prüfablauf.

## Was den Nutzer stört (wichtigster Teil)

Rückmeldung des Nutzers vom 17.11.2026:
- **Alles ist eine lange Liste.** Man sieht nicht, wo ein Abschnitt endet und der nächste beginnt.
- **Abstände sind ungleich.** Mal 6, mal 8, mal 12, mal 16 Pixel, ohne erkennbaren Sinn.
- **Der Würfelteil sieht aus wie eine weitere Auswahl.** Er muss sich klar von den Auswahlknöpfen abheben.
- **Tippen ohne sichtbare Rückmeldung.** Beispiel Würfel: Tippt man auf eine Schaltfläche (z. B. Krit · gelungen · misslungen), bleibt sie unverändert; nur unten erscheint das Ergebnis. Die getippte Schaltfläche muss danach hervorgehoben sein.
- Besonders aufgefallen: **Waffe wechseln** (`gefecht/WaffeWechseln.svelte`) und **Schießen** (`gefecht/Schiessen.svelte`).

Jede Arbeit an der Oberfläche muss diese Punkte verbessern oder darf sie zumindest nicht verschlimmern.

## Gestaltungsregeln

### 1. Abschnitte statt Liste
- Ein Bildschirm oder Dialog mit mehr als etwa fünf Bedienelementen wird in **Abschnitte** gegliedert. Jeder Abschnitt beantwortet eine Frage („Wie schießt du?“, „Wo ist das Ziel?“, „Würfeln“).
- Jeder Abschnitt hat eine **kurze Überschrift** im gemeinsamen Stil (eine Klasse für alle, kein eigener `h3`-Stil pro Komponente).
- Abschnitte werden sichtbar getrennt: durch größeren Abstand **und** ein zweites Mittel (Trennlinie oder eigene Fläche). Abstand allein reicht am Handy nicht.
- Hinweise und Fehlermeldungen stehen **direkt bei dem Element**, auf das sie sich beziehen, nicht gesammelt darunter.
- Was selten gebraucht wird (Rechenweg, Aufschlüsselung, Erklärtext), ist zugeklappt.

### 2. Ein Abstandsraster
- Abstände kommen nur aus festen Stufen in `src/app.css` (`:root`). Fehlen sie, lege sie beim ersten Einsatz an:
  - `--abstand-1: 4px` (innerhalb eines Elements, z. B. Name und Unterzeile)
  - `--abstand-2: 8px` (zwischen Elementen derselben Gruppe, z. B. Knöpfe einer Auswahl)
  - `--abstand-3: 16px` (zwischen Gruppen in einem Abschnitt)
  - `--abstand-4: 24px` (zwischen Abschnitten)
- **Regel der Nähe:** Was zusammengehört, steht enger zusammen als das, was nicht zusammengehört. Der Abstand zwischen zwei Gruppen ist immer größer als der Abstand innerhalb einer Gruppe.
- Keine freien Pixelwerte für `margin`, `padding` oder `gap` in Komponenten. Ausnahmen (Rahmenstärke, Mindestgröße von Tippflächen) begründest du im Kommentar.
- Abstände gehören an den Behälter (`gap`), nicht an jedes einzelne Kind (`margin`), damit keine Abstände doppelt entstehen.

### 3. Drei Arten von Elementen, drei Aussehen
Der Spieler muss auf einen Blick sehen, was ein Element tut:

| Art | Beispiel | Aussehen |
| --- | --- | --- |
| **Auswahl** (wählt einen Wert, nichts passiert sofort) | Feuermodus, Entfernung, Waffe in der Liste | Chips bzw. Kacheln, gewählt mit Akzentrahmen und Fläche; Überschrift + Wert ergeben einen Satz |
| **Würfeln / Ergebnis** (ein Würfelergebnis entsteht oder wird gezeigt) | Trefferwurf, Trefferzone, Rückstoß | **eigener abgesetzter Kasten** mit eigener Fläche, klar unterhalb aller Auswahlen; sieht anders aus als jede Auswahl |
| **Handlung** (tut etwas) | Weiter, Abbrechen, Schießen | normale Knöpfe; die Haupthandlung im Akzent, unten im Daumenbereich |

- Der **Würfelbereich** kommt immer zuletzt im Inhalt, nach allen Auswahlen, und ist in einem gemeinsamen Kasten gebündelt, auch wenn mehrere Würfel nötig sind (W100, W8, W10). Das Ergebnis (Erfolg, Krit, Ladehemmung) steht in diesem Kasten.
- Die Gestaltung des Würfelbereichs liegt **in der Würfelkomponente bzw. einer gemeinsamen Hülle**, nicht in jedem Ablauf neu. So sieht Würfeln überall gleich aus.
- Info-Zeilen (Werte, die man nur liest) sind keine Knöpfe und sehen nicht so aus.

### 4. Gleiches sieht gleich aus
- Bevor du einen Stil schreibst: Suche in `src/app.css` und in den anderen Komponenten nach einem vorhandenen Baustein (`.karte`, `.zeilen`, `.stepper`, `.schalter`, `Dialog`, `Bericht`, `Wuerfel` …). Nutze ihn.
- Kommt ein Muster in zwei oder mehr Komponenten vor (z. B. Auswahl-Chips `.reihe`, Auswahlliste `.liste`, Abschnittsüberschrift), gehört es als gemeinsame Klasse nach `src/app.css` und wird aus den Komponenten entfernt.
- Farben nur über die Farbvariablen (`--akzent`, `--flaeche-2`, `--text-2` …), nie als Farbwert in einer Komponente. Neue Farben in hell **und** dunkel anlegen.

### 5. Jedes Tippen hat eine sichtbare Folge
Der Spieler muss nach jedem Tippen sehen, dass etwas passiert ist und was jetzt gilt. Nur ein Ergebnis weiter unten reicht nicht, denn das liegt oft außerhalb des Blicks.
- **Im Moment des Tippens:** Jeder Knopf, jeder Chip und jeder Schalter reagiert sofort sichtbar (gemeinsamer `:active`-Stil in `src/app.css`, z. B. dunklere Fläche oder leicht eingedrückt). Gilt für alle Knöpfe, nicht nur einzelne.
- **Danach bleibt die Wahl sichtbar:** Wer etwas auswählt, sieht die Auswahl dauerhaft hervorgehoben (Akzentrahmen und Fläche, gleiches Aussehen in der ganzen App). Das gilt auch für Knöpfe, die ein Ergebnis eingeben, etwa Krit · gelungen · misslungen im Würfel oder ein von Hand eingegebener Wurf: Der getippte Knopf bleibt markiert, bis der Spieler etwas anderes wählt.
- **Gewürfelt:** Nach dem Würfeln zeigt der Würfelbereich selbst das Ergebnis groß an (Zahl und Stufe), und der Würfelknopf ändert sich erkennbar (z. B. „Neu würfeln“).
- **Schalter** (Häkchen, An/Aus) zeigen ihren Zustand mit mehr als nur dem Häkchen, z. B. hervorgehobene Zeile, wenn an.
- **Zustand für Vorleseprogramme:** Auswahlen tragen `aria-pressed` bzw. `aria-checked`; der hervorgehobene Stil hängt an diesem Zustand, damit Aussehen und Zustand nie auseinanderlaufen.
- **Gesperrte Knöpfe** sehen gesperrt aus, und daneben steht kurz, warum.
- **Änderungen an Werten** (Zähler, Kontostand, Munition) sind sichtbar, z. B. kurz hervorgehoben, wenn sich die Zahl ändert.
- Hervorhebungen funktionieren in hell und dunkel und nicht nur über Farbe (zusätzlich Rahmen, Fettschrift oder Zeichen), damit sie auch bei schlechtem Licht erkennbar sind.

### 6. Lesbarkeit
- Höchstens drei Schriftgrößen pro Bildschirm. Graue Kleinschrift (`.hinweis`) nur für Nebensachen.
- Der wichtigste Wert eines Bildschirms (Zielwert, Ergebnis, Kontostand) ist am größten und auf Anhieb zu finden.
- Lange Knopfbeschriftungen kürzen; Erklärungen gehören in den Hinweis darunter, nicht in den Knopf.

## Ablauf bei jeder Arbeit an der Oberfläche

1. **Lesen:** die betroffene Komponente, `src/app.css` und die Abschnitte im Konzept, die den Bildschirm beschreiben.
2. **Gliedern:** Bevor du Code schreibst, schreibe für dich die Abschnitte des Bildschirms auf (Überschrift und was hineingehört). Prüfe die Reihenfolge: zuerst, was der Spieler wählt, dann Würfeln, dann Handlung.
3. **Bauen:** mit gemeinsamen Bausteinen und dem Abstandsraster.
4. **Checkliste** (unten) Punkt für Punkt durchgehen.
5. **Prüfen:** `npm run check`, `npm test`, `npm run build` (Node liegt in `~/.local/node/bin`). Einen Browser gibt es nicht; die Ansicht testet der Nutzer am Handy.
6. **Bericht an den Nutzer:** in einfachem Deutsch, was sich am Bildschirm ändert, und eine **Testanleitung fürs Handy**: was antippen, was er sehen müsste (z. B. „Tippe unten auf Main, dann Schießen. Der Würfelteil steht jetzt in einem eigenen grauen Kasten ganz unten.“).

## Checkliste

- [ ] Bildschirm in Abschnitte mit Überschrift gegliedert; Grenzen klar sichtbar (Abstand + Linie oder Fläche)
- [ ] Nur Abstände aus dem Raster; innerhalb einer Gruppe enger als zwischen Gruppen
- [ ] Auswahl, Würfeln und Handlung sehen verschieden aus; Würfelbereich abgesetzt und zuletzt
- [ ] Jedes Tippen sichtbar: Druck-Rückmeldung bei allen Knöpfen; gewählte Auswahl und eingegebenes Ergebnis bleiben hervorgehoben; Schalterzustand deutlich
- [ ] Hinweise und Fehler direkt beim betroffenen Element
- [ ] Vorhandene Bausteine genutzt; doppelte Stile nach `app.css` verschoben
- [ ] Tippflächen mindestens 44 × 44 Pixel, auch bei Chips
- [ ] Bei 360 Pixel Breite kein seitliches Scrollen, nichts abgeschnitten
- [ ] Hell und dunkel: nur Farbvariablen
- [ ] Haupthandlung unten im Daumenbereich
- [ ] Texte nach Konzept § 2: Begriffe aus dem Regelwerk, kein „Leiter“, keine Kürzel, Auswahl + Überschrift = Satz, Zeichen ■ ⬢ ◆ vor Stats, Skills, Perks
- [ ] Würfelergebnisse nur über die Würfelkomponente
- [ ] Sammeländerung → Bericht vorher

## Prüfmodus: `/oberflaeche <Bildschirm>`

Ruft der Nutzer den Skill mit einem Bildschirm auf (z. B. `/oberflaeche Schießen`), oder ohne Angabe (dann alle Bildschirme, beginnend mit denen aus „Was den Nutzer stört“):

1. Komponente(n) finden und lesen.
2. Jeden Punkt der Checkliste prüfen. Funde kurz für dich notieren.
3. **Fehler gleich beheben.** Dabei gilt:
   - Gestaltung (Abstände, Gliederung, Aussehen, gemeinsame Stile, Texte nach Konzept) behebst du ohne Rückfrage.
   - Änderst du die **Bedienung** (Reihenfolge der Schritte, Knöpfe entfernen oder hinzufügen, etwas in einen anderen Bildschirm verschieben, Verhalten), frag vorher, außer das Konzept legt es schon fest. Was du nicht klären kannst, kommt nach `docs/offen.md`.
4. Tests und Build grün, dann Commit nach den Regeln in `CLAUDE.md` (Nachricht sagt, was sich für den Spieler ändert).
5. Bericht: Was war, was ist jetzt anders, Testanleitung fürs Handy. Ohne Code-Begriffe.

## Diesen Skill pflegen

Sagt der Nutzer, dass ihn an der Oberfläche etwas stört, oder entscheidet er eine Gestaltungsfrage, trage es hier unter „Was den Nutzer stört“ bzw. in den Gestaltungsregeln ein (mit Datum). Gilt die Entscheidung für die Bedienung, gehört sie zusätzlich ins Konzept.
