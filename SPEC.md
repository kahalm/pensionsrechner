# Ursprüngliche Spezifikation (Initialprompt)

Dieses Dokument ist der wörtliche Ausgangsprompt, mit dem der Pensionsrechner am
25. 8. 2026 in einer Claude-Code-Sitzung gebaut wurde. Alles Weitere entstand danach
im Dialog; die Weiterentwicklung ist in den Commit-Messages dokumentiert
(`git log`), die wichtigsten Ergänzungen sind am Ende dieser Datei aufgelistet.

Hinweis: Einige Werte der Spec wurden später korrigiert (z. B. Nachkaufkosten 1.472 →
1.546 €, Frauen-Regelpensionsalter-Tabelle, Korridor-Übergangsstufen). Maßgeblich ist
der Code, nicht diese Spec.

---

# Spec: Pensionsrechner Österreich (Gedankenspiel Frühpension)

Baue eine statische Webseite, die österreichische Pensionsszenarien nach dem APG-Pensionskonto berechnet: regulärer Antritt, Korridorpension, vorzeitiger Erwerbsausstieg mit Überbrückung (KV-Selbstversicherung, freiwillige Weiterversicherung) und Nachkauf von Schul-/Studienzeiten inkl. Steuereffekt.

Alle Beträge in **heutigem Geldwert** (Werte 2026). Keine Inflations-/Aufwertungsprognose — das entspricht der Methodik des offiziellen PV-Pensionskontorechners und macht die Ergebnisse damit vergleichbar.

## Tech-Vorgaben

- Statische Seite ohne Build-Step: `index.html`, `style.css`, `pension.js` (ES-Module mit reiner Rechenlogik), `app.js` (UI-Bindung), `tests.js`.
- Vanilla JS, keine externen Dependencies, kein Framework, kein CDN.
- `pension.js` exportiert pure functions (kein DOM-Zugriff), damit `tests.js` sie per `node --test tests.js` oder plain asserts prüfen kann.
- Responsive (Mobile-first), Dark Mode via `prefers-color-scheme`.
- Alle Eingaben in URL-Query-Params spiegeln (teilbare Links) und in `localStorage` persistieren. URL-Params haben Vorrang vor localStorage, localStorage vor Defaults.
- Deutsch (Österreich), Zahlenformat `de-AT` (1.234,56 €).
- Deployment: läuft aus einem beliebigen Ordner via nginx/Caddy; keine Server-Logik.

## Konstanten (Stand 2026, zentral in `pension.js` als `CONST` definieren und im UI-Footer mit Jahr ausweisen)

```
KONTOPROZENTSATZ        = 0.0178        // 1,78 % der Jahresbeitragsgrundlage
HBGL_MONAT              = 6930          // Höchstbeitragsgrundlage €/Monat
HBGL_JAHR               = 97020         // inkl. Sonderzahlungen (14 × 6.930)
GERINGFUEGIGKEIT        = 551.10

// Freiwillige Weiterversicherung PV (§17 ASVG), Satz 22,8 %
WV_BG_MIN               = 1084.20       // €/Monat → Beitrag 247,20 €/Monat
WV_BG_MAX               = 8085.00       // €/Monat → Beitrag 1.843,38 €/Monat
WV_SATZ                 = 0.228

// Selbstversicherung Krankenversicherung (§16 ASVG)
KV_SELBST_MONAT         = 565.25

// Nachkauf Schul-/Studienzeiten (nachträgliche Selbstversicherung)
NK_KOSTEN_MONAT         = 1472          // Mittelwert Zeiten ab 2005 (1.409,79–1.471,51); vor 2005: 1.580,04
NK_MAX_MONATE           = 108           // 36 höhere Schule + 72 Hochschule (12 Semester × 6)
NK_GUTSCHRIFT_MONAT     = NK_KOSTEN_MONAT / WV_SATZ * KONTOPROZENTSATZ   // ≈ 114,9 €

// Korridorpension (Rechtslage ab 2026, Endausbau ab Jahrgang 01.10.1966)
KORRIDOR_ALTER          = 63
KORRIDOR_MONATE         = 504
ABSCHLAG_PA             = 0.051         // 0,425 %/Monat vor Regelpensionsalter
ZUSCHLAG_PA             = 0.051         // nach 65, gedeckelt
ZUSCHLAG_MAX            = 0.153
REGELPENSIONSALTER      = 65

// Lohnsteuer 2026 (Tarifstufen, Grenzsteuersätze)
TARIF = [[13539,0],[21992,0.20],[36458,0.30],[70365,0.40],[104859,0.48],[1000000,0.50],[Infinity,0.55]]
SV_DN_SATZ              = 0.1807        // Dienstnehmeranteil Angestellte, gedeckelt bei HBGL_MONAT
SZ_FREIBETRAG           = 620           // Sonderzahlungen: 6 % nach Freibetrag
KV_PENSION              = 0.06          // KV-Beitrag von der Pension
NETTO_KALIBRIERUNG      = 0.973         // Korrekturfaktor, kalibriert am offiziellen PV-Rechner
```

