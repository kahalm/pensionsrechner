import {
  CONST, berechnePensionsszenario, vergleichsdiagramm, breakEvenPunkt, addMonths,
} from './pension.js';

// Persönliche/eingegebene Werte starten bewusst leer (kein Beispiel-Vorausfüllen) –
// nur was der Nutzer selbst einträgt, wird per localStorage/URL gemerkt.
const DEFAULTS = {
  geburtsdatum: '',
  geschlecht: '',
  konto: '',
  kontoStichtag: '',
  vmStart: '',
  gehalt: '',
  nkMaxMonate: CONST.NK_MAX_MONATE,
  lebenshaltung: 2000,
  ausstiegsalter: 60,
  antrittsalter: 63,
  nachkaufAn: true,
  nachkaufJahre: 5,
  wvAn: true,
  vergleichAn: false,
  lebenshaltungB: 2000,
  ausstiegsalterB: 65,
  antrittsalterB: 65,
  nachkaufAnB: false,
  nachkaufJahreB: 5,
  wvAnB: true,
};

const PFLICHTFELDER = ['geburtsdatum', 'geschlecht', 'kontoStichtag', 'konto', 'vmStart', 'gehalt'];
const NUMMER_FELDER = new Set(['konto', 'vmStart', 'gehalt']);

// Kurze Query-Param-Schlüssel für teilbare Links.
const PARAM_KEYS = {
  geburtsdatum: 'gd',
  geschlecht: 'gs',
  konto: 'k',
  kontoStichtag: 'ks',
  vmStart: 'vm',
  gehalt: 'g',
  nkMaxMonate: 'nkmax',
  lebenshaltung: 'lh',
  ausstiegsalter: 'aa',
  antrittsalter: 'pa',
  nachkaufAn: 'nk',
  nachkaufJahre: 'nj',
  wvAn: 'wv',
  vergleichAn: 'vgl',
  lebenshaltungB: 'lhB',
  ausstiegsalterB: 'aaB',
  antrittsalterB: 'paB',
  nachkaufAnB: 'nkB',
  nachkaufJahreB: 'njB',
  wvAnB: 'wvB',
};

const BOOL_KEYS = new Set(['nachkaufAn', 'wvAn', 'vergleichAn', 'nachkaufAnB', 'wvAnB']);
const STORAGE_KEY = 'pensionsrechner:eingaben';

const eurFmt = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurFmt2 = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat('de-AT', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numFmt = new Intl.NumberFormat('de-AT');
const dateFmt = new Intl.DateTimeFormat('de-AT');

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
  if (!NUMMER_FELDER.has(key)) return raw;
  if (raw === '') return '';
  const n = Number(raw);
  return Number.isFinite(n) ? n : '';
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
  geschlecht: document.getElementById('geschlecht'),
  konto: document.getElementById('konto'),
  kontoStichtag: document.getElementById('kontoStichtag'),
  vmStart: document.getElementById('vmStart'),
  gehalt: document.getElementById('gehalt'),
  nkMaxMonate: document.getElementById('nkMaxMonate'),
  lebenshaltung: document.getElementById('lebenshaltung'),
  ausstiegsalter: document.getElementById('ausstiegsalter'),
  antrittsalter: document.getElementById('antrittsalter'),
  nachkaufAn: document.getElementById('nachkaufAn'),
  nachkaufJahre: document.getElementById('nachkaufJahre'),
  wvAn: document.getElementById('wvAn'),
  vergleichAn: document.getElementById('vergleichAn'),
  lebenshaltungB: document.getElementById('lebenshaltungB'),
  ausstiegsalterB: document.getElementById('ausstiegsalterB'),
  antrittsalterB: document.getElementById('antrittsalterB'),
  nachkaufAnB: document.getElementById('nachkaufAnB'),
  nachkaufJahreB: document.getElementById('nachkaufJahreB'),
  wvAnB: document.getElementById('wvAnB'),
};

const outs = {
  lebenshaltung: document.getElementById('lebenshaltungOut'),
  ausstiegsalter: document.getElementById('ausstiegsalterOut'),
  antrittsalter: document.getElementById('antrittsalterOut'),
  nachkaufJahre: document.getElementById('nachkaufJahreOut'),
  lebenshaltungB: document.getElementById('lebenshaltungBOut'),
  ausstiegsalterB: document.getElementById('ausstiegsalterBOut'),
  antrittsalterB: document.getElementById('antrittsalterBOut'),
  nachkaufJahreB: document.getElementById('nachkaufJahreBOut'),
};

