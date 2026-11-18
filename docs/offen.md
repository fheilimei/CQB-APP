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

Stellen, an denen das Regelwerk eine Frage offen lässt oder sich widerspricht. Die App arbeitet bis zur Entscheidung mit der genannten vorläufigen Lösung. Neue Einträge kommen beim Programmieren hinzu (Skill „regelfrage“). Die Regelpunkte aus den Schritten 1 bis 6 sind hierher übertragen (18.11.2026).

### R4. Stumpfer Krit gegen „Schmerz ignorieren“ (17.11.2026)
- **Frage:** Ein stumpfer Krit löst „immer“ einen Stagger aus. Das Symptom Schmerz ignorieren sagt „kein Stagger“. Was gilt?
- **Stellen:** (Schaden, Blutung und Verletzungen, Stumpfe Treffer); (Adrenalin, Symptome)
- **Vorläufig:** Schmerz ignorieren gewinnt, kein Stagger.
- **Andere Möglichkeit:** Der stumpfe Krit gewinnt, Stagger trotz Schmerz ignorieren.
- **Ändern:** Regelkern, Schaden (eine Zeile)
- **Im Regelwerk klarstellen:** ja

### R5. Wuchttreffer mit 0 Schaden (17.11.2026)
- **Frage:** Ein Wuchttreffer erzeugt eine Prellung. Gilt das auch, wenn er 0 Schaden macht?
- **Stellen:** (Schaden, Blutung und Verletzungen, Wuchttreffer); (Schaden, Blutung und Verletzungen, Prellungen)
- **Vorläufig:** keine Prellung, weil nichts zu heilen ist.
- **Andere Möglichkeit:** Prellung mit 0 Schaden (wichtig nur, wenn eine Prellung außer dem Schaden noch etwas bewirkt).
- **Ändern:** Regelkern, Schaden
- **Im Regelwerk klarstellen:** ja

### R6. Offene kritische Wunde und Kampfunfähigkeit (17.11.2026)
- **Frage:** Welche kritische Wunde macht kampfunfähig: jede oder nur eine, deren Blutung nicht gestoppt ist?
- **Stellen:** (Schaden, Blutung und Verletzungen, Kampfunfähigkeit); (Schaden, Blutung und Verletzungen, Kritische Blutung); (Würfelmechanik, Zustände)
- **Vorläufig:** Jede kritische Wunde, deren Blutung nicht gestoppt ist. Wird mit den Wunden (Schritt 7) überprüft.
- **Andere Möglichkeit:** jede kritische Wunde, bis sie geheilt ist.
- **Ändern:** Regelkern, Zustände
- **Im Regelwerk klarstellen:** offen, Prüfung mit Schritt 7

### R7. Kosten des Waffenwechsels (18.11.2026)
- **Frage:** Ein Wechsel umfasst Wegstecken der alten und Bereitmachen der neuen Waffe. Was kostet er, wenn die beiden Trageorte verschieden viel kosten?
- **Stellen:** (Kampfsystem, Waffe wechseln)
- **Vorläufig:** Es zählt der teurere der beiden Trageorte (Pistole ins Holster, Gewehr von der Schlinge → Mainaction). Rucksack (2 Runden): Die App wechselt sofort und weist auf die zweite Runde hin.
- **Andere Möglichkeit:** Beide Kosten werden zusammengezählt.
- **Ändern:** Regelkern, Waffen (Wechselkosten)
- **Im Regelwerk klarstellen:** ja

### R8. Wie lange gilt Zielen? (18.11.2026)
- **Frage:** Regelwerk: „in der nächsten Runde einen Bonus“. Gilt er nur in der nächsten Runde und nur für den ersten Schuss?
- **Stellen:** (Kampfsystem, Breakaction); (Kampfsystem, Treffen)
- **Vorläufig:** Nur in der nächsten Runde für den nächsten Schuss; wird es nicht genutzt, verfällt es. Ein Schuss in der Runde des Zielens lässt es verfallen. „Neues Ziel“ löscht es.
- **Andere Möglichkeit:** Das Zielen gilt bis zum nächsten Schuss auf dasselbe Ziel, auch über mehrere Runden.
- **Ändern:** Regelkern, Aktionen (Zielen)
- **Im Regelwerk klarstellen:** ja

