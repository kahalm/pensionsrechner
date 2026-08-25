import { CONST, berechnePensionsszenario, vergleichsdiagramm } from './pension.js';

const DEFAULTS = {
  geburtsdatum: '1983-02-24',
  konto: 22812,
  kontoStichtag: '2026-01-01',
  vmStart: 203,
  gehalt: 9000,
  lebenshaltung: 2000,
  ausstiegsalter: 60,
  antrittsalter: 63,
  nachkaufAn: true,
  nachkaufJahre: 5,
  wvAn: true,
};

// Kurze Query-Param-Schlüssel für teilbare Links.
const PARAM_KEYS = {
  geburtsdatum: 'gd',
  konto: 'k',
  kontoStichtag: 'ks',
  vmStart: 'vm',
  gehalt: 'g',
  lebenshaltung: 'lh',
  ausstiegsalter: 'aa',
  antrittsalter: 'pa',
  nachkaufAn: 'nk',
  nachkaufJahre: 'nj',
  wvAn: 'wv',
};

const BOOL_KEYS = new Set(['nachkaufAn', 'wvAn']);
const STORAGE_KEY = 'pensionsrechner:eingaben';

const eurFmt = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurFmt2 = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat('de-AT', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numFmt = new Intl.NumberFormat('de-AT');

function ladeEingaben() {
  const url = new URLSearchParams(window.location.search);
  let stored = {};
  try {
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    stored = {};
  }

  const eingaben = {};
  for (const [key, param] of Object.entries(PARAM_KEYS)) {
    if (url.has(param)) {
      const raw = url.get(param);
      eingaben[key] = BOOL_KEYS.has(key) ? raw === '1' : parseFeld(key, raw);
    } else if (stored[key] !== undefined) {
      eingaben[key] = stored[key];
    } else {
      eingaben[key] = DEFAULTS[key];
    }
  }
  return eingaben;
}

function parseFeld(key, raw) {
  if (key === 'geburtsdatum' || key === 'kontoStichtag') return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULTS[key];
}

function speichereEingaben(eingaben) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(eingaben));
  } catch {
    // localStorage evtl. nicht verfügbar (privater Modus) – Link-Teilen bleibt möglich.
  }
  const url = new URLSearchParams();
  for (const [key, param] of Object.entries(PARAM_KEYS)) {
    const val = eingaben[key];
    url.set(param, BOOL_KEYS.has(key) ? (val ? '1' : '0') : String(val));
  }
  const neueUrl = `${window.location.pathname}?${url.toString()}`;
  window.history.replaceState(null, '', neueUrl);
}

const els = {
  geburtsdatum: document.getElementById('geburtsdatum'),
  konto: document.getElementById('konto'),
  kontoStichtag: document.getElementById('kontoStichtag'),
  vmStart: document.getElementById('vmStart'),
  gehalt: document.getElementById('gehalt'),
  lebenshaltung: document.getElementById('lebenshaltung'),
  ausstiegsalter: document.getElementById('ausstiegsalter'),
  antrittsalter: document.getElementById('antrittsalter'),
  nachkaufAn: document.getElementById('nachkaufAn'),
  nachkaufJahre: document.getElementById('nachkaufJahre'),
  wvAn: document.getElementById('wvAn'),
};

const outs = {
  lebenshaltung: document.getElementById('lebenshaltungOut'),
  ausstiegsalter: document.getElementById('ausstiegsalterOut'),
  antrittsalter: document.getElementById('antrittsalterOut'),
  nachkaufJahre: document.getElementById('nachkaufJahreOut'),
};

let eingaben = ladeEingaben();

