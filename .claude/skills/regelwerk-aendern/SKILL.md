---
name: regelwerk-aendern
description: Entschiedene Regelfragen aus docs/offen.md ins Regelwerk-Repo CQB (GitHub fheilimei/CQB) eintragen direkt auf main hochladen und danach die neue Fassung nach regelwerk/ übernehmen. Laden, wenn der Nutzer sagt „Trag die entschiedenen Regelfragen ins Regelwerk ein“, „Regelwerk ändern“ oder /regelwerk-aendern. Optional mit Nummern (z. B. /regelwerk-aendern R30 R31).
---

# Regelwerk ändern

Überträgt entschiedene Regelfragen aus `docs/offen.md` in das Regelwerk im Repo **CQB** (`fheilimei/CQB`, Zweig `main`). Änderungen werden direkt auf `main` hochgeladen (so vom Nutzer gewünscht, 18.11.2026).

`regelwerk/` in diesem Repo wird nicht von Hand bearbeitet, sondern am Ende nach Schritt 5 als Ganzes neu übernommen.

## 1. Kandidaten finden

In `docs/offen.md` sind das alle Einträge mit **„Im Regelwerk klarstellen: ja, noch offen“**, die eine Zeile „Entschieden“ haben. Wurden Nummern übergeben, nur diese. Einträge ohne Entscheidung werden nie übertragen.

Gibt es keine Kandidaten, sag das in einem Satz und hör auf.

## 2. Repo holen

```bash
D=/home/fritz/Claude/CQB
[ -d "$D" ] && git -C "$D" checkout main && git -C "$D" pull --rebase || gh repo clone fheilimei/CQB "$D"
```

Ordner, die mit `Sicherungskopie_` beginnen, und `.base`-Dateien nicht anfassen.

## 3. Eintragen

Für jeden Kandidaten:
- Die Stelle aus „Stellen:“ suchen (Datei und Abschnitt im Ordner `Grundmechanik/`, `Ausrüstung/` oder `Charaktererstellung und Aufstieg/`).
- Die Entscheidung **im Stil des umgebenden Textes** einarbeiten: gleiche Begriffe, gleiche Formatierung, knapp. Einen widersprechenden Satz ersetzen, nicht stehen lassen. Keine Hinweise wie „(entschieden am …)“ und keine Verweise auf die App.
- Nur das ändern, was die Entscheidung verlangt. Keine Umformulierungen nebenbei.
- Ist die passende Stelle unklar oder müsste ein größerer Abschnitt umgebaut werden: den Eintrag auslassen und den Nutzer am Ende fragen.

## 4. Hochladen

Ein Commit pro Regelfrage, Nachricht auf Deutsch, zum Beispiel „Deckung: Rumpfzonen werden einzeln verdeckt (R31)“. Danach:

```bash
git -C "$D" pull --rebase && git -C "$D" push
```

## 5. In der App nachführen

1. In `docs/offen.md` bei jedem übertragenen Eintrag „noch offen“ ersetzen durch **„eingetragen (<Datum>)“**.
2. Das Regelwerk neu übernehmen nach CLAUDE.md, Abschnitt „Regelwerk neu übernehmen“ (Schritte 1–3). Dieser Skill gilt als Auftrag dafür. Quelle ist das eben hochgeladene `/home/fritz/Claude/CQB`. Die erwarteten Unterschiede sind die eigenen Änderungen; weitere Unterschiede (vom Nutzer im Regelwerk geändert) einzeln prüfen und im Bericht nennen.
3. Tests grün, dann Commit und Push in diesem Repo nach den Regeln in CLAUDE.md.

## 6. Bericht an den Nutzer

In einfachem Deutsch:
- je Regel ein Satz: was jetzt wo im Regelwerk steht
- ausgelassene Einträge mit Grund
- was sich durch die Übernahme in der App ändert, vor allem durch Unterschiede, die nicht aus diesem Durchlauf stammen
