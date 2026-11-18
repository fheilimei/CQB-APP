---
name: regelwerk-aendern
description: Entschiedene Regelfragen aus docs/offen.md ins Regelwerk-Repo CQB (GitHub fheilimei/CQB) eintragen und als Pull Request vorschlagen. Laden, wenn der Nutzer sagt „Trag die entschiedenen Regelfragen ins Regelwerk ein“, „Regelwerk ändern“ oder /regelwerk-aendern. Optional mit Nummern (z. B. /regelwerk-aendern R30 R31).
---

# Regelwerk ändern

Überträgt entschiedene Regelfragen aus `docs/offen.md` in das Regelwerk im Repo **CQB** (`fheilimei/CQB`, Zweig `main`). Das Regelwerk ist der Text des Nutzers. Deshalb werden Änderungen nur als **Pull Request** vorgeschlagen und nie direkt auf `main` geschrieben.

`regelwerk/` in diesem Repo bleibt unangetastet. Es ist nur eine Kopie.

## 1. Kandidaten finden

In `docs/offen.md` sind das alle Einträge mit **„Im Regelwerk klarstellen: ja, noch offen“**, die eine Zeile „Entschieden“ haben. Wurden Nummern übergeben, nur diese. Einträge ohne Entscheidung werden nie übertragen.

Gibt es keine Kandidaten, sag das in einem Satz und hör auf.

## 2. Repo holen

```bash
D=/home/fritz/Claude/CQB
[ -d "$D" ] && git -C "$D" checkout main && git -C "$D" pull --rebase || gh repo clone fheilimei/CQB "$D"
git -C "$D" checkout -b regelfragen-$(date +%Y%m%d-%H%M)
```

Ordner, die mit `Sicherungskopie_` beginnen, und `.base`-Dateien nicht anfassen.

## 3. Eintragen

Für jeden Kandidaten:
- Die Stelle aus „Stellen:“ suchen (Datei und Abschnitt im Ordner `Grundmechanik/`, `Ausrüstung/` oder `Charaktererstellung und Aufstieg/`).
- Die Entscheidung **im Stil des umgebenden Textes** einarbeiten: gleiche Begriffe, gleiche Formatierung, knapp. Einen widersprechenden Satz ersetzen, nicht stehen lassen. Keine Hinweise wie „(entschieden am …)“ und keine Verweise auf die App.
- Nur das ändern, was die Entscheidung verlangt. Keine Umformulierungen nebenbei.
- Ist die passende Stelle unklar oder müsste ein größerer Abschnitt umgebaut werden: den Eintrag auslassen und den Nutzer am Ende fragen.

## 4. Vorschlagen

Ein Commit pro Regelfrage, Nachricht auf Deutsch, zum Beispiel „Deckung: Rumpfzonen werden einzeln verdeckt (R31)“. Danach:

```bash
git -C "$D" push -u origin HEAD
gh pr create -R fheilimei/CQB --base main --title "Regelfragen aus der App: R…, R…" --body "<je Regel ein Satz: was steht jetzt wo>"
```

## 5. In der App nachführen

In `docs/offen.md` bei jedem übertragenen Eintrag „noch offen“ ersetzen durch **„vorgeschlagen (PR #<Nummer>, <Datum>)“**. Commit und Push in diesem Repo nach den Regeln in CLAUDE.md.

## 6. Bericht an den Nutzer

In einfachem Deutsch:
- je Regel ein Satz: was jetzt wo im Regelwerk steht
- der Link zum Pull Request und der Hinweis: „Auf GitHub durchlesen und mit ‚Merge‘ annehmen.“
- ausgelassene Einträge mit Grund
- Nach dem Annehmen kann der Nutzer sagen „Übernimm das aktuelle Regelwerk“. Dann bei diesen Einträgen „vorgeschlagen“ durch „eingetragen“ ersetzen.