### R9. Bewegung und Hechten in derselben Runde (18.11.2026)
- **Frage:** Bewegt sich der Charakter und hechtet in derselben Runde: Zählen für die Lage beide Malsteps?
- **Stellen:** (Kampfsystem, Malsteps der Lage); (Kampfsystem, Standwechsel)
- **Vorläufig:** Es zählt nur eins von beiden, das mit mehr Malsteps (wie bei Sprint die schnellere Bewegung).
- **Andere Möglichkeit:** Beide zählen.
- **Ändern:** Regelkern, Aktionen (eigene Bewegung für die Lage)
- **Im Regelwerk klarstellen:** ja

### R10. Atemkontrolle: wann zählt „liegend oder aufgelegt“? (18.11.2026)
- **Frage:** Atemkontrolle wirkt nur liegend oder mit aufgelegter Waffe. Zählt der Stand beim Zielen oder beim Schuss?
- **Stellen:** (Stats, Skills und Perks, Exklusive Perks)
- **Vorläufig:** im Moment des Zielens (Schalter beim Zielen, vorbelegt mit dem Stand).
- **Andere Möglichkeit:** im Moment des Schusses.
- **Ändern:** Regelkern, Aktionen (Zielen), und der Schalter beim Zielen
- **Im Regelwerk klarstellen:** ja

### R11. Schnelllader und Ladestreifen: Patronen, die noch in der Waffe sind (18.11.2026)
- **Frage:** Was passiert mit den Patronen, die beim Laden mit Schnelllader oder Ladestreifen noch in der Waffe sind?
- **Stellen:** (Kampfsystem, Nachladen); (Schusswaffen (tragbar), Zubehör)
- **Vorläufig:** Sie kommen zu den losen Patronen.
- **Andere Möglichkeit:** Sie gehen verloren (fallen zu Boden).
- **Ändern:** Regelkern, Waffen (Laden mit Zubehör)
- **Im Regelwerk klarstellen:** ja

### R12. Magazine nach dem Gefecht füllen: Dauer und Reihenfolge (18.11.2026)
- **Frage:** Das Regelwerk sagt nicht, wie lange das Füllen von Magazinen dauert und was zuerst gefüllt wird. (Entschieden ist schon: Knopf „Magazine füllen“ außerhalb des Gefechts; leere Magazine werden gezählt statt verworfen.)
- **Stellen:** (Kampfsystem, Nachladen)
- **Vorläufig:** Kostet keine Zeit. Reihenfolge: Waffe, angebrochene Magazine, leere Magazine.
- **Andere Möglichkeit:** eine feste Dauer je Magazin.
- **Ändern:** Regelkern, Waffen (Magazine füllen); für eine Dauer zusätzlich eine Zahl in regeln.json
- **Im Regelwerk klarstellen:** ja

### R13. Exklusive Skills ohne Gruppe (16.11.2026)
- **Frage:** Tarnen, Ballistik, Sprengstoff, Einschüchtern, Schlösser, Beschaffen, Taktisches Fahren, Aufbrechen und Verhören stehen nur unter „Exklusive Skills“, ohne Gruppe.
- **Stellen:** (Stats, Skills und Perks, Exklusive Skills)
- **Vorläufig:** Gruppe „exklusiv“, nur für die Anzeige. Über Gruppen werden sie ohnehin nie freigegeben.
- **Andere Möglichkeit:** jedem eine der vorhandenen Gruppen zuordnen.
- **Ändern:** skills.json (Feld gruppe bei diesen Skills)
- **Im Regelwerk klarstellen:** nein

### R14. Stat-Voraussetzung bei der Erstellung auf höherer Stufe (17.11.2026)
- **Frage:** Die Klassen nennen „Voraussetzung: Twitch A“ usw. Gilt das auch bei der Erstellung? Und müssen beim Meister die Stats seines Wegs (Spezialisierung, Stufe-4-Klasse) auf A stehen, obwohl er selbst keine Stat-Voraussetzung hat?
- **Stellen:** (Klassen, Spezialisierungen); (Klassen, Meister); (Charaktererstellung, 1. Klasse wählen)
- **Vorläufig:** Gilt auch bei der Erstellung. Die erweiterte Form verlangt zusätzlich den Stat ihrer Spezialisierung. Beim Meister: nein.
- **Andere Möglichkeit:** Beim Meister gelten die Voraussetzungen seines Wegs.
- **Ändern:** Regelkern, Erstellung (Stat-Voraussetzungen)
- **Im Regelwerk klarstellen:** ja

