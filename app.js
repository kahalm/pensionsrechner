import {
  CONST, berechnePensionsszenario, vergleichsdiagramm, breakEvenPunkt, addMonths,
  versicherungsmonate, regelpensionsalter,
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
  nachkaufMonate: 0,
  nachkaufJahre: 5,
  wvAn: true,
  gfAn: false,
  reduktionProzent: 20,
  vergleichAn: false,
  nachkaufAlsEtf: false,
  lebenshaltungB: 2000,
  ausstiegsalterB: 65,
  antrittsalterB: 65,
  nachkaufMonateB: 0,
  nachkaufJahreB: 5,
  wvAnB: true,
  gfAnB: false,
  reduktionProzentB: 20,
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
  nachkaufMonate: 'nk',
  nachkaufJahre: 'nj',
  wvAn: 'wv',
  gfAn: 'gf',
  reduktionProzent: 'red',
  vergleichAn: 'vgl',
  nachkaufAlsEtf: 'nketf',
  lebenshaltungB: 'lhB',
  ausstiegsalterB: 'aaB',
  antrittsalterB: 'paB',
  nachkaufMonateB: 'nkB',
  nachkaufJahreB: 'njB',
  wvAnB: 'wvB',
  gfAnB: 'gfB',
  reduktionProzentB: 'redB',
};

const BOOL_KEYS = new Set(['wvAn', 'vergleichAn', 'wvAnB', 'nachkaufAlsEtf', 'gfAn', 'gfAnB']);
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
  nachkaufMonate: document.getElementById('nachkaufMonate'),
  nachkaufJahre: document.getElementById('nachkaufJahre'),
  wvAn: document.getElementById('wvAn'),
  gfAn: document.getElementById('gfAn'),
  reduktionProzent: document.getElementById('reduktionProzent'),
  vergleichAn: document.getElementById('vergleichAn'),
  nachkaufAlsEtf: document.getElementById('nachkaufAlsEtf'),
  lebenshaltungB: document.getElementById('lebenshaltungB'),
  ausstiegsalterB: document.getElementById('ausstiegsalterB'),
  antrittsalterB: document.getElementById('antrittsalterB'),
  nachkaufMonateB: document.getElementById('nachkaufMonateB'),
  nachkaufJahreB: document.getElementById('nachkaufJahreB'),
  wvAnB: document.getElementById('wvAnB'),
  gfAnB: document.getElementById('gfAnB'),
  reduktionProzentB: document.getElementById('reduktionProzentB'),
};

const outs = {
  lebenshaltung: document.getElementById('lebenshaltungOut'),
  ausstiegsalter: document.getElementById('ausstiegsalterOut'),
  antrittsalter: document.getElementById('antrittsalterOut'),
  nachkaufMonate: document.getElementById('nachkaufMonateOut'),
  nachkaufJahre: document.getElementById('nachkaufJahreOut'),
  reduktionProzent: document.getElementById('reduktionProzentOut'),
  lebenshaltungB: document.getElementById('lebenshaltungBOut'),
  ausstiegsalterB: document.getElementById('ausstiegsalterBOut'),
  antrittsalterB: document.getElementById('antrittsalterBOut'),
  nachkaufMonateB: document.getElementById('nachkaufMonateBOut'),
  nachkaufJahreB: document.getElementById('nachkaufJahreBOut'),
  reduktionProzentB: document.getElementById('reduktionProzentBOut'),
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
  els.nachkaufMonate.max = eingaben.nkMaxMonate;
  els.nachkaufMonate.value = eingaben.nachkaufMonate;
  els.nachkaufJahre.value = eingaben.nachkaufJahre;
  els.wvAn.checked = eingaben.wvAn;
  els.gfAn.checked = eingaben.gfAn;
  els.reduktionProzent.value = eingaben.reduktionProzent;
  els.vergleichAn.checked = eingaben.vergleichAn;
  els.nachkaufAlsEtf.checked = eingaben.nachkaufAlsEtf;
  els.lebenshaltungB.value = eingaben.lebenshaltungB;
  els.ausstiegsalterB.value = eingaben.ausstiegsalterB;
  els.antrittsalterB.min = eingaben.ausstiegsalterB;
  els.antrittsalterB.value = eingaben.antrittsalterB;
  els.nachkaufMonateB.max = eingaben.nkMaxMonate;
  els.nachkaufMonateB.value = eingaben.nachkaufMonateB;
  els.nachkaufJahreB.value = eingaben.nachkaufJahreB;
  els.wvAnB.checked = eingaben.wvAnB;
  els.gfAnB.checked = eingaben.gfAnB;
  els.reduktionProzentB.value = eingaben.reduktionProzentB;
  aktualisiereOutputs();
}

