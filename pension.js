// Reine Rechenlogik für den österreichischen Pensionsrechner (APG-Pensionskonto).
// Keine DOM-Zugriffe – testbar via `node --test tests.js`.

export const CONST = {
  JAHR: 2026,
  KONTOPROZENTSATZ: 0.0178,
  HBGL_MONAT: 6930,
  HBGL_JAHR: 97020,
  GERINGFUEGIGKEIT: 551.10,

  WV_BG_MIN: 1084.20,
  WV_BG_MAX: 8085.00,
  WV_SATZ: 0.228,

  KV_SELBST_MONAT: 565.25,

  NK_KOSTEN_MONAT: 1472,
  NK_MAX_MONATE: 108,

  KORRIDOR_ALTER: 63,
  KORRIDOR_MONATE: 504,
  ABSCHLAG_PA: 0.051,
  ZUSCHLAG_PA: 0.051,
  ZUSCHLAG_MAX: 0.153,
  REGELPENSIONSALTER: 65,

  TARIF: [
    [13539, 0],
    [21992, 0.20],
    [36458, 0.30],
    [70365, 0.40],
    [104859, 0.48],
    [1000000, 0.50],
    [Infinity, 0.55],
  ],
  SV_DN_SATZ: 0.1807,
  SZ_FREIBETRAG: 620,
  SZ_STEUERSATZ: 0.06,
  KV_PENSION: 0.06,
  NETTO_KALIBRIERUNG: 0.973,

  // Alternative "ETF statt Nachkauf": ca. 7 % Bruttorendite p.a. minus 27,5 % KESt.
  ETF_RENDITE_NETTO: 0.05,

  // Für die Amortisationsrechnungen: konservative reale Nettorendite (nach Steuer
  // und Inflation) als Alternativrendite-Benchmark, plus die Annahmen dahinter.
  AMORTISATION_RENDITE_REAL: 0.02,
  INFLATION_ANNAHME: 0.02,
  KEST: 0.275,
};

CONST.NK_GUTSCHRIFT_MONAT = (CONST.NK_KOSTEN_MONAT / CONST.WV_SATZ) * CONST.KONTOPROZENTSATZ;

export function clamp(x, lo, hi) {
  return Math.min(Math.max(x, lo), hi);
}

