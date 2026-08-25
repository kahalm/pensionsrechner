# Prüfprotokoll

Am 25. August 2026 wurden alle Konstanten, Regeln und Rechenschritte des Rechners gegen
Primärquellen geprüft – für Angestellte (ASVG) und Selbständige (GSVG). Dieses Protokoll
listet, was geprüft wurde, wogegen, und mit welchem Ergebnis. Die Quellen sind dieselben
wie im Footer der Seite; die Konstanten stehen in `pension.js` (`CONST`), die Regeln in
den dort benannten Funktionen. Zu jedem Ergebnis existiert ein Test in `tests.js`.

Legende: **bestätigt** – Wert/Regel war korrekt · **korrigiert** – war falsch und wurde
geändert · **ergänzt** – fehlte und wurde eingebaut · **Vereinfachung** – bewusst
vereinfacht, im Footer ausgewiesen.

## Pensionskonto, Antritt, Ab- und Zuschläge

| Was | Wert / Regel | Quelle | Ergebnis |
|---|---|---|---|
| Kontoprozentsatz | 1,78 % der Jahresbeitragsgrundlage werden gutgeschrieben | § 12 APG; WKO Pensionsberechnung Neurecht | bestätigt |
| Monatspension | Gesamtgutschrift ÷ 14 (14 Auszahlungen) | PV Pensionskontorechner | bestätigt |
| Regelpensionsalter Männer | 65 | Sozialministerium Alterspension | bestätigt |
| Regelpensionsalter Frauen | Stufen ab Jahrgang 1.1.1964 (60,5) in Halbjahresschritten bis 65 ab 1.7.1968 | ÖGB Anhebung Frauenpensionsalter; PV Pension für Frauen | **korrigiert** – die Tabelle begann sechs Monate zu früh (Mitte 1963) |
| Korridorpension, Endausbau | ab 63 mit 504 Versicherungsmonaten (Jahrgänge ab 1.10.1966) | PV Korridorpension; WKO Korridorpension | bestätigt |
| Korridorpension, Übergang | bis Jahrgang 1963: 62 / 480; ab 1.1.1964 je Quartals-Jahrgang +2 Monate Alter (bis 63) und +2 Versicherungsmonate (bis 504) | PV Korridorpension; WKO Korridorpension | **korrigiert** – der Rechner verlangte pauschal 63 / 504; ein Jahrgang 1965 wurde mit 502 Monaten abgewiesen, obwohl 494 reichen |
| Abschlag Korridor | 5,1 % pro Jahr (0,425 % je Monat) vor dem Regelalter, max. 15,3 % | PV Korridorpension | bestätigt |
| Bonus bei Aufschub | 5,1 % pro Jahr nach dem Regelalter, max. 15,3 % (3 Jahre) | PV Pension erhöhen; BVAEB Wovon hängt die Höhe ab | bestätigt – die Erinnerung des Modells sagte 4,2 %, der Code hatte recht |
| Stichtag | Pension ab dem Monatsersten nach Erreichen des Alters; fällt der Geburtstag auf den Ersten, ist er selbst Stichtag | Sozialministerium Alterspension | **ergänzt** |
| Ausländische Versicherungszeiten | zählen für die Anspruchsprüfung (Wartezeit), nicht für die Höhe der österreichischen Teilpension | PV Zwischenstaatliche Pensionsversicherung | bestätigt, im Info-Popup erklärt |

## Netto aus Brutto (Pension)

| Was | Wert / Regel | Quelle | Ergebnis |
|---|---|---|---|
| KV-Beitrag Pension | 6 % (seit 1.6.2025, vorher 5,1 %) | PV Krankenversicherungsbeitrag in der Pension | bestätigt – die Erinnerung des Modells sagte 5,1 % |
| Lohnsteuertarif 2026 | 0 % bis 13.539 · 20 % bis 21.992 · 30 % bis 36.458 · 40 % bis 70.365 · 48 % bis 104.859 · 50 % bis 1 Mio. · 55 % darüber | finfo.at, finanzinfo.at Lohnsteuertabelle 2026 | bestätigt |
| Sonderzahlungen (13./14.) | Freibetrag 620 €, dann 6 % fest | § 67 EStG | bestätigt |
| Freigrenze Sonderzahlungen | bleibt das Jahressechstel unter 2.615 €, sind die Sonderzahlungen steuerfrei | § 67 EStG | **ergänzt** – kleine Pensionen wurden zu hoch besteuert |
| Pensionistenabsetzbetrag | 1.020 € bis 21.614 € laufender Pension, linear auf 0 bei 31.494 € | BMF Steuerabsetzbeträge; finanz.at PAB 2026 | **ergänzt** |
| Erhöhter PAB, SV-Rückerstattung für Pensionisten | 1.502 € (an Partnereinkommen gebunden) | BMF Steuerabsetzbeträge | Vereinfachung – nicht abgebildet |
| Netto-Kalibrierung | Faktor 0,973 auf das Netto, an einem Datenpunkt des offiziellen Rechners (Antritt 65, brutto 4.364 €) kalibriert | PV Pensionskontorechner | Vereinfachung – kompensiert rund 88 €/Monat unbekannter Ursache; bei niedrigen Pensionen ungeprüft (siehe `OFFEN.md`) |