function aktualisiereOutputs() {
  els.nachkaufMonate.max = eingaben.nkMaxMonate;
  els.nachkaufMonateB.max = eingaben.nkMaxMonate;
  outs.lebenshaltung.textContent = eurFmt.format(eingaben.lebenshaltung);
  outs.ausstiegsalter.textContent = eingaben.ausstiegsalter;
  outs.antrittsalter.textContent = eingaben.antrittsalter;
  outs.nachkaufMonate.textContent = numFmt.format(eingaben.nachkaufMonate);
  outs.nachkaufJahre.textContent = eingaben.nachkaufJahre;
  outs.reduktionProzent.textContent = `${eingaben.reduktionProzent} %`;
  outs.lebenshaltungB.textContent = eurFmt.format(eingaben.lebenshaltungB);
  outs.ausstiegsalterB.textContent = eingaben.ausstiegsalterB;
  outs.antrittsalterB.textContent = eingaben.antrittsalterB;
  outs.nachkaufMonateB.textContent = numFmt.format(eingaben.nachkaufMonateB);
  outs.nachkaufJahreB.textContent = eingaben.nachkaufJahreB;
  outs.reduktionProzentB.textContent = `${eingaben.reduktionProzentB} %`;
  document.getElementById('nachkaufJahreField').classList.toggle('disabled', eingaben.nachkaufMonate <= 0);
  document.getElementById('nachkaufJahreBField').classList.toggle('disabled', eingaben.nachkaufMonateB <= 0);
  // Bei Anstellung ueber der Geringfuegigkeitsgrenze besteht Pflichtversicherung –
  // eine freiwillige Weiterversicherung ist daneben nicht vorgesehen.
  els.wvAn.closest('.field').classList.toggle('disabled', eingaben.gfAn);
  els.wvAnB.closest('.field').classList.toggle('disabled', eingaben.gfAnB);
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
    nachkaufMonate: Number(els.nachkaufMonate.value),
    nachkaufJahre: Number(els.nachkaufJahre.value),
    wvAn: els.wvAn.checked,
    gfAn: els.gfAn.checked,
    reduktionProzent: Number(els.reduktionProzent.value),
    vergleichAn: els.vergleichAn.checked,
    nachkaufAlsEtf: els.nachkaufAlsEtf.checked,
    lebenshaltungB: Number(els.lebenshaltungB.value),
    ausstiegsalterB: Number(els.ausstiegsalterB.value),
    antrittsalterB: Math.max(Number(els.antrittsalterB.value), Number(els.ausstiegsalterB.value)),
    nachkaufMonateB: Number(els.nachkaufMonateB.value),
    nachkaufJahreB: Number(els.nachkaufJahreB.value),
    wvAnB: els.wvAnB.checked,
    gfAnB: els.gfAnB.checked,
    reduktionProzentB: Number(els.reduktionProzentB.value),
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
  rendereScenario('A', ergebnisA, eingaben.lebenshaltung);
  rendereChart(eingaben);

  document.getElementById('ergebnisBoxB').hidden = !eingaben.vergleichAn;

  if (eingaben.vergleichAn) {
    const eingabenB = {
      ...eingaben,
      lebenshaltung: eingaben.lebenshaltungB,
      ausstiegsalter: eingaben.ausstiegsalterB,
      antrittsalter: eingaben.antrittsalterB,
      nachkaufMonate: eingaben.nachkaufMonateB,
      nachkaufJahre: eingaben.nachkaufJahreB,
      wvAn: eingaben.wvAnB,
      gfAn: eingaben.gfAnB,
      reduktionProzent: eingaben.reduktionProzentB,
    };
    const ergebnisB = berechnePensionsszenario(eingabenB);
    rendereScenario('B', ergebnisB, eingabenB.lebenshaltung);
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
    document.getElementById(`amortisationBox${suffix}`).hidden = true;
    document.getElementById(`reduktionBox${suffix}`).hidden = true;
    ['dVm', 'dNk', 'dGutschrift', 'dRegelalter', 'dAbschlagZuschlag', 'dSvJahr', 'dGfEink', 'dKapitalPuffer'].forEach((praefix) => {
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
    const benoetigt = Math.max(0, CONST.KORRIDOR_MONATE - ergebnis.monate.vmOhneNachkauf);
    el.textContent = `Anspruch nur durch Nachkauf von ${benoetigt} Monaten erreicht.`;
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

function rendereNachkauf(suffix, ergebnis) {
  // Block bleibt immer sichtbar – bei 0 gekauften Monaten stehen dort eben Nullwerte,
  // das ist beim Schieben des Sliders weniger sprunghaft als ein Ein-/Ausblenden.
  document.getElementById(`nachkaufBox${suffix}`).hidden = false;
  zelle(`nkMonate${suffix}`, numFmt.format(ergebnis.monate.nkMonate));
  zelle(`nkKostenVoll${suffix}`, eurFmt.format(ergebnis.nachkauf.kostenVoll));
  zelle(`nkErsparnis${suffix}`, eurFmt.format(ergebnis.nachkauf.ersparnis));
  zelle(`nkKostenNetto${suffix}`, eurFmt.format(ergebnis.nachkauf.kostenNetto));
  zelle(`nkEffSatz${suffix}`, pctFmt.format(ergebnis.nachkauf.effSatz));
  zelle(`nkRate${suffix}`, eurFmt.format(ergebnis.nachkauf.ratePerJahr));
  zelle(`nkEtf${suffix}`, eurFmt.format(ergebnis.nachkauf.etfWert));
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
  zelle(`dGfEink${suffix}`, ergebnis.kapital.nettoEinkommenJahr > 0
    ? `+ ${eurFmt.format(ergebnis.kapital.nettoEinkommenJahr)}`
    : '–');
  zelle(`dKapitalPuffer${suffix}`, eurFmt.format(ergebnis.kapital.kapitalPuffer));
}

function jahreText(jahre) {
  const ganze = Math.floor(jahre);
  const monate = Math.round((jahre - ganze) * 12);
  if (monate === 12) return `${ganze + 1} Jahre`;
  return monate === 0 ? `${ganze} Jahre` : `${ganze} Jahre ${monate} Monate`;
}

function rendereAmortisation(suffix, ergebnis) {
  const box = document.getElementById(`amortisationBox${suffix}`);
  const am = ergebnis.amortisation;
  if (!am) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  zelle(`amKosten${suffix}`, eurFmt.format(am.kostenNetto));
  zelle(`amZusatz${suffix}`, `${eurFmt2.format(am.zusatzNettoProMonat)}/Monat`);
  zelle(`amEinfach${suffix}`, jahreText(am.jahreEinfach));
  // null = die Rendite trägt die Entnahme dauerhaft, das Kapital wird nie aufgebraucht
  zelle(`amAlt${suffix}`, am.jahreVsAlternative === null
    ? 'nie (Rendite deckt die Entnahme)'
    : jahreText(am.jahreVsAlternative));

  const wv = ergebnis.wvVergleich;
  zelle(`wvAmMin${suffix}`, wv.minimum ? jahreText(wv.minimum.jahreEinfach) : '–');
}

function rendereReduktion(suffix, ergebnis) {
  const box = document.getElementById(`reduktionBox${suffix}`);
  const r = ergebnis.stundenreduzierung;
  const hinweis = document.getElementById(`redHinweis${suffix}`);
  if (!r) {
    // Slider auf 0 % (oder kein Anspruch): Block bleibt stehen, aber ohne Zahlen
    box.hidden = false;
    ['redGehalt', 'redEinkommen', 'redBrutto', 'redNetto', 'redVerlustBrutto', 'redVerlustNetto']
      .forEach((p) => zelle(`${p}${suffix}`, '–'));
    hinweis.textContent = ergebnis.ok
      ? 'Regler „Stundenreduzierung" auf über 0 % stellen, um den Effekt zu sehen.'
      : '';
    return;
  }
  box.hidden = false;
  zelle(`redGehalt${suffix}`, eurFmt.format(r.gehaltReduziert));
  zelle(`redEinkommen${suffix}`, `− ${eurFmt.format(r.einkommensverlustProJahr)}`);
  zelle(`redBrutto${suffix}`, eurFmt.format(r.bruttoReduziert));
  zelle(`redNetto${suffix}`, eurFmt.format(r.nettoReduziert));
  zelle(`redVerlustBrutto${suffix}`, r.verlustBrutto > 0.005 ? `− ${eurFmt2.format(r.verlustBrutto)}` : '± 0 €');
  zelle(`redVerlustNetto${suffix}`, r.verlustNetto > 0.005 ? `− ${eurFmt2.format(r.verlustNetto)}` : '± 0 €');

  const verlustZellen = [`redVerlustBrutto${suffix}`, `redVerlustNetto${suffix}`];
  verlustZellen.forEach((id) => {
    const el = document.getElementById(id);
    el.classList.remove('negative', 'positive');
    el.classList.add(r.verlustNetto > 0.005 ? 'negative' : 'positive');
  });

  // Kernaussage: über der Höchstbeitragsgrundlage wirkt eine Reduktion gar nicht oder
  // nur teilweise, weil die Gutschrift ohnehin gedeckelt ist.
  if (r.wirksameReduktionProzent < 0.05) {
    hinweis.textContent = `Die Pension bleibt unverändert: dein Gehalt liegt auch nach der Reduktion über der Höchstbeitragsgrundlage (${eurFmt2.format(CONST.HBGL_MONAT)}/Monat), die Gutschrift war also ohnehin gedeckelt. Du verlierst Einkommen, aber keine Pension.`;
  } else if (r.hbglGedeckelt && r.wirksameReduktionProzent < r.reduktionProzent - 0.05) {
    hinweis.textContent = `Von den ${r.reduktionProzent} % Reduktion wirken sich nur ${pctFmt.format(r.wirksameReduktionProzent / 100)} auf die Pension aus – der Teil oberhalb der Höchstbeitragsgrundlage (${eurFmt2.format(CONST.HBGL_MONAT)}/Monat) war nie beitragswirksam.`;
  } else {
    hinweis.textContent = `Betroffen sind nur die Erwerbsmonate ab dem Gutschrift-Stichtag bis zum Ausstieg – bereits erworbene Gutschrift, Nachkauf und Weiterversicherung bleiben unberührt.`;
  }
}

function rendereScenario(suffix, ergebnis, lebenshaltung) {
  rendereStatus(suffix, ergebnis);
  rendereKarten(suffix, ergebnis, lebenshaltung);
  rendereNachkauf(suffix, ergebnis);
  rendereAmortisation(suffix, ergebnis);
  rendereDetails(suffix, ergebnis);
  rendereReduktion(suffix, ergebnis);
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

  const alsEtf = els.nachkaufAlsEtf.checked;
  document.getElementById('vNachkaufLabel').textContent = alsEtf ? 'Kosten Nachkauf (ETF-Wert bei Antritt)' : 'Kosten Nachkauf (netto)';
  const nkWertA = alsEtf ? ergebnisA.nachkauf.etfWert : ergebnisA.nachkauf.kostenNetto;
  const nkWertB = alsEtf ? ergebnisB.nachkauf.etfWert : ergebnisB.nachkauf.kostenNetto;

  const gesamtA = ergebnisA.kapital.kapitalPuffer + nkWertA;
  const gesamtB = ergebnisB.kapital.kapitalPuffer + nkWertB;

  zelle('vKapitalA', eurFmt.format(ergebnisA.kapital.kapitalPuffer));
  zelle('vKapitalB', eurFmt.format(ergebnisB.kapital.kapitalPuffer));
  diffZelle('vKapitalDiff', ergebnisA.kapital.kapitalPuffer, ergebnisB.kapital.kapitalPuffer, eurFmt);

  zelle('vNachkaufA', eurFmt.format(nkWertA));
  zelle('vNachkaufB', eurFmt.format(nkWertB));
  diffZelle('vNachkaufDiff', nkWertA, nkWertB, eurFmt);

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
    const be = breakEvenPunkt({
      geburtsdatum, ergebnisA, ergebnisB, nachkaufKostenA: nkWertA, nachkaufKostenB: nkWertB,
    });
    if (be.gefunden) {
      const datum = addMonths(geburtsdatum, be.alterMonate);
      const jahre = Math.floor(be.alterMonate / 12);
      const monate = be.alterMonate % 12;
      const alterText = `Alter ${jahre} Jahre${monate ? ` ${monate} Monate` : ''} (${dateFmt.format(datum)})`;
      const nameFuer = (d) => (d === 'A' ? 'Szenario A' : 'Szenario B');
      const danach = nameFuer(be.dominanzDanach);
      if (be.jenseitsHorizont) {
        const vorher = nameFuer(be.dominanzPlausibel);
        text.textContent = `Break-even rechnerisch erst mit ${alterText} – realistisch also nie. ${vorher} bleibt über die gesamte plausible Lebenserwartung wirtschaftlicher; erst danach wäre ${danach} wirtschaftlicher.`;
      } else {
        text.textContent = `Break-even: mit ${alterText} gleichen sich die kumulierten Kosten/Pensionen beider Szenarien aus. Anschließend ist ${danach} wirtschaftlicher.`;
      }
    } else if (be.dominanz === 'gleich') {
      text.textContent = 'Beide Szenarien liegen kumuliert gleichauf.';
    } else {
      const besser = be.dominanz === 'A' ? 'Szenario A' : 'Szenario B';
      text.textContent = `Kein Ausgleich – ${besser} bleibt dauerhaft wirtschaftlich vorteilhafter (die laufende Pension ist dort nicht niedriger, es gibt also nichts aufzuholen).`;
    }
  }
}

els.nachkaufAlsEtf.addEventListener('change', neuBerechnenUndRendern);

document.getElementById('uebernehmenButtonB').addEventListener('click', () => {
  els.lebenshaltungB.value = els.lebenshaltung.value;
  els.ausstiegsalterB.value = els.ausstiegsalter.value;
  els.antrittsalterB.min = els.ausstiegsalter.value;
  els.antrittsalterB.value = els.antrittsalter.value;
  els.nachkaufMonateB.value = els.nachkaufMonate.value;
  els.nachkaufJahreB.value = els.nachkaufJahre.value;
  els.wvAnB.checked = els.wvAn.checked;
  neuBerechnenUndRendern();
});

document.getElementById('uebernehmenButtonA').addEventListener('click', () => {
  els.lebenshaltung.value = els.lebenshaltungB.value;
  els.ausstiegsalter.value = els.ausstiegsalterB.value;
  els.antrittsalter.min = els.ausstiegsalterB.value;
  els.antrittsalter.value = els.antrittsalterB.value;
  els.nachkaufMonate.value = els.nachkaufMonateB.value;
  els.nachkaufJahre.value = els.nachkaufJahreB.value;
  els.wvAn.checked = els.wvAnB.checked;
  neuBerechnenUndRendern();
});

// Interaktive Kopplung Antrittsalter <-> Nachkauf-Monate (nur relevant unterhalb
// des persönlichen Regelpensionsalters, wo die Korridorpension 504 Monate braucht).
function benoetigteVm(suffix) {
  if (!els.geburtsdatum.value || !els.kontoStichtag.value || els.vmStart.value === '') return null;
  const antrittEl = suffix === 'A' ? els.antrittsalter : els.antrittsalterB;
  const ausstiegEl = suffix === 'A' ? els.ausstiegsalter : els.ausstiegsalterB;
  const wvEl = suffix === 'A' ? els.wvAn : els.wvAnB;
  const monate = versicherungsmonate({
    geburtsdatum: els.geburtsdatum.value,
    kontoStichtag: els.kontoStichtag.value,
    vmStart: Number(els.vmStart.value),
    antrittsalter: Number(antrittEl.value),
    ausstiegsalter: Number(ausstiegEl.value),
    wvAn: wvEl.checked,
  });
  return monate.vmOhneNachkauf;
}

function regelalterAktuell() {
  if (!els.geburtsdatum.value || !els.geschlecht.value) return null;
  return regelpensionsalter(els.geschlecht.value, els.geburtsdatum.value);
}

// Antritt wurde bewegt: Nachkauf-Monate ggf. auf das nötige Minimum anheben.
function passeNachkaufAnAntrittAn(suffix, { warnen = false } = {}) {
  const regelalter = regelalterAktuell();
  const vmOhneNachkauf = benoetigteVm(suffix);
  if (regelalter === null || vmOhneNachkauf === null) return;
  const antrittEl = suffix === 'A' ? els.antrittsalter : els.antrittsalterB;
  const nachkaufEl = suffix === 'A' ? els.nachkaufMonate : els.nachkaufMonateB;
  const antritt = Number(antrittEl.value);
  if (antritt >= regelalter) return;

  const benoetigt = CONST.KORRIDOR_MONATE - vmOhneNachkauf;
  const nkMax = Number(els.nkMaxMonate.value);
  if (benoetigt <= 0) return;

  if (benoetigt > nkMax) {
    nachkaufEl.value = nkMax;
    if (warnen) {
      window.alert(`Szenario ${suffix}: Bei Antrittsalter ${antritt} reicht der Nachkauf selbst am Maximum (${nkMax} Monate) nicht für die Korridorpension – es fehlen noch ${Math.ceil(benoetigt - nkMax)} Monate. Bitte Antrittsalter erhöhen oder verfügbare Nachkaufmonate prüfen.`);
    }
    return;
  }
  if (Number(nachkaufEl.value) < benoetigt) {
    nachkaufEl.value = Math.ceil(benoetigt);
  }
}

// Nachkauf-Monate wurden reduziert: Antrittsalter ggf. anheben, bis es wieder passt
// (spätestens am Regelpensionsalter, wo die Korridor-Anforderung entfällt).
document.getElementById('form').addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'antrittsalter') passeNachkaufAnAntrittAn('A');
  else if (id === 'antrittsalterB') passeNachkaufAnAntrittAn('B');
  neuBerechnenUndRendern();
});