function eingabenInFormular() {
  els.geburtsdatum.value = eingaben.geburtsdatum;
  els.konto.value = eingaben.konto;
  els.kontoStichtag.value = eingaben.kontoStichtag;
  els.vmStart.value = eingaben.vmStart;
  els.gehalt.value = eingaben.gehalt;
  els.lebenshaltung.value = eingaben.lebenshaltung;
  els.ausstiegsalter.value = eingaben.ausstiegsalter;
  els.antrittsalter.min = eingaben.ausstiegsalter;
  els.antrittsalter.value = eingaben.antrittsalter;
  els.nachkaufAn.checked = eingaben.nachkaufAn;
  els.nachkaufJahre.value = eingaben.nachkaufJahre;
  els.wvAn.checked = eingaben.wvAn;
  aktualisiereOutputs();
}

function aktualisiereOutputs() {
  outs.lebenshaltung.textContent = eurFmt.format(eingaben.lebenshaltung);
  outs.ausstiegsalter.textContent = eingaben.ausstiegsalter;
  outs.antrittsalter.textContent = eingaben.antrittsalter;
  outs.nachkaufJahre.textContent = eingaben.nachkaufJahre;
  document.getElementById('nachkaufJahreField').classList.toggle('disabled', !eingaben.nachkaufAn);
}

function ausFormularLesen() {
  eingaben = {
    geburtsdatum: els.geburtsdatum.value || DEFAULTS.geburtsdatum,
    konto: Number(els.konto.value) || 0,
    kontoStichtag: els.kontoStichtag.value || DEFAULTS.kontoStichtag,
    vmStart: Number(els.vmStart.value) || 0,
    gehalt: Number(els.gehalt.value) || 0,
    lebenshaltung: Number(els.lebenshaltung.value),
    ausstiegsalter: Number(els.ausstiegsalter.value),
    antrittsalter: Math.max(Number(els.antrittsalter.value), Number(els.ausstiegsalter.value)),
    nachkaufAn: els.nachkaufAn.checked,
    nachkaufJahre: Number(els.nachkaufJahre.value),
    wvAn: els.wvAn.checked,
  };
}

function neuBerechnenUndRendern() {
  ausFormularLesen();
  els.antrittsalter.min = eingaben.ausstiegsalter;
  if (Number(els.antrittsalter.value) < eingaben.ausstiegsalter) {
    els.antrittsalter.value = eingaben.ausstiegsalter;
  }
  aktualisiereOutputs();
  speichereEingaben(eingaben);

  const ergebnis = berechnePensionsszenario(eingaben);
  rendereStatus(ergebnis);
  rendereKarten(ergebnis);
  rendereNachkauf(ergebnis);
  rendereDetails(ergebnis);
  rendereChart(eingaben);
}

const STATUS_TEXT = {
  ZU_FRUEH: () => `Vor Alter ${CONST.KORRIDOR_ALTER} besteht kein Anspruch auf Korridorpension.`,
  ZU_WENIG_MONATE: (r) => `Es fehlen noch ${r.fehlendeMonate} Versicherungsmonate für die Korridorpension (mind. ${CONST.KORRIDOR_MONATE} Monate nötig).`,
};

function rendereStatus(ergebnis) {
  const el = document.getElementById('statusline');
  el.className = `statusline ${ergebnis.ampel}`;
  if (!ergebnis.ok) {
    el.textContent = STATUS_TEXT[ergebnis.fehlercode](ergebnis);
    return;
  }
  if (ergebnis.ampel === 'gelb') {
    el.textContent = `Anspruch nur durch Nachkauf von ${ergebnis.monate.nkMonate} Monaten erreicht.`;
  } else if (eingaben.antrittsalter < CONST.REGELPENSIONSALTER) {
    el.textContent = `Korridorpension möglich. Am Stichtag darf kein Erwerbseinkommen über der Geringfügigkeitsgrenze (${eurFmt2.format(CONST.GERINGFUEGIGKEIT)}/Monat) bezogen werden.`;
  } else {
    el.textContent = 'Alterspension – Anspruch erfüllt.';
  }
}

