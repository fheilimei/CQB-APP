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
- **Würfeln je Wurf umschalten ist lästig** (17.11.2026): Braucht ein Ablauf mehrere Würfe, gibt es **einen** Umschalter „App würfelt · von Hand“ für alle. „App würfelt“ würfelt alle Werte auf einmal (Hülle `Wuerfelbereich.svelte`).
- **Konsistenz** (17.11.2026): Eine Verbesserung an einem Bildschirm wird auf alle gleichartigen Bildschirme übertragen, nicht nur auf den genannten.
- **Wichtige Werte müssen beim Scrollen sichtbar bleiben** (17.11.2026): Zielwert, Krit-Schwelle, Malsteps und Stepshields stehen im festen Kopf des Dialogs (`dialogkopf.ts`). Gilt sinngemäß für andere Werte, auf die sich die Auswahl weiter unten auswirkt.
- **Nichts anzeigen, was im gewählten Modus nicht gebraucht wird** (17.11.2026): z. B. keine Knöpfe Krit · gelungen · misslungen, wenn die App würfelt.
- **Zusammengehöriges in eine Zeile, Arten von Werten unterscheidbar** (17.11.2026, Stats im Reiter Werte): Hauptwert direkt neben dem Namen, Folgewerte (Steps) in derselben Zeile in fester Reihenfolge. Eine Eigenschaft wie der Rang sieht anders aus als Zahlenwerte (kleine Marke) und schwebt nicht über anderen Werten.
- **Kein unnötiger Platz in festen Leisten am unteren Rand** (18.11.2026, Adrenalin-Rad): flach halten; was der Daumen beim Bedienen verdecken würde, klappt beim Halten nach oben auf.
- **Aufklappen muss erkennbar sein** (18.11.2026, Menü): Was etwas aufklappt, trägt einen Pfeil wie ein Ordner (› zu, nach unten gedreht offen), nicht ⋯. **Überall derselbe Pfeil** (18.11.2026, Reiterleiste): gemeinsame Klasse `.klapppfeil` aus `app.css` als letztes Kind des Knopfs bzw. `<summary>`; der Zustand kommt aus `aria-expanded` bzw. `details[open]`. Keine anderen Pfeile (◂ ▸ ⋯) und keine eigenen Pfeilstile. Nebenhandlungen einer Liste (Neu, Importieren) stehen als kleine Knöpfe in der Überschriftzeile statt als eigener Block.
- **Keine großen gefüllten Knöpfe für seltene Handlungen** (18.11.2026, Gefecht starten): Start und Ende eines Zustands stehen an derselben Stelle (seit 18.11.2026 unter der Figur im Reiter Figur, mit kleinem Zeichen: ▶ starten, Stopp beenden, Weiter nächste Runde; Rad und Aktionsleiste nur im Reiter Figur). Hervorheben lieber mit Akzentrahmen (`button.betont`) als mit gefüllter Fläche. Keine doppelten Wege (Knopf Probe auf Figur entfiel, Proben laufen über den Reiter Werte).
- **Nichts doppelt anzeigen, Zustände über Rahmen statt Schriftzug** (18.11.2026, Kopfzeile): Adrenalin steht nur am Rad, nicht zusätzlich oben. Gefecht erkennt man am Akzentrand von Kopfzeile und unterer Leiste; in der oberen Linie steht klein „IM GEFECHT“ in der Zahlenschrift, links auf Höhe der Figur (19.11.2026), kein größerer Schriftzug. Schwebende Knöpfe dürfen nie über festen Leisten liegen; lieber eine schmale Lasche im freien Rand.
- **Reiter als Bildzeichen am rechten Rand** (18.11.2026): senkrechte Leiste unten rechts statt Leiste mit Text am unteren Rand; Zeichen: Silhouette, Tabelle, Rucksack, aufgeschlagenes Buch. Schwebt über dem Inhalt (kein Platz rechts freihalten). Einklappbar zu einer Lasche. Die Lasche darf nicht zu klein sein (sichtbar 32 × 52 px: lieber breiter als hoch, darf in den Inhalt ragen). Leiste und Lasche lassen sich senkrecht am Rand verschieben und teilen sich die Stelle; die Leiste geht auf Höhe der Lasche auf (18.11.2026).
- **Farben müssen in hell und dunkel erkennbar sein** (18.11.2026): Over the Edge war fast schwarz und auf dunklem Grund unsichtbar; Farben aus `darstellung.json` nie so dunkel wählen.
- **Nichts zum Wischen am unteren Bildschirmrand** (18.11.2026, Adrenalin-Rad): Android fängt waagerechtes Wischen dort als App-Wechsel ab. Ganz unten nur Knöpfe zum Antippen; darunter `env(safe-area-inset-bottom)` freihalten.
- **Vollfarbe nur für Weiter und Ausführen** (18.11.2026): Gefüllt (`button.haupt`) ist nur der Knopf, der einen Schritt bestätigt oder eine Handlung ausführt (Weiter, Ausführen, Eintragen, Hinzufügen, Steigern, Anlegen). Schließen, Fertig, Knöpfe, die etwas öffnen (Probe auf, Statrank-Up), und Würfeln sind `button.betont` oder normal. Auch Leisten und Banner sind nicht vollfarbig; Zustände zeigen Rahmen, Streifen oder Tönung (Beispiel: Adrenalinrad mit Skala und farbigem Rahmen in der Mitte).
- **Gleicher Knopf, gleiche Stelle** (18.11.2026, Getroffen): Ein Knopf, den es im Gefecht und in Ruhe gibt, steht in beiden an derselben Stelle (Getroffen und Deckung neben der Figur, nicht in der Aktionsleiste; Deckung auch in Ruhe).
- **Einzelheiten beim Antippen statt eigener Liste** (18.11.2026, Wunden): Was zu einer Stelle der Figur gehört, erscheint beim Antippen dieser Stelle, nicht in einer zusätzlichen Liste darunter.
- **Berichte als kleine Erzählung** (18.11.2026): Der Bericht nach einem Ablauf erzählt in ganzen Sätzen, was passiert ist („Ein Schuss trifft dich an der Brust. Er durchschlägt deine Rüstung …“), nicht als Stichpunkte mit Doppelpunkt.
- **Bildzeichen statt Text für Zustände an der Figur** (18.11.2026): Stand und Bewegung als Piktogramme oben rechts neben der Silhouette, wenig Text. Kein Bodenstrich unter den Strichmännchen (unnötige Linie).
- **Berichte ohne Formularsprache** (18.11.2026, Getroffen): nicht „Für das Rundenende ist angehakt: …“, sondern „Für das Rundenende: Du wurdest beschossen und getroffen.“ Folgen als Sätze („Die Wunde blutet.“, „Du kannst nur noch humpeln.“), nicht „Folge: …“. Was die App weiß (z. B. eigene Bewegung), steht als Tatsache im Satz („Du stürzt, weil du im Lauf getroffen wurdest.“).
- **Jede Aktion über ihren eigenen Knopf** (18.11.2026, Standwechsel): Was eine Breakaction kostet, läuft über den Knopf Break (dort wählt man Reaktion oder Antizipation), nie still über einen anderen Knopf. Ist ein Zähler leer, ist sein Knopf grau und der Hinweis sagt, wo es weitergeht.
- **Andersartiges sichtbar absetzen, Voraussetzung vor Wahl** (18.11.2026, Break): Break steht ganz rechts in der Aktionsleiste, durch eine dünne Linie von Main · Bewegung · Stand getrennt. Der Break-Dialog klärt zuerst eigener oder fremder Zug (dort die Probe) und zeigt erst nach Weiter in einem zweiten Fenster die Aktionen.
- **Lange Auswahllisten zuklappen, Zähler vorn** (18.11.2026, Deckung): Eine Liste fester Werte steht zugeklappt hinter einem Knopf mit Pfeil wie im Menü („Deckung auswählen ›“). Darüber der Zähler; hinter der Zahl in Klammern, wozu der Wert passt („2 (Autotür, dicke Holztür)“).
- **Nur das Nötigste im Dialog Deckung** (18.11.2026): Deckung entsteht nur durch Antippen der Zonen, keine Deckungskante, kein Knopf „Keine Deckung“ (alle Zonen freigeben genügt). Fehlt der Wert: „Wähle einen Deckungswert oder eine Deckung aus.“
- **Figur links, Knöpfe rechts daneben** (18.11.2026, Reiter Figur): Silhouette nicht mittig, sondern links; rechts eine Spalte mit Stand über Bewegung (untereinander) oben und Deckung über Getroffen (gleich breit) unten. Beide auch in Ruhe an derselben Stelle (auch außerhalb des Gefechts kann man in Deckung sein; der Dialog Getroffen braucht das).
- **Schriften** (18.11.2026): Text IBM Plex Mono, Zahlen Share Tech Mono, Überschriften/Ansagen/Hauptknöpfe Saira Stencil One (Großbuchstaben). Nur über die Variablen `--schrift-text`, `--schrift-zahl`, `--schrift-titel` aus `app.css`, nie Schriftnamen in Komponenten. Neue Werte-Anzeigen bekommen die Klasse `.zahl`. Schablonenschrift nie für kleine Knöpfe oder Fließtext.
- **Vorerst nichts fett** (18.11.2026): Text, Überschriften, Werte und Knöpfe alle in normaler Stärke. Was fett sein soll, sagt der Nutzer einzeln; nicht eigenmächtig Fettschrift einsetzen. Hervorhebung über Rahmen, Fläche, Größe oder Zeichen.
- **Knöpfe neben der Figur** (18.11.2026): HP-Balken rechts neben der HP-Zahl. Deckung und Getroffen mit kleinem Bildzeichen (Mauer, Einschlag), ohne Akzentrahmen und in der Textschrift wie Nächste Runde und Gefecht beenden.
- **Knöpfe, die nur einen Dialog öffnen, zeigen keinen Zustand** (18.11.2026, Getroffen/Deckung): Ein Akzentrahmen sieht aus wie „aktiv“. Der Zustand gehört an die Stelle, die ihn darstellt (Deckungswert mit Mauerzeichen auf der Schraffur der Figur). Keine Zusatzzeilen unter Knöpfen, wenn die Information schon woanders steht (Stand/Bewegung unter den Aktionsknöpfen entfielen); Beschriftung mittig.
- **Ein Stil für Bildzeichen** (18.11.2026): einfarbig in Textfarbe (`currentColor`), dünne Linien (etwa 1,5 px) bzw. kleine gefüllte Formen, wie Mauer und Einschlag auf Deckung/Getroffen. Keine dicken Striche, keine Akzentfarbe für Zeichen. Stufen als Formen statt Text (Konzentration: halber/voller Kreis).
- **Gleiche Info, gleiche Form** (18.11.2026, Getroffen → Nahkampf): Der Standvorteil steht in allen drei Fällen (du, Gegner, keiner) als kleine Ansage mit Hinweis darunter. Lange Wörter in gleich breiten Knöpfen werden getrennt statt über den Rand zu ragen. Im Bericht handelt der Gegner mit Verb („Der Gegner wirft dich um“), nicht „wirkt Umreißen“.
- **Listen nur mit dem, was man beim Überfliegen braucht** (18.11.2026, Stats im Reiter Werte): Der Rank steht erst im aufgeklappten Stat. Spaltennenner einer Tabelle stehen in derselben Zeile wie die Überschrift (keine Lücke vor dem Strich). Gruppenüberschriften sagen, was die Gruppe für den Spieler bedeutet („▲ Adrenalin · ▼ Ruhepuls“, „Zum Ruhigbleiben“), nicht „Gruppe A“.
- **Abschnitte nach Begriffsart** (18.11.2026, Reiter Werte): Zeichen ■ ⬢ ◆ nur in der Überschrift des Abschnitts, nicht an jedem Eintrag; Rahmen des Abschnitts in derselben Farbe (`.karte.typrahmen` mit `--typfarbe`). Skills: Stufe ganz links, dahinter der Gürtelgrad (`Guertel.svelte`: Streifen je Stufe, höchste Stufe gefüllt; Streifen statt Gürtelfarben, weil Farben schon belegt sind), dann der Name.
- **Farben der Begriffsarten überall** (18.11.2026): ■ grün, ⬢ lila, ◆ rosa. Jedes dieser Zeichen erscheint in seiner Farbe, auch in Text aus `mitZeichen` (dort über `Farbtext.svelte`; Bericht färbt automatisch). Blau ist Ruhepuls, Rot Adrenalin; keine Begriffsart darf diese Farben bekommen.
- **Adrenalin rot, Ruhepuls blau** (18.11.2026): Jeder Pfeil ▲ ▼, der aus Adrenalin oder Ruhepuls stammt, trägt diese Farbe (`leiter_pfeile`, Komponente `Steps.svelte`, Klasse `.leiterpfeil`). Kein + oder − dafür.
- **Silhouette nur mit W8-Zahl** (18.11.2026): Zonen zeigen statt Namen ihre W8-Zahl, umrandet (`.zonenzahl` in `app.css`, in der Figur gleich gezeichnet), damit sie nicht mit Rüstung ⛨ oder Deckung (Mauer) verwechselt wird. Die Übersicht beim Antippen nennt Zahl und ausgeschriebenen Namen („Rechter Arm“, Feld `titel`) und zeigt Rüstung und Deckung mit ihren Zeichen.
- **Rückmeldung nur, solange sie stimmt** (18.11.2026, Reiterleiste): Der Akzentrahmen beim Verschieben verschwindet beim Loslassen.
- **Nicht nach dem Offensichtlichen fragen** (19.11.2026, Reizgas): Wer ein Fenster für eine Lage öffnet, steckt in dieser Lage (Reizgas → in der Wolke). Eine Gegenfrage („außerhalb“) nur dort, wo sie etwas ändert, und erst, wenn der Zustand schon besteht.
- **Nichts ragt über den Rand** (19.11.2026, Laden): Zahlenspannen („1.125–1.500 $“) dürfen nach dem Strich umbrechen; nie langen Zahlentext ohne Umbruch in eine schmale Spalte oder einen gleich breiten Knopf setzen.
- **Waren mit ihren Kernwerten** (19.11.2026, Laden): Alles, was Schaden macht (Munition, Nahkampfwaffen, Sprengmittel, Werfergeschosse), nennt DK und MW in der Zeile.
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
- Vorhandene gemeinsame Bausteine in `src/app.css`: `.abschnitte`/`.abschnitt`/`.abschnitt-titel` (Gliederung), `.gruppe`/`.gruppe-titel` (Überschrift + Elemente), `.auswahlreihe` (Chips, `.gleich` für gleich breite Knöpfe), `.auswahlliste` (Karten untereinander mit `small`-Unterzeile), `.umschalter` (zwei bis drei Teile), `.ansage`, `.warnung`, `.wuerfelbereich`. Gewählt-Zustand nur über `aria-pressed` (globaler Stil), keine eigenen `.an`-Stile.
- `.karte` ordnet ihre Kinder selbst untereinander (Abstand 3, ohne eigene Ränder); waagrechte Karten (Meldungen) setzen `flex-direction: row`. `.stapel` tut dasselbe ohne Rahmen. Eingabefelder: `<label class="feld">Name <input …></label>`, nicht Beschriftung und Feld als Geschwister.
- `Dialog` setzt die Abstände zwischen seinen Kindern selbst (Abstand 3, Kinder ohne eigenen Rand). Was enger zusammengehört, kommt in eine `.gruppe`.
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
