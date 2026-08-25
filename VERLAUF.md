# Entwicklungsverlauf – Pensionsrechner Österreich

Ein Tag, eine Claude-Code-Sitzung, 46 Commits: vom Spezifikations-Prompt bis zur
öffentlichen Seite mit Reddit-Traffic. Dieses Dokument fasst den gesamten Verlauf
zusammenhängend zusammen – was gebaut wurde, welche Entscheidungen gefallen sind, welche
Fehler passiert und wie sie gefunden wurden. Die Commit-Historie (`git log`) enthält die
Details, `SPEC.md` den Ausgangsprompt, `AUFWAND.md` die Token-Bilanz.

Datum: 25. August 2026, 10:10 bis ca. 22:40 Uhr (MESZ).

---

## 1. Ausgangslage

Die Sitzung begann mit einer Frage nach einer alten Claude-Sitzung – und dem Problem, dass
Claude als eigener Linux-User keine Schreibrechte im Projektordner hatte. Gelöst über
Gruppenmitgliedschaft (`usermod -aG kahalm claude`) und, weil die laufende Shell die neue
Gruppe nicht kannte, über `sg kahalm -c '…'` für jeden Schreibzugriff. Später kam die
Docker-Gruppe dazu, um den Stack selbst zu bauen und zu starten.

Dann kam die Spezifikation: ein statischer Rechner für österreichische Pensionsszenarien
nach dem APG-Pensionskonto, Vanilla JS, keine Dependencies, reine Rechenlogik getrennt von
der UI, acht Akzeptanztests gegen den offiziellen PV-Rechner.

## 2. Erster Wurf und Deployment

`pension.js` (Rechenlogik), `app.js` (UI), `index.html`, `style.css`, `tests.js`. Die
Akzeptanztests waren nach dem ersten Wurf grün (15 Tests). Ohne Browser in der Sitzung
wurde die UI nur per Syntaxprüfung abgesichert – das rächte sich später.

Deployment nach dem Muster der anderen Projekte im Stack: GitHub-Repo, CI baut nach
GHCR (`:dev` bei Push auf `main`, `:latest` bei `v*`-Tag), Compose unter `/opt/stacks`
im Netz des Reverse Proxy, Port 8887. Der Ablauf „Claude committet, Mensch pusht,
Claude wartet auf die CI und aktualisiert den Container" wurde zur Routine und blieb es
den ganzen Tag.

## 3. Vom Rechner zum Vergleichswerkzeug

Die erste große Erweiterung: zwei Szenarien nebeneinander mit **Break-even** – ab welchem
Alter hat das teurere Szenario durch seine höhere Pension aufgeholt. Dazu leere
Standardwerte statt Beispielzahlen, Eingaben nur lokal (URL-Parameter, localStorage).

Danach in schneller Folge: Info-Icons mit Herkunft der Werte (zuerst als Hover-Tooltip,
dann als klickbares Popup mit Links), Szenario A und B als strukturell identische Kacheln
nebeneinander (ein CSS-Rest blockierte das zunächst – die Regel erwartete eine Klasse,
die nie gesetzt wurde), Übernehmen-Buttons in beide Richtungen, Geschlecht mit den
Frauen-Übergangsjahrgängen, ein Feld für die noch verfügbaren Nachkauf-Monate.

Der Nachkauf wurde von einer Checkbox („kauft automatisch auf 504 auf") zu einem
Monate-Regler, gekoppelt an das Antrittsalter: Wird der Antritt unter das Regelalter
geschoben, hebt sich der Nachkauf aufs nötige Minimum. Die Rückrichtung (Nachkauf
runter → Antritt springt hoch) wurde nach kurzer Zeit wieder entfernt – sie störte beim
Erkunden, die rote Statuszeile mit den fehlenden Monaten reicht.

## 4. Die Nachkauf-Frage und die Amortisation

Die inhaltlich dichteste Phase. Fragen aus dem Dialog: Sofort nachkaufen oder kurz vor
Antritt? (Indexierung neutral, Steuervorteil spricht für sofort.) Was bringt die
Alternative „ETF statt Nachkauf"? (Netto-Kosten zu 5 % angelegt, als Vergleichswert und
als Schalter im Break-even.) Wie lange dauert es, bis sich ein Monat amortisiert?

Die Amortisation wurde dreimal überarbeitet, jedes Mal wegen einer Rückfrage:

- Zuerst brutto gegen brutto – „nicht sinnvoll", also durchgehend **netto**: Kosten nach
  Steuerersparnis, Pension nach KV und Lohnsteuer (13,1 statt 14,9 Jahre im Referenzfall).