let eingaben = ladeEingaben();

function eingabenInFormular() {
  els.geburtsdatum.value = eingaben.geburtsdatum;
  els.geschlecht.value = eingaben.geschlecht;
  els.konto.value = eingaben.konto;
  els.kontoStichtag.value = eingaben.kontoStichtag;
  els.vmStart.value = eingaben.vmStart;
  els.gehalt.value = eingaben.gehalt;
  els.nkMaxMonate.value = eingaben.nkMaxMonate;
  els.lebenshaltung.value = eingaben.lebenshaltung;
  els.ausstiegsalter.value = eingaben.ausstiegsalter;
  els.antrittsalter.min = eingaben.ausstiegsalter;
  els.antrittsalter.value = eingaben.antrittsalter;
  els.nachkaufAn.checked = eingaben.nachkaufAn;
  els.nachkaufJahre.value = eingaben.nachkaufJahre;
  els.wvAn.checked = eingaben.wvAn;
  els.vergleichAn.checked = eingaben.vergleichAn;
  els.lebenshaltungB.value = eingaben.lebenshaltungB;
  els.ausstiegsalterB.value = eingaben.ausstiegsalterB;
  els.antrittsalterB.min = eingaben.ausstiegsalterB;
  els.antrittsalterB.value = eingaben.antrittsalterB;
  els.nachkaufAnB.checked = eingaben.nachkaufAnB;
  els.nachkaufJahreB.value = eingaben.nachkaufJahreB;
  els.wvAnB.checked = eingaben.wvAnB;
  aktualisiereOutputs();
}

function aktualisiereOutputs() {
  outs.lebenshaltung.textContent = eurFmt.format(eingaben.lebenshaltung);
  outs.ausstiegsalter.textContent = eingaben.ausstiegsalter;
  outs.antrittsalter.textContent = eingaben.antrittsalter;
  outs.nachkaufJahre.textContent = eingaben.nachkaufJahre;
  outs.lebenshaltungB.textContent = eurFmt.format(eingaben.lebenshaltungB);
  outs.ausstiegsalterB.textContent = eingaben.ausstiegsalterB;
  outs.antrittsalterB.textContent = eingaben.antrittsalterB;
  outs.nachkaufJahreB.textContent = eingaben.nachkaufJahreB;
  document.getElementById('nachkaufJahreField').classList.toggle('disabled', !eingaben.nachkaufAn);
  document.getElementById('nachkaufJahreBField').classList.toggle('disabled', !eingaben.nachkaufAnB);
  document.getElementById('szenarioBFieldset').hidden = !eingaben.vergleichAn;
  document.getElementById('uebernehmenButtonA').hidden = !eingaben.vergleichAn;
}

function leseZahlfeld(el) {
  return el.value === '' ? '' : Number(el.value);
}

function ausFormularLesen() {
  eingaben = {
    geburtsdatum: els.geburtsdatum.value,
    geschlecht: els.geschlecht.value,
    konto: leseZahlfeld(els.konto),
    kontoStichtag: els.kontoStichtag.value,
    vmStart: leseZahlfeld(els.vmStart),
    gehalt: leseZahlfeld(els.gehalt),
    nkMaxMonate: Number(els.nkMaxMonate.value),
    lebenshaltung: Number(els.lebenshaltung.value),
    ausstiegsalter: Number(els.ausstiegsalter.value),
    antrittsalter: Math.max(Number(els.antrittsalter.value), Number(els.ausstiegsalter.value)),
    nachkaufAn: els.nachkaufAn.checked,
    nachkaufJahre: Number(els.nachkaufJahre.value),
    wvAn: els.wvAn.checked,
    vergleichAn: els.vergleichAn.checked,
    lebenshaltungB: Number(els.lebenshaltungB.value),
    ausstiegsalterB: Number(els.ausstiegsalterB.value),
    antrittsalterB: Math.max(Number(els.antrittsalterB.value), Number(els.ausstiegsalterB.value)),
    nachkaufAnB: els.nachkaufAnB.checked,
    nachkaufJahreB: Number(els.nachkaufJahreB.value),
    wvAnB: els.wvAnB.checked,
  };
}

function eingabenVollstaendig(e) {
  return PFLICHTFELDER.every((feld) => e[feld] !== '' && e[feld] !== null);
}

