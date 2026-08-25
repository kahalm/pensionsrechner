# Aufwand der Claude-Code-Sitzung

Automatisch erzeugt mit `tools/token-report.py` aus dem lokalen Sitzungs-Transkript.
Zeitraum 2026-08-25 08:10–20:46 UTC (12.6 h), 154 Nutzer-Eingaben, 821 Tool-Aufrufe.

Preise: Anthropic-API-Listenpreise (Stand 2026-06-24). Cache-Reads 0,1× Input, Cache-Writes 1,25× (5-Min-TTL) bzw. 2× (1-Std-TTL) des Input-Preises. Alle Cache-Writes dieser Sitzung liefen mit 1-Stunden-TTL.

## Token je Modell

| Modell | Nachrichten | Zeitraum (UTC) | Input | Cache-Write (1h) | Cache-Read | Output |
|---|---:|---|---:|---:|---:|---:|
| `claude-sonnet-5` | 667 | 08:10–10:44 | 1.334 | 954.650 | 212.699.034 | 812.488 |
| `claude-opus-5` | 789 | 11:46–20:06 | 1.578 | 3.312.542 | 457.754.172 | 765.065 |
| `claude-fable-5` | 105 | 20:08–20:46 | 40.721 | 3.446.357 | 86.990.631 | 567.718 |
| **gesamt** | 1561 | | 43.633 | 7.713.549 | 757.443.837 | 2.145.271 |

## Kosten je Modell (Listenpreise)

| Modell | Input | Cache-Write | Cache-Read | Output | **Summe** |
|---|---:|---:|---:|---:|---:|
| `claude-sonnet-5` | 0,00 $ | 3,82 $ | 42,54 $ | 8,12 $ | **54,49 $** |
| `claude-opus-5` | 0,01 $ | 33,13 $ | 228,88 $ | 19,13 $ | **281,14 $** |
| `claude-fable-5` | 0,41 $ | 68,93 $ | 86,99 $ | 28,39 $ | **184,71 $** |
| **gesamt** | 0,42 $ | 105,87 $ | 358,41 $ | 55,64 $ | **520,33 $** |

## Einordnung

- **Cache-Reads sind der Kostentreiber** (69 % der Summe): In einer langen agentischen Sitzung wird der gesamte bisherige Kontext bei jedem Schritt erneut aus dem Cache gelesen. Die 757.443.837 gelesenen Token entsprechen dem Kontext, multipliziert mit der Zahl der Schritte.
- Frisch verarbeiteter Input ist mit 43.633 Token vernachlässigbar – fast alles kam aus dem Cache.
- Output: 2.145.271 Token, davon der Großteil Tool-Aufrufe (Code, Skripte, Shell), nicht sichtbarer Text.
- Der Modellwechsel innerhalb der Sitzung (Sonnet 5 → Opus 5 nach dem Usage-Limit/Login → Fable 5 per `/model`) schlägt sich vor allem im Preis je Cache-Read nieder: derselbe Kontext kostet auf Fable 5 fünfmal so viel wie auf Sonnet 5.
- Nicht enthalten: Kosten des Prompt-Cachings beim Anbieter selbst, etwaige Rabatte oder Abonnement-Konditionen. Die Zahlen gelten für Pay-as-you-go zu Listenpreisen.

## Werkzeugnutzung

| Tool | Aufrufe |
|---|---:|
| Bash | 515 |
| Edit | 152 |
| Read | 76 |
| WebFetch | 23 |
| Write | 22 |
| WebSearch | 20 |
| Skill | 3 |
| ToolSearch | 3 |
| AskUserQuestion | 2 |
| CronCreate | 2 |
| ListAgents | 1 |
| SendUserFile | 1 |
| CronDelete | 1 |