- Dann hatten die beiden Amortisationswerte **verschiedene Nullpunkte** (einmal ab heute,
  einmal ab Pensionsbeginn) – 30 Jahre scheinbarer Unterschied, davon 22 bloß Wartezeit.
- Schließlich war die 2-%-Variante nur „Kapital ÷ Rate"; korrekt ist eine
  **Entnahmerechnung** mit Weiterverzinsung des Restkapitals (26,0 statt 20,3 Jahre).

Beim Break-even stellte sich heraus, dass ein Schnittpunkt bei Alter 117 als „kein
Ausgleich" gemeldet wurde – korrekt, aber nicht nachvollziehbar. Jetzt wird der Punkt
ausgewiesen, mit dem Zusatz, welche Variante danach wirtschaftlicher ist.

## 5. Zugriffs-Logging – und die Datenschutz-Erkenntnis

Auf Wunsch kam ein Zugriffs-Logging nach dem Muster eines Schwesterprojekts: nginx
schreibt JSON, Fluent Bit tailt es, Elasticsearch speichert es, Kibana zeigt es. Dann
echte Client-IPs statt der Proxy-IP, mit `set_real_ip_from` auf private Netze beschränkt
gegen Spoofing.

Erst als ein Ko-fi-Button mit dem Text „Eingaben bleiben im Browser" eingebaut werden
sollte, fiel auf: Die Eingaben stehen im **Query-String** – Geburtsdatum, Geschlecht,
Kontostand, Gehalt – und landeten zusammen mit der **echten IP** im Log. Zwei einzeln
harmlose Features ergaben ein vollständiges Finanzprofil pro Besucher. Behoben durch
Weglassen des Query-Strings (nur noch ein 0/1-Flag), Kürzen der IP auf das dritte Oktett,
Entfernen der rohen `X-Forwarded-For`-Kette, und Bereinigung aller 88 Bestandsdokumente
per `_update_by_query`. Erst danach durfte der Datenschutztext das Versprechen wieder
geben.

## 6. Stundenreduzierung, Zuverdienst, Geringfügigkeit

Ein Regler zeigt, was eine Reduktion der Arbeitszeit an Pension kostet – mit dem oft
übersehenen Effekt, dass über der Höchstbeitragsgrundlage eine Reduktion um 10 oder 20 %
**gar keine** Pension kostet.

Der Zuverdienst in der Lücke begann als Checkbox „geringfügig + 1 €" und wurde ein Regler
von 0 bis zum aktuellen Gehalt, mit markierter Geringfügigkeitsgrenze. Darunter nur
Unfallversicherung, ein Euro darüber Vollversicherung – und die Kuriosität, dass knapp
darunter netto mehr bleibt als knapp darüber. Der Dienstnehmersatz nutzt die
Einschleifregelung der Arbeitslosenversicherung (0 % bis 2.225 €), was zunächst
übersehen und dann nach einer Rückfrage korrigiert wurde.

## 7. Verifikation der Nachkaufkosten und die Methodik-Seite

Die Frage „orientieren sich die Kosten an meinem Gehalt?" führte zur Prüfung: nein, sie
hängen am Antragsjahr und Ausbildungsjahr. Die Konstante aus der Spec (1.472 €) war
veraltet; die WKO-Tabelle für 2026 zeigte 1.512,70–1.580,04 €. Neu: 1.546 € (Mitte),
im Footer begründet. Nebenbei: Der Höchstwert ist exakt Höchstbeitragsgrundlage × 22,8 %.

