# Offene Punkte

Bekannte Lücken, sortiert nach Wirkung auf die Ergebnisse. Jeder Punkt ist so formuliert,
dass er direkt als GitHub-Issue angelegt werden kann. Beiträge willkommen – bitte mit
Quelle.

---

## 1. Netto-Kalibrierung mit einem zweiten Datenpunkt prüfen

**Label:** `korrektheit`, `hilfe-gesucht`

`NETTO_KALIBRIERUNG = 0,973` in `pension.js` ist ein empirischer Faktor, der an **einem**
Datenpunkt des offiziellen PV-Rechners kalibriert wurde (Antritt 65, brutto ≈ 4.364 €).
Er kompensiert dort rund 88 €/Monat, deren Ursache nicht bekannt ist. Ob der Faktor bei
niedrigen Pensionen (≈ 1.500 € brutto) passt, ist ungeprüft – dort wirken
Pensionistenabsetzbetrag und Sonderzahlungs-Freigrenze anders.

**Gesucht:** ein zweiter Datenpunkt aus dem offiziellen Rechner (brutto + netto) bei
niedriger Pension. Damit lässt sich entscheiden, ob der Faktor bleibt, verschwindet oder
durch eine erklärbare Regel ersetzt wird.

## 2. SVS-Nachbemessung ist nicht modelliert

**Label:** `gsvg`, `vereinfachung`

Bei Selbständigen werden Beiträge zunächst auf einer **vorläufigen** Beitragsgrundlage
vorgeschrieben und nach Vorliegen des Steuerbescheids **nachbemessen**. Der Rechner nimmt
an, dass die endgültige Grundlage sofort gilt (`E / (1 − PV − KV)` als Fixpunkt). Für die
Pensionshöhe ist das im Ergebnis richtig, für den Cashflow in der Lücke nicht.

**Zu tun:** entscheiden, ob die Nachbemessung im Kapitalbedarf abgebildet wird, oder den
Hinweis im Info-Popup ausbauen.

## 3. Methodik-Seite: GSVG-Zahlen ergänzen

**Label:** `doku`

`methodik.html` erklärt die Faustformel „1.000 € Beitrag → +5,58 € Pension/Monat“ nur für
das ASVG (22,8 %). Für das GSVG (18,5 %) sind es 7,81 → 9,62 % je Euro, also ≈ 8,02 €
je 1.000 €. Die Seite sollte beide Systeme nennen und erklären, warum der Unterschied nur
daran liegt, wer zahlt.

## 4. Erhöhter Pensionistenabsetzbetrag, SV-Rückerstattung für Pensionisten, VAB-Zuschlag

**Label:** `steuer`, `vereinfachung`

Abgebildet sind PAB (1.020 €, Einschleifung 21.614–31.494 €), VAB (496 €) und die
SV-Rückerstattung für Aktive (55 %, max. 496 €). **Nicht** abgebildet: der erhöhte PAB
(1.502 €, an Partnereinkommen gebunden), die SV-Rückerstattung für Pensionisten und der
VAB-Zuschlag bei niedrigem Einkommen. Wirkt nur bei kleinen Pensionen bzw. kleinem
Zuverdienst, dort aber spürbar.

## 5. Mehrfachversicherung ASVG + GSVG

**Label:** `vereinfachung`

Wer gleichzeitig angestellt und selbständig ist, hat eine gemeinsame Höchstbeitragsgrundlage
und eine Differenzvorschreibung. Der Rechner kennt nur entweder/oder. Für den Zuverdienst
in der Lücke wäre der Mischfall (geringfügig angestellt + kleiner Gewerbeschein) relevant.

## 6. Elasticsearch: Index-Template statt dynamischem Mapping

**Label:** `betrieb`

Der Index `pensionsrechner-prod-web` entsteht per dynamischem Mapping: `text` + `.keyword`
für jedes Feld, `nginx_has_params` als Text statt Boolean, kein Rollover. Ein
Index-Template mit `keyword` für Pfad/Referrer/Agent/Remote, `boolean` für `has_params`
und einer ILM-Policy (z. B. 90 Tage) wäre sauberer. Ebenfalls prüfen: `nginx_agent`
kürzen – vollständige User-Agents sind ein Fingerprinting-Risiko, auch bei gekürzter IP.

## 7. Screenshot für die README

**Label:** `doku`, `gut-für-einsteiger`

Die README hat kein Bild. Ein Screenshot der beiden Szenario-Kacheln mit Vergleich
(Desktop, Light Mode) unter `docs/screenshot.png` und ein Verweis in `README.md`.

## 8. Weitere Pensionsarten (nicht geplant, aber gefragt)

**Label:** `frage`

Schwerarbeitspension, Langzeitversichertenregelung und Invaliditätspension sind nicht
abgebildet und werden im Footer als Vereinfachung genannt. Vor einer Umsetzung braucht
es eine Klärung, ob das in ein „Gedankenspiel Frühpension“ überhaupt gehört – jede dieser
Pensionsarten hat eigene Anspruchsvoraussetzungen, die der Rechner nicht prüfen kann.