### R15. Meister mit zweiter Spezialisierung bei der Erstellung (17.11.2026)
- **Frage:** Als Stufe-4-Klasse bietet die Erstellung nur die erweiterten Formen an, keine zweite Spezialisierung. Reicht das?
- **Stellen:** (Klassen, Zweite Spezialisierung); (Klassen, Meister)
- **Vorläufig:** ja, nur die erweiterten Formen.
- **Andere Möglichkeit:** Auch die zweite Spezialisierung als Weg zum Meister anbieten.
- **Ändern:** Regelkern, Erstellung (Wahl der Stufe-4-Klasse)
- **Im Regelwerk klarstellen:** ja

### R16. Mindestskills beim Einstieg als erweiterte Form (17.11.2026)
- **Frage:** Gelten bei der Erstellung als erweiterte Form auch die Mindestskills der Spezialisierung darunter?
- **Stellen:** (Klassen, Spezialisierungen); (Klassen, Funktion der Klasse)
- **Vorläufig:** Es gelten nur die Mindestskills der gewählten Klasse. Sie enthalten laut Regelwerk die der Klasse darunter.
- **Andere Möglichkeit:** Die Mindestskills beider Klassen werden zusammengenommen (jeweils der höhere Wert).
- **Ändern:** Regelkern, Erstellung (Grund-Skills)
- **Im Regelwerk klarstellen:** nein

### R17. Klasse wechseln nach einem Statrank-Up bei der Erstellung (17.11.2026)
- **Frage:** Wechselt der Spieler in der Erstellung die Klasse, nachdem er in Schritt 5 einen Statrank-Up gekauft hat: Was passiert mit dem Statrank-Up?
- **Stellen:** (Charaktererstellung, 5. freie Charakterpunkte verteilen); (Klassen, Rank-Set)
- **Vorläufig:** Der Statrank-Up bleibt am Stat, denn sein Wurf ist fest. Hat der Stat danach keinen Rang oder steht schon auf S, zählt er nicht und kostet nichts. Der Wurf ist dann verloren.
- **Andere Möglichkeit:** Ein Klassenwechsel setzt alle Statrank-Ups zurück.
- **Ändern:** Regelkern, Erstellung
- **Im Regelwerk klarstellen:** nein

### R18. Aufsätze ohne Preis und Vorratslevel (16.11.2026)
- **Frage:** Reflexvisier, Zielfernrohr, Zweibein, Vordergriff, Lampe, Schalldämpfer, Kompensator und erweiterte Magazine haben im Regelwerk keine Geldwertspanne und kein Vorratslevel. Für den Laden werden sie gebraucht.
- **Stellen:** (Schusswaffen (tragbar), Aufsätze)
- **Vorläufig:** noch keine; zurückgestellt, bis der Laden gebaut wird (Konzept § 3.14). Dann schlage ich Werte vor, falls das Regelwerk sie bis dahin nicht nennt.
- **Ändern:** aufsaetze.json (Geldwert und Vorratslevel je Aufsatz)
- **Im Regelwerk klarstellen:** ja (Werte ergänzen)

### Erledigt

### R3. Arme hinter Deckung (17.11.2026)
- **Entschieden (18.11.2026):** Wie im Regelwerk: Nur wenn eine Deckung **von unten** die Brust verdeckt, sind auch beide Arme verdeckt. Seitliche Deckung (Hausecke, Türrahmen) verdeckt nur den Arm ihrer Seite. Deckung von oben ist in der Regel nicht vorgesehen. Umgesetzt: Die App merkt sich, ob die Deckungskante von unten gezogen wurde; nur dann kommen die Arme dazu. Einzeln angetippte Zonen ziehen die Arme nicht mit.
- **Frage:** Regelwerk: „Verdeckt eine Deckung **von unten** die Brust, gelten auch beide Arme als verdeckt.“ Die App weiß nicht, von welcher Seite die Deckung verdeckt.
- **Stellen:** (Deckung und Rüstung, Deckung)
- **Vorläufig:** Ist die Brust verdeckt, sind auch die Arme verdeckt. Die Richtung prüft die App nicht.
- **Andere Möglichkeit:** Der Spieler gibt an, ob die Deckung von unten kommt; nur dann zählen die Arme.
- **Ändern:** Regelkern, Schaden (verdeckte Zonen), und die Auswahl der Deckung
- **Im Regelwerk klarstellen:** nein

