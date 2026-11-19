---
name: regelfrage
description: Regelfragen beim Programmieren der CQB-App klären, verlässlich aus regelwerk/. Immer laden, bevor eine Regelfunktion (src/lib/regeln), Spieldaten (public/data) oder ein Ablauf mit Regelbezug (Proben, Steps, Schaden, Adrenalin, Klassen, Geld …) gebaut oder geändert wird, und sobald beim Programmieren unklar ist, was eine Regel genau verlangt. Liefert die Regel in einer Form, die sich direkt umsetzen lässt (Schritte, Zahlen mit Datenort, Ausnahmen, Testfälle). Lücken bekommen eine vorläufige Lösung, die in docs/offen.md unter „Regelfragen“ eingetragen wird. Aufruf mit /regelfrage <Frage>.
---

# Regelfragen

Ziel: Die App setzt das Regelwerk richtig um, ohne dass der Nutzer jede Frage beantworten muss. Wo das Regelwerk schweigt, arbeitest du mit einer **vorläufigen Lösung** weiter und trägst sie ein, damit der Nutzer sie später entscheiden kann.

Der Nutzer liest die Regeln selbst. Die Antworten aus diesem Skill sind **für dich beim Programmieren**, nicht für ihn. Für ihn ist nur der Eintrag in `docs/offen.md` bestimmt (einfaches Deutsch, keine Code-Begriffe).

## Grundsätze

1. **Nur `regelwerk/` zählt** für Regeln und Zahlen. Nicht aus dem Gedächtnis antworten, nicht aus `docs/konzept.md` oder den JSON-Dateien ableiten. Die sind Umsetzung, nicht Quelle.
2. **`regelwerk/` nie ändern.** Fehler im Regelwerk werden im Repo CQB behoben; hier nur als Regelfrage eintragen („Im Regelwerk klarstellen“).
3. **Nichts erfinden, was wie eine Regel aussieht.** Eine vorläufige Lösung ist immer als solche markiert und eingetragen.
4. **Ideen und Notizen** im Regelwerk (z. B. „Perk-Ideen“, Kommentare, unausformulierte Stichpunkte) gelten nicht.
5. **Erst nachsehen, ob es schon entschieden ist:** `docs/offen.md` (Einträge „Entschieden“ und „Vorläufig“) und die Regelfragen dort. Eine Entscheidung des Nutzers gilt, auch wenn sie im Regelwerk noch nicht nachgetragen ist (dann steht das dabei).

## Ablauf

### 1. Frage scharf stellen
Formuliere die Frage so, dass die Antwort eine Rechnung, eine Liste oder ein Ja/Nein ist. Beispiel: nicht „Wie geht Deckung?“, sondern „Welche Zonen gelten als verdeckt, wenn die Deckung die Brust verdeckt, und was passiert mit einem Treffer auf eine verdeckte Zone?“

### 2. Alle Stellen finden
- Im **Themenverzeichnis** unten die Hauptstelle nachsehen.
- Dann **mit grep über ganz `regelwerk/`** nach dem Begriff und seinen Varianten suchen (Einzahl/Mehrzahl, Verb, Kürzel: „Krit“, „kritisch“; „Stepshield“, „Stepshields“; „DK“, „Durchschlag“). Begriffe tauchen fast immer in mehreren Dateien auf.
- **Jeden Treffer im Zusammenhang lesen** (den ganzen Abschnitt, nicht nur die Zeile).
- **Immer auf Ausnahmen prüfen**, die eine Regel an anderer Stelle ändern:
  - Perks (`Stats, Skills und Perks`, Abschnitte Perks) und deren Rang-Voraussetzungen,
  - Adrenalin-Symptome und Over the Edge (`Adrenalin`),
  - Zustände und Nat. 01 / Nat. 100 (`Würfelmechanik`),
  - Waffen-, Munitions- und Aufsatzbeschreibungen (`Ausrüstung/`),
  - Klassenbeschreibungen (`Klassen`), wenn es um Zugang, Voraussetzungen oder Klassen-Fähigkeiten geht.

### 3. Antwort zusammenstellen
Schreib dir die Antwort in dieser Form auf (im Gespräch, nicht in eine Datei):

```
Regel: <ein Satz>
Ablauf: 1. … 2. … 3. …          (Reihenfolge wie im Regelwerk; Formel, wo es eine gibt)
Zahlen: <Zahl> – steht in public/data/<datei>.json, <Feld>  (oder: fehlt dort noch → neues Feld vorschlagen)
Ausnahmen: <Perk/Symptom/Zustand/Waffe> ändert … (Fundstelle)
Grenzfälle: genau getroffen, 0, Höchstwert, gleichzeitig mit …
Testfälle: Beispiele aus dem Regelwerk wörtlich mit Eingabe → Ergebnis; dazu je Grenzfall ein Fall
Fundstellen: (Datei, Abschnitt) für jede verwendete Stelle
Lücken: <was das Regelwerk nicht beantwortet> → Schritt 4
```

