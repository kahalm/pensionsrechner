# Pensionsrechner Österreich – Gedankenspiel Frühpension

**Live: [pension.oberschmid.homes](https://pension.oberschmid.homes)**

Ein Rechner für die Frage „Was kostet es mich, früher aufzuhören – und was bleibt dann
an Pension?“ nach dem österreichischen APG-Pensionskonto. Zwei Szenarien nebeneinander,
Break-even dazwischen, alles in heutigem Geldwert. Für Angestellte (ASVG) und
Selbständige (GSVG/SVS).

Kein Backend, keine Anmeldung, keine Cookies. Die Eingaben bleiben im Browser.

## Was der Rechner kann

- **Pensionskonto fortschreiben**: aktuelle Gutschrift + Versicherungsmonate + Gehalt bis
  zum Erwerbsausstieg → Brutto- und Nettopension zum gewählten Antritt.
- **Korridorpension** mit Abschlägen, **Aufschub** mit Bonus, Regelpensionsalter für
  Frauen nach Jahrgang, stufenweise Anhebung der Korridor-Voraussetzungen.
- **Lücke zwischen Ausstieg und Antritt**: Lebenshaltung, KV-Selbstversicherung,
  freiwillige Weiterversicherung, Zuverdienst (mit Geringfügigkeitsgrenze) → Kapitalbedarf.
- **Nachkauf von Schul- und Studienzeiten** inklusive Steuereffekt, Amortisationsdauer und
  Vergleich mit „das Geld stattdessen anlegen“.
- **Zwei Szenarien im Vergleich** mit Break-even-Alter und der Aussage, welches danach
  wirtschaftlicher ist.
- **Stundenreduzierung**: was x % weniger Arbeitszeit an Pension kosten – oft weniger als
  man denkt, über der Höchstbeitragsgrundlage sogar nichts.

Wie gerechnet wird und warum Nachkaufen und Arbeiten je Euro gleich viel Pension bringen,
steht auf der [Methodik-Seite](https://pension.oberschmid.homes/methodik.html). Alle
Konstanten haben eine Quelle; die Liste steht im
[Footer](https://pension.oberschmid.homes/#quellen) und im Prüfprotokoll `PRUEFUNG.md`.

## Was er nicht ist

Ein Gedankenspiel, keine Beratung. Der Rechner vereinfacht bewusst (keine Aufwertung,
keine Inflationsprognose, keine Mehrfachversicherung, ein empirischer Netto-Korrekturfaktor)
– die Vereinfachungen sind in `CLAUDE.md` und im Footer benannt. Für den echten Antrag
zählt der [offizielle Pensionskontorechner](https://www.neuespensionskonto.at/pensionskontorechner/)
und die Auskunft der PV/SVS.

## Lokal ausführen

Statische Dateien, keine Dependencies, kein Build:

```bash
python3 -m http.server 8000      # dann http://localhost:8000
```

Oder als Container, so wie die Live-Seite läuft (nginx:alpine, JSON-Access-Log):

```bash
docker build -t pensionsrechner . && docker run --rm -p 8080:80 pensionsrechner
```

`docker-compose.yml` enthält zusätzlich Fluent Bit → Elasticsearch und braucht dafür eine
`.env` mit `ELASTICSEARCH_HOST`, `ELASTICSEARCH_PORT`, `ELASTICSEARCH_INDEX`.

## Tests

```bash
node --test tests.js          # Rechenlogik: Akzeptanztests gegen den offiziellen Rechner + Regressionen
node tools/dom-check.mjs      # UI-Rauchtest ohne Browser: lädt app.js gegen ein DOM-Shim
```

`pension.js` ist reine Logik ohne DOM und lässt sich direkt in Node importieren.

## Dokumentation

| Datei | Inhalt |
|---|---|
| [`SPEC.md`](SPEC.md) | Der ursprüngliche Prompt, aus dem das Projekt entstand |
| [`PROMPTS.md`](PROMPTS.md) | Die Folge-Prompts der Entwicklung, chronologisch |
| [`VERLAUF.md`](VERLAUF.md) | Die Entstehung an einem Tag: Phasen, Entscheidungen, Fehler |
| [`PRUEFUNG.md`](PRUEFUNG.md) | Prüfprotokoll: jede Konstante, jede Regel, Quelle und Ergebnis |
| [`LAUNCH.md`](LAUNCH.md) | Was nach dem Post auf r/austria passierte, in Zahlen |
| [`AUFWAND.md`](AUFWAND.md) | Token- und Kostenbilanz der Entwicklungssitzung |
| [`OFFEN.md`](OFFEN.md) | Bekannte Lücken und offene Punkte |
| [`CLAUDE.md`](CLAUDE.md) | Arbeitsanleitung für die Weiterentwicklung mit Claude Code |

Das Projekt wurde an einem Tag mit [Claude Code](https://claude.com/claude-code) gebaut –
Spezifikation, Rückfragen und Korrekturen kamen vom Menschen, Code und Recherche vom
Modell. `VERLAUF.md` beschreibt, wie das lief und was dabei schiefging.

## Datenschutz

Die Eingaben stehen nur in der URL (zum Teilen) und im `localStorage` des Browsers. Der
Server protokolliert Pfad, Status, Referrer und User-Agent mit auf das dritte Oktett
gekürzter IP – **nicht** den Query-String, in dem die Eingaben stehen. Details in
`nginx.conf`.

## Mitmachen

Fehler in Werten oder Regeln bitte mit Quelle als Issue melden – jede Konstante in
`pension.js` trägt einen Kommentar, woher sie stammt. Offene Punkte stehen in `OFFEN.md`.
Wer das Tool nützlich findet: [ko-fi.com/kahalm](https://ko-fi.com/kahalm).

## Lizenz

[MIT](LICENSE)
