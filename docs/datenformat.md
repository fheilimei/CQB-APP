# CQB-App: Datenformat

**Status:** Entwurf, Stand 16.11.2026; mit den Dateien unter `public/data/` abgeglichen. Gehört zu [konzept.md](konzept.md).

Alle Spieldaten liegen als JSON unter `public/data/`. Geprüft werden sie von `src/lib/daten/pruefen.ts` (Test `tests/daten.test.ts`). Gespeicherte Charaktere folgen dem Schema in [§ Charakter](#charakter). Die Beispiele sind vollständig ausgefüllt; sie zeigen das Format, nicht den vollständigen Datenbestand.

---

## Allgemeine Regeln

- **Kodierung:** UTF-8. Anzeigenamen mit Umlauten im Feld `name`; Schlüssel und `id` nur `a–z`, `0–9`, `_` (z. B. `rueckstosskontrolle`).
- **Referenzen** zwischen Dateien laufen über `id`.
- **Malsteps** werden immer als **positive Zahl** gespeichert (Regelwerk: „−2“ → `2`; „+0“ → `0`).
- **Nicht verfügbar** („n/A“) ist `null`.
- **Vorläufige Werte** tragen `"vorlaeufig": true`, wo es um einen einzelnen Eintrag geht. Für die App ohne Wirkung; dient der Übersicht.
- **Versionsfeld:** Jede Datei hat oben `"version"` (Datenstand) und eine Liste unter `"eintraege"` bzw. ein Objekt mit den Werten.

### Dateien

| Datei | Inhalt |
| --- | --- |
| `regeln.json` | alle Regelkonstanten |
| `stats.json` | die neun Stats mit Gruppe |
| `skills.json` | Skills mit Stat |
| `perks.json` | Perks mit Rang (= Kosten), Voraussetzungen, Wirkung |
| `koerperzonen.json` | Zonen, W8-Nummer, Multiplikator, Folgen |
| `munition.json` | Kaliber und Munitionstypen mit DK/MW |
| `waffen.json` | Waffen |
| `schutz.json` | Deckung und Rüstung |
| `aufsaetze.json` | Waffenaufsätze mit Anschluss und Wirkung; Zubehör (Schnelllader, Ladestreifen) |
| `nahkampfwaffen.json` | Nahkampfwaffen mit Art, Länge, MW, DK |
| `wurf_und_sprengwaffen.json` | Wurfwaffen, Granaten und Geschosse (Vorratsgegenstände) |
| `klassen.json` | Stufen, Laufbahnen und Klassen mit Mindestskills, Zugang, Vorratslevel und Gehalt |
| `darstellung.json` | Zeichen und Farben der Herkunftsmarkierung |

---

## regeln.json

Alle Zahlen, die eine Regel festlegt. Die App liest sie zur Laufzeit; der Code enthält keine dieser Zahlen.

```json
{
  "version": "2026-11-18",
  "raenge": { "S": 90, "A": 80, "B": 70, "C": 60, "D": 50, "E": 40, "F": 30 },
  "abweichung": { "min": -9, "max": 9 },
  "steps": {
    "faktoren": [1, 0.85, 0.6375, 0.414375, 0.22790625, 0.1025578125],
    "keine_probe_ab": 6,
    "skill_null_malsteps": 1
  },
  "leiter": {
    "min": -3,
    "max": 4,
    "stufen": {
      "-3": { "name": "Ruhepuls 3", "gruppe_a": -2, "gruppe_b": 2, "symptome": ["r1", "r2"] },
      "-2": { "name": "Ruhepuls 2", "gruppe_a": -1, "gruppe_b": 1, "symptome": ["r1", "r2"] },
      "-1": { "name": "Ruhepuls 1", "gruppe_a": 0, "gruppe_b": 0, "symptome": ["r1"] },
      "0":  { "name": null, "gruppe_a": 0, "gruppe_b": 0, "symptome": [] },
      "1":  { "name": "Adrenalin 1", "gruppe_a": 0, "gruppe_b": 0, "symptome": ["a1"] },
      "2":  { "name": "Adrenalin 2", "gruppe_a": 1, "gruppe_b": -1, "symptome": ["a1", "a2"] },
      "3":  { "name": "Adrenalin 3", "gruppe_a": 2, "gruppe_b": -2, "symptome": ["a1", "a2"] },
      "4":  { "name": "Over the Edge", "gruppe_a": -2, "gruppe_b": -2, "symptome": ["a1", "a2"], "over_the_edge": true, "symptome_nur_verluste": true }
    },
    "start": {
      "normal":     { "krit": -1, "gelungen": 0, "misslungen": 1 },
      "ueberrascht": { "krit": 0, "gelungen": 1, "misslungen": 2 }
    },
    "ueberrascht_breakaction_malsteps": 1,
    "ausloeser": [
      { "id": "beschossen", "name": "beschossen" },
      { "id": "nahkampf", "name": "im Nahkampf angegriffen" },
      { "id": "getroffen", "name": "getroffen" },
      { "id": "verletzt", "name": "verletzt" },
      { "id": "stagger", "name": "Stagger erlitten" },
      { "id": "geschossen", "name": "selbst auf jemanden geschossen" },
      { "id": "verbuendeter", "name": "Verbündeter ausgeschaltet" },
      { "id": "sonstiges", "name": "sonstiges (SL)" }
    ],
    "rundenende": { "malsteps_je_ausloeser": 1, "anstieg": 1, "probe": { "krit": -1, "gelungen": 0, "misslungen": 1 } },
    "senken": { "krit": -2, "gelungen": -1, "misslungen": 0 },
    "verschieben": { "krit": 2, "gelungen": 1, "misslungen": 0 },
    "proben": {
      "nerve_start":   { "stat": "nerve",   "skill": "selbstbeherrschung" },
      "nerve_anstieg": { "stat": "nerve",   "skill": "selbstbeherrschung" },
      "nerve_senken":  { "stat": "nerve",   "skill": "selbstbeherrschung" },
      "verschieben":   { "stat": "empathy", "skill": "fuehrung" }
    }
  },
  "symptome": {
    "a1": { "gewinn": "Schmerz ignorieren: kein Stagger", "verlust": "Keine Ansage einer Trefferzone",
            "wirkung": { "gewinn": "kein_stagger", "verlust": "keine_ansage" } },
    "a2": { "gewinn": "Sprint: zweite Bewegung", "verlust": "Tunnelblick: keine Antizipation, Breakaction nur gegen Gesehene",
            "wirkung": { "gewinn": "zweite_bewegung", "verlust": "keine_antizipation" } },
    "r1": { "gewinn": "Ruhige Hand: Zielen als Mainaction", "verlust": "Empfindlich: Stagger schon bei Schaden = Schmerzresistenz",
            "wirkung": { "gewinn": "zielen_als_main", "verlust": "stagger_ab_gleich" }, "vorlaeufig": true },
    "r2": { "gewinn": "Weitblick: Information gilt eine Runde jünger", "verlust": "Kein Hechten",
            "wirkung": { "gewinn": "weitblick", "verlust": "kein_hechten" }, "vorlaeufig": true }
  },
  "zustaende": {
    "adrenalinschock": { "malsteps": 3, "ende_ruhe_stunden": 4, "mit_perk": { "eiserne_nerven": 2 } },
    "kampfunfaehig": { "malsteps_ausserhalb_gefecht": 3, "gilt_nicht_fuer": ["erholungsprobe"], "mit_perk": { "durchbeissen": 2 } },
    "geblendet": { "sichtstufe": "keine", "malsteps_mit_gereizt_addieren": true },
    "gereizt": { "malsteps": 2, "probe": "grit" }
  },
  "initiative": { "stat": "decisiveness", "skill": null, "krit_break_extra": 1, "ueberrascht_malsteps": 1, "ueberrascht_mit_perk": { "entschlossen": 0 } },
  "breakaction": {
    "reaktion": { "stat": "twitch", "skill": "reflexe", "malsteps": { "gesehen": 0, "gehoert": 1 } },
    "antizipation": { "stat": "intellect", "skill": "lagegespuer",
                      "malsteps_guete": { "gesehen": 0, "gehoert": 1, "funk": 1 },
                      "malsteps_alter": { "diese_runde": 0, "letzte_runde": 1, "aelter": 2 }, "vorlaeufig": true }
  },
  "konzentration": {
    "leicht": { "bewegung_max": "gehen", "standwechsel": true },
    "voll": { "bewegung_max": null, "standwechsel": false },
    "aktionen": { "werfer_nachladen": "voll", "gurt_wechseln": "voll", "einzeln_laden": "leicht", "erste_hilfe": "voll", "operation": "voll",
                  "waffe_ruecken": "leicht", "waffe_rucksack": "leicht", "aufsatz_im_gefecht": "leicht" }
  },
  "nachladen": { "einzeln_patronen": 2 },
  "waffe_wechseln": {
    "trageorte": {
      "schlinge": "ohne", "weste": "ohne", "holster": "main", "guertel": "main",
      "ruecken": { "aktion": "main", "konzentration": "leicht" },
      "rucksack": { "aktion": "main", "konzentration": "leicht", "runden": 2 }
    }
  },
  "zielen": { "stepshields": 1 },
  "staende": [
    { "id": "stehen", "name": "Stehen", "adjektiv": "stehend" },
    { "id": "hocke", "name": "Hocke", "adjektiv": "hockend" },
    { "id": "liegen", "name": "Liegen", "adjektiv": "liegend", "liegend": true, "kein_hechten": true }
  ],
  "hechten": { "staende": ["hocke", "liegen"] },
  "perk_wirkungen": {
    "cqb": [ { "art": "reichweite_frei", "baender": ["bedraengt"] } ],
    "feuer_in_bewegung": [ { "art": "eigene_bewegung_weniger", "malsteps": 1 } ],
    "atemkontrolle": [ { "art": "zielen_stepshields", "stepshields": 2, "bedingung": "liegend_oder_aufgelegt" } ],
    "gezielter_schuss": [ { "art": "zielen_ohne_reichweite", "bedingung": "ohne_bewegung" } ],
    "triple_tap": [ { "art": "folgetreffer_zonen", "ansage": "bauch", "zonen": ["brust", "kopf"] } ],
    "fingerfertig": [ { "art": "einzeln_patronen", "patronen": 3 } ],
    "schnell_nachladen": [ { "art": "nachladen_als_break" } ],
    "schnellzieher": [ { "art": "ziehen_ohne_aktion", "trageorte": ["holster", "guertel"] } ],
    "quickthrow": [ { "art": "werfen_als_break" } ],
    "schutzreflex": [ { "art": "eingreifen_als_break" } ]
  },
  "bewegung": {
    "arten": {
      "kriechen": { "stand": ["liegen"], "meter": 1, "hoerbar": "bedraengt" },
      "gehen":    { "stand": ["stehen", "hocke"], "meter": { "stehen": 3, "hocke": 2 }, "hoerbar": "nah" },
      "laufen":   { "stand": ["stehen"], "meter": 6, "hoerbar": "mittel" },
      "rennen":   { "stand": ["stehen"], "meter": 9, "hoerbar": "weit" }
    },
    "hechten": { "meter": 2, "hoerbar": "mittel" },
    "reihenfolge": ["kriechen", "gehen", "laufen", "rennen"]
  },
  "lage": {
    "eigene_bewegung": { "kriechen": 1, "gehen": 1, "laufen": 2, "hechten": 2, "rennen": 4 },
    "gruppen": [
      { "id": "entfernung", "name": "Entfernung zum Ziel", "auswahl": "eins", "zuruecksetzen": "neues_ziel", "quelle": "reichweite" },
      { "id": "ziel_bewegung", "name": "Bewegung des Ziels", "auswahl": "eins", "zuruecksetzen": "rundenende" },
      { "id": "ziel_stand", "name": "Stand des Ziels", "auswahl": "eins", "zuruecksetzen": "neues_ziel" },
      { "id": "ziel_groesse", "name": "Größe des Ziels", "auswahl": "eins", "zuruecksetzen": "neues_ziel" },
      { "id": "schuetze", "name": "Schütze", "auswahl": "schalter", "zuruecksetzen": "rundenende" }
    ],
    "umstaende": [
      { "id": "ziel_steht", "gruppe": "ziel_bewegung", "name": "ruhend oder gehend", "malsteps": 0, "standard": true },
      { "id": "ziel_laeuft", "gruppe": "ziel_bewegung", "name": "laufend", "malsteps": 1 },
      { "id": "ziel_rennt", "gruppe": "ziel_bewegung", "name": "rennend oder hechtend", "malsteps": 2 },
      { "id": "ziel_nahkampf", "gruppe": "ziel_bewegung", "name": "im Nahkampf", "malsteps": 1, "hinweis": "Fehlschuss trifft einen anderen Beteiligten", "nicht_fuer": ["werfer", "sprengwaffe"], "fehlschuss_trifft_beteiligten": true },
      { "id": "ziel_stehend", "gruppe": "ziel_stand", "name": "stehend", "malsteps": 0, "standard": true },
      { "id": "ziel_hocke", "gruppe": "ziel_stand", "name": "hockend", "malsteps": 1, "nicht_in_baendern": ["bedraengt"] },
      { "id": "ziel_liegt", "gruppe": "ziel_stand", "name": "liegend", "malsteps": 2, "nicht_in_baendern": ["bedraengt"] },
      { "id": "ziel_liegt_von_oben", "gruppe": "ziel_stand", "name": "liegend, von oben beschossen", "malsteps": 0 },
      { "id": "ziel_normal", "gruppe": "ziel_groesse", "name": "Person", "malsteps": 0, "standard": true },
      { "id": "ziel_kopfgross", "gruppe": "ziel_groesse", "name": "kopfgroß", "malsteps": 2 },
      { "id": "ziel_handgross", "gruppe": "ziel_groesse", "name": "handgroß", "malsteps": 3 },
      { "id": "ziel_gross", "gruppe": "ziel_groesse", "name": "groß, Gegenstand (Fahrzeug, Tür)", "stepshields": 1 },
      { "id": "aufgelegt", "gruppe": "schuetze", "name": "Waffe aufgelegt", "stepshields": 1, "nur_ohne_eigene_bewegung": true, "nicht_fuer": ["werfen"] }
    ],
    "vorlaeufig": true
  },
  "sicht": {
    "stufen": [
      { "id": "klar", "name": "klar", "erkennen_bis": null, "malsteps": 0 },
      { "id": "eingeschraenkt", "name": "eingeschränkt", "erkennen_bis": "weit", "malsteps": 1 },
      { "id": "schlecht", "name": "schlecht", "erkennen_bis": "nah", "malsteps": 2 },
      { "id": "keine", "name": "keine", "erkennen_bis": "keins", "malsteps": 3 }
    ],
    "gilt_fuer": ["schiessen", "werfen", "nahkampf", "reaktion_gesehen", "ladehemmung_beheben"],
    "vorlaeufig": true
  },
  "lautstaerke": {
    "schuss": { "normal": "fern", "schalldaempfer": "weit", "schalldaempfer_unterschall": "mittel" },
    "explosion": "fern",
    "stimme": { "fluestern": "bedraengt", "sprechen": "nah", "rufen": "weit" },
    "umstaende": { "lauter_untergrund": 1, "laute_umgebung": -1, "hindernis": -1 },
    "vorlaeufig": true
  },
  "ladehemmung": {
    "zustand_zuschlag": { "zuverlaessig": { "A": 0, "B": 1, "C": 3, "D": 6 }, "normal": { "A": 0, "B": 2, "C": 5, "D": 9 } },
    "trommelmagazin_zuschlag": 2,
    "schwer_bei_wurf": 100,
    "beheben": { "stat": "control" },
    "schwer_beheben": { "stat": "intellect", "skill": "mechanik", "minuten": 10, "zustand_stufen": 1 },
    "vorlaeufig": true
  },
  "nahkampf": {
    "stat": "agility", "skill": "nahkampf",
    "malsteps_je_weitere_verteidigung": 1,
    "lange_waffe_in_armeslaenge": 1,
    "ueberlegener_stand_malsteps": 1,
    "stand_schlaegt": { "liegen": "stehen", "stehen": "hocke", "hocke": "liegen" }
  },
  "werfen": { "stat": "agility", "ueber_wurfweite_malsteps": 2, "kochen_malsteps": 1 },
  "krit_folgen": [
    { "probe": "schiessen", "text": "Spalte „Krit“ der getroffenen Zone; nur der erste Schuss" },
    { "probe": "initiative", "text": "eine zusätzliche Breakaction in dieser Runde", "vorlaeufig": true },
    { "probe": "nahkampfangriff", "text": "scharf: Spalte „Krit“ der Zone; stumpf: Stagger" },
    { "probe": "nahkampfverteidigung", "text": "Abstand bestimmen: sofort in Armeslänge oder aus dem Band bedrängt, ohne Aktion" },
    { "probe": "wurfaktion", "text": "Wurfwaffe: Krit der Zone; Sprengwaffe: genau am Zielpunkt" },
    { "probe": "ladehemmung_beheben", "text": "verbraucht keine Mainaction" },
    { "probe": "nerve_anstieg", "text": "Leiter sinkt um 1" },
    { "probe": "nerve_senken", "text": "Leiter sinkt um 2" },
    { "probe": "verbuendete_verschieben", "text": "Verschiebung um 2" }
  ],
  "aktionen": { "main": 1, "break": 1, "bewegung": 1, "stand": 1, "over_the_edge_gesamt": 1, "sprint_bewegung": 2 },
  "schiessen": {
    "ansage_malsteps": { "rumpf": 1, "zone": 2 },
    "rueckstoss_stepshields": { "liegen": 1 },
    "stat": "control",
    "haltezahl": { "stat": "brawn", "skill": "rueckstosskontrolle" },
    "ausloeser": "geschossen",
    "haltezahl_max": 10,
    "schrot_rumpf_start": "brust",
    "garbenfaktor_aus_feuerrate": [ { "bis": 10, "faktor": 1 }, { "bis": 20, "faktor": 2 }, { "bis": null, "faktor": 3 } ],
    "reichweitenbaender": [
      { "id": "bedraengt", "name": "bedrängt", "beschreibung": "bis 2 m (Armeslänge, Nahkampf)" },
      { "id": "nah", "name": "nah", "beschreibung": "bis 15 m" },
      { "id": "mittel", "name": "mittel", "beschreibung": "16–30 m" },
      { "id": "weit", "name": "weit", "beschreibung": "31–100 m" },
      { "id": "sehr_weit", "name": "sehr weit", "beschreibung": "101–250 m" },
      { "id": "fern", "name": "fern", "beschreibung": "ab 251 m" }
    ]
  },
  "lebenspunkte": { "kampfunfaehig_bei": 0, "tot_bei": -1 },
  "geld": {
    "ersparnisse": 300,
    "schulden": { "klein": 500, "mittel": 1000, "gross": 2000, "rueckzahlung_faktor": 1.5 },
    "coup": { "klein": 400, "mittel": 800, "gross": 1600 },
    "einstiegsgehalt_ab_stufe": 2,
    "session_punkte": 5
  },
  "blutung": {
    "normal": { "frist_minuten": 10, "schaden_anteil": 0.5, "runden": "auf" },
    "kritisch_glied": { "frist_minuten": 5 },
    "kritisch_rumpf": { "frist_minuten": 1, "druckverband_faktor": 2 }
  },
  "heilung": {
    "erholungsprobe": { "stat": "grit", "krit": 2, "gelungen": 1, "misslungen": 0 },
    "malsteps_je_unversorgte_wunde": 1,
    "pflege_stepshields": { "krit": 2, "gelungen": 1 },
    "heildauer_tage_je_schaden": { "normal": 1, "kritisch": 7 },
    "nachsorge_faktor": { "krit": 0.5, "gelungen": 1, "misslungen": 2, "keine": 2 }
  },
  "grundwerte": {
    "hp": 8,
    "schmerzresistenz": 1,
    "nahkampfschaden": 1,
    "wurfweite_band": "nah"
  },
  "aufstieg": { "statrank_up_kosten": 1, "skill_level_kosten": 1, "skill_min": 0, "skill_max": 5, "rang_max": "S" },
  "wuerfel": { "w100_null_null": 100, "w10_null": 10 },
  "krit": { "schwelle_min": 0, "zielwert_100_zehner": 10 },
  "deckung": { "arme_mit": "brust", "arme": ["arm_r", "arm_l"] },
  "sprengwirkung": {
    "splitter_liegend_anteil": 0.5,
    "landepunkt": { "krit": "genau am Zielpunkt", "erfolg": "bedrängt zum Zielpunkt; die genaue Stelle legt die SL fest",
                    "misserfolg": "nah zum Zielpunkt, in der Richtung des W8" },
    "richtungen": ["zu kurz", "zu kurz links", "links", "zu weit links", "zu weit", "zu weit rechts", "rechts", "zu kurz rechts"]
  },
  "waffenzustand": { "stufen": ["A", "B", "C", "D"], "neu": "A",
                     "namen": { "A": "neuwertig", "B": "gebraucht", "C": "verschlissen", "D": "schrottreif" },
                     "preis_viertel": { "A": 4, "B": 3, "C": 2, "D": 1 }, "vorlaeufig": true },
  "reizgas": { "probe": "grit", "wolke_baender": ["bedraengt", "nah"], "dauer_runden": 20 }
}
```

- **`aufstieg`**, **`wuerfel`**, **`krit`**: Kosten und Grenzen des Aufstiegs, Lesart der Würfel (0+0 beim W100 = 100, 0 beim W10 = 10), Untergrenze der Krit-Schwelle. **`waffenzustand.preis_viertel`**: Viertel der Geldwertspanne je Zustand (4 = oberstes). **`reizgas`**: Probe und Wolke der Gasgranate (Sprengwirkung, Reizgas).

- **`steps.faktoren`**: ungerundete Faktoren aus den Abschlägen 15 %, 25 %, 35 %, 45 %, 55 % auf die jeweils vorherige Stufe (Regelwerk: Stats, Skills und Perks, Steps). Die gerundeten Werte der Tabelle im Regelwerk (0,638; 0,414 …) treffen dessen Beispiel 35 → 15 nicht ([offen.md](offen.md), Schritt 2).
- **`leiter.rundenende`**: Malsteps der Nerve-Probe je Auslöser, Anstieg ohne Probe, Änderung je Ergebnis der Probe. **`leiter.senken`**, **`leiter.verschieben`**: Änderung bzw. Betrag je Ergebnis. Positive Zahl = steigen.
- **`leiter.proben`**: Stat und Skill der Proben rund um Adrenalin und Ruhepuls (Gefechtsbeginn, Anstieg, Senken, Verbündete verschieben). Der Schlüssel ist die Probenart; sie braucht einen Namen in `darstellung.json` (`proben`), damit Modifikatoren darauf zielen können. Alle vier Einträge sind Pflicht.
- **`initiative.ueberrascht_mit_perk`**: Perks, die die Malsteps der Überraschung auf die Initiative ersetzen (kleinster Wert gilt), z. B. Entschlossen → 0.
- **`symptome.*.wirkung`**: was das Symptom im Regelkern bewirkt. Erlaubte Werte: `kein_stagger`, `keine_ansage`, `zweite_bewegung`, `keine_antizipation`, `zielen_als_main`, `stagger_ab_gleich`, `weitblick`, `kein_hechten`. Ein neues Symptom mit bekannter Wirkung braucht keine Codeänderung. **`symptome_nur_verluste`** (Over the Edge): Gewinne entfallen.
- **`zustaende.*.mit_perk`**: Perk-ID → Malsteps, die mit diesem Perk statt des Standards gelten.
- **`schiessen.schrot_rumpf_start`**: Zone der ersten Schrotkugel nach der Ansage „Rumpf“. **`deckung`**: Ist `arme_mit` verdeckt, gelten auch die Zonen in `arme` als verdeckt (Deckung und Rüstung, Deckung). **`sprengwirkung.splitter_liegend_anteil`**: Anteil der Splitterzahl für Liegende, abgerundet.

**Leiter:** `name` ist der Text in der Oberfläche; `null` bei 0 heißt: keine Anzeige. Das Wort „Leiter“ erscheint dort nie ([konzept.md § 2](konzept.md#texte-in-der-oberfläche)). **Vorzeichen:** In `gruppe_a`/`gruppe_b` bedeutet eine positive Zahl Stepshields, eine negative Malsteps.

- **Breakaction** ohne Eintrag in `krit_folgen`: Ein Krit setzt nur in der Rangfolge vor alle Erfolge (Regelwerk: Kampfsystem, Krit-Folgen).
- **Zweibein, Vordergriff, Kompensator** wirken über ihre Modifikatoren in `aufsaetze.json` auf die Haltezahl, nicht über `rueckstoss_stepshields`. Die Schlüssel von `rueckstoss_stepshields` sind Stand-IDs aus `staende`.
- **`schiessen.stat`**: Stat der Trefferprobe; der Skill ist der Waffenskill, dessen `waffenkategorien` (skills.json) die Kategorie der Waffe enthält. **`schiessen.haltezahl`**: Stat und Skill der Haltezahl. **`schiessen.ausloeser`**: Auslöser aus `leiter.ausloeser`, den ein abgegebener Schuss setzt.
- **`ladehemmung.beheben`**: Stat der Probe für eine einfache Ladehemmung (Skill: Waffenskill). **`ladehemmung.schwer_beheben`**: Probe, Dauer und Zustandsverlust bei einer schweren Ladehemmung (nur außerhalb des Gefechts).
- **`staende`**: eigener Stand in der Aktionsleiste; der erste ist der Start eines Gefechts. `name` für Knöpfe („Liegen“), `adjektiv` für Sätze („Dein Stand: liegend“). `kein_hechten`: aus diesem Stand ist Hechten gesperrt. `liegend`: zählt als liegend (Atemkontrolle). **`hechten.staende`**: Stände, in die gehechtet wird.
- **`bewegung.reihenfolge`**: Bewegungsarten von langsam nach schnell, für „höchstens Gehen“ (Konzentration, Schutzanzug, Schild) und für Sprint (die schnellere zählt).
- **`waffe_wechseln.trageorte`**: Kosten je Trageort: `ohne`, `main` oder `{ aktion, konzentration, runden }`. Ein Wechsel kostet den teureren der beiden Trageorte (alte und neue Waffe). Namen der Trageorte in `darstellung.json` (`trageorte`).
- **`zielen.stepshields`**: Stepshield des Zielens für den nächsten Schuss in der nächsten Runde.
- **`perk_wirkungen`**: Perks, deren Wirkung der Regelkern selbst ausführt, Perk-ID → Liste von Wirkungen. Erlaubte `art`: `reichweite_frei` (`baender`: keine Malsteps der Reichweite), `eigene_bewegung_weniger` (`malsteps`), `zielen_stepshields` (`stepshields`, `bedingung`: `liegend_oder_aufgelegt`), `zielen_ohne_reichweite` (`bedingung`: `ohne_bewegung`), `folgetreffer_zonen` (`ansage`: Zone, `zonen`: Zonen der Folgetreffer der Reihe nach, die letzte wiederholt sich), `einzeln_patronen` (`patronen`), `nachladen_als_break`, `ziehen_ohne_aktion` (`trageorte`), `werfen_als_break`, `eingreifen_als_break`. Ein neuer Perk mit bekannter Wirkung braucht keine Codeänderung.
- **`sprengwirkung.landepunkt`**: Landepunkt eines Werfergeschosses bzw. einer Wurfladung je Ergebnis; **`richtungen`**: Richtung bei Misserfolg, Index = W8 − 1 (Sprengwirkung, Landepunkt).
- **Bänder** in `bewegung`, `sicht` und `lautstaerke` sind IDs aus `schiessen.reichweitenbaender`. `"keins"`: man erkennt niemanden.
- **Lage:** Die App baut die Lage-Auswahl allein aus `lage.gruppen` und `lage.umstaende` ([konzept.md § 3.8c](konzept.md#38c-lage-auswahl-r)). Ein neuer Umstand ist ein neuer Eintrag, ohne Codeänderung.
	- `auswahl`: `eins` (genau ein Umstand der Gruppe; `standard` ist vorgewählt) oder `schalter` (jeder einzeln an/aus).
	- `zuruecksetzen`: wann die Auswahl auf den Standard zurückfällt: `rundenende`, `neues_ziel` oder `gefechtsende`.
	- `fehlschuss_trifft_beteiligten`: Bei Misserfolg trifft der Schuss einen anderen Beteiligten (Zone aus W8, nie Krit); Ansage gilt nicht.
	- `malsteps` bzw. `stepshields`: Wirkung. `nicht_in_baendern`: wirkt in diesen Bändern nicht (ausgegraut mit Hinweis). `nur_ohne_eigene_bewegung`: gesperrt, wenn der Charakter sich in dieser Runde bewegt hat. `nicht_fuer`: Abläufe, in denen der Umstand fehlt (`werfen`, `werfer`, `sprengwaffe`). `hinweis`: Text, der bei Auswahl erscheint.
	- **Eigene Bewegung** steht nicht in der Auswahl; die App kennt sie aus der Aktionsleiste (`eigene_bewegung`).
	- `quelle: reichweite`: Die Gruppe hat keine Einträge in `umstaende`. Ihre Knöpfe sind die Reichweitenbänder (`schiessen.reichweitenbaender`); die Malsteps kommen beim Schießen aus der `reichweite` der aktiven Waffe (`null` = Knopf gesperrt), beim Werfen aus der Wurfweite. Kein Standard: Vor dem ersten Schuss auf ein Ziel muss ein Band gewählt werden.

---

## stats.json

```json
{
  "version": "2026-11-13",
  "eintraege": [
    { "id": "twitch", "name": "Twitch", "gruppe": "A" },
    { "id": "brawn", "name": "Brawn", "gruppe": "A" },
    { "id": "agility", "name": "Agility", "gruppe": "A" },
    { "id": "grit", "name": "Grit", "gruppe": "A" },
    { "id": "control", "name": "Control", "gruppe": "B" },
    { "id": "empathy", "name": "Empathy", "gruppe": "B" },
    { "id": "intellect", "name": "Intellect", "gruppe": "B" },
    { "id": "decisiveness", "name": "Decisiveness", "gruppe": "B" },
    { "id": "nerve", "name": "Nerve", "gruppe": "C" }
  ]
}
```

---

## skills.json

`waffenkategorien` verknüpft Waffenskills mit `waffen.json`. Ein Waffenskill kann mehrere Kategorien abdecken (Präzisionsgewehr: `DMR` und `SR`).

```json
{
  "version": "2026-11-13",
  "eintraege": [
    { "id": "waffe_ar", "name": "Sturmgewehr", "stat": "control", "gruppe": "waffen", "waffenkategorien": ["AR"] },
    { "id": "waffe_praezision", "name": "Präzisionsgewehr", "stat": "control", "gruppe": "waffen", "waffenkategorien": ["DMR", "SR"] },
    { "id": "rueckstosskontrolle", "name": "Rückstoßkontrolle", "stat": "brawn", "gruppe": "kampf" },
    { "id": "erste_hilfe", "name": "Erste Hilfe", "stat": "control", "gruppe": "medizin" },
    { "id": "operation", "name": "Operation", "stat": "control", "gruppe": "medizin", "exklusiv": ["sanitaeter", "rettungssanitaeter"] },
    { "id": "fuehrung", "name": "Führung", "stat": "empathy", "gruppe": "sozial" },
    { "id": "selbstbeherrschung", "name": "Selbstbeherrschung", "stat": "nerve", "gruppe": "koerper" }
  ]
}
```

- `gruppe`: Gruppe aus dem Regelwerk (`waffen`, `kampf`, `koerper`, `technik`, `entscheidung`, `medizin`, `sozial`). Exklusive Skills, die das Regelwerk nur unter „Exklusive Skills“ führt (Tarnen, Ballistik …), haben die Gruppe `exklusiv`; Operation bleibt in `medizin`. Der Zugang einer Klasse kann ganze Gruppen freigeben ([§ klassen.json](#klassenjson)).
- `exklusiv`: nur bei exklusiven Skills. Liste der Spezialisierungen (IDs aus `klassen.json`), die den Skill zur Auswahl stellen. Ein exklusiver Skill wird nie über eine Gruppe freigegeben.

---

## perks.json

- `kurz`: Kurzbeschreibung (eine Zeile, eingeklappt sichtbar).
- `wirkung`: vollständiger Text (ausgeklappt).
- `modifikatoren`: Liste von [Modifikatoren](#modifikator), die die App selbst verrechnet. Leer, wenn der Perk eine Sonderregel ist.
- `hinweis_bei`: Stellen, an denen die App einen Hinweis auf den Perk zeigt (`schiessen`, `probe`, `leiter`, `schaden`, `heilung`, `nahkampf`, `breakaction`, `initiative`). Leer, wenn der Perk vollständig über Modifikatoren läuft.

```json
{
  "version": "2026-11-13",
  "eintraege": [
    {
      "id": "zaeh_1", "gruppe": "grundwerte",
      "name": "Zäh I",
      "rang": 1,
      "voraussetzung": { "stats": [ { "stat": "brawn", "min": 50 } ], "perks": [] },
      "kurz": "+1 HP",
      "wirkung": "Erhöht den Grundwert Lebenspunkte um 1.",
      "modifikatoren": [
        { "ziel": { "art": "grundwert", "id": "hp" }, "wirkung": { "wert": 1 } }
      ],
      "hinweis_bei": [],
      "vorlaeufig": true
    },
    {
      "id": "zaeh_2", "gruppe": "grundwerte",
      "name": "Zäh II",
      "rang": 2,
      "voraussetzung": { "stats": [ { "stat": "brawn", "min": 70 } ], "perks": ["zaeh_1"] },
      "kurz": "+1 HP (zusätzlich zu Zäh I)",
      "wirkung": "Erhöht den Grundwert Lebenspunkte um 1. Setzt Zäh I voraus; die Wirkungen addieren sich.",
      "modifikatoren": [
        { "ziel": { "art": "grundwert", "id": "hp" }, "wirkung": { "wert": 1 } }
      ],
      "hinweis_bei": [],
      "vorlaeufig": true
    },
    {
      "id": "starrsinn", "gruppe": "allgemein",
      "name": "Starrsinn",
      "rang": 1,
      "voraussetzung": { "stats": [ { "stat": "nerve", "min": 50 } ], "perks": [] },
      "kurz": "Verschiebung durch Führung ablehnen",
      "wirkung": "Du darfst eine Verschiebung durch Führung ablehnen.",
      "modifikatoren": [],
      "hinweis_bei": ["leiter"]
    },
    {
      "id": "triple_tap", "gruppe": "kampf",
      "name": "Triple Tap",
      "rang": 2,
      "voraussetzung": { "stats": [ { "stat": "control", "min": 70 } ], "perks": [] },
      "kurz": "Ansage Bauch: Folgetreffer Brust, dann Kopf",
      "wirkung": "Sagst du den Bauch als Zone an, trifft der erste Folgetreffer die Brust, der zweite und alle weiteren den Kopf.",
      "modifikatoren": [],
      "hinweis_bei": ["schiessen"],
      "vorlaeufig": true
    }
  ]
}
```

- `rang`: zugleich die Kosten in freien Punkten. Perks haben keine Stufen; abgestufte Wirkung entsteht durch eigenständige Perks (`zaeh_1`, `zaeh_2`).
- `voraussetzung.stats`: Mindest-Statwerte (Statwert, nicht Rang). `voraussetzung.perks`: Perks, die der Charakter schon haben muss. Alle Bedingungen müssen erfüllt sein.
- `rang` ist mindestens 1. Negative Perks sind vorerst gestrichen.
- `gruppe`: `grundwerte`, `kampfkunst`, `kampf`, `allgemein` oder `exklusiv` (Abschnitte in Stats, Skills und Perks).
- `kampfkunst`: nur bei Gruppe `kampfkunst`. Wirkung je Sieg mit überlegenem Stand: `liegen_ueber_stehen`, `stehen_ueber_hocke`, `hocke_ueber_liegen` (Text oder `null`).
- `exklusiv`: nur bei Gruppe `exklusiv`. Liste der Klassen (IDs aus `klassen.json`), die den Perk zur Auswahl stellen, z. B. `["kommandosoldat"]`.

**Offene Listen.** Skills und Perks werden nur über `skills.json` und `perks.json` ergänzt, ohne Codeänderung. Die App verwendet keine Skill- oder Perk-IDs fest im Code. Ein Perk ohne Modifikatoren erscheint als Hinweistext an den Stellen aus `hinweis_bei`.

---

## Modifikator

Gemeinsames Format für alles, was Werte automatisch verändert: Perks (`perks.json`), Anpassungen der SL (Charakter, `anpassungen`) und zur Laufzeit Leiter, Zustände und Lage ([konzept.md § 3.0b](konzept.md#30b-herkunft-von-werten-a-r)).

```json
{ "ziel": { "art": "stat", "id": "intellect" }, "wirkung": { "stepshields": 1 } }
```

| Feld | Werte |
| --- | --- |
| `ziel.art` | `grundwert` (`hp`, `schmerzresistenz`, `nahkampfschaden`, `wurfweite_band`), `stat` (Stat-ID; wirkt auf alle Proben auf diesen Stat), `skill` (Skill-ID; Proben mit diesem Skill), `probe` (`schiessen`, `haltezahl`, `erholungsprobe`, `nerve_anstieg`, `nerve_senken`, `initiative` …), `alle` (alle Proben; ohne `id`) |
| `wirkung` | genau eines: `wert` (± Zahl, nur für Grundwerte), `stepshields` (Zahl), `malsteps` (Zahl), `krit_schwelle` (± Zahl, z. B. Kernschuss) |
| `bedingung` | optional; alle Angaben müssen zutreffen: `baender` (Liste von Band-IDs, z. B. Reflexvisier nur bedrängt und nah), `skill` (nur mit diesem Skill), `stand` (z. B. `liegen`), `ohne_bewegung` (`true`), `aufgelegt` (`true`) |

Die **Quelle** steht nicht im Modifikator; sie ergibt sich aus dem Ort (Perk, Anpassung, Leiter …) und bestimmt das Zeichen der Markierung.

---

## koerperzonen.json

```json
{
  "version": "2026-11-13",
  "eintraege": [
    { "id": "kopf", "name": "Kopf", "w8": 8, "multiplikator": 3, "bereich": "kopf",
      "normal": { "text": "Blutung", "blutung": "normal", "dauerhaft": [] },
      "krit": { "text": "Sofort Tod", "tot": true } },
    { "id": "bauch", "name": "Bauch", "w8": 6, "multiplikator": 2, "bereich": "rumpf",
      "normal": { "text": "Blutung", "dauerhaft": [] },
      "krit": { "text": "Kampfunfähig; verbluten innerhalb einer Minute", "blutung": "kritisch_rumpf" } },
    { "id": "rumpf", "name": "Rumpf", "w8": null, "nur_ansage": true, "multiplikator": 2, "bereich": "rumpf",
      "normal": { "text": "Blutung", "dauerhaft": [] },
      "krit": { "text": "Kampfunfähig; verbluten innerhalb einer Minute", "blutung": "kritisch_rumpf" } },
    { "id": "bein_r", "name": "R. Bein", "w8": 2, "multiplikator": 1, "bereich": "glied",
      "normal": { "text": "Blutung; Sturz, falls im Lauf; humpeln", "dauerhaft": ["humpeln"] },
      "krit": { "text": "Kampfunfähig; verbluten innerhalb fünf Minuten", "blutung": "kritisch_glied" } }
  ]
}
```

- `bereich` bestimmt, welche Rüstung schützt (Westen: `rumpf`) und welche Blutungsregel gilt.
- `normal.blutung` und `krit.blutung` verweisen auf `regeln.json` (`blutung`). `krit.tot`: sofort tot; `krit.kampfunfaehig`: kampfunfähig ab dem Treffer.
- `dauerhaft` sind Folgen, die bestehen bleiben, solange die Wunde offen ist.
- Brust, Bauch und Unterleib zählen für Rüstung zum Rumpf.

---

## munition.json

```json
{
  "version": "2026-11-13",
  "eintraege": [
    {
      "id": "762x39",
      "name": "7.62x39mm",
      "art": "patrone",
      "typen": {
        "FMJ": { "dk": 2, "mw": 3 },
        "HP":  { "dk": 1, "mw": 4 },
        "AP":  { "dk": 3, "mw": 3 }
      }
    },
    {
      "id": "12g",
      "name": "12 Gauge",
      "art": "schrot",
      "typen": {
        "Buckshot": { "dk": 0, "mw": 1, "schrotzahl": { "bedraengt": 4, "nah": 3, "mittel": 2, "weit": 1 } },
        "Slug":     { "dk": 2, "mw": 4 },
        "Gummi":    { "dk": null, "mw": 3, "stumpf": true, "vorratslevel": 2, "preis_10": { "min": 15, "max": 40 } }
      }
    },
    {
      "id": "9x19",
      "name": "9x19 Parabellum",
      "art": "patrone",
      "typen": {
        "FMJ": { "dk": 1, "mw": 1 },
        "HP":  { "dk": 1, "mw": 2 },
        "AP":  { "dk": 2, "mw": 1 },
        "Unterschall": { "dk": 0, "mw": 1, "unterschall": true, "vorratslevel": 3 },
        "Gummi": { "dk": null, "mw": 1, "stumpf": true, "vorratslevel": 2, "preis_10": { "min": 10, "max": 30 } }
      }
    }
  ]
}
```

- Nicht vorhandene Typen fehlen im Objekt (statt `null`).
- `schrotzahl`: nur Buckshot. Kugeln je Treffer und Band; fehlendes Band = keine Kugel (Regelwerk: Munitionstypen, Schrotflinten).
- `stumpf`: Gummigeschosse. Keine DK (`null`), immer Wuchttreffer (Regelwerk: Schaden, Blutung und Verletzungen, Stumpfe Treffer). Bei Schrot wie Slug, ohne Schrotzahl.
- `unterschall`: von Haus aus (9x18, .38 Special, 45 ACP: Feld beim Kaliber, `"unterschall": true`) oder als eigener Typ „Unterschall“ (Sonderladung). Wirkt nur mit Schalldämpfer auf die Lautstärke.
- `vorratslevel`, `preis_10` (Preis je 10 Schuss): nur bei Typen, für die das Regelwerk sie nennt.

---

## waffen.json

```json
{
  "version": "2026-11-13",
  "eintraege": [
    {
      "id": "ak47",
      "name": "Kalashnikov AK-47",
      "kategorie": "AR",
      "vorratslevel": 2,
      "preis": { "min": 250, "max": 400 },
      "munition": "762x39",
      "munitionstypen": ["FMJ", "HP", "AP"],
      "magazin": 30,
      "patrone_im_lauf": true,
      "feuermodi": {
        "EF": { "feuerrate": 4,  "rueckstoss": 2, "lh_prozent": 1 },
        "VA": { "feuerrate": 15, "rueckstoss": 3, "lh_prozent": 3, "garbenfaktor": 2 }
      },
      "reichweite": { "bedraengt": 2, "nah": 1, "mittel": 2, "weit": 3, "sehr_weit": 4, "fern": 5 },
      "lh_beheben_mod": 0,
      "zuverlaessigkeit": "zuverlaessig",
      "anschluesse": ["muendung_gewehr", "magazin"],
      "magazine": [75],
      "ladeart": "wechselmagazin",
      "besonderheiten": "ungenau, zuverlässig"
    },
    {
      "id": "spas12",
      "name": "Franchi SPAS-12",
      "kategorie": "SG",
      "munition": "12g",
      "magazin": 8,
      "patrone_im_lauf": true,
      "ladeart": "roehrenmagazin",
      "feuermodi": { "EF": { "feuerrate": 3, "rueckstoss": 2, "lh_prozent": 4 } },
      "betriebsarten": { "pump_action": { "name": "Pump-Action", "feuerrate": 2, "lh_prozent": 1 } },
      "…": "…"
    }
  ]
}
```

- `kategorie`: `Pistole`, `SMG`, `AR`, `SG`, `DMR`, `SR`, `LMG`, `Werfer`. Bei Werfern ist `munition` eine Liste von Geschoss-IDs aus `wurf_und_sprengwaffen.json`. Bestimmt den Waffenskill (`skills.json`, Feld `waffenkategorien`).
- `munitionstypen`: nur, wenn die Waffe nicht alle Typen ihres Kalibers verschießt. Fehlt das Feld, gelten alle Typen aus `munition.json` (auch Gummi und Unterschall).
- `reichweite`: Malsteps je Band; `null` = Schuss nicht möglich. Bei Schrotflinten gilt „sehr weit (nur Slug)“ über die Schrotzahl: Buckshot hat dort keine Kugel.
- `feuermodi`: Schlüssel `EF`, `Burst`, `VA`. Halbautomatik, Pump-Action und Repetieren sind `EF`. `garbenfaktor` nur bei `VA`. `Burst` hat zusätzlich `burst_laenge`; seine `feuerrate` ist ein Vielfaches davon, `rueckstoss` wie bei `EF`.
- `zuverlaessigkeit`: `zuverlaessig` oder `normal`. Die Zuschläge je Zustand (A–D) stehen in `regeln.json`.
- `patrone_im_lauf`: Magazingröße „30+1“ → `magazin: 30`, `patrone_im_lauf: true`.
- `ladeart`: `wechselmagazin`, `trommel`, `roehrenmagazin`, `fest` oder `einzelschuss` (Werfer). Bestimmt den Ablauf beim Nachladen (Regelwerk: Kampfsystem, Nachladen). `zubehoer`: passendes Zubehör (`schnelllader`, `ladestreifen`), falls die Ladeart es erlaubt.
- `betriebsarten`: umschaltbare Bauart ohne eigenen Feuermodus (SPAS-12: Pump-Action). Überschreibt `feuerrate` und `lh_prozent` des Modus `EF`, solange sie gewählt ist; Umschalten ohne Aktion.
- `lauter`, `leiser`: Abweichung der Lautstärke in Bändern, wenn die Waffe lauter oder leiser als üblich ist (Regelwerk: Wahrnehmung, Lautstärken). Sonst fehlt das Feld.
- `anschluesse`: `schiene_oben`, `schiene_unten`, `schiene_seitlich`, `muendung_pistole`, `muendung_gewehr`, `magazin` (Regelwerk: Schusswaffen, Aufsätze). `magazine`: Größen der erweiterten Magazine, wenn `magazin` angegeben ist. Ein Aufsatz passt, wenn sein Anschluss hier steht oder er die Waffe ausdrücklich nennt ([§ aufsaetze.json](#aufsaetzejson)).

---

## nahkampfwaffen.json

```json
{
  "version": "2026-11-16",
  "eintraege": [
    { "id": "koerper", "name": "Faust, Tritt, Ellenbogen, Knie", "art": "stumpf", "haende": null, "laenge": "kurz", "mw": 0, "dk": null, "immer_verfuegbar": true },
    { "id": "kampfmesser", "name": "Kampfmesser", "art": "scharf", "haende": 1, "laenge": "kurz", "mw": 1, "dk": 1,
      "wurf": { "bedraengt": 1, "nah": 2, "mittel": 4, "weit": null }, "vorratslevel": 2, "preis": { "min": 40, "max": 200 } },
    { "id": "gewehrkolben", "name": "Gewehrkolben", "art": "stumpf", "haende": 2, "laenge": "mittel", "mw": 1, "dk": null, "mit_waffe": ["AR", "SG", "DMR", "SR", "LMG"] },
    { "id": "bajonett", "name": "Bajonett", "art": "scharf", "vorratslevel": 3, "preis": { "min": 30, "max": 150 },
      "varianten": {
        "aufgepflanzt": { "haende": 2, "laenge": "lang", "mw": 1, "dk": 2 },
        "in_der_hand":  { "haende": 1, "laenge": "kurz", "mw": 1, "dk": 1 }
      } }
  ]
}
```

- `art`: `stumpf` (keine DK, immer Wuchttreffer, Krit = Stagger) oder `scharf`. `laenge`: `kurz`, `mittel`, `lang` (Regelwerk: Kampfsystem, Länge der Waffe).
- `mw`: Bonus auf den Nahkampfschaden des Charakters. MW des Treffers = Nahkampfschaden + `mw`.
- `mit_waffe`: Einsatz mit einer Schusswaffe dieser Kategorien (Kolben, Lauf, Pistolengriff); keine eigene Waffe im Inventar.
- `wurf` (Pflichtfeld): Wurf-Reichweite. Malsteps je Reichweitenband (`bedraengt`, `nah`, `mittel`, `weit`), wie `reichweite` bei Schusswaffen als positive Zahl („−2“ im Regelwerk → `2`); `null` = in diesem Band nicht werfbar. `"wurf": null` = gar nicht werfbar (Körperwaffen, Schlagring, Einsätze mit der Schusswaffe). Jede Nahkampfwaffe ist werfbar, soweit dieses Feld es zulässt; Schaden wie im Nahkampf. Dazu kommen die Malsteps der Wurfweite des Charakters (Regelwerk: Kampfsystem, Werfen; Nahkampfwaffen, Wurf). Eine Variante kann ein eigenes `wurf` tragen (Bajonett aufgepflanzt: `null`); sonst gilt das der Waffe.
- `haende`: `1`, `2`, `[1, 2]` (ein- oder zweihändig) oder `null` (Körperwaffen).
- `varianten`: Waffen mit zwei Einsatzarten (Bajonett; Klappspaten mit Kante und Fläche). Jede Variante hat `name`, `haende`, `laenge`, `mw`, `dk` und optional `art`, wenn sie von der Waffe abweicht (Fläche des Klappspatens: `stumpf`).

---

## aufsaetze.json

Die Wirkung eines Aufsatzes steht hier, nicht bei der Waffe, weil ein Aufsatz an mehrere Waffen passen kann.

```json
{
  "version": "2026-11-13",
  "eintraege": [
    {
      "id": "zweibein",
      "name": "Zweibein",
      "passt_an": { "anschluss": ["schiene_unten"], "waffen": [] },
      "einsatz": "schalter",
      "schalter_text": "Zweibein aufgesetzt",
      "modifikatoren": [ { "ziel": { "art": "probe", "id": "haltezahl" }, "wirkung": { "stepshields": 1 } } ],
      "setzt": { "aufgelegt": true },
      "hinweis": null,
      "vorlaeufig": true
    },
    {
      "id": "reflexvisier",
      "name": "Reflexvisier",
      "passt_an": { "anschluss": ["schiene_oben"], "waffen": [] },
      "einsatz": "immer",
      "modifikatoren": [ { "ziel": { "art": "probe", "id": "schiessen" }, "wirkung": { "stepshields": 1 }, "bedingung": { "baender": ["bedraengt", "nah"] } } ],
      "hinweis": null,
      "vorlaeufig": true
    },
    {
      "id": "magazin_five_seven_20",
      "name": "Erweitertes Magazin (20)",
      "passt_an": { "anschluss": ["magazin"], "waffen": ["five_seven"] },
      "einsatz": "immer",
      "werte": { "magazin": 20 },
      "modifikatoren": [],
      "hinweis": null
    },
    {
      "id": "schalldaempfer_pistole",
      "name": "Schalldämpfer",
      "passt_an": { "anschluss": ["muendung_pistole"], "waffen": [] },
      "einsatz": "immer",
      "modifikatoren": [],
      "hinweis": "Schuss 1 Stufe leiser (Wahrnehmung)."
    }
  ]
}
```

- `passt_an.anschluss`: Liste der Anschlüsse, an die der Aufsatz passt (Lampe: Schiene unten oder seitlich). `passt_an.waffen`: nur diese Waffen (erweiterte Magazine).
- `einsatz`: `immer` (wirkt, solange angebracht) oder `schalter` (wirkt nur, wenn im Schussablauf eingeschaltet; Text des Schalters in `schalter_text`).
- `modifikatoren`: [Modifikatoren](#modifikator); Quelle in der Herkunftsanzeige ist der Aufsatz (Zeichen wie Perk oder eigenes, siehe `darstellung.json`).
- `werte`: ersetzt Werte der Waffe, solange der Aufsatz angebracht ist (z. B. `magazin`). `trommelmagazin: true`: Zuschlag auf die Ladehemmungsrate aus `regeln.json` (`ladehemmung.trommelmagazin_zuschlag`).
- `waffe`: Aufsatz, der selbst eine Waffe ist (Unterlaufwerfer M203 → `waffen.json`). `nahkampfwaffe`: Aufsatz, der eine Nahkampfwaffe ist (Bajonett → `nahkampfwaffen.json`).
- Mündungsaufsätze gibt es je Kaliberklasse (`schalldaempfer_pistole`, `schalldaempfer_gewehr`, `kompensator_pistole`, `kompensator_gewehr`; Kompensator für beide Klassen entschieden 16.11.2026). Erweiterte Magazine heißen `magazin_<waffe>_<größe>` bzw. `trommel_<waffe>_<größe>`.
- **`zubehoer`** (zweite Liste in der Datei): mitgeführtes Zubehör mit `id`, `name`, `passt_zu` (Text), `vorratslevel`, `preis`, `wirkung`. Waffen nennen passendes Zubehör im Feld `zubehoer`.
- Aufsätze haben noch keinen `preis` und kein `vorratslevel`; das Regelwerk nennt keine. Geklärt wird das, wenn der Laden gebaut wird (offen.md).
- `setzt`: Umstand der Lage, den der eingeschaltete Aufsatz auslöst (Zweibein: Waffe gilt als aufgelegt).
- `hinweis`: Text für Wirkungen, die die App nicht rechnet.

---

## wurf_und_sprengwaffen.json

Granaten und Geschosse für Werfer. Beide sind **Vorratsgegenstände**: Der Charakter führt sie als Anzahl ([Felder im Spielstand](#felder-im-spielstand)). Regeln: Kampfsystem (Werfen), Sprengwirkung; Werte: Ausrüstung/Sprengwaffen. Wurfwaffen (Wurfmesser, Wurfaxt) sind Nahkampfwaffen und stehen in [`nahkampfwaffen.json`](#nahkampfwaffenjson) (`wurf`). Alle Felder außer `id`, `name`, `art`, `einsatz` dürfen `null` sein.

```json
{
  "version": "2026-11-13",
  "eintraege": [
    {
      "id": "m67",
      "name": "M67 Splittergranate",
      "art": "splitter",
      "einsatz": "wurf",
      "vorratslevel": 3,
      "preis": null,
      "zuender": "zeit",
      "verzoegerung": null,
      "bereiche": { "bedraengt": null, "nah": null, "mittel": null },
      "kern": ["bedraengt"],
      "splitter": { "dk": null, "mw": null },
      "druckwelle": { "mw": null },
      "strahl": null,
      "sonderwirkung": null,
      "ausloeser": ["beschossen"]
    },
    {
      "id": "og7v",
      "name": "OG-7V Splittergeschoss",
      "art": "splitter",
      "einsatz": "geschoss",
      "verwendet_in": ["rpg7"],
      "vorratslevel": 4,
      "preis": null,
      "zuender": "aufschlag",
      "verzoegerung": 0,
      "bereiche": { "bedraengt": 4, "nah": 2, "mittel": 1 },
      "kern": ["bedraengt"],
      "splitter": { "dk": 1, "mw": 1 },
      "druckwelle": { "mw": 3 },
      "strahl": null,
      "sonderwirkung": null,
      "ausloeser": ["beschossen"]
    }
  ]
}
```

- `art`: `splitter`, `blend`, `rauch`, `gas`, `sonstiges`.
- `einsatz`: `wurf` (Wurfaktion) oder `geschoss` (aus einem Werfer). `verwendet_in`: nur bei Geschossen, IDs der Werfer aus `waffen.json`.
- `zuender`: `zeit`, `aufschlag`, `kontakt`. `verzoegerung`: Runden bis zur Detonation ([Sprengwirkung](../../Grundmechanik/Sprengwirkung.md), Zündung); Aufschlag- und Kontaktzünder 0. Bei langer Flugzeit ein Objekt je Reichweitenband, z. B. `{ "weit": 1, "sehr_weit": 2 }`.
- `bereiche`: Splitterzahl je Reichweitenband (vom Explosionspunkt); fehlende Bänder: keine Wirkung. `kern`: Bänder, in denen die Druckwelle wirkt (Standard `["bedraengt"]`).
- `splitter`: DK/MW je Splitter. `druckwelle`: MW der Druckwelle (stumpfer Treffer, nur im Kern). `strahl`: nur bei Hohlladungen `{ "dk": …, "mw": … }`, sonst `null`.
- `sonderwirkung`: `null` oder Objekt mit `art` (`blendung`, `rauch`, `reizgas`) und `text`; dazu Werte der Wirkung, z. B. `geblendet_runden` je Band und `stagger` (Bänder) bei der Blendgranate, `baender` und `dauer_runden` bei Rauch und Reizgas.
- `besonderheiten`: Text aus dem Regelwerk.
- `ausloeser`: Auslöser der Leiter für Betroffene.
- In der Ausrüstung des Charakters als Vorrat: `{ "id": "m67", "anzahl": 2 }`.

---

## schutz.json

```json
{
  "version": "2026-11-13",
  "deckung": [
    { "id": "holztuer_duenn", "name": "dünne Holztür (5 cm)", "wert": 0 },
    { "id": "autotuer", "name": "Autotür", "wert": 2, "vorlaeufig": true },
    { "id": "panzerglas", "name": "Panzerglas", "wert": 3 }
  ],
  "fahrzeugpanzerung": [
    { "id": "panzerung_einfach", "name": "einfache Panzerung", "wert": 5, "vorlaeufig": true }
  ],
  "ruestung": [
    { "id": "weste_einfach", "name": "einfache Schutzweste", "art": "weste", "zonen": { "brust": 1, "bauch": 1, "unterleib": 1 },
      "vorratslevel": 1, "preis": { "min": 50, "max": 150 } },
    { "id": "gefechtshelm", "name": "Gefechtshelm", "art": "helm", "zonen": { "kopf": 2 },
      "vorratslevel": 2, "preis": { "min": 250, "max": 600 }, "einschraenkung": { "hoeren_baender": 1 } },
    { "id": "schutzanzug", "name": "Schutzanzug", "art": "anzug",
      "zonen": { "kopf": 2, "brust": 3, "bauch": 3, "unterleib": 3, "arm_r": 2, "arm_l": 2, "bein_r": 2, "bein_l": 2 },
      "vorratslevel": 4, "preis": { "min": 3000, "max": 8000 },
      "einschraenkung": { "bewegung_max": "gehen", "malsteps_stat": { "agility": 2 }, "hoeren_baender": 2 } }
  ],
  "schilde": [
    { "id": "ballistischer_schild", "name": "ballistischer Schild", "deckung": 3, "zonen": ["kopf", "brust", "bauch", "unterleib", "arm_r", "arm_l"],
      "nur_von_vorn": true, "vorratslevel": 3, "preis": { "min": 1500, "max": 3000 },
      "einschraenkung": { "bewegung_max": "gehen", "waffen": ["Pistole"], "schiessen_malsteps": 1 } }
  ]
}
```

- **Rüstung** gilt je Zone; mehrere Rüstungen auf einer Zone zählen nicht zusammen, es gilt der höchste Wert. `einschraenkung` gilt, solange die Rüstung getragen wird; Perks wie Rüstungsträger mildern sie über Modifikatoren.
- **Schild** ist mitgeführte Deckung: Die App verdeckt die genannten Zonen mit dem Wert, solange der Schild gehalten wird (Schalter; nur gegen Angriffe von vorn, im Zweifel fragt die App).

---

## klassen.json

Die Datei bildet das Regelwerk „Klassen“ ab: Stufen, Laufbahnen und Klassen. Alle Klassen sind Einträge; eine neue Klasse braucht keine Codeänderung.

```json
{
  "version": "2026-11-16",
  "stufen": [
    { "stufe": 1, "name": "Lehrling", "rank_set": ["F", "F", "E", "E", "E", "E", "D", "D", "C"], "richtgehalt": 250 },
    { "stufe": 5, "name": "Meister", "rank_set": ["C", "B", "B", "A", "A", "A", "A", "S", "S"], "richtgehalt": 2500 }
  ],
  "laufbahnen": [
    { "id": "militaer", "name": "Militär", "befoerderung": "Zeit im Dienstgrad, Errungenschaften, Kampferfahrung, Verhältnis zu Vorgesetzten (Empathy)." }
  ],
  "eintraege": [
    {
      "id": "rekrut",
      "name": "Rekrut",
      "laufbahn": "militaer",
      "stufe": 1,
      "art": "grundklasse",
      "beschreibung": "Hat die militärische Grundausbildung hinter sich …",
      "rank_vorschlag": {
        "twitch": "D", "brawn": "E", "agility": "E", "grit": "F",
        "control": "C", "empathy": "E", "intellect": "D", "decisiveness": "F", "nerve": "E"
      },
      "vorratslevel": 3,
      "gehalt": 250,
      "freie_punkte_start": 5,
      "mindestskills": { "waffe_ar": 1, "rueckstosskontrolle": 1, "granaten": 1, "athletik": 1, "entbehrung": 1, "erste_hilfe": 1 },
      "perks_vorgegeben": [],
      "zugang": {
        "wie": null,
        "skills": ["waffe_pistole", "waffe_smg", "waffe_ar", "waffe_schrot", "waffe_praezision", "waffe_mg",
                   "gruppe:kampf", "gruppe:koerper", "mechanik", "fahren", "gruppe:entscheidung", "erste_hilfe", "fuehrung"],
        "perks": ["gruppe:grundwerte", "gruppe:allgemein", "krav_maga",
                  "cqb", "entschlossen", "feuer_in_bewegung", "fingerfertig", "funkdisziplin", "niederhalten", "quickthrow", "schnell_nachladen"]
      }
    },
    {
      "id": "kommandosoldat",
      "name": "Kommandosoldat",
      "laufbahn": "militaer",
      "stufe": 3,
      "art": "spezialisierung",
      "voraussetzung_stat": { "stat": "twitch", "rang": "A" },
      "vorratslevel": 4,
      "gehalt": 650,
      "freie_punkte_start": 5,
      "mindestskills": { "waffe_ar": 3, "reflexe": 2, "tarnen": 1, "rueckstosskontrolle": 1, "granaten": 1, "athletik": 1,
                         "entbehrung": 1, "erste_hilfe": 1, "wachsamkeit": 1, "selbstbeherrschung": 1 },
      "perks_vorgegeben": [],
      "zugang": { "wie": "soldat", "skills": [], "perks": ["triple_tap"] }
    },
    {
      "id": "einzelkaempfer",
      "name": "Einzelkämpfer",
      "laufbahn": "militaer",
      "stufe": 4,
      "art": "erweiterte_form",
      "erweitert": "kommandosoldat",
      "voraussetzung_stat": { "stat": "grit", "rang": "A" },
      "vorratslevel": 5,
      "gehalt": 1000,
      "mindestskills": { "waffe_ar": 4, "ueberleben": 2, "tarnen": 2, "…": 1 },
      "zugang": { "wie": "kommandosoldat", "skills": [], "perks": [] }
    },
    {
      "id": "veteran",
      "name": "Veteran",
      "laufbahn": "militaer",
      "stufe": 5,
      "art": "meister",
      "vorratslevel": 5,
      "gehalt": 2500,
      "mindestskills": {},
      "mindestskills_wahl": { "anzahl": 2, "wert": 5, "davon_exklusiv": 1 },
      "zugang": { "laufbahn_gesamt": true }
    }
  ]
}
```

**Felder einer Klasse**
- `art`: `grundklasse` (Stufe 1 und 2), `spezialisierung` (Stufe 3), `erweiterte_form` (Stufe 4) oder `meister` (Stufe 5). Die zweite Spezialisierung ist keine eigene Klasse, sondern ein Weg zur Stufe 4 ([§ Klassenweg](#klassenweg)).
- `stufe`: verweist auf `stufen`; daraus kommen Rank-Set und Richtgehalt. Die Klasse speichert kein eigenes Rank-Set.
- `erweitert`: nur bei `erweiterte_form`: die Spezialisierung, die sie erweitert.
- `voraussetzung_stat`: ab Stufe 3 der Stat auf Rang A (Regelwerk: Klassen, Spezialisierungen); bei Grundklassen und Meistern `null`.
- `rank_vorschlag`: ordnet jedem Stat einen Rang zu und muss genau das Rank-Set der Stufe ergeben. **Derzeit nicht genutzt:** Der Spieler verteilt das Rank-Set selbst (entschieden 16.11.2026, [konzept.md § 3.0](konzept.md#30-charaktererstellung-m-r)); das Feld fehlt in allen Klassen. Die Datenprüfung prüft es weiter, falls es einmal eingetragen wird.
- `mindestskills`: Skill-ID → Mindestwert. Bei der Erstellung trägt die App sie ein; beim Klassenwechsel sind sie Voraussetzung.
- `mindestskills_wahl`: nur bei Meistern. Zusätzlich zu den Mindestskills der Stufe-4-Klasse, aus der der Charakter kommt: `anzahl` Skills auf `wert`, davon `davon_exklusiv` ein exklusiver Skill einer Spezialisierung aus seinem Klassenweg (Regelwerk: Klassen, Meister).
- `perks_vorgegeben`: Perks, die die App bei der Erstellung einträgt.
- `vorratslevel`, `gehalt`, `freie_punkte_start`: wie im Regelwerk.

**Zugang**

Der Zugang legt fest, welche Skills gesteigert und welche Perks gekauft werden können. Er gehört zur Klasse, nicht zum Charakter (Regelwerk: Charakteraufstieg, Klassenwechsel).
- `skills` und `perks`: Liste aus IDs und Gruppen (`"gruppe:kampf"`). Eine Gruppe gibt alle Einträge dieser Gruppe frei, auch später ergänzte; exklusive Skills und Perks nie.
- `wie`: ID einer Klasse, deren Zugang übernommen wird („Wie Soldat“). Die Listen ergänzen ihn. Ketten sind erlaubt (Einzelkämpfer → Kommandosoldat → Soldat).
- **Exklusive Skills und Perks** stehen nicht in den Listen. Die App gibt sie frei, wenn die Klasse in deren Feld `exklusiv` steht ([§ skills.json](#skillsjson), [§ perks.json](#perksjson)). Über `wie` gehen sie mit: Die erweiterte Form erbt die exklusiven Skills und Perks ihrer Spezialisierung.
- `laufbahn_gesamt`: nur bei Meistern. Zugang ist die Vereinigung aller Klassen der Laufbahn, mit allen exklusiven Skills und Perks.

**Aufgelöster Zugang.** Die App rechnet den Zugang einmal pro Klasse in zwei Mengen aus: steigerbare Skills und kaufbare Perks. Die Rechnung steht in [konzept.md § 4.11](konzept.md#411-charaktererstellung-und-aufstieg).

---

## darstellung.json

Zeichen und Farben der Herkunftsmarkierung ([konzept.md § 3.0b](konzept.md#30b-herkunft-von-werten-a-r)) und der Begriffsarten ([konzept.md § 2](konzept.md#texte-in-der-oberfläche)). Änderbar ohne Codeänderung. Farben als CSS-Werte; die App nutzt sie für helles und dunkles Design, wenn nur ein Wert angegeben ist.

```json
{
  "version": "2026-11-13",
  "herkunft": {
    "perk":       { "zeichen": "◆", "farbe": "#2f6fd6", "name": "Perk" },
    "anpassung":  { "zeichen": "★", "farbe": "#e07b00", "name": "Anpassung der SL" },
    "manuell":    { "zeichen": "✎", "rahmen": "gestrichelt", "name": "von Hand überschrieben" },
    "leiter":     { "zeichen": "♥", "farbe": "#c0392b", "name": "Adrenalin/Ruhepuls" },
    "zustand":    { "zeichen": "●", "farbe": "#7d3c98", "name": "Zustand" },
    "lage":       { "zeichen": "◇", "farbe": "#7f8c8d", "name": "Lage" },
    "aufsatz":    { "zeichen": "⚙", "farbe": "#2e7d32", "name": "Aufsatz" },
    "sl":         { "zeichen": "⚑", "farbe": "#b8860b", "name": "SL" }
  },
  "typen": {
    "stat":  { "zeichen": "■", "farbe": "#0f6e56", "name": "Stat" },
    "skill": { "zeichen": "⬢", "farbe": "#534ab7", "name": "Skill" },
    "perk":  { "zeichen": "◆", "farbe": "#2f6fd6", "name": "Perk" }
  },
  "leiter_farben": {
    "-3": "#1f4e8c", "-2": "#3a6fb5", "-1": "#7fa7d9",
    "0": "#9e9e9e",
    "1": "#f0a030", "2": "#e06a1b", "3": "#c0392b",
    "4": "#2b0a0a"
  },
  "grundwerte": { "hp": "HP", "schmerzresistenz": "Schmerzresistenz", "nahkampfschaden": "Nahkampfschaden", "wurfweite_band": "Wurfweite" },
  "proben": { "schiessen": "Schießen", "haltezahl": "Haltezahl", "erholungsprobe": "Erholungsprobe", "nerve_anstieg": "Nerve-Probe beim Anstieg", "nerve_senken": "Nerve-Probe zum Senken", "initiative": "Initiative", "ladehemmung_beheben": "Ladehemmung beheben", "reaktion": "Reaktion", "antizipation": "Antizipation" },
  "trageorte": { "schlinge": "Schlinge", "weste": "Rig oder Weste", "holster": "Holster", "guertel": "Gürtel oder Scheide", "ruecken": "Rücken", "rucksack": "Rucksack oder Tasche" },
  "bewegungen": { "kriechen": "Kriechen", "gehen": "Gehen", "laufen": "Laufen", "rennen": "Rennen", "hechten": "Hechten" },
  "informationen": { "gesehen": "gesehen", "gehoert": "nur gehört", "funk": "per Funk gemeldet", "diese_runde": "diese Runde", "letzte_runde": "letzte Runde", "aelter": "älter" }
}
```

- `grundwerte`: Anzeigenamen der Grundwerte; jeder Schlüssel aus `regeln.json` `grundwerte` braucht einen Namen (Datenprüfung).
- `proben`: Anzeigenamen der Probenarten. Jede Probenart, auf die ein Modifikator zielt (`ziel.art` = `probe`), braucht hier einen Namen (Datenprüfung).
- `trageorte`, `bewegungen`: Anzeigenamen der Trageorte (`regeln.json` `waffe_wechseln.trageorte`) und der Bewegungsarten (`bewegung.arten`, dazu Hechten). Jeder Schlüssel braucht einen Namen (Datenprüfung).
- `informationen`: Anzeigenamen für Wahrnehmung, Güte und Alter einer Information (Schlüssel aus `regeln.json` `breakaction`); der Hinweis zur Breakaction baut daraus die Malsteps.

Leiter, Zustand und Lage erscheinen nur in den Rechnern, nicht am Wert im Bogen.

- `typen`: Zeichen und Farbe vor jedem Namen eines Stats, Skills oder Perks, überall in der App. Das Perk-Zeichen ist dasselbe wie in `herkunft.perk`, damit ◆ immer „Perk“ bedeutet.
- ▲ und ▼ sind für Stepshields und Malsteps reserviert und kommen in `herkunft` und `typen` nicht vor.

---

## Charakter

Speicherformat eines Charakters, lokal und als Exportdatei (`<name>.cqb.json`). Gespeichert werden nur **Eingaben und Spielstand**. Alles Berechenbare (Statwert, Zielwerte, Kampfunfähigkeit, Heildauer aus Schaden …) wird nicht gespeichert.

```json
{
  "schema": 2,
  "id": "c7f1e2a0-3b5d-4a8e-9f10-2c4d6e8a1b3c",
  "geaendert": "2026-11-13T17:20:00+01:00",

  "name": "Mara Voss",
  "aussehen": "1,70 m, drahtig, Narbe über der linken Augenbraue, trägt immer eine olivgrüne Feldjacke",
  "klassenweg": [
    { "klasse": "anwaerter", "art": "erstellung" },
    { "klasse": "streife", "art": "befoerderung", "zeit": "2026-12-04T22:10:00+01:00" }
  ],
  "hintergrund": {
    "schulden": { "groesse": "mittel", "glaeubiger": "Onkel Vic", "frist_auftraege": 6, "sicherheit": "das Auto" },
    "coup": null,
    "vertrag": { "auftraggeber": "Halvorsen Security", "verpflichtung": "auf Abruf verfügbar" },
    "geburtsort": "", "personen": "", "lebensmittelpunkt": ""
  },
  "notizen": "",
  "status": "fertig",
  "erstellung": null,
  "vorratslevel_manuell": null,
  "freie_punkte": 2,
  "kassenbuch": [
    { "zeit": "2026-11-13T17:05:00+01:00", "betrag": 1300, "art": "startgeld", "grund": "Ersparnisse 300 + Schulden mittel 1000" },
    { "zeit": "2026-11-13T17:10:00+01:00", "betrag": -320, "art": "kauf", "grund": "Kalashnikov AK-47 (Zustand B)" },
    { "zeit": "2026-11-20T22:40:00+01:00", "betrag": 400, "art": "auftrag", "grund": "Gehalt" },
    { "zeit": "2026-11-20T22:41:00+01:00", "betrag": -200, "art": "rate", "grund": "Rate an Onkel Vic" }
  ],
  "schulden": { "rest": 1300, "frist_auftraege": 5 },
  "auftraege": 1,

  "stats": {
    "twitch":       { "rang": "D", "wurf": { "positiv": 7, "negativ": 4, "quelle": "app" } },
    "brawn":        { "rang": "E", "wurf": { "positiv": 3, "negativ": 5, "quelle": "app" } },
    "agility":      { "rang": "E", "wurf": { "positiv": 9, "negativ": 4, "quelle": "hand" } },
    "grit":         { "rang": "F", "wurf": { "positiv": 2, "negativ": 1, "quelle": "app" } },
    "control":      { "rang": "C", "wurf": { "positiv": 8, "negativ": 4, "quelle": "app" } },
    "empathy":      { "rang": "E", "wurf": { "positiv": 1, "negativ": 7, "quelle": "app" } },
    "intellect":    { "rang": "D", "wurf": { "positiv": 6, "negativ": 6, "quelle": "app" } },
    "decisiveness": { "rang": "F", "wurf": { "positiv": 10, "negativ": 3, "quelle": "app" } },
    "nerve":        { "rang": "E", "wurf": { "positiv": 4, "negativ": 5, "quelle": "app" } }
  },
  "skills": { "waffe_ar": 2, "rueckstosskontrolle": 1, "erste_hilfe": 1 },
  "perks": [ "zaeh_1" ],
  "ueberschrieben": [ "grundwerte.schmerzresistenz" ],
  "grundwerte_manuell": { "schmerzresistenz": 2 },
  "anpassungen": [
    { "id": "a1", "ziel": { "art": "stat", "id": "intellect" }, "wirkung": { "stepshields": 1 }, "grund": "Bonus der SL: Ortskenntnis", "aktiv": true },
    { "id": "a2", "ziel": { "art": "grundwert", "id": "hp" }, "wirkung": { "wert": -1 }, "grund": "Sonderregel: alte Verletzung", "aktiv": true }
  ],
  "protokoll": [
    { "zeit": "2026-11-13T17:05:00+01:00", "art": "erstellung_abgeschlossen" },
    { "zeit": "2026-11-20T22:30:00+01:00", "art": "session", "punkte": 5 },
    { "zeit": "2026-11-20T22:35:00+01:00", "art": "skill", "id": "erste_hilfe", "von": 0, "nach": 1, "kosten": 1 },
    { "zeit": "2026-11-20T22:36:00+01:00", "art": "statrank_up", "id": "brawn", "rang_von": "F", "rang_nach": "E",
      "wurf_von": { "positiv": 8, "negativ": 4, "quelle": "app" }, "wurf_nach": { "positiv": 3, "negativ": 5, "quelle": "app" }, "kosten": 1 }
  ],

  "ausruestung": {
    "waffen": [
      { "id": "wf1", "waffe": "ak47", "munitionstyp": "FMJ", "im_magazin": 26, "reserve": [30, 30, 12], "zustand": "B", "aufsaetze": [], "ladehemmung": null, "trageort": "schlinge" },
      { "id": "wf2", "waffe": "sw_model_10", "munitionstyp": "FMJ", "im_magazin": 6, "reserve": [], "lose_patronen": 18,
        "zubehoer": [ { "art": "schnelllader", "gefuellt": 2, "leer": 1 } ], "zustand": "A", "aufsaetze": [], "ladehemmung": null, "trageort": "holster" }
    ],
    "nahkampfwaffen": [ { "id": "nk1", "waffe": "kampfmesser", "trageort": "weste" } ],
    "aktive_waffe": "wf1",
    "vorrat": [ { "id": "m67", "anzahl": 2, "trageort": "weste" } ],
    "ruestung": [ "weste_einfach" ],
    "schild": null,
    "sonstiges": "2 Druckverbände, 1 Tourniquet"
  },

  "spielstand": {
    "gefecht": {
      "aktiv": false,
      "runde": 0,
      "initiative": { "wurf": 54, "stufe": "erfolg", "zielwert": 61 },
      "leiter": 0,
      "adrenalin4_erreicht": false,
      "ueberrascht": false,
      "gesenkt_diese_runde": false,
      "ausloeser_diese_runde": [],
      "stand": "stehen",
      "bewegt": null,
      "bewegungen": 0,
      "gehechtet": false,
      "zielen": { "runde": 3, "stepshields": 1, "ohne_reichweite": false, "gezielt_in": 2 },
      "konzentration": null,
      "lage": {
        "auswahl": { "entfernung": "mittel", "ziel_bewegung": "ziel_laeuft" },
        "sl_gefecht": [ { "id": "u1", "malsteps": 1, "stepshields": 0, "grund": "Seitenwind", "gilt_fuer": ["schiessen", "werfen"] } ],
        "letzte_gruende": ["Seitenwind", "wackelnder Untergrund"]
      },
      "sichtstufe": "klar",
      "verbraucht": { "main": 1, "break": 0, "bewegung": 1, "stand": 0 },
      "korrektur": { "main": 0, "break": 0, "bewegung": 0, "stand": 0 },
      "break_verloren": false,
      "deckung": { "wert": 2, "zonen": ["bein_l", "bein_r", "unterleib", "bauch", "brust", "arm_l", "arm_r"] },
      "protokoll": [
        { "id": "g1", "runde": 2, "zeit": "2026-11-20T21:14:00+01:00", "art": "treffer",
          "eingabe": { "zone": "brust", "dk": 2, "mw": 3, "kugeln": 1, "krit": false, "deckung": null },
          "aenderungen": { "wunde": "w2", "hp_verlust_wunden": [0, 6], "ausloeser": ["getroffen", "verletzt", "stagger"] } }
      ]
    },
    "hp_verlust_wunden": 0,
    "prellungen": 0,
    "tot": false,
    "adrenalinschock": { "aktiv": false, "ruhe_stunden": 0 },
    "wunden": [
      {
        "id": "w1",
        "zone": "bein_r",
        "schaden": 3,
        "kritisch": false,
        "blutung": { "status": "gestoppt", "frist_ende": null },
        "versorgt": "druckverband",
        "nachsorge": "gelungen",
        "ruhetage_geheilt": 1
      }
    ]
  }
}
```

### Speicher auf dem Gerät

IndexedDB-Datenbank `cqb` mit zwei Speichern: `charaktere` (ein Datensatz je Charakter, Schlüssel `id`) und `meta` mit `zuletzt_geoeffnet` (ID) und `einstellungen` (`darstellung`: `system`, `hell`, `dunkel`; `wuerfeln`: je Würfelstelle `app` oder `hand`, fehlende Stellen haben ihren Standard; `reiterEingeklappt`: Reiterleiste eingeklappt, fehlt der Wert, gilt `false`; `laschenHoehe`: Stelle der eingeklappten Lasche am rechten Rand, 0 = ganz unten, 1 = ganz oben, fehlt der Wert, gilt 0). Jeder Charakter ist ein eigener Datensatz und wird einzeln exportiert.

### Felder außerhalb des Spielstands

- **`status`:** `erstellung` (Erstellung läuft, alle Schritte änderbar) oder `fertig`.
- **`erstellung`:** nur während der Erstellung gesetzt, sonst `null`. Felder: `schritt` (zuletzt geöffneter Schritt 1–7), `ohne_klasse`, `klasse` (ID), `stufe4` (nur Meister: Stufe-4-Klasse), `meister_skills` (nur Meister: gewählte Skills auf 5), `freie_punkte_start` (nur ohne Klasse), `kaeufe` (Käufe mit freien Punkten der Reihe nach: `{ "art": "skill" | "perk", "id" }` oder `{ "art": "statrank_up", "id", "wurf" }`). Solange die Erstellung läuft, bleiben `klassenweg`, `skills`, `perks` und `freie_punkte` leer; `stats` enthält die verteilten Ränge und die ersten Würfe. Beim Abschluss rechnet die App daraus die fertigen Werte und setzt `erstellung` auf `null`.
- **`vorratslevel_manuell`:** von Hand gesetztes Vorratslevel (ohne Klasse oder im Schreibmodus); `null` = aus der aktuellen Klasse.
- **Stats:** gespeichert werden Rang und **Wurf** (Positiv- und Negativwürfel, je 1–10; Quelle `app` oder `hand`). Abweichung = positiv − negativ und Statwert = Rang + Abweichung werden berechnet, nicht gespeichert.
- **Während der Erstellung** kann der Charakter unvollständig sein: Stats ohne Rang (`"rang": null`, `"wurf": null`). Die Zuordnung des Rank-Sets ergibt sich aus den Rängen der Stats. Beim Tauschen von Rängen bleibt `wurf` beim Stat.
- **`klassenweg`:** <a id="klassenweg"></a>alle Klassen des Charakters in zeitlicher Folge. Die **aktuelle Klasse** ist der letzte Eintrag. Leer bei freier Erstellung ohne Klasse.
	- `klasse`: ID aus `klassen.json`.
	- `art`: `erstellung`, `befoerderung`, `wechsel` (Laufbahnwechsel oder Wechsel auf gleicher Stufe) oder `zweite_spezialisierung`.
	- `zweite_spezialisierung`: Der Eintrag ist eine Spezialisierung (Stufe 3), der Charakter gilt aber als Stufe 4. Zugang: beide Spezialisierungen; Vorratslevel und Gehalt der erweiterten Formen der Laufbahn (Regelwerk: Klassen, Zweite Spezialisierung).
	- **Erstellung auf höherer Stufe:** Die App legt den nötigen Weg mit `art: erstellung` an, z. B. Grenadier → Pionier → Veteran. So sind Spezialisierung und Stufe-4-Klasse eines Meisters immer bekannt.
	- Skills und Perks hängen nicht am Klassenweg; sie stehen in `skills` und `perks` und bleiben bei jedem Wechsel erhalten.
- **Modus** (Lesen, Aufstieg, Schreiben) wird nicht gespeichert; ein Charakter öffnet immer im Lesemodus ([konzept.md § 3.0a](konzept.md#30a-modi-lesen-aufstieg-schreiben-m)).
- **`protokoll`:** Liste aller Aufstiegsschritte nach Abschluss der Erstellung. `art`: `erstellung_abgeschlossen`, `session`, `skill`, `statrank_up`, `perk`, `klassenwechsel` (von, nach, Art; dazu die Skills, die dadurch eingefroren oder wieder steigerbar werden), `korrektur`. Das Protokoll ist nur Nachweis; maßgeblich sind die aktuellen Werte.
- **`hintergrund`:** Optionen der Erstellung (`schulden`, `coup`, `vertrag`; jeweils `null`, wenn nicht gewählt; `groesse`: `klein`, `mittel`, `gross`) und Freitexte. Nach der Erstellung nur im Schreibmodus änderbar.
- **`kassenbuch`:** alle Geldbewegungen. Kontostand = Summe der `betrag`; er wird nicht gespeichert. `art`: `startgeld`, `auftrag`, `kauf`, `verkauf`, `rate`, `korrektur`.
- **`schulden`:** Restschuld und verbleibende Frist; `null` ohne Schulden. **`auftraege`:** Zahl der abgeschlossenen Aufträge.
- **`ueberschrieben`:** Pfade der Werte, die im Schreibmodus von Hand gesetzt wurden. Dient nur der Kennzeichnung im Bogen.
- **`grundwerte_manuell`:** von Hand gesetzte Grundwerte. Ersetzen den berechneten Wert (Start + Perks) vollständig.
- **`anpassungen`:** dauerhafte Boni und Mali der SL. Jede ist ein [Modifikator](#modifikator) mit zusätzlich `id`, `grund` (Freitext) und `aktiv` (abschaltbar, ohne zu löschen).
- **Protokoll-Arten** zusätzlich: `anpassung` (angelegt, geändert, gelöscht).

### Felder im Spielstand

- **HP aktuell** = HP-Höchstwert − `hp_verlust_wunden` − `prellungen`. `hp_verlust_wunden` sinkt nur durch Erholungsproben, `prellungen` nur durch eine Nacht Ruhe.
- **`ausruestung.aktive_waffe`:** `id` der aktiven Waffe (genau eine). Waffen in der Ausrüstung haben eine eigene `id`, weil ein Charakter dieselbe Waffe mehrmals besitzen kann.
- **Waffe `im_magazin`:** aktueller Inhalt inklusive Patrone im Lauf. Jeder abgegebene Schuss wird abgezogen.
- **Waffe `reserve`:** Inhalt jedes Ersatzmagazins (angebrochene Magazine möglich). Beim Nachladen wandert der Rest des eingesetzten Magazins hierher; ein leeres zählt zu `leere_magazine`.
- **Waffe `aufsaetze`:** IDs der angebrachten Aufsätze aus `aufsaetze.json`. Ob ein Schalter-Aufsatz gerade im Einsatz ist, wird nicht gespeichert; er wird je Schuss eingeschaltet.
- **`ausruestung.vorrat`:** Granaten und Geschosse mit Anzahl. Jeder Wurf und jedes Laden eines Werfers zieht 1 ab. Die Anzahl ist jederzeit von Hand erhöhbar. Bei 0 bleibt der Eintrag stehen (zum Auffüllen).
- **`trageort`** (Waffen, Nahkampfwaffen, Vorrat): `schlinge`, `weste` (Rig oder Weste), `holster`, `guertel` (auch Scheide), `ruecken`, `rucksack`. Bestimmt die Kosten des Wechsels; die Tabelle steht in `regeln.json` (Regelwerk: Kampfsystem, Waffe wechseln).
- **`lose_patronen`:** Munition ohne Magazin, für einzeln laden und zum Füllen von Magazinen, Schnellladern und Ladestreifen (alle Waffen außer Werfern). **`leere_magazine`** (nur Wechselmagazin): leere Ersatzmagazine; ein leeres Magazin wandert beim Nachladen hierher statt zu entfallen. **`zubehoer`:** Schnelllader bzw. Ladestreifen der Waffe mit Zahl gefüllt und leer.
- **`ausruestung.nahkampfwaffen`:** eigene Nahkampfwaffen, je Eintrag mit `anzahl` (fehlt das Feld: 1). Ein Wurf zieht 1 ab; bei 0 bleibt der Eintrag stehen, eingesammelte Waffen werden von Hand wieder dazugezählt. Körperwaffen und Einsätze mit der Schusswaffe (Kolben, Lauf, Pistolengriff) bietet die App ohne Eintrag an.
- **`ausruestung.schild`:** `null` oder ID aus `schutz.json` (`schilde`).
- **Waffe `ladehemmung`:** `null`, `einfach` oder `schwer`. Blockiert das Schießen.
- **Waffe `munitionstyp`:** Typ des Kalibers (Schlüssel in `munition.json` `typen`); bei Werfern die ID des geladenen Geschosses, leer = ungeladen.
- **`gefecht.stand`:** Stand-ID aus `regeln.json` (`staende`). **`gefecht.bewegt`:** `null` oder die schnellste Bewegung dieser Runde (`bewegung.arten`); **`bewegungen`**: Zahl der Bewegungen dieser Runde (Sprint). **`gehechtet`**: in dieser Runde gehechtet (zählt als eigene Bewegung für die Lage; es zählt die mit mehr Malsteps).
- **`gefecht.zielen`:** Merker aus Zielen: gilt nur für einen Schuss in Runde `runde` (Break-Zielen: nächste Runde; Main-Zielen mit Ruhige Hand: dieselbe Runde). `stepshields` für den Schuss, `ohne_reichweite` (Gezielter Schuss), `gezielt_in`: Runde des Zielens; bewegt sich der Charakter danach in dieser Runde, entfällt `ohne_reichweite` und es gilt der Stepshield. Jeder Schuss und „Neues Ziel“ löschen den Merker.
- **`gefecht.konzentration`:** `null`, `leicht` oder `voll` für diese Runde (Break 0; Bewegung bzw. Standwechsel beschränkt).
- **`gefecht.verbraucht`**, **`gefecht.korrektur`:** verbrauchte Aktionen dieser Runde und Korrektur von Hand (langer Druck, ±1). Die verbleibende Zahl wird berechnet: Höchstzahl (aus `regeln.json` `aktionen`; Sprint, Initiative-Krit, Konzentration) − verbraucht + Korrektur; bei Over the Edge ein gemeinsamer Zähler `over_the_edge_gesamt`. **`break_verloren`**: Breakaction durch Stagger verloren. „Nächste Runde“ setzt alles zurück.
- **`gefecht.deckung`:** aktueller Deckungswert und verdeckte Zonen (`null` = keine Deckung). Gespeichert sind die tatsächlich verdeckten Zonen, nach Anwendung der Regeln für Rumpf und Arme. Wird bei Gefechtsende gelöscht.
- **`gefecht.protokoll`:** Ereignisse des laufenden Gefechts mit Eingabe und den daraus folgenden Änderungen (für Rückgängig). `art`: `treffer`, `schaden_direkt`, `schuss`, `aktion`, `leiter`. Wird bei Gefechtsende gelöscht.
	- `schuss`: `runde`, `zeit`, `waffe` (ID des Waffeneintrags) und `text` (Zeilen des Berichts). `aktion`: `runde`, `zeit`, `text` (Nachladen, Waffe wechseln, Zielen, Hechten …).
	- `leiter`: jede Änderung von Adrenalin bzw. Ruhepuls mit `runde`, `zeit`, `ursache` (`start`, `rad`, `rundenende`, `senken`), `von`, `nach` und `gesenkt_vorher` (Stand von `gesenkt_diese_runde` vorher). Auch ein misslungenes Senken bekommt einen Eintrag (`von` = `nach`). Rückgängig nimmt den letzten Eintrag zurück, wenn er aus der laufenden Runde stammt oder das gerade abgeschlossene Rundenende ist; der Start des Gefechts bleibt.
- **Außerhalb des Gefechts** ist `gefecht` nur `{ "aktiv": false }`. „Gefecht starten“ legt alle Felder neu an, „Gefecht beenden“ setzt wieder `{ "aktiv": false }`. Felder, die erst mit späteren Schritten kommen (`deckung`), fehlen bis dahin; die App ergänzt sie beim Start eines Gefechts. Fehlen in einem laufenden Gefecht Felder einer neueren Version (z. B. `verbraucht`), ergänzt die App sie beim Lesen mit leeren Werten.
- **`gefecht.initiative`:** Ergebnis der Initiative dieser Runde (`wurf` = `null`, wenn nur der Ausgang eingetragen wurde), `null` bis zum Wurf.
- **`gefecht.lage.sl_gefecht`:** Steps der SL für das ganze Gefecht. Ohne `gilt_fuer` gelten sie für alle Proben.
- **`gefecht.lage.letzte_gruende`:** die zuletzt verwendeten Gründe der SL (höchstens 6), zum Antippen.
- **`gefecht.sichtstufe`:** Sichtstufe aus `regeln.json` (`sicht.stufen`); Start ist die erste Stufe.
- **Wunde `blutung.status`:** `offen` (Frist läuft oder Gefecht noch aktiv), `gestoppt`, `abgelaufen` (normale Wunde hat Nachschaden verursacht).
- **Wunde `blutung.frist_ende`:** Zeitpunkt (ISO 8601), gesetzt bei Gefechtsende. Echtzeit oder Spielzeit ist noch offen; vorerst Spielzeit in Minuten seit Gefechtsende als Zahl erlaubt.
- **Wunde `versorgt`:** `null`, `druckverband`, `tourniquet`, `operation`.
- **Wunde `nachsorge`:** `null` (noch nicht erfolgt), `krit`, `gelungen`, `misslungen`, `keine`.
- **Heildauer** wird berechnet: `schaden` × Tage je Schaden (`regeln.json`) × Nachsorge-Faktor, aufgerundet. Eine Wunde ist geheilt, wenn `ruhetage_geheilt` ≥ Heildauer; dann wird sie aus der Liste entfernt.
- **Nachschaden normaler Blutung** wird auf `schaden` der Wunde aufgeschlagen und auf `hp_verlust_wunden`.

### Migration

- **1 → 2:** neue Felder `erstellung` (Entwurf: leerer Stand, fertig: `null`) und `vorratslevel_manuell` (`null`).

`schema` wird bei jeder inkompatiblen Änderung erhöht. Beim Laden prüft die App die Version und migriert schrittweise (1 → 2 → 3 …). Import einer Datei mit höherer Version als bekannt: Fehlermeldung, nichts überschreiben.

---

## Herkunft der Daten

Die Daten stammen aus dem Regelwerk unter `regelwerk/` (Kopie aus dem Repo CQB). Alle Bestände des Regelwerks sind übernommen (Stand 16.11.2026: 36 Skills, 61 Perks, 18 Schusswaffen, 15 Kaliber, 13 Nahkampfwaffen, 10 Granaten und Geschosse, 33 Klassen). Dabei gilt:
- Malsteps aus dem Vault („−2“) werden positiv gespeichert.
- „n/A“ → `null` bzw. fehlender Schlüssel (Munitionstypen).
- Ideen und Notizen aus dem Vault (z. B. „Perk-Ideen“) werden nicht übernommen, solange sie nicht ausformuliert sind.