### R2. Rüstung bei der Ansage „Rumpf“ (17.11.2026)
- **Entschieden (18.11.2026):** Rüstung gibt es am Rumpf nur so, dass sie Brust, Bauch und Unterleib mit demselben Wert abdeckt. Bei der Ansage „Rumpf“ zählt deshalb einfach der Schutz der Weste bzw. der Rüstung am Oberkörper. Die Verletzung richtet sich weiter nach der Zeile „Rumpf“ der Körperzonen (Blutung; bei Krit kampfunfähig, verbluten in einer Minute), wie im Regelwerk. Umgesetzt: Die Datenprüfung meldet eine Rüstung, die die drei Rumpfzonen verschieden schützt.
- **Frage:** Bei der Ansage „Rumpf“ steht nicht fest, welche Rumpfzone für die Rüstung zählt.
- **Stellen:** (Deckung und Rüstung, Rüstung); (Kampfsystem, Treffen)
- **Vorläufig:** Es zählt der niedrigste Rüstungswert von Brust, Bauch und Unterleib. Bei allen heutigen Westen sind die drei gleich.
- **Andere Möglichkeit:** Der Treffer wird mit dem W8 einer Rumpfzone zugeordnet, und deren Rüstung zählt.
- **Ändern:** Regelkern, Schaden (Rüstungswert)
- **Im Regelwerk klarstellen:** ja, **noch offen**: In Deckung und Rüstung (Rüstung) festhalten, dass Rüstung am Rumpf immer alle drei Rumpfzonen mit demselben Wert abdeckt.

### R1. Step-Faktoren gerundet oder genau (17.11.2026)
- **Entschieden (18.11.2026):** Gerundet wird immer zugunsten des Spielers. Umgesetzt: Die Faktoren sind auf drei Stellen aufgerundet (0,85 · 0,638 · 0,415 · 0,228 · 0,103, regeln.json, steps.faktoren); der Zielwert selbst wird weiter kaufmännisch gerundet, wie das Regelwerk es verlangt. Alle Beispiele des Regelwerks stimmen. Gegenüber vorher steigen 10 Zielwerte um 1 (Statwert/Malsteps: 29/2, 34/5, 47/3, 68/4, 73/5, 76/3, 87/2, 88/3, 98/2, 100/3); keiner sinkt.
- **Frage:** Das Regelwerk nennt die Abschläge 15 %, 25 %, 35 %, 45 %, 55 % und dazu gerundete Faktoren (0,638; 0,414; 0,228; 0,103). Mit den gerundeten Faktoren ergibt Statwert 35 bei 3 Malsteps 14; das Beispiel im Regelwerk nennt 15.
- **Stellen:** (Stats, Skills und Perks, Steps)
- **Vorläufig:** Die App rechnet mit den ungerundeten Faktoren (0,6375; 0,414375; 0,22790625; 0,1025578125). Damit stimmen alle Beispiele.
- **Andere Möglichkeit:** gerundete Faktoren. Dann ändern sich 8 Zielwerte um 1 (Statwert/Malsteps: 29/2, 34/5, 35/3, 64/3, 68/4, 73/5, 87/2, 98/2), und das Beispiel im Regelwerk müsste angepasst werden.
- **Ändern:** eine Zeile in regeln.json (steps.faktoren)
- **Im Regelwerk klarstellen:** ja, **noch offen**: In der Tabelle (Stats, Skills und Perks, Steps) 0,414 durch 0,415 ersetzen und den Grundsatz „gerundet wird zugunsten des Spielers“ ergänzen.

### R19. Rank-Vorschlag der Klassen (16.11.2026)
- **Entschieden (16.11.2026):** kein Vorschlag; der Spieler verteilt das Rank-Set selbst. Konzept § 3.0 angepasst.

### R20. M4 Carbine und M16A4, Magazingröße (16.11.2026)
- **Entschieden (16.11.2026):** Die M4 bleibt bei 20+1 (erweitert 30, Trommel 100). Die M16A4 bekommt ebenfalls 20+1 mit erweitertem Magazin 30 und Trommel 100. In waffen.json und aufsaetze.json so eingetragen.
- **Im Regelwerk klarstellen:** ja, **noch offen**: Im Repo CQB (Schusswaffen, M16A4) steht weiter 30+1 mit Trommel 100 (Stand 17.11.2026). Bis zum Nachtrag weicht die App hier von der Kopie in `regelwerk/` ab.

