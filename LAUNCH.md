# Launch: Was nach dem Post auf r/austria passierte

Der Rechner wurde am 25. August 2026 um 20:11 MESZ auf r/austria gepostet. Die Zahlen
hier stammen aus dem anonymisierten Access-Log (nur Aggregate, keine Einzeldaten – wie
protokolliert wird, steht in `nginx.conf` und in der README). Stand: 22:55 MESZ, also
2 Stunden 44 Minuten nach dem Post. Gezählt werden nur Seitenaufrufe von `/index.html`
und `/methodik.html`, keine Assets; interner Traffic ist ausgenommen.

## Die Zahlen

| | |
|---|---|
| Seitenaufrufe | **946** |
| Besucher (verschiedene /24-Netze, eher Untergrenze) | **≈ 500** |
| Aufrufe in den ersten 15 Minuten | 127 |
| Aufrufe / Besucher in der ersten Stunde | 466 / 294 |
| Spitze (5-Minuten-Fenster) | 53 Aufrufe um 21:15, 51 um 20:20 |
| Aufrufe der Methodik-Seite | **6** (0,6 %) |
| HTTP-Fehler auf Seiten | 0 |
| Requests insgesamt (inkl. Assets) | 5.546 – 5,9 je Seitenaufruf |

Verlauf pro Stunde: 20:00–21:00 → 396 Aufrufe (261 Besucher), 21:00–22:00 → 378 (218),
22:00–22:55 → 172 (122). Der Zulauf kam in zwei Wellen mit einem Tal um 21:00 und
flachte ab 22:30 auf 10–15 Aufrufe pro 5 Minuten ab.

## Woher die Besucher kamen

**Ausschließlich Reddit.** Kein anderer Referrer, keine Suchmaschine, kein Direktlink von
außerhalb.

| Referrer | Aufrufe |
|---|---:|
| Reddit-App (Android, `android-app://com.reddit.frontpage`) | 186 |
| reddit.com | 177 |
| Direkt aus dem Thread (reddit.com und old.reddit.com) | 18 |
| old.reddit.com | 6 |
| ohne Referrer | 552 |

Die 552 ohne Referrer sind zum Großteil die iOS-App (In-App-Browser ohne Referrer) und
Aufrufe aus kopierten Links. Zusammen mit den Geräten ergibt das ein klares Bild.

## Geräte

| | Aufrufe | Anteil |
|---|---:|---:|
| Android | 441 | 47 % |
| iOS | 272 | 29 % |
| Windows | 128 | 14 % |
| macOS | 52 | 5 % |
| Linux | 26 | 3 % |
| Bots (Link-Vorschau) | 4 | – |

**Drei Viertel mobil.** Das Layout mit zwei Szenario-Kacheln nebeneinander, an dem am
Vormittag gefeilt wurde, hat die Mehrheit nie gesehen – sie sah die untereinander
gestapelte Variante.

## Was die Besucher taten

- **140 von 946 Aufrufen (15 %) kamen mit Parametern** in der URL – also entweder ein
  geteilter Link mit fertigen Eingaben oder ein Reload nach dem Ausprobieren (der Rechner
  schreibt die Eingaben in die URL). Der Rest waren frische Aufrufe der leeren Seite.
- **Die meisten Besucher luden die Seite ein- bis zweimal**; die aktivsten kamen auf 29,
  24 und 16 Aufrufe – jemand hat ausführlich gerechnet.
- **Sechs Menschen öffneten die Methodik-Seite.** Von 946. Die Erklärung, wie gerechnet
  wird und warum Nachkaufen und Arbeiten je Euro gleich viel bringen, liest praktisch
  niemand. Konsequenz: Die Zahl im Tool muss stimmen und sich selbst erklären; eine
  Erklärseite rettet nichts.

## Was das Log über den Server verriet

- **Kein einziger Fehler auf Seiten.** 21 × 404 insgesamt, alle auf Icons und
  `robots.txt` in den ersten Minuten, bevor die Dateien lagen – mobile Browser fragen
  `apple-touch-icon.png` und `apple-touch-icon-precomposed.png` ungefragt an.
- **`favicon.svg` wurde häufiger abgerufen als die Seite selbst** (1.263 gegen 940). Bis
  zur Korrektur der Cache-Header galt `no-cache` für alles, und mobile Browser
  revalidieren Icons bei jedem Aufruf. Ein einzelner Browser hatte zuvor rund 900
  Favicon-Anfragen in fünf Minuten erzeugt. Seit die Icons einen Tag gecacht werden, ist
  das Verhältnis normal.
- **Antwortcodes:** 859 × 200, 84 × 304 (Revalidierung von `index.html` – die Seite
  selbst ist absichtlich `no-cache`, damit nach einem Deploy niemand mit alter
  Rechenlogik rechnet), 3 × 206.

## Was man daraus lernen kann

1. **Reddit ist ein Mobil-Kanal.** Wer für r/austria baut, baut für ein Handy. Die
   Desktop-Ansicht ist die Ausnahme.
2. **Die Halbwertszeit ist kurz.** Die Hälfte aller Aufrufe kam in der ersten Stunde; nach
   drei Stunden lag der Zulauf bei einem Fünftel der Spitze.
3. **Niemand liest die Methodik.** Vertrauen entsteht im Tool selbst: sichtbare Quellen,
   nachvollziehbare Zwischenwerte, keine Zahl ohne Erklärung in Reichweite.
4. **Ein Post ohne Cache-Header ist ein Post mit alter Software.** Browser hielten die
   Rechenlogik heuristisch fest und zeigten falsche Zahlen ohne Fehlermeldung. Das fiel
   erst auf, als eine Änderung „nichts bewirkte“.
5. **Logging und Datenschutz vor dem Post klären.** Query-String plus IP hätte hier ein
   Finanzprofil je Besucher ergeben. Die Anonymisierung war Stunden vorher fertig; ohne
   sie wäre dieser Text nicht zu veröffentlichen gewesen.