## Netto aus Brutto (Erwerbseinkommen, Zuverdienst)

| Was | Wert / Regel | Quelle | Ergebnis |
|---|---|---|---|
| Höchstbeitragsgrundlage 2026 | 6.930 €/Monat, 97.020 €/Jahr (14 × 6.930) | WKO SV-Werte; BVAEB Beitragsrechtliche Werte 2026 | bestätigt |
| Geringfügigkeitsgrenze 2026 | 551,10 €/Monat | WKO SV-Werte | bestätigt |
| Dienstnehmeranteil SV | 18,07 % (PV 10,25 + KV 3,87 + AlV 2,95 + AK/WBF 1,0) | WKO Beitragswesen Dienstnehmer 2026 | bestätigt |
| Einschleifregelung AlV | 0 % bis 2.225 €, 1 % bis 2.427 €, 2 % bis 2.630 €, sonst 2,95 % → knapp über der Geringfügigkeit 15,12 % | WKO Beitragswesen Dienstnehmer 2026 | **korrigiert** – der Rechner nahm bei 552 € den vollen Satz |
| Unter der Geringfügigkeit | nur Unfallversicherung des Dienstgebers, kein DN-Anteil, keine Pensionsmonate | WKO SV-Werte | bestätigt |
| Verkehrsabsetzbetrag | 496 € | finanz.at VAB 2026; BMF | **ergänzt** |
| SV-Rückerstattung (Negativsteuer) | 55 % der SV-Beiträge, max. 496 €, wenn die Steuer nach Absetzbeträgen negativ wäre | oesterreich.gv.at Negativsteuer | **ergänzt** |
| VAB-Zuschlag, erhöhter VAB (Pendler) | bis 804 € | BMF Steuerabsetzbeträge | Vereinfachung – nicht abgebildet |

## Überbrückung der Lücke (ASVG)

| Was | Wert / Regel | Quelle | Ergebnis |
|---|---|---|---|
| KV-Selbstversicherung | 565,25 €/Monat (Regelbeitrag 2026) | § 16 ASVG; oesterreich.gv.at Selbstversicherung KV | bestätigt |
| Freiwillige Weiterversicherung PV | 22,8 % einer selbst gewählten Beitragsgrundlage zwischen 1.084,20 und 8.085 €/Monat | § 17 ASVG; oesterreich.gv.at Beitragszeiten und Weiterversicherung | bestätigt |
| Gutschrift aus Weiterversicherung | 1,78 % der gewählten Jahresgrundlage – je Euro dieselbe Ausbeute wie im Dienstverhältnis (1,78 / 22,8 = 7,81 %) | § 12 APG | bestätigt |
| Krankenversicherung immer | ohne Erwerb und ohne Pension braucht es eine KV; sie wird in jedem Szenario gerechnet | § 16 ASVG | bestätigt |

## Nachkauf von Schul- und Studienzeiten

| Was | Wert / Regel | Quelle | Ergebnis |
|---|---|---|---|
| Kosten je Monat (Antragsjahr 2026) | 1.512,70 € (Ausbildungsjahr 2010) bis 1.580,04 € (vor 2005 und 2026) – gewählt 1.546 € (Mitte, Fehler ≤ 2,2 %) | WKO Nachkauf Kosten; oesterreich.gv.at Nachkauf | **korrigiert** – der Spec-Wert 1.472 € war veraltet |
| Kosten nicht einkommensabhängig | abhängig von Antragsjahr und Kalenderjahr der Ausbildung, nicht vom Gehalt | WKO Nachkauf Kosten | bestätigt |
| Höchstwert = HBGL × 22,8 % | 6.930 × 22,8 % = 1.580,04 € – der Nachkauf ist ein fiktiver Monat auf Höchstbeitragsgrundlage | Rechnung aus obigen Werten | bestätigt |
| Gutschrift je Monat | Kosten ÷ 22,8 % × 1,78 % – je Euro gleich viel wie jeder andere Beitrag | § 12 APG; PV Nachkauf (PDF) | bestätigt |
| Höchstausmaß | 108 Monate (bis 36 Monate mittlere/höhere Schule ab 15, bis 72 Monate Hochschule) | PV Nachkauf (PDF); oesterreich.gv.at Nachkauf | bestätigt |
| Studienabschluss | nicht Voraussetzung; zählt jedes Semester mit ausreichend nachgewiesenem Studienfortschritt | PV Nachkauf (PDF) | bestätigt, im Info-Popup |
| Steuerliche Absetzbarkeit | Sonderausgabe ohne Höchstbetrag, Ersparnis = Grenzsteuersatz × Kosten | USP Sonderausgaben; Nachkauf steuerlich absetzbar? | bestätigt |
| Zeitpunkt des Nachkaufs | Indexierung neutral, Steuervorteil spricht für sofort; im Rechner als Kosten im Antragsjahr | WKO Nachkauf Kosten | bestätigt |