- Rechenbeispiele aus dem Regelwerk sind Pflichttests (`CLAUDE.md`, Tests). Rechne sie nach; geht ein Beispiel mit deiner Lesart nicht auf, ist die Lesart falsch oder das Regelwerk widersprüchlich (→ Schritt 4).
- Jede Zahl gehört nach `public/data/`. Gibt es noch kein Feld dafür, plane es mit ein und führe `docs/datenformat.md` mit.
- Keine Skill-, Perk-, Waffen- oder Klassen-ID im Code. Wirkt ein bestimmter Perk, muss die Wirkung in den Daten beschrieben werden (z. B. `perk_wirkungen` in `regeln.json`).

### 4. Lücken und Widersprüche: vorläufige Lösung
Eine Lücke liegt vor, wenn das Regelwerk eine Frage, die die App beantworten muss, nicht oder nicht eindeutig beantwortet, oder wenn sich zwei Stellen widersprechen.

**Die vorläufige Lösung wählen**, in dieser Rangfolge:
1. Was dem **Wortlaut** am nächsten kommt und alle Beispiele des Regelwerks erfüllt.
2. Was zu **ähnlichen Regeln** passt, die das Regelwerk ausformuliert (Analogie; die Stelle nennen).
3. Was sich **leicht ändern** lässt: am besten eine Zeile in `public/data/`, sonst eine Stelle im Regelkern. Nie das Speicherformat des Charakters davon abhängig machen.
4. Im Zweifel die Lösung, bei der **der Spieler oder die SL übersteuern** kann (Hinweis statt Automatik, abschaltbar, Steps der SL), statt die App etwas fest entscheiden zu lassen.
5. Bei sonst gleichwertigen Lösungen die **einfachere** für den Spieler.

**Nicht vorläufig lösen, sondern den Nutzer fragen**, wenn die Lösung schwer rückgängig zu machen wäre: Sie ändert das Speicherformat, verlangt eine Migration, betrifft viele Stellen oder legt einen Ablauf der Bedienung fest, der im Konzept fehlt.

**Eintragen**, sofort und ohne zu fragen, in `docs/offen.md`, Abschnitt „Regelfragen“ (Format unten). Danach mit der vorläufigen Lösung weiterarbeiten.

**Im Code und in den Tests markieren**, damit sich die Stelle später findet:
- Code: Kommentar `// Regelfrage R<n> (docs/offen.md): vorläufig …` an der Stelle, die die Entscheidung trifft.
- Test: Name enthält `R<n>`, z. B. `it('R12: Wuchttreffer mit 0 Schaden gibt keine Prellung', …)`.
- Daten: steht die vorläufige Zahl in `public/data/`, nennt der Eintrag die Datei und das Feld.

### 5. Abschluss
In der Zusammenfassung an den Nutzer jede neue Regelfrage mit Nummer und einem Satz nennen („Neu offen: R12 …, vorläufig …“). Sonst nichts aus diesem Skill.

## Format der Regelfragen in `docs/offen.md`

Abschnitt `## Regelfragen` (oben in der Datei, unter der Einleitung). Fortlaufende Nummern R1, R2 …; Nummern werden nie neu vergeben. Für den Nutzer geschrieben: einfaches Deutsch, Begriffe wie im Regelwerk, keine Code-Begriffe außer Datei- und Feldname in „Ändern“.

```
### R<n>. <Kurztitel> (<Datum>)
- **Frage:** <was das Regelwerk offen lässt, ein bis zwei Sätze>
- **Stellen:** (<Datei>, <Abschnitt>); (<Datei>, <Abschnitt>)
- **Vorläufig:** <was die App jetzt tut>
- **Andere Möglichkeit:** <die naheliegende Alternative, falls es eine gibt>
- **Ändern:** <was bei anderer Entscheidung anzupassen ist, z. B. „eine Zeile in regeln.json (lage.arme_verdeckt)“ oder „Regelkern, Schaden“>
- **Im Regelwerk klarstellen:** ja/nein
```

Entscheidet der Nutzer:
1. Eintrag bleibt stehen, bekommt oben `**Entschieden (<Datum>):** <Entscheidung>` und wandert unter `### Erledigt` am Ende des Abschnitts.
2. App anpassen; Kommentar `Regelfrage R<n>` im Code entfernen oder auf „entschieden“ ändern, Test umbenennen bzw. anpassen.
3. Ist „Im Regelwerk klarstellen: ja“, bleibt der Hinweis stehen, bis das Regelwerk neu übernommen wurde und die Stelle dort steht.

## Themenverzeichnis

Hauptstellen; weitere Stellen immer per grep suchen (Schritt 2). Dateien in `regelwerk/`; „Stats“ = `Grundmechanik/Stats, Skills und Perks.md`.