function neuBerechnenUndRendern() {
  ausFormularLesen();
  els.antrittsalter.min = eingaben.ausstiegsalter;
  if (Number(els.antrittsalter.value) < eingaben.ausstiegsalter) {
    els.antrittsalter.value = eingaben.ausstiegsalter;
  }
  els.antrittsalterB.min = eingaben.ausstiegsalterB;
  if (Number(els.antrittsalterB.value) < eingaben.ausstiegsalterB) {
    els.antrittsalterB.value = eingaben.ausstiegsalterB;
  }
  aktualisiereOutputs();
  speichereEingaben(eingaben);

  if (!eingabenVollstaendig(eingaben)) {
    rendereLeerZustand();
    return;
  }

  const ergebnisA = berechnePensionsszenario(eingaben);
  rendereScenario('A', ergebnisA, eingaben.lebenshaltung, eingaben.nachkaufAn);
  rendereChart(eingaben);

  document.getElementById('ergebnisBoxB').hidden = !eingaben.vergleichAn;

  if (eingaben.vergleichAn) {
    const eingabenB = {
      ...eingaben,
      lebenshaltung: eingaben.lebenshaltungB,
      ausstiegsalter: eingaben.ausstiegsalterB,
      antrittsalter: eingaben.antrittsalterB,
      nachkaufAn: eingaben.nachkaufAnB,
      nachkaufJahre: eingaben.nachkaufJahreB,
      wvAn: eingaben.wvAnB,
    };
    const ergebnisB = berechnePensionsszenario(eingabenB);
    rendereScenario('B', ergebnisB, eingabenB.lebenshaltung, eingabenB.nachkaufAn);
    rendereVergleich(ergebnisA, ergebnisB, eingaben.geburtsdatum);
  } else {
    document.getElementById('vergleichBox').hidden = true;
  }
}

function rendereLeerZustand() {
  const statusA = document.getElementById('statuslineA');
  statusA.className = 'statusline neutral';
  statusA.textContent = 'Bitte Geburtsdatum, Geschlecht, Pensionskonto-Gutschrift, Gutschrift-Stichtag, Versicherungsmonate und Gehalt ausfüllen.';
  document.getElementById('statuslineB').className = 'statusline neutral';
  document.getElementById('statuslineB').textContent = '';

  for (const suffix of ['A', 'B']) {
    zelle(`cardBrutto${suffix}`, '–');
    zelle(`cardNetto${suffix}`, '–');
    const diff = document.getElementById(`cardDifferenz${suffix}`);
    diff.textContent = '–';
    diff.classList.remove('positive', 'negative');
    zelle(`cardKapital${suffix}`, '–');
    document.getElementById(`nachkaufBox${suffix}`).hidden = true;
    ['dVm', 'dNk', 'dGutschrift', 'dRegelalter', 'dAbschlagZuschlag', 'dSvJahr', 'dKapitalPuffer'].forEach((praefix) => {
      zelle(`${praefix}${suffix}`, '–');
    });
  }
  document.getElementById('ergebnisBoxB').hidden = true;
  document.getElementById('vergleichBox').hidden = true;
  document.getElementById('chart').innerHTML = '';
}

const STATUS_TEXT = {
  ZU_FRUEH: () => `Vor Alter ${CONST.KORRIDOR_ALTER} besteht kein Anspruch auf Korridorpension.`,
  ZU_WENIG_MONATE: (r) => `Es fehlen noch ${r.fehlendeMonate} Versicherungsmonate für die Korridorpension (mind. ${CONST.KORRIDOR_MONATE} Monate nötig).`,
};

function rendereStatus(suffix, ergebnis) {
  const el = document.getElementById(`statusline${suffix}`);
  el.className = `statusline ${ergebnis.ampel}`;
  if (!ergebnis.ok) {
    el.textContent = STATUS_TEXT[ergebnis.fehlercode](ergebnis);
    return;
  }
  const regelalterText = numFmt.format(ergebnis.regelalter);
  if (ergebnis.ampel === 'gelb') {
    el.textContent = `Anspruch nur durch Nachkauf von ${ergebnis.monate.nkMonate} Monaten erreicht.`;
  } else if (ergebnis.eingaben.antrittsalter < ergebnis.regelalter) {
    el.textContent = `Korridorpension möglich (Regelpensionsalter ${regelalterText}). Am Stichtag darf kein Erwerbseinkommen über der Geringfügigkeitsgrenze (${eurFmt2.format(CONST.GERINGFUEGIGKEIT)}/Monat) bezogen werden.`;
  } else {
    el.textContent = `Alterspension (Regelpensionsalter ${regelalterText}) – Anspruch erfüllt.`;
  }
}

function zelle(id, text) {
  document.getElementById(id).textContent = text;
}