## Selbständige (GSVG, SVS)

| Was | Wert / Regel | Quelle | Ergebnis |
|---|---|---|---|
| Pensionsversicherung | 18,5 % | WKO Gewerbliche SV-Beiträge Ausmaß; SVS Beitragsgrundlagen 2026 (PDF) | bestätigt – eine Websuche behauptete 17 %, die WKO-Quelle 18,5 % |
| Krankenversicherung | 6,8 % | WKO Ausmaß | bestätigt |
| Unfallversicherung | 12,95 €/Monat fest | WKO Ausmaß | bestätigt |
| Höchstbeitragsgrundlage | 8.085 €/Monat × 12 = 97.020 €/Jahr (wie ASVG, dort × 14) | WKO Ausmaß | bestätigt |
| Mindestbeitragsgrundlage | 551,10 €/Monat (PV-Mindestbeitrag 101,95 €) | WKO Ausmaß | bestätigt |
| Beitragsgrundlage | Einkünfte laut Bescheid **plus** vorgeschriebene PV-/KV-Beiträge (Hinzurechnung) → Fixpunkt BG = E ÷ (1 − 0,253) | WKO Ausmaß | bestätigt – aus 50.000 € Einkünften werden 66.934 € Grundlage |
| Versicherungsgrenze (Kleinunternehmer) | 6.613,20 €/Jahr = Geringfügigkeitsgrenze × 12; darunter Ausnahme von KV und PV möglich, nur UV | WKO SV Kleinunternehmer; SVS Kleinunternehmer; SVS Einkünfte unter der Versicherungsgrenze | bestätigt |
| Neue Selbständige vs. Gewerbetreibende | gleiche Sätze; Unterschied bei Pflichtversicherung und Meldung | WKO Neue Selbständige | bestätigt, im Info-Popup |
| Zuverdienst in der Lücke | Eingabe = Gewinn vor SV; Gutschrift und Netto aus derselben Grundlage | WKO Ausmaß | **korrigiert** – Gutschrift und Netto lasen dieselbe Eingabe zweideutig |
| Nachbemessung | vorläufige und endgültige Beitragsgrundlage | SVS | Vereinfachung – nicht modelliert (siehe `OFFEN.md`) |

## Vergleichs- und Amortisationsrechnungen (Annahmen, keine Rechtswerte)

| Was | Wert / Regel | Begründung | Ergebnis |
|---|---|---|---|
| Alternative „ETF statt Nachkauf“ | 5 % netto p.a. (≈ 7 % brutto minus 27,5 % KESt) | Annahme, im Popup benannt | Vereinfachung |
| Amortisation | netto gegen netto: Kosten nach Steuerersparnis, Pension nach KV und Lohnsteuer | Dialog-Entscheidung | bestätigt |
| Alternativrendite Amortisation | 2 % real; Entnahmerechnung mit Weiterverzinsung des Restkapitals | Rentenrechnung | bestätigt |
| Break-even | stückweise linear; wird der Schnittpunkt außerhalb des Horizonts gefunden, wird er ausgewiesen samt der danach wirtschaftlicheren Variante | Dialog-Entscheidung | bestätigt |
| Heutiger Geldwert | keine Aufwertung, keine Inflationsprognose – wie der offizielle Rechner | PV Pensionskontorechner | Vereinfachung |

## Nicht geprüft / nicht abgebildet

Schwerarbeits-, Langzeitversicherten- und Invaliditätspension; Mehrfachversicherung
ASVG + GSVG; Teilpension; Aufwertung der Gutschrift; Kindererziehungszeiten und
Präsenzdienst als eigene Eingaben (sie stecken in den Versicherungsmonaten und der
Gutschrift, die der Nutzer vom Pensionskonto abliest). Vollständige Liste im Footer der
Seite unter „Vereinfachungen“.

## Wie geprüft wurde

Jede Konstante wurde gegen mindestens eine der oben genannten Quellen gelesen, jede Regel
gegen die zugehörige Gesetzes- oder Trägerseite. Wo Erinnerung und Quelle auseinander
lagen, galt die Quelle – dreimal war die Erinnerung falsch (Bonus, KV-Satz, GSVG-PV).
Jede Korrektur bekam einen Regressionstest; das Referenzszenario aus `SPEC.md` (Antritt 65
→ brutto 4.364 €, netto 3.174 €) muss nach jeder Änderung weiter innerhalb der Toleranz
liegen. Prüfdatum steht im Footer; wer einen Wert widerlegt, bitte mit Quelle als Issue.
