# CLAUDE.md – Pensionsrechner Österreich

Arbeitsanleitung für Claude Code (und Menschen) in diesem Repository. Kurz gesagt: eine
statische Seite ohne Build-Step, die österreichische Pensionsszenarien nach dem
APG-Pensionskonto rechnet. Live unter https://pension.oberschmid.homes, Code auf
https://github.com/kahalm/pensionsrechner.

## Was das Projekt ist – und was nicht

Ein **Gedankenspiel-Rechner** für Frühpension: regulärer Antritt, Korridorpension,
Erwerbsausstieg mit Überbrückung, Nachkauf von Schul-/Studienzeiten, Zuverdienst in der
Lücke, Weiterversicherung – für Angestellte (ASVG) und Selbständige (GSVG). Zwei
Szenarien lassen sich nebeneinander vergleichen, inklusive Break-even.

Alles in **heutigem Geldwert** ohne Aufwertungs- oder Inflationsprognose. Das ist die
Methodik des offiziellen PV-Pensionskontorechners und macht die Zahlen mit ihm
vergleichbar. **Keine Rechts- oder Steuerberatung**; verbindlich ist nur die Auskunft
der Pensionsversicherung. Diese Haltung steht im Footer und gehört in jeden Text, der
Ergebnisse präsentiert.

Der ursprüngliche Prompt steht in `SPEC.md`. Einige Werte daraus wurden später
korrigiert – maßgeblich ist der Code.

## Dateien

| Datei | Rolle |
|---|---|
| `pension.js` | **Reine Rechenlogik**, ES-Module, kein DOM. Alle Konstanten in `CONST`. Jede Funktion ist pur und einzeln testbar. |
| `app.js` | UI-Bindung: Formular ↔ `pension.js`, Rendering, URL-Params, localStorage, Info-Popups (`INFO_TEXTE`). |
| `index.html` | Die Seite. Eingaben oben, Ergebnis-Kacheln A/B, Vergleich, Chart, Footer mit Quellen. |
| `methodik.html` | Erklärseite „Nachkauf oder arbeiten?“ mit Faustformel und Rechenbeispielen. |
| `style.css` | Mobile-first, Dark Mode über `prefers-color-scheme`, CSS-Variablen. |
| `tests.js` | `node --test tests.js`. Akzeptanztests gegen den offiziellen PV-Rechner plus Regressionstests für jeden gefundenen Fehler. |
| `tools/dom-check.mjs` | End-to-End-Rauchtest: lädt `app.js` gegen ein minimales DOM-Shim. Findet, was `node --check` nicht sieht. |
| `SPEC.md` | Wörtlicher Initialprompt + Liste der späteren Ergänzungen. |
| `VERLAUF.md` | Zusammenhängende Erzählung der Entstehung: Phasen, Entscheidungen, gefundene Fehler, Muster. |
| `AUFWAND.md` | Token- und Kostenbilanz der Entwicklungssitzung je Modell, erzeugt mit `tools/token-report.py`. |
| `tools/token-report.py` | Liest ein Claude-Code-Transkript (`.jsonl`) und schreibt die Bilanz als Markdown. |
| `Dockerfile`, `nginx.conf` | nginx:alpine, statische Auslieferung, JSON-Access-Log, Cache-Politik, Charset. |
| `docker-compose.yml` | Lokales Bauen/Testen (Port 8080) inkl. Fluent Bit. |
| `opt-stacks-compose.yaml` | Deployment-Variante: GHCR-Image, Reverse-Proxy-Netz, Fluent Bit → Elasticsearch. |
| `fluent-bit/` | Tail des nginx-Logs → Elasticsearch-Index `<name>-web`. |
| `.github/workflows/docker.yml` | CI: Push auf `main` → `ghcr.io/kahalm/pensionsrechner:dev`; Tag `v*` → `:latest`. |

## Harte Regeln

1. **Keine Dependencies, kein Build-Step, kein CDN.** Vanilla JS, ES-Module, direkt
   ausgeliefert. Ein Feature, das eine Library braucht, ist hier falsch aufgehoben.
2. **`pension.js` bleibt DOM-frei.** Alles, was `document` oder `window` anfasst, gehört
   in `app.js`. Nur so bleibt die Logik mit `node --test` prüfbar.
3. **Jede Konstante hat eine Quelle.** Neue oder geänderte Werte in `CONST` bekommen einen
   Kommentar mit Herkunft (WKO, PV, SVS, BVAEB, Gesetz) und landen im Quellenverzeichnis
   des Footers. Keine Zahl aus dem Gedächtnis – mehrere „sichere“ Erinnerungen waren in
   dieser Codebasis falsch (Bonus 4,2 % → tatsächlich 5,1 %; KV-Pension 5,1 % → 6 %).
