# Verteilung
Stats haben Werte von 1–100, passend zum W100 ([[Würfelmechanik]]). Durch Statrank und Abweichung entstehen Werte von 21 bis 99. Diese Spanne ist fest; auch Perks erweitern sie nicht. Die Statranks gibt bei der Erstellung die Klasse vor, die Abweichung wird gewürfelt ([[Charaktererstellung#2. Statverteilung]]).

**Statwert** = Statrank + Abweichung

- **Statrank:** S (90), A (80), B (70), C (60), D (50), E (40), F (30). Höchster Rang ist S.
- **Abweichung:** Ergebnis des Abweichungswurfs (2W10, −9 bis +9), [[Charaktererstellung#2. Statverteilung]].

## Stats dauerhaft verändern
Dauerhaft ändert sich ein Stat nur auf zwei Wegen:

1. **Rank-Set der Klasse** – nur bei der Charaktererstellung ([[Charaktererstellung#2. Statverteilung]]).
2. **Statrank-Up** – kostet 1 freien Charakterpunkt ([[Charakteraufstieg#Charakterpunkte]]):
	- Der Stat steigt um einen Rang (+10). Nicht über S hinaus.
	- Die Abweichung wird neu gewürfelt ([[Charaktererstellung#2. Statverteilung]]). Die alte Abweichung entfällt.
	- **Statwert** = neuer Statrank + neue Abweichung. Der Statwert kann dadurch auch sinken; der Rang steigt trotzdem.

Ränge sinken nie. Im Spiel verändern Boni und Mali einen Stat nur vorübergehend über Steps (Stepshields und Malsteps, [[#Steps]]).


# Anwendung
Proben werden mit dem W100 abgelegt; ein Ergebnis bis zum Zielwert gelingt ([[Würfelmechanik#Würfel]]). Der Zielwert ist der Statwert nach Malsteps ([[#Steps]]).

**Runden.** Brüche werden kaufmännisch gerundet: ab 0,5 auf, darunter ab. Wo eine Regel selbst gerundete Werte vorgibt (z. B. die Faktoren in [[#Steps]]), ist zugunsten des Spielers gerundet.
## Steps
Malsteps erschweren eine Probe. Jeder Malstep senkt den Zielwert um einen wachsenden Anteil: Der erste nimmt 15 % vom Statwert, jeder weitere 10 Prozentpunkte mehr von der vorherigen Stufe.

| Malsteps | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Abschlag auf die vorherige Stufe | – | 15 % | 25 % | 35 % | 45 % | 55 % |
| Faktor auf den Statwert | 1 | 0,85 | 0,638 | 0,415 | 0,228 | 0,103 |

**Ab 6 Malsteps** ist keine Probe möglich: Die Handlung gelingt nicht. Maßgeblich sind die Malsteps, die nach Abzug des Skills übrig bleiben ([[#Skills]]).

**Stepshields** sind vorübergehende Boni. Sie wirken genau wie Skillstufen, stammen aber aus einer anderen Quelle (z. B. Zielen, [[Kampfsystem#Breakaction]]): Jeder Stepshield hebt einen Malstep auf. Übrige Stepshields erhöhen wie übrige Skillstufen die Krit-Schwelle ([[Würfelmechanik#Krit]]).

**Rechenweg:** Zielwert = Statwert × Faktor, einmal gerundet. Rechne jede Stufe vom Statwert aus, nie von einer bereits gerundeten Stufe.

Beispielwerte (Statwert fett, dann 1 bis 5 Malsteps):
- **79** I 67 I 50 I 33 I 18 I 8
- **54** I 46 I 34 I 22 I 12 I 6
- **35** I 30 I 22 I 15 I 8 I 4

Gegen Malsteps hilft der Skill ([[#Skills]]). Wie Malsteps beim Schießen entstehen: [[Kampfsystem#Treffen]].

# Krits
Siehe [[Würfelmechanik#Krit]]. Übrige Skillstufen und Stepshields erhöhen die Krit-Schwelle.

# Stats
Stats sind Werte von 1–100 ([[#Verteilung]]). Auf sie werden Proben abgelegt; Erschwernisse wirken als Malsteps ([[#Steps]]).
Im Spiel werden Statwerte nie direkt verändert. Vorübergehende Boni wirken nur als Stepshields, Mali nur als Malsteps ([[#Steps]]). Dauerhafte Änderungen: [[#Stats dauerhaft verändern]].


## Liste von Stats
Die 9 Stats bilden drei Gruppen:
- **Gruppe A:** Twitch, Brawn, Agility, Grit.
- **Gruppe B:** Control, Empathy, Intellect, Decisiveness.
- **Gruppe C:** Nerve.

[[Adrenalin]] wirkt auf Gruppe A positiv und auf Gruppe B negativ, der Ruhepuls umgekehrt. Nerve bremst den Anstieg von Adrenalin (siehe [[#Stats und ihre Auswirkung]]).

## Stats und ihre Auswirkung
Jeder Stat steht für eine Fähigkeit. Die Tabelle nennt die festen Proben des Stats und die Skills, die zu ihm gehören ([[#Liste von Skills]]). Andere Proben legt die SL nach dieser Zuordnung fest ([[#Skillproben]]).

| Stat | Gruppe | Feste Proben und Werte | Skills |
| --- | --- | --- | --- |
| Twitch | A | Reaktion bei der Breakaction ([[Kampfsystem#Reaktion und Antizipation]]) | Reflexe |
| Brawn | A | Haltezahl bei Folgeschüssen ([[Kampfsystem#Treffen]]); Kraftakte | Rückstoßkontrolle, Einschüchtern, Aufbrechen |
| Agility | A | Nahkampfangriff und -verteidigung ([[Kampfsystem#Nahkampf]]); Wurfaktion ([[Kampfsystem#Werfen]]) | Nahkampf, Wurfwaffen, Granaten, Athletik, Schleichen |
| Grit | A | Erholungsprobe ([[Schaden, Blutung und Verletzungen#HP zurückgewinnen]]); Reizgas ([[Sprengwirkung#Reizgas]]); Anstrengung und Entbehrung | Entbehrung, Überleben |
| Control | B | Schießen ([[Kampfsystem#Treffen]]); einfache Ladehemmung beheben ([[Kampfsystem#Ladehemmung]]); Feinmotorik | Waffenskills, Fahren, Taktisches Fahren, Erste Hilfe, Operation, Schlösser |
| Empathy | B | Verbündete verschieben ([[Adrenalin#Verbündete verschieben]]); Umgang mit Menschen | Verhandeln, Führung, Beschaffen, Verhören |
| Intellect | B | Antizipation bei der Breakaction ([[Kampfsystem#Reaktion und Antizipation]]); schwere Ladehemmung beheben ([[Kampfsystem#Ladehemmung]]) | Lagegespür, Wachsamkeit, Mechanik, Bildung, Tarnen, Ballistik, Sprengstoff |
| Decisiveness | B | Initiative, ohne Skill ([[Kampfsystem#Action Economy]]) | Krisenmanagement |
| Nerve | C | Nerve-Proben vor dem Gefecht, gegen den Anstieg und beim Senken ([[Adrenalin]]) | Selbstbeherrschung |

**Perks.** Viele Perks verlangen einen Mindestwert in einem Stat ([[#Rang und Voraussetzungen]]), z. B. Brawn für Zäh, Schlagkraft und Wurfarm, Grit für Schmerzunempfindlich und Rüstungsträger ([[#Perks für Grundwerte]], [[#Allgemeine Perks]]).

**Nerve** bremst den Anstieg des Adrenalins. Sie verändert nicht, wie stark Adrenalin auf die Gruppen A und B wirkt ([[Adrenalin#Steps]]).

# Skills
Ein Skill gibt an, wie gut ein Charakter in einem Gebiet ausgebildet ist. Jeder Skill hat einen **Skillwert** von 0 bis 5.

**Herkunft.** Den Skillwert bestimmen die Mindestskills der Klasse ([[Charaktererstellung#3. Skills eintragen]]) und freie Charakterpunkte (1 Punkt je Level, [[Charakteraufstieg#Charakterpunkte]]).

**Wirkung.** Bei der Probe wird der Skillwert von den Malsteps abgezogen ([[#Steps]]). Was übrig bleibt, weil es weniger Malsteps gab, erhöht die Krit-Schwelle ([[Würfelmechanik#Krit]]).
- **Skill 0:** Wer untrainiert eine Probe ablegt, die Ausbildung verlangt, erhält **1 Malstep** zusätzlich.
- **Triviale Proben:** Je höher der Skill, desto mehr Proben entfallen, weil sie für den Ausgebildeten keine Herausforderung sind. Ob eine Probe trivial ist, legt die SL fest; einzelne Regeln nennen es ausdrücklich (z. B. Druckverband ab Erste Hilfe 1, [[Schaden, Blutung und Verletzungen#Versorgen]]).

| Skill | Stand | Ausbildung (Richtwert) |
| --- | --- | --- |
| 0 | untrainiert | keine |
| 1 | Grundlagen | Grundausbildung, etwa 3 Monate |
| 2 | fortgeschritten | 1 bis 3 Jahre |
| 3 | voll ausgebildet | 4 bis 6 Jahre |
| 4 | herausragend | 7 bis 14 Jahre |
| 5 | Spitze (oberstes 1 %) | 15 Jahre und mehr |

**Anderer Skill.** Jede Probe nennt einen passenden Skill. Mit guten Argumenten kann die SL stattdessen einen anderen Skill erlauben (z. B. Baseball statt Granaten).

## Skillproben

**Ohne feste Regel.** Viele Skills haben keine eigene Regel. Für sie gilt:
- Die SL legt die Malsteps nach den Umständen fest ([[#Steps]]).
- **Erfolg:** Das Vorhaben gelingt.
- **Misserfolg:** Es gelingt nicht oder nur mit einem Nachteil, den die SL bestimmt.
- **Krit:** Die SL legt die Zusatzwirkung erzählerisch fest ([[Würfelmechanik#Wirkung des Krits]]).
- **Gegen Widerstand** einer Person ist die Probe ein Contested Roll ([[Würfelmechanik#Contested Rolls]]), z. B. Einschüchtern gegen Nerve mit Selbstbeherrschung.

Ohne feste Regel sind: Athletik, Fahren, Taktisches Fahren, Entbehrung, Überleben, Krisenmanagement, Einschüchtern, Verhören, Aufbrechen.

**Schleichen.** Wer schleicht, bewegt sich höchstens mit Gehen ([[Kampfsystem#Bewegung]]). Eine Probe gilt für eine Annäherung, nicht für jede Runde. Erfolg: Deine Bewegung ist 1 Band weniger weit hörbar, Krit: 2 Bänder ([[Wahrnehmung#Lautstärken]]).

**Tarnen.** Für eine getarnte Person oder Stellung sinkt das Band „Erkennen bis“ bei Erfolg um 1, bei Krit um 2 ([[Wahrnehmung#Sehen]]).

**Wachsamkeit.** Wer aktiv beobachtet oder lauscht, legt eine Probe ab; im Gefecht ist das eine Mainaction ([[Kampfsystem#Mainaction]]). Erfolg: Sehen und Hören reichen 1 Band weiter. Krit: zusätzlich kennst du den genauen Ort eines gehörten Geräuschs ([[Wahrnehmung]]).

**Ballistik.** Mainaction mit leichter Konzentration gegen ein Ziel ab dem Band weit ([[Kampfsystem#Konzentration]]). Erfolg: Dein nächster Schuss auf dieses Ziel hat 1 Malstep der Reichweite weniger, Krit: 2 ([[Schusswaffen (tragbar)#Begriffserklärung]], *Reichweite*).

**Beschaffen.** Ware bis 2 Stufen über dem Vorratslevel deiner Klasse ([[Charaktererstellung#7. Ausrüstung]]). Jede Stufe darüber bringt 2 Malsteps. Erfolg: Die Ware ist beschafft; Preis und Lieferzeit legt die SL fest. Krit: Der Preis liegt an der unteren Grenze der Geldwertspanne. Misserfolg: Ein neuer Versuch ist frühestens im nächsten Auftrag möglich.

**Arbeit über mehrere Runden.** Schlösser öffnen sowie Sprengladungen anbringen oder entschärfen folgen der Konzentrationsregel, die Dauer legt die SL fest ([[Kampfsystem#Konzentration]], *Dauer*). Krit: Die Dauer halbiert sich. Misserfolg beim Entschärfen: Die Folge legt die SL fest ([[Sprengwirkung]]).

## Liste von Skills
Jeder Skill gehört zu genau einem Stat. Proben mit dem Skill legst du auf diesen Stat ab, sofern die Regel der Probe nichts anderes nennt. Mit guten Argumenten kann die SL einen anderen Skill erlauben ([[#Skills]], *Anderer Skill*).

**Offene Liste.** Die Liste kann ergänzt werden. Ein neuer Skill braucht einen Namen, genau einen Stat und einen Einsatzbereich.

- **Initiative** wird ohne Skill gewürfelt, auch ohne Krisenmanagement ([[Kampfsystem#Action Economy]]). Ohne Skill gibt es auch keinen zusätzlichen Malstep für Skill 0.
- **Kampfkünste** sind keine Skills, sondern Perks ([[#Kampfkunst-Perks]]).
- **Exklusive Skills** stellen nur bestimmte Spezialisierungen zur Auswahl ([[#Exklusive Skills]], [[Klassen#Spezialisierungen]]).

### Waffenskills
Mit dem Waffenskill triffst du ([[Kampfsystem#Treffen]]) und behebst eine einfache Ladehemmung ([[Kampfsystem#Ladehemmung]]). Welcher Waffenskill gilt, bestimmt die Art der Waffe.

| Skill | Stat | Waffen |
| --- | --- | --- |
| Pistole | Control | Pistolen |
| Maschinenpistole | Control | Maschinenpistolen (SMG) |
| Sturmgewehr | Control | Sturmgewehre und Karabiner (AR), z. B. AK-47, M4 Carbine |
| Schrotflinte | Control | Schrotflinten ([[Kampfsystem#Schrotflinten]]) |
| Präzisionsgewehr | Control | Präzisions- und Scharfschützengewehre (DMR, SR), z. B. Mosin Nagant |
| Maschinengewehr | Control | leichte Maschinengewehre (LMG) |
| Werfer | Control | RPG-7, Granatwerfer ([[Kampfsystem#Treffen]], *Werfer*; [[Sprengwaffen#Geschosse]]) |

### Kampf
| Skill | Stat | Einsatz |
| --- | --- | --- |
| Rückstoßkontrolle | Brawn | Folgeschüsse im Ziel halten, Haltezahl ([[Kampfsystem#Treffen]]) |
| Nahkampf | Agility | Angriff und Verteidigung im Nahkampf ([[Kampfsystem#Nahkampf]]) |
| Wurfwaffen | Agility | Messer, Äxte, Beile und dergleichen werfen ([[Kampfsystem#Werfen]]) |
| Granaten | Agility | Granaten werfen ([[Kampfsystem#Werfen]], [[Sprengwirkung]]) |
| Reflexe | Twitch | Reaktion bei der Breakaction ([[Kampfsystem#Reaktion und Antizipation]]) |
| Lagegespür | Intellect | Antizipation bei der Breakaction ([[Kampfsystem#Reaktion und Antizipation]]) |

### Körper und Wahrnehmung
| Skill | Stat | Einsatz |
| --- | --- | --- |
| Athletik | Agility | Klettern, Springen, Schwimmen, Hindernisse überwinden |
| Schleichen | Agility | sich unbemerkt bewegen und anpirschen ([[Wahrnehmung#Hören]]) |
| Entbehrung | Grit | Hunger, Durst, Kälte, Hitze, Schlafmangel und lange Märsche aushalten |
| Überleben | Grit | im Gelände zurechtkommen: Unterschlupf, Wasser, Feuer, Nahrung, Orientierung |
| Wachsamkeit | Intellect | Feinde entdecken, Wache halten, Geräusche lokalisieren ([[Wahrnehmung]]) |
| Selbstbeherrschung | Nerve | Nerve-Proben vor dem Gefecht, gegen den Anstieg und beim Senken ([[Adrenalin#Vor dem Gefecht]], [[Adrenalin#Anstieg]], [[Adrenalin#Senken]]) |

### Technik und Wissen
| Skill | Stat | Einsatz |
| --- | --- | --- |
| Mechanik | Intellect | schwere Ladehemmung beheben, Waffen reparieren ([[Kampfsystem#Ladehemmung]], [[Schusswaffen (tragbar)#Zustand]]), Schrauben und Mechanik allgemein |
| Fahren | Control | Fahrzeuge steuern |
| Bildung | Intellect | Wissenschaft und Allgemeinbildung |

### Entscheidung
| Skill | Stat | Einsatz |
| --- | --- | --- |
| Krisenmanagement | Decisiveness | in Notlagen mit unvollständigem Lagebild Prioritäten setzen: Triage mehrerer Verwundeter ([[Schaden, Blutung und Verletzungen#Blutung]]), Evakuierung, Rückzug, Handeln unter einer Frist der SL |

### Medizin
| Skill | Stat | Einsatz |
| --- | --- | --- |
| Erste Hilfe | Control | Druckverband, Tourniquet ([[Schaden, Blutung und Verletzungen#Versorgen]]) |
| Operation | Control | kritische Blutung am Rumpf stoppen ([[Schaden, Blutung und Verletzungen#Blutung]]). Exklusiv ([[#Exklusive Skills]]). |

### Sozial
| Skill | Stat | Einsatz |
| --- | --- | --- |
| Verhandeln | Empathy | Preise und Bedingungen aushandeln ([[Schusswaffen (tragbar)#Zustand]], *Preis*) |
| Führung | Empathy | Verbündete auf der Adrenalin-Leiter verschieben ([[Adrenalin#Verbündete verschieben]]) |


### Exklusive Skills
Diese Skills stehen nur den genannten Spezialisierungen zur Auswahl, ab Stufe 5 allen Meistern der Laufbahn ([[Klassen#Spezialisierungen]]). Proben: [[#Skillproben]].

| Skill | Stat | Spezialisierung | Einsatz |
| --- | --- | --- | --- |
| Tarnen | Intellect | Kommandosoldat | Stellungen, Spuren und Ausrüstung verbergen, Hinterhalte anlegen ([[Wahrnehmung]]) |
| Ballistik | Intellect | Scharfschütze | Entfernung, Wind und Fallkurve berechnen ([[Kampfsystem#Treffen]]) |
| Sprengstoff | Intellect | Grenadier | Ladungen anbringen und zünden, Sprengfallen legen und entschärfen ([[Sprengwirkung]]) |
| Operation | Control | Sanitäter, Rettungssanitäter | siehe [[#Medizin]] |
| Einschüchtern | Brawn | Vollstrecker | durch Drohung und Auftreten Gehorsam oder Auskunft erzwingen |
| Schlösser | Control | Einbrecher | Schlösser öffnen und überwinden ([[Kampfsystem#Konzentration]]) |
| Beschaffen | Empathy | Fixer | über Kontakte an schwer erhältliche Ware kommen ([[Schusswaffen (tragbar)#Begriffserklärung]], *Vorratslevel*) |
| Taktisches Fahren | Control | Leibwächter, Personenschützer | Fahren unter Beschuss, Ausweichen, Rammen, Kolonne ([[Stats, Skills und Perks#Technik und Wissen]], *Fahren*) |
| Aufbrechen | Brawn | Zugriffsbeamter | Türen, Fenster und Sperren gewaltsam öffnen |
| Verhören | Empathy | Ermittler | Aussagen erlangen und Widersprüche aufdecken |

# Perks
Ein Perk ist eine besondere Fähigkeit. Er verändert dauerhaft einen Wert oder eine Regel, oder er schaltet eine Aktion frei, die anderen nicht offensteht.

- **Klassenperks** stellt nur eine bestimmte Klasse oder Spezialisierung zur Auswahl. Sie stehen nicht in dieser Liste, sondern werden mit den Klassen festgelegt ([[Klassen#Spezialisierungen]]).
- **Offene Liste.** Die Liste kann ergänzt werden. Ein neuer Perk braucht einen Namen, einen Rang, Voraussetzungen und eine Wirkung, die an eine bestehende Regel anknüpft ([[#Rang und Voraussetzungen]]).

## Rang und Voraussetzungen
- **Rang = Kosten.** Ein Perk kostet so viele freie Charakterpunkte, wie sein Rang angibt ([[Charakteraufstieg#Charakterpunkte]]). Die Stärke eines Rangs entspricht etwa 1 Skilllevel oder 10 Statpunkten.
- **Keine Stufen.** Ein Perk wird einmal erworben und hat danach keine weiteren Stufen.
- **Abgestufte Wirkung** entsteht durch eigenständige Perks mit ähnlicher Wirkung (z. B. *Zäh I*, *Zäh II*). Jeder hat eigenen Rang und eigene Voraussetzungen.
- **Voraussetzungen** können sein:
	- ein **Mindestwert** in einem Stat (Statwert, nicht Rang),
	- ein **anderer Perk**, den der Charakter schon hat.

## Perks für Grundwerte
Grundwerte ([[Charaktererstellung#Grundwerte]]) steigen nur über diese Perks. Je Grundwert gibt es zwei Perks; der zweite setzt den ersten voraus ([[#Rang und Voraussetzungen]]). Die Wirkungen addieren sich. *Vorläufige Werte; das Balancing folgt, wenn der Rest steht.*

| Perk | Rang | Voraussetzung | Wirkung |
| --- | --- | --- | --- |
| Zäh I | 1 | Brawn 50 | +1 Lebenspunkt |
| Zäh II | 2 | Brawn 70, Zäh I | +1 Lebenspunkt |
| Schlagkraft I | 1 | Brawn 50 | +1 Nahkampfschaden |
| Schlagkraft II | 2 | Brawn 70, Schlagkraft I | +1 Nahkampfschaden |
| Wurfarm I | 1 | Brawn 50 | genaue Wurfweite +1 Reichweitenband ([[Schusswaffen (tragbar)#Begriffserklärung]]) |
| Wurfarm II | 2 | Brawn 70, Wurfarm I | genaue Wurfweite +1 Reichweitenband |
| Schmerzunempfindlich I | 1 | Grit 50 | +1 Schmerzresistenz |
| Schmerzunempfindlich II | 2 | Grit 70, Schmerzunempfindlich I | +1 Schmerzresistenz |

## Kampfkunst-Perks
Jede Kampfkunst ordnet einem Sieg mit überlegenem Stand im Nahkampf eine Wirkung zu ([[Kampfsystem#Stand im Nahkampf]]). Nicht jede Kampfkunst deckt alle drei Fälle ab.

| Perk | Rang | Voraussetzung | Liegen über Stehen | Stehen über Hocke | Hocke über Liegen |
| --- | --- | --- | --- | --- | --- |
| Boxen | 1 | Agility 50 | – | Erschüttern | – |
| Judo | 1 | Agility 50 | – | Umreißen | Fixieren |
| Brazilian Jiu-Jitsu | 1 | Agility 50 | Umreißen | – | Fixieren |
| Krav Maga | 1 | Agility 50 | – | Erschüttern | Entwaffnen |

*Vorläufig:* Auswahl, Ränge und Voraussetzungen werden im Testspiel geprüft.

## Kampfperks

| Perk | Rang | Voraussetzung | Wirkung |
| --- | --- | --- | --- |
| CQB | 1 | Twitch 60 | Im Band bedrängt bringt die Reichweite deiner Waffe keine Malsteps ([[Schusswaffen (tragbar)#Begriffserklärung]], *Reichweite*). |
| Entschlossen | 1 | Decisiveness 60 | Wirst du überrascht, hast du in der ersten Runde keinen Malstep auf Initiative und Breakaction ([[Kampfsystem#Die Breakaction benutzen]], *Überrascht*). |
| Feuer in Bewegung | 1 | Brawn 60 | Deine eigene Bewegung bringt beim Schießen 1 Malstep weniger ([[Kampfsystem#Malsteps der Lage]]). |
| Fingerfertig | 1 | Control 40 | Beim einzeln Laden lädst du bis zu 3 statt 2 Patronen pro Mainaction ([[Kampfsystem#Nachladen]]). |
| Funkdisziplin | 1 | Intellect 60 | Per Funk gemeldete Informationen zählen beim Antizipieren wie gesehen: 0 statt 1 Malstep für die Güte ([[Kampfsystem#Reaktion und Antizipation]]). |
| Gegner einschätzen | 1 | Empathy 50 | Einmal pro Gefecht wählst du ohne Aktion einen Gegner, den du wahrnimmst. Gegen ihn hast du bis zum Ende des Gefechts 1 Stepshield auf Antizipation ([[Kampfsystem#Reaktion und Antizipation]]). Fällt er aus, darfst du neu wählen. |
| Gezielter Schuss | 2 | Control 70 | Zielst du ([[Kampfsystem#Breakaction]]) und bewegst dich in dieser Runde nicht, ignoriert dein nächster Schuss in der folgenden Runde die Malsteps der Reichweite. Das ersetzt den Stepshield des Zielens. |
| Improvisieren | 2 | Decisiveness 60 | Einmal pro Gefecht: Misslingt deine Mainaction, darfst du im selben Zug eine andere Mainaction ausführen ([[Kampfsystem#Mainaction]]). |
| Niederhalten | 2 | Control 60 | Gibst du einen Feuerstoß von mindestens 3 Schüssen auf einen Gegner ab, hat er bis zu deinem nächsten Zug 1 Malstep auf Schießen ([[Kampfsystem#Treffen]]). Das gilt auch, wenn alle Schüsse ins Leere gehen. |
| Offangle | 1 | Intellect 50 | Nur in Gebäuden. Als Mainaction nimmst du einen Offangle ein. Bis zu deinem nächsten Zug hat jeder, der dich mit einer Breakaction unterbricht, 1 Malstep auf Reaktion oder Antizipation ([[Kampfsystem#Die Breakaction benutzen]]). Bewegst du dich, endet die Wirkung. |
| Overwatch | 1 | Intellect 60 | Als Mainaction wählst du einen Sektor, z. B. eine Tür, einen Gang oder einen Straßenabschnitt. Du darfst dich in dieser Runde nicht bewegen. Bis zu deinem nächsten Zug hast du 1 Stepshield auf Reaktion und Antizipation gegen Akteure in diesem Sektor ([[Kampfsystem#Reaktion und Antizipation]]). Bewegst du dich, endet die Wirkung. |
| Schutzreflex | 1 | Twitch 60 | Wird ein Verbündeter in Armeslänge angegriffen, kannst du mit deiner Breakaction eingreifen ([[Kampfsystem#Die Breakaction benutzen]]): Du reißt ihn zu Boden (beide liegen, [[Kampfsystem#Standwechsel]]), oder du wirfst dich in die Schussbahn (der Angriff trifft dich statt ihn). |
| Quickthrow | 1 | Agility 60 | Du kannst die Wurfaktion auch als Breakaction einsetzen, z. B. um eine Granate zurückzuwerfen ([[Kampfsystem#Werfen]]). |
| Rückhalt | 2 | Empathy 50 | Verbündete, die dich hören ([[Wahrnehmung#Hören]]), haben 1 Stepshield auf ihre Nerve-Probe gegen den Anstieg ([[Adrenalin#Anstieg]]). Hören sie mehrere Charaktere mit diesem Perk, bleibt es bei 1 Stepshield. |
| Kernschuss | 1 | Control 60 | Mit dem Skill Präzisionsgewehr steigt deine Krit-Schwelle um 1 ([[Würfelmechanik#Krit]]). |
| Schnell nachladen | 1 | Control 50 | Nachladen mit Magazin, Schnelllader oder Ladestreifen kannst du auch als Breakaction einsetzen ([[Kampfsystem#Nachladen]]). Gilt nicht für einzeln Laden. |
| Schnellzieher | 1 | Twitch 60 | Eine Waffe aus Holster, Scheide oder Gürtel ziehst oder steckst du ohne Aktion statt mit einer Mainaction ([[Kampfsystem#Waffe wechseln]]). |
| Triple Tap | 2 | Control 70 | Sagst du den Bauch als Zone an ([[Kampfsystem#Treffen]], *Trefferzone*), trifft der erste Folgetreffer die Brust, der zweite und alle weiteren den Kopf ([[Körperzonen]]). Ohne den Perk oder bei anderer Zone treffen alle Folgetreffer die Zone des ersten Schusses. |

*Vorläufig:* Ränge und Voraussetzungen werden im Testspiel geprüft.

## Exklusive Perks

Diese Perks stehen nur der genannten Klasse zur Auswahl ([[Klassen#Spezialisierungen]]). Perks der Spezialisierungen (Stufe 3) gelten auch für ihre erweiterte Form; Perks der erweiterten Formen (Stufe 4) nicht für eine zweite Spezialisierung ([[Klassen#Zweite Spezialisierung]]). Ab Stufe 5 stehen alle exklusiven Perks der Laufbahn zur Auswahl.

| Perk | Klasse | Rang | Voraussetzung | Wirkung |
| --- | --- | --- | --- | --- |
| Überfall | Kommandosoldat | 1 | Twitch 60 | In der ersten Runde eines Gefechts, in dem die Gegner überrascht sind, hast du 1 Stepshield auf Initiative und Schießen ([[Kampfsystem#Die Breakaction benutzen]], *Überrascht*; [[Kampfsystem#Treffen]]). |
| Einsamer Wolf | Einzelkämpfer | 2 | Grit 70 | Hörst du keinen Verbündeten ([[Wahrnehmung#Hören]]), hast du 1 Stepshield auf Nerve-Proben gegen den Anstieg und beim Senken ([[Adrenalin#Anstieg]], [[Adrenalin#Senken]]). |
| Atemkontrolle | Scharfschütze | 1 | Control 60 | Liegst du oder ist deine Waffe aufgelegt, bringt Zielen 2 Stepshields statt 1 ([[Kampfsystem#Breakaction]], *Zielen*). |
| Geduld | Fernspäher | 2 | Nerve 70 | Liegst du seit mindestens 3 Runden unbewegt in Stellung, gelten beim Schießen keine Steps der Leiter auf Control ([[Adrenalin#Steps]]). |
| Korrektur | Grenadier | 1 | Brawn 60 | Misslingt dein Wurf oder Werferschuss, würfelst du die Richtung zweimal und wählst eine ([[Sprengwirkung#Landepunkt]]). |
| Gerichtete Ladung | Pionier | 2 | Intellect 70 | Bei einer Ladung, die du anbringst, bestimmst du eine Seite; dorthin fliegen keine Splitter ([[Sprengwirkung#Splitter]]). |
| Feldversorgung | Sanitäter | 1 | Intellect 60 | Erste Hilfe braucht leichte statt voller Konzentration ([[Kampfsystem#Konzentration]], [[Schaden, Blutung und Verletzungen#Versorgen]]). |
| Unter Feuer | Gefechtssanitäter | 2 | Decisiveness 70 | Ein Stagger unterbricht deine Versorgung nicht ([[Kampfsystem#Konzentration]], *Unterbrechung*). |
| Abreibung | Vollstrecker | 1 | Brawn 60 | Nach einem gelungenen Nahkampfangriff hast du gegen dieses Ziel bis zum Ende des Auftrags 1 Stepshield auf Einschüchtern ([[#Exklusive Skills]]). |
| Kaltblütig | Auftragskiller | 2 | Nerve 70 | Nimmt dich das Ziel nicht wahr ([[Wahrnehmung]]), steigt bei deinem ersten Schuss auf es die Krit-Schwelle um 5 ([[Würfelmechanik#Krit]]). |
| Lautlos | Einbrecher | 1 | Agility 60 | Deine Arbeit an Schlössern, Türen und Fenstern ist nicht zu hören ([[Wahrnehmung#Hören]]). |
| Fingerspitzengefühl | Safeknacker | 2 | Intellect 70 | Schlösser-Proben, die mehrere Runden dauern, brauchen halb so viele Runden, aufgerundet ([[Kampfsystem#Konzentration]], *Dauer*). |
| Kontakte | Fixer | 1 | Empathy 60 | Einmal pro Auftrag zählt beim Kauf das Vorratslevel der Ware 1 niedriger ([[Schusswaffen (tragbar)#Begriffserklärung]], *Vorratslevel*). |
| Plan B | Drahtzieher | 2 | Decisiveness 70 | Einmal pro Auftrag darf ein Verbündeter eine misslungene Probe wiederholen. |
| Abschirmen | Leibwächter | 1 | Nerve 60, Perk Schutzreflex | Du kannst mit Schutzreflex auch für einen Verbündeten bis 3 m Entfernung eingreifen statt nur in Armeslänge ([[#Kampfperks]]). |
| Stimme des Bosses | Rechte Hand | 2 | Empathy 70 | Gelingt dir Verbündete verschieben, verschiebst du einen zweiten Verbündeten ebenso ([[Adrenalin#Verbündete verschieben]]). |
| Dynamischer Zugriff | Zugriffsbeamter | 1 | Twitch 60 | In der Runde, in der du einen Raum betrittst, hast du 1 Stepshield auf Reaktion ([[Kampfsystem#Reaktion und Antizipation]]). |
| Evakuieren | Personenschützer | 1 | Nerve 60 | Ein Verbündeter in Armeslänge bewegt sich ohne eigene Aktion mit dir, höchstens mit Gehen ([[Kampfsystem#Bewegung]]). |
| Lagebild | Schutzkommandoführer | 2 | Decisiveness 70 | Einmal pro Gefecht haben alle Verbündeten, die dich hören, in der nächsten Runde 1 Stepshield auf Initiative ([[Kampfsystem#Action Economy]]). |
| Menschenkenntnis | Ermittler | 1 | Intellect 60 | Gelingt dir eine Wachsamkeits-Probe gegen eine Person in Sicht, weißt du, ob sie bewaffnet ist ([[Wahrnehmung]]). |
| Legende | Verdeckter Ermittler | 2 | Empathy 70 | Will jemand deine falsche Identität durchschauen, ist das ein Contested Roll; du hast 1 Stepshield ([[Würfelmechanik#Contested Rolls]]). |
| Teamzugriff | SEK-Beamter | 2 | Grit 70 | Betrittst du einen Raum, kannst du einen Verbündeten in Armeslänge mitnehmen, der in dieser Runde noch nicht am Zug war. Er bewegt sich während deines Zuges mit dir hinein; seine Bewegung ist damit verbraucht. Mainaction und Standwechsel behält er für seinen Zug; seine Breakaction kann er sofort einsetzen ([[Kampfsystem#Action Economy]], [[Kampfsystem#Bewegung]]). |
| Stabilisieren | Rettungssanitäter | 1 | Control 60 | Dein Druckverband verdoppelt die Frist einer kritischen Blutung am Rumpf zweimal statt einmal ([[Schaden, Blutung und Verletzungen#Blutung]]). |
| Notoperation | Notarzt | 2 | Intellect 70 | Eine Operation braucht halb so viele Runden, aufgerundet ([[Schaden, Blutung und Verletzungen#Versorgen]]). |

*Vorläufig:* Ränge, Voraussetzungen und Wirkungen werden im Testspiel geprüft.

## Allgemeine Perks

| Perk | Rang | Voraussetzung | Wirkung |
| --- | --- | --- | --- |
| Durchbeißen | 2 | Grit 70 | Kampfunfähigkeit bringt dir außerhalb des Gefechts 2 statt 3 Malsteps ([[Schaden, Blutung und Verletzungen#Kampfunfähigkeit]]). |
| Eiserne Nerven | 2 | Nerve 70 | Der Adrenalinschock bringt dir 2 statt 3 Malsteps ([[Adrenalin#Adrenalinschock]]). |
| Lucky Numbers | 2 | – | Ist eine gelungene Probe ein Pasch (11, 22 … 99), ist sie ein Krit ([[Würfelmechanik#Krit]]). |
| Rüstungsträger | 2 | Grit 60 | Mit Schutzanzug hast du 1 statt 2 Malsteps auf Agility-Proben; mit Schutzanzug oder ballistischem Schild darfst du laufen ([[Deckung und Rüstung#Schutzanzug]], [[Deckung und Rüstung#Ballistischer Schild]]). |
| Schleicher | 1 | Agility 60 | Gehen und Kriechen sind ein Band weniger weit hörbar ([[Kampfsystem#Bewegung]], [[Wahrnehmung#Hören]]). |
| Sprinter | 1 | Agility 60 | Beim Rennen kommst du 12 m weit statt 9 m ([[Kampfsystem#Bewegung]]). |
| Starrsinn | 1 | Nerve 50 | Du darfst eine Verschiebung durch Führung ablehnen ([[Adrenalin#Verbündete verschieben]]). |

*Vorläufig:* Ränge und Voraussetzungen werden im Testspiel geprüft.

## Perk-Ideen
Noch nicht spielbar; es fehlt die Regel, an die sie anknüpfen.