**Würfeln und Steps**
- Probe, Krit, Wirkung des Krits, Contested Rolls, Zustände, Nat. 01/100: `Würfelmechanik`
- Steps (Malsteps, Stepshields, Faktoren), Statwert → Zielwert, Krits je Stat: Stats (Anwendung, Steps, Krits)
- Skillproben, Skill austauschen: Stats (Skills, Skillproben)
- Krit-Schwelle: `Würfelmechanik` (Krit), Stats, `Adrenalin`, `Kampfsystem`

**Charakter**
- Stats, Ränge, Auswirkungen der Stats (HP, Haltezahl, Wurfweite …): Stats (Stats, Stats und ihre Auswirkung)
- Verteilung, Stats dauerhaft verändern, Statrank-Up: Stats (Verteilung)
- Skills und Gruppen, exklusive Skills: Stats (Liste von Skills)
- Perks, Rang und Voraussetzungen, Perks für Grundwerte, Kampf-, Kampfkunst-, exklusive, allgemeine Perks: Stats (Perks)
- Erstellung Schritt für Schritt, Grundwerte: `Charaktererstellung`
- Charakterpunkte, Klassenwechsel: `Charakteraufstieg`
- Klassen: Laufbahnen, Stufen, Spezialisierungen, zweite Spezialisierung, Meister, Rank-Set, Beförderung, Blueprint (Stats/Skills/Perks), die 33 Klassen: `Klassen`
- Startgeld, Schulden, Coup, Vertrag, Gehalt: `Schulden, Coups und Verträge`, `Klassen`

**Gefecht**
- Action Economy, Mainaction, Konzentration, Nachladen, Waffe wechseln, Bewegung, Standwechsel: `Kampfsystem` (Action Economy, Aktionen)
- Initiative, Breakaction, Reaktion und Antizipation: `Kampfsystem` (Breakaction …), Stats, `Adrenalin`
- Treffen, Haltezahl, Schrotflinten, Ladehemmung, Schießen in den Nahkampf: `Kampfsystem` (Treffen); Haltezahl auch Stats, `Schusswaffen (tragbar)`
- Lage (Malsteps und Stepshields der Lage): `Kampfsystem` (Lage)
- Werfen: `Kampfsystem` (Werfen), `Nahkampfwaffen`
- Nahkampf: Länge der Waffe, mehrere Angreifer, Stand, Trefferzone, Schaden, Krit: `Kampfsystem` (Nahkampf)
- Krit-Folgen: `Kampfsystem` (Krit-Folgen)
- Sehen, Hören, Lautstärken, Umstände, Wahrnehmungs-Skills: `Wahrnehmung`

**Adrenalin**
- Leiter, Steps, Symptome, Over the Edge, vor dem Gefecht, Anstieg, Senken, Verbündete verschieben, nach dem Gefecht, Adrenalinschock: `Adrenalin`
- Adrenalin durch Explosionen: `Sprengwirkung` (Adrenalin)
- Ruhepuls: `Adrenalin`, `Kampfsystem`, `Würfelmechanik`

**Schaden und Heilung**
- Schadensablauf: Schutz prüfen, Durchschlag (DK gegen Schutzwert), Wuchttreffer, stumpfe Treffer, Stagger: `Schaden, Blutung und Verletzungen` (Schadensablauf)
- Lebenspunkte, Kampfunfähigkeit: `Schaden, Blutung und Verletzungen`; Kampfunfähig auch `Körperzonen`, Stats, `Würfelmechanik`
- Blutung (normal, kritisch), Versorgen, Heilung, Prellungen, HP zurückgewinnen, Wunden heilen: `Schaden, Blutung und Verletzungen`
- Körperzonen: `Körperzonen`
- Deckung, Rüstung (Westen, Helme, Schutzanzug), ballistischer Schild: `Ausrüstung/Deckung und Rüstung`

**Ausrüstung**
- Schusswaffen: Begriffe, Zustand, Aufsätze, Magazine (auch Schnelllader, Ladestreifen), Blaupause, einzelne Waffen, Werfer: `Ausrüstung/Schusswaffen (tragbar)`
- Munition: Unterschall, Schrot, Gummi: `Ausrüstung/Munitionstypen`
- Nahkampfwaffen (auch Wurfmesser, Wurfaxt; Wurf-Reichweite): `Ausrüstung/Nahkampfwaffen`
- Granaten und Geschosse: `Ausrüstung/Sprengwaffen`
- Explosion: Landepunkt, Zündung, Bereiche, Splitter, Druckwelle, Hohlladung, Blendung, Rauch, Reizgas: `Grundmechanik/Sprengwirkung`
- Geldwert, Preis, Vorratslevel: in jeder Ausrüstungsdatei (Begriffserklärung, Blaupause); Beschaffen: Stats (Skills)

## Wenn das Regelwerk neu übernommen wurde

Das Themenverzeichnis prüfen (neue oder umbenannte Abschnitte: `grep -n '^#' regelwerk/**/*.md`) und anpassen. Alle Regelfragen mit „Im Regelwerk klarstellen: ja“ gegen den neuen Stand prüfen; was jetzt im Regelwerk steht, nach „Erledigt“ verschieben und die App angleichen.
