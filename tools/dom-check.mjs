#!/usr/bin/env node
// End-to-End-Rauchtest fuer app.js ohne Browser.
//
// `node --check` prueft nur die Syntax. Drei Fehler dieser Codebasis waren syntaktisch
// korrekt und erst beim Laden sichtbar: eine Variable ausserhalb ihrer Arrow-Function,
// ein kaputt gequoteter Template-String, ein getElementById auf eine im HTML fehlende ID.
// Dieses Skript laedt app.js gegen ein minimales DOM-Shim, fuettert ein Referenzszenario,
// schaltet zwischen ASVG und GSVG um und oeffnet jedes Info-Popup. Es endet mit Exit-Code 1,
// sobald etwas wirft, leer bleibt oder Artefakte wie "${" oder "NaN" im Text stehen.
//
// Aufruf aus dem Repo-Wurzelverzeichnis:  node tools/dom-check.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let fehler = 0;
const fail = (msg) => { fehler += 1; console.error('  FEHLER:', msg); };
const ok = (msg) => console.log('  ok    ', msg);

// ---------- DOM-Shim ----------
class El {
  constructor(id) {
    this.id = id; this.value = ''; this.checked = false; this.textContent = ''; this.innerHTML = '';
    this.hidden = false; this.min = ''; this.max = ''; this.step = ''; this.dataset = {}; this.className = '';
    this.childNodes = [{ nodeValue: '' }];
    this.classList = { _s: new Set(), add(...a) { a.forEach((x) => this._s.add(x)); }, remove(...a) { a.forEach((x) => this._s.delete(x)); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } };
    this._listeners = {};
  }
  addEventListener(t, f) { (this._listeners[t] ||= []).push(f); }
  closest() { return new El('closest-stub'); }
  append() {}
  showModal() {}
  close() {}
  get style() { return {}; }
}
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dup.length) fail(`doppelte IDs im HTML: ${dup.join(', ')}`); else ok(`${ids.length} eindeutige IDs im HTML`);

const store = new Map(ids.map((id) => [id, new El(id)]));
const infoButtons = [...html.matchAll(/data-info="([^"]+)"/g)].map((m) => { const b = new El('info'); b.dataset.info = m[1]; return b; });

globalThis.document = {
  getElementById: (id) => { if (!store.has(id)) throw new Error(`getElementById('${id}') – ID fehlt im HTML`); return store.get(id); },
  querySelectorAll: (sel) => (sel === '.info-icon' ? infoButtons : []),
  createElement: () => new El('created'),
};
globalThis.window = {
  location: { search: '', pathname: '/' },
  localStorage: { getItem: () => null, setItem: () => {} },
  history: { replaceState: () => {} },
  alert: () => {},
};

// ---------- app.js laden ----------
try {
  await import(path.join(root, 'app.js'));
  ok('app.js geladen und initialisiert');
} catch (e) {
  fail(`app.js wirft beim Laden: ${e.message}`);
  process.exit(1);
}

const set = (id, v) => { store.get(id).value = String(v); };
const chk = (id, v) => { store.get(id).checked = v; };
const form = store.get('form');
const feuere = () => form._listeners.input.forEach((f) => f({ target: { id: 'dom-check' } }));

// Referenzszenario aus der Spec (geb. 24.2.1983, Konto 22.812, 203 VM, Gehalt ueber HBGl)
set('geburtsdatum', '1983-02-24'); set('geschlecht', 'mann'); set('konto', 22812);
set('kontoStichtag', '2026-01-01'); set('vmStart', 203); set('gehalt', 9000); set('versicherungsart', 'asvg');
set('nkMaxMonate', 108); set('lebenshaltung', 2000); set('ausstiegsalter', 65); set('antrittsalter', 65);
set('nachkaufMonate', 0); set('nachkaufJahre', 5); chk('wvAn', false); set('gfEinkommen', 0); set('reduktionProzent', 20);
chk('vergleichAn', true); set('lebenshaltungB', 2000); set('ausstiegsalterB', 60); set('antrittsalterB', 63);
set('nachkaufMonateB', 59); set('nachkaufJahreB', 5); chk('wvAnB', false); set('gfEinkommenB', 600); set('reduktionProzentB', 20);
feuere();