### R21. Gummi- und Unterschallmunition an Waffen (16.11.2026)
- **Entschieden (17.11.2026):** Jede Waffe verschießt alle Typen ihres Kalibers (Munitionstypen: Gummi und Unterschall gelten „wie gewöhnliche Munition des Kalibers“).

### R22. Kompensator (16.11.2026)
- **Entschieden (16.11.2026):** für Pistole und Gewehr, je ein eigener Aufsatz.

### R23. Gewehrkolben und Gewehrlauf „mit jeder Langwaffe“ (16.11.2026)
- **Entschieden (17.11.2026):** Kategorien AR, SG, DMR, SR, LMG; nicht SMG und Werfer.

### R24. Wurfwaffen (16.11.2026)
- **Entschieden (17.11.2026):** Jede Nahkampfwaffe ist werfbar und hat eine Wurf-Reichweite (Malsteps je Band, „n/A“ = nicht werfbar), dazu zählt die Wurfweite des Charakters. Neu: Wurfmesser und Wurfaxt, auch im Nahkampf einsetzbar. Keine eigene Datei für Wurfwaffen. Im Regelwerk (Kampfsystem, Werfen; Nahkampfwaffen) eingetragen und übernommen; in nahkampfwaffen.json Feld wurf. Nahkampfwaffen im Charakter tragen eine Anzahl (Standard 1).

## Offen aus Schritt 1 (Grundgerüst, 16.11.2026)

Gefunden beim Übertragen des Regelwerks in die Spieldaten. Jeweils mit der vorläufigen Lösung, mit der die App arbeitet.

1. **Rank-Vorschlag der Klassen.** → Regelfragen R19.
2. **M4 Carbine und M16A4, Magazingröße.** → Regelfragen R20.
3. **Gummi- und Unterschallmunition an Waffen.** → Regelfragen R21.
4. **Kompensator.** → Regelfragen R22.
5. **Aufsätze ohne Preis und Vorratslevel.** → Regelfragen R18.
6. **Gewehrkolben und Gewehrlauf „mit jeder Langwaffe“.** → Regelfragen R23.
7. **Wurfwaffen.** → Regelfragen R24.
8. **Exklusive Skills ohne Gruppe.** → Regelfragen R13.
9. **Prüfung „Mindestskills liegen im Zugang der Klasse“.** Erledigt (17.11.2026, Schritt 2): Die Datenprüfung rechnet den Zugang jeder Klasse aus; alle 33 Klassen bestehen.

## Offen aus Schritt 2 (Regelkern, 17.11.2026)

1. **Step-Faktoren gerundet oder genau?** → Regelfragen R1.
2. **Rüstung bei der Ansage „Rumpf“.** → Regelfragen R2 (entschieden).
3. **Krit eines stumpfen Treffers gegen „Schmerz ignorieren“.** → Regelfragen R4.
4. **Wuchttreffer mit 0 Schaden.** → Regelfragen R5.
5. **Perks, deren Wirkung nur als Text vorliegt.** Erledigt für Schritt 6 (18.11.2026): `perk_wirkungen` in `regeln.json` mit festen Wirkungsarten; der Regelkern führt CQB, Feuer in Bewegung, Atemkontrolle, Gezielter Schuss, Triple Tap, Fingerfertig, Schnell nachladen, Schnellzieher, Quickthrow und Schutzreflex selbst aus. Weiter nur als Hinweis: Überfall, Kaltblütig, Geduld, Niederhalten, Lucky Numbers, Korrektur (sie brauchen Wissen, das die App nicht hat, z. B. ob das Ziel dich wahrnimmt).
6. **Arme hinter Deckung.** → Regelfragen R3 (entschieden).

## Offen aus Schritt 3 (Erstellung und Modi, 17.11.2026)

1. **Stat-Voraussetzung bei der Erstellung auf höherer Stufe.** → Regelfragen R14.
2. **Meister mit zweiter Spezialisierung bei der Erstellung.** → Regelfragen R15.
3. **Mindestskills der Spezialisierung beim Einstieg als erweiterte Form.** → Regelfragen R16.
4. **Klasse wechseln nach einem Statrank-Up in Schritt 5.** → Regelfragen R17.
5. **Laden in Schritt 7** fehlt noch (§ 3.14). Bis dahin wird nur das Startgeld gebucht.
6. **Noch nicht im Schreibmodus:** Klasse/Klassenweg, Geld, Optionen des Hintergrunds (Schulden, Coup, Vertrag). Ausrüstung: erledigt in Schritt 6. Kommen mit den Schritten 7 und 8. Klassenwechsel-Dialog kommt mit Schritt 8. Erledigt in Schritt 4: Grundwerte, Anpassungen der SL, Name, Aussehen, Freitexte des Hintergrunds.

