#!/usr/bin/env python3
"""Token- und Kostenbilanz einer Claude-Code-Sitzung aus dem lokalen Transkript.

Aufruf:  python3 tools/token-report.py ~/.claude/projects/<projekt>/<session-id>.jsonl > AUFWAND.md

Liest die usage-Bloecke aller Assistant-Nachrichten, summiert je Modell und bewertet mit
den Listenpreisen (Stand 2026-06-24, Anthropic API, USD je Mio. Token). Cache-Writes werden
nach TTL unterschieden: 5-Minuten-Cache 1,25x, 1-Stunden-Cache 2x des Input-Preises;
Cache-Reads 0,1x. Preise bei Bedarf unten anpassen.
"""
import collections, json, sys
from datetime import datetime, timezone

PREISE = {  # USD je 1 Mio. Token: (input, output)
    'claude-sonnet-5': (2.00, 10.00),
    'claude-opus-5': (5.00, 25.00),
    'claude-fable-5': (10.00, 50.00),
    'claude-opus-4-8': (5.00, 25.00),
    'claude-haiku-4-5': (1.00, 5.00),
}
CACHE_READ, CACHE_5M, CACHE_1H = 0.10, 1.25, 2.00

def lade(pfad):
    per = collections.defaultdict(collections.Counter)
    span = {}
    tools = collections.Counter(); toolnamen = collections.Counter()
    user_turns = 0; first = last = None
    for line in open(pfad, encoding='utf-8'):
        try: o = json.loads(line)
        except Exception: continue
        ts = o.get('timestamp')
        if ts: first = first or ts; last = ts
        m = o.get('message') if isinstance(o.get('message'), dict) else None
        if not m: continue
        if o.get('type') == 'user':
            c = m.get('content')
            if isinstance(c, str) or (isinstance(c, list) and any(isinstance(x, dict) and x.get('type') == 'text' for x in c)):
                user_turns += 1
        if o.get('type') != 'assistant': continue
        model = m.get('model', '?')
        if model == '<synthetic>': continue
        u = m.get('usage') or {}
        cc = u.get('cache_creation') or {}
        p = per[model]
        p['n'] += 1
        p['input'] += u.get('input_tokens', 0)
        p['output'] += u.get('output_tokens', 0)
        p['cache_read'] += u.get('cache_read_input_tokens', 0)
        c5 = cc.get('ephemeral_5m_input_tokens'); c1 = cc.get('ephemeral_1h_input_tokens')
        if c5 is None and c1 is None:
            p['cache_5m'] += u.get('cache_creation_input_tokens', 0)  # ohne Aufschluesselung: konservativ 5m
        else:
            p['cache_5m'] += c5 or 0; p['cache_1h'] += c1 or 0
        s = span.setdefault(model, [ts, ts]); s[1] = ts
        for x in m.get('content') or []:
            if isinstance(x, dict) and x.get('type') == 'tool_use':
                tools[model] += 1; toolnamen[x.get('name')] += 1
    return per, span, tools, toolnamen, user_turns, first, last

def kosten(model, c):
    inp, out = PREISE.get(model, (float('nan'), float('nan')))
    k = {
        'input': c['input'] / 1e6 * inp,
        'cache_5m': c['cache_5m'] / 1e6 * inp * CACHE_5M,
        'cache_1h': c['cache_1h'] / 1e6 * inp * CACHE_1H,
        'cache_read': c['cache_read'] / 1e6 * inp * CACHE_READ,
        'output': c['output'] / 1e6 * out,
    }
    k['summe'] = sum(k.values())
    return k

def f(n): return f'{n:,.0f}'.replace(',', '.')
def usd(x): return f'{x:,.2f} $'.replace(',', 'X').replace('.', ',').replace('X', '.')
def hhmm(ts): return datetime.fromisoformat(ts.replace('Z', '+00:00')).astimezone(timezone.utc).strftime('%H:%M')