Eine frühere Aussage im Dialog („Nachkauf ist 11,7× ergiebiger") stellte sich als
Denkfehler heraus: Je Euro Gesamtbeitrag sind alle Wege exakt gleich (1,78 / 22,8 =
7,81 %), der Unterschied liegt nur darin, wer zahlt. Daraus entstand `methodik.html`
mit der Faustformel „1.000 € Beitrag → +5,58 € Pension pro Monat, lebenslang".

## 8. Öffentlich: Reddit

Vorbereitung: Ko-fi-Button, Charset-Header (Link-Vorschauen zeigten „Ãsterreich"),
Open-Graph-Tags, Favicon, robots.txt, Sitemap, Footer-Links zu GitHub und Discord.

Ein weiterer Fund dabei: nginx sendete **kein `Cache-Control`**. Browser hielten
`pension.js` heuristisch im Cache und rechneten mit veralteter Logik – falsche Zahlen ohne
Fehlermeldung. Jetzt `no-cache` für HTML/JS/CSS, ein Tag für Icons (das globale
`no-cache` hatte zuvor 35 % des Traffics als Favicon-Revalidierungen erzeugt, ein
einzelner Browser 900 in fünf Minuten).

Der Post auf r/austria ging um 20:11 MESZ online. Ein Cron-Loop meldete alle fünf
Minuten Aufrufe, Besucher, Referrer und Fehler; er lernte unterwegs, nur echte
Seitenaufrufe zu zählen und laufende von abgeschlossenen Fenstern zu trennen. Zwei Wellen:
51 Aufrufe in fünf Minuten um 20:20 und 53 um 21:15; nach zweieinhalb Stunden rund 930
Seitenaufrufe von knapp 500 Besuchern, ausschließlich über Reddit (App und Web etwa
gleich), null Fehler.

## 9. Selbständige (GSVG)

Ein Umschalter ASVG/GSVG. Die Beitragsgrundlage entsteht anders: Jahreseinkünfte laut
Bescheid **plus Hinzurechnung** der vorgeschriebenen PV-/KV-Beiträge – als Fixpunkt
gelöst (`E / (1 − 25,3 %)`), aus 50.000 € Einkünften werden 66.934 € Grundlage. Satz
18,5 % statt 22,8 % (die Websuche behauptete 17 %, die WKO-Quelle 18,5 %). Danach die
Texte (Beschriftungen, Info-Popups) und der Zuverdienst-Regler für GSVG
(Versicherungsgrenze 6.613,20 € = Geringfügigkeit × 12, Kleinunternehmerregelung).

## 10. Die Vollprüfung

Auf Wunsch wurden alle Konstanten, Regeln und Rechenschritte gegen Primärquellen geprüft.
Zwei Erinnerungen wären falsch gewesen, der Code hatte recht (Bonus 5,1 % statt 4,2 %,
KV-Pension 6 % statt 5,1 % – beides kürzlich angehoben). Zwei Fehler im Code:

- **Frauen-Regelpensionsalter** sechs Monate zu früh (Stufen ab 1.1.1964, nicht Mitte
  1963).
- **Korridorpension** pauschal 63/504 statt der stufenweisen Anhebung ab Jahrgang 1964;
  ein Jahrgang 1965 wurde mit 502 Monaten abgelehnt, obwohl 494 reichen.

Vier Ungenauigkeiten: GSVG-Zuverdienst las dieselbe Eingabe zweideutig; Stichtag bei
Geburtstag am Ersten; Sonderzahlungs-Freigrenze bei kleinen Pensionen; fehlende
Absetzbeträge (Pensionistenabsetzbetrag, Verkehrsabsetzbetrag, SV-Rückerstattung). Der
Kalibrierungsfaktor 0,973 blieb, ist aber als empirische Einpunkt-Anpassung benannt.
Footer mit 39 Quellen in fünf Themenblöcken.

## 11. Dokumentation

Zum Abschluss: `SPEC.md` (Ausgangsprompt), `CLAUDE.md` (Arbeitsanleitung), dieses
Dokument, `AUFWAND.md` (Token-Bilanz) und `tools/dom-check.mjs` – das DOM-Shim, das
während des Tages drei Fehler gefunden hat, die `node --check` nicht sehen konnte.

---

## Was sich als Muster gezeigt hat

**Rückfragen fanden die Fehler.** Praktisch jede inhaltliche Korrektur begann mit „warum
…?" oder „stimmt das?": die Netto-Umstellung, die Nullpunkte, die Entnahmerechnung, die
veraltete Konstante, die Einschleifregelung, der Break-even bei 117. Ein Rechner, dessen
Zahlen niemand hinterfragt, bleibt falsch.

**Erinnerung ist keine Quelle.** Drei Werte, die „sicher" schienen, waren falsch oder
veraltet – in beide Richtungen. Seit der Vollprüfung hat jede Konstante einen
Quellenkommentar.

**Zwei harmlose Features können zusammen ein Problem sein.** Logging plus echte IP ergab
ein Finanzprofil. Die Frage „was steht danach zusammen in einem Datensatz?" gehört zu
jeder Logging-Änderung.

**Syntaxprüfung reicht nicht.** Ein Modul kann syntaktisch korrekt sein und beim Laden
sterben. Das DOM-Shim ist seitdem Teil des Arbeitsablaufs.

**Metriken brauchen Definitionen.** „Aufrufe" ohne Ausschluss der Assets, „letzte 5
Minuten" ohne Unterscheidung laufend/abgeschlossen – beides produzierte Fehlalarme, bis
es präzisiert war.