## Eingaben (mit Defaults)

| Feld | Typ | Default | Grenzen |
|---|---|---|---|
| Geburtsdatum | date | 1983-02-24 | 1955–2005 |
| Pensionskonto-Gutschrift (€) | number | 22812 | ≥ 0 |
| Gutschrift-Stichtag | date | 2026-01-01 | fix anzeigbar, editierbar |
| Versicherungsmonate per Gutschrift-Stichtag | number | 203 | 0–600 |
| Bruttogehalt/Monat, ×14 gerechnet (€) | number | 9000 | ≥ 0 |
| Lebenshaltung netto/Monat (€) | slider | 2000 | 1000–6000, Schritt 100 |
| Ausstiegsalter | slider | 60 | 55–68 |
| Pensionsantrittsalter | slider | 63 | 60–68, wird auf ≥ Ausstiegsalter geklemmt |
| Nachkauf ja/nein | toggle | an | kauft automatisch die auf 504 fehlenden Monate, Deckel 108; nur relevant bei Antritt < 65 |
| Nachkauf verteilt über N Jahre | slider | 5 | 1–10 |
| Mindest-Weiterversicherung in der Lücke ja/nein | toggle | an | — |

Wichtig: Erwerbsjahre und Monate werden **ab dem Gutschrift-Stichtag** gezählt, nicht ab „heute“ — sonst driftet das Ergebnis um die seit Jahresbeginn verstrichenen Monate (Fehler eines früheren Prototyps, hier bewusst korrigiert).

## Rechenlogik (`pension.js`, pure functions)

### Zeitachsen
- `stichtagPension = erster Monatserster nach dem Geburtstag im Antrittsalter` (z. B. geb. 24.02.1983, Antritt 63 → 01.03.2046).
- `ausstiegsdatum = Monatsende des Geburtstagsmonats im Ausstiegsalter`.
- `arbeitsmonate = Monate von Gutschrift-Stichtag bis Ausstiegsdatum` (ganzzahlig, kaufmännisch).
- `lueckenmonate = Monate von Ausstieg bis stichtagPension`.

### Versicherungsmonate am Stichtag
```
vm = vm_start + arbeitsmonate + (wv_an ? lueckenmonate : 0) + nk_monate
nk_monate = nachkauf_an && antritt < 65
          ? clamp(504 − (vm ohne Nachkauf), 0, NK_MAX_MONATE)
          : 0
```

### Gutschrift bei Antritt
```
jahresgutschrift  = KONTOPROZENTSATZ × min(gehalt × 14, HBGL_JAHR)
gutschrift = konto
           + (arbeitsmonate/12) × jahresgutschrift
           + (wv_an ? (lueckenmonate/12) × KONTOPROZENTSATZ × WV_BG_MIN × 12 : 0)
           + nk_monate × NK_GUTSCHRIFT_MONAT
```

### Anspruch & Abschlag
- Antritt < 63 → **kein Anspruch** (Fehlermeldung, keine Pension ausweisen).
- 63 ≤ Antritt < 65 → Korridorpension nur wenn `vm ≥ 504`, sonst Fehlermeldung mit fehlenden Monaten. Abschlag `= (65 − antritt) × ABSCHLAG_PA`. Hinweis anzeigen: am Stichtag kein Erwerbseinkommen über der Geringfügigkeitsgrenze.
- Antritt ≥ 65 → Alterspension, Zuschlag `= min((antritt − 65) × ZUSCHLAG_PA, ZUSCHLAG_MAX)`.
- `brutto_monat = gutschrift / 14 × (1 − abschlag)` bzw. `× (1 + zuschlag)`.

### Netto der Pension
```
lauf = 12 × brutto_monat;  sz = 2 × brutto_monat
kv   = KV_PENSION × (lauf + sz)
lst  = tarif(lauf × (1 − KV_PENSION))
lstSz = max(0, sz × (1 − KV_PENSION) − SZ_FREIBETRAG) × 0.06
netto_monat = (lauf + sz − kv − lst − lstSz) / 14 × NETTO_KALIBRIERUNG
```
`tarif(x)` = progressiver Durchlauf durch `TARIF` (Grenzsteuerlogik).

### Nachkauf-Steuereffekt (gesonderter Block)
```
kosten_voll = nk_monate × NK_KOSTEN_MONAT
bemessung   = 12 × gehalt − 12 × min(gehalt, HBGL_MONAT) × SV_DN_SATZ
rate        = kosten_voll / n_jahre
ersparnis   = n_jahre × (tarif(bemessung) − tarif(max(0, bemessung − rate)))
kosten_netto = kosten_voll − ersparnis
eff_satz     = ersparnis / kosten_voll
```
Anzeigen: Kosten voll, Steuerersparnis (grün), Kosten nach Steuer, effektiver Satz, Rate/Jahr. Hinweis-Text: Sonderausgabenabzug greift im Jahr der Zahlung; gestaffelte Teilanträge/Ratenzahlung vorab mit PV klären.