function rendereKarten(suffix, ergebnis, lebenshaltung) {
  zelle(`cardBrutto${suffix}`, ergebnis.ok ? eurFmt.format(ergebnis.bruttoMonat) : '–');
  zelle(`cardNetto${suffix}`, ergebnis.ok ? eurFmt.format(ergebnis.nettoMonat) : '–');

  const diff = document.getElementById(`cardDifferenz${suffix}`);
  diff.classList.remove('positive', 'negative');
  if (ergebnis.ok) {
    const differenz = ergebnis.nettoMonat - lebenshaltung;
    diff.textContent = `${differenz >= 0 ? '+' : ''}${eurFmt.format(differenz)}`;
    diff.classList.add(differenz >= 0 ? 'positive' : 'negative');
  } else {
    diff.textContent = '–';
  }

  zelle(`cardKapital${suffix}`, eurFmt.format(ergebnis.kapital.kapitalPuffer));
}

function rendereNachkauf(suffix, ergebnis, nachkaufAn) {
  const box = document.getElementById(`nachkaufBox${suffix}`);
  if (!nachkaufAn || ergebnis.monate.nkMonate <= 0) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  zelle(`nkMonate${suffix}`, numFmt.format(ergebnis.monate.nkMonate));
  zelle(`nkKostenVoll${suffix}`, eurFmt.format(ergebnis.nachkauf.kostenVoll));
  zelle(`nkErsparnis${suffix}`, eurFmt.format(ergebnis.nachkauf.ersparnis));
  zelle(`nkKostenNetto${suffix}`, eurFmt.format(ergebnis.nachkauf.kostenNetto));
  zelle(`nkEffSatz${suffix}`, pctFmt.format(ergebnis.nachkauf.effSatz));
  zelle(`nkRate${suffix}`, eurFmt.format(ergebnis.nachkauf.ratePerJahr));
}

function rendereDetails(suffix, ergebnis) {
  zelle(`dVm${suffix}`, `${numFmt.format(ergebnis.monate.vm)} Monate`);
  zelle(`dNk${suffix}`, `${numFmt.format(ergebnis.monate.nkMonate)} Monate`);
  zelle(`dGutschrift${suffix}`, eurFmt.format(ergebnis.gutschrift));
  zelle(`dRegelalter${suffix}`, numFmt.format(ergebnis.regelalter));
  zelle(`dAbschlagZuschlag${suffix}`, ergebnis.ok
    ? (ergebnis.abschlag > 0 ? `- ${pctFmt.format(ergebnis.abschlag)}` : `+ ${pctFmt.format(ergebnis.zuschlag)}`)
    : '–');
  zelle(`dSvJahr${suffix}`, eurFmt.format(ergebnis.kapital.svJahr));
  zelle(`dKapitalPuffer${suffix}`, eurFmt.format(ergebnis.kapital.kapitalPuffer));
}