4. **Netto rechnet man netto.** Wo Kosten und Erträge verglichen werden (Amortisation,
   Break-even), stehen beide Seiten nach Steuer und SV. Brutto gegen Netto zu stellen war
   der häufigste inhaltliche Fehler.
5. **Deutsch (Österreich), `de-AT`-Formatierung.** Zahlen über `Intl.NumberFormat`,
   Prozentwerte in Texten über den `pz()`-Helfer – `toFixed()` liefert einen Punkt.
6. **Eingaben bleiben beim Nutzer.** Persistenz nur in URL-Params und `localStorage`.
   Query-Strings werden serverseitig **nicht** geloggt, IPs werden anonymisiert. Der
   Datenschutztext im Ko-fi-Block behauptet genau das – er muss wahr bleiben.
7. **Cache-Politik nicht anfassen ohne Grund.** HTML/JS/CSS sind `no-cache` (sonst rechnen
   Browser mit veralteter Logik und zeigen falsche Zahlen, ohne dass es jemand merkt);
   Icons und statische Dateien haben einen Tag. Steht in `nginx.conf`, ist dort begründet.

## Arbeitsablauf

```bash
node --test tests.js          # Rechenlogik – muss grün sein
node tools/dom-check.mjs      # UI-Rauchtest – muss grün sein
docker build -t pr:test . && docker run --rm -p 8080:80 pr:test   # optional, Auslieferung prüfen
```

Änderungen an der Rechenlogik ohne neuen oder angepassten Test gelten als unfertig. Wenn
ein Test „falsch“ wirkt, erst prüfen, ob er eine inzwischen korrigierte Annahme
festschreibt (das kam bei der Frauen-Tabelle vor) – dann Test **und** Begründung
anpassen, nicht stillschweigend die Erwartung.

**Warum das DOM-Shim wichtig ist:** `node --check` prüft nur Syntax. Drei Fehler dieser
Codebasis waren syntaktisch korrekt und erst beim Laden des Moduls sichtbar (Variable
außerhalb ihrer Arrow-Function, kaputt gequoteter Template-String, `getElementById` auf
eine ID, die im HTML fehlte). `tools/dom-check.mjs` lädt `app.js` echt, füttert ein
Referenzszenario und öffnet jedes Info-Popup für beide Versicherungsarten.

## Fachliches, das man kennen muss

- **Kontoprozentsatz 1,78 %** der Jahresbeitragsgrundlage → Jahresgutschrift; Auszahlung
  **14×** pro Jahr. Ein Nachkauf-Monat ist ein fiktiver Beitragsmonat nahe der
  Höchstbeitragsgrundlage (Kosten = HBGl × 22,8 %), deshalb bringt er viel Gutschrift und
  kostet viel.
- **Je Euro Gesamtbeitrag sind alle Wege gleich effizient** (1,78 / 22,8 = 7,81 %). Der
  Unterschied liegt nur darin, *wer* zahlt: Dienstgeber 55 % bei Anstellung, 100 % selbst
  bei Nachkauf. GSVG rechnet mit 18,5 % → 9,62 % je Euro. Diese Einordnung steht in
  `methodik.html`; sie war einmal falsch formuliert („Nachkauf effizienter“).
- **Korridorpension** wird ab 2026 stufenweise angehoben (62/480 → 63/504, nach
  Geburtsdatum bis 1.10.1966). Tabelle `KORRIDOR_STUFEN`. Abschlag 0,425 %/Monat
  (5,1 %/Jahr), Bonus ebenso, Deckel 15,3 %.
- **Frauen-Regelpensionsalter**: Stufen beginnen mit Jahrgang **1964** (Parlaments-
  beschluss 2023 hat das ursprüngliche BVG um einen Monat verschoben). Tabelle
  `FRAUEN_STUFEN`. Abschläge beziehen sich immer auf das *persönliche* Regelalter.
- **Geringfügigkeitsgrenze = GSVG-Versicherungsgrenze / 12.** Unter der Grenze gibt es
  keine Versicherungsmonate und keine KV; ein Euro darüber ist Vollversicherung. Netto
  bleibt knapp darunter mehr über als knapp darüber (SV setzt ein) – gewollt, im Text
  erklärt.
- **GSVG-Beitragsgrundlage** = Einkünfte laut Bescheid **plus** Hinzurechnung der
  vorgeschriebenen PV-/KV-Beiträge; im Code als Fixpunkt `E / (1 − 0,253)`. Der
  Zuverdienst-Regler meint dagegen den *Gewinn vor SV* (= Grundlage) – die beiden Felder
  haben absichtlich verschiedene Semantik, die Beschriftung sagt es.
- **Stichtag** ist der auf den Geburtstag folgende Monatserste; fällt der Geburtstag auf
  einen Ersten, ist er selbst der Stichtag.