function rendereKarten(ergebnis) {
  const brutto = document.getElementById('cardBrutto');
  const netto = document.getElementById('cardNetto');
  const diff = document.getElementById('cardDifferenz');
  const kapital = document.getElementById('cardKapital');

  brutto.textContent = ergebnis.ok ? eurFmt.format(ergebnis.bruttoMonat) : '–';
  netto.textContent = ergebnis.ok ? eurFmt.format(ergebnis.nettoMonat) : '–';

  diff.classList.remove('positive', 'negative');
  if (ergebnis.ok) {
    const differenz = ergebnis.nettoMonat - eingaben.lebenshaltung;
    diff.textContent = `${differenz >= 0 ? '+' : ''}${eurFmt.format(differenz)}`;
    diff.classList.add(differenz >= 0 ? 'positive' : 'negative');
  } else {
    diff.textContent = '–';
  }

  kapital.textContent = eurFmt.format(ergebnis.kapital.kapitalPuffer);
}

function rendereNachkauf(ergebnis) {
  const box = document.getElementById('nachkaufBox');
  if (!eingaben.nachkaufAn || ergebnis.monate.nkMonate <= 0) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  document.getElementById('nkMonate').textContent = numFmt.format(ergebnis.monate.nkMonate);
  document.getElementById('nkKostenVoll').textContent = eurFmt.format(ergebnis.nachkauf.kostenVoll);
  document.getElementById('nkErsparnis').textContent = eurFmt.format(ergebnis.nachkauf.ersparnis);
  document.getElementById('nkKostenNetto').textContent = eurFmt.format(ergebnis.nachkauf.kostenNetto);
  document.getElementById('nkEffSatz').textContent = pctFmt.format(ergebnis.nachkauf.effSatz);
  document.getElementById('nkRate').textContent = eurFmt.format(ergebnis.nachkauf.ratePerJahr);
}

function rendereDetails(ergebnis) {
  document.getElementById('dVm').textContent = `${numFmt.format(ergebnis.monate.vm)} Monate`;
  document.getElementById('dNk').textContent = `${numFmt.format(ergebnis.monate.nkMonate)} Monate`;
  document.getElementById('dGutschrift').textContent = eurFmt.format(ergebnis.gutschrift);
  document.getElementById('dAbschlagZuschlag').textContent = ergebnis.ok
    ? (ergebnis.abschlag > 0 ? `- ${pctFmt.format(ergebnis.abschlag)}` : `+ ${pctFmt.format(ergebnis.zuschlag)}`)
    : '–';
  document.getElementById('dSvJahr').textContent = eurFmt.format(ergebnis.kapital.svJahr);
  document.getElementById('dKapitalPuffer').textContent = eurFmt.format(ergebnis.kapital.kapitalPuffer);
}

function rendereChart(eingabenAktuell) {
  const chart = document.getElementById('chart');
  const daten = vergleichsdiagramm(eingabenAktuell);
  const max = Math.max(...daten.map((d) => d.bruttoMonat || 0), 1);
  chart.innerHTML = '';
  for (const d of daten) {
    const wrap = document.createElement('div');
    wrap.className = 'chart-bar-wrap';

    const value = document.createElement('div');
    value.className = 'chart-bar-value';
    value.textContent = d.ok ? eurFmt.format(d.bruttoMonat) : 'kein Anspruch';

    const bar = document.createElement('div');
    bar.className = `chart-bar${d.ok ? '' : ' disabled'}`;
    const hoehe = d.ok ? Math.max((d.bruttoMonat / max) * 130, 4) : 4;
    bar.style.height = `${hoehe}px`;

    const label = document.createElement('div');
    label.className = 'chart-bar-label';
    label.textContent = d.alter;

    wrap.append(value, bar, label);
    chart.append(wrap);
  }
}

document.getElementById('form').addEventListener('input', neuBerechnenUndRendern);
document.getElementById('footerJahr').textContent = CONST.JAHR;

eingabenInFormular();
neuBerechnenUndRendern();