function rendereScenario(suffix, ergebnis, lebenshaltung, nachkaufAn) {
  rendereStatus(suffix, ergebnis);
  rendereKarten(suffix, ergebnis, lebenshaltung);
  rendereNachkauf(suffix, ergebnis, nachkaufAn);
  rendereDetails(suffix, ergebnis);
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

function diffZelle(id, a, b, fmt) {
  const d = a - b;
  const el = document.getElementById(id);
  el.textContent = `${d >= 0 ? '+' : ''}${fmt.format(d)}`;
  el.classList.remove('positive', 'negative');
  if (d !== 0) el.classList.add(d > 0 ? 'positive' : 'negative');
}

function rendereVergleich(ergebnisA, ergebnisB, geburtsdatum) {
  const box = document.getElementById('vergleichBox');
  box.hidden = false;

  const antrittText = (r) => (r.ok ? `${dateFmt.format(r.monate.stichtagPension)} (Alter ${r.eingaben.antrittsalter})` : 'kein Anspruch');
  zelle('vAntrittA', antrittText(ergebnisA));
  zelle('vAntrittB', antrittText(ergebnisB));

  const gesamtA = ergebnisA.kapital.kapitalPuffer + ergebnisA.nachkauf.kostenNetto;
  const gesamtB = ergebnisB.kapital.kapitalPuffer + ergebnisB.nachkauf.kostenNetto;

  zelle('vKapitalA', eurFmt.format(ergebnisA.kapital.kapitalPuffer));
  zelle('vKapitalB', eurFmt.format(ergebnisB.kapital.kapitalPuffer));
  diffZelle('vKapitalDiff', ergebnisA.kapital.kapitalPuffer, ergebnisB.kapital.kapitalPuffer, eurFmt);

  zelle('vNachkaufA', eurFmt.format(ergebnisA.nachkauf.kostenNetto));
  zelle('vNachkaufB', eurFmt.format(ergebnisB.nachkauf.kostenNetto));
  diffZelle('vNachkaufDiff', ergebnisA.nachkauf.kostenNetto, ergebnisB.nachkauf.kostenNetto, eurFmt);

  zelle('vGesamtA', eurFmt.format(gesamtA));
  zelle('vGesamtB', eurFmt.format(gesamtB));
  diffZelle('vGesamtDiff', gesamtA, gesamtB, eurFmt);

  if (ergebnisA.ok) zelle('vBruttoA', eurFmt.format(ergebnisA.bruttoMonat)); else zelle('vBruttoA', 'kein Anspruch');
  if (ergebnisB.ok) zelle('vBruttoB', eurFmt.format(ergebnisB.bruttoMonat)); else zelle('vBruttoB', 'kein Anspruch');
  if (ergebnisA.ok && ergebnisB.ok) diffZelle('vBruttoDiff', ergebnisA.bruttoMonat, ergebnisB.bruttoMonat, eurFmt);
  else zelle('vBruttoDiff', '–');

  if (ergebnisA.ok) zelle('vNettoA', eurFmt.format(ergebnisA.nettoMonat)); else zelle('vNettoA', 'kein Anspruch');
  if (ergebnisB.ok) zelle('vNettoB', eurFmt.format(ergebnisB.nettoMonat)); else zelle('vNettoB', 'kein Anspruch');
  if (ergebnisA.ok && ergebnisB.ok) diffZelle('vNettoDiff', ergebnisA.nettoMonat, ergebnisB.nettoMonat, eurFmt);
  else zelle('vNettoDiff', '–');

  const text = document.getElementById('breakEvenText');
  if (!ergebnisA.ok || !ergebnisB.ok) {
    text.textContent = 'Break-even nicht berechenbar: mindestens ein Szenario hat keinen Anspruch.';
  } else {
    const be = breakEvenPunkt({ geburtsdatum, ergebnisA, ergebnisB });
    if (be.gefunden) {
      const datum = addMonths(geburtsdatum, be.alterMonate);
      const jahre = Math.floor(be.alterMonate / 12);
      const monate = be.alterMonate % 12;
      text.textContent = `Break-even: mit Alter ${jahre} Jahre${monate ? ` ${monate} Monate` : ''} (${dateFmt.format(datum)}) gleichen sich die kumulierten Kosten/Pensionen beider Szenarien aus.`;
    } else if (be.dominanz === 'gleich') {
      text.textContent = 'Beide Szenarien liegen im Betrachtungszeitraum kumuliert gleichauf.';
    } else {
      const besser = be.dominanz === 'A' ? 'Szenario A' : 'Szenario B';
      text.textContent = `Kein Ausgleich im Betrachtungszeitraum (nächste 40 Jahre nach dem späteren Antritt): ${besser} bleibt durchgehend wirtschaftlich vorteilhafter.`;
    }
  }
}

document.getElementById('uebernehmenButtonB').addEventListener('click', () => {
  els.lebenshaltungB.value = els.lebenshaltung.value;
  els.ausstiegsalterB.value = els.ausstiegsalter.value;
  els.antrittsalterB.min = els.ausstiegsalter.value;
  els.antrittsalterB.value = els.antrittsalter.value;
  els.nachkaufAnB.checked = els.nachkaufAn.checked;
  els.nachkaufJahreB.value = els.nachkaufJahre.value;
  els.wvAnB.checked = els.wvAn.checked;
  neuBerechnenUndRendern();
});

document.getElementById('uebernehmenButtonA').addEventListener('click', () => {
  els.lebenshaltung.value = els.lebenshaltungB.value;
  els.ausstiegsalter.value = els.ausstiegsalterB.value;
  els.antrittsalter.min = els.ausstiegsalterB.value;
  els.antrittsalter.value = els.antrittsalterB.value;
  els.nachkaufAn.checked = els.nachkaufAnB.checked;
  els.nachkaufJahre.value = els.nachkaufJahreB.value;
  els.wvAn.checked = els.wvAnB.checked;
  neuBerechnenUndRendern();
});

document.getElementById('form').addEventListener('input', neuBerechnenUndRendern);
document.getElementById('footerJahr').textContent = CONST.JAHR;

eingabenInFormular();
neuBerechnenUndRendern();
