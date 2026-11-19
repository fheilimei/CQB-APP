# CQB-App: Konzept

**Status:** Entwurf, Stand 16.11.2026, mit dem Regelwerk abgeglichen. Planungsgrundlage für die Entwicklung. Noch kein Code.

**Leser:** Eine Claude-Code-Instanz ohne Vorwissen. Dieses Dokument, [datenformat.md](datenformat.md) und das Regelwerk (Markdown-Dateien, im App-Repo unter `regelwerk/`) genügen, um mit der Entwicklung zu beginnen. [§ 4 Regelkern](#4-regelkern) fasst die Rechnungen zusammen, die die App ausführt. **Maßgeblich ist das Regelwerk:** Widerspricht ihm dieses Dokument, gilt das Regelwerk. Verweise der Form „(Kampfsystem, Lage)“ nennen Datei und Abschnitt im Regelwerk.

---

## 1. Ziel

CQB ist ein Tabletop-Rollenspiel mit Fokus auf Schusswaffengefechten in kleinen Scharmützeln. Die App ist ein **digitaler Charakterbogen** für den Spieltisch:

- Sie **zeigt** alle Werte eines Charakters.
- Sie **rechnet** Zielwerte, Krit-Schwellen und Haltezahlen aus, damit am Tisch niemand Tabellen wälzt.
- Sie **führt mit**, was sich im Spiel ändert: Leiter, HP, Wunden, Zustände, Munition, Heilung.

Die App ist nur für Spieler. Eine Ansicht für die SL (Gegner, mehrere Charaktere) ist nicht vorgesehen.

Gewürfelt wird mit echten Würfeln. Die App kennt weder Gegner noch Zugreihenfolge; diese führt die SL. Die App nimmt Ergebnisse entgegen, wo sie Folgen berechnet (z. B. Erholungsprobe). Ein eingebauter Würfler kommt eventuell später; die Umsetzung muss ihn vorbereiten ([§ 2, Leitlinie 6](#leitlinien-für-die-umsetzung)).

## 2. Plattform und Rahmen

| Punkt | Festlegung |
| --- | --- |
| Gerät | Handy, Hochformat, Bedienung mit einer Hand. Tablet und PC sollen funktionieren, sind aber nicht maßgeblich. |
| Form | **PWA**: installierbar auf dem Startbildschirm, **voll offline** nach der ersten Installation. |
| Technik | **Svelte 5 mit Vite**, TypeScript. Tests mit **Vitest**. PWA über `vite-plugin-pwa`. Speicher über IndexedDB (kleine Hilfsbibliothek wie `idb` erlaubt). Weitere Abhängigkeiten nur, wenn sie deutlich Code sparen. |
| Hosting | GitHub Pages aus dem App-Repo (HTTPS ist Voraussetzung für die Installation). Eine **GitHub Action** baut bei jedem Push auf `main` und veröffentlicht; Tests müssen vorher grün sein, sonst wird nicht veröffentlicht. |
| Pflege | Der Nutzer programmiert nicht. Alle Änderungen macht Claude Code. Deshalb: Code und Daten klar getrennt, jede Regelfunktion getestet, kurze Anleitung im Repo, wie Daten geändert werden. |
| Speicher | Charaktere lokal auf dem Gerät (IndexedDB). Kein Server, kein Konto. |
| Backup | **Export und Import** einzelner Charaktere als JSON-Datei. Pflichtfunktion von Anfang an, weil lokale Daten verloren gehen können (Browser-Speicher löschen; iOS räumt Daten selten genutzter Seiten). |
| Updates | Der Service Worker lädt neue Versionen beim nächsten Start mit Netz. Die App zeigt an, wenn ein Update bereitsteht, und lädt es auf Tipp. |
| Schriften | In der App mitgeliefert, damit sie auf jedem Gerät gleich aussehen und offline da sind (18.11.2026). **Text:** IBM Plex Mono. **Zahlen** (Statwerte, Steps, Zielwert, Würfelergebnis, HP, Munition, Rechenweg): Share Tech Mono mit gleich breiten Ziffern. **Überschriften, Name der Figur, Ansagen und Hauptknöpfe** (gefüllt oder mit Akzentrahmen): Saira Stencil One in Großbuchstaben. Alle anderen Knöpfe (Auswahl, Reiter, +/−) in der Textschrift, weil die Schablonenschrift klein schlecht lesbar ist. Zeichen ■ ⬢ ◆ ▲ ▼ kommen aus der Systemschrift. |
| Sprache | Deutsch. Begriffe exakt wie im Regelwerk (Malstep, Stepshield, Breakaction, Haltezahl …). Ausnahmen und Formulierung in der Oberfläche: [§ 2, Texte in der Oberfläche](#texte-in-der-oberfläche). |

### Texte in der Oberfläche

- **Kein Wort „Leiter“.** In diesen Dokumenten heißt die gemeinsame Skala von Ruhepuls und Adrenalin „Leiter“ (wie im Regelwerk). In der Oberfläche erscheint sie nie unter diesem Namen. Angezeigt wird immer der Stand selbst: **„Adrenalin 2“**, **„Ruhepuls 1“**, **„Over the Edge“** (Adrenalin 4). Bei 0 zeigt die App keinen Text und keine Zusammenfassung; nur das markierte Feld 0 in der Leiste. Als Quelle eines Steps steht derselbe Name, z. B. „Adrenalin 2 · Control ▼1“. Der Bereich am unteren Rand heißt „Adrenalin“.
- **Keine Kürzel** wie A1, A2, R1, R2 in der Oberfläche; Symptome erscheinen mit Namen („Sprint“, „Tunnelblick“).
- **Begriffsart erkennbar:** Vor jedem Namen eines **Stats**, **Skills** oder **Perks** stehen überall dasselbe Zeichen und dieselbe Farbe: ■ Stat (grün), ⬢ Skill (lila), ◆ Perk (rosa; Blau gehört zu Ruhepuls). Wo immer eines dieser Zeichen erscheint, auch mitten in Text, hat es seine Farbe (außer in Auswahlmenüs des Systems, die keine Farben kennen). Das gilt in Listen, Rechnern, Berichten und Hinweisen („◆ Triple Tap“, „⬢ Reflexe“, „■ Twitch“). Zeichen und Farbe zusammen, damit es auch ohne Farbsehen lesbar ist; festgelegt in `darstellung.json` (`typen`). **Ausnahme Reiter Werte** (18.11.2026): In den Abschnitten Stats, Skills und Perks steht das Zeichen nur in der Überschrift („■ Stats“), nicht vor jedem Eintrag; der Rahmen des Abschnitts hat die Farbe des Zeichens.
- **Adrenalin und Ruhepuls farbig:** Kommen Stepshields oder Malsteps aus Adrenalin, ist der Pfeil ▲/▼ rot, aus Ruhepuls blau (`darstellung.json` `leiter_pfeile`). Das gilt überall: Überschriften der Statgruppen, Markierung am Stat, Probenrechner, Haltezahl, Adrenalin-Fenster.
- **▲ und ▼** bedeuten immer Stepshields bzw. Malsteps und werden für nichts anderes verwendet.
- **Auf- und Zuklappen** zeigt überall derselbe Klapp-Pfeil wie bei einem Ordner: › zu, nach unten gedreht und in Akzentfarbe offen, ganz rechts in der Zeile (18.11.2026). Gilt für alles, was aufklappt: Reiterleiste, Menü, Deckung auswählen, Stats, Skills, Perks, Grundwerte, Stammdaten, Waffen, Haltezahl, Rechenweg der Probe.
- **Auswahlknöpfe** sind so beschriftet, dass sie mit der Überschrift einen Satz bilden: Überschrift als Substantiv, Knopf als Adjektiv oder Partizip. Beispiel: „Stand des Ziels: stehend · hockend · liegend“. Die Texte stehen in den Daten (`name`) und folgen dieser Regel.

### Leitlinien für die Umsetzung

1. **Regeln ändern sich noch.** Viele Werte sind vorläufig. Alle Zahlen, die eine Regel festlegt (Step-Faktoren, Leiter, Malsteps der Zustände, Heilwerte …), stehen in `public/data/regeln.json`, nicht im Code ([datenformat.md § regeln.json](datenformat.md#regelnjson)).
2. **Spieldaten getrennt vom Code.** Waffen, Munition, Skills, Perks, Körperzonen, Schutz und Klassen liegen als JSON unter `public/data/`. Neue Waffe = neuer JSON-Eintrag, keine Codeänderung.
3. **Rechenlogik testbar halten.** Die Regelfunktionen (Zielwert, Krit-Schwelle, Haltezahl, Schaden …) sind reine Funktionen ohne UI und bekommen Unit-Tests mit den Werten aus [§ 4](#4-regelkern).
4. **Speicherformat versionieren.** Jeder gespeicherte Charakter trägt eine Schemaversion; beim Laden älterer Versionen wird migriert.
5. **Klein starten.** Reihenfolge der Umsetzung: [§ 5](#5-umsetzungsreihenfolge).
8. **Drei Schichten.** (a) **Daten:** JSON unter `public/data/`, zur Laufzeit geladen und vom Service Worker offline gehalten; eine geänderte Zahl braucht keinen Codeumbau. (b) **Regelkern:** reine TypeScript-Funktionen unter `src/lib/regeln/`, ohne Svelte, ohne Zugriff auf UI oder Speicher; sie bekommen Charakter und Daten als Eingabe und liefern Ergebnisse. (c) **Oberfläche:** Svelte-Komponenten, die nur den Regelkern aufrufen und anzeigen. Abgeleitete Werte (Statwert, Zielwert, Zugang, Kampfunfähigkeit …) entstehen als berechnete Werte aus Charakter und Daten, nie als gespeicherte Kopie.
9. **Daten prüfen.** Für jede JSON-Datei gibt es einen Typ und einen Test, der die Datei dagegen prüft (Pflichtfelder, gültige IDs, Verweise zwischen Dateien, Rank-Vorschlag passt zum Rank-Set). Ein Fehler in den Daten fällt so vor der Veröffentlichung auf.
6. **Würfler vorbereiten.** Jede Stelle, an der ein Würfelergebnis entsteht, läuft über eine gemeinsame Würfelkomponente (Würfelart: W100, W10, W8, 2W10; Rückgabe: Ergebnis und Quelle `app` oder `hand`). Sie kann beides: selbst würfeln oder eine Eingabe von Hand annehmen. Je Stelle ist festgelegt, was Standard ist. Heute würfelt die App nur die **Abweichung** selbst ([§ 3.0](#30-charaktererstellung-m-r)); überall sonst ist die Eingabe von Hand Standard. Später lässt sich das Würfeln für weitere Stellen einschalten, ohne dass sich diese Stellen ändern. Wo nur der Ausgang zählt (Krit / gelungen / misslungen), bietet die Komponente zusätzlich drei Schaltflächen an; die App kann den Ausgang aber auch aus Ergebnis, Zielwert und Krit-Schwelle selbst bestimmen. Braucht ein Ablauf mehrere Würfe (z. B. Schießen), stehen sie in einem gemeinsamen Würfelkasten mit einem Umschalter für alle; der Spieler wählt nicht je Wurf.
7. **Bericht vor jeder Sammeländerung.** Ändert die App auf einmal mehr als einen Wert, zeigt sie vorher einen Bericht ([§ 3.0c](#30c-bericht-was-ist-passiert-a)). Nichts ändert sich ohne diesen Schritt.

## 3. Inhalt des Bogens

Jeder Bereich ist als **Anzeige** (A), **Rechnung** (R) oder **Mitführen** (M) gekennzeichnet.

### 3.0 Charaktererstellung (M, R)
Ein geführter Ablauf in Schritten. Er folgt der Reihenfolge des Regelwerks ([§ 4.11](#411-charaktererstellung-und-aufstieg)).

**Bedienung.** Ein Bildschirm pro Schritt. Oben eine Fortschrittsleiste mit den sieben Schritten; erledigte Schritte sind abgehakt, und jeder lässt sich antippen, um zurückzuspringen. Unten **Zurück** und **Weiter**; „Weiter“ nennt, was im Schritt noch fehlt, statt grau zu sein. Name und Aussehen stehen im ersten Schritt, damit der Charakter von Anfang an einen Namen hat.

0. **Name und Aussehen** (Teil von Schritt 1): Name (Pflicht) und **Aussehen** als kurzer Freitext (optional, z. B. Größe, Statur, Gesicht, Kleidung, Merkmale).
1. **Klasse wählen** → Rank-Set, Vorratslevel, freie Punkte. Liegt die Klasse über Stufe 2, wählt der Spieler den Weg dorthin (Spezialisierung; bei Meistern auch die Stufe-4-Klasse). Die App legt ihn als Klassenweg an ([datenformat.md § Charakter](datenformat.md#klassenweg)). Alternativ **ohne Klasse** (freie Erstellung, z. B. für Tests): Ränge und Vorratslevel werden von Hand gesetzt, ohne Prüfung gegen ein Rank-Set.
2. **Ränge eintragen:**
	- **Mit Klasse** zeigt die App die Ränge des Rank-Sets der Stufe. Der Spieler ordnet jeden Rang einem Stat zu; jeder Rang des Sets wird genau einmal vergeben. Zugeordnete Ränge lassen sich zwischen zwei Stats tauschen. „Weiter“ nennt, welche Ränge noch nicht vergeben sind. Einen Verteilungsvorschlag der Klasse gibt es nicht (entschieden 16.11.2026).
	- **Ohne Klasse** trägt der Spieler jeden Rang von Hand ein.
3. **Abweichung:** Sobald ein Stat einen Rang hat, würfelt die App seine Abweichung automatisch (Positiv- und Negativwürfel, je W10). Statt dessen kann der Spieler die beiden Würfel von Hand eingeben ([§ 2, Leitlinie 6](#leitlinien-für-die-umsetzung)). Die Abweichung gehört zum Stat, nicht zum Rang: Tauscht der Spieler Ränge, behält jeder Stat seine Abweichung. Sie wird nicht neu gewürfelt.
4. **Mindestskills und vorgegebene Perks** der Klasse eintragen. Bei Meistern wählt der Spieler die zwei Skills auf 5 (einer exklusiv).
5. **Freie Punkte ausgeben:** Skill-Level, Statrank-Up, Perks, wie im Aufstiegsmodus ([§ 3.0a](#30a-modi-lesen-aufstieg-schreiben-m)).
6. **Hintergrund** (ein Bildschirm; Regelwerk: Schulden, Coups und Verträge):
	- Drei Karten **Schulden**, **Coup**, **Vertrag**, je an/aus. Schulden und Coup mit den Größen klein · mittel · groß. Diese Optionen gibt es **nur bei der Erstellung**.
	- Eine aktive Karte klappt ihre Felder auf: Schulden – Gläubiger, Frist (in Aufträgen), Sicherheit; Coup – Beute, Feind; Vertrag – Auftraggeber, Verpflichtung. Der Haken steht als Satz dabei („Rückzahlung 1500 $ bis zur Frist“; „Feind: eine Bande oder Firma“).
	- Oben läuft das **Startgeld** live mit: Ersparnisse + gewählte Optionen + Einstiegsgehalt (Klasse ab Stufe 2 und Vertrag). Beträge aus `regeln.json` (`geld`).
	- Darunter Freitext: Geburtsort, wichtige Personen, Lebensmittelpunkt.
	- Mit Abschluss der Erstellung bucht die App das Startgeld ins Kassenbuch und legt die Schulden an ([§ 3.13](#313-geld-und-aufträge-m-r)).
7. **Ausrüstung:** Einkauf im **Laden** ([§ 3.14](#314-laden-kaufen-und-verkaufen-m-r)) mit dem Startgeld (umgesetzt 19.11.2026): derselbe Inhalt wie der Reiter Laden, nur Kaufen; oben steht das Startgeld statt des Kontostands. Der Korb liegt als Leiste über Zurück und Abschließen, wird mit dem Entwurf gespeichert (bleibt also auch über „Später“ erhalten) und bleibt bis „Abschließen“ änderbar; das Fenster Korb hat statt „Kaufen“ nur „Fertig“. Reicht das Startgeld nicht, nennt der Knopf Abschließen den Fehlbetrag. Der Abschluss-Bericht nennt den Einkauf und was vom Startgeld bleibt; gebucht werden erst das Startgeld, dann eine Buchung „Kauf“. Trageorte weist der Spieler danach im Reiter Ausrüstung zu ([§ 3.0f](#30f-körperbild-silhouette-a-r)).

**Stat-Voraussetzung bei der Erstellung:** Spezialisierung und erweiterte Form verlangen ihren Stat auf Rang A, die erweiterte Form auch den Stat ihrer Spezialisierung (Regelwerk: Klassen). „Weiter“ in Schritt 2 nennt den fehlenden Rang. Der Meister hat keine Stat-Voraussetzung.

**Zurücknehmen:** Skill- und Perk-Käufe aus Schritt 5 lassen sich bis zum Abschluss zurückgeben. Ein Statrank-Up nicht, weil sein Wurf fest ist. Wechselt der Spieler danach die Klasse, gelten Käufe ohne Zugang oder Voraussetzung nicht mehr; Schritt 5 markiert sie, „Weiter“ nennt sie. Wechselt die Klasse auf eine Stufe mit anderem Rank-Set, werden die Ränge (nach Rückfrage) geleert; die Würfe bleiben beim Stat. **Erstellung unterbrechen:** „Später“ in Schritt 1; der Entwurf bleibt gespeichert und lässt sich über Menü oder Startbildschirm fortsetzen.

Bis zum Abschluss lässt sich jeder Schritt zurücknehmen, außer den Würfen der Abweichung. Der Abschluss zeigt einen Bericht (Klasse, Stats, Skills, Perks, freie Punkte, Startgeld, Schulden). Danach ist der Charakter **fertig**.

**Klassen** kommen aus `klassen.json`. Eine neue Klasse ist ein neuer Eintrag dort, ohne Codeänderung ([datenformat.md § klassen.json](datenformat.md#klassenjson)). Alle Klassen der Stufen 1–5 stehen im Regelwerk.

### 3.0a Modi: Lesen, Aufstieg, Schreiben (M)
Ein fertiger Charakter hat drei Modi. Umgeschaltet wird über das **Menü** ([§ 3.0g](#30g-start-charaktere-und-menü-m)). Das **Statusfeld** im Kopf zeigt immer den Modus (im Lesemodus nichts); während der Erstellung zeigt es „Erstellung“.

**Lesemodus** (Standard): Ein Charakter öffnet immer im Lesemodus, auch nach Neustart oder Import. Die Werte des Charakters sind gesperrt. Der Spielstand bleibt bedienbar: Leiter, HP, Wunden, Munition, Zustände, Heilung, Proben- und Schussrechner, Notizen.

**Aufstiegsmodus:** Steigern nach den Regeln, gegen freie Charakterpunkte ([§ 4.11](#411-charaktererstellung-und-aufstieg)).
- **Leiste und „Jetzt möglich“:** Im Aufstiegsmodus steht oben im Reiter Werte fest eine Leiste mit den freien Punkten („5 Punkte frei“). Darunter zeigt der Abschnitt **Jetzt möglich** alles, was bezahlbar ist und dessen Voraussetzungen erfüllt sind: nächstes Level jedes steigerbaren ⬢ Skills, ■ Statrank-Ups, kaufbare ◆ Perks, jeweils mit Kosten. Ein Tipp kauft (mit Bestätigung). Ein Schalter blendet auch aus, was nur an Punkten scheitert („in Reichweite“).
- **Session abschließen:** +5 freie Punkte.
- **Statrank-Up:** Schaltfläche an jedem Stat; nur sichtbar, wenn genug Punkte da sind und der Rang unter S liegt. Nach Bestätigung zieht die App den Punkt ab, hebt den Rang um 1 und würfelt die Abweichung **automatisch neu** (oder der Spieler gibt die Würfel von Hand ein). Danach zeigt sie alten und neuen Statwert, auch wenn der Wert gesunken ist.
- **Skill-Level und Perks:** kaufen mit Anzeige der Kosten und Prüfung der Voraussetzungen (Höchststufe der Skills, Stat-Mindestwerte, vorausgesetzte Perks, Zugang über die Klasse).
- **Klassenwechsel** (Beförderung, Laufbahnwechsel, zweite Spezialisierung): eigener Dialog ([§ 3.0d](#30d-klassenwechsel-m)).
- Ein Aufstiegsschritt lässt sich nicht zurücknehmen; Fehler korrigiert man im Schreibmodus. So kann niemand eine Abweichung durch Zurücknehmen neu würfeln.
- Jeder Schritt wird protokolliert (Datum, was, Kosten, Würfe).

**Schreibmodus:** Für Sonderregeln, Boni und Mali, die die SL beschließt, und für Korrekturen.
- Alle Werte sind direkt änderbar, ohne Punktkosten und ohne Prüfung der Voraussetzungen: Ränge, Abweichungen, Skills, Perks, Grundwerte, Ausrüstung, Klasse, Geld, freie Punkte.
- **Dauerhafte Anpassungen:** Abschnitt „Anpassungen der SL“ im Reiter Werte (in den anderen Modi nur sichtbar, wenn es Anpassungen gibt). Neu anlegen mit Grund, Ziel (Grundwert, Proben auf einen Stat, Proben mit einem Skill, alle Proben), Art (erhöhend/senkend bzw. erleichternd ▲/erschwerend ▼) und Betrag. Neben dem direkten Überschreiben kann der Schreibmodus **Anpassungen** anlegen: Modifikatoren ([§ 3.0b](#30b-herkunft-von-werten-a-r)) mit einem Grund (Freitext, z. B. „Bonus der SL: Ortskenntnis“). Anpassungen fließen automatisch in alle Rechnungen ein und lassen sich einzeln abschalten oder löschen.
- **Kennzeichnung:** Überschriebene und angepasste Werte tragen die Herkunftsmarkierung ([§ 3.0b](#30b-herkunft-von-werten-a-r)).
- Jede Änderung wird mit `art: korrektur` bzw. `anpassung` protokolliert (vorher, nachher).

### 3.1 Stammdaten (A, M)
Name, Aussehen (Freitext), Klasse (aktuelle; antippen zeigt den Klassenweg), Laufbahn, Stufe, Vorratslevel und Gehalt (aus der Klasse), Hintergrund (Optionen und Freitext), freie Charakterpunkte (Zähler). Die Notizen stehen im Reiter Verlauf (19.11.2026).

### 3.0b Herkunft von Werten (A, R)
Perks, Anpassungen der SL und Zustände verändern Werte automatisch. Damit das nachvollziehbar bleibt, zeigt die App bei jedem veränderten Wert, woher die Änderung kommt.

**Modifikator.** Alle automatischen Änderungen laufen über ein gemeinsames Format: Ziel (Grundwert, Stat, Skill, Probenart oder alle Proben), Wirkung (fester Wert ± oder Stepshields/Malsteps) und Quelle. Perks und Anpassungen der SL sind Modifikatoren ([datenformat.md § Modifikator](datenformat.md#modifikator)). Leiter, Zustände und Lage liefern ihre Steps zur Laufzeit im selben Format. Es gibt nur einen Rechenweg; die Aufschlüsselung ergibt sich daraus.

**Markierung am Wert.** Ein veränderter Wert trägt oben rechts ein Zeichen je Quelle. Mehrere Quellen → mehrere Zeichen. Standard:

| Quelle | Zeichen | Farbe |
| --- | --- | --- |
| Perk | ◆ | blau |
| Anpassung der SL | ★ | orange |
| von Hand überschrieben | ✎ | gestrichelter Rahmen um den Wert |

Formen und Farben unterscheiden sich, damit die Markierung auch ohne Farbsehen lesbar ist. Zeichen und Farben stehen in `public/data/darstellung.json` und lassen sich dort ändern, ohne den Code anzufassen ([datenformat.md § darstellung.json](datenformat.md#darstellungjson)).

**Aufschlüsselung.** Antippen (Handy) oder Hovern (PC) eines markierten Werts öffnet eine kleine Rechnung: Grundwert, je Quelle eine Zeile mit Zeichen, Name und Wirkung, Ergebnis. Jede Zeile ist antippbar und springt zum Perk bzw. zur Anpassung.

**Rückverweis.** Ein ausgeklappter Perk und eine Anpassung zeigen „Wirkt auf: …“ mit Sprung zu den betroffenen Werten.

**Hinweise für Sonderregeln.** Perks, die die App nicht rechnen kann (z. B. Triple Tap, Starrsinn), nennen, wo sie greifen (`hinweis_bei`). Dort erscheint ein Hinweis mit Zeichen und Kurzbeschreibung, z. B. im Schussrechner „◆ Triple Tap: bei Ansage Bauch Folgetreffer Brust, dann Kopf“. Gerechnet wird nichts.

**Probenrechner.** Er zeigt jeden Step mit seiner Quelle: Lage, Leiter, Zustand, Perk, Anpassung der SL, Steps der SL (⚑) ([§ 3.6](#36-probenrechner-r)).

### 3.0c Bericht „Was ist passiert“ (A)
Immer wenn die App mehr als einen Wert auf einmal ändert, zeigt sie zuerst einen **Bericht**. Das gilt u. a. für: Treffer erhalten, Schießen, Rundenende, Gefecht starten und beenden, Ruhetag, Aufstiegsschritte.

- **Ablauf:** Eingabe → Bericht → **Weiter**. Erst „Weiter“ übernimmt die Änderungen. **Zurück** führt zur Eingabe, ohne dass etwas geändert wurde.
- **Inhalt:** in ganzen Sätzen, aus Sicht des Charakters („Du …“). Zuerst das Ereignis, dann die Rechnung in einem Satz mit den Zahlen in Klammern, dann jede Änderung mit altem und neuem Wert. Wichtiges (Stagger, kampfunfähig, Tod, Over the Edge) fett.
- **Beispiel** (Treffer):
  > **Du wirst in die Brust getroffen.**
  > Die Kugel durchschlägt deine Weste (DK 2 gegen Schutz 1).
  > Du erleidest 6 Schaden (MW 3 × 2). Deine HP sinken von 8 auf 2.
  > Du erleidest einen **Stagger**: Deine Breakaction in dieser Runde verfällt.
  > Eine neue Wunde wird notiert: Brust, 6 Schaden, blutet.
  > Für das Rundenende sind angehakt: getroffen, verletzt, Stagger.
- **Danach** leuchten die geänderten Werte im Bogen kurz auf.
- Die Sätze entstehen aus Textbausteinen; die Bausteine liegen gesammelt an einer Stelle im Code, damit sie sich leicht anpassen lassen.

### 3.0d Klassenwechsel (M)
Im Aufstiegsmodus öffnet die Schaltfläche **Klasse wechseln** einen Dialog. Er listet die Klassen, in die der Charakter wechseln kann, und prüft jede gegen die Regeln ([§ 4.11](#411-charaktererstellung-und-aufstieg)).

**Auswahl.** Angeboten werden:
- **Beförderung:** die Klassen der nächsten Stufe in der eigenen Laufbahn (Stufe 2 → Spezialisierungen; Spezialisierung → ihre erweiterte Form oder eine zweite Spezialisierung; Stufe 4 → Meister).
- **Laufbahnwechsel:** Klassen anderer Laufbahnen, höchstens auf der eigenen Stufe.

**Prüfung.** Je Bedingung ein Häkchen oder der Hinweis, was fehlt:
1. Rank-Set der Zielstufe (Ränge absteigend verglichen).
2. Mindestskills; bei Meistern zusätzlich die Wahl der zwei Skills auf 5.
3. Stat auf Rang A (Spezialisierung, erweiterte Form, zweite Spezialisierung).
4. Weg: Die erweiterte Form verlangt ihre Spezialisierung im Klassenweg, der Meister eine Stufe-4-Klasse seiner Laufbahn.
5. **Freigabe der SL:** ein Häkchen, das der Spieler setzt (Bedingungen der Laufbahn, Anlass eines Laufbahnwechsels). Die App prüft es nicht.

Fehlende Ränge oder Skills lassen sich nicht im Dialog kaufen; der Spieler kauft sie vorher im Aufstiegsmodus. Der Dialog nennt die Kosten in freien Punkten.

**Vorschau vor dem Bestätigen:**
- Skills, die **eingefroren** werden (im Charakter, aber nicht im neuen Zugang).
- Skills, die **wieder steigerbar** werden.
- Neue Perks und exklusive Skills im Zugang.
- Neues Vorratslevel und Gehalt.

Stats, Skills und Perks des Charakters ändert der Wechsel nicht. Bestätigt der Spieler, hängt die App einen Eintrag an den Klassenweg und protokolliert den Wechsel. Wie jeder Aufstiegsschritt ist er nicht rücknehmbar; Korrekturen im Schreibmodus.

Umsetzung (18.11.2026): Knopf **Klasse wechseln** in der Leiste mit den freien Punkten (Reiter Werte, Aufstiegsmodus). Das Fenster listet unter **Wohin?** die Klassen nach Beförderung, Zweite Spezialisierung und Laufbahnwechsel, je mit Stufe und „✓ alles erfüllt“ bzw. „fehlt: mindestens n Punkte“. Nach der Wahl: **Prüfung** (✓/✗ je Bedingung mit dem, was fehlt; Schalter „Die SL gibt den Wechsel frei“), **Was sich ändert** (Vorratslevel und Gehalt vorher → nachher, eingefrorene, wieder steigerbare und neue Skills, neue Perks). „Weiter“ geht erst, wenn alles erfüllt und die Freigabe gesetzt ist; dann Bericht. Eine zweite Spezialisierung zeigt im Reiter Werte Stufe 4 und das Gehalt der erweiterten Formen.

### 3.0e Gefecht und Ruhe (M)
Unabhängig von den Modi Lesen, Aufstieg und Schreiben ([§ 3.0a](#30a-modi-lesen-aufstieg-schreiben-m)) ist ein Charakter entweder **in Ruhe** oder **im Gefecht**.

**In Ruhe** (Standard):
- Keine Aktionsleiste, keine Zähler, keine Initiative. Der Bereich „Adrenalin“ ist eingeklappt.
- Verfügbar: Bogen, Probenrechner, Waffen (Nachladen, Wechsel, Aufsätze frei, ohne Aktion), **Getroffen** ([§ 3.7c](#37c-treffer-ausgehend-und-eingehend-m-r)), Wunden, Versorgen, Heilung, Ausrüstung.
- Im Reiter Figur steht unter der Figur **▶ Gefecht starten** (an der Stelle, an der im Gefecht „Nächste Runde“ und „Gefecht beenden“ stehen; Akzentrahmen, nicht gefüllt; 18.11.2026, vorher in der Kopfzeile).

**Im Gefecht** (nach „Gefecht starten“, [§ 3.7](#37-leiter-m-r)):
- Im Reiter Figur (nur dort, 18.11.2026) erscheinen am unteren Rand die Aktionsleiste und darüber das Wählrad „Adrenalin“ ([§ 3.7](#37-leiter-m-r)); die Aktionsleiste hat **Main · Bewegung · Stand | Break** (Deckung, Ereignis und Getroffen stehen neben der Figur) ([§ 3.7a](#37a-aktionsleiste-m-r)).
- Kopfzeile und untere Leisten (Aktionsleiste, Adrenalin) tragen einen Rand in der Akzentfarbe; auf der oberen Linie steht links auf Höhe der Figur klein in der Zahlenschrift „IM GEFECHT“, die Linie läuft links und rechts daran vorbei (19.11.2026). Oben rechts in der Kopfzeile, auf Höhe des Namens, steht klein „Runde n · Initiative“ mit dem Ergebnis der Initiative dieser Runde darunter. Die Knöpfe **Nächste Runde** (Weiter-Zeichen) und **Gefecht beenden** (Stopp-Zeichen) stehen nebeneinander unter dem Kasten der Figur im Reiter Figur, außerhalb des Kastens (18.11.2026).
- Der **Aufstiegsmodus** ist gesperrt (Steigern gehört nicht in die Runde). Der **Schreibmodus** bleibt erreichbar für Korrekturen.

**Kampfunfähig.** Die App sperrt nichts; die Entscheidung der SL geht vor. Sie **markiert** aber deutlich, dass der Charakter nach den Regeln keine Aktionen hat ([§ 4.5](#45-zustände)):
- **Gefecht starten** trägt eine Warnmarkierung (Warnfarbe und Zeichen ⚠ statt ▶); der Grund steht über der Figur, z. B. „kampfunfähig: 0 HP – im Gefecht keine Aktionen“.
- **Im Gefecht** tragen die vier Aktionsknöpfe dieselbe Markierung, und über der Aktionsleiste steht ein Banner „kampfunfähig: keine Aktionen“. Die Zähler zählen weiter wie sonst. Wer trotzdem eine Aktion wählt, sieht vorher einen Hinweis und bestätigt „Trotzdem ausführen“; der Bericht vermerkt es.
- Das Gefecht läuft weiter, auch wenn der Charakter darin kampfunfähig wird; weitere Treffer, Blutungsfristen und Adrenalinschock hängen am Gefechtsende.

### Aufbau der App
Die App hat fünf Reiter in einer senkrechten Leiste am rechten Bildschirmrand, unten im Daumenbereich direkt über allem, was unten fest steht (im Gefecht über dem Wählrad „Adrenalin“): **Figur · Werte · Ausrüstung · Laden · Verlauf**, als Bildzeichen ohne Text (Figur: Silhouette, Werte: Tabelle, Ausrüstung: Rucksack, Laden: Einkaufstasche, Verlauf: aufgeschlagenes Buch; Laden seit 19.11.2026, [§ 3.14](#314-laden-kaufen-und-verkaufen-m-r)). Der gewählte Reiter ist farbig hinterlegt mit einem Balken am linken Rand. Unter den Zeichen klappt der Klapp-Pfeil (nach unten gedreht, weil offen) die Leiste ein; dann bleibt eine Lasche mit dem Klapp-Pfeil › am rechten Rand (flach und etwas breiter, ragt in den Inhalt), die die Leiste wieder ausklappt. Leiste und Lasche lassen sich mit senkrechtem Wischen am Rand nach oben und unten schieben (zwischen Kopfzeile und unteren Leisten); die App merkt sich die Stelle. Beide teilen sich diese Stelle: Die Leiste geht dort auf, wo die Lasche hängt. Die App merkt sich die Wahl (Einstellungen). Die Leiste schwebt über dem Inhalt; wer etwas darunter lesen will, scrollt oder klappt sie ein. Oben links öffnet **☰** das Menü ([§ 3.0g](#30g-start-charaktere-und-menü-m)).

**Figur** (Startbildschirm). Die Silhouette ([§ 3.0f](#30f-körperbild-silhouette-a-r)) steht groß links, damit der Zustand des Charakters immer vor Augen ist; rechts daneben eine schmale Spalte mit Stand und Bewegung oben, darunter den aktiven Zuständen (19.11.2026) und den Knöpfen unten (18.11.2026).
- **Darüber:** Kopfzeile mit Name und Statusfeld ([§ 3.0a](#30a-modi-lesen-aufstieg-schreiben-m), [§ 3.0e](#30e-gefecht-und-ruhe-m)), HP als Balken mit Zahl (Adrenalin bzw. Ruhepuls nicht in der Kopfzeile; der Stand steht am Rad unten), aktive Zustände nicht in der Kopfzeile, sondern neben der Figur (19.11.2026, [§ 3.11](#311-zustände-a-m)).
- **Links:** die Silhouette mit Stand, Rüstung, Deckung, Wunden und Folgen; die aktive Waffe in der Hand mit Magazinstand.
- **Rechts neben der Figur, unten:** der Knopf **Getroffen**, darüber der gleich breite Knopf **Deckung**, beide mit kleinem Bildzeichen (Einschlag, Mauer) und ohne farbigen Rahmen, denn sie öffnen nur einen Dialog; ob man getroffen oder in Deckung ist, zeigt die Figur (18.11.2026); beide im Gefecht und in Ruhe an derselben Stelle, denn auch außerhalb eines Gefechts kann man in Deckung sein (Wunsch des Nutzers, 18.11.2026). In Ruhe zusätzlich **Heilung** (Proben starten über den Reiter Werte); im Gefecht Aktionsleiste und Bereich „Adrenalin“ am unteren Rand, nur in diesem Reiter ([§ 3.7](#37-leiter-m-r), [§ 3.7a](#37a-aktionsleiste-m-r)).
- **Oben rechts neben der Figur** (nur im Gefecht): eigener Stand und Bewegung dieser Runde als Bildzeichen, untereinander, jedes Feld mit kleiner Beschriftung links daneben („Stand“, „Bewegung“); darunter bei laufender Konzentration die Zeile „Konzentration“ mit halbem oder vollem Kreis (18.11.2026). Stand als kleines Strichmännchen mit Gewehr (stehend, hockend, liegend; jede Zeichnung mittig im Feld, auf Höhe der Beschriftung), Konzentration als halber (leicht) oder voller Kreis; alle Zeichen einfarbig und dünn wie die Zeichen auf Deckung und Getroffen (18.11.2026), Bewegung als Pfeile: › Gehen oder Kriechen (der Stand zeigt, welches), ›› Laufen, ››› Rennen, Bogenpfeil Hechten; ohne Bewegung keine Pfeile. Zeichen aus `darstellung.json`. Die Figur selbst bleibt vorerst die stehende Strichfigur.
- **Antippen einer Zone** öffnet unter der Figur die Übersicht der Zone: Rüstung, Deckung, Wunden mit Status und Folge; erneutes Antippen schließt sie. Eine eigene Wundliste auf dem Reiter Figur gibt es nicht (18.11.2026); Prellungen (ohne Zone) stehen als Zusatz unter dem HP-Balken. Bei jeder Wunde stehen dort **Versorgen** und nach dem Gefecht, solange sie blutet, **Frist abgelaufen** ([§ 3.10](#310-treffer-wunden-und-blutung-m-r)).

**Werte:** Stammdaten (eingeklappt) · **Stats** · **Skills** · **Perks** · Grundwerte. Stats, Skills und Perks stehen direkt untereinander, weil sie beim Spielen zusammen gebraucht werden ([§ 3.1](#31-stammdaten-a-m) bis [§ 3.5](#35-perks-a-m)). Auch Aufstieg und Klassenwechsel finden hier statt.

**Ausrüstung:** Silhouette mit Trageorten ([§ 3.0f](#30f-körperbild-silhouette-a-r), Schicht Ausrüstung), darunter die Listen: Waffen mit eingesetztem Magazin und Aufsätzen, lose Munition, Magazine (auch Schnelllader und Ladestreifen), lose Aufsätze, Nahkampfwaffen, Vorrat, Rüstung, Schild. Jedes dauerhafte Stück zeigt seinen Zustand (neu, gebraucht …; bei Nicht-Waffen nur für den Preis, R42). Kein Geld (19.11.2026: Kontostand und Schulden stehen im Reiter Laden).

**Laden:** Geld (Kontostand, Schulden; [§ 3.13](#313-geld-und-aufträge-m-r)), Kaufen und Verkaufen ([§ 3.14](#314-laden-kaufen-und-verkaufen-m-r)).

**Verlauf:** Gefechtsprotokoll, Aufstiegsprotokoll, **Kassenbuch**, Wundliste mit Heildauer, Notizen. Umsetzung (19.11.2026): Karten untereinander, neueste Einträge oben. **Gefecht** (nur im laufenden Gefecht, aufgeklappt; Einträge nach Runden, z. B. „Rundenende: Adrenalin 2 → Ruhepuls 1“, Schüsse, Aktionen, Treffer; das Protokoll wird beim Gefechtsende gelöscht). **Aufstieg** (zugeklappt; Sessions, Käufe mit freien Punkten, Statrank-Ups, Klassenwechsel, Änderungen im Schreibmodus, je mit Datum). **Geld** (zugeklappt, Kontostand in der Kopfzeile; Schulden mit Frist, Kassenbuch mit Betrag ±). **Wunden** (zugeklappt; Zone, Schaden, Blutung bzw. Versorgung und restliche Ruhetage; Versorgen und Nachsorge bleiben auf der Figur). **Notizen** (Textfeld, in jedem Modus änderbar).

Dialoge (Treffer, Proben, Klassenwechsel …) öffnen sich über dem jeweiligen Reiter. Wo ein Dialog die Silhouette braucht, zeigt er eine **eigene Instanz** davon mit den Schichten, die er braucht; die Figur auf dem Startbildschirm ändert sich erst mit „Weiter“ im Bericht.

### 3.0g Start, Charaktere und Menü (M)

**Erster Start** (kein Charakter auf dem Gerät): ein Bildschirm mit zwei großen Knöpfen **Charakter erstellen** ([§ 3.0](#30-charaktererstellung-m-r)) und **Charakter importieren** (JSON-Datei, [§ 2](#2-plattform-und-rahmen), Backup).

**Mehrere Charaktere.** Auf einem Gerät können beliebig viele Charaktere liegen. Die App öffnet den zuletzt benutzten. Gewechselt wird über das Menü; jeder Charakter behält seinen eigenen Spielstand (auch ein laufendes Gefecht).

**Menü ☰** (oben links; klappt von links als Seitenleiste auf, schließt mit Wischen nach links oder Tipp daneben):
- **Charaktere:** Liste mit Name, Klasse und HP; Antippen wechselt. In der Überschriftzeile kleine Knöpfe **+ Neu** (Charakter erstellen) und **Importieren**. Je Charakter klappt ein Pfeil › (wie bei einem Ordner; aufgeklappt zeigt er nach unten) die Aktionen darunter auf: **Exportieren** (öffnet das Teilen-Menü des Geräts mit der Datei `<name>.cqb.json`, z. B. zum Ablegen in Dateien oder Drive; wo das Gerät keine Dateien teilen kann, wird sie heruntergeladen), **Duplizieren**, **Löschen** (mit Bestätigung durch Eintippen des Namens).
- **Modus:** kleine Knöpfe in einer Reihe unter der Überschrift: **Aufstieg** und **Schreibmodus** ([§ 3.0a](#30a-modi-lesen-aufstieg-schreiben-m)), dazu **Session abschließen** (+5 freie Charakterpunkte) und später **Auftrag abschließen** ([§ 3.13](#313-geld-und-aufträge-m-r)), beide mit Bericht. Im Gefecht ist Aufstieg ausgegraut ([§ 3.0e](#30e-gefecht-und-ruhe-m)). Ein aktiver Modus wird oben im Statusfeld angezeigt und dort mit „Fertig“ beendet.
- **Einstellungen:** Darstellung (hell, dunkel, System; Zeichen der Herkunftsmarkierung), Würfeln (je Stelle: App würfelt oder Eingabe von Hand, [§ 2, Leitlinie 6](#leitlinien-für-die-umsetzung)).
- **Über die App:** Version der App und der Daten, Hinweis auf Updates, kurze Anleitung zum Export als Sicherung.

Selten gebrauchte Funktionen gehören ins Menü, nicht auf die Reiter; die Reiter bleiben für das Spiel frei.

### 3.0f Körperbild (Silhouette) (A, R)
Die Silhouette ist **ein Baustein**, der überall gleich aussieht. Jede Instanz blendet die **Schichten** ein, die ihr Ort braucht. Sie ist die Verbindung zwischen Regeln und Bild: Körperzonen (Regelwerk: Körperzonen), Deckung, Rüstung, Wunden und Stand werden am Körper gezeigt, nicht in Listen.

**Grundform.**
- Zehn antippbare Flächen nach `koerperzonen.json`: Kopf, Brust, Bauch, Unterleib, beide Arme, beide Beine; „Rumpf“ fasst Brust, Bauch und Unterleib zusammen, wo eine Regel das verlangt.
- Drei Haltungen nach dem Stand: **stehend**, **hockend**, **liegend**. Die Zonen bleiben in jeder Haltung antippbar.
- Gezeichnet als SVG; die Zonen tragen die IDs aus `koerperzonen.json`. Rechts und links aus Sicht des Charakters. Jede Zone zeigt statt ihres Namens nur ihre **W8-Zahl**, umrandet, damit sie nicht mit Rüstungs- und Deckungszahlen verwechselt wird (18.11.2026). Den Namen („Rechter Arm“) zeigt die Übersicht beim Antippen (Reiter Figur), zusammen mit der umrandeten Zahl; dort stehen Rüstung und Deckung mit denselben Zeichen wie an der Figur (⛨ bzw. Mauer).
- Groß genug für den Daumen: Jede Zone ist mindestens 44 × 44 Pixel, auch im Liegen (dort wird die Figur breiter dargestellt).

**Schichten**

| Schicht | Zeigt | Figur | Getroffen | Deckung setzen | Ausrüstung | Granate |
| --- | --- | --- | --- | --- | --- | --- |
| Stand | Haltung | ✔ | ✔ | ✔ | – | ✔ |
| Rüstung | Schutzwert je Zone als kleine Zahl, Rüstungsart als Kontur | ✔ | ✔ | ✔ | ✔ | ✔ |
| Deckung | verdeckte Zonen schraffiert, Deckungswert; Schild von vorn | ✔ | ✔ | ✔ (bearbeitbar) | – | ✔ (vom Explosionspunkt) |
| Wunden | Punkt je Wunde: rot gefüllt = blutet, grau = versorgt, rot umrandet = kritisch; Prellungen als Schatten | ✔ | ✔ | – | – | – |
| Folgen | andauernde Folgen als Zeichen (humpelt, Arm verletzt) | ✔ | – | – | – | – |
| Waffe | aktive Waffe in der Hand mit Magazinstand | ✔ | – | – | ✔ | – |
| Vorschau | Ausgang eines Treffers je Zone (unten) | – | ✔ | – | – | ✔ |
| Splitter | Zahl der Splitter je Zone | – | – | – | – | ✔ |
| Ausrüstung | Trageorte mit Gegenständen (unten) | – | – | – | ✔ | – |

**Vorschau beim eingehenden Treffer** (Getroffen, [§ 3.7c](#37c-treffer-ausgehend-und-eingehend-m-r)). Sobald feststeht, was trifft (DK/MW, stumpf, Kugeln), rechnet die App den Schadensablauf ([§ 4.7](#47-schadensablauf)) für **jede** Zone vor und färbt die Figur, bevor eine Zone gewählt ist:
- **grau:** gestoppt (Deckung hält), kein Schaden;
- **gelb:** Wuchttreffer, mit Schaden;
- **rot:** Durchschlag, mit Schaden (Multiplikator eingerechnet);
- zusätzlich je Zone ein Zeichen, wenn der Treffer dort einen **Stagger** auslöst, **kampfunfähig** macht oder **tödlich** wäre (HP ≤ −1 bzw. Krit-Folge „sofort Tod“, wenn Krit eingeschaltet ist).

Ändert der Spieler DK/MW, Kugeln, Krit oder die Deckung, färbt sich die Figur sofort neu. Das Antippen einer Zone wählt sie; der Bericht bestätigt nur noch, was die Figur schon gezeigt hat. Für den **ausgehenden** Treffer gibt es dieselbe Vorschau auf einer **Ziel-Figur**, wenn der Spieler Deckung und Rüstung des Ziels eingibt (optional, [§ 3.8](#38-waffen-und-schießen-a-m-r), Schritt 5).

**Ausrüstung an der Figur** (Reiter Ausrüstung). Um die Silhouette liegen die **Trageorte** als Felder an der passenden Stelle: Schlinge (Schulter), Weste/Rig (Brust), Holster und Gürtel (Hüfte), Rücken, Rucksack (neben der Figur). Jedes Feld zeigt seine Gegenstände als Symbol mit Anzahl bzw. Magazinstand.
- **Antippen** eines Felds öffnet seine Liste; ein Gegenstand lässt sich dort einem anderen Trageort zuweisen. Der Trageort bestimmt die Kosten des Waffenwechsels (Kampfsystem, Waffe wechseln); das Feld zeigt sie klein an („Main“, „ohne Aktion“).
- **Rüstung** liegt als Kontur auf den Zonen, die sie schützt; der Schutzwert steht in der Zone. Antippen der Zone zeigt, welche Rüstung dort wirkt (bei mehreren der höchste Wert).
- Die aktive Waffe liegt in der Hand. Antippen einer anderen Waffe macht sie zur aktiven (in Ruhe frei; im Gefecht über die Aktion „Waffe wechseln“ mit ihren Kosten).

**Splitter** (Granate eingehend, [§ 3.8a](#38a-werfen-a-m-r)). Nach dem W8 für den ersten Splitter zeigt die Figur je Zone die Zahl der Splitter; Zonen mit gleicher Zahl werden als ein Treffer abgewickelt. Die Vorschau färbt jede Zone wie oben.

### 3.2 Stats (A, R)
Neun Stats in drei Gruppen ([§ 4.1](#41-stats)). Gruppe A/B ist sichtbar, weil die Leiter danach wirkt.
- **Sichtbar** ist je Stat der **Statwert** und seine **Step-Reihe**: Zielwert bei 0 bis 5 Malsteps ([§ 4.2](#42-steps-und-zielwert)). Darstellung: Die Stats stehen nach Gruppen. Die Überschrift einer Gruppe sagt, wie Adrenalin und Ruhepuls wirken (Gruppe A „▲ Adrenalin · ▼ Ruhepuls“, Gruppe B umgekehrt, Nerve „Zum Ruhigbleiben“; Pfeile bei Adrenalin rot, bei Ruhepuls blau). Wirkt gerade Adrenalin oder Ruhepuls auf einen Stat, trägt sein Name den farbigen Pfeil, und der Zielwert, der jetzt gilt, ist in derselben Farbe umrandet. Jeder Stat ist **eine Zeile**: Name, direkt daneben groß der Statwert (Wert bei 0 Malsteps), dann von links nach rechts absteigend die Zielwerte bei ▼1 … ▼5. Der Rang steht erst im aufgeklappten Stat. Die Kopfreihe „Wert ▼1 … ▼5“ steht in derselben Zeile wie die Überschrift Stats, über denselben Spalten.
- **Markierung:** Zielt ein Perk oder eine Anpassung der SL auf Proben mit diesem Stat, trägt der Statwert ◆ bzw. ★ ([§ 3.0b](#30b-herkunft-von-werten-a-r)); das Detail listet sie auf. Die Step-Reihe bleibt die reine Reihe des Statwerts.
- **Detail** per Antippen (kein Hover, da Handy): Rang, Abweichung, die beiden Würfel (positiv, negativ) und ob die App oder der Spieler gewürfelt hat.
- **Vorkalkuliert:** Statwert und Step-Reihe ändern sich im Spiel nicht. Die App berechnet sie neu, sobald Rang oder Wurf sich ändern (Erstellung, Aufstieg, Schreibmodus), und hält sie sonst fest. Probenrechner und Schussrechner lesen daraus ab.

### 3.3 Grundwerte (A, R)
HP (Höchstwert), Schmerzresistenz, Nahkampfschaden, Wurfweite. Startwerte aus `regeln.json`, erhöht durch Perks ([§ 4.10](#410-grundwerte)).
- Unter den Perks. Jeder Grundwert trägt die Herkunftsmarkierung; Antippen zeigt die Aufschlüsselung: Start, je Perk und Anpassung eine Zeile (antippbar, springt zur Quelle), ggf. „von Hand gesetzt“ mit dem Wert, der berechnet wäre, und das Ergebnis.
- **Schreibmodus:** Wert von Hand setzen (Wurfweite als Band); „Wieder berechnen“ hebt den Wert von Hand und die Markierung ✎ auf.
- Die Anzeigenamen der Grundwerte stehen in `darstellung.json` (`grundwerte`).

### 3.4 Skills (A, M)
Direkt unter den Stats. Je Skill: Name, Stufe (0–5), zugehöriger Stat. Darstellung: die Stufe ganz links, dahinter der **Gürtelgrad** als kleiner Gürtel mit einem Streifen je Stufe (Stufe 0 ohne Streifen, höchste Stufe ganz gefüllt), nach einem Abstand der Name.
- **Standardansicht:** nur Skills mit Stufe ≥ 1.
- **Aufklappfeld „Alle Skills“:** alle Skills aus `skills.json`, auch mit Stufe 0.
- Antippen eines Skills öffnet im Lesemodus den Probenrechner mit Stat und Skill vorausgewählt ([§ 3.6](#36-probenrechner-r)). Im Aufstiegs- und Schreibmodus klappt es das Detail auf (Stat der Probe, Perks und Anpassungen darauf). Ein Stat öffnet per Antippen sein Detail; dort steht der Knopf „Probe auf ■ …“.
- **Aufstiegsmodus:** Neben jedem steigerbaren Skill stehen die Kosten der nächsten Stufe und eine Schaltfläche zum Steigern. Steigerbar ist nur, was die aktuelle Klasse anbietet ([§ 4.11](#411-charaktererstellung-und-aufstieg)).
- **Eingefrorene Skills:** Ein Skill mit Stufe ≥ 1, den die aktuelle Klasse nicht anbietet, bleibt in der Standardansicht und wirkt normal. Er trägt ein Schloss-Zeichen; im Aufstiegsmodus steht dort „eingefroren: nicht im Zugang von <Klasse>“ statt der Schaltfläche.

### 3.5 Perks (A, M)
Direkt unter den Skills.
- **Eingeklappt** (Standard): Name und **Kurzbeschreibung** (eine Zeile).
- **Ausgeklappt** per Antippen: vollständiger Wirkungstext, Rang (= Kosten) und Voraussetzungen.
- **Aufstiegsmodus:** Der Rang (= Kosten) ist immer sichtbar; dazu die Liste der Perks im Zugang der aktuellen Klasse mit Voraussetzungen und Kauf-Schaltfläche. Gekaufte Perks wirken immer, auch wenn die aktuelle Klasse sie nicht mehr anbietet. Perks, deren Voraussetzungen fehlen, sind ausgegraut und nennen, was fehlt (z. B. „braucht Zäh I“).
- Perks mit Modifikatoren wirken automatisch; betroffene Werte tragen die Markierung ◆ ([§ 3.0b](#30b-herkunft-von-werten-a-r)). Ausgeklappt zeigt der Perk „Wirkt auf: …“.

### 3.6 Probenrechner (R)
Das zentrale Werkzeug am Tisch. Eingabe:
- Stat (Pflicht), Skill (optional),
- Lage-Auswahl ([§ 3.8c](#38c-lage-auswahl-r)): automatische Steps, Sicht nach Bedarf, Malsteps und Stepshields der SL mit Grund.

Automatisch einbezogen: Steps aus der Leiter und aus Zuständen ([§ 4.5](#45-zustände)).

**Skill austauschen.** Wo immer ein Ablauf einen Skill vorwählt (Probenrechner, Schießen, Werfen, Nahkampf, Breakaction …), kann der Spieler ihn durch einen anderen Skill ersetzen. Die SL erlaubt das mit guten Argumenten (Regelwerk: Stats, Skills und Perks, Skills). Der Bericht nennt den verwendeten Skill.
Ausgabe: **Zielwert**, **Krit-Schwelle**, oder „keine Probe möglich“ ([§ 4.2](#42-steps-und-zielwert), [§ 4.3](#43-krit)). Die App zeigt die Herkunft jedes Steps mit Zeichen und Namen ([§ 3.0b](#30b-herkunft-von-werten-a-r)), außerdem die Hinweise passender Perks.

**Aufbau** (Dialog, erreichbar über einen Skill und über das Detail eines Stats):
- Oben neun Stat-Knöpfe mit Statwert (drei Spalten), darunter die Auswahl **Skill**: zuerst die eigenen Skills mit Stufe, dann die übrigen mit Stufe 0. Wird ein Skill gewählt, bevor ein Stat gewählt ist, übernimmt die App dessen Stat. Gehört der Skill zu einem anderen Stat, steht der Hinweis „Skill ausgetauscht … Das muss die SL erlauben.“
- Kopfzeile „▼ Malsteps · ▲ Stepshields · ⬢ Skillstufe · netto n“ mit **Zielwert** und **Krit ≤**; Antippen klappt die Rechnung auf (Stat, Skill, jede Quelle, Ergebnis). Die Kopfzeile steht in jedem Dialog mit Probe (auch Schießen) fest oben unter dem Titel und scrollt nicht mit.
- **Automatisch** (Lage-Block 1): Chips mit Herkunftszeichen, je mit × bzw. ↺; Steps der SL für das ganze Gefecht zusätzlich mit „löschen“.
- Schalter **braucht Sicht**, darunter die Sichtstufe als Satz („Sicht: klar · eingeschränkt …“); im Gefecht gilt und speichert die Sichtstufe des Gefechts.
- **SL** (Lage-Block 3): Zähler + Malstep, + Stepshield, Feld Grund, zuletzt verwendete Gründe; im Gefecht der Knopf **Für das ganze Gefecht merken**.
- Würfel (Würfelstelle „Proben“) und groß die **Ansage**: „Krit · 07“, „Erfolg · 54“, „Misserfolg“. Ändert der Spieler danach Steps, wertet die App den Wurf neu aus.
- Der Probenrechner ändert am Charakter nur die Steps der SL für das Gefecht, die Sichtstufe des Gefechts und die zuletzt verwendeten Gründe.

Dieselbe Probe (ohne Stat- und Skill-Auswahl, mit den drei Knöpfen Krit · gelungen · misslungen; die Knöpfe erscheinen nur bei Eingabe von Hand, nicht wenn die App würfelt) steckt in allen Abläufen mit Probe: Gefecht starten, Rundenende, Senken, Verbündete verschieben, Initiative.

### 3.7 Leiter (M, R)
Regeln: [§ 4.4](#44-die-leiter). Ziel: höchstens zwei Handgriffe pro Runde; alles Weitere rechnet die App.

**Wählrad** (in der Oberfläche: Bereich „Adrenalin“, [§ 2, Texte in der Oberfläche](#texte-in-der-oberfläche)).
- **Nur im Gefecht** ([§ 3.0e](#30e-gefecht-und-ruhe-m)). In Ruhe gibt es kein Rad; außerhalb des Gefechts ist der Stand immer 0. Ein Adrenalinschock erscheint als Chip in der Kopfzeile.
- **Ort:** eine Zeile im Daumenbereich direkt über der Aktionsleiste. Nicht ganz unten: Android nutzt waagerechtes Wischen am unteren Bildschirmrand für den App-Wechsel und fängt es ab, bevor die App es bekommt (entschieden 18.11.2026). Die Aktionsleiste darunter wird nur angetippt; unter ihr bleibt der Abstand frei, den das Gerät als Gestenbereich meldet.
- **Form:** ein horizontales Rad mit acht Stufen. Die aktuelle Stufe steht groß in der Mitte und ausgeschrieben („Adrenalin 2“); links und rechts sind die Nachbarstufen kleiner angeschnitten zu sehen. Bei 0 bleibt die Mitte leer (nur ein neutraler Strich).
- **Bedienung:** Waagerechtes Ziehen dreht das Rad unter dem Finger mit (nach links: höher). Erreicht der Finger die nächste Stufe, rastet sie ein (Anzeige und Farbe wechseln, kurzes haptisches Feedback, wo das Gerät es kann); so lassen sich mit einem Zug auch mehrere Stufen drehen. Übernommen wird beim Loslassen, als eine Änderung. An den Enden (Ruhepuls 3, Over the Edge) geht das Rad nur gebremst weiter und federt zurück. Ziehen setzt die Stufe direkt, jederzeit, auch ohne die Abläufe unten. Das Rad ist flach (wenig Rand über und unter den Namen). Beim Halten oder Ziehen klappt es nach oben auf, über den Inhalt, sodass die Stufennamen über dem Daumen stehen; beim Loslassen klappt es wieder zu.
- **Schutz vor Versehen:** Nur ein waagerechtes Ziehen auf dem Rad selbst dreht es; senkrechtes Scrollen der Seite dreht es nie. Eine Änderung am Rad zeigt keine Meldung „Rückgängig“ (18.11.2026); zurück geht es durch Zurückdrehen oder über das Detail.
- **Farbe:** Die Zeile ist neutral wie die übrigen Leisten (keine Vollfarbe, entschieden 18.11.2026). Die Stufenfarbe (Ruhepuls blau, 0 neutral, Adrenalin orange bis rot, Over the Edge purpurrot, hell genug für den dunklen Modus; Farben in `darstellung.json`) zeigt sich an zwei Stellen: (1) einer schmalen **Skala** über dem Rad mit einem Streifen je Stufe, die aktuelle leuchtet und ist höher; (2) dem **Rahmen** um die Mitte mit leichter Tönung. Das Banner „Over the Edge: nur 1 Aktion pro Runde“ ist ebenfalls neutral mit rotem Rand und roter Schrift.
- **Zusammenfassung** in derselben Zeile neben der Mitte, gekürzt auf die Symptome: „✔ Sprint, Schmerz ignorieren · ✖ keine Ansage, Tunnelblick“.
- **Nachbarstufen antippen** dreht ebenfalls um eine Stufe (für alle, die nicht wischen können oder wollen).
- **Antippen der Mitte** öffnet das **Detail** als Blatt von unten: Steps je Gruppe (mit den Stats), Symptome im Volltext, **Senken**, **Verbündete verschieben**, **Rückgängig** (letzte Änderung, auch aus den Abläufen). Wischen nach unten schließt es.
- **Rückgängig** nimmt nur den Stand zurück (und ob in der Runde gesenkt wurde), nicht die Rundenzahl. Es reicht zurück bis zum Anfang der laufenden Runde bzw. bis zum gerade abgeschlossenen Rundenende; den Start des Gefechts nimmt es nicht zurück.
- **Nächste Runde** und **Gefecht beenden** stehen nicht am Rad, sondern unter der Figur im Reiter Figur ([§ 3.0e](#30e-gefecht-und-ruhe-m)).

**Folgen im Bogen.**
- **Stats:** In der Step-Reihe jedes Stats ist der Wert hervorgehoben, der mit den Steps der Leiter gilt; die Markierung ♥ zeigt, dass Adrenalin bzw. Ruhepuls mitwirkt ([§ 3.0b](#30b-herkunft-von-werten-a-r)).
- **Rechner:** Proben- und Schussrechner rechnen die Leiter automatisch ein. Ab Adrenalin 1 bietet der Schussrechner keine Ansage an; die Symptome Empfindlich und Schmerz ignorieren gehen in die Stagger-Prüfung ein ([§ 3.10](#310-treffer-wunden-und-blutung-m-r)).
- **Over the Edge:** deutliches Banner „Over the Edge: nur 1 Aktion pro Runde“; der Adrenalinschock wird für das Gefechtsende vorgemerkt (im Dialog „Gefecht beenden“ vorgewählt). Nimmt der Spieler die Änderung auf Over the Edge zurück, entfällt die Vormerkung.
- **Kopfzeile:** Adrenalin bzw. Ruhepuls als farbiger Chip neben dem Namen (bei 0 nichts); Adrenalinschock als Chip. Antippen des Chips Adrenalinschock fragt, ob die Ruhe aus `regeln.json` (4 Stunden ununterbrochen) erfüllt ist, und beendet ihn.
- **Initiative:** Bis die Aktionsleiste kommt ([§ 3.7a](#37a-aktionsleiste-m-r)), steht das Ergebnis oben rechts in der Kopfzeile („Runde 2 · Initiative“ klein darüber, „Erfolg · 54“ darunter); Antippen öffnet die Initiative erneut. „Später“ schließt die Initiative ohne Eintrag; dann steht dort „würfeln“.

**Abläufe als Knöpfe.**
- **Gefecht starten:** Auswahl normal / überrascht → Anzeige von Zielwert und Krit-Schwelle der Nerve-Probe → Ergebnis antippen (Krit / gelungen / misslungen) → Leiter springt auf die Startstufe → weiter zur Initiative der ersten Runde ([§ 3.7b](#37b-initiative-und-breakaction-m-r)). Bei „überrascht“ rechnet die App in Runde 1 je 1 Malstep auf Initiative und Breakaction ein.
- **Nächste Runde:** Die App weiß nicht, wann eine Runde vorbei ist; das sagt die SL. Der Spieler tippt dann **Nächste Runde**. Es folgen in einem Ablauf: (1) Rundenende der Leiter (unten), (2) Zähler der Aktionsleiste zurücksetzen, (3) Initiative der neuen Runde ([§ 3.7b](#37b-initiative-und-breakaction-m-r)).
- **Rundenende** (Teil von „Nächste Runde“): Checkliste der Auslöser mit großen Kästchen (Liste aus `regeln.json`). Darunter z. B. „3 Auslöser → Nerve-Probe mit 3 Malsteps: Zielwert 34, Krit ≤ 3“ bzw. „keine Probe möglich“ ab 6 Malsteps. Ergebnis antippen: Krit / gelungen / misslungen / Verzichten → Leiter bewegt sich. Ohne Auslöser: keine Probe, Stufe bleibt. Wurde in der Runde gesenkt: Probe und Anstieg entfallen. Danach leert sich die Checkliste und der Rundenzähler steigt.
- **Senken:** Knopf → Nerve-Probe anzeigen → Ergebnis antippen → Leiter sinkt; die App merkt sich „gesenkt“ für das Rundenende.
- **Gefecht beenden:** Leiter auf 0, Adrenalinschock setzen, Blutungsfristen starten. Der Bericht enthält die Auswahl „Adrenalinschock: ja · nein“; vorgewählt ist „ja“, wenn im Gefecht Over the Edge erreicht wurde, sonst „nein“. Der Spieler kann sie umstellen, z. B. wenn die SL anders entscheidet oder Over the Edge versehentlich eingestellt war (18.11.2026) ([§ 3.10](#310-treffer-wunden-und-blutung-m-r)).

### 3.7a Aktionsleiste (M, R)
Nur im Gefecht ([§ 3.0e](#30e-gefecht-und-ruhe-m)) liegen ganz unten, unter dem Wählrad, die Knöpfe **Main · Bewegung · Stand** und ganz rechts, durch eine dünne Linie abgesetzt, **Break** (18.11.2026: die Breakaction ist etwas anderes als die Aktionen des eigenen Zugs). **Ereignis** und **Getroffen** stehen nicht hier, sondern wie in Ruhe neben der Figur (18.11.2026). Nach jeder Aktion über einen der vier Knöpfe zeigt die App kurz, was ausgeführt wurde („Standwechsel: kniend · Rückgängig“); Rückgängig stellt den Stand vor der Aktion wieder her, mit Zähler, Munition und Adrenalin (18.11.2026). Die ersten vier bilden die Aktionen der Runde ab ([§ 4.12](#412-aktionen)); so sieht der Spieler jederzeit, was er noch tun kann. Die Namen stehen mittig im Knopf; Stand, Bewegung und Konzentration stehen nicht darunter, sondern beschriftet neben der Figur (18.11.2026).

**Zähler.** Jeder der vier Aktionsknöpfe trägt eine kleine Zahl: wie oft die Aktion in dieser Runde noch verfügbar ist. Bei 0 ist der Knopf ausgegraut. „Nächste Runde“ ([§ 3.7](#37-leiter-m-r)) setzt alle Zähler zurück. Die App verfolgt nicht, wer am Zug ist: Main, Bewegung und Standwechsel stehen die ganze Runde bereit und lassen sich so oft ausführen, wie der Zähler erlaubt. Wann der Charakter dran ist, sagt die SL. Die App passt die Zähler selbst an:
- **Sprint** (Symptom A2): Bewegung 2.
- **Over the Edge:** ein gemeinsamer Zähler 1 für alle vier Knöpfe; nach einer Aktion sind alle grau.
- **Initiative-Krit:** Break 2 (Kampfsystem, Action Economy).
- **Stagger:** Break sofort 0.
- **Konzentration:** Startet eine Mainaction mit Konzentration, wird Break für diese Runde 0.
- **Standwechsel als Breakaction:** nur über Break → Standwechsel (mit Probe Reaktion oder Antizipation, wenn es in fremder Runde geschieht); verbraucht Break, nicht Stand. Der Knopf Stand verbraucht nur den eigenen Standwechsel (18.11.2026).
- **Krit beim Ladehemmung beheben:** Main wird nicht verbraucht.
- **Kampfunfähig:** Die vier Aktionsknöpfe tragen eine Warnmarkierung; Ausführen nur nach Bestätigung ([§ 3.0e](#30e-gefecht-und-ruhe-m)).

Ein **langer Druck** auf einen Knopf erlaubt ±1 von Hand (Sonderregeln, Fehltipper).

**Menüs.** Antippen öffnet die Liste der Optionen. Optionen ohne Rechnung zeigen nur den Regeltext und „Ausführen“; das verbraucht den Zähler. Optionen mit Rechnung führen in ihren Ablauf; der Zähler sinkt erst mit „Weiter“ im Bericht ([§ 3.0c](#30c-bericht-was-ist-passiert-a)).

| Knopf | Option | führt zu |
| --- | --- | --- |
| Main | Skill/Probe einsetzen | Probenrechner ([§ 3.6](#36-probenrechner-r)); Skills mit Konzentration setzen die Beschränkung ([§ 4.12](#412-aktionen)) |
| | Nachladen | keine Probe; Ablauf nach Ladeart ([§ 3.8](#38-waffen-und-schießen-a-m-r)) |
| | Ladehemmung beheben | Probe (Control + Waffenskill); Waffe wieder frei ([§ 3.8](#38-waffen-und-schießen-a-m-r)) |
| | Waffe wechseln | Auswahl der neuen aktiven Waffe; Kosten nach Trageort (ohne Aktion / Main / Main mit leichter Konzentration / 2 Runden; Kampfsystem, Waffe wechseln). Es zählt der teurere Trageort von alter und neuer Waffe |
| | Aufsatz anbringen/abnehmen | Main mit leichter Konzentration (Schusswaffen, Aufsätze) |
| | Adrenalin senken | Leiter-Ablauf ([§ 3.7](#37-leiter-m-r)) |
| | Verbündete verschieben | Probe (Empathy + Führung) |
| | Wunde versorgen | Fenster Versorgen ([§ 3.10](#310-treffer-wunden-und-blutung-m-r)): Wunde, Maßnahme, wer versorgt, Probe; Konzentration voll (Feldversorgung: leicht) |
| | Wurfaktion | Werfen ([§ 3.8a](#38a-werfen-a-m-r)) |
| | Nahkampfangriff | Vergleichsprobe ([§ 3.8b](#38b-nahkampf-m-r)) |
| | Hechten | bis 2 m, danach liegend (R27, 18.11.2026); setzt den Stand und „gehechtet“ für die Lage; gesperrt im Liegen und ab Ruhepuls 2 |
| | Zielen | nur mit Symptom „Ruhige Hand“: Stepshield schon für den nächsten Schuss dieser Runde |
| | Skill/Probe, Sonderfähigkeit | Konzentration wählt der Spieler (keine, leicht, voll); gesperrt, wenn die Breakaction schon eingesetzt ist |
| | Wachsamkeit, Ballistik | Probenrechner; Ballistik: Erfolg/Krit merkt 1/2 Malsteps weniger Reichweite für den nächsten Schuss auf das Ziel |
| | Sonderfähigkeit | Perks wie Offangle und Overwatch: Regeltext und Merker bis zum nächsten Zug; sonst Freitext |
| Break | *zuerst* | eigener oder fremder Zug; im fremden Zug Probe Reaktion oder Antizipation ([§ 3.7b](#37b-initiative-und-breakaction-m-r)); mit Weiter in einem zweiten Fenster eine der folgenden Aktionen |
| | **Schießen** | Schussrechner ([§ 3.8](#38-waffen-und-schießen-a-m-r)) |
| | Zielen | merkt 1 Stepshield für den nächsten Schuss (nächste Runde); mit Atemkontrolle 2, mit Gezielter Schuss stattdessen „keine Malsteps der Reichweite“. Gilt nur in der nächsten Runde; ein Schuss in der Runde des Zielens und „Neues Ziel“ lassen es verfallen |
| | Hechten | wie unter Main |
| | Standwechsel | setzt den Stand |
| | Nahkampfangriff, Abfangen | nur mit kurzer bzw. langer Nahkampfwaffe ([§ 3.8b](#38b-nahkampf-m-r)) |
| | Werfen | nur mit Perk Quickthrow |
| | Nachladen | nur mit Perk Schnell nachladen; nur Magazin, Schnelllader, Ladestreifen |
| | Eingreifen | nur mit Perk Schutzreflex (Abschirmen: bis 3 m) |
| Bewegung | Kriechen, Gehen, Laufen, Rennen | merkt die Art für diese Runde (Lage-Malsteps, Hörbarkeit); erlaubt nach Stand (Stehen: alle außer Kriechen; Hocke: Gehen; Liegen: Kriechen) und gesperrt durch Konzentration, Schutzanzug und Schild (höchstens Gehen). Wechselt der Stand nach der Bewegung (Standwechsel oder Hechten), sinkt die Bewegung dieser Runde auf das, was der neue Stand erlaubt: Rennen, dann Hocke → Gehen; dann Liegen → Kriechen. Wieder Aufstehen macht sie nicht schneller (R33, 18.11.2026) |
| Stand | Stehen, Hocke, Liegen | merkt den Stand; die Silhouette zeigt ihn an. Ist der Standwechsel der Runde verbraucht, ist der Knopf grau; ein weiterer geht nur über Break → Standwechsel. Der Stand fließt in Lage, Splitter und Nahkampf ein (überlegener Stand, Kampfsystem, Stand im Nahkampf). |

Unter jedem Knopf steht klein, was gerade gilt (Bewegung dieser Runde, eigener Stand, Konzentration).

Stand, Bewegung, Hechten und Zielen fließen in die Rechner ein: eigene Bewegung und Hechten als Lage-Malsteps, Zielen als Stepshield auf die Trefferprobe, liegend als Stepshield **nur auf die Haltezahl** (Kampfsystem, Treffen, Rückstoß abfangen). Die Werte stehen in `regeln.json`.

**Getroffen** steht im Gefecht wie in Ruhe neben der Figur ([§ 3.7c](#37c-treffer-ausgehend-und-eingehend-m-r)). **Ereignis** (umgesetzt 18.11.2026) steht nur im Gefecht neben der Figur zwischen Deckung und Getroffen, mit Ausrufezeichen, im selben Stil. Es ist unabhängig vom Rundenablauf; kein Zähler. Optionen (aus `regeln.json`, `ereignis`): Beschossen, Explosion in der Nähe (ohne Treffer und Schaden; setzt „beschossen“, Sprengwirkung, Adrenalin), Verbündeter ausgeschaltet, Sonstiges (SL); jede setzt nur ihren Auslöser für das Rundenende. Ein Tipp setzt sofort, ohne Bericht; die Meldung danach bietet Rückgängig. Was in dieser Runde schon zählt, ist grau. Trifft eine Explosion, läuft sie über Getroffen → Explosion. Die Reaktion auf eine Explosion ist eine Breakaction über Break ([§ 3.8a](#38a-werfen-a-m-r)).

### 3.7b Initiative und Breakaction (M, R)
Regeln: Kampfsystem (Action Economy; Die Breakaction benutzen; Reaktion und Antizipation), Würfelmechanik (Contested Rolls). Zusammenfassung: [§ 4.12](#412-aktionen).

**Grundsatz.** Die App kennt keine Zugreihenfolge und nicht die Würfe der anderen. Die SL ordnet und sagt an, wer wann handelt. Die App sagt dem Spieler, was er würfeln und ansagen muss, und führt seine Zähler.

**Initiative** (am Ende von „Nächste Runde“ und nach „Gefecht starten“):
1. Anzeige von Zielwert und Krit-Schwelle auf **Decision**, ohne Skill (kein Malstep für Skill 0). Eingerechnet: Adrenalin bzw. Ruhepuls, Überraschung in Runde 1, Perks (z. B. Lagebild, Überfall, Entschlossen), Lage-Block 1 und 3 ([§ 3.8c](#38c-lage-auswahl-r)).
2. Wurf eintragen.
3. Die App zeigt groß, was anzusagen ist: Stufe und Wurf („**Erfolg · 54**“), bei Misserfolg zusätzlich den Zielwert („**Misserfolg · Zielwert 47**“), weil er dann die Reihenfolge bestimmt.
4. Bei Krit: Break-Zähler 2 für diese Runde.

Das Ergebnis bleibt bis zur nächsten Runde oben in der Aktionsleiste sichtbar, falls die SL nachfragt.

**Breakaction** (Knopf Break), zwei Fenster nacheinander (18.11.2026):
1. **Wann handelst du?** „In deinem Zug“ oder „Im fremden Zug“.
	- **In deinem Zug:** ohne Probe; Weiter führt gleich zur Aktion.
	- **Im fremden Zug:** „Probe auf“ **Reaktion** (Twitch + Reflexe) oder **Antizipation** (Intellect + Lagegespür; gesperrt bei Tunnelblick, Adrenalin 2 und höher); dazu **ohne Wurf**, wenn die SL die Unterbrechung ohne Wurf zulässt.
2. Bei Reaktion und Antizipation: Hinweis „**Braucht eine Information über den Akteur**“ mit Kurzfassung der Malsteps nach Wahrnehmung bzw. Güte und Alter (Regeltext). Die App fragt nicht nach der Information; die Malsteps legt die SL fest und der Spieler trägt sie in Lage-Block 3 ein. Eingerechnet werden automatisch: Adrenalin bzw. Ruhepuls, Überraschung in Runde 1, Perks (z. B. Overwatch, Offangle des Gegners als SL-Malstep, Gegner einschätzen, Dynamischer Zugriff), Sichtstufe bei Reaktion auf Gesehenes.
3. Wurf eintragen. Die App zeigt groß, was anzusagen ist: „**Krit · 07**“, „**Erfolg · 54**“ oder „**Misserfolg**“. Einen Vergleich mit anderen rechnet sie nicht; die Reihenfolge sagt die SL an. Ein Krit hat keine weitere Folge. **Weiter** ist erst möglich, wenn der Wurf eingetragen ist.
4. **Aktion wählen** (zweites Fenster; oben steht, wie es zur Breakaction kam, z. B. „Im fremden Zug mit Reaktion: Erfolg · 54.“; Zurück führt zum ersten Fenster): Schießen, Zielen, Hechten, Standwechsel, Nahkampfangriff, Abfangen, Werfen, Nachladen, Eingreifen ([§ 3.7a](#37a-aktionsleiste-m-r)). Sie führt in ihren Ablauf; Break −1.

Probe und Aktion sind getrennt, damit der Spieler die Probe würfeln und ansagen kann, bevor die SL die Reihenfolge festlegt. Verliert der Charakter seine Breakaction durch einen Stagger, bevor er handelt, setzt der Treffer den Zähler auf 0 ([§ 3.10](#310-treffer-wunden-und-blutung-m-r)); die Probe verfällt.

### 3.7c Treffer: ausgehend und eingehend (M, R)
Alles, was Schaden austeilt oder einsteckt, läuft über **einen Dialog in zwei Richtungen** mit **derselben Gliederung**. Wer einen kennt, kennt beide.

| Schritt | Ausgehend (ich greife an) | Eingehend (ich werde getroffen) |
| --- | --- | --- |
| **Start** | Aktionsknopf: Break → Schießen ([§ 3.8](#38-waffen-und-schießen-a-m-r)), Main → Werfen ([§ 3.8a](#38a-werfen-a-m-r)), Main/Break → Nahkampfangriff ([§ 3.8b](#38b-nahkampf-m-r)) | Knopf **Getroffen** ([§ 3.10](#310-treffer-wunden-und-blutung-m-r)), im Gefecht und in Ruhe |
| **1. Was** | vorbelegt aus der Aktion: aktive Waffe mit Munition und Feuermodus, Wurfgegenstand oder Nahkampfwaffe | Art wählen: **Schuss · Nahkampf · Explosion · Sonstiges**, dann Einzelheiten (Kaliber und Munitionstyp oder DK/MW; Nahkampfwaffe oder MW, stumpf/scharf; Sprengwaffe und Band; bei Sonstiges Schaden direkt) |
| **2. Probe** | eigene Probe mit Lage-Auswahl ([§ 3.8c](#38c-lage-auswahl-r)) | nur wo der Charakter selbst würfelt: Verteidigung im Nahkampf, Reaktion auf eine Sprengwaffe; sonst entfällt der Schritt |
| **3. Wo und wie viel** | Ansage oder W8; Rückstoßwürfel, Folgetreffer, Kugeln | Kugeln bzw. Splitter, Krit (Schalter, wie die SL ansagt), dann Zone auf der Silhouette mit **Vorschau** des Ausgangs je Zone ([§ 3.0f](#30f-körperbild-silhouette-a-r)) oder W8 |
| **4. Ausgang** | aus dem eigenen Wurf; bei Vergleichsproben tippt der Spieler den Ausgang, den die SL ansagt | bei Vergleichsproben tippt der Spieler den Ausgang, den die SL ansagt; sonst getroffen |
| **5. Bericht** | was beim Ziel ankommt, mit Block **„Für die SL“**; optional Schutz des Ziels → Schaden vorrechnen | Schadensablauf am eigenen Charakter: Deckung, Rüstung, Wunde/Prellung, Stagger, HP |

**Gemeinsam für beide Richtungen:**
- Ein Bildschirm, Schritte untereinander; erledigte Schritte klappen auf eine Zeile zusammen und bleiben antippbar.
- Was die App schon weiß, ist vorbelegt und markiert (Herkunftszeichen, [§ 3.0b](#30b-herkunft-von-werten-a-r)); alles bleibt änderbar.
- Der Bericht ([§ 3.0c](#30c-bericht-was-ist-passiert-a)) übernimmt erst mit „Weiter“; Eintrag im Gefechtsprotokoll.
- **Im Gefecht** setzen beide Richtungen die Auslöser der Rundenend-Checkliste (ausgehend: geschossen; eingehend: beschossen, getroffen, verletzt, Stagger, im Nahkampf angegriffen) und verbrauchen Zähler. **In Ruhe** gibt es keine Auslöser und keine Zähler.

### 3.8 Waffen und Schießen (A, M, R)

**Waffen.** Je Waffe: Werte aus `waffen.json`, angebrachte Aufsätze, Zustand, Ladehemmung (keine / einfach / schwer) und der **Magazinstand**:
- **in der Waffe:** aktueller Inhalt (inklusive Patrone im Lauf) und sein Munitionstyp (DK/MW). Jeder abgegebene Schuss wird abgezogen, auch Schüsse, die ins Leere gehen.
- **Eingesetztes Magazin:** seine Sorte (z. B. „Erweitertes Magazin (30)“) bestimmt die Magazingröße; eine Trommel erhöht die Ladehemmungsrate. Darunter, wie viele passende Magazine gefüllt bzw. leer sind (siehe Magazine unten).
- **Aktive Waffe:** Es ist immer genau eine Waffe aktiv. Sie steht oben im Waffenbereich; alle Rechner beziehen sich auf sie. Wechseln ist eine Aktion („Waffe wechseln“, [§ 3.7a](#37a-aktionsleiste-m-r)); dabei wählt der Spieler die neue Waffe aus seiner Ausrüstung. Außerhalb des Gefechts ist der Wechsel frei.
- **Aufsätze** kommen aus `aufsaetze.json`; ihre Wirkung ist dort hinterlegt, nicht bei der Waffe, weil ein Aufsatz an mehrere Waffen passt ([datenformat.md § aufsaetze.json](datenformat.md#aufsaetzejson)). Ob ein Aufsatz an eine Waffe passt, ergibt sich aus den Anschlüssen der Waffe (Schiene oben/unten/seitlich, Mündung Pistole/Gewehr). Magazine sind keine Aufsätze (seit 19.11.2026, siehe Magazine unten).
  - Manche Aufsätze wirken **immer**, solange sie angebracht sind (z. B. Reflexvisier).
  - Andere wirken nur, wenn sie **im Einsatz** sind; das ergibt sich aus dem Spielfluss. Für sie zeigt der Schussablauf einen **Schalter**, aber nur, wenn die aktive Waffe den Aufsatz hat. Beispiel: **Zweibein aufgesetzt** → 1 Stepshield auf die Haltezahl ([§ 4.6](#46-schießen)).

**Schießen** (Break → Schießen):
1. **Eingabe:** Feuermodus (Modi der aktiven Waffe; bei Burst die Zahl der Bursts), Anzahl Schüsse (bis Feuerrate, höchstens Inhalt des Magazins), Ansage (gesperrt ab Adrenalin 1 und bei Sichtstufe keine), Lage mit Entfernung zum Ziel ([§ 3.8c](#38c-lage-auswahl-r)), Schalter der Aufsätze im Einsatz (z. B. Zweibein aufgesetzt; nur wenn vorhanden). Automatisch: eigene Bewegung und Hechten dieser Runde, Stand (liegend nur für die Haltezahl), Zielen, Leiter, Zustände, Perks, Anpassungen, ständig wirkende Aufsätze (Visiere je nach Band).
   Ist die Waffe leer oder hat eine Ladehemmung, ist Schießen gesperrt; das Menü zeigt stattdessen den Weg zu Nachladen bzw. Ladehemmung beheben.
   **Sonderfälle:** Ziel im Nahkampf (Schalter): 1 Malstep, ein Fehlschuss trifft einen anderen Beteiligten (Zone W8, kein Krit; Kampfsystem, Schießen in den Nahkampf). Schrotflinte mit Buckshot: Schrotzahl je Band aus `munition.json`, Zonen fortlaufend nach unten (Kampfsystem, Schrotflinten). Werfer: statt Zone der Landepunkt ([§ 3.8a](#38a-werfen-a-m-r)).
2. **Vor dem Wurf:** Trefferwert, Krit-Schwelle und bei mehr als einem Schuss Haltezahl, jeweils mit aufgeschlüsselter Herkunft der Steps ([§ 3.0b](#30b-herkunft-von-werten-a-r)). Hinweise passender Perks (z. B. Triple Tap).
3. **Ladehemmung prüfen:** Die App zeigt die aktuelle Ladehemmungsrate (Feuermodus + Zuschlag für Zustand und Zuverlässigkeit) und den Wurfbereich, der eine Ladehemmung auslöst (größer als 100 − Rate; 100 = schwer). Die Prüfung steckt im Trefferwurf (Kampfsystem, Ladehemmung). Bei Ladehemmung endet der Ablauf hier: kein Schuss, keine Munition verbraucht, die Waffe ist blockiert.
4. **Würfe eintragen:** W100, W8 (falls keine Ansage), Rückstoßwürfel (bei mehr als einem Schuss). Alle Würfe stehen in einem gemeinsamen Würfelkasten mit **einem** Umschalter für alle: „App würfelt“ würfelt alle nötigen Würfe auf einmal (auch den W8, der erst nach dem Trefferwurf nötig wird); „von Hand“ zeigt je Wurf ein Feld und einen gemeinsamen Knopf „Übernehmen“. Startstellung nach der Einstellung für Proben.
5. **Bericht** ([§ 3.0c](#30c-bericht-was-ist-passiert-a)): Treffer oder nicht, Zone, Krit, Haltezahl − Rückstoßwürfel, Folgetreffer mit Kugeln (begrenzt auf angesagte Schüsse − 1), Magazinstand alt → neu, verbrauchter Zielen-Stepshield, Auslöser „geschossen“. Am Ende ein Block **„Für die SL“** in Kurzform (Zonen, Krit, Kugeln, Munition mit DK/MW). Optional: Deckung und Rüstung des Ziels eingeben; dann rechnet die App den Schaden je Treffer vor ([§ 4.7](#47-schadensablauf)).
6. **Weiter:** übernimmt; Break-Zähler −1; Eintrag im Gefechtsprotokoll.

**Nachladen** (Main; Break nur mit Perk Schnell nachladen). Keine Probe. Der Ablauf hängt von der **Ladeart** der Waffe ab (Kampfsystem, Nachladen):
- **Wechselmagazin:** Der Spieler tippt das neue Magazin aus den passenden Magazinen des Charakters (mit Inhalt und Typ, bei mehreren Sorten auch die Sorte; vorgewählt: das vollste vom bisherigen Typ, sonst das vollste). Ein passendes erweitertes Magazin oder eine Trommel lässt sich genauso einsetzen. Das eingesetzte Magazin geht mit Rest und Typ zu den Magazinen (leer, wenn nichts mehr drin ist); eine Patrone im Lauf bleibt in der Waffe und zählt zum Typ des neuen Magazins (vereinfacht).

**Magazine füllen** (nur außerhalb des Gefechts, Knopf an der Waffe im Reiter Ausrüstung): Der Spieler tippt den Munitionstyp („Füllen mit: FMJ (40) · HP (15)“). Gefüllt wird aus der losen Munition dieses Typs, so weit sie reicht: zuerst die Waffe, dann angebrochene passende Magazine desselben Typs, dann leere passende Magazine; bei Waffen ohne Wechselmagazin passende Schnelllader und Ladestreifen, nur ganz. Was schon einen anderen Typ enthält, bleibt, wie es ist. Vorher zeigt ein Bericht, was passiert. Jedes Magazin, jeder Schnelllader und Ladestreifen lässt sich außerhalb des Gefechts **leeren**; die Patronen kommen zur losen Munition.
- **Trommel, Röhrenmagazin, festes Magazin** ohne Schnelllader oder Ladestreifen: **einzeln laden**, Main mit leichter Konzentration, bis zu 2 Patronen (Perk Fingerfertig: 3) aus der losen Munition; der Spieler wählt den Typ. Nie als Break. Bei Unterbrechung bleiben bereits geladene Patronen drin; nur die der laufenden Runde fehlen.
- **Mit Schnelllader oder Ladestreifen** (bei den Magazinen des Charakters): füllt auf einmal wie ein Magazin und bleibt leer beim Charakter. Leere Schnelllader und Ladestreifen werden einzeln gefüllt.
- **Werfer** (Magazingröße 1): Main mit voller Konzentration. Der Magazinstand ist das geladene Geschoss. Nachladen nimmt ein passendes Geschoss aus dem **Vorrat** (Anzahl −1, Auswahl nach Typ, z. B. OG-7V oder PG-7V); Schießen verbraucht es. Der Bericht nennt statt Zone den Landepunkt ([§ 3.8a](#38a-werfen-a-m-r)).

**Munition je Magazin** (entschieden und umgesetzt 19.11.2026). Der Munitionstyp hängt am **Magazin**, nicht an der Waffe:
- **Lose Munition** führt der Charakter nach Kaliber und Typ („9x19 · FMJ 40 · HP 15“), nicht je Waffe (eigene Karte Munition im Reiter Ausrüstung).
- **Magazine** (beim Charakter, siehe unten): jedes mit Füllstand und Typ („30 FMJ“, „12 HP“, „leer“); erweiterte und Trommelmagazine sind Magazinsorten.
- **Magazine füllen** (außerhalb des Gefechts): je Magazin den Typ wählen; gefüllt wird aus der losen Munition.
- **Nachladen** (Wechselmagazin): Der Spieler tippt das Magazin, das in die Waffe soll (mit Typ und Füllstand). Vorbelegt: das vollste vom bisherigen Typ.
- **Ohne Wechselmagazin** (Trommel, Röhre, fest): nur **ein Typ je Ladung**; ein anderer Typ erst, wenn die Waffe leer ist. Schnelllader und Ladestreifen tragen ihren Typ wie ein Magazin.
- Der Schuss nimmt DK und MW vom Typ der geladenen Munition.

**Magazine** (entschieden vom Nutzer und umgesetzt 19.11.2026, R49). Magazine sind eigene Gegenstände **beim Charakter**, nicht an einer Waffe und keine Aufsätze:
- **Magazinsorten** stehen in `magazine.json`: Standardmagazin, erweitertes Magazin, Trommelmagazin, dazu Schnelllader und Ladestreifen (sie gelten als Magazin für Waffen ohne Wechselmagazin). Jede Sorte nennt die Waffen, an die sie passt. **Mehrere Waffen können dieselben Magazine nutzen**, z. B. Colt M4 und Colt M16A4.
- **Karte Magazine** im Reiter Ausrüstung: nach Sorte gruppiert („Magazin (20) · für Colt M4 Carbine, Colt M16A4 · 20 Schuss“), darunter jedes Stück mit Inhalt und Typ und **leeren**. Im Schreibmodus Inhalt, Typ, entfernen und neue Magazine hinzufügen.
- **In der Waffe** steckt genau ein Magazin einer passenden Sorte; eine neue Waffe hat ihr Standardmagazin. Im Schreibmodus lässt sich die Sorte des eingesetzten Magazins wählen (Patronen über der neuen Kapazität werden lose).
- Nachladen und Magazine füllen nehmen alle passenden Magazine des Charakters.

**Lose Aufsätze** (entschieden und umgesetzt 19.11.2026). Aufsätze gibt es auch lose (Karte Aufsätze im Reiter Ausrüstung, mit Zustand). In der aufgeklappten Waffe stehen unter „Aufsätze“ die angebrachten mit **abnehmen** und die losen passenden mit **anbringen**. Außerhalb des Gefechts frei, im Gefecht Main → Aufsatz anbringen oder abnehmen (leichte Konzentration; Schusswaffen, Aufsätze).

**Vorrat.** Granaten und Geschosse werden als Anzahl geführt. Sie sinkt automatisch beim Werfen und beim Laden eines Werfers. Von Hand lässt sie sich jederzeit wieder erhöhen. Nahkampfwaffen tragen ebenfalls eine Anzahl (meist 1); eine geworfene Nahkampfwaffe zieht 1 ab, eingesammelte Wurfmesser nach dem Gefecht werden von Hand wieder dazugezählt.

**Ausrüstung eintragen.** Gekauft wird im Laden ([§ 3.14](#314-laden-kaufen-und-verkaufen-m-r)); frei, ohne Geld, trägt der Spieler Waffen, Munition, Magazine, Aufsätze, Nahkampfwaffen, Vorrat und Rüstung im **Schreibmodus** im Reiter Ausrüstung ein. Außerhalb des Gefechts sind dort aktive Waffe, Nachladen und Ladehemmung beheben frei (ohne Aktion).

**Ladehemmung beheben** (Main): einfache Ladehemmung per Probe auf Control mit Waffenskill, Malsteps LH-Behebenmod. + Sichtstufe + Leiter (Krit: Main nicht verbraucht); schwere Ladehemmung ist im Gefecht nicht behebbar (nur Hinweis; außerhalb: Intellect-Probe, Zustand −1).

### 3.8a Werfen (A, M, R)
Main → Wurfaktion (Break → Werfen nur mit Perk Quickthrow; umgesetzt 18.11.2026). Regeln: Kampfsystem (Werfen), Sprengwirkung.

**Ausgehend (Main → Werfen):**
1. **Gegenstand:** eigene Nahkampfwaffen (jede ist werfbar, soweit ihre Wurf-Reichweite es zulässt; Wurfmesser und Wurfaxt sind dafür gebaut) und Granaten aus dem Vorrat, jeweils mit Anzahl, oder „sonstiger Gegenstand“.
2. **Ziel:** Reichweitenband; die App zeigt, bis wohin der Wurf genau ist (Grundwert Wurfweite + Wurfarm, [§ 4.10](#410-grundwerte)). Ein Band weiter: 2 Malsteps; darüber hinaus nicht möglich. Bei Nahkampfwaffen kommen die Malsteps der Wurf-Reichweite der Waffe dazu; Bänder mit „n/A“ sind nicht wählbar. Bei Granaten mit Zeitzünder: Schalter „Kochen lassen“ (1 Malstep, Verzögerung −1). Wurfwaffe gegen eine Person: Ansage wie beim Schießen. Sprengwaffe: Zielpunkt.
3. **Vor dem Wurf:** Zielwert und Krit-Schwelle auf Agility mit Herkunft der Steps. Skill: Wurfwaffen oder Granaten, je nach Gegenstand vorgewählt (austauschbar, [§ 3.6](#36-probenrechner-r)).
4. **Würfe eintragen:** W100; Wurfwaffe: W8 für die Zone (ohne Ansage); Sprengwaffe: W8 für die Richtung bei Misserfolg.
5. **Bericht:** Wurfwaffe: Treffer, Zone, Krit, DK/MW (Schadensablauf wie beim Schießen). Sprengwaffe: Landepunkt (Krit genau, Erfolg bedrängt, Misserfolg nah + Richtung), Zünder und Verzögerung, Splitterzahlen je Band. Vorrat −1; Block **„Für die SL“**.
6. **Weiter:** Main −1 (bzw. Break −1); geworfener Gegenstand −1 (der Eintrag bleibt mit Anzahl 0); Auslöser „selbst auf jemanden geschossen“ (Regelfrage R36, vorläufig); Eintrag im Gefechtsprotokoll.

*Stand 18.11.2026:* Ein Fenster mit den Abschnitten **Was wirfst du?** (Gegenstand mit Anzahl, Werte bzw. Zünder und Splitterzahlen, Trageort; Schalter Kochen lassen), **Wohin wirfst du?** (Entfernung mit Malsteps aus Wurfweite und Wurf-Reichweite, „n/A“ gesperrt; Hinweis auf die genaue Wurfweite; Ansage nur bei Wurfwaffen und sonstigen Gegenständen, bei Granaten der Hinweis auf den Zielpunkt), **Ziel und Werfer** (Lage wie beim Schießen, ohne „Waffe aufgelegt“; „Ziel im Nahkampf“ nur bei Wurfwaffen), **Wurfprobe** und Würfelbereich (W100, W8 nur wenn nötig: Zone ohne Ansage, Fehlwurf in den Nahkampf, Richtung der Granate bei Misserfolg). Lage und Entfernung teilt sich das Fenster mit Schießen. Ein sonstiger Gegenstand zählt nur die Wurfweite; den Schaden legt die SL fest.

**Eingehend (Explosion in der Nähe)** (18.11.2026; kein eigener Ablauf, drei bestehende Wege):
1. **Reaktion:** eine Breakaction über Break ([§ 3.7b](#37b-initiative-und-breakaction-m-r)), nach den üblichen Regeln: Hechten oder Standwechsel (in Deckung gehen ist ein Standwechsel). Zurückwerfen ist eine Wurfaktion: im eigenen Zug über Main → Werfen, als Breakaction nur mit dem Perk Quickthrow (Break → Werfen). Im Moment der Detonation einfache Probe auf Reaktion oder Antizipation (Sprengwirkung, Zündung).
2. **Ohne Treffer:** Ereignis → Explosion in der Nähe setzt „beschossen“ (Sprengwirkung, Adrenalin).
3. **Mit Treffer:** Getroffen → Explosion ([§ 3.10](#310-treffer-wunden-und-blutung-m-r)): Bereich, Stand, Deckung zur Explosion, Splitter und Druckwelle. Regeln: Grundmechanik/Sprengwirkung.

### 3.8c Lage-Auswahl (R)
Die Lage-Auswahl ist ein Baustein, den Schussrechner ([§ 3.8](#38-waffen-und-schießen-a-m-r)), Werfen ([§ 3.8a](#38a-werfen-a-m-r)) und Probenrechner ([§ 3.6](#36-probenrechner-r)) gemeinsam nutzen. Regeln: Kampfsystem (Lage), Wahrnehmung (Sehen). Werte und Umstände: `regeln.json` (`lage`, `sicht`).

**Ziel:** In der Regel ein bis zwei Fingertipps pro Schuss. Alles, was die App schon weiß, trägt sie selbst ein. Die SL kann jederzeit eigene Malsteps oder Stepshields dazugeben.

**Kopfzeile** (immer sichtbar, aktualisiert sich bei jeder Änderung): Summe Malsteps · Summe Stepshields · Netto · **Zielwert** · **Krit-Schwelle**, z. B. „▼ 5 · ▲ 2 · netto 3 → 24 · Krit ≤ 2“. Antippen klappt die vollständige Aufschlüsselung mit Herkunftszeichen auf ([§ 3.0b](#30b-herkunft-von-werten-a-r)).

**Block 1: Automatisch.** Was die App aus Charakter und Gefecht kennt, als Chips mit Zahl und Herkunftszeichen:
- Ansage,
- eigene Bewegung und Hechten dieser Runde (aus der Aktionsleiste, [§ 3.7a](#37a-aktionsleiste-m-r)),
- Sichtstufe (Einstellung im Gefecht, [§ 3.11](#311-zustände-a-m)),
- Adrenalin bzw. Ruhepuls (beschriftet mit dem Stand, z. B. „Adrenalin 2“), Zustände, Zielen, Aufsätze, Perks, Anpassungen,
- SL-Umstände für das ganze Gefecht (Block 3).

Antippen eines Chips zeigt Regeltext und Herkunft. Das kleine **×** am Chip schaltet ihn für diesen Schuss aus (z. B. die SL wertet eine Bewegung anders); der Chip bleibt durchgestrichen sichtbar, das × wird zu ↺ (wieder einschalten), und der Bericht nennt es. Mit dem nächsten Schuss ist er wieder an.

**Block 2: Ziel und Schütze.** Die Umstände aus `regeln.json` in ihren Gruppen, als Reihen großer Knöpfe:
- **Entfernung zum Ziel:** bedrängt · nah · mittel · weit · sehr weit · fern (genau eins). Jeder Knopf zeigt die Malsteps der aktiven Waffe für dieses Band; Bänder, in die die Waffe nicht reicht, sind gesperrt. Kein Standard: Beim ersten Schuss auf ein Ziel ist noch nichts gewählt, und die Kopfzeile zeigt „Entfernung wählen“.
- **Bewegung des Ziels:** ruhend oder gehend · laufend · rennend oder hechtend · im Nahkampf (genau eins).
- **Stand des Ziels:** stehend · hockend · liegend · liegend, von oben beschossen (genau eins).
- **Größe des Ziels:** Person · kopfgroß · handgroß · groß, Gegenstand (genau eins).
- **Schütze:** Waffe aufgelegt (Schalter).

Vorgewählt ist jeweils der Standard (Grundfall: stillstehendes, stehendes Ziel; keine Steps). Die App setzt Regeln selbst um und zeigt sie am Knopf:
- **Gesperrt:** „aufgelegt“ nach eigener Bewegung in dieser Runde; ist das Zweibein aufgesetzt, ist „aufgelegt“ automatisch an.
- **Ohne Wirkung:** Hocke und Liegen im Band bedrängt (ausgegraut, „wirkt nicht im Band bedrängt“).
- **Hinweis:** „im Nahkampf“ blendet ein, dass ein Fehlschuss einen anderen Beteiligten trifft; der Bericht wertet das aus ([§ 3.8](#38-waffen-und-schießen-a-m-r)).
- Umstände mit `nicht_fuer` fehlen im jeweiligen Ablauf (z. B. „aufgelegt“ beim Werfen).

**Merken.** Die Auswahl bleibt für den nächsten Schuss stehen, weil man meist dasselbe Ziel weiter beschießt. Wann sie zurückfällt, legt `zuruecksetzen` je Gruppe fest: Bewegung des Ziels und „aufgelegt“ zum **Rundenende**; Entfernung, Stand und Größe beim Knopf **Neues Ziel**. Die Entfernung bleibt also stehen, auch wenn sich jemand bewegt hat. Die App weist nur auf das hin, was sie wissen kann: auf die eigene Bewegung dieser Runde (aus der Aktionsleiste) und auf eine Bewegung des Ziels, die in der Lage-Auswahl schon eingetragen ist. Ob sich das Ziel bewegt hat, weiß die App sonst nicht; das sagt die SL an. Gefechtsende setzt alles zurück.

**Block 3: SL.** Zwei Zähler, **+ Malstep** und **+ Stepshield**, mit großem ± und einem optionalen Feld **Grund**. Unter dem Feld stehen die zuletzt verwendeten Gründe zum Antippen.
- Standard: gilt **nur für diesen Schuss**.
- Schalter **für das ganze Gefecht:** Der Umstand wandert in Block 1 und gilt für alle folgenden Proben, die der Spieler beim Anlegen wählt (Schießen, Werfen, alle Proben). Er bleibt bis Gefechtsende oder bis er dort über sein × gelöscht wird.
- Der Bericht und das Gefechtsprotokoll nennen SL-Steps mit Grund.

**Im Probenrechner** ([§ 3.6](#36-probenrechner-r)) zeigt die Lage-Auswahl nur Block 1 (ohne Ansage) und Block 3; eine Entfernung gibt es dort nicht. Ein Schalter **braucht Sicht** nimmt die Sichtstufe hinzu; bei Proben, deren Ablauf Sicht verlangt (Ladehemmung beheben, Nahkampf, Reaktion auf Gesehenes), ist er vorgewählt.

**Beim Werfen** gilt Block 2 ohne „aufgelegt“; die Entfernung bringt Malsteps nach der Wurfweite ([§ 4.12](#412-aktionen)), Bänder jenseits davon sind gesperrt.

### 3.8b Nahkampf (M, R)
Regeln: Kampfsystem (Nahkampf). Zusammenfassung: [§ 4.12](#412-aktionen). Gliederung wie [§ 3.7c](#37c-treffer-ausgehend-und-eingehend-m-r).

**Ausgehend** (Main → Nahkampfangriff; Break → Nahkampfangriff mit kurzer Waffe oder Abfangen mit langer Waffe):
1. **Was:** Nahkampfwaffe aus der Ausrüstung, Körperwaffen oder Einsatz mit der aktiven Schusswaffe (Kolben, Lauf, Pistolengriff); Länge, Art (stumpf/scharf), MW und DK aus den Daten.
2. **Probe:** Agility + Nahkampf. Eingerechnet: eigener Stand und **Stand des Gegners** (Auswahl stehend · hockend · liegend; die App bestimmt den überlegenen Stand und rechnet 1 Malstep für den Unterlegenen ein bzw. zeigt „Gegner hat 1 Malstep“), lange Waffe in Armeslänge (Schalter), Adrenalin bzw. Ruhepuls, Lage-Block 1 und 3. Anzeige zum Ansagen: „**Erfolg · 54**“.
3. **Wo:** Ansage oder W8 wie beim Schießen.
4. **Ausgang** (die SL vergleicht): **getroffen** · **nicht getroffen**. Bei „getroffen“: Krit-Schalter, falls der eigene Wurf ein Krit war (vorbelegt); bei überlegenem Stand Auswahl der Kampfkunst-Wirkung aus den eigenen Perks (höchstens eine).
5. **Bericht „Für die SL“:** Zone, MW (Nahkampfschaden + MW der Waffe), DK bzw. stumpf, Krit-Folge (scharf: Spalte „Krit“; stumpf: Stagger), Kampfkunst-Wirkung.

**Eingehend** (Getroffen → Nahkampf):
1. **Was:** Waffe des Angreifers: Auswahl aus `nahkampfwaffen.json` (MW und DK übernommen, MW des Angreifers ergänzen) oder MW und DK direkt; stumpf/scharf.
2. **Probe (Verteidigung):** Schalter **Angreifer wahrgenommen** (Standard: an). Aus: keine Verteidigung, weiter mit Schritt 3. An: Agility + Nahkampf mit Stand beider Seiten, **Verteidigungen in dieser Runde** (die App zählt mit: je weitere 1 Malstep), Adrenalin bzw. Ruhepuls, Lage-Block 1 und 3. Anzeige zum Ansagen. Die Verteidigung kostet keine Aktion und unterbricht eine Aktion mit Konzentration (die App bricht sie ab).
3. **Ausgang** (die SL vergleicht): **getroffen** · **abgewehrt** · **unentschieden** (wie abgewehrt). Bei „abgewehrt“ mit eigenem Krit: Hinweis „Abstand bestimmen“; mit überlegenem Stand: Auswahl der Kampfkunst-Wirkung aus den eigenen Perks.
4. **Bei „getroffen“:** Zone, Krit (Schalter), dann Schadensablauf wie jeder eingehende Treffer ([§ 3.10](#310-treffer-wunden-und-blutung-m-r)). Eine Kampfkunst-Wirkung des Gegners (umgerissen, fixiert, entwaffnet, Stagger) wählt der Spieler hier aus, wenn die SL sie ansagt; die App setzt Stand, Hinweis oder Stagger.

*Stand 18.11.2026 (eingehend umgesetzt):* Getroffen → Nahkampf hat die Abschnitte Was trifft dich (Waffe aus `nahkampfwaffen.json`, Varianten wie Klappspaten mit Kante oder Fläche einzeln, dazu Nahkampfschaden des Angreifers, vorbelegt mit dem Grundwert; oder DK und MW direkt) · Wie steht ihr (im Gefecht gilt der eigene Stand des Gefechts, ändern über Break → Standwechsel; in Ruhe Auswahl; dazu Stand des Gegners und die Ansage „Gegner hat 1 Malstep“ bzw. der Malstep für dich) · Verteidigung (Schalter Angreifer wahrgenommen und lange Waffe in Armeslänge, Probe mit Würfel) · Ausgang (getroffen · abgewehrt · unentschieden; ohne Wahrnehmung getroffen · daneben) · bei „getroffen“ Krit, Wirkung des Gegners und Zone wie beim Schuss. Der Bericht erzählt Angriff, Verteidigung, Ausgang und Schaden.

*Stand 18.11.2026 (ausgehend umgesetzt):* Main → Nahkampfangriff und Break → Nahkampfangriff, Abfangen öffnen ein Fenster mit den Abschnitten Womit greifst du an (Körperwaffen immer; jede eigene Kampfkunst als eigene Wahl mit den Werten der Körperwaffen (nur mit ihr gibt es Kampfkunst-Wirkungen, R35); eigene Nahkampfwaffen je Variante; Kolben, Lauf bzw. Pistolengriff nur mit passender aktiver Schusswaffe; als Breakaction nur kurze und lange Waffen, `regeln.json` `nahkampf.als_break`) · Wie steht ihr (eigener Stand aus dem Gefecht, Stand des Gegners, Ansage des Standvorteils; bei langer Waffe Schalter „Gegner steht in Armeslänge“) · Wohin zielst du (Ansage keine · Rumpf · Zone wie beim Schießen) · Angriffsprobe (Agility + Nahkampf mit Würfel oder eingetragenem Ausgang) · Ausgang (sagt die SL): getroffen · nicht getroffen; bei getroffen Krit (vorbelegt aus dem Wurf), Kampfkunst-Wirkung der gewählten Kampfkunst bei überlegenem Stand und ohne Ansage der W8 für die Zone. Der Bericht erzählt den Angriff und nennt „Für die SL“ Zone, DK bzw. stumpf, MW (Nahkampfschaden + Waffe), Krit-Folge und Wirkung. „Weiter“ zieht Main bzw. Break ab und schreibt ins Gefechtsprotokoll; ein eigener Angriff setzt keinen Auslöser.

### 3.9 Schutz (A, M)
- **Rüstung** je Zone (Wert aus `schutz.json`), aus der Ausrüstung.
- **Deckung** auf der **Silhouette**, im Gefecht und in Ruhe (18.11.2026) ([§ 3.0f](#30f-körperbild-silhouette-a-r), Schicht Deckung, bearbeitbar). Erreichbar über den Knopf **Deckung** rechts neben der Figur über Getroffen (im Gefecht und in Ruhe; der Knopf zeigt keinen Zustand, er öffnet nur den Dialog; der Deckungswert steht mit kleinem Mauerzeichen auf jeder schraffierten Zone der Figur, 18.11.2026). Er öffnet den Dialog Deckung mit zwei Abschnitten: Figur (Was ist verdeckt?) und Deckungswert. Knöpfe: Abbrechen · Eintragen.
  - **Zonen antippen** ist der einzige Weg, die Deckung festzulegen (18.11.2026: die Deckungskante entfällt). Antippen verdeckt eine Zone, noch einmal Antippen gibt sie frei (z. B. Fenster: alles außer dem Kopf antippen).
  - **Regeln** ([§ 4.7](#47-schadensablauf)): Jede Rumpfzone (Brust, Bauch, Unterleib) zählt für sich (R31, entschieden). Ein Treffer nach der Ansage „Rumpf“ gilt als verdeckt, wenn alle drei verdeckt sind (R32, vorläufig). Arme sind nur verdeckt, wenn sie angetippt sind; die Brust zieht sie nicht mit. Verdeckt eine Deckung von unten die Brust (Regelwerk), tippt der Spieler die Arme selbst an (Regelfrage R3).
  - Verdeckte Zonen sind schraffiert, auch auf der Figur im Reiter und im Dialog Getroffen. Der **Deckungswert** ist ein Zähler (− Zahl +); hinter der Zahl stehen in Klammern alle Deckungen aus `schutz.json` (Deckung und Fahrzeugpanzerung) mit genau diesem Wert, z. B. „2 (Autotür, dicke Holztür)“, ohne Zusatz in Klammern wie „(5 cm)“. Darunter klappt **Deckung auswählen** (Pfeil wie im Menü) die Liste der Deckungen auf; eine Wahl setzt den Zähler und klappt die Liste wieder zu. Ist eine Zone verdeckt, aber noch kein Wert gewählt, steht rot „Wähle einen Deckungswert oder eine Deckung aus.“ und Eintragen ist gesperrt. Die Übersicht einer verdeckten Zone nennt den Wert („Deckung: Autotür, Schutz 2“).
  - Die Deckung bleibt bestehen, bis der Spieler sie ändert, auch über Beginn und Ende eines Gefechts hinweg (18.11.2026). **Keine Deckung:** alle Zonen wieder freigeben und Eintragen (kein eigener Knopf, 18.11.2026).

### 3.10 Treffer, Wunden und Blutung (M, R)

**„Getroffen“** ist die eingehende Richtung des Treffer-Dialogs ([§ 3.7c](#37c-treffer-ausgehend-und-eingehend-m-r)). Der Knopf steht **immer** zur Verfügung: im Gefecht und in Ruhe an derselben Stelle neben der Figur. Zuerst die **Art**: Schuss · Nahkampf ([§ 3.8b](#38b-nahkampf-m-r), umgesetzt 18.11.2026) · Explosion ([§ 3.8a](#38a-werfen-a-m-r), eingehend, umgesetzt 18.11.2026) · Sonstiges. Für einen **Schuss** in der Reihenfolge, in der die SL ansagt:
1. **Geschoss** (zuerst, damit die Vorschau rechnen kann, [§ 3.0f](#30f-körperbild-silhouette-a-r)): Kaliber und Typ aus `munition.json` oder DK/MW direkt als zwei Zahlen. Schalter **stumpf** (Gummigeschoss, stumpfe Nahkampfwaffe, Körperwaffe, Druckwelle): keine DK, immer Wuchttreffer mit vollem Rüstungswert als Restschutz; Krit löst immer Stagger aus (Schaden, Blutung und Verletzungen, Stumpfe Treffer).
2. **Kugeln:** Standard 1, ± für Folgetreffer. **Krit:** Schalter.
   **Schrot** (Kaliber mit Schrotzahl, z. B. Buckshot; 18.11.2026): statt „Kugeln“ **Entfernung zum Schützen** (nur Bänder mit Schrotzahl) und **Treffer (mit Folgetreffern)**. Die gewählte Zone ist die der ersten Kugel (Ansage Rumpf: ab Brust); jede weitere trifft die nächstniedrigere Zonennummer, jeder Folgetreffer bringt die Schrotzahl noch einmal in dieselben Zonen. Kugeln einer Zone sind ein Treffer; nur die erste Kugel kann critten. Die Figur zeigt je getroffener Zone die Zahl der Kugeln („2×“) und färbt nur diese Zonen.
3. **Zone:** auf der Silhouette mit Vorschau antippen oder W8-Zahl eingeben.

**Explosion** (umgesetzt 18.11.2026; Sprengwirkung, Splitter und Druckwelle): Sprengwaffe aus `wurf_und_sprengwaffen.json` (nur mit Splittern oder Druckwelle) und **Abstand zur Explosion** (Bänder der Waffe), oder Werte direkt (Splitter-DK, Splitter-MW, Splitterzahl, Druckwelle-MW; Druckwelle nur im Kern, sonst 0). Abschnitt **Wie stehst du?**: Stand (im Gefecht aus der Aktionsleiste, in Ruhe wählbar; im Liegen halbe Splitterzahl, abgerundet) und Schalter **Deine Deckung liegt zwischen dir und der Explosion** (vorbelegt an; Deckung zählt vom Explosionspunkt aus). Dann die Zone des ersten Splitters (antippen oder W8, keine Ansage); die Figur zeigt die Splitter je Zone wie bei Schrot. Splitter können nicht critten. Die Druckwelle trifft im Kern stumpf den Rumpf (verdeckter Rumpf: kein Schaden) und wirft Stehende und Hockende mit freiem Rumpf ins Liegen; im Gefecht setzt die App den Stand. Jeder Treffer ist eine eigene Wunde bzw. Prellung, mit Stagger je Treffer. Die Explosion setzt immer „beschossen“, auch ohne Treffer. Sonderwirkungen (Blendung, Rauch, Reizgas) stehen nur als Hinweis; einen Hohlladungsstrahl trägt der Spieler als Schuss ein.

Selbst ergänzt: Rüstung der Zone, aktuelle Deckung (nur wenn die Zone verdeckt ist, [§ 3.9](#39-schutz-a-m)), Symptome der Leiter für die Stagger-Prüfung. Der Spieler kann die Deckung für diesen Treffer ändern.

*Stand 18.11.2026:* Im Gefecht und in Ruhe gilt die Deckung auf der Figur ([§ 3.9](#39-schutz-a-m)); verdeckte Zonen sind auch im Dialog schraffiert, ein Hinweis nennt den Wert. Ändern geht über den Knopf Deckung, nicht im Dialog. Die Silhouette zeigt vorerst nur die Haltung „stehend“. Die Zone wird angetippt, als „Rumpf (Ansage)“ gewählt oder über den W8 bestimmt (Würfelstelle Trefferzone). **Getroffen** steht im Gefecht und in Ruhe neben der Figur. Der Bericht erzählt in ganzen Sätzen, was passiert ist (wie beim Schießen): was trifft und wo, was Deckung und Rüstung tun, welche Wunde oder Prellung bleibt, HP vorher und nachher, Stagger, Auslöser. Nach „Weiter“ meldet die App „Treffer eingetragen“ mit **Rückgängig**.

Dann folgt der **Bericht** ([§ 3.0c](#30c-bericht-was-ist-passiert-a)). „Weiter“ übernimmt:
- Wunde (Durchschlag) oder Prellung (Wuchttreffer) anlegen, HP abziehen ([§ 4.7](#47-schadensablauf)).
- Folgen der Zone als Hinweis (z. B. „Gegenstand fallen lassen“).
- Auslöser **getroffen**, **verletzt**, **Stagger** in der Rundenend-Checkliste anhaken.
- Banner bei Kampfunfähigkeit oder Tod.

**Schnellknopf** (nur im Gefecht, Ereignis neben der Figur): „Beschossen“ (nur Auslöser beschossen, ohne Treffer). Kein Bericht nötig, da nur ein Wert sich ändert; danach Meldung mit Rückgängig. Ein Nahkampfangriff auf den Charakter läuft immer über Getroffen → Nahkampf, auch wenn er abgewehrt wird; der Auslöser „im Nahkampf angegriffen“ wird dabei gesetzt.

**Sonstiges** (direkter Schaden): Schaden und Zone eingeben, Wunde oder Prellung wählen (z. B. Sturz, Falle). Ohne Schadensablauf; mit Bericht.

**Wundliste** (Übersicht der Zone auf der Figur; später auch im Verlauf): Zone, Schaden, kritisch, Blutungsstatus, versorgt (Druckverband / Tourniquet / Operation), Nachsorge-Ergebnis, Rest-Heildauer.

**Fristen nach dem Gefecht** ([§ 4.8](#48-blutung); Entscheidung 18.11.2026): Die App zählt keine Zeit. Jede blutende Wunde zeigt in der Übersicht ihrer Zone die Frist („blutet, Frist 10 Minuten“). Der Bericht „Gefecht beenden“ nennt alle Wunden, deren Frist jetzt beginnt. Außerhalb des Gefechts steht unter dem HP-Balken „Eine Wunde blutet …“; die Wunde ist auf der Figur rot. Sagt die SL, dass eine Frist abgelaufen ist, tippt der Spieler in der Übersicht der Zone **Frist abgelaufen**; der Bericht zeigt vorher halben Schaden (zählt zur Wunde) und HP bzw. Tod.

**Versorgen** (Knopf **Versorgen** bei der Wunde in der Übersicht der Zone, im Gefecht auch Main → Wunde versorgen). Ein Fenster mit Abschnitten:
1. **Welche Wunde?** (nur über Main): versorgbare eigene Wunden oder „eines Verbündeten“ (nur die eigene Probe, die Wunde führt der andere).
2. **Maßnahme:** nur die, die bei dieser Wunde wirken (normal: Druckverband; kritisch an Armen und Beinen: Tourniquet; kritisch am Rumpf: Druckverband verlängert die Frist einmal, Operation stoppt). Eine ausgeblutete, unversorgte Wunde lässt sich noch versorgen, damit sie heilt.
3. **Wer versorgt:** du selbst oder jemand anders (Entscheidung 18.11.2026). Selbst: Probe auf Erste Hilfe bzw. Operation; nach dem Gefecht ist der Druckverband ab Erste Hilfe 1 ohne Probe. Im Gefecht Mainaction mit Konzentration (Feldversorgung: leicht), gesperrt nach einer Breakaction. Jemand anders: Der Spieler tippt gelungen oder misslungen.
4. **Bericht**; eine misslungene Versorgung ändert nichts und darf wiederholt werden, solange die Frist läuft.

**Ballistischer Schild** (18.11.2026; Deckung und Rüstung, Ballistischer Schild): mitgeführte Deckung mit Wert 3 für Kopf, Rumpf und Arme, nur von vorn. Er zählt nur, solange er **in der Hand** ist. Im Gefecht: Main → „Schild aufnehmen“ bzw. „Schild ablegen“ (Mainaction; im selben Fenster „Fallen lassen“ ohne Aktion). Außerhalb des Gefechts im Dialog Deckung („Dein Schild ist in der Hand · abgelegt“). Solange er gehalten wird: kleines Schildzeichen neben der Figur, Deckungswert auf den Zonen (mit Deckung zusammen gilt je Zone der höhere Wert, R37), Bewegung höchstens Gehen (Rüstungsträger: Laufen), Schießen nur mit Waffen der erlaubten Art (Pistole) und mit 1 Malstep. Getroffen fragt „Der Angriff kommt von vorn“ bzw. bei einer Explosion „Dein Schild zeigt zur Explosion“ (vorbelegt an).

**Gefechtsprotokoll:** Jeder übernommene Treffer (und später jeder Schuss) wird mit Runde und Uhrzeit protokolliert. Jeder Eintrag lässt sich einzeln rückgängig machen; Wunde, HP und Auslöser werden dann zurückgesetzt (mit Bericht).

### 3.11 Zustände (A, M)
Adrenalin/Ruhepuls (über die Leiter), Adrenalinschock (mit 4-Stunden-Ruhe-Abhaken), Kampfunfähigkeit (automatisch aus HP und offenen kritischen Wunden), **Geblendet** (Rundenzähler ab der Detonation; setzt für den Charakter die Sichtstufe keine), **Gereizt** (Schalter „Du hast die Wolke verlassen“; endet am Ende der Runde nach dem Verlassen). Jeder aktive Zustand zeigt seine Wirkung als Kurztext und fließt mit seinen Malsteps in alle Rechner ein ([§ 4.5](#45-zustände)).

Umsetzung (19.11.2026, vorher Chips in der Kopfzeile): Aktive Zustände stehen im Reiter Figur rechts neben der Silhouette unter Stand und Bewegung, im selben Aussehen: kleine Beschriftung links, Feld mit Bildzeichen rechts (`zustand_bilder` in `darstellung.json`), Rand in der Zustandsfarbe lila. Geblendet: durchgestrichenes Auge mit der Zahl der verbleibenden Runden; Adrenalinschock: Herzschlag-Zacke (auch außerhalb des Gefechts); Reizgas: Wolke, beschriftet „in Reizgas“ bzw. „Gereizt“. Nur aktive Zustände erscheinen. Antippen zeigt die Wirkung (Geblendet: mit Knopf Beenden, falls die SL es früher beendet) bzw. öffnet das Fenster Reizgas.
- **Geblendet** entsteht über Getroffen → Explosion mit einer Blendgranate: Abstand wählen, Schalter „Du hast dich abgewendet“ (Reaktion gelungen). Bedrängt: Stagger und 2 Runden; nah: 1 Runde, wenn der Kopf vom Explosionspunkt aus frei ist (Deckung oder Schild, R38). Am Rundenende zählt die App herunter.
- **Reizgas** über Ereignis → Reizgas oder den Chip: Wer das Fenster öffnet, steht in der Wolke (19.11.2026: keine Auswahl „in der Wolke · außerhalb“ mehr). Schalter Gasmaske; ist Reizgas schon eingetragen, dazu der Schalter **Du hast die Wolke verlassen** (gereizt: endet am Rundenende; sonst fällt Reizgas weg); Grit-Probe zu Beginn des Zuges (misslungen → Gereizt). Am Rundenende erinnert der Bericht an die Probe; wer die Wolke verlassen hat, ist ab der nächsten Runde nicht mehr gereizt.
- **Von Hand** (18.11.2026): Im Fenster Ereignis, Abschnitt Zustand, stehen die Schalter **Du bist geblendet** (eingeschaltet 1 Runde; darunter Zähler „Noch n Runden“ mit − und +) und **Du bist gereizt** (gilt, bis der Spieler unter Reizgas einträgt, dass er die Wolke verlassen hat). Sie wirken sofort, das Fenster bleibt offen; Ausschalten nimmt den Zustand zurück.
- Beide gelten nur im Gefecht; außerhalb nennt der Bericht die Wirkung nur.

**Sichtstufe** (klar, eingeschränkt, schlecht, keine) ist kein Zustand, sondern eine Einstellung im Gefecht. Sie gilt für alle Proben, die Sicht brauchen (Wahrnehmung, Sehen), bis der Spieler sie ändert. Geblendet erzwingt „keine“.

### 3.12 Heilung (M, R)
- **Nacht Ruhe:** Prellungen zurück.
- **Ruhetag:** Erholungsprobe vorbereiten (Zielwert auf Grit mit Malsteps je unversorgter Wunde + Umstände, Stepshields aus Pflege), Ergebnis eintragen → HP. Alle versorgten Wunden zählen einen Tag herunter ([§ 4.9](#49-heilung)).

Umsetzung (18.11.2026): Knopf **Ruhe** (Mondsichel) im Reiter Figur neben „Gefecht starten“, nur außerhalb des Gefechts. Fenster mit **Du ruhst: eine Nacht · einen Ruhetag**.
- **Eine Nacht:** Prellungen zurück, Adrenalinschock vorbei.
- **Ein Ruhetag** schließt die Nacht davor ein. Abschnitt **Pflege durch einen Betreuer** (keine · misslungen · gelungen · Krit; der Betreuer würfelt auf ⬢ Erste Hilfe, bei einer offenen kritischen Wunde ⬢ Operation). Abschnitt **Erholungsprobe** auf ■ Grit mit 1 Malstep je unversorgter Wunde und den Stepshields der Pflege; schlechte Umstände als Steps der SL. Kampfunfähigkeit zählt nicht.
- **Bericht** vor dem Übernehmen: Prellungen, Schock, Probe, gewonnene HP (höchstens bis zum Grundwert), je Wunde „heilt einen Tag: noch n Ruhetage“, „verheilt und wird gestrichen“ oder „nicht versorgt, heilt nicht“, HP vorher → nachher.
- **Nachsorge:** Knopf bei der versorgten Wunde in der Übersicht der Zone (außerhalb des Gefechts, einmal je Wunde). Du selbst (Probe auf ⬢ Erste Hilfe, kritisch ⬢ Operation) oder jemand anders (Ausgang tippen). Bericht mit der neuen Heildauer. Die Übersicht der Zone zeigt bei jeder heilenden Wunde „heilt: noch n Ruhetage“.

### 3.13 Geld und Aufträge (M, R)
Regeln: Schulden, Coups und Verträge; Klassen (Gehalt).

**Kassenbuch.** Der Kontostand ist die Summe aller Buchungen; er wird nie direkt gesetzt. Jede Buchung hat Datum, Betrag (±), Art und Grund (Freitext). Arten: **Startgeld**, **Auftrag**, **Kauf**, **Verkauf**, **Rate** (Schuldenrückzahlung), **Korrektur** (nur im Schreibmodus, [§ 3.0a](#30a-modi-lesen-aufstieg-schreiben-m)). Das Kassenbuch steht im Reiter Verlauf; der Kontostand im Reiter Laden.

**Einnahmen** kommen nach der Erstellung nur aus **Aufträgen** (und aus Verkäufen eigener Ausrüstung). **Auftrag abschließen** (Menü):
1. Gehalt der aktuellen Klasse, wenn ein Vertrag besteht (vorbelegt, änderbar).
2. Weitere Einnahmen aus dem Auftrag (Betrag und Grund, optional; z. B. Prämie, Beute).
3. Schulden: Frist −1 Auftrag. Ist sie abgelaufen und die Restschuld nicht getilgt, zeigt die App eine Warnung („Frist abgelaufen – die SL entscheidet“).
4. Bericht, dann Buchung.

**Schulden** (falls bei der Erstellung gewählt): Restschuld (Betrag + 50 %), verbleibende Frist in Aufträgen, Gläubiger, Sicherheit. **Rate zahlen** bucht einen frei wählbaren Betrag ab und senkt die Restschuld. Bei Restschuld 0 sind die Schulden getilgt.

**Kauf und Verkauf** laufen über den Laden ([§ 3.14](#314-laden-kaufen-und-verkaufen-m-r)) und buchen automatisch.

### 3.14 Laden: Kaufen und Verkaufen (M, R)
Regeln: Schusswaffen (Begriffserklärung: Geldwertspanne, Vorratslevel; Zustand: Preis, Verhandeln); Stats, Skills und Perks (Skillproben: Beschaffen). Abgestimmt mit dem Nutzer am 19.11.2026; Regelfragen R18, R42–R45, R47, R48. Umgesetzt am 19.11.2026, auch in Schritt 7 der Erstellung ([§ 3.0](#30-charaktererstellung-m-r)).

**Ort.** Eigener **fünfter Reiter „Laden“** (Bildzeichen Einkaufstasche, dünne Linien wie die anderen), zwischen Ausrüstung und Verlauf. Im Gefecht sichtbar, Handeln gesperrt („Im Gefecht wird nicht gehandelt.“), der Kontostand bleibt lesbar. Bei der Erstellung ist derselbe Inhalt Schritt 7.

**Aufbau** (von oben nach unten):
- **Geld:** Kontostand groß, Schulden mit Restschuld und Frist. Das Kassenbuch bleibt im Verlauf. Geld steht nicht im Reiter Ausrüstung.
- Umschalter **Kaufen · Verkaufen**.
- **Kategorien als Karten** zum Auf- und Zuklappen wie im Reiter Verlauf: **Waffen · Munition · Magazine · Nahkampf · Sprengmittel · Rüstung · Aufsätze**. Magazine umfassen Standard-, erweiterte und Trommelmagazine sowie Schnelllader und Ladestreifen, jedes mit den Waffen, an die es passt (19.11.2026). Je Ware eine Zeile: Name, ein bis zwei Kernwerte, Vorratslevel, Geldwertspanne (bricht bei Platzmangel nach dem Strich um). Kernwerte (19.11.2026): Waffen Kategorie und Kaliber; Munition DK und MW; Magazine Schusszahl; Nahkampfwaffen DK und MW (stumpfe: „stumpf, MW“); Sprengmittel und Geschosse für Werfer Splitter (DK/MW), Druckwelle (MW), Strahl (DK/MW) bzw. Sonderwirkung (Blendung, Rauch, Reizgas). Oben zwei Schalter:
  - **„Nur, was zu meinen Waffen passt“** (an, wenn der Laden öffnet; 19.11.2026): Munition (Kaliber und Typ einer eigenen Waffe), Magazine, Aufsätze und Geschosse für Werfer nur für Waffen, die der Charakter hat oder im Korb kauft. Waffen, Handgranaten, Nahkampfwaffen und Rüstung immer. Ohne Schusswaffe sagt ein Hinweis, dass das Passende erscheint, sobald eine im Korb liegt.
  - „Nur, was ich bekomme“ (Vorratslevel der Klasse).
- **Korb:** feste Leiste unten im Daumenbereich („Korb · 3 Posten · 610–720 $“), erscheint, sobald etwas im Korb liegt; antippen öffnet das Fenster Korb. Der Korb bleibt beim Wechsel der Reiter erhalten, wird aber nicht gespeichert.

**Ware wählen.** Antippen klappt die Zeile auf (kein Fenster): **Zustand** A–D als Auswahlknöpfe („Zustand: gebraucht“) mit dem Preisrahmen seines Viertels; bei Verbrauchsware (Munition, Granaten, Geschosse) entfällt er, Rahmen ist die ganze Spanne (R43). Menge (Munition in Schuss, Schritte zu 10; sonst Stück). Knopf **In den Korb**. Zustand A–D gilt für alles Dauerhafte; außer bei Schusswaffen wirkt er nur auf den Preis (R42).

**Vorratslevel.** Ware bis zum Vorratslevel der Klasse ist frei kaufbar. Darüber ist sie ausgegraut mit „nur über ⬢ Beschaffen“. Mit Beschaffen öffnet Antippen die Probe (Probenrechner, 2 Malsteps je Stufe darüber, höchstens 2 Stufen). Gelingt sie, kommt die Ware mit dem Preis der SL in den Korb (Krit: Untergrenze der Spanne) und verhandelt nicht mit. Schalter „◆ Kontakte einsetzen“ (Vorratslevel der Ware −1), nur wer den Perk hat; die App zählt nicht, ob er im Auftrag schon benutzt wurde. Mehr als 2 Stufen über dem Vorratslevel: „nicht zu bekommen“. Misslingt Beschaffen, sagt die App: „Ein neuer Versuch ist frühestens im nächsten Auftrag möglich.“

**Korb und Kaufen.**
1. Aufgeklappt zeigt der Korb die Posten mit Zustand und Rahmen, je mit Entfernen.
2. **Verhandlung über den ganzen Korb** (R44): „Die Verhandlung: nicht verhandelt · gewonnen · verloren · unentschieden“, Schalter Krit; ein Knopf zeigt die Probe ■ Empathy + ⬢ Verhandeln (Würfelkomponente). Je Posten: gewonnen → Untergrenze des Viertels, verloren → Obergrenze, unentschieden oder nicht verhandelt → Mitte; Krit des Siegers: ein Viertel der Spanne weiter, höchstens bis zur Grenze der Spanne.
3. Feld **Preis der SL** für die Summe (vorbelegt mit dem errechneten Betrag, änderbar).
4. Hauptknopf **Kaufen**; reicht das Geld nicht, ist er gesperrt und nennt den Fehlbetrag.
5. **Bericht** (Posten, Summe, Kontostand vorher → nachher), dann eine Buchung „Kauf“ mit allen Posten im Grund.

**Wohin Gekauftes kommt.** Waffe mit Zustand, ihrem leeren Standardmagazin (gleicher Zustand) und Trageort „Rucksack“. Munition zur losen Munition (Kaliber und Typ). Magazine, Schnelllader und Ladestreifen leer zu den Magazinen des Charakters (auch ohne passende Waffe). Aufsatz zu den losen Aufsätzen. Granaten und Geschosse in den Vorrat. Rüstung, Schild, Nahkampfwaffen mit Zustand.

**Verkaufen.** Gleich gebaut: Karten mit der eigenen Ausrüstung, Antippen legt in den Verkaufskorb; der Zustand steht fest. Eine Waffe zählt ihre angebrachten Aufsätze mit, jeden nach seinem Zustand (R45), ebenso das eingesetzte Magazin (R48); Patronen darin bleiben als lose Munition beim Charakter. Magazine (auch Schnelllader und Ladestreifen), lose Munition, Granaten und Nahkampfwaffen lassen sich auch einzeln verkaufen, mit Menge. Verhandlung über den ganzen Korb mit vertauschten Rollen. Unbrauchbare Waffen: Preis der SL, höchstens die Untergrenze. Bericht, eine Buchung „Verkauf“, Gegenstände entfernt.

**Bei der Erstellung** (Schritt 7) bleibt der Korb bis „Abschließen“ änderbar und wird dann zusammen mit dem Startgeld gebucht.

**Schreibmodus** bleibt: Ausrüstung frei eintragen, ohne Geld.

## 4. Regelkern

Stand der Regeln: 16.11.2026. Werte mit *(v)* sind vorläufig und gehören in `regeln.json`. Maßgeblich ist das Regelwerk; dieser Abschnitt fasst nur zusammen, was die App rechnet.

### 4.1 Stats
- Stats: **Gruppe A** Twitch, Brawn, Agility, Grit · **Gruppe B** Control, Empathy, Intellect, Decision · **Gruppe C** Nerve.
- **Statwert = Rang + Abweichung.** Ränge: S 90, A 80, B 70, C 60, D 50, E 40, F 30. Abweichung −9 bis +9. Spanne damit 21–99, fest.

### 4.2 Steps und Zielwert
Probe: W100 (01–100). Gelungen, wenn Ergebnis ≤ Zielwert.

1. **Malsteps** sammeln: Lage + Leiter + Zustände.
2. **Abzug** = Skillstufe + Stepshields (Leiter, Zielen, Umstände …). Bei Skill 0 in einer Skillprobe stattdessen **+1 Malstep**.
3. **Netto-Malsteps** = max(0, Malsteps − Abzug). **Übrig** = max(0, Abzug − Malsteps).
4. **Netto ≥ 6:** keine Probe möglich, die Handlung misslingt.
5. **Zielwert** = Statwert × Faktor[Netto], einmal kaufmännisch gerundet (ab ,5 auf). Immer vom Statwert rechnen.

| Netto-Malsteps | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Abschlag auf die vorherige Stufe *(v)* | – | 15 % | 25 % | 35 % | 45 % | 55 % |
| Faktor | 1 | 0,85 | 0,638 | 0,415 | 0,228 | 0,103 |

Gerundet wird immer **zugunsten des Spielers** (Entscheidung R1, `docs/offen.md`): Die Faktoren aus den Abschlägen (0,6375 · 0,414375 · 0,22790625 · 0,1025578125) sind auf drei Stellen **aufgerundet** (`regeln.json`, `steps.faktoren`). So steht es auch im Regelwerk; mit 0,415 stimmen alle Prüfwerte (35 → 15 bei 3 Malsteps).

Prüfwerte: 79 → 67, 50, 33, 18, 8 · 54 → 46, 34, 22, 12, 6 · 35 → 30, 22, 15, 8, 4.

### 4.3 Krit
**Krit-Schwelle** = Zehnerstelle des Zielwerts + Übrig (aus [4.2](#42-steps-und-zielwert)), mindestens 0. Bei Zielwert 100 ist die Zehnerstelle 10.
Eine gelungene Probe mit Ergebnis ≤ Krit-Schwelle ist ein Krit.

### 4.4 Die Leiter
Stufen: Ruhepuls 3, 2, 1, **0**, Adrenalin 1, 2, 3, 4 (Over the Edge). Speichern als Ganzzahl −3 … +4.

| Stand | Gruppe A | Gruppe B | Symptome |
| --- | --- | --- | --- |
| Ruhepuls 1 | – | – | R1 |
| Ruhepuls 2 / 3 | 1 / 2 Malsteps | 1 / 2 Stepshields | R1, R2 |
| 0 | – | – | – |
| Adrenalin 1 | – | – | A1 |
| Adrenalin 2 / 3 | 1 / 2 Stepshields | 1 / 2 Malsteps | A1, A2 |
| Adrenalin 4 (Over the Edge) | 2 Malsteps | 2 Malsteps | nur die Verluste von A1, A2; genau eine Aktion pro Runde |

Nerve (Gruppe C) wird nie beeinflusst.

**Symptome** (Gewinn / Verlust):
- **A1:** Schmerz ignorieren (kein Stagger) / Keine Ansage einer Trefferzone.
- **A2:** Sprint (zweite Bewegung) / Tunnelblick (keine Antizipation; Breakaction nur gegen Gesehene).
- **R1** *(v)*: Ruhige Hand (Zielen als Mainaction, Stepshield schon für den nächsten Schuss dieser Runde) / Empfindlich (Stagger schon bei Schaden = Schmerzresistenz).
- **R2** *(v)*: Weitblick (Antizipationsinformation gilt eine Runde jünger) / Kein Hechten.

**Gefechtsbeginn** (Nerve-Probe, Pflicht):

| Ergebnis | normal | überrascht |
| --- | --- | --- |
| Krit | Ruhepuls 1 | 0 |
| gelungen | 0 | Adrenalin 1 |
| misslungen | Adrenalin 1 | Adrenalin 2 |

Überrascht: in Runde 1 je 1 Malstep auf Initiative und Breakaction (Perk Entschlossen: keiner).

**Rundenende:** Auslöser als Checkliste, jeder zählt höchstens einmal: beschossen, im Nahkampf angegriffen, getroffen, verletzt, Stagger, selbst auf jemanden geschossen, Verbündeter ausgeschaltet, sonstiges (SL).
- Mindestens ein Auslöser → +1 Stufe (max. +4).
- Vorher freiwillige Nerve-Probe, je Auslöser 1 Malstep: gelungen → bleibt; Krit → −1 Stufe; misslungen → +1.
- Wurde in dieser Runde gesenkt: kein Anstieg, keine Probe.

**Senken** (Mainaction, Nerve + Selbstbeherrschung): gelungen −1, Krit −2 (min. −3). **Verbündete verschieben** (Mainaction, Empathy + Führung): ±1, Krit ±2.

**Gefechtsende:** Leiter → 0. War Adrenalin 4 erreicht → Adrenalinschock.

### 4.5 Zustände
Malsteps aus Zuständen gelten für alle Proben; Skill und Stepshields helfen dagegen.

| Zustand | Auslöser | Wirkung | Ende |
| --- | --- | --- | --- |
| Adrenalin/Ruhepuls | Leiter ≠ 0 | [§ 4.4](#44-die-leiter) | Gefechtsende |
| Adrenalinschock | Adrenalin 4 im Gefecht erreicht; ab Gefechtsende | 3 Malsteps *(v)* auf alle Proben | 4 h ununterbrochene Ruhe |
| Kampfunfähigkeit | HP = 0 oder offene kritische Wunde mit Folge „kampfunfähig“ (bis sie geheilt ist, unabhängig von der Blutung) | im Gefecht: keine Aktionen; sonst: nur kriechend/gestützt, keine körperliche Anstrengung, übrige Proben 3 Malsteps *(v)*, mit Perk Durchbeißen 2; **nicht** auf die Erholungsprobe | HP ≥ 1 und keine kritische Wunde offen |
| Geblendet | Blendgranate (bedrängt 2 Runden, nah 1 Runde bei freiem Kopf; nicht bei gelungener Reaktion) | Sichtstufe keine; Antizipation nur über Gehör | Ende der letzten Runde |
| Gereizt | in der Reizgaswolke, Grit-Probe zu Beginn des Zuges misslungen (Gasmaske: keine Probe) | 2 Malsteps auf alle Proben | Ende der Runde nach Verlassen der Wolke |

Adrenalinschock mit Perk Eiserne Nerven: 2 Malsteps. Malsteps aus Geblendet (über die Sichtstufe) und Gereizt zählen zusammen.

### 4.6 Schießen

**Trefferwert:** Probe auf **Control** mit dem Waffenskill der Waffe ([4.2](#42-steps-und-zielwert)). Malsteps:
- Reichweitenband der Waffe (Tabelle der Waffe; „n/A“ = Schuss nicht möglich),
- Ansage: Rumpf 1, einzelne Zone 2 (Adrenalin 1+ und Sichtstufe keine: Ansage nicht möglich),
- Lage *(v)*: eigene Bewegung (Kriechen, Gehen 1; Laufen, Hechten 2; Rennen 4; Perk Feuer in Bewegung −1), Ziel bewegt sich (Laufen 1; Rennen, Hechten 2), Ziel im Nahkampf 1 (ersetzt den Wert für seine Bewegung, der höhere zählt), Stand des Ziels (Hocke 1, Liegen 2; nicht im Band bedrängt; von oben auf Liegende 0), Sichtstufe (0–3, nur die schlechteste), kleines Ziel (kopfgroß 2, handgroß 3). Bewegung zählt vom Beginn der Bewegung bis Rundenende; bei Sprint die schnellere; bewegt sich der Charakter und hechtet in derselben Runde, zählt das zuletzt Gewählte (Regelfrage R9); wechselt er danach in Hocke oder Liegen, sinkt die Bewegung auf Gehen bzw. Kriechen (Regelfrage R33),
- Leiter und Zustände auf Control.

Stepshields: Zielen (1; Atemkontrolle 2), Lage (Waffe aufgelegt 1, nur ohne eigene Bewegung; großes Ziel 1, nur Gegenstände), Aufsätze (Reflexvisier bedrängt/nah 1; Zielfernrohr ab weit 1, bedrängt 1 Malstep), Leiter, Perks.

Bänder: bedrängt (bis 2 m, Armeslänge), nah (3–15 m), mittel (16–30 m), weit (31–100 m), sehr weit (101–250 m), fern (251 m bis Maximum).

**Trefferzone:** W8 oder Ansage.

| W8 | Zone | Multiplikator | Normal | Krit |
| --- | --- | --- | --- | --- |
| 8 | Kopf | ×3 | Blutung | sofort Tod |
| 7 | Brust | ×2 | Blutung | sofort Tod |
| 6 | Bauch | ×2 | Blutung | kampfunfähig; verbluten in 1 min |
| 5 | Unterleib | ×2 | Blutung | kampfunfähig; verbluten in 1 min |
| – | Rumpf (nur Ansage) | ×2 | Blutung | kampfunfähig; verbluten in 1 min |
| 4 | R. Arm | ×1 | Blutung; Gegenstand fallen lassen | kampfunfähig; verbluten in 5 min |
| 3 | L. Arm | ×1 | Blutung; Gegenstand fallen lassen | kampfunfähig; verbluten in 5 min |
| 2 | R. Bein | ×1 | Blutung; Sturz im Lauf (laufend oder rennend: Stand Liegen ohne Aktion); humpeln | kampfunfähig; verbluten in 5 min |
| 1 | L. Bein | ×1 | Blutung; Sturz im Lauf (laufend oder rennend: Stand Liegen ohne Aktion); humpeln | kampfunfähig; verbluten in 5 min |

**Krit:** nur der erste Schuss.

**Ladehemmung:** steckt im Trefferwurf, einmal pro Feuerstoß. Rate = LH des Modus + Zuschlag nach Zustand und Zuverlässigkeit (+2 mit Trommelmagazin). Wurf > 100 − Rate → Ladehemmung (kein Schuss, kein Munitionsverbrauch, Waffe blockiert); Wurf 100 bei Rate > 0 → schwere Ladehemmung. Beheben (einfach): Main, Control + Waffenskill, Malsteps LH-Behebenmod. + Sichtstufe + Leiter.

**Ziel im Nahkampf:** Fehlschuss trifft einen zufälligen anderen Beteiligten (Zone W8, kein Krit, Folgetreffer ebenso).

**Schrotflinte (Buckshot):** Bei Treffer so viele Kugeln wie die Schrotzahl des Bands; erste Kugel Zone aus W8/Ansage (Ansage Rumpf: Brust), jede weitere die nächstniedrigere Zonennummer (nach 1 wieder 8). Kugeln einer Zone = ein Treffer (Schaden × Kugeln). Jeder Folgetreffer bringt die volle Schrotzahl erneut. Nur die erste Kugel kann critten.

**Folgeschüsse** (angesagt 2 bis Feuerrate des Modus): Bei misslungener Trefferprobe gehen alle ins Leere.
- **Haltezahl:** Wert auf **Brawn**, aber ohne Lage-Malsteps (keine Probe, kann nicht critten). Malsteps = Rückstoß des Modus + Leiter-Malsteps auf Brawn. Abzug = Skill Rückstoßkontrolle + Stepshields (Leiter auf Brawn; Rückstoß abfangen *(v)*: liegend 1, Zweibein aufgesetzt 1, Vordergriff 1, Kompensator 1). Skill 0 → +1 Malstep.
- **Burst:** Zahl der Bursts ansagen; Schüsse = Bursts × Burst-Länge; Rückstoß wie EF, kein Garbenfaktor.
  Netto ≥ 6 → Haltezahl 0. Sonst Haltezahl = Zehnerstelle des Werts + Übrig, höchstens 10.
- **Folgetreffer** = max(0, Haltezahl − Rückstoßwürfel W10, 0 = 10).
- **Kugeln:** Bei VA zählt jeder Folgetreffer so viele Kugeln wie der Garbenfaktor, sonst 1. Summe aller Kugeln der Folgetreffer ≤ angesagte Schüsse − 1.
- Folgetreffer treffen die Zone des ersten Schusses (Ausnahme: Perk Triple Tap). Jeder Folgetreffer ist ein Treffer im Schadensablauf mit Schaden × Kugeln; für den Stagger zählt der gesamte Schaden dieses Treffers.
- Verbraucht werden alle angesagten Schüsse.

### 4.7 Schadensablauf
1. **Deckung** (nur wenn die getroffene Zone verdeckt ist): DK < Deckungswert → gestoppt, kein Schaden. Sonst Rest-DK = DK − Deckungswert. Jede Rumpfzone zählt für sich (R31); die Ansage „Rumpf“ gilt als verdeckt, wenn alle Rumpfzonen verdeckt sind (R32). Verdeckt Deckung von unten die Brust, sind auch beide Arme verdeckt; bis Bauch oder Unterleib nicht. Seitliche Deckung verdeckt nur den Arm ihrer Seite (R3).
2. **Rüstung** der getroffenen Zone: Rest-DK ≥ Rüstung → **Durchschlag**, sonst **Wuchttreffer**. Nach der Ansage „Rumpf“ zählt die Rüstung am Rumpf; sie schützt Brust, Bauch und Unterleib immer gleich (R2).
3. **Durchschlag:** Schaden = MW × Multiplikator (× Kugeln). Folgen der Zone; bei Krit Spalte „Krit“. Erzeugt eine Wunde.
4. **Wuchttreffer:** Schaden = max(0, MW − (Rüstung − Rest-DK)) (× Kugeln). Keine Zonenfolgen, kein Krit. Erzeugt eine **Prellung**, keine Wunde.
5. **Stagger:** Schaden des Treffers > Schmerzresistenz (bei Symptom „Empfindlich“: ≥; bei „Schmerz ignorieren“: nie). Gilt für Durchschlag und Wuchttreffer. Wirkung: Konzentration unterbrochen, Breakaction dieser Runde verfällt.

**Stumpfe Treffer** (Körperwaffen, stumpfe Nahkampfwaffen, Gummigeschosse, Druckwelle): keine DK. Verdeckte Zone → kein Schaden. Sonst immer Wuchttreffer mit vollem Rüstungswert als Restschutz. Krit → immer Stagger.

**Splitter:** ohne Probe, kein Krit. Splitterzahl des Bands (liegend halbiert, abgerundet); W8 für den ersten, jeder weitere nächstniedrigere Zone; gleiche Zonen als ein Treffer. Deckung zählt vom Explosionspunkt aus. Druckwelle nur im Kern (bedrängt): stumpf auf den Rumpf, wirft Stehende und Hockende mit freiem Rumpf ins Liegen.
6. **HP:** 0 → kampfunfähig; ≤ −1 → tot.

### 4.8 Blutung
Im Gefecht keine Blutung. Fristen beginnen mit Gefechtsende.

| Wunde | Frist | Unversorgt bei Ablauf | Versorgung |
| --- | --- | --- | --- |
| normal | 10 min | halber Schaden der Wunde (aufgerundet), dann Ende; Schaden zählt zur Wunde | Druckverband (Erste Hilfe; nach dem Gefecht ab Skill 1 ohne Probe) |
| kritisch, Gliedmaßen | 5 min | Tod | Tourniquet (Erste Hilfe) |
| kritisch, Rumpf | 1 min | Tod | Druckverband verdoppelt die Frist einmal; stoppen nur durch Operation (Skill Operation) |

Versorgen ist eine Mainaction mit voller Konzentration (Perk Feldversorgung: leicht). Druckverband und Tourniquet: eine Mainaction; Operation: mehrere Runden, Dauer legt die SL fest (Notoperation: halbiert). Misslungene Proben dürfen wiederholt werden, solange die Frist läuft *(v)*.

### 4.9 Heilung
Nur an **Ruhetagen** (kein Gefecht, keine schwere Anstrengung).
- **Prellungen:** nach einer Nacht Ruhe vollständig zurück.
- **Erholungsprobe** (1× pro Ruhetag, Grit): Krit +2 HP, gelungen +1, misslungen +0 *(v)*. Höchstens bis HP-Höchstwert. Auch bei 0 HP. Malsteps: 1 je unversorgte Wunde + Umstände (Eingabe). Pflege durch Betreuer (Erste Hilfe; bei offener kritischer Wunde Operation): gelungen 1 Stepshield, Krit 2.
- **Wunden:** Heildauer = Schaden der Wunde; normal in Ruhetagen, kritisch in Wochen aus Ruhetagen (= Schaden × 7 Ruhetage). Nur versorgte Wunden heilen. Nachsorge-Probe (einmal je Wunde; Erste Hilfe, kritisch Operation): Krit → Heildauer halbiert (aufgerundet); gelungen → unverändert; misslungen oder keine → ×2. Mehrere Wunden heilen gleichzeitig. Offene Wunden behalten andauernde Zonenfolgen (humpeln). Eine geheilte Wunde wird gestrichen; HP kommen **nicht** mit der Wunde zurück.

### 4.10 Grundwerte
| Grundwert | Start | Perks (je +1) |
| --- | --- | --- |
| HP | 8 | Zäh I, Zäh II |
| Schmerzresistenz | 1 | Schmerzunempfindlich I, II |
| Nahkampfschaden | 1 | Schlagkraft I, II |
| Wurfweite | genau auf „nah“ | Wurfarm I, II (je +1 Band) |

Perk I: Rang 1, Stat ≥ 50. Perk II: Rang 2, Stat ≥ 70 und Perk I *(v)*. Stat: Brawn, bei Schmerzunempfindlich Grit.

**Perks allgemein:** Rang = Kosten in freien Punkten. Perks haben keine Stufen; abgestufte Wirkung entsteht durch eigenständige Perks. Voraussetzungen: Mindest-Statwert und/oder ein anderer Perk.

### 4.11 Charaktererstellung und Aufstieg
- **Rank-Set:** 9 Ränge je Stufe der Klasse, frei auf die 9 Stats verteilt. Lehrling: F, F, E, E, E, E, D, D, C.
- **Abweichung:** je Stat zwei W10, vorher als Positiv- und Negativwürfel festgelegt. Abweichung = Positiv − Negativ (−9 … +9; Würfel 0 zählt als 10).
- **Freie Punkte:** bei der Erstellung laut Klasse (derzeit alle 5); im Spiel 5 pro Session. Nicht ausgegebene Punkte bleiben.
- **Kosten:**
  - Skill-Level: 1 Punkt je Level, höchstens 5.
  - Statrank-Up: 1 Punkt, +1 Rang (nicht über S), Abweichung neu würfeln. Der Statwert kann sinken; der Rang steigt trotzdem.
  - Perk: Punkte = Rang; einmal erworben, keine Stufen.
- **Zugang:** Steigern und kaufen nur, was die **aktuelle Klasse** anbietet; das gilt auch für weitere Level eines vorhandenen Skills. Aufgelöst wird er aus `klassen.json` ([datenformat.md § klassen.json](datenformat.md#klassenjson)):
  1. Aktuelle Klasse = letzter Eintrag im Klassenweg. Ohne Klasse: alles zugänglich.
  2. Listen der Klasse auflösen (IDs und Gruppen), dann rekursiv die Klasse aus `wie` dazunehmen.
  3. Exklusive Skills und Perks dazunehmen, deren Feld `exklusiv` die Klasse oder eine Klasse aus der `wie`-Kette nennt.
  4. Zweite Spezialisierung: Vereinigung der Zugänge beider Spezialisierungen.
  5. Meister (`laufbahn_gesamt`): Vereinigung der Zugänge aller Klassen der Laufbahn.
- **Besitz:** Skills und Perks gehören dem Charakter. Ein Klassenwechsel ändert sie nicht. Skills außerhalb des Zugangs sind **eingefroren**: Sie wirken, steigen aber nicht. Perks haben keine Stufen und wirken immer.
- **Klassenwechsel:** Ränge des Charakters und Rank-Set der neuen Klasse jeweils absteigend sortieren; jeder Rang des Charakters muss ≥ dem Rang an gleicher Stelle sein. Verglichen werden Ränge, nicht Statwerte. Dazu Mindestskills, Stat auf Rang A, Weg und Freigabe der SL ([§ 3.0d](#30d-klassenwechsel-m)). Der Wechsel gibt keine Punkte.
- **Ränge sinken nie.**
- **Grundwerte** sind fest und steigen nur über Perks ([§ 4.10](#410-grundwerte)).

### 4.12 Aktionen
**Runde** ≈ 3 Sekunden *(v)*. Je Zug einmal: **Mainaction**, **Bewegung**, **Standwechsel**; sie verbrauchen sich nicht gegenseitig. Je Runde einmal: **Breakaction**. Standwechsel ist auch als Breakaction möglich und verbraucht dann diese. Hechten ist Main- oder Breakaction und keine Bewegung. Schießen ist eine Breakaction. Over the Edge: genau eine der vier Aktionen pro Runde. Kampfunfähig: keine.

**Initiative:** zu Beginn jeder Runde Decision ohne Skill (kein Malstep für Skill 0). Reihenfolge: Krits vor Erfolgen vor Misserfolgen; Krits und Erfolge: höherer Wurf zuerst; Misserfolge: höherer Zielwert zuerst; Gleichstand: Spielercharaktere vor NSC, sonst W10. Kein Zurückstellen. Krit: eine zusätzliche Breakaction in dieser Runde *(v)*.

**Breakaction im fremden Zug:** Voraussetzung: den aktiven Akteur wahrnehmen oder antizipieren, Breakaction noch vorhanden. Im Unterbrechungsmoment sagen alle vor dem Wurf an (Unterbrecher, der aktive Akteur zur Verteidigung, seine Verbündeten). Jeder würfelt Reaktion (Twitch + Reflexe; gesehen 0, nur gehört 1 Malstep, dazu Sichtstufe) oder Antizipation (Intellect + Lagegespür; Malsteps nach Güte und Alter der Information *(v)*). Rangfolge wie beim Contested Roll; Gleichauf und alle Misserfolge handeln gleichzeitig; wer durch eine frühere Breakaction einen Stagger erleidet, verliert seine. Keine Krit-Folge. Lässt der aktive Akteur die Unterbrechung zu und spielt die Reihenfolge keine Rolle: kein Wurf. Im eigenen Zug: ohne Probe.

**Contested Roll:** Jeder würfelt seine eigene Probe. Krit > Erfolg > Misserfolg; gleiche Stufe: höherer Wurf gewinnt; beide misslungen oder gleiche Stufe und gleicher Wurf: Unentschieden. Nur der Krit des Siegers wirkt. Die SL nennt Stufe und Wurf des Gegners.

**Nahkampf:** Angriff = Mainaction (mit kurzer Waffe gegen Armeslänge oder als Abfangen mit langer Waffe auch Breakaction). Contested Roll Agility + Nahkampf; Verteidigung kostet keine Aktion, braucht Wahrnehmung des Angreifers und unterbricht Konzentration. Angreifer gewinnt → Treffer; sonst kein Treffer. Je weitere Verteidigung in der Runde +1 Malstep. Lange Waffe gegen Ziel in Armeslänge: 1 Malstep. **Stand:** Liegen schlägt Stehen, Stehen schlägt Hocke, Hocke schlägt Liegen; überlegener Stand gibt dem Gegner 1 Malstep; Sieg mit überlegenem Stand löst die Wirkung eines passenden Kampfkunst-Perks aus (höchstens eine). Treffer: Zone wie beim Schießen, MW = Nahkampfschaden + MW der Waffe, dann Schadensablauf.

**Werfen:** Mainaction (Break mit Quickthrow), Agility + Wurfwaffen/Granaten. Malsteps: Wurfweite (bis zur genauen Wurfweite 0, ein Band darüber 2, weiter unmöglich) + Wurf-Reichweite der Waffe (Malsteps je Band aus `nahkampfwaffen.json`, `null` = nicht werfbar; Granaten: keine) + Lage (ohne „aufgelegt“) + Leiter auf Agility. Jede Nahkampfwaffe ist werfbar, soweit ihre Wurf-Reichweite es zulässt. Wurfwaffe wie ein Schuss; Sprengwaffe: Landepunkt (Krit genau, Erfolg bedrängt, Misserfolg nah in Richtung W8). Kochen lassen: 1 Malstep, Verzögerung −1.

**Konzentration:** nur ohne zuvor eingesetzte Breakaction; danach keine Breakaction in dieser Runde; leicht: Bewegung höchstens Gehen; voll: keine Bewegung, kein Standwechsel. Kann mehrere Runden dauern (Probe in der letzten). Stagger, Nahkampfverteidigung und Verstoß gegen die Beschränkung unterbrechen; die Aktion ist dann wirkungslos. Liste in `regeln.json`.

**Krit-Folgen im Kampf:** Tabelle in `regeln.json` (`krit_folgen`); Proben ohne Eintrag haben keine.

## 5. Umsetzungsreihenfolge

1. Grundgerüst: Svelte/Vite-Projekt, GitHub Action (Tests, Build, Pages), PWA (Manifest, Service Worker, Offline-Test), Laden der JSON-Daten mit Datenprüfung ([§ 2, Leitlinie 9](#leitlinien-für-die-umsetzung)), Charaktere speichern/exportieren/importieren, Würfeleingabe-Komponente.
2. Regelfunktionen mit Unit-Tests ([§ 4.2](#42-steps-und-zielwert)–[4.7](#47-schadensablauf), [4.11](#411-charaktererstellung-und-aufstieg)).
3. Charaktererstellung ([§ 3.0](#30-charaktererstellung-m-r)) und Modi ([§ 3.0a](#30a-modi-lesen-aufstieg-schreiben-m)).
4. Bogen: Stammdaten, Stats mit Step-Reihe, Grundwerte, Skills, Perks.
5. Probenrechner und Leiter.
6. Aktionsleiste, Waffen und Schussrechner, Munition.
7. Treffer eintragen, Wunden, Blutungsfristen, Zustände.
8. Heilung und Aufstieg.
9. Feinschliff für den Spieltisch (große Tippflächen, Dunkelmodus, schnelle Wege zu Probenrechner und Leiter).

## 6. Offene Fragen

**Entschieden (13.11.2026):**
- Keine SL-Ansicht; die App ist nur für Spieler.
- Kein allgemeiner Würfler; er soll später einfach nachrüstbar sein. Ausnahme: Die Abweichung würfelt die App von Anfang an selbst ([§ 2, Leitlinie 6](#leitlinien-für-die-umsetzung)).
- Ränge verteilt der Spieler selbst: mit Klasse aus deren Rank-Set (tauschbar), ohne Klasse frei von Hand. Einen Verteilungsvorschlag der Klasse gibt es nicht (16.11.2026, [§ 3.0](#30-charaktererstellung-m-r)).
- Drei Modi: Lesen, Aufstieg, Schreiben ([§ 3.0a](#30a-modi-lesen-aufstieg-schreiben-m)).
- Charaktere werden in der App erstellt ([§ 3.0](#30-charaktererstellung-m-r)).
- Neue Klassen werden als Einträge in `klassen.json` ergänzt.
- Geld als Kassenbuch; Schulden, Coup und Vertrag nur bei der Erstellung; Einnahmen danach über Aufträge (16.11.2026, [§ 3.13](#313-geld-und-aufträge-m-r)).
- Mehrere Charaktere auf einem Gerät; Start ohne Charakter mit „Erstellen“ oder „Importieren“; Menü ☰ für Charaktere, Modi und Abschlüsse (16.11.2026, [§ 3.0g](#30g-start-charaktere-und-menü-m)).
- Herkunftsmarkierung mit Aufschlüsselung; Zeichen änderbar ([§ 3.0b](#30b-herkunft-von-werten-a-r)).
- Schreibmodus mit Anpassungen für Sonderregeln der SL ([§ 3.0a](#30a-modi-lesen-aufstieg-schreiben-m)).
- Technik: Svelte 5 mit Vite und TypeScript, weil der Bogen viele voneinander abhängige Werte hat und Regeln und Werte sich noch ändern. Der Nutzer programmiert nicht; Build per GitHub Action (16.11.2026, [§ 2](#2-plattform-und-rahmen)).
- Skills und Perks gehören dem Charakter und bleiben bei jedem Klassenwechsel erhalten; die aktuelle Klasse bestimmt nur, was gesteigert und gekauft werden kann. Skills außerhalb des Zugangs sind eingefroren (16.11.2026, [§ 3.0d](#30d-klassenwechsel-m)).

**Offen** (vor oder während der Entwicklung mit dem Nutzer klären):

1. **Technik:** entschieden (16.11.2026): Svelte 5 mit Vite und TypeScript, Build und Veröffentlichung per GitHub Action ([§ 2](#2-plattform-und-rahmen)).
2. **Lage-Malsteps:** entschieden (16.11.2026): Lage-Auswahl mit drei Blöcken (automatisch, Ziel und Schütze, SL) ([§ 3.8c](#38c-lage-auswahl-r)).
3. **Initiative:** entschieden (16.11.2026): Knopf „Nächste Runde“ führt zu Rundenende und Initiative; die App zeigt Stufe und Wurf zum Ansagen, die SL ordnet ([§ 3.7b](#37b-initiative-und-breakaction-m-r)).
4. **Contested Rolls, Breakaction, Nahkampf:** entschieden (16.11.2026). Breakaction: ohne Probe, Reaktion oder Antizipation ([§ 3.7b](#37b-initiative-und-breakaction-m-r)). Nahkampf: ausgehend über den Aktionsknopf, eingehend über Getroffen; die App zeigt Stufe und Wurf zum Ansagen, die SL vergleicht, der Spieler tippt den Ausgang ([§ 3.7c](#37c-treffer-ausgehend-und-eingehend-m-r), [§ 3.8b](#38b-nahkampf-m-r)).
7. **Tisch-Modus** (später, nicht Teil der ersten Fassung): Geräte am Tisch verbinden für eine gemeinsame Zugreihenfolge. Bräuchte eine Verbindung zwischen den Geräten und eine Ansicht für die SL; widerspricht dem Grundsatz „offline, kein Server“. Würfe und Ergebnisse liegen deshalb schon jetzt als Daten im Gefechtsprotokoll vor.
5. **Ladehemmung:** Regel steht und ist im Konzept beschrieben ([§ 4.6](#46-schießen), `regeln.json` `ladehemmung`).
6. **Klassen:** Regel steht für alle Stufen (Klassen; Charakteraufstieg, Klassenwechsel). Datenformat mit Zugang, Klassenweg und eingefrorenen Skills: [datenformat.md § klassen.json](datenformat.md#klassenjson); Ablauf: [§ 3.0d](#30d-klassenwechsel-m). Fehlen bei einer Klasse Angaben, lässt die Erstellung alle Skills und Perks zu und das Vorratslevel frei wählen.
