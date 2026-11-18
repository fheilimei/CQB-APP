App (zurückgestellt)

Die App wird erst entwickelt, wenn die Regeln weitgehend stehen ([[App/docs/konzept]]).

    Festgelegt (16.11.2026): Klassen-Datenmodell. Skills und Perks gehören dem Charakter; Zugang aus der aktuellen Klasse (wie, Gruppen, exklusiv, laufbahn_gesamt); Klassenweg statt Einzelklasse; eingefrorene Skills; Dialog Klassenwechsel ([[App/docs/datenformat#klassen.json]], [[App/docs/konzept#3.0d Klassenwechsel (M)]], [[Charakteraufstieg#Klassenwechsel]]).
    Festgelegt (16.11.2026): Lage-Auswahl mit drei Blöcken: automatisch (abschaltbar per ×), Ziel und Schütze mit Entfernung zum Ziel (aus regeln.json, gemerkt bis Rundenende bzw. neues Ziel), SL-Malsteps und -Stepshields mit Grund, für einen Schuss oder das ganze Gefecht ([[App/docs/konzept#3.8c Lage-Auswahl (R)]]). Automatische Steps per × abschaltbar. Oberflächentexte: kein Wort „Leiter“, keine Kürzel A1/R2, sondern „Adrenalin 2“, „Ruhepuls 1“, „Over the Edge“, bei 0 keine Anzeige; Knöpfe als Adjektiv („Stand des Ziels: stehend“) ([[App/docs/konzept#Texte in der Oberfläche]]).
    Festgelegt (16.11.2026): Übergabe an Claude Code. Arbeitsregeln fürs App-Repo in [[App/docs/CLAUDE-app-repo]] (wird dort zur CLAUDE.md), Anleitung mit erstem Auftrag in [[App/docs/uebergabe]]. Quelle der Spieldaten ist das Regelwerk; die JSON-Dateien erstellt Claude Code im ersten Schritt.
    Festgelegt (16.11.2026): Konzept und Datenformat mit dem Regelwerk abgeglichen. Neu: nahkampfwaffen.json; in regeln.json Initiative, Breakaction, Konzentration, Waffe wechseln, Bewegung, Lage, Sicht, Lautstärke, Ladehemmung, Nahkampf, Werfen, Krit-Folgen, Geblendet, Gereizt; Ladeart, Zubehör, Betriebsarten und Trageort; Schrotzahl, Gummi und Unterschall in munition.json; Helme, Schutzanzug und Schild in schutz.json; Abschnitte Initiative/Breakaction und Nahkampf im Konzept (Ablauf noch offen). Grundsatz: Bei Widerspruch gilt das Regelwerk.
    Festgelegt (16.11.2026): Initiative und Breakaction. „Nächste Runde“ (Knopf) → Rundenende → Zähler zurück → Initiative. Keine Zugverfolgung; Aktionen stehen die Runde über bereit. Break: ohne Probe, Reaktion oder Antizipation; Hinweis auf benötigte Information, Malsteps der Information über SL-Block; App zeigt Stufe und Wurf zum Ansagen, die SL ordnet ([[App/docs/konzept#3.7b Initiative und Breakaction (M, R)]]). Tisch-Modus mit verbundenen Geräten später.
    Festgelegt (16.11.2026): Gefecht und Ruhe als eigene Zustände des Bogens. Aktionsleiste nur im Gefecht; Aufstieg im Gefecht gesperrt; bei Kampfunfähigkeit nichts gesperrt (SL geht vor), aber „Gefecht starten“ und Aktionsknöpfe mit Warnmarkierung, Aktion nur nach Bestätigung ([[App/docs/konzept#3.0e Gefecht und Ruhe (M)]]).
    Festgelegt (16.11.2026): Treffer-Dialog in zwei Richtungen mit gleicher Gliederung (Was, Probe, Wo, Ausgang, Bericht). Ausgehend über die Aktionsknöpfe, eingehend über den Knopf „Getroffen“ (auch in Ruhe). Nahkampf in beiden Richtungen; Ausgang tippt der Spieler nach Ansage der SL ([[App/docs/konzept#3.7c Treffer: ausgehend und eingehend (M, R)]], [[App/docs/konzept#3.8b Nahkampf (M, R)]]).
    Festgelegt (16.11.2026): Silhouette als zentraler Baustein (Körperbild) mit Schichten (Stand, Rüstung, Deckung, Wunden, Folgen, Waffe, Vorschau, Splitter, Ausrüstung). Startbildschirm „Figur“ mit Silhouette in der Mitte; Reiter Figur · Werte · Ausrüstung · Verlauf; Vorschau des Trefferausgangs je Zone beim eingehenden Treffer; Trageorte an der Figur im Reiter Ausrüstung ([[App/docs/konzept#3.0f Körperbild (Silhouette) (A, R)]], [[App/docs/konzept#Aufbau der App]]).
    Festgelegt (16.11.2026): Adrenalin als horizontales Wählrad, nur im Gefecht, zwischen Aktionsleiste und Reiterleiste; Wischen um je eine Stufe, an den Enden Anschlag; Mitte antippen öffnet Detail (Symptome, Senken, Verbündete verschieben, Rückgängig); Nächste Runde und Gefecht beenden in der Kopfzeile ([[App/docs/konzept#3.7 Leiter (M, R)]]).
    Festgelegt (16.11.2026): Hintergrund mit Schulden, Coup, Vertrag nur bei der Erstellung, Startgeld live; Kassenbuch; Einnahmen über „Auftrag abschließen“ (Gehalt, weitere Einnahmen, Schuldenfrist); erster Start mit Erstellen oder Importieren; mehrere Charaktere; Menü ☰ mit Charakteren, Modi, Abschlüssen, Einstellungen ([[App/docs/konzept#3.0g Start, Charaktere und Menü (M)]], [[App/docs/konzept#3.13 Geld und Aufträge (M, R)]]).
    Festgelegt (16.11.2026): Laden für Kauf und Verkauf (Reiter nach Warengruppen, Zustand → Preisviertel, Preis nach SL, Verhandeln optional, Korb, Beschaffen über dem Vorratslevel); Begriffsarten mit Zeichen und Farbe (■ Stat, ⬢ Skill, ◆ Perk); ♥ für Adrenalin/Ruhepuls, ▲▼ nur für Steps ([[App/docs/konzept#3.14 Laden: Kaufen und Verkaufen (M, R)]], [[App/docs/konzept#Texte in der Oberfläche]]).
    Festgelegt (16.11.2026): Erstellung ein Bildschirm pro Schritt mit Fortschrittsleiste, Name und Aussehen (Freitext) im ersten Schritt; Aufstieg mit Leiste der freien Punkte und Abschnitt „Jetzt möglich“ ([[App/docs/konzept#3.0 Charaktererstellung (M, R)]], [[App/docs/konzept#3.0a Modi: Lesen, Aufstieg, Schreiben (M)]]).
    klassen.json vollständig befüllen (alle 33 Klassen, 5 Stufen, 3 Laufbahnen) und gruppe/exklusiv in skills.json und perks.json nachtragen.
    Festgelegt (16.11.2026): Technik Svelte 5 mit Vite und TypeScript, Tests mit Vitest, Build und Veröffentlichung per GitHub Action; drei Schichten Daten / Regelkern / Oberfläche ([[App/docs/konzept#2. Plattform und Rahmen]]).
    Perk-IDs nach Umbenennung: Schutzreflex, Kernschuss ([[Stats, Skills und Perks#Kampfperks]]).


## Regelfragen

Stellen, an denen das Regelwerk eine Frage offen lässt oder sich widerspricht. Die App arbeitet bis zur Entscheidung mit der genannten vorläufigen Lösung. Neue Einträge kommen beim Programmieren hinzu (Skill „regelfrage“). Ältere Regelpunkte stehen noch unten bei den einzelnen Schritten.

Noch keine Einträge.

### Erledigt

## Offen aus Schritt 1 (Grundgerüst, 16.11.2026)

Gefunden beim Übertragen des Regelwerks in die Spieldaten. Jeweils mit der vorläufigen Lösung, mit der die App arbeitet.

1. **Rank-Vorschlag der Klassen.** Entschieden (16.11.2026): kein Vorschlag; der Spieler verteilt das Rank-Set selbst. Konzept § 3.0 angepasst.
2. **M4 Carbine und M16A4, Magazingröße.** Entschieden (16.11.2026): Die M4 bleibt bei 20+1 (erweitert 30, Trommel 100). Die M16A4 bekommt ebenfalls 20+1 mit erweitertem Magazin 30 und Trommel 100. In `waffen.json` und `aufsaetze.json` schon so eingetragen. **Im Regelwerk (Repo CQB, Schusswaffen, M16A4) noch nachzutragen** (Stand 17.11.2026: dort weiter 30+1 mit Trommel 100; die Änderung war in der Kopie `regelwerk/` der App gelandet und wurde beim Übernehmen überschrieben). Bis dahin weicht die App an dieser Stelle von der Kopie in `regelwerk/` ab.
3. **Gummi- und Unterschallmunition an Waffen.** Entschieden (17.11.2026): Jede Waffe verschießt alle Typen ihres Kalibers (Munitionstypen: Gummi und Unterschall gelten „wie gewöhnliche Munition des Kalibers“).
4. **Kompensator.** Entschieden (16.11.2026): für Pistole und Gewehr, je ein eigener Aufsatz.
5. **Aufsätze ohne Preis und Vorratslevel.** Zurückgestellt (16.11.2026) bis zum Bau des Ladens. Reflexvisier, Zielfernrohr, Zweibein, Vordergriff, Lampe, Schalldämpfer, Kompensator und erweiterte Magazine haben im Regelwerk keine Geldwertspanne und kein Vorratslevel. Für den Laden (§ 3.14) werden sie gebraucht.
6. **Gewehrkolben und Gewehrlauf „mit jeder Langwaffe“.** Entschieden (17.11.2026): Kategorien AR, SG, DMR, SR, LMG; nicht SMG und Werfer.
7. **Wurfwaffen.** Entschieden (17.11.2026): Jede Nahkampfwaffe ist werfbar und hat eine Wurf-Reichweite (Malsteps je Band, „n/A“ = nicht werfbar), dazu zählt die Wurfweite des Charakters. Neu: Wurfmesser und Wurfaxt, auch im Nahkampf einsetzbar. Keine eigene Datei für Wurfwaffen. Im Regelwerk (Kampfsystem, Werfen; Nahkampfwaffen) eingetragen und übernommen; in `nahkampfwaffen.json` Feld `wurf`. Nahkampfwaffen im Charakter tragen eine Anzahl (Standard 1).
8. **Exklusive Skills ohne Gruppe.** Tarnen, Ballistik, Sprengstoff, Einschüchtern, Schlösser, Beschaffen, Taktisches Fahren, Aufbrechen und Verhören stehen im Regelwerk nur unter „Exklusive Skills“. *Vorläufig:* Gruppe `exklusiv` (nur für die Anzeige; über Gruppen werden sie ohnehin nie freigegeben).
9. **Prüfung „Mindestskills liegen im Zugang der Klasse“.** Erledigt (17.11.2026, Schritt 2): Die Datenprüfung rechnet den Zugang jeder Klasse aus; alle 33 Klassen bestehen.

## Offen aus Schritt 2 (Regelkern, 17.11.2026)

1. **Step-Faktoren gerundet oder genau?** Das Regelwerk (Stats, Skills und Perks, Steps) beschreibt die Abschläge 15 %, 25 %, 35 %, 45 %, 55 % und zeigt dazu gerundete Faktoren (0,638; 0,414; 0,228; 0,103). Mit den gerundeten Faktoren ergibt Statwert 35 bei 3 Malsteps 14, das Beispiel im Regelwerk nennt 15. *Vorläufig:* Die App rechnet mit den ungerundeten Faktoren (0,6375; 0,414375; 0,22790625; 0,1025578125); damit stimmen alle Beispiele. Unterschied zu den gerundeten Faktoren: 8 Zielwerte um 1 (29/2, 34/5, 35/3, 64/3, 68/4, 73/5, 87/2, 98/2). **Im Regelwerk (Repo CQB) klarstellen:** Faktoren mit mehr Stellen angeben oder „ungerundet rechnen“ ergänzen. Änderung in der App: eine Zeile in `regeln.json`.
2. **Rüstung bei der Ansage „Rumpf“.** Das Regelwerk sagt nicht, welche Rumpfzone für die Rüstung zählt. *Vorläufig:* der niedrigste Rüstungswert von Brust, Bauch und Unterleib (bei allen heutigen Westen gleich).
3. **Krit eines stumpfen Treffers gegen „Schmerz ignorieren“.** Ein stumpfer Krit löst „immer“ einen Stagger aus; das Symptom Schmerz ignorieren sagt „keinen Stagger“. *Vorläufig:* Schmerz ignorieren gewinnt, kein Stagger.
4. **Wuchttreffer mit 0 Schaden.** *Vorläufig:* keine Prellung, weil nichts zu heilen ist.
5. **Perks, deren Wirkung nur als Text vorliegt.** Erledigt für Schritt 6 (18.11.2026): `perk_wirkungen` in `regeln.json` mit festen Wirkungsarten; der Regelkern führt CQB, Feuer in Bewegung, Atemkontrolle, Gezielter Schuss, Triple Tap, Fingerfertig, Schnell nachladen, Schnellzieher, Quickthrow und Schutzreflex selbst aus. Weiter nur als Hinweis: Überfall, Kaltblütig, Geduld, Niederhalten, Lucky Numbers, Korrektur (sie brauchen Wissen, das die App nicht hat, z. B. ob das Ziel dich wahrnimmt).
6. **Arme hinter Deckung.** Regelwerk: „Verdeckt eine Deckung **von unten** die Brust, gelten auch beide Arme als verdeckt.“ *Vorläufig:* Ist die Brust verdeckt, sind die Arme verdeckt; die Richtung prüft die App nicht.

## Offen aus Schritt 3 (Erstellung und Modi, 17.11.2026)

1. **Stat-Voraussetzung bei der Erstellung auf höherer Stufe.** Die Klassen nennen „Voraussetzung: Twitch A“ usw. *Vorläufig:* gilt auch bei der Erstellung; die erweiterte Form verlangt zusätzlich den Stat ihrer Spezialisierung. Der Meister hat laut Regelwerk keine Stat-Voraussetzung; ob die Stats seines Wegs (Spezialisierung, Stufe-4-Klasse) trotzdem auf A stehen müssen, ist offen. *Vorläufig:* nein.
2. **Meister mit zweiter Spezialisierung bei der Erstellung.** Als Stufe-4-Klasse bietet die Erstellung nur die erweiterten Formen an, keine zweite Spezialisierung. Reicht das?
3. **Mindestskills der Spezialisierung beim Einstieg als erweiterte Form.** Es gelten nur die Mindestskills der gewählten Klasse (sie enthalten laut Regelwerk die der Klasse darunter).
4. **Klasse wechseln nach einem Statrank-Up in Schritt 5.** Der Statrank-Up bleibt am Stat (sein Wurf ist fest). Liegt der Stat danach ohne Rang oder schon auf S, zählt er nicht und kostet nichts; der Wurf ist dann verloren.
5. **Laden in Schritt 7** fehlt noch (§ 3.14). Bis dahin wird nur das Startgeld gebucht.
6. **Noch nicht im Schreibmodus:** Klasse/Klassenweg, Geld, Optionen des Hintergrunds (Schulden, Coup, Vertrag). Ausrüstung: erledigt in Schritt 6. Kommen mit den Schritten 7 und 8. Klassenwechsel-Dialog kommt mit Schritt 8. Erledigt in Schritt 4: Grundwerte, Anpassungen der SL, Name, Aussehen, Freitexte des Hintergrunds.

## Offen aus Schritt 4 (Bogen, 17.11.2026)

1. **Notizen im Lesemodus.** Das Konzept legt nicht fest, ob Notizen gesperrt sind. *Vorläufig:* in jedem Modus änderbar (sie sind kein Wert des Charakters) und ohne Eintrag im Protokoll.
2. **Skill antippen.** Erledigt (17.11.2026, Schritt 5): Im Lesemodus öffnet der Skill den Probenrechner; im Aufstiegs- und Schreibmodus klappt er das Detail auf.
3. **Formular für Anpassungen.** Ziele: Grundwert, Proben auf einen Stat, Proben mit einem Skill, alle Proben; Betrag 1–5. *Noch nicht:* Probenarten (Schießen, Haltezahl …), Bedingungen (Band, Stand …) und Änderung der Krit-Schwelle. Lässt sich ergänzen, wenn die SL so etwas braucht.
4. **Markierung bei Bedingungen.** Ein Modifikator mit Bedingung (z. B. Kernschuss nur mit dem Präzisionsgewehr) markiert seinen Stat bzw. Skill immer; ob er wirkt, zeigt erst der Probenrechner.

## Offen aus Schritt 5 (Probenrechner und Adrenalin, 17.11.2026)

1. **Offene kritische Wunde.** Für „kampfunfähig“ zählt vorläufig jede kritische Wunde, deren Blutung nicht gestoppt ist. Wird mit den Wunden (Schritt 7) genau festgelegt.
2. **Steps der SL für das ganze Gefecht** gelten vorläufig für **alle** Proben. Die Auswahl, für welche Proben sie gelten (Schießen, Werfen, alle; `gilt_fuer`), kommt mit dem Schussrechner (Schritt 6); das Datenformat kennt sie schon.
3. **Senken und Verbündete verschieben** sind Mainactions. Erledigt (Schritt 6): Sie ziehen die Main ab.
4. **Rückhalt und Einsamer Wolf** (Stepshield gegen den Anstieg bzw. beim Senken, wenn Verbündete in Hörweite sind bzw. nicht) erscheinen als Hinweis; den Stepshield trägt der Spieler im Block SL ein, weil die App nicht weiß, wer in Hörweite ist.
5. **Zeichen für Steps der SL:** ⚑ (in `darstellung.json`, `herkunft.sl`), damit SL-Steps in Chips und Rechnung von Lage und Anpassungen unterscheidbar sind. Lässt sich dort ändern.

## Offen aus Schritt 6 (Aktionsleiste, Waffen, Schießen, 18.11.2026)

1. **Kosten des Waffenwechsels.** Ein Wechsel umfasst Wegstecken und Bereitmachen. *Vorläufig:* Es zählt der teurere der beiden Trageorte (Pistole ins Holster, Gewehr von der Schlinge → Mainaction). Rucksack (2 Runden): Die App wechselt sofort und weist auf die zweite Runde hin.
2. **Wie lange gilt Zielen?** Regelwerk: „in der nächsten Runde einen Bonus“. *Vorläufig:* nur in der nächsten Runde; nicht genutzt, verfällt es. Ein Schuss in der Runde des Zielens lässt es verfallen; „Neues Ziel“ löscht es.
3. **Bewegung und Hechten in derselben Runde.** *Vorläufig:* Für die Lage zählt nur eins von beiden, das mit mehr Malsteps (wie bei Sprint die schnellere Bewegung).
4. **Atemkontrolle.** *Vorläufig:* Ob der Charakter liegt oder die Waffe aufgelegt ist, zählt im Moment des Zielens (Schalter im Zielen, vorbelegt mit dem Stand).
5. **Aufsätze im Gefecht anbringen.** Die App führt keine losen Aufsätze. *Vorläufig:* Der Spieler hakt an, was danach an der Waffe ist, und wählt nur, was er dabeihat.
6. **Schnelllader und Ladestreifen.** *Vorläufig:* Patronen, die beim Laden noch in der Waffe sind, kommen zu den losen Patronen.
7. **Magazine nach dem Gefecht füllen.** Entschieden (18.11.2026): Knopf „Magazine füllen“ außerhalb des Gefechts; leere Magazine werden gezählt statt verworfen. *Vorläufig* ist die Reihenfolge: Waffe, angebrochene Magazine, leere Magazine. Es kostet keine Zeit; wie lange das Füllen dauert, sagt das Regelwerk nicht.
8. **Ausrüstung ohne Laden.** Im Schreibmodus frei eintragbar, ohne Kassenbuch und ohne Eintrag im Protokoll. Mit dem Laden (§ 3.14) ändert sich das.
9. **Noch nicht da:** Knöpfe Getroffen und Ereignis, Wurfaktion, Nahkampf, Wunde versorgen (im Menü ausgegraut), Schaden beim Ziel vorrechnen im Schussbericht, Malstep und Waffen-Einschränkung des ballistischen Schilds beim Schießen. Kommen mit Schritt 7 (Treffer, Wunden, Schutz).
10. **Skill austauschen beim Schießen** (Konzept § 3.6) fehlt noch; der Schussrechner nimmt immer den Waffenskill der Waffe.