document.getElementById('form').addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'antrittsalter') passeNachkaufAnAntrittAn('A', { warnen: true });
  else if (id === 'antrittsalterB') passeNachkaufAnAntrittAn('B', { warnen: true });
  else return;
  neuBerechnenUndRendern();
});

const INFO_TEXTE = {
  geschlecht: `Das gesetzliche Regelpensionsalter für Frauen steigt bis 2033 stufenweise von 60 auf 65
    (abhängig vom Geburtsdatum) – das wirkt sich auf Abschlag/Zuschlag und die Korridorpension aus.
    Genaues Regelpensionsalter im Zweifel bei der PV erfragen.
    <a href="https://www.pensionsversicherung.at" target="_blank" rel="noopener">Zur Pensionsversicherung →</a>`,
  gutschrift: `Auf <strong>neuespensionskonto.at/pensionskonto</strong> mit ID Austria einloggen: Gutschrift und
    Stichtag stehen auf der Übersicht.
    <a href="https://www.neuespensionskonto.at/pensionskonto/" target="_blank" rel="noopener">Zum Pensionskonto →</a>`,
  versicherungsmonate: `Auf <strong>neuespensionskonto.at/pensionskonto</strong> (ID Austria) unter „Pensionswert" ersichtlich.
    <br><br>
    <strong>Auslandszeiten dazuzählen:</strong> Im Pensionskonto stehen nur die österreichischen Monate.
    Versicherungszeiten aus EU-/EWR-Staaten, der Schweiz und Abkommensstaaten werden für die
    <em>Anspruchsprüfung</em> aber mitgerechnet (Zusammenrechnung) – also für die
    ${CONST.KORRIDOR_MONATE} Monate der Korridorpension. Trag hier daher die <em>Summe</em> ein, sonst
    fällt der Anspruch zu pessimistisch aus.
    <br><br>
    Die <em>Pensionshöhe</em> ist davon unberührt: Sie wird ausschließlich aus der österreichischen
    Kontogutschrift oben berechnet, ausländische Zeiten erhöhen sie nicht. Für diese zahlt jeder Staat
    eine eigene Teilpension nach eigenen Regeln und ab eigenem Pensionsalter – eine Korridorpension in
    Österreich löst z. B. die deutsche Rente nicht mit aus. Unter 12 Versicherungsmonaten entsteht gegen
    den betreffenden Staat in der Regel kein eigener Anspruch.
    <br><br>
    Antrag stellst du nur im Wohnsitzstaat (also bei der PV) und gibst die Auslandszeiten dort an – das
    zwischenstaatliche Verfahren läuft dann von dort.
    <a href="https://www.neuespensionskonto.at/pensionskonto/" target="_blank" rel="noopener">Zum Pensionskonto →</a><br>
    <a href="https://www.pv.at/web/pension/ihr-weg-zur-pension/zwischenstaatliche-pensionsversicherung" target="_blank" rel="noopener">Zwischenstaatliche Pensionsversicherung (PV) →</a>`,
  nkMax: `Gesetzliches Maximum: 108 Monate (36 Monate höhere Schule + 72 Monate/12 Semester Hochschule).
    <br><br>
    Der Nachkauf ist an <strong>einzelne Semester</strong> gebunden, nicht an den Studienabschluss – es
    zählt jedes Semester mit ausreichend nachgewiesenem Studienfortschritt (Prüfungen/ECTS).
    <br><br>
    Wie viele deiner Semester das genau betrifft, weißt du am sichersten von der PV oder siehst es teils
    schon im Pensionskonto vorausgefüllt. Falls schon früher teilweise nachgekauft, hier die noch
    verbleibende Anzahl eintragen.
    <a href="https://www.pensionsversicherung.at" target="_blank" rel="noopener">Zur Pensionsversicherung →</a>`,
  nachkaufMonate: `Wird der Antritt unter das Regelpensionsalter geschoben, hebt sich dieser Wert automatisch
    auf das nötige Minimum für die Korridorpension (falls niedriger). Reicht selbst das Maximum nicht, kommt
    ein Hinweis. Senkst du diesen Wert danach wieder unter das Minimum, bleibt das Antrittsalter unverändert –
    die Statuszeile zeigt dann in Rot, wie viele Monate fehlen.`,
  nachkaufJahre: 'Verteilt die Nachkaufkosten steuerlich auf 1–10 Jahre (nur relevant, wenn oben Monate gewählt sind).',
  wvAn: `Betrifft nur die <strong>Pensionsversicherung</strong> (§17 ASVG) – das ist freiwillig: niemand
    zwingt dich, in der Lücke weiter PV-Beiträge zu zahlen. Lässt du es weg, sparst du dir die Beiträge,
    aber die Lückenmonate zählen nicht als Versicherungsmonate und bringen keine zusätzliche Gutschrift.
    <br><br>
    Die <strong>Krankenversicherung</strong> (Selbstversicherung, ~565 €/Monat) läuft davon unabhängig
    immer mit, da in Österreich generell Versicherungspflicht besteht – die App rechnet sie deshalb im
    Kapitalbedarf immer mit ein, unabhängig von diesem Schalter.
    <a href="https://www.pensionsversicherung.at" target="_blank" rel="noopener">Zur Pensionsversicherung →</a>`,
  nachkaufAlsEtf: `Standardmäßig fließen hier die <strong>Netto-Nachkaufkosten</strong> (nach Steuerersparnis) in
    "Gesamtkosten" und den Break-even ein. Aktiviert, wird stattdessen der <strong>ETF-Wert bei Antritt</strong>
    verwendet (die Nettokosten, angenommen zu 5% p.a. netto verzinst statt an die PV gezahlt) – das macht den
    Vergleich fairer, wenn du die Opportunitätskosten des Nachkaufs (entgangene Anlage) mit einrechnen willst.`,
  amortisationNachkauf: `Wie lange dauert es, bis sich <strong>ein einzelner nachgekaufter Monat</strong> wieder
    hereingespielt hat? Durchgehend in <strong>Netto-Größen</strong> gerechnet, weil nur das vergleichbar ist:
    auf der Kostenseite der Bruttopreis (${eurFmt.format(CONST.NK_KOSTEN_MONAT)}) abzüglich der Steuerersparnis
    aus dem Sonderausgabenabzug, auf der Ertragsseite die zusätzliche Pension nach KV-Beitrag und Lohnsteuer
    (inkl. Ab-/Zuschlag deines Antrittsalters).
    <br><br>
    Beide Dauern zählen <strong>ab Pensionsbeginn</strong> und sind damit direkt vergleichbar.
    <br><br>
    <strong>Amortisation ab Pensionsbeginn:</strong> Kosten ÷ Zusatzpension, ohne Zinsen – die optimistische
    Variante.
    <br><br>
    <strong>… mit 2 % Alternativrendite:</strong> das ehrlichere Szenario. Die Nettokosten werden bis zum
    Antritt angelegt und <em>danach monatlich um die entgangene Zusatzpension entnommen</em> – wobei sich der
    Restbestand weiter verzinst (klassische Entnahmerechnung, nicht bloß Kapital ÷ Rate). Die Frage lautet
    also: wie lange trägt das alternativ angelegte Geld die Pensionsdifferenz, bevor es aufgebraucht ist?
    Übersteigt die Rendite die Entnahme, reicht das Kapital ewig – dann steht hier „nie".
    <br><br>
    Die 2 % sind bewusst als <em>reale</em> Rendite angesetzt – also nach Steuer
    <em>und</em> nach Inflation. Bei rund 2 % Inflation und 27,5 % KESt entspricht das grob
    <strong>5–6 % Bruttorendite p.a.</strong> am Markt (≈ 2 % real + 2 % Inflation, plus den KESt-Anteil).
    Weil auch die Pension selbst jährlich aufgewertet wird, ist der Vergleich in realen Größen der ehrlichere.
    <br><br>
    Nicht enthalten: dass die Pension lebenslang läuft, ein angespartes Kapital aber endlich ist – der
    Nachkauf ist damit auch eine Absicherung gegen ein langes Leben.`,
  gfAn: `In der Lücke zwischen Ausstieg und Antritt ein Dienstverhältnis <strong>knapp über</strong> der
    Geringfügigkeitsgrenze (${eurFmt2.format(CONST.GERINGFUEGIGKEIT)}/Monat) – gerechnet wird mit
    ${eurFmt2.format(CONST.GF_PLUS_BG)}/Monat.
    <br><br>
    <strong>Der eine Euro entscheidet:</strong> Genau <em>unter</em> der Grenze ist man nur unfallversichert –
    keine Versicherungsmonate, keine Krankenversicherung. Erst <em>darüber</em> greift die Vollversicherung.
    „Geringfügig" im Rechtssinn nützt hier also gar nichts.
    <br><br>
    Drei Effekte, alle im Ergebnis berücksichtigt:
    <br>• Die Lückenmonate zählen als Versicherungsmonate (relevant für die ${CONST.KORRIDOR_MONATE} Monate
    der Korridorpension) – deutlich billiger als Nachkauf: rund
    ${eurFmt2.format(CONST.GF_PLUS_BG * 0.1025)} Dienstnehmeranteil pro Monat statt
    ${eurFmt.format(CONST.NK_KOSTEN_MONAT)}.
    <br>• Die KV-Selbstversicherung (${eurFmt.format(CONST.KV_SELBST_MONAT * 12)}/Jahr) entfällt.
    <br>• Das Einkommen mindert den Kapitalbedarf; Lohnsteuer fällt auf diesem Niveau keine an.
    <br><br>
    Die Gutschrift bleibt naturgemäß klein (${eurFmt2.format(CONST.KONTOPROZENTSATZ * CONST.GF_PLUS_BG * 14)}/Jahr) –
    es geht um Monate und Versicherungsschutz, nicht um Pensionshöhe.
    <br><br>
    <strong>Achtung:</strong> Am Stichtag der Korridorpension selbst darf kein Erwerbseinkommen über der
    Geringfügigkeitsgrenze bestehen – das Dienstverhältnis muss also bis dahin beendet oder reduziert sein.`,
  reduktionProzent: `Was kostet eine Reduktion der Arbeitszeit an <strong>monatlicher Pension</strong>?
    Gerechnet wird mit entsprechend geringerem Bruttogehalt für die noch offenen Erwerbsmonate
    (Gutschrift-Stichtag bis Ausstieg). Bereits erworbene Kontogutschrift, Nachkauf und
    Weiterversicherung bleiben unberührt.
    <br><br>
    <strong>Wichtig bei hohem Gehalt:</strong> Die Pensionsgutschrift ist bei der
    Höchstbeitragsgrundlage gedeckelt (${eurFmt2.format(CONST.HBGL_MONAT)}/Monat bzw.
    ${eurFmt.format(CONST.HBGL_JAHR)}/Jahr inkl. Sonderzahlungen). Liegt dein Gehalt darüber, wirkt sich
    eine Reduktion gar nicht oder nur zum Teil auf die Pension aus – du verlierst dann Einkommen, ohne
    Pension zu verlieren. Der Hinweis unter der Tabelle weist das jeweils aus.
    <br><br>
    Nicht berücksichtigt: dass ein geringeres Gehalt auch die Steuerersparnis beim Nachkauf senkt, und
    etwaige kollektivvertragliche Effekte einer Teilzeitvereinbarung.`,
  wvAmortisation: `Zahlt es sich aus, in der Lücke freiwillig weiter in die Pensionsversicherung einzuzahlen?
    Gerechnet wird <strong>ein Jahr Beitrag</strong> gegen die zusätzliche Nettopension, die dieses Jahr bringt.
    <br><br>
    <strong>Die Höhe des Beitrags ist dabei egal:</strong> Beitrag (${(CONST.WV_SATZ * 100).toFixed(1)} %) und
    Gutschrift (${(CONST.KONTOPROZENTSATZ * 100).toFixed(2)} %) sind beide linear zur Beitragsgrundlage – ob du
    den Mindestbeitrag (Grundlage ${eurFmt2.format(CONST.WV_BG_MIN)}/Monat) oder das Maximum
    (${eurFmt2.format(CONST.WV_BG_MAX)}/Monat) zahlst, ändert die Amortisationsdauer nicht. Ein höherer Beitrag
    bringt proportional mehr Pension, aber nicht schneller. Nur bei einem Sprung über eine Steuerstufe kann sich
    die Dauer minimal verschieben.
    <br><br>
    Anders als beim Nachkauf gibt es hier <strong>keine Steuerersparnis</strong>: die Beiträge fallen in der
    Erwerbslücke an, wo mangels Einkommen nichts abzusetzen ist. Deshalb amortisiert sich die
    Weiterversicherung deutlich langsamer als ein Nachkauf-Monat.`,
};

const infoDialog = document.getElementById('infoDialog');
document.getElementById('infoDialogClose').addEventListener('click', () => infoDialog.close());
infoDialog.addEventListener('click', (e) => {
  if (e.target === infoDialog) infoDialog.close();
});
document.querySelectorAll('.info-icon').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('infoDialogText').innerHTML = INFO_TEXTE[btn.dataset.info] || '';
    infoDialog.showModal();
  });
});

document.getElementById('footerJahr').textContent = CONST.JAHR;

eingabenInFormular();
neuBerechnenUndRendern();
