# Schadensablauf

Jede Munition hat zwei Werte ([[Munitionstypen]]):
- **Durchschlagskraft (DK):** entscheidet, ob das Projektil Deckung und Rüstung überwindet.
- **Mannstoppwirkung (MW):** entscheidet, wie viel Schaden es am Körper anrichtet.

Jeder Treffer ([[Kampfsystem#Treffen]]) durchläuft drei Schritte.

**Kein Schaden.** Ein Treffer mit 0 Schaden bewirkt nichts: keinen HP-Abzug, keine Wunde, keine Prellung, keine Folgen der Zone und keinen Stagger, auch nicht als Krit eines stumpfen Treffers.

## 1. Schutz prüfen

**Schutz** ist Deckung vor der getroffenen Zone und Rüstung auf der getroffenen Zone ([[Deckung und Rüstung]]). Deckung zählt nur, wenn die getroffene Zone verdeckt ist. Ohne Schutz ist jeder Treffer ein Durchschlag (Schritt 2). Ausnahme: stumpfe Treffer ([[#Stumpfe Treffer]]).

- **Deckung zuerst:** Ist die DK kleiner als der Deckungswert, bleibt das Projektil in der Deckung stecken. Es entsteht kein Schaden. Sonst sinkt die DK um den Deckungswert. Was übrig bleibt, ist die **Rest-DK**; sie kann 0 sein.
- **Dann Rüstung:** Erreicht die (Rest-)DK den Rüstungswert, ist der Treffer ein **Durchschlag** (Schritt 2). Ist sie kleiner, ist er ein **Wuchttreffer** (Schritt 3).

Die DK muss den Schutz also nur *erreichen*. Bei Gleichstand geht das Projektil durch. Ein Schutzwert von 0 hält nichts auf.

## 2. Durchschlag

**Schaden = MW × Zonenmultiplikator** ([[Körperzonen]]). Ziehe den Schaden von den Lebenspunkten (HP) ab.

Dazu kommen die Folgen der Zone (Spalte „Normal“ in [[Körperzonen]]). Ist der Treffer ein Krit ([[Würfelmechanik#Krit]]), gilt stattdessen die Spalte „Krit“.

## 3. Wuchttreffer

Die Rüstung hält das Projektil auf, aber die Wucht wirkt auf den Körper.

- **Restschutz = Rüstungswert − (Rest-)DK**
- **Schaden = MW − Restschutz**, mindestens 0. Ziehe den Schaden von den HP ab.

Ein Wuchttreffer hat keinen Zonenmultiplikator, keine Folgen der Zone und keinen Krit: Rüstung schützt vor Krits. Ausnahme: der Krit eines stumpfen Treffers ([[#Stumpfe Treffer]]). Auch ein Wuchttreffer kann einen Stagger auslösen ([[#Stagger]]).

*Vorläufig:* Die Wucht zählt voll. Ob sie halbiert werden sollte, zeigt das Testspiel.

## Stumpfe Treffer

Stumpfe Treffer stammen von Körperwaffen, stumpfen Nahkampfwaffen ([[Kampfsystem#Nahkampf]]) und Gummigeschossen ([[Munitionstypen]]). Sie haben **keine DK**.

- Ein stumpfer Treffer ist **immer ein Wuchttreffer** (Schritt 3), auch ohne Schutz. Der Restschutz ist der volle Rüstungswert.
- Deckung prüfst du wie gewohnt (Schritt 1). Ist die getroffene Zone verdeckt, entsteht kein Schaden.
- **Krit:** Ein stumpfer Treffer, der ein Krit ist, löst immer einen **Stagger** aus ([[#Stagger]]), unabhängig von der Schmerzresistenz, sofern er Schaden macht ([[#Schadensablauf]]). Schmerz ignorieren ([[Adrenalin#Symptome]]) verhindert auch diesen Stagger.

## Stagger

Übersteigt der Schaden eines einzelnen Treffers die **Schmerzresistenz** ([[Charaktererstellung#Grundwerte]]), erleidet das Ziel einen **Stagger**. Das gilt für Durchschläge und Wuchttreffer.

- Eine laufende Aktion mit Konzentration wird unterbrochen ([[Kampfsystem#Konzentration]]).
- Hat das Ziel seine Breakaction ([[Kampfsystem#Breakaction]]) in dieser Runde noch nicht verbraucht, verfällt sie.

Der Stagger wirkt nur im Moment des Treffers. Er ist kein Zustand und wird nicht weitergeführt.

# Lebenspunkte

- **0 HP:** Der Charakter ist **kampfunfähig** ([[#Kampfunfähigkeit]]).
- **−1 HP oder weniger:** Der Charakter **stirbt**. Das gilt für weiteren Schaden im Gefecht und für Schaden durch Blutung ([[#Blutung]]).

HP und Kampfunfähigkeit heilen getrennt: HP über die Erholungsprobe ([[#HP zurückgewinnen]]), Wunden über ihre Heildauer ([[#Wunden heilen]]).

# Kampfunfähigkeit

Kampfunfähigkeit ist ein Zustand ([[Würfelmechanik#Zustände]]). Der Körper versagt den Dienst, unabhängig vom Willen.

- **Auslöser:**
	- 0 HP ([[#Lebenspunkte]]).
	- eine kritische Wunde (Spalte „Krit“ in [[Körperzonen]]), ab dem Treffer.
- **Wirkung im Gefecht:** Der Charakter hat keine Aktionen: keine Mainaction, keine Bewegung, kein Standwechsel, keine Breakaction ([[Kampfsystem#Action Economy]]). Er kann sprechen.
- **Wirkung außerhalb des Gefechts:**
	- Er bewegt sich nur kriechend oder gestützt.
	- Proben mit körperlicher Anstrengung sind nicht möglich.
	- Alle übrigen Proben sind um **3 Malsteps** erschwert ([[Stats, Skills und Perks#Steps]]). Dazu zählt das Versorgen eigener Wunden ([[#Versorgen]]). Die Erholungsprobe ist ausgenommen ([[#HP zurückgewinnen]]). Mit dem Perk *Durchbeißen* sind es 2 Malsteps ([[Stats, Skills und Perks#Allgemeine Perks]]).
- **Ende:** Der Zustand endet, wenn kein Auslöser mehr besteht: Die HP liegen bei 1 oder mehr, und keine kritische Wunde ist mehr offen ([[#Wunden heilen]]).

*Vorläufig:* 3 Malsteps wie beim Adrenalinschock ([[Adrenalin#Adrenalinschock]]).

# Blutung

**Im Gefecht spielt Blutung keine Rolle.** Wunden werden nur notiert. Mit dem Ende des Gefechts beginnen die Blutungsfristen (wie beim Adrenalin, [[Adrenalin#Adrenalinschock]]).

**Blutende Wunde:** Jeder Durchschlag ([[#2. Durchschlag]]) erzeugt eine blutende Wunde. Wuchttreffer bluten nicht. Die Kugeln eines Folgetreffers bilden eine Wunde ([[Kampfsystem#Treffen]]). Notiere zu jeder Wunde Zone, Schaden und ob sie kritisch ist. Schaden aus Wuchttreffern notierst du getrennt als **Prellung** ([[#Prellungen]]).

## Normale Blutung

Gilt für Wunden mit der Folge „Blutung“ (Spalte „Normal“ in [[Körperzonen]]).

- **Frist:** 10 Minuten ab Gefechtsende.
- **Unversorgt:** Läuft die Frist ab, verursacht die Wunde noch einmal ihren **halben Schaden** (aufgerundet). Danach hört sie auf zu bluten.
- **Versorgt:** Ein Druckverband vor Ablauf der Frist stoppt die Blutung. Es entsteht kein weiterer Schaden.

## Kritische Blutung

Gilt für Wunden mit der Folge „verbluten innerhalb …“ (Spalte „Krit“ in [[Körperzonen]]). Der Charakter ist ab dem Treffer kampfunfähig ([[#Kampfunfähigkeit]]).

- **Frist:** wie in [[Körperzonen]] angegeben (Rumpf 1 Minute, Gliedmaßen 5 Minuten), ab Gefechtsende.
- **Unversorgt:** Läuft die Frist ab, stirbt der Charakter.
- **Gliedmaßen:** Ein **Tourniquet** stoppt die Blutung.
- **Rumpf:** Ein **Druckverband** verdoppelt nur die Frist (einmal). Stoppen kann die Blutung nur eine **Operation**.

## Versorgen

| Maßnahme | Wirkung | Probe |
| --- | --- | --- |
| Druckverband | stoppt normale Blutung; verdoppelt die Frist einer kritischen Rumpfblutung | Erste Hilfe |
| Tourniquet | stoppt kritische Blutung an Armen und Beinen | Erste Hilfe |
| Operation | stoppt kritische Blutung am Rumpf | Operation |

- Skills: **Erste Hilfe** und **Operation**, beide auf Control ([[Stats, Skills und Perks#Medizin]]).
- Jede Maßnahme ist eine Mainaction mit voller Konzentration ([[Kampfsystem#Konzentration]]) und versorgt eine Wunde. Im Gefecht ist das möglich, aber nicht nötig.
- **Dauer:** Druckverband und Tourniquet brauchen eine Mainaction. Eine Operation dauert mehrere Runden; wie viele, legt die SL nach der Wunde fest ([[Kampfsystem#Konzentration]], *Dauer*).
- Nach dem Gefecht ist ein Druckverband ab Erste Hilfe 1 trivial und braucht keine Probe ([[Stats, Skills und Perks#Skills]]).
- Misslingt eine Probe, darf sie wiederholt werden, solange die Frist läuft. *Vorläufig.*

# Heilung

Geheilt wird nur an **Ruhetagen**: Tage ohne Gefecht und ohne schwere Anstrengung.

## Prellungen

Schaden aus Wuchttreffern ([[#3. Wuchttreffer]]) erzeugt keine Wunde. Nach einer Nacht Ruhe erhält der Charakter diesen Schaden als HP zurück.

## HP zurückgewinnen

Einmal pro Ruhetag legt der Charakter eine **Erholungsprobe** auf **Grit** ab.

| Ergebnis | HP |
| --- | --- |
| Krit | +2 |
| gelungen | +1 |
| misslungen | +0 |

- Die HP steigen höchstens bis zum Grundwert ([[Charaktererstellung#Grundwerte]]).
- Auch bei 0 HP wird gewürfelt. Erst wenn die Probe gelingt, ist die Kampfunfähigkeit durch 0 HP beendet ([[#Kampfunfähigkeit]]).
- Die Malsteps der Kampfunfähigkeit gelten für die Erholungsprobe nicht.
- **Malsteps:** 1 je unversorgte Wunde ([[#Versorgen]]). Schlechte Umstände (Feldlager, Kälte, Schmutz) bringen weitere Malsteps; die SL legt sie fest.
- **Pflege:** Ein Betreuer legt einmal pro Tag eine Probe auf Erste Hilfe ab, bei einer offenen kritischen Wunde auf Operation. Gelungen: 1 Stepshield auf die Erholungsprobe; Krit: 2 Stepshields.

## Wunden heilen

- **Heildauer:** Der Schaden der Wunde ist ihre Heildauer, bei einer normalen Wunde in Ruhetagen, bei einer kritischen Wunde in Wochen aus Ruhetagen. Schaden aus einer normalen Blutung ([[#Normale Blutung]]) zählt zur Wunde.
- **Voraussetzung:** Nur versorgte Wunden heilen ([[#Versorgen]]).
- **Nachsorge:** Einmal pro Wunde, nach dem Versorgen, eine Probe auf Erste Hilfe; bei einer kritischen Wunde auf Operation.
	- Krit: Heildauer halbiert (aufgerundet).
	- gelungen: Heildauer unverändert.
	- misslungen oder keine Nachsorge: Heildauer ×2.
- Mehrere Wunden heilen gleichzeitig.
- **Offene Wunde:** Bis die Heildauer abgelaufen ist, gelten die Folgen der Zone weiter, soweit sie andauern (z. B. humpeln, [[Körperzonen]]). Eine offene kritische Wunde hält die Kampfunfähigkeit aufrecht ([[#Kampfunfähigkeit]]).
- **Geheilt:** Ist die Heildauer abgelaufen, wird die Wunde gestrichen. Die HP kehren nicht mit der Wunde zurück, sondern nur über die Erholungsprobe ([[#HP zurückgewinnen]]).