function toDate(d) {
  if (d instanceof Date) return d;
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

// Kalendermonate zwischen zwei Daten, kaufmännisch gerundet (Bruchteil relativ
// zur Anzahl Tage im Zielmonat, da Stichtage oft nicht auf denselben Tag fallen).
export function monateZwischen(d1, d2) {
  const a = toDate(d1);
  const b = toDate(d2);
  const monate = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const tageImZielmonat = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
  const bruch = (b.getDate() - a.getDate()) / tageImZielmonat;
  return Math.round(monate + bruch);
}

// Erster Monatserster nach dem Geburtstag im gegebenen Alter.
export function stichtagPension(geburtsdatum, alter) {
  const g = toDate(geburtsdatum);
  const geburtstag = new Date(g.getFullYear() + alter, g.getMonth(), g.getDate());
  return new Date(geburtstag.getFullYear(), geburtstag.getMonth() + 1, 1);
}

// Monatsende des Geburtstagsmonats im gegebenen Alter.
export function ausstiegsdatum(geburtsdatum, alter) {
  const g = toDate(geburtsdatum);
  return new Date(g.getFullYear() + alter, g.getMonth() + 1, 0);
}

export function jahresgutschrift(gehalt) {
  return CONST.KONTOPROZENTSATZ * Math.min(gehalt * 14, CONST.HBGL_JAHR);
}

// Stufenweise Anhebung des Frauen-Regelpensionsalters 2024–2033 (von 60 auf 65,
// abhängig vom Geburtsdatum; danach gleich wie Männer). Randfälle exakt am
// Stichtag: im Zweifel bei der PV die genaue Zahl erfragen.
const FRAUEN_STUFEN = [
  { bis: '1963-06-01', alter: 60 },
  { bis: '1963-12-01', alter: 60.5 },
  { bis: '1964-06-01', alter: 61 },
  { bis: '1964-12-01', alter: 61.5 },
  { bis: '1965-06-01', alter: 62 },
  { bis: '1965-12-01', alter: 62.5 },
  { bis: '1966-06-01', alter: 63 },
  { bis: '1966-12-01', alter: 63.5 },
  { bis: '1967-06-01', alter: 64 },
  { bis: '1967-12-01', alter: 64.5 },
];

export function regelpensionsalter(geschlecht, geburtsdatum) {
  if (geschlecht !== 'frau') return CONST.REGELPENSIONSALTER;
  const g = toDate(geburtsdatum);
  for (const stufe of FRAUEN_STUFEN) {
    if (g <= toDate(stufe.bis)) return stufe.alter;
  }
  return CONST.REGELPENSIONSALTER;
}

export function versicherungsmonate({
  geburtsdatum, kontoStichtag, vmStart, antrittsalter, ausstiegsalter, wvAn,
  nachkaufMonate = 0, nkMaxMonate = CONST.NK_MAX_MONATE,
}) {
  const ausstieg = ausstiegsdatum(geburtsdatum, ausstiegsalter);
  const stichtagP = stichtagPension(geburtsdatum, antrittsalter);
  const arbeitsmonate = Math.max(0, monateZwischen(kontoStichtag, ausstieg));
  const lueckenmonate = Math.max(0, monateZwischen(ausstieg, stichtagP));
  const vmOhneNachkauf = vmStart + arbeitsmonate + (wvAn ? lueckenmonate : 0);
  // nachkaufMonate ist ein direkter Nutzerwert (Slider 0..nkMaxMonate) – kein
  // automatisches Auffüllen mehr hier; das übernimmt die UI interaktiv.
  const nkMonate = clamp(nachkaufMonate, 0, clamp(nkMaxMonate, 0, CONST.NK_MAX_MONATE));
  return {
    ausstieg,
    stichtagPension: stichtagP,
    arbeitsmonate,
    lueckenmonate,
    vmOhneNachkauf,
    nkMonate,
    vm: vmOhneNachkauf + nkMonate,
  };
}

export function gutschriftBeiAntritt({
  konto, gehalt, arbeitsmonate, lueckenmonate, wvAn, nkMonate,
}) {
  const jg = jahresgutschrift(gehalt);
  let g = konto + (arbeitsmonate / 12) * jg;
  if (wvAn) {
    g += (lueckenmonate / 12) * CONST.KONTOPROZENTSATZ * CONST.WV_BG_MIN * 12;
  }
  g += nkMonate * CONST.NK_GUTSCHRIFT_MONAT;
  return g;
}

// Abschlag/Zuschlag sind immer relativ zum PERSÖNLICHEN Regelpensionsalter (bei
// Männern und Frauen ab Jahrgang 1968 fix 65; bei Frauen in der Übergangszeit
// niedriger, siehe regelpensionsalter()). Die Korridorpension als eigenständiges
// Frühpensions-Instrument (504 Monate, Abschlag) hat unabhängig davon ihre eigene
// Alters-Untergrenze KORRIDOR_ALTER: unterhalb dieser Grenze besteht so oder so
// kein Anspruch, auch wenn das persönliche Regelpensionsalter niedriger liegt.
export function anspruchUndBrutto({
  antrittsalter, vm, gutschrift, regelalter = CONST.REGELPENSIONSALTER,
}) {
  if (antrittsalter < regelalter) {
    if (antrittsalter < CONST.KORRIDOR_ALTER) {
      return {
        ok: false, fehlercode: 'ZU_FRUEH', fehlendeMonate: null, abschlag: null, zuschlag: null, bruttoMonat: null,
      };
    }
    if (vm < CONST.KORRIDOR_MONATE) {
      return {
        ok: false,
        fehlercode: 'ZU_WENIG_MONATE',
        fehlendeMonate: CONST.KORRIDOR_MONATE - vm,
        abschlag: null,
        zuschlag: null,
        bruttoMonat: null,
      };
    }
    const abschlag = (regelalter - antrittsalter) * CONST.ABSCHLAG_PA;
    return {
      ok: true, fehlercode: null, fehlendeMonate: 0, abschlag, zuschlag: 0, bruttoMonat: (gutschrift / 14) * (1 - abschlag),
    };
  }
  const zuschlag = Math.min((antrittsalter - regelalter) * CONST.ZUSCHLAG_PA, CONST.ZUSCHLAG_MAX);
  return {
    ok: true, fehlercode: null, fehlendeMonate: 0, abschlag: 0, zuschlag, bruttoMonat: (gutschrift / 14) * (1 + zuschlag),
  };
}

// Progressive Grenzsteuerlogik über CONST.TARIF.
export function tarif(x) {
  if (x <= 0) return 0;
  let steuer = 0;
  let untergrenze = 0;
  for (const [obergrenze, satz] of CONST.TARIF) {
    if (x <= obergrenze) {
      steuer += (x - untergrenze) * satz;
      return steuer;
    }
    steuer += (obergrenze - untergrenze) * satz;
    untergrenze = obergrenze;
  }
  return steuer;
}

export function nettoMonat(bruttoMonat) {
  const lauf = 12 * bruttoMonat;
  const sz = 2 * bruttoMonat;
  const kv = CONST.KV_PENSION * (lauf + sz);
  const lst = tarif(lauf * (1 - CONST.KV_PENSION));
  const lstSz = Math.max(0, sz * (1 - CONST.KV_PENSION) - CONST.SZ_FREIBETRAG) * CONST.SZ_STEUERSATZ;
  return ((lauf + sz - kv - lst - lstSz) / 14) * CONST.NETTO_KALIBRIERUNG;
}

export function nachkaufSteuereffekt({
  nkMonate, gehalt, nachkaufJahre, jahreBisAntritt = 0,
}) {
  const kostenVoll = nkMonate * CONST.NK_KOSTEN_MONAT;
  if (kostenVoll <= 0) {
    return {
      kostenVoll: 0, ratePerJahr: 0, ersparnis: 0, kostenNetto: 0, effSatz: 0, etfWert: 0,
    };
  }
  const bemessung = 12 * gehalt - 12 * Math.min(gehalt, CONST.HBGL_MONAT) * CONST.SV_DN_SATZ;
  const rate = kostenVoll / nachkaufJahre;
  const ersparnis = nachkaufJahre * (tarif(bemessung) - tarif(Math.max(0, bemessung - rate)));
  const kostenNetto = kostenVoll - ersparnis;
  // Alternative: die tatsächlich gebundenen Nettokosten stattdessen in ein ETF
  // investiert (Annahme ca. 7 % brutto − KESt ≈ 5 % netto p.a.), bis zum Antritt verzinst.
  const etfWert = kostenNetto * (1 + CONST.ETF_RENDITE_NETTO) ** Math.max(0, jahreBisAntritt);
  return {
    kostenVoll, ratePerJahr: rate, ersparnis, kostenNetto, effSatz: ersparnis / kostenVoll, etfWert,
  };
}

export function kapitalbedarf({ lueckenmonate, lebenshaltung, wvAn }) {
  const svJahr = CONST.KV_SELBST_MONAT * 12 + (wvAn ? CONST.WV_BG_MIN * CONST.WV_SATZ * 12 : 0);
  const kapital = (lueckenmonate / 12) * (lebenshaltung * 12 + svJahr);
  return { svJahr, kapital, kapitalPuffer: kapital * 1.15 };
}

function ampelFuer(anspruch, monate) {
  if (!anspruch.ok) return 'rot';
  if (monate.nkMonate > 0) return 'gelb';
  return 'gruen';
}

// Faustregel-Amortisation für den Kauf von genau 1 Nachkauf-Monat (unabhängig von der
// tatsächlich gewählten Anzahl): einfache Version (Kosten ÷ Zusatzpension) und eine
// Version, die die Kosten bis zum Antritt mit AMORTISATION_RENDITE_REAL verzinst
// (Opportunitätskosten einer Alternativanlage).
export function amortisationEinMonat({
  abschlag, zuschlag, jahreBisAntritt, ok,
}) {
  if (!ok) return null;
  const kosten = CONST.NK_KOSTEN_MONAT;
  const faktor = abschlag > 0 ? (1 - abschlag) : (1 + zuschlag);
  const zusatzBruttoProMonat = (CONST.NK_GUTSCHRIFT_MONAT / 14) * faktor;
  const jahreEinfach = kosten / zusatzBruttoProMonat / 12;
  const jbA = Math.max(0, jahreBisAntritt);
  const kostenBeiAntritt = kosten * (1 + CONST.AMORTISATION_RENDITE_REAL) ** jbA;
  const jahreVsAlternative = jbA + (kostenBeiAntritt / zusatzBruttoProMonat) / 12;
  return {
    kosten, zusatzBruttoProMonat, jahreEinfach, jahreVsAlternative,
  };
}

// Amortisation der freiwilligen PV-Weiterversicherung: lohnt sich 1 Jahr Beitrag bei
// gegebener Beitragsgrundlage (Minimum oder aktuelles Gehalt, gedeckelt) überhaupt?
export function wvAmortisation(basis, { abschlag, zuschlag, ok }) {
  if (!ok) return null;
  const beitragProJahr = basis * CONST.WV_SATZ * 12;
  const gutschriftProJahr = CONST.KONTOPROZENTSATZ * basis * 12;
  const faktor = abschlag > 0 ? (1 - abschlag) : (1 + zuschlag);
  const zusatzBruttoProMonat = (gutschriftProJahr / 14) * faktor;
  const jahreEinfach = beitragProJahr / zusatzBruttoProMonat / 12;
  return {
    basis, beitragProJahr, zusatzBruttoProMonat, jahreEinfach,
  };
}

export function berechnePensionsszenario(eingaben) {
  const antrittsalter = Math.max(eingaben.antrittsalter, eingaben.ausstiegsalter);
  const regelalter = regelpensionsalter(eingaben.geschlecht, eingaben.geburtsdatum);
  const monate = versicherungsmonate({ ...eingaben, antrittsalter, regelalter });
  const gutschrift = gutschriftBeiAntritt({
    konto: eingaben.konto,
    gehalt: eingaben.gehalt,
    arbeitsmonate: monate.arbeitsmonate,
    lueckenmonate: monate.lueckenmonate,
    wvAn: eingaben.wvAn,
    nkMonate: monate.nkMonate,
  });
  const anspruch = anspruchUndBrutto({
    antrittsalter, vm: monate.vm, gutschrift, regelalter,
  });
  const netto = anspruch.ok ? nettoMonat(anspruch.bruttoMonat) : null;
  const jahreBisAntritt = monateZwischen(eingaben.kontoStichtag, monate.stichtagPension) / 12;
  const nachkauf = nachkaufSteuereffekt({
    nkMonate: monate.nkMonate, gehalt: eingaben.gehalt, nachkaufJahre: eingaben.nachkaufJahre, jahreBisAntritt,
  });
  const kapital = kapitalbedarf({
    lueckenmonate: monate.lueckenmonate, lebenshaltung: eingaben.lebenshaltung, wvAn: eingaben.wvAn,
  });
  const amortisation = amortisationEinMonat({
    abschlag: anspruch.abschlag, zuschlag: anspruch.zuschlag, jahreBisAntritt, ok: anspruch.ok,
  });
  const wvVergleich = {
    minimum: wvAmortisation(CONST.WV_BG_MIN, { abschlag: anspruch.abschlag, zuschlag: anspruch.zuschlag, ok: anspruch.ok }),
    aktuell: wvAmortisation(Math.min(eingaben.gehalt, CONST.WV_BG_MAX), { abschlag: anspruch.abschlag, zuschlag: anspruch.zuschlag, ok: anspruch.ok }),
  };

  return {
    eingaben: { ...eingaben, antrittsalter },
    regelalter,
    monate,
    gutschrift,
    ok: anspruch.ok,
    fehlercode: anspruch.fehlercode,
    fehlendeMonate: anspruch.fehlendeMonate,
    abschlag: anspruch.abschlag,
    zuschlag: anspruch.zuschlag,
    bruttoMonat: anspruch.bruttoMonat,
    nettoMonat: netto,
    nachkauf,
    kapital,
    amortisation,
    wvVergleich,
    ampel: ampelFuer(anspruch, monate),
  };
}

export function vergleichsdiagramm(eingaben, alterListe = [63, 64, 65, 66, 67, 68]) {
  return alterListe.map((alter) => {
    const r = berechnePensionsszenario({ ...eingaben, ausstiegsalter: alter, antrittsalter: alter });
    return { alter, bruttoMonat: r.ok ? r.bruttoMonat : null, ok: r.ok };
  });
}

export function addMonths(datum, monate) {
  const d = toDate(datum);
  return new Date(d.getFullYear(), d.getMonth() + monate, d.getDate());
}

function szenarioSegment(ergebnis, geburtsdatum, nachkaufKosten) {
  return {
    ausstiegM: monateZwischen(geburtsdatum, ergebnis.monate.ausstieg),
    antrittM: monateZwischen(geburtsdatum, ergebnis.monate.stichtagPension),
    kosten: ergebnis.kapital.kapitalPuffer + nachkaufKosten,
    pensionProMonat: ergebnis.nettoMonat,
  };
}

// Kumulierte Netto-Position (−Kosten, dann +Pension ab Antritt) als stückweise
// lineare Funktion des Alters (in Monaten) – 0 vor dem Ausstieg.
function segmentWert(segment, alterMonate) {
  if (alterMonate < segment.ausstiegM) return 0;
  if (alterMonate < segment.antrittM) return -segment.kosten;
  return -segment.kosten + segment.pensionProMonat * (alterMonate - segment.antrittM);
}

// Schnittpunkt der kumulierten Positionen zweier Szenarien: ab welchem Alter hat das
// Szenario mit höheren Anfangskosten (Kapitalbedarf + Nachkauf-Kosten netto) durch die
// seit seinem eigenen Antritt bezogene Nettopension gegenüber dem anderen aufgeholt.
// Vereinfachung wie im restlichen Rechner: keine Verzinsung, heutiger Geldwert.
export function breakEvenPunkt({
  geburtsdatum, ergebnisA, ergebnisB,
  nachkaufKostenA = ergebnisA?.nachkauf?.kostenNetto ?? 0,
  nachkaufKostenB = ergebnisB?.nachkauf?.kostenNetto ?? 0,
}) {
  if (!ergebnisA.ok || !ergebnisB.ok) return null;
  const segA = szenarioSegment(ergebnisA, geburtsdatum, nachkaufKostenA);
  const segB = szenarioSegment(ergebnisB, geburtsdatum, nachkaufKostenB);
  const breakpoints = [...new Set([segA.ausstiegM, segA.antrittM, segB.ausstiegM, segB.antrittM])]
    .sort((a, b) => a - b);
  const horizont = Math.max(segA.antrittM, segB.antrittM) + 480;
  const punkte = [...breakpoints, horizont];
  const diff = (m) => segmentWert(segA, m) - segmentWert(segB, m);

  for (let i = 0; i < punkte.length - 1; i++) {
    const m0 = punkte[i];
    const m1 = punkte[i + 1];
    const d0 = diff(m0);
    const d1 = diff(m1);
    if (Math.abs(d0) < 0.005) {
      return { alterMonate: Math.round(m0), gefunden: true };
    }
    if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) {
      const anteil = d0 / (d0 - d1);
      return { alterMonate: Math.round(m0 + anteil * (m1 - m0)), gefunden: true };
    }
  }
  const finalDiff = diff(horizont);
  return {
    gefunden: false,
    dominanz: finalDiff > 0.005 ? 'A' : finalDiff < -0.005 ? 'B' : 'gleich',
  };
}
