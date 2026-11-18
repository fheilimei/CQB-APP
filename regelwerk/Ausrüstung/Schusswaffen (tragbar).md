# Begriffserklärung
Die tragbaren Schusswaffen werden hier aufgelistet. Erklärung der Begriffe:
**Name** = Bezeichnung des Gegenstandes
**Waffenskill** = Mit welchem Skill die Waffe benutzt wird: Treffen und einfache Ladehemmung beheben ([[Stats, Skills und Perks#Waffenskills]]).
**Rückstoß** = Malsteps je Feuermodus, unabhängig von der Munition. Sie erschweren die Haltezahl bei Folgeschüssen ([[Kampfsystem#Treffen]]). Spanne 0–4; Burst hat denselben Rückstoß wie Einzelfeuer, Vollautomatik 1 Malstep mehr. Schreibweise bei zwei Modi: EF / VA.
**Munition** / **Kaliber** = Kaliber und Munitionstypen, die die Waffe verschießt ([[Munitionstypen]]).
**Magazingröße** = Schüsse pro Magazin; hängt vom verwendeten Magazin ab, „+1“ ist die Patrone im Lauf. Steht „Trommel“, „Röhrenmagazin“ oder „fest“ dahinter, hat die Waffe kein Wechselmagazin: Sie wird einzeln oder mit Zubehör geladen ([[Kampfsystem#Nachladen]], [[#Zubehör]]).
**Durchschlagskraft und Mannstoppwirkung** = DK/MW je Munitionstyp ([[Schaden, Blutung und Verletzungen]]).
**Feuermodus** = Einzelfeuer (EF), Burst oder Vollautomatik (VA) ([[Kampfsystem#Treffen]], Folgeschüsse). **Burst** gibt zusätzlich die Burst-Länge an (Schüsse je Burst, z. B. 3). Halbautomatik, Pump-Action und Repetieren sind keine eigenen Feuermodi, sondern Einzelfeuer; die Bauart wirkt nur über Feuerrate und Ladehemmungsrate.
**Feuerrate** = Wie viele Schüsse höchstens pro Runde abgegeben werden können, je Feuermodus. Bei Burst ein Vielfaches der Burst-Länge (z. B. 2 Bursts à 3 = 6).
**Garbenfaktor** = Nur bei Vollautomatik: Wie viele Kugeln ein Folgetreffer zählt (×1 bis ×3, [[Kampfsystem#Treffen]]). Wird aus der Feuerrate bei VA abgeleitet: bis 10 → ×1, 11–20 → ×2, ab 21 → ×3. Hohe Garbenfaktoren werden über DK/MW und Rückstoß-Malsteps ausgeglichen. *Vorläufig.*
**Reichweite** = Malsteps auf die Trefferprobe (Control) je Reichweitenband. bedrängt: bis 2 m (Armeslänge, Nahkampf; [[Kampfsystem#Nahkampf]]) | nah: 3m - 15m |  mittel: 16m - 30m | weit: 31m - 100 m | sehr weit: 101m - 250m | fern: 251 - maximale Reichweite. Ungenaue Waffen haben mehr Malsteps, besonders genaue weniger.
**Geldwertspanne** = Übliche Preisspanne in $; der Zustand legt den Preis innerhalb der Spanne fest ([[#Zustand]]).
**Vorratslevel** = Wie schwer der Gegenstand zu beschaffen ist: von 1 (selbst Zivilisten kommen daran) bis 5 (nur mächtige Regierungen und Schmuggler mit Draht zum Hersteller). Die Klasse legt fest, bis zu welchem Level du kaufen kannst ([[Charaktererstellung#7. Ausrüstung]]); darüber hilft der Skill Beschaffen ([[Stats, Skills und Perks#Skillproben]]).
**Anschlüsse** = An welche Anschlüsse der Waffe Aufsätze passen ([[#Aufsätze]]).
**Waffenperks**/**Besonderheiten** = Perks und Sonderregeln der Waffe.
**Zustand** = Wie gut die Waffe erhalten ist: A, B, C oder D ([[#Zustand]]). Er wirkt auf die Ladehemmungsrate und den Preis.
**Zuverlässigkeit** = Klasse der Waffe: zuverlässig oder normal. Sie legt fest, wie stark der Zustand die Ladehemmungsrate erhöht ([[#Zustand]]).
**Ladehemmungsrate** (LH) = Wahrscheinlichkeit einer Ladehemmung pro Trefferprobe, je Feuermodus ([[Kampfsystem#Ladehemmung]]). **LH-Behebenmod.** = Malsteps beim Beheben einer Ladehemmung.

# Zustand

**Stufen.** Jede Waffe hat einen Zustand. Eine neue Waffe ist in Zustand A.

| Zustand | Bedeutung |
| --- | --- |
| A | neuwertig |
| B | gebraucht |
| C | verschlissen |
| D | schrottreif |

**Wirkung.** Der Zustand erhöht die Ladehemmungsrate ([[Kampfsystem#Ladehemmung]]) um einen Zuschlag in Prozentpunkten. Wie hoch, hängt von der Zuverlässigkeit der Waffe ab. Außerdem senkt er den Preis innerhalb der Geldwertspanne (unten, *Preis*). Auf andere Werte wirkt er nicht. *Vorläufige Werte.*

| Zuverlässigkeit | A | B | C | D |
| --- | --- | --- | --- | --- |
| zuverlässig | +0 | +1 | +3 | +6 |
| normal | +0 | +2 | +5 | +9 |

**Verschlechterung.** Der Zustand sinkt um 1 Stufe:
- durch eine **schwere Ladehemmung** ([[Kampfsystem#Ladehemmung]]),
- durch ein **Gefecht**, in dem die Waffe benutzt wurde, wenn sie danach nicht gereinigt wird (unten),
- durch **Umwelt** (Schlamm, Sand, Wasser, Sturz). Ob und wann, legt die SL fest.

Sinkt der Zustand unter D, ist die Waffe unbrauchbar.

**Preis.** Teile die Geldwertspanne in vier gleiche Abschnitte. Der Zustand bestimmt den Abschnitt; innerhalb des Abschnitts legt die SL den Preis fest (Verkäufer, Region, Lage).

| Zustand | Abschnitt der Geldwertspanne |
| --- | --- |
| A | oberstes Viertel |
| B | drittes Viertel |
| C | zweites Viertel |
| D | unterstes Viertel |

- **Verhandeln:** Contested Roll ([[Würfelmechanik#Contested Rolls]]) zwischen Käufer und Händler. Beide würfeln auf **Empathy** mit dem Skill **Verhandeln** ([[Stats, Skills und Perks#Sozial]]). Es zählt der Abschnitt, den der Zustand vorgibt:
	- **Käufer gewinnt:** untere Grenze des Abschnitts.
	- **Händler gewinnt:** obere Grenze des Abschnitts.
	- **Unentschieden:** Mitte des Abschnitts.
	- **Krit des Siegers:** Der Preis rutscht um ein Viertel der Spanne weiter in seine Richtung, höchstens bis zur Grenze der Spanne.
	- Beim Verkauf gilt dasselbe mit vertauschten Rollen.
	- **Ein Versuch pro Geschäft.** Neu verhandeln lässt sich nur aus neuem Anlass (anderes Angebot, späterer Tag).
- **Unbrauchbar:** Die Waffe ist nur noch ihre Teile wert. Den Preis legt die SL fest, höchstens die Untergrenze der Spanne.

**Reinigung.** Etwa 15 Minuten, ohne Probe, außerhalb des Gefechts. Wer die Waffe nach einem Gefecht vor dem nächsten Gefecht reinigt, verhindert die Verschlechterung durch das Gefecht.

**Reparatur.** Mit Werkzeug und Ersatzteilen hebt eine gelungene Probe auf **Intellect** mit dem Skill **Mechanik** ([[Stats, Skills und Perks#Technik und Wissen]]) den Zustand um 1 Stufe, höchstens bis A. Dauer und Kosten legt die SL fest.

# Aufsätze

**Anschlüsse.** Aufsätze werden an Anschlüsse der Waffe angebracht. Jede Waffe nennt ihre Anschlüsse. An jeden Anschluss passt genau ein Aufsatz.

| Anschluss | Typische Aufsätze |
| --- | --- |
| Schiene oben | Visiere |
| Schiene unten | Zweibein, Vordergriff, Unterlaufwerfer, Lampe |
| Schiene seitlich | Lampe |
| Mündung | Schalldämpfer, Kompensator, Bajonett |
| Magazin | erweiterte Magazine |

- **Mündung:** Sie gehört zu einer Kaliberklasse: **Pistole** oder **Gewehr**. Ein Mündungsaufsatz passt nur an seine Klasse, z. B. „Schalldämpfer (Pistole)“.
- **Magazin:** Die Waffe nennt die passenden Magazine mit ihrer Größe (z. B. „Magazin (30, Trommel 100)“). Ein erweitertes Magazin ersetzt die Magazingröße.
- **Schienen** sind einheitlich: Jeder Schienenaufsatz passt an jede Schiene seiner Lage.

**Wirkungen.** *Vorläufige Werte.*

| Aufsatz | Anschluss | Wirkung |
| --- | --- | --- |
| Reflexvisier | Schiene oben | 1 Stepshield auf die Trefferprobe in den Bändern bedrängt und nah ([[Kampfsystem#Treffen]]). |
| Zielfernrohr | Schiene oben | 1 Stepshield auf die Trefferprobe ab dem Band weit; 1 Malstep im Band bedrängt. |
| Zweibein | Schiene unten | Aufgesetzt: 1 Stepshield auf die Haltezahl ([[Kampfsystem#Treffen]], Rückstoß abfangen); die Waffe gilt als aufgelegt ([[Kampfsystem#Stepshields der Lage]]). |
| Vordergriff | Schiene unten | 1 Stepshield auf die Haltezahl. |
| Unterlaufwerfer | Schiene unten | Ein Werfer unter dem Lauf, z. B. [[#M203]]. |
| Lampe | Schiene unten oder seitlich | Eingeschaltet: Ein Ziel in den Bändern bedrängt und nah, das du anleuchtest, siehst du mit Sichtstufe klar ([[Wahrnehmung#Sehen]]). Du selbst bist dabei für andere sichtbar, auch bei schlechter Sicht. |
| Schalldämpfer | Mündung | Der Schuss ist 1 Stufe leiser ([[Wahrnehmung#Lautstärken]]). |
| Kompensator | Mündung | 1 Stepshield auf die Haltezahl. |
| Bajonett | Mündung (Gewehr) | Nahkampfwaffe am Gewehr ([[Nahkampfwaffen]]). |
| Erweitertes Magazin | Magazin | Größere Magazingröße. Trommelmagazine: +2 auf die Ladehemmungsrate ([[Kampfsystem#Ladehemmung]]). |

**Anbringen und Abnehmen.**
- **Außerhalb des Gefechts:** frei.
- **Im Gefecht:** Mainaction mit leichter Konzentration ([[Kampfsystem#Konzentration]]).
- **Ohne Aktion:** Zweibein aufsetzen, Lampe ein- oder ausschalten.

# Zubehör

Zubehör wird nicht an die Waffe angebracht, sondern mitgeführt. Es gelten Geldwertspanne und Vorratslevel wie bei Waffen ([[#Begriffserklärung]]).

| Zubehör | Passt zu | Vorratslevel | Geldwertspanne | Wirkung |
| --- | --- | --- | --- | --- |
| Schnelllader | Revolver (je Modell) | 1 | 5–15 | Füllt die Trommel auf einmal; Nachladen wie mit Magazin ([[Kampfsystem#Nachladen]]). |
| Ladestreifen | Repetiergewehre mit festem Magazin (je Kaliber) | 1 | 5–15 | Füllt das Magazin auf einmal; Nachladen wie mit Magazin ([[Kampfsystem#Nachladen]]). |

Ein leerer Schnelllader oder Ladestreifen wird einzeln gefüllt ([[Kampfsystem#Nachladen]]). *Vorläufige Werte.*

# Blaupause
**Name**: XX | **Waffenskill**: XX | **Vorratslevel**: XX | **Geldwertspanne**: XX | **Zustand**: A bis D
**Kaliber**: XX / XX / XX 
**Feuermodus**: XX | **Anschlüsse**: XX
**Ladehemmungsrate** (LH): XX / XX / XX | **LH-Behebenmod.**: x
**Zuverlässigkeit**: zuverlässig / normal
**Reichweite**: bedrängt: XX / nah: XX / mittel: XX / weit: XX / sehr weit: XX / fern: XX
**Magazingröße**: XX+1 | **Feuerrate**: XX | **Rückstoß**: X bzw. EF X / VA X | **Garbenfaktor**: ×X (nur VA)
**Durchschlagskraft und Mannstoppwirkung**: X/X
**Waffenperks/Besonderheiten**: Xxxxx…



# Makarov
Name: Makarov PM | Waffenskill: Pistole | Vorratslevel: 2 | Geldwertspanne: 50-200 | Zustand: X
Kaliber: 9x18 FMJ / 9x18 HP / 9x18 AP
Feuermodus: Einzelfeuer (EF) | Anschlüsse: – (Makarov PB: Schalldämpfer eingebaut)
Ladehemmungsrate (LH): bei EF: 0 % | LH-Behebenmod.: 0
Zuverlässigkeit: zuverlässig
Reichweite: bedrängt: -2 / nah: -1 / mittel: -2 / weit: -4 / sehr weit: n/A / fern: n/A
Magazingröße: 8+1 | Feuerrate: 3 | Rückstoß: 1
Durchschlagskraft und Mannstoppwirkung: FMJ 0/1 / HP 0/2 / AP 1/1   
Waffenperks/Besonderheiten: ungenau, zuverlässig.

# FN Five-seveN
Name: FN Five-seveN | Waffenskill: Pistole | Vorratslevel: 4 | Geldwertspanne: 500-950 | Zustand: X
Kaliber: 5,7x28mm FMJ / 5,7x28mm HP / 5,7x28mm AP
Feuermodus: Einzelfeuer (EF) | Anschlüsse: Schiene unten, Mündung (Pistole), Magazin (20, 30)
Ladehemmungsrate (LH): bei EF: 0 % | LH-Behebenmod.: 2
Zuverlässigkeit: zuverlässig
Reichweite: bedrängt: -1 / nah: +0 / mittel: -1 / weit: -3 / sehr weit: -4 / fern: n/A
Magazingröße: 10+1 | Feuerrate: 4 | Rückstoß: 0
Durchschlagskraft und Mannstoppwirkung: FMJ 1/1 / HP 0/2 / AP 2/1   
Waffenperks/Besonderheiten: genau, zuverlässig.

# M1911 Colt
Name: M1911 Colt | Waffenskill: Pistole | Vorratslevel: 2 | Geldwertspanne: 90-250 | Zustand: X
Kaliber: 45 ACP FMJ / 45 ACP HP /45ACP AP
Feuermodus: Einzelfeuer (EF) | Anschlüsse: –
Ladehemmungsrate (LH): bei EF: 5% | LH-Behebenmod.: 1
Zuverlässigkeit: normal
Reichweite: bedrängt: -1 / nah: +0 / mittel: -2 / weit: -4 / sehr weit: -5 / fern: n/A
Magazingröße: 7+1 | Feuerrate: 3 | Rückstoß: 2
Durchschlagskraft und Mannstoppwirkung: FMJ 1/2 / HP 0/3 / AP 2/2   
Waffenperks/Besonderheiten:

# Beretta 92
Name: Beretta 92 | Waffenskill: Pistole | Vorratslevel: 2 | Geldwertspanne: 75-225 | Zustand: X
Kaliber: 9x19 PB FMJ / 9x19 PB HP / 9x19 PB AP
Feuermodus: Einzelfeuer (EF) | Anschlüsse: Schiene unten, Mündung (Pistole)
Ladehemmungsrate (LH): bei EF: 2% | LH-Behebenmod.: 1
Zuverlässigkeit: normal
Reichweite: bedrängt: -1 / nah: +0 / mittel: -2 / weit: -3 / sehr weit: -4 / fern: n/A
Magazingröße: 15+1 | Feuerrate: 4 | Rückstoß: 1
Durchschlagskraft und Mannstoppwirkung: FMJ 1/1 / HP 1/2 / AP 2/1   
Waffenperks/Besonderheiten:

# S&W Model 10
Name: Smith & Wesson Model 10 | Waffenskill: Pistole | Vorratslevel: 1 | Geldwertspanne: 30-120 | Zustand: X
Kaliber: .38 Special FMJ / .38 Special HP
Feuermodus: Einzelfeuer (EF) | Anschlüsse: –
Ladehemmungsrate (LH): bei EF: 0 % | LH-Behebenmod.: 0
Zuverlässigkeit: zuverlässig
Reichweite: bedrängt: -1 / nah: +0 / mittel: -2 / weit: -4 / sehr weit: n/A / fern: n/A
Magazingröße: 6 (Trommel) | Feuerrate: 3 | Rückstoß: 1
Durchschlagskraft und Mannstoppwirkung: FMJ 0/1 / HP 0/2
Waffenperks/Besonderheiten: alter Revolver, billig und überall zu haben. Trommel statt Magazin: einzeln laden oder mit Schnelllader ([[Kampfsystem#Nachladen]], [[#Zubehör]]). *Vorläufige Werte.*

# Hi-Point C9
Name: Hi-Point C9 | Waffenskill: Pistole | Vorratslevel: 1 | Geldwertspanne: 40-150 | Zustand: X
Kaliber: 9x19 PB FMJ / 9x19 PB HP / 9x19 PB AP
Feuermodus: Einzelfeuer (EF) | Anschlüsse: –
Ladehemmungsrate (LH): bei EF: 5 % | LH-Behebenmod.: 2
Zuverlässigkeit: normal
Reichweite: bedrängt: -1 / nah: +0 / mittel: -2 / weit: -4 / sehr weit: -5 / fern: n/A
Magazingröße: 8+1 | Feuerrate: 3 | Rückstoß: 1
Durchschlagskraft und Mannstoppwirkung: FMJ 1/1 / HP 1/2 / AP 2/1
Waffenperks/Besonderheiten: billige Straßenpistole, schwer und klobig, neigt zu Ladehemmungen. *Vorläufige Werte.*

# Beretta 93R
Name: Beretta 93R | Waffenskill: Maschinenpistole | Vorratslevel: 4 | Geldwertspanne: 600 - 1200 | Zustand: X
Kaliber: 9x19 PB FMJ / 9x19 PB HP / 9x19 PB AP
Feuermodus: Einzelfeuer (EF), Burst (3) | Anschlüsse: Mündung (Pistole)
Ladehemmungsrate (LH): bei EF: 2% / bei Burst: 4% | LH-Behebenmod.: 1
Zuverlässigkeit: normal
Reichweite: bedrängt: -1 / nah: +0 / mittel: -2 / weit: -3 / sehr weit: -4 / fern: n/A
Magazingröße: 20+1 | Feuerrate: bei EF: 4 / bei Burst: 6 (2 × 3) | Rückstoß: EF 1 / Burst 1
Durchschlagskraft und Mannstoppwirkung: FMJ 1/1 / HP 1/2 / AP 2/1
Waffenperks/Besonderheiten: Maschinenpistole auf Basis der Beretta 92; klappbarer Vordergriff, sehr hohe Kadenz im Burst.

# Ak-47
Name: Kalashnikov Ak-47 | Waffenskill: Sturmgewehr | Vorratslevel: 2 | Geldwertspanne: 250 - 400 | Zustand: X
Kaliber: 7.62x39mm FMJ, 7.62x39mm HP, 7.62x39mm AP
Feuermodus: Einzelfeuer (EF), Vollauto. (VA) | Anschlüsse: Mündung (Gewehr), Magazin (Trommel 75)
Ladehemmungsrate: bei EF: 1% / bei VA: 3% | LH-Behebenmod.: 0
Zuverlässigkeit: zuverlässig
Reichweite: bedrängt: -2 / nah: -1 / mittel: -2 / weit: -3 / sehr weit: -4 / fern: -5
Magazingröße: 30+1 | Feuerrate: bei EF: 4 / bei VA: 15 | Rückstoß: EF 2 / VA 3 | Garbenfaktor: ×2
Durchschlagskraft und Mannstoppwirkung: FMJ 2/3 / HP 1/4 / AP 3/3
Waffenperks/Besonderheiten: ungenau, zuverlässig

# M4 Carbine
Name: Colt M4 Carbine | Waffenskill: Sturmgewehr | Vorratslevel: 3 | Geldwertspanne: 300 - 500 | Zustand: X
Kaliber: 5.56x45mm FMJ, 5.56x45mm HP, 5.56x45mm AP 
Feuermodus: Einzelfeuer (EF), Vollauto. (VA) | Anschlüsse: Schiene oben, Schiene unten, Schiene seitlich, Mündung (Gewehr), Magazin (30, Trommel 100)
Ladehemmungsrate: bei EF: 4% / bei VA: 6% | LH-Behebenmod.: 1
Zuverlässigkeit: normal
Reichweite: bedrängt: -2 / nah: +0 / mittel: -1 / weit: -2 / sehr weit: -3 / fern: -5
Magazingröße: 20+1 | Feuerrate: bei EF: 4 / bei VA: 15 | Rückstoß: EF 1 / VA 2 | Garbenfaktor: ×2
Durchschlagskraft und Mannstoppwirkung: FMJ 2/2 / HP 1/3 / AP 3/2
Waffenperks/Besonderheiten: genau, etwas störanfälliger als die AK-47

# M16A4
Name: Colt M16A4 | Waffenskill: Sturmgewehr | Vorratslevel: 3 | Geldwertspanne: 350 - 600 | Zustand: X
Kaliber: 5.56x45mm FMJ, 5.56x45mm HP, 5.56x45mm AP
Feuermodus: Einzelfeuer (EF), Burst (3) | Anschlüsse: Schiene oben, Schiene unten, Schiene seitlich, Mündung (Gewehr), Magazin (30, Trommel 100)
Ladehemmungsrate: bei EF: 3% / bei Burst: 4% | LH-Behebenmod.: 1
Zuverlässigkeit: normal
Reichweite: bedrängt: -3 / nah: +0 / mittel: +0 / weit: -1 / sehr weit: -3 / fern: -4
Magazingröße: 20+1 | Feuerrate: bei EF: 4 / bei Burst: 6 (2 × 3) | Rückstoß: EF 1 / Burst 1
Durchschlagskraft und Mannstoppwirkung: FMJ 2/2 / HP 1/3 / AP 3/2
Waffenperks/Besonderheiten: genau, langer Lauf; in engen Räumen unhandlicher als die M4.

# SCAR Mk 17 Mod 0
Name: SCAR Mk 17 Mod 0 | Waffenskill: Sturmgewehr | Vorratslevel: 4 | Geldwertspanne: 600 - 1200 | Zustand: X
Kaliber: 7.62x51mm FMJ / 7.62x51mm AP
Feuermodus: Einzelfeuer (EF) | Anschlüsse: Schiene oben, Schiene unten, Schiene seitlich, Mündung (Gewehr), Magazin (20)
Ladehemmungsrate (LH): bei EF: 4 % | LH-Behebenmod.: 2
Zuverlässigkeit: normal
Reichweite: bedrängt: -2 / nah: -1 / mittel: +0 / weit: -1 / sehr weit: -2 / fern: -4
Magazingröße: 10+1 | Feuerrate: 2 | Rückstoß: 3
Durchschlagskraft und Mannstoppwirkung: FMJ 2/3 / AP 3/3   
Waffenperks/Besonderheiten:


# Mosin Nagant
Name: Mosin Nagant | Waffenskill: Präzisionsgewehr | Vorratslevel: 2 | Geldwertspanne: 200 - 350 | Zustand: X
Kaliber: 7.62x54mmR FMJ / 7.62x54mmR AP
Feuermodus: Einzelfeuer (EF) | Anschlüsse: Schiene oben, Mündung (Gewehr)
Ladehemmungsrate (LH): bei EF: 2 % | LH-Behebenmod.: 1
Zuverlässigkeit: normal
Reichweite: bedrängt: -3 / nah: -1 / mittel: +0 / weit: -1 / sehr weit: -2 / fern: -3
Magazingröße: 5 (fest) | Feuerrate: 1 | Rückstoß: 4
Durchschlagskraft und Mannstoppwirkung: FMJ 3/2 / AP 4/2   
Waffenperks/Besonderheiten: festes Magazin: einzeln laden oder mit Ladestreifen ([[Kampfsystem#Nachladen]], [[#Zubehör]]).

# Ithaca M37
Name: Ithaca M37 | Waffenskill: Schrotflinte | Vorratslevel: 2 | Geldwertspanne: 150 - 350 | Zustand: X
Kaliber: 12 Gauge Buckshot / 12 Gauge Slug
Feuermodus: Einzelfeuer (EF) | Anschlüsse: –
Ladehemmungsrate (LH): bei EF: 1 % | LH-Behebenmod.: 1
Zuverlässigkeit: zuverlässig
Reichweite: bedrängt: -1 / nah: +0 / mittel: -2 / weit: -3 / sehr weit: -5 (nur Slug) / fern: n/A
Magazingröße: 4+1 (Röhrenmagazin) | Feuerrate: 2 | Rückstoß: 3
Durchschlagskraft und Mannstoppwirkung: Buckshot 0/1 je Kugel / Slug 2/4 ([[Munitionstypen#Schrotflinten]])
Waffenperks/Besonderheiten: Pump-Action; einfach, robust. Auswurf nach unten.

# SPAS-12
Name: Franchi SPAS-12 | Waffenskill: Schrotflinte | Vorratslevel: 3 | Geldwertspanne: 500 - 900 | Zustand: X
Kaliber: 12 Gauge Buckshot / 12 Gauge Slug
Feuermodus: Einzelfeuer (EF) | Anschlüsse: –
Ladehemmungsrate (LH): bei EF: 4 % | LH-Behebenmod.: 1
Zuverlässigkeit: normal
Reichweite: bedrängt: -2 / nah: +0 / mittel: -2 / weit: -3 / sehr weit: -5 (nur Slug) / fern: n/A
Magazingröße: 8+1 (Röhrenmagazin) | Feuerrate: 3 | Rückstoß: 2
Durchschlagskraft und Mannstoppwirkung: Buckshot 0/1 je Kugel / Slug 2/4 ([[Munitionstypen#Schrotflinten]])
Waffenperks/Besonderheiten: schwer. Halbautomatisch; umschaltbar auf Pump-Action (ohne Aktion). Als Pump-Action gelten Feuerrate 2 und Ladehemmungsrate 1 %.

# Saiga 12
Name: Saiga 12 | Waffenskill: Schrotflinte | Vorratslevel: 3 | Geldwertspanne: 400 - 800 | Zustand: X
Kaliber: 12 Gauge Buckshot / 12 Gauge Slug
Feuermodus: Einzelfeuer (EF) | Anschlüsse: Magazin (12, Trommel 20)
Ladehemmungsrate (LH): bei EF: 5 % | LH-Behebenmod.: 0
Zuverlässigkeit: normal
Reichweite: bedrängt: -2 / nah: +0 / mittel: -2 / weit: -3 / sehr weit: -5 (nur Slug) / fern: n/A
Magazingröße: 8+1 (Kastenmagazin) | Feuerrate: 3 | Rückstoß: 2
Durchschlagskraft und Mannstoppwirkung: Buckshot 0/1 je Kugel / Slug 2/4 ([[Munitionstypen#Schrotflinten]])
Waffenperks/Besonderheiten: halbautomatisch, Bauweise der AK-47, schnelles Nachladen über Kastenmagazin. Wählerisch bei schwacher Munition.

# Werfer
Werfer verschießen Geschosse aus [[Sprengwaffen#Geschosse]]. Geschossen wird mit dem Skill **Werfer**; statt Treffer und Trefferzone gilt der Landepunkt ([[Kampfsystem#Treffen]], [[Sprengwirkung#Landepunkt]]). DK/MW, Splitter und Druckwelle stehen beim Geschoss.

# RPG-7
Name: RPG-7 | Waffenskill: Werfer | Vorratslevel: 4 | Geldwertspanne: 400 - 1000 | Zustand: X
Kaliber: OG-7V / PG-7V ([[Sprengwaffen#Geschosse]])
Feuermodus: Einzelfeuer (EF) | Anschlüsse: –
Ladehemmungsrate (LH): bei EF: 2 % | LH-Behebenmod.: 1
Zuverlässigkeit: zuverlässig
Reichweite: bedrängt: -3 / nah: +0 / mittel: +0 / weit: -1 / sehr weit: -3 / fern: n/A
Magazingröße: 1 | Feuerrate: 1 | Rückstoß: 1
Durchschlagskraft und Mannstoppwirkung: siehe Geschoss
Waffenperks/Besonderheiten: zuverlässig, unhandlich. Nachladen benötigt volle Konzentration ([[Kampfsystem#Konzentration]]).

# M79
Name: M79 Granatwerfer | Waffenskill: Werfer | Vorratslevel: 4 | Geldwertspanne: 500 - 1200 | Zustand: X
Kaliber: 40x46mm M406 HE / M433 HEDP ([[Sprengwaffen#Geschosse]])
Feuermodus: Einzelfeuer (EF) | Anschlüsse: –
Ladehemmungsrate (LH): bei EF: 1 % | LH-Behebenmod.: 0
Zuverlässigkeit: zuverlässig
Reichweite: bedrängt: -2 / nah: +0 / mittel: +0 / weit: -1 / sehr weit: -3 / fern: n/A
Magazingröße: 1 | Feuerrate: 1 | Rückstoß: 2
Durchschlagskraft und Mannstoppwirkung: siehe Geschoss
Waffenperks/Besonderheiten: Kipplauf, einfach und zuverlässig.

# M203
Name: M203 Unterlauf-Granatwerfer | Waffenskill: Werfer | Vorratslevel: 5 | Geldwertspanne: 600 - 1500 | Zustand: X
Kaliber: 40x46mm M406 HE / M433 HEDP ([[Sprengwaffen#Geschosse]])
Feuermodus: Einzelfeuer (EF) | Anschlüsse: – (ist selbst ein Aufsatz für Schiene unten, [[#Aufsätze]])
Ladehemmungsrate (LH): bei EF: 1 % | LH-Behebenmod.: 0
Zuverlässigkeit: zuverlässig
Reichweite: bedrängt: -2 / nah: +0 / mittel: -1 / weit: -2 / sehr weit: -4 / fern: n/A
Magazingröße: 1 | Feuerrate: 1 | Rückstoß: 2
Durchschlagskraft und Mannstoppwirkung: siehe Geschoss
Waffenperks/Besonderheiten: Aufsatz unter dem Lauf eines Sturmgewehrs (z. B. M4). Gewehr und Werfer bleiben gleichzeitig einsatzbereit.