const text = (id) => store.get(id).textContent;
const artefakte = /\$\{|NaN|undefined|' \+ '|\+ '/;
const pruefeAusgabe = (id, erwartetNichtLeer = true) => {
  const t = text(id);
  if (erwartetNichtLeer && (!t || t === '–')) fail(`${id} ist leer`);
  else if (artefakte.test(t)) fail(`${id} enthaelt Artefakt: ${t.slice(0, 80)}`);
};

// Kennzahlen A/B muessen gefuellt und artefaktfrei sein
for (const s of ['A', 'B']) {
  for (const p of ['cardBrutto', 'cardNetto', 'cardKapital', 'dVm', 'dGutschrift', 'dRegelalter']) pruefeAusgabe(`${p}${s}`);
}
// Spec-Akzeptanz: Antritt 65 -> brutto ~4.364, netto ~3.174
const bruttoA = Number(text('cardBruttoA').replace(/[^\d]/g, ''));
const nettoA = Number(text('cardNettoA').replace(/[^\d]/g, ''));
if (Math.abs(bruttoA - 4364) > 20) fail(`brutto A = ${bruttoA}, erwartet 4.364 ±20`); else ok(`brutto A = ${bruttoA} (Spec: 4.364 ±20)`);
if (Math.abs(nettoA - 3174) > 50) fail(`netto A = ${nettoA}, erwartet 3.174 ±50`); else ok(`netto A = ${nettoA} (Spec: 3.174 ±50)`);
// Szenario B: Korridor mit Nachkauf -> gelb
if (!store.get('statuslineB').className.includes('gelb')) fail(`Status B sollte gelb sein, ist "${store.get('statuslineB').className}"`); else ok('Status B gelb (Anspruch durch Nachkauf)');
// Vergleich sichtbar und Break-even-Text vorhanden
if (store.get('vergleichBox').hidden) fail('Vergleichs-Kachel ist versteckt'); else pruefeAusgabe('breakEvenText');

// Chart gefuellt
if (!store.get('chart').innerHTML && !store.get('chart').append) fail('Chart leer');

// Jeden Info-Text fuer beide Versicherungsarten oeffnen
for (const art of ['asvg', 'gsvg']) {
  set('versicherungsart', art); set('gehalt', art === 'gsvg' ? 52290 : 9000); feuere();
  const label = store.get('gehaltLabel').childNodes[0].nodeValue;
  if (!label.trim()) fail(`Gehalt-Label leer (${art})`);
  for (const b of infoButtons) {
    try {
      b._listeners.click[0]();
      const t = store.get('infoDialogText').innerHTML.replace(/<[^>]+>/g, ' ');
      if (t.trim().length < 40) fail(`Info "${b.dataset.info}" (${art}) ist zu kurz oder leer`);
      else if (artefakte.test(t)) fail(`Info "${b.dataset.info}" (${art}) enthaelt Artefakt: ${t.match(artefakte)[0]}`);
    } catch (e) {
      fail(`Info "${b.dataset.info}" (${art}) wirft: ${e.message}`);
    }
  }
  ok(`${infoButtons.length} Info-Popups fuer ${art.toUpperCase()} gerendert`);
  pruefeAusgabe('gfSkala', false);
}

// Uebergangsjahrgang: Korridor-Status muss die jahrgangseigenen Werte nennen
set('versicherungsart', 'asvg'); set('gehalt', 4000); set('konto', 30000); set('vmStart', 470);
set('geburtsdatum', '1964-05-15'); set('ausstiegsalter', 62); set('antrittsalter', 62); feuere();
if (!/62 Jahren 4 Monaten/.test(text('statuslineA'))) fail(`Korridor-Status Jahrgang 1964 unerwartet: ${text('statuslineA')}`);
else ok('Korridor-Uebergangsjahrgang 1964 korrekt beschriftet');

console.log(fehler ? `\n${fehler} Fehler` : '\nalles gruen');
process.exit(fehler ? 1 : 0);