## Offen aus Schritt 4 (Bogen, 17.11.2026)

1. **Notizen im Lesemodus.** Das Konzept legt nicht fest, ob Notizen gesperrt sind. *Vorläufig:* in jedem Modus änderbar (sie sind kein Wert des Charakters) und ohne Eintrag im Protokoll.
2. **Skill antippen.** Erledigt (17.11.2026, Schritt 5): Im Lesemodus öffnet der Skill den Probenrechner; im Aufstiegs- und Schreibmodus klappt er das Detail auf.
3. **Formular für Anpassungen.** Ziele: Grundwert, Proben auf einen Stat, Proben mit einem Skill, alle Proben; Betrag 1–5. *Noch nicht:* Probenarten (Schießen, Haltezahl …), Bedingungen (Band, Stand …) und Änderung der Krit-Schwelle. Lässt sich ergänzen, wenn die SL so etwas braucht.
4. **Markierung bei Bedingungen.** Ein Modifikator mit Bedingung (z. B. Kernschuss nur mit dem Präzisionsgewehr) markiert seinen Stat bzw. Skill immer; ob er wirkt, zeigt erst der Probenrechner.

## Offen aus Schritt 5 (Probenrechner und Adrenalin, 17.11.2026)

1. **Offene kritische Wunde.** → Regelfragen R6.
2. **Steps der SL für das ganze Gefecht** gelten vorläufig für **alle** Proben. Die Auswahl, für welche Proben sie gelten (Schießen, Werfen, alle; `gilt_fuer`), kommt mit dem Schussrechner (Schritt 6); das Datenformat kennt sie schon.
3. **Senken und Verbündete verschieben** sind Mainactions. Erledigt (Schritt 6): Sie ziehen die Main ab.
4. **Rückhalt und Einsamer Wolf** (Stepshield gegen den Anstieg bzw. beim Senken, wenn Verbündete in Hörweite sind bzw. nicht) erscheinen als Hinweis; den Stepshield trägt der Spieler im Block SL ein, weil die App nicht weiß, wer in Hörweite ist.
5. **Zeichen für Steps der SL:** ⚑ (in `darstellung.json`, `herkunft.sl`), damit SL-Steps in Chips und Rechnung von Lage und Anpassungen unterscheidbar sind. Lässt sich dort ändern.

## Offen aus Schritt 6 (Aktionsleiste, Waffen, Schießen, 18.11.2026)

1. **Kosten des Waffenwechsels.** → Regelfragen R7.
2. **Wie lange gilt Zielen?** → Regelfragen R8.
3. **Bewegung und Hechten in derselben Runde.** → Regelfragen R9.
4. **Atemkontrolle.** → Regelfragen R10.
5. **Aufsätze im Gefecht anbringen.** Die App führt keine losen Aufsätze. *Vorläufig:* Der Spieler hakt an, was danach an der Waffe ist, und wählt nur, was er dabeihat.
6. **Schnelllader und Ladestreifen.** → Regelfragen R11.
7. **Magazine nach dem Gefecht füllen.** Entschieden (18.11.2026): Knopf „Magazine füllen“ außerhalb des Gefechts; leere Magazine werden gezählt statt verworfen. Dauer und Reihenfolge → Regelfragen R12.
8. **Ausrüstung ohne Laden.** Im Schreibmodus frei eintragbar, ohne Kassenbuch und ohne Eintrag im Protokoll. Mit dem Laden (§ 3.14) ändert sich das.
9. **Noch nicht da:** Knöpfe Getroffen und Ereignis, Wurfaktion, Nahkampf, Wunde versorgen (im Menü ausgegraut), Schaden beim Ziel vorrechnen im Schussbericht, Malstep und Waffen-Einschränkung des ballistischen Schilds beim Schießen. Kommen mit Schritt 7 (Treffer, Wunden, Schutz).
10. **Skill austauschen beim Schießen** (Konzept § 3.6) fehlt noch; der Schussrechner nimmt immer den Waffenskill der Waffe.