- **Steuer**: Tarif 2026 in `CONST.TARIF`; Sonderzahlungen 620 € Freibetrag, 2.615 €
  Freigrenze, 6 %; Pensionistenabsetzbetrag 1.020 € einschleifend 21.614–31.494 €;
  Verkehrsabsetzbetrag 496 €; SV-Rückerstattung 55 %, max. 496 €. Nachkauf und
  Weiterversicherung sind Sonderausgaben ohne Höchstgrenze (Einmalzahlung: Zehntelregelung).

## Bekannte Vereinfachungen (bewusst, im Footer ausgewiesen)

- `NETTO_KALIBRIERUNG = 0.973` ist eine empirische Anpassung an **einen** Datenpunkt des
  offiziellen Rechners (4.364 € brutto, Antritt 65). Ursache der 88 €/Monat unbekannt;
  bei kleinen Pensionen ungeprüft. Ein zweiter Datenpunkt bei ~1.500 € brutto würde das
  klären – wer ihn hat, bitte in `tests.js` als Akzeptanztest hinterlegen.
- Korridor-Mindestalter mit Monatsbruchteilen (z. B. 62 J 4 M) wird auf dem Jahres-Regler
  nur ganzjährig abgebildet.
- Nicht abgebildet: erhöhter Pensionistenabsetzbetrag, Zuschlag zum Verkehrsabsetzbetrag,
  Pendlerpauschale, SVS-Nachbemessung (vorläufige Beiträge), Beitragsrückerstattung bei
  Mehrfachversicherung, Teil-/Schwerarbeits-/Invaliditätspension, Aufwertung.
- Nachkaufkosten als Mittelwert 1.546 € (Spanne 1.512,70–1.580,04 € je Ausbildungsjahr).

## Deployment und Betrieb

- CI baut bei jedem Push auf `main` das Image `:dev`; ein `v*`-Tag ergibt zusätzlich
  `:latest`. Deploy = `docker compose pull && docker compose up -d` im Stack-Ordner.
- Die Stack-Compose liegt hier als `opt-stacks-compose.yaml` und wird auf dem Host neben
  `fluent-bit/` abgelegt. Elasticsearch-Host, Port und Index kommen aus Umgebungsvariablen
  (`ELASTICSEARCH_HOST`, `ELASTICSEARCH_PORT`, `ELASTICSEARCH_INDEX`); Fluent Bit schreibt
  nach `${ELASTICSEARCH_INDEX}-web`.
- **Log-Inhalt**: Pfad, Status, Bytes, Referrer, User-Agent, anonymisierte IP (letztes
  Oktett 0), Flag „hatte Parameter“. **Nicht** im Log: Query-String (enthält die
  Eingaben), rohe `X-Forwarded-For`-Kette. Wer das ändert, ändert den Datenschutztext mit.
- Für Zugriffsstatistik nur `/index.html` und `/methodik.html` zählen, nicht Assets –
  ein einzelner Browser hat einmal 900 Favicon-Revalidierungen in fünf Minuten erzeugt.
- Nach jedem Deploy einmal hart neu laden (`Strg+Shift+R`); der Cache-Header wirkt erst
  ab dem nächsten sauberen Abruf.

## Konventionen für Commits

Ausführliche, erklärende Commit-Messages auf Deutsch: **was** geändert wurde, **warum**,
mit Zahlen (vorher/nachher) und Quelle bei fachlichen Änderungen. Fehler beim Namen
nennen („war falsch, weil …“), nicht verschleiern. Die Historie ist die eigentliche
Dokumentation der Entwicklung – `git log` lesen lohnt sich vor größeren Eingriffen.

## Typische Fallen (alle schon passiert)

- Eine Zahl im Chat „wissen“ statt nachschlagen → zwei falsche Konstanten, eine falsche
  Aussage auf der Methodik-Seite.
- Zwei Features, die einzeln harmlos sind (Zugriffs-Logging + echte Client-IP), ergaben
  zusammen ein vollständiges Finanzprofil pro Besucher im Log. Bei Änderungen am Logging
  immer fragen: was steht danach *zusammen* in einem Dokument?
- Fehlender `Cache-Control`-Header → Browser lieferten wochenlang alte Rechenlogik.
- Fehlendes `charset` im `Content-Type` → Link-Vorschauen zeigten „Ãsterreich“.
- Ein Python-Edit-Skript mit fehlgeschlagener Assertion hat die Datei **nicht**
  geschrieben, während ein anderer Teil des Skripts es tat → halbe Änderung. Nach
  Skript-Edits immer `node --check` **und** `tools/dom-check.mjs`.
- Zwei Amortisationswerte mit verschiedenen Nullpunkten nebeneinander (einmal ab heute,
  einmal ab Pensionsbeginn) sahen wie ein 30-Jahres-Unterschied aus.