### Kapitalbedarf am Ausstieg
```
sv_jahr = KV_SELBST_MONAT × 12 + (wv_an ? WV_BG_MIN × WV_SATZ × 12 : 0)
kapital = (lueckenmonate/12) × (lebenshaltung × 12 + sv_jahr)
kapital_puffer = kapital × 1.15
```
Nachkaufkosten sind **nicht** im Kapitalbedarf enthalten (fließen idealerweise vor dem Ausstieg aus laufendem Einkommen) — als Fußnote ausweisen.

## UI

- Ein-Seiten-Layout: Eingaben oben (Grid), darunter 4 Kennzahlkarten (Pension brutto ×14, Pension netto ca., Differenz zu Lebenshaltung mit +/− und Farbe, Kapitalbedarf am Ausstieg), darunter der gesonderte Nachkauf-Kasten, darunter eine Statuszeile (rot/gelb/grün wie in der Anspruchslogik), darunter eine Detailtabelle (Versicherungsmonate am Stichtag, Nachkaufmonate, Gutschrift, Abschlag/Zuschlag, SV-Kosten pro Lückenjahr, Kapitalbedarf inkl. Puffer).
- Live-Neuberechnung bei jeder Eingabe, kein Submit-Button.
- Optionales Extra (wenn einfach): kleines SVG-Balkendiagramm, das Brutto-Pension für Antritt 63/64/65/66/67/68 bei sonst gleichen Eingaben nebeneinanderstellt.
- Footer-Disclaimer: „Gedankenspiel auf Basis der Rechtslage und SV-Werte 2026, heutiger Geldwert, ohne Gewähr. Keine Rechts-/Steuerberatung. Verbindlich ist nur die Auskunft der Pensionsversicherung.“

## Akzeptanztests (`tests.js` — müssen grün sein)

Referenz ist das offizielle PV-Berechnungsergebnis (Geburt 24.02.1983, Konto 22.812 € per 01.01.2026, Einkommen über HBGl, durchgehend versichert, Ausstieg = Antritt):

1. Antritt 63 (01.03.2046): brutto_monat = **3.697 € ± 20 €** (Abschlag 10,2 %). Voraussetzung im Test: vm ausreichend mocken bzw. Nachkauf an.
2. Antritt 65 (01.03.2048): brutto_monat = **4.364 € ± 20 €**, Abschlag 0.
3. Antritt 65: netto_monat = **3.174 € ± 50 €**.
4. Antritt 68: Zuschlag = 15,3 % (Deckel greift).
5. Monatszählung: vm_start 203 per 01.01.2026, durchgehend bis 01.03.2046 → 445 Monate; Korridor scheitert ohne Nachkauf um genau 59 Monate; mit Nachkauf werden exakt 59 gekauft.
6. Antritt 62 → kein Anspruch (Korridor erst 63).
7. tarif(92973) − tarif(72071) ≈ 10.033 € (Grenzsteuerlogik 48/40-%-Band).
8. Nachkauf aus + Antritt 63 + vm < 504 → Status rot, keine Pensionsbeträge.

## Nicht-Ziele

Keine Aufwertungs-/Inflationssimulation, keine Teilpension, keine Schwerarbeits-/Invaliditätspension, keine Frauen-Übergangsjahrgänge vor 1966 — bei Bedarf später ergänzen.

---

## Spätere Ergänzungen im Dialog (Kurzfassung, Details in `git log`)

- Zwei Szenarien A/B nebeneinander mit Break-even-Berechnung; Übernehmen-Buttons
- Geschlecht mit Frauen-Übergangsjahrgängen (Regelpensionsalter-Stufen ab 1964)
- Nachkauf als Monate-Regler statt Toggle; Kopplung an das Antrittsalter; Feld „Max. Nachkauf-Monate“
- Alternative „ETF statt Nachkauf“ (5 % p.a. netto) und Schalter im Vergleich
- Amortisationsrechnungen (1 Nachkauf-Monat, Weiterversicherung), netto/netto, mit Entnahmerechnung bei 2 % real
- Stundenreduzierung / Einkünfte-Reduktion und deren Pensionswirkung (HBGl-Deckel)
- Zuverdienst in der Lücke als Regler (Geringfügigkeitsgrenze bzw. GSVG-Versicherungsgrenze)
- Umschalter ASVG / GSVG (Selbständige): Beitragsgrundlage mit Hinzurechnung, 18,5 %, Mindest-/Höchstgrundlage
- Klickbare Info-Popups mit Quellenlinks, Methodik-Seite „Nachkauf oder arbeiten?“
- Leere Standardwerte; Eingaben nur lokal (localStorage/URL)
- Docker/nginx-Deployment, GHCR-CI, Zugriffs-Logging nach Elasticsearch (anonymisiert, ohne Query-Strings)
- Vollständige Prüfung aller Konstanten gegen Primärquellen; Quellenverzeichnis im Footer