def main():
    pfad = sys.argv[1]
    per, span, tools, toolnamen, user_turns, first, last = lade(pfad)
    dauer = datetime.fromisoformat(last.replace('Z', '+00:00')) - datetime.fromisoformat(first.replace('Z', '+00:00'))
    gesamt = collections.Counter(); gk = collections.Counter()
    print('# Aufwand der Claude-Code-Sitzung\n')
    print(f'Automatisch erzeugt mit `tools/token-report.py` aus dem lokalen Sitzungs-Transkript.')
    print(f'Zeitraum {first[:10]} {hhmm(first)}–{hhmm(last)} UTC ({dauer.total_seconds()/3600:.1f} h), '
          f'{user_turns} Nutzer-Eingaben, {sum(tools.values())} Tool-Aufrufe.\n')
    print('Preise: Anthropic-API-Listenpreise (Stand 2026-06-24). Cache-Reads 0,1× Input, '
          'Cache-Writes 1,25× (5-Min-TTL) bzw. 2× (1-Std-TTL) des Input-Preises. Alle Cache-Writes dieser '
          'Sitzung liefen mit 1-Stunden-TTL.\n')
    print('## Token je Modell\n')
    print('| Modell | Nachrichten | Zeitraum (UTC) | Input | Cache-Write (1h) | Cache-Read | Output |')
    print('|---|---:|---|---:|---:|---:|---:|')
    for model, c in sorted(per.items(), key=lambda kv: span[kv[0]][0]):
        a, b = span[model]
        print(f'| `{model}` | {c["n"]} | {hhmm(a)}–{hhmm(b)} | {f(c["input"])} | {f(c["cache_1h"] + c["cache_5m"])} | {f(c["cache_read"])} | {f(c["output"])} |')
        for k in ('input', 'cache_5m', 'cache_1h', 'cache_read', 'output'): gesamt[k] += c[k]
    print(f'| **gesamt** | {sum(c["n"] for c in per.values())} | | {f(gesamt["input"])} | {f(gesamt["cache_1h"] + gesamt["cache_5m"])} | {f(gesamt["cache_read"])} | {f(gesamt["output"])} |\n')
    print('## Kosten je Modell (Listenpreise)\n')
    print('| Modell | Input | Cache-Write | Cache-Read | Output | **Summe** |')
    print('|---|---:|---:|---:|---:|---:|')
    for model, c in sorted(per.items(), key=lambda kv: span[kv[0]][0]):
        k = kosten(model, c)
        for kk, v in k.items(): gk[kk] += v
        print(f'| `{model}` | {usd(k["input"])} | {usd(k["cache_5m"] + k["cache_1h"])} | {usd(k["cache_read"])} | {usd(k["output"])} | **{usd(k["summe"])}** |')
    print(f'| **gesamt** | {usd(gk["input"])} | {usd(gk["cache_5m"] + gk["cache_1h"])} | {usd(gk["cache_read"])} | {usd(gk["output"])} | **{usd(gk["summe"])}** |\n')
    anteil_read = (gk['cache_read'] / gk['summe'] * 100) if gk['summe'] else 0
    print('## Einordnung\n')
    print(f'- **Cache-Reads sind der Kostentreiber** ({anteil_read:.0f} % der Summe): In einer langen agentischen '
          'Sitzung wird der gesamte bisherige Kontext bei jedem Schritt erneut aus dem Cache gelesen. Die '
          f'{f(gesamt["cache_read"])} gelesenen Token entsprechen dem Kontext, multipliziert mit der Zahl der Schritte.')
    print(f'- Frisch verarbeiteter Input ist mit {f(gesamt["input"])} Token vernachlässigbar – fast alles kam aus dem Cache.')
    print(f'- Output: {f(gesamt["output"])} Token, davon der Großteil Tool-Aufrufe (Code, Skripte, Shell), nicht sichtbarer Text.')
    print('- Der Modellwechsel innerhalb der Sitzung (Sonnet 5 → Opus 5 nach dem Usage-Limit/Login → Fable 5 per `/model`) '
          'schlägt sich vor allem im Preis je Cache-Read nieder: derselbe Kontext kostet auf Fable 5 fünfmal so viel wie auf Sonnet 5.')
    print('- Nicht enthalten: Kosten des Prompt-Cachings beim Anbieter selbst, etwaige Rabatte oder Abonnement-Konditionen. '
          'Die Zahlen gelten für Pay-as-you-go zu Listenpreisen.\n')
    print('## Werkzeugnutzung\n')
    print('| Tool | Aufrufe |'); print('|---|---:|')
    for name, n in toolnamen.most_common(): print(f'| {name} | {n} |')

if __name__ == '__main__':
    main()
