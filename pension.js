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

  // Verifiziert an der WKO-Kostentabelle fuer Antragsjahr 2026 (22 Jahreswerte) und an
  // oesterreich.gv.at. Die Spanne reicht von 1.512,70 (Ausbildungsjahr 2010) bis 1.580,04
  // (Zeiten vor 2005 sowie Ausbildungsjahr 2026) -- nur 4,5 % Unterschied. Gewaehlt ist die
  // Mitte der Spanne, dadurch liegt der Fehler in beide Richtungen bei maximal 2,2 %.
  // Nicht einkommensabhaengig: die Hoehe haengt am Antragsjahr und am Kalenderjahr der
  // Ausbildung. Der Hoechstwert ist exakt HBGL_MONAT x WV_SATZ (6.930 x 22,8 % = 1.580,04),
  // weshalb der Nachkauf als fiktiver Monat auf Hoechstbeitragsgrundlage zu lesen ist.
  NK_KOSTEN_MONAT: 1546,
  NK_KOSTEN_MONAT_MIN: 1512.70,
  NK_KOSTEN_MONAT_MAX: 1580.04,
  NK_MAX_MONATE: 108,

  // Endausbau der Korridorpension (Jahrgaenge ab 1.10.1966). Fuer aeltere Jahrgaenge
  // gelten niedrigere Werte, siehe KORRIDOR_STUFEN / korridorVoraussetzungen().
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

  // GSVG (Selbstaendige, SVS) -- Werte 2026, verifiziert an wko.at.
  // Der Kontoprozentsatz ist derselbe wie im ASVG, nur der Beitragssatz ist
  // niedriger: 18,5 % statt 22,8 %. Pro eingezahltem Euro entsteht dadurch MEHR
  // Gutschrift (9,62 % statt 7,81 %) -- dafuer traegt man alles allein.
  GSVG_PV: 0.185,
  GSVG_KV: 0.068,
  GSVG_HBGL_MONAT: 8085,          // x12 = 97.020 wie im ASVG (dort x14)
  GSVG_MIND_BG_MONAT: 551.10,     // Mindestbeitragsgrundlage, PV-Beitrag 101,95/Monat
  // Versicherungsgrenze (Kleinunternehmerregelung): 6.613,20/Jahr -- das ist exakt die
  // Geringfuegigkeitsgrenze x 12. Darunter kann man sich von KV und PV ausnehmen lassen
  // und ist nur noch unfallversichert (12,95/Monat). Die Schwelle liegt damit fuer beide
  // Systeme beim selben Monatsbetrag, nur einmal jaehrlich und einmal monatlich gedacht.
  GSVG_VERSICHERUNGSGRENZE_JAHR: 6613.20,
  GSVG_UV_MONAT: 12.95,
  SZ_FREIBETRAG: 620,
  SZ_STEUERSATZ: 0.06,
  // Freigrenze fuer sonstige Bezuege (Paragraf 67 EStG), Wert 2026: bleibt das
  // Jahressechstel darunter, entfaellt die Besteuerung der Sonderzahlungen ganz.
  SZ_FREIGRENZE: 2615,
  // Seit 1.6.2025 6 % (vorher 5,1 %), Quelle PV/SVS.
  KV_PENSION: 0.06,
  // Pensionistenabsetzbetrag 2026: 1.020 EUR bis 21.614 EUR zu versteuernder laufender
  // Pension, linear auf 0 bei 31.494 EUR. Der erhoehte PAB (1.502, an Partnereinkommen
  // gebunden) und die SV-Rueckerstattung fuer Pensionisten sind nicht abgebildet.
  PAB: 1020,
  PAB_VOLL_BIS: 21614,
  PAB_NULL_AB: 31494,
  // Verkehrsabsetzbetrag 2026 fuer Arbeitnehmer; der Zuschlag (bis 804 EUR bei niedrigem
  // Einkommen) und der erhoehte VAB (Pendler) sind nicht abgebildet.
  VAB: 496,
  // SV-Rueckerstattung ("Negativsteuer") 2026: 55 % der SV-Beitraege, hoechstens 496 EUR,
  // wenn die Steuer nach Absetzbetraegen negativ wuerde.
  SV_RUECKERSTATTUNG_SATZ: 0.55,
  SV_RUECKERSTATTUNG_MAX: 496,
  // Empirischer Korrekturfaktor, am offiziellen PV-Rechner bei EINEM Datenpunkt
  // (Antritt 65, brutto 4.364) kalibriert. Er kompensiert dort rund 88 EUR/Monat, deren
  // Ursache nicht bekannt ist; fuer niedrige Pensionen ist er ungeprueft.
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

// "Geringfuegig + 1 Euro": knapp UEBER der Geringfuegigkeitsgrenze. Genau darunter waere
// man nur unfallversichert und wuerde weder Versicherungsmonate noch Krankenversicherung
// bekommen -- der Nutzen entsteht erst mit dem einen Euro darueber (Vollversicherung).
CONST.GF_PLUS_BG = CONST.GERINGFUEGIGKEIT + 1;

// Dienstnehmeranteil ohne Arbeitslosenversicherung: KV 3,87 + PV 10,25 + AK-Umlage 0,5 +
// Wohnbaufoerderung 0,5 = 15,12 %. Der AlV-Beitrag kommt je nach Einkommen dazu (siehe
// ALV_STUFEN): die Einschleifregelung (Paragraf 2a AMPFG) staffelt ihn von 0 % bis 2,95 %.
CONST.GF_SV_DN_SATZ = 0.0387 + 0.1025 + 0.005 + 0.005;

// Einschleifregelung Arbeitslosenversicherung, Dienstnehmeranteil (Paragraf 2a AMPFG),
// Werte 2026: bis zur jeweiligen Monatsgrenze gilt der zugehoerige Satz.
CONST.ALV_STUFEN = [
  { bis: 2225, satz: 0 },
  { bis: 2427, satz: 0.01 },
  { bis: 2630, satz: 0.02 },
  { bis: Infinity, satz: 0.0295 },
];

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
  // Stichtag ist der auf das Ereignis folgende Monatserste -- faellt der Geburtstag selbst
  // auf einen Monatsersten, ist er der Stichtag.
  if (geburtstag.getDate() === 1) return geburtstag;
  return new Date(geburtstag.getFullYear(), geburtstag.getMonth() + 1, 1);
}

// Monatsende des Geburtstagsmonats im gegebenen Alter.
export function ausstiegsdatum(geburtsdatum, alter) {
  const g = toDate(geburtsdatum);
  return new Date(g.getFullYear() + alter, g.getMonth() + 1, 0);
}

// Jahresbeitragsgrundlage aus der Nutzereingabe. Die beiden Systeme unterscheiden
// sich darin, WIE man dorthin kommt:
//
//   ASVG: Monatsbrutto x 14 (Sonderzahlungen), gedeckelt bei HBGL_JAHR.
//   GSVG: Einkuenfte laut Einkommensteuerbescheid PLUS Hinzurechnung der im
//         Beitragsjahr vorgeschriebenen PV- und KV-Beitraege. Weil diese Beitraege
//         selbst von der Grundlage abhaengen, ist das ein Fixpunkt:
//           BG = E + (PV+KV) x BG   ->   BG = E / (1 - (PV+KV))
//         Zusaetzlich gelten Mindest- und Hoechstbeitragsgrundlage.
//
// betrag ist im ASVG das MONATSbrutto, im GSVG die JAHRESeinkuenfte.
export function jahresBeitragsgrundlage(betrag, versicherungsart = 'asvg') {
  if (!(betrag > 0)) return 0;
  if (versicherungsart === 'gsvg') {
    const roh = betrag / (1 - (CONST.GSVG_PV + CONST.GSVG_KV));
    return clamp(roh, CONST.GSVG_MIND_BG_MONAT * 12, CONST.HBGL_JAHR);
  }
  return Math.min(betrag * 14, CONST.HBGL_JAHR);
}

export function jahresgutschrift(betrag, versicherungsart = 'asvg') {
  return CONST.KONTOPROZENTSATZ * jahresBeitragsgrundlage(betrag, versicherungsart);
}

// Steuerliche Bemessungsgrundlage fuer den Sonderausgabenabzug beim Nachkauf.
// ASVG: Jahresbrutto minus Dienstnehmeranteil SV. GSVG: die Einkuenfte laut Bescheid
// sind bereits nach Betriebsausgaben (inkl. SVS-Beitraegen) ermittelt.
export function steuerBemessung(betrag, versicherungsart = 'asvg') {
  if (!(betrag > 0)) return 0;
  if (versicherungsart === 'gsvg') return betrag;
  return 12 * betrag - 12 * Math.min(betrag, CONST.HBGL_MONAT) * CONST.SV_DN_SATZ;
}

// Stufenweise Anhebung des Frauen-Regelpensionsalters (von 60 auf 65, abhaengig vom
// Geburtsdatum; danach gleich wie Maenner). Die Stufen beginnen mit dem Jahrgang 1964:
// das urspruengliche BVG von 1992 setzte bei 2.12.1963 an, der Parlamentsbeschluss vom
// Februar 2023 verschob alle Stufen um einen Monat nach hinten. Quelle: OeGB / PV.
const FRAUEN_STUFEN = [
  { bis: '1963-12-31', alter: 60 },
  { bis: '1964-06-30', alter: 60.5 },
  { bis: '1964-12-31', alter: 61 },
  { bis: '1965-06-30', alter: 61.5 },
  { bis: '1965-12-31', alter: 62 },
  { bis: '1966-06-30', alter: 62.5 },
  { bis: '1966-12-31', alter: 63 },
  { bis: '1967-06-30', alter: 63.5 },
  { bis: '1967-12-31', alter: 64 },
  { bis: '1968-06-30', alter: 64.5 },
];

// Anhebung der Korridorpension ab 1.1.2026: Mindestalter von 62 auf 63 und noetige
// Versicherungsmonate von 480 auf 504, quartalsweise um je 2 Monate nach Geburtsdatum.
// Quelle: WKO. Alter in Jahren (Bruchteile = Monate/12).
const KORRIDOR_STUFEN = [
  { bis: '1963-12-31', alter: 62, monate: 480 },
  { bis: '1964-03-31', alter: 62 + 2 / 12, monate: 482 },
  { bis: '1964-06-30', alter: 62 + 4 / 12, monate: 484 },
  { bis: '1964-09-30', alter: 62.5, monate: 486 },
  { bis: '1964-12-31', alter: 62 + 8 / 12, monate: 488 },
  { bis: '1965-03-31', alter: 62 + 10 / 12, monate: 490 },
  { bis: '1965-06-30', alter: 63, monate: 492 },
  { bis: '1965-09-30', alter: 63, monate: 494 },
  { bis: '1965-12-31', alter: 63, monate: 496 },
  { bis: '1966-03-31', alter: 63, monate: 498 },
  { bis: '1966-06-30', alter: 63, monate: 500 },
  { bis: '1966-09-30', alter: 63, monate: 502 },
];

export function korridorVoraussetzungen(geburtsdatum) {
  const g = toDate(geburtsdatum);
  for (const stufe of KORRIDOR_STUFEN) {
    if (g <= toDate(stufe.bis)) return { alter: stufe.alter, monate: stufe.monate };
  }
  return { alter: CONST.KORRIDOR_ALTER, monate: CONST.KORRIDOR_MONATE };
}

export function regelpensionsalter(geschlecht, geburtsdatum) {
  if (geschlecht !== 'frau') return CONST.REGELPENSIONSALTER;
  const g = toDate(geburtsdatum);
  for (const stufe of FRAUEN_STUFEN) {
    if (g <= toDate(stufe.bis)) return stufe.alter;
  }
  return CONST.REGELPENSIONSALTER;
}

// Dienstnehmeranteil an der Sozialversicherung, abhaengig vom Monatsbrutto.
// Bis zur Geringfuegigkeitsgrenze besteht keine Pflichtversicherung -- dann faellt gar
// kein Dienstnehmerbeitrag an (nur der Dienstgeber zahlt Unfallversicherung).
export function svSatzDienstnehmer(bruttoMonat, versicherungsart = 'asvg') {
  if (bruttoMonat <= CONST.GERINGFUEGIGKEIT) return 0;
  if (versicherungsart === 'gsvg') {
    // Selbstaendige zahlen PV und KV zur Gaenze selbst; eine Arbeitslosenversicherung
    // gibt es in der Pflichtversicherung nicht (nur freiwillig, hier nicht abgebildet).
    return CONST.GSVG_PV + CONST.GSVG_KV;
  }
  const alv = CONST.ALV_STUFEN.find((s) => bruttoMonat <= s.bis).satz;
  return CONST.GF_SV_DN_SATZ + alv;
}

// Ab wann besteht Vollversicherung (Kranken- UND Pensionsversicherung)? Genau ueber der
// Geringfuegigkeitsgrenze -- darunter ist man nur unfallversichert.
export function istVollversichert(bruttoMonat) {
  return bruttoMonat > CONST.GERINGFUEGIGKEIT;
}

// Jahresnetto aus einem Dienstverhaeltnis: 14 Bezuege, davon SV und Lohnsteuer.
// Sonderzahlungen werden wie im Pensionsteil mit dem festen Satz nach Freibetrag besteuert.
export function nettoErwerbseinkommenJahr(bruttoMonat, versicherungsart = 'asvg') {
  if (bruttoMonat <= 0) return 0;
  const satz = svSatzDienstnehmer(bruttoMonat, versicherungsart);
  if (versicherungsart === 'gsvg') {
    // Keine Sonderzahlungen: 12 statt 14 Bezuege, dafuer immer die Unfallversicherung.
    const jahr = bruttoMonat * 12;
    const sv = satz * Math.min(jahr, CONST.HBGL_JAHR);
    const uv = CONST.GSVG_UV_MONAT * 12;
    return jahr - sv - uv - tarif(Math.max(0, jahr - sv - uv));
  }
  const lauf = bruttoMonat * 12;
  const sz = bruttoMonat * 2;
  const svLauf = satz * Math.min(lauf, CONST.HBGL_MONAT * 12);
  const svSz = satz * Math.min(sz, CONST.HBGL_JAHR - CONST.HBGL_MONAT * 12);
  // Tarifsteuer minus Verkehrsabsetzbetrag; wird das negativ, greift die SV-Rueck-
  // erstattung ("Negativsteuer"): 55 % der SV-Beitraege, hoechstens 496 EUR.
  const steuerNachVab = tarif(lauf - svLauf) - CONST.VAB;
  const lst = Math.max(0, steuerNachVab);
  const erstattung = steuerNachVab < 0
    ? Math.min(-steuerNachVab, CONST.SV_RUECKERSTATTUNG_SATZ * (svLauf + svSz), CONST.SV_RUECKERSTATTUNG_MAX)
    : 0;
  // Freigrenze: bleiben die sonstigen Bezuege darunter, sind sie zur Gaenze steuerfrei.
  const lstSz = sz <= CONST.SZ_FREIGRENZE
    ? 0
    : Math.max(0, (sz - svSz) - CONST.SZ_FREIBETRAG) * CONST.SZ_STEUERSATZ;
  return lauf + sz - svLauf - svSz - lst - lstSz + erstattung;
}

export function versicherungsmonate({
  geburtsdatum, kontoStichtag, vmStart, antrittsalter, ausstiegsalter, wvAn, gfEinkommen = 0,
  nachkaufMonate = 0, nkMaxMonate = CONST.NK_MAX_MONATE,
}) {
  const ausstieg = ausstiegsdatum(geburtsdatum, ausstiegsalter);
  const stichtagP = stichtagPension(geburtsdatum, antrittsalter);
  const arbeitsmonate = Math.max(0, monateZwischen(kontoStichtag, ausstieg));
  const lueckenmonate = Math.max(0, monateZwischen(ausstieg, stichtagP));
  // Die Lueckenmonate zaehlen als Versicherungsmonate, wenn entweder freiwillig
  // weiterversichert ODER ueber der Geringfuegigkeitsgrenze angestellt (dann besteht
  // Pflichtversicherung). Beides zusammen zaehlt trotzdem nur einmal.
  const lueckeZaehlt = istVollversichert(gfEinkommen) || wvAn;
  const vmOhneNachkauf = vmStart + arbeitsmonate + (lueckeZaehlt ? lueckenmonate : 0);
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
  konto, gehalt, versicherungsart = 'asvg', arbeitsmonate, lueckenmonate, wvAn,
  gfEinkommen = 0, nkMonate,
}) {
  const jg = jahresgutschrift(gehalt, versicherungsart);
  let g = konto + (arbeitsmonate / 12) * jg;
  if (istVollversichert(gfEinkommen)) {
    // Ueber der Grenze besteht Pflichtversicherung. Im ASVG mit Sonderzahlungen (x14),
    // im GSVG ohne (x12, dafuer mit Hinzurechnung der Beitraege).
    // Der Zuverdienst-Regler meint in beiden Systemen den Betrag VOR SV-Abzug (im ASVG
    // das Brutto, im GSVG den Gewinn vor Beitraegen = Beitragsgrundlage). Deshalb hier
    // KEIN Fixpunkt wie beim Jahreseinkommen laut Bescheid, sondern direkt 1,78 % der
    // (auf Mindest-/Hoechstgrundlage begrenzten) Grundlage -- passend zur Netto-Rechnung.
    g += (lueckenmonate / 12) * (versicherungsart === 'gsvg'
      ? CONST.KONTOPROZENTSATZ * clamp(gfEinkommen * 12, CONST.GSVG_MIND_BG_MONAT * 12, CONST.HBGL_JAHR)
      : jahresgutschrift(gfEinkommen, 'asvg'));
  } else if (wvAn) {
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
  korridor = { alter: CONST.KORRIDOR_ALTER, monate: CONST.KORRIDOR_MONATE },
}) {
  if (antrittsalter < regelalter) {
    if (antrittsalter < korridor.alter) {
      return {
        ok: false, fehlercode: 'ZU_FRUEH', fehlendeMonate: null, abschlag: null, zuschlag: null, bruttoMonat: null,
      };
    }
    if (vm < korridor.monate) {
      return {
        ok: false,
        fehlercode: 'ZU_WENIG_MONATE',
        fehlendeMonate: korridor.monate - vm,
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

// Pensionistenabsetzbetrag: voll bis PAB_VOLL_BIS, dann linear einschleifend auf 0.
// Bemessung sind die zu versteuernden laufenden Pensionseinkuenfte (ohne Sonderzahlungen).
export function pensionistenabsetzbetrag(zvLaufend) {
  if (zvLaufend <= CONST.PAB_VOLL_BIS) return CONST.PAB;
  if (zvLaufend >= CONST.PAB_NULL_AB) return 0;
  return CONST.PAB * (CONST.PAB_NULL_AB - zvLaufend) / (CONST.PAB_NULL_AB - CONST.PAB_VOLL_BIS);
}

export function nettoMonat(bruttoMonat) {
  const lauf = 12 * bruttoMonat;
  const sz = 2 * bruttoMonat;
  const kv = CONST.KV_PENSION * (lauf + sz);
  const zvLaufend = lauf * (1 - CONST.KV_PENSION);
  const lst = Math.max(0, tarif(zvLaufend) - pensionistenabsetzbetrag(zvLaufend));
  // Sonderzahlungen: bis zur Freigrenze steuerfrei, sonst 6 % nach Freibetrag.
  const lstSz = sz <= CONST.SZ_FREIGRENZE
    ? 0
    : Math.max(0, sz * (1 - CONST.KV_PENSION) - CONST.SZ_FREIBETRAG) * CONST.SZ_STEUERSATZ;
  return ((lauf + sz - kv - lst - lstSz) / 14) * CONST.NETTO_KALIBRIERUNG;
}

export function nachkaufSteuereffekt({
  nkMonate, gehalt, versicherungsart = 'asvg', nachkaufJahre, jahreBisAntritt = 0,
}) {
  const kostenVoll = nkMonate * CONST.NK_KOSTEN_MONAT;
  if (kostenVoll <= 0) {
    return {
      kostenVoll: 0, ratePerJahr: 0, ersparnis: 0, kostenNetto: 0, effSatz: 0, etfWert: 0,
    };
  }
  const bemessung = steuerBemessung(gehalt, versicherungsart);
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

export function kapitalbedarf({
  lueckenmonate, lebenshaltung, wvAn, gfEinkommen = 0, versicherungsart = 'asvg',
}) {
  // Ueber der Geringfuegigkeitsgrenze besteht Pflichtversicherung: die
  // KV-Selbstversicherung entfaellt, eine freiwillige PV-Weiterversicherung ist daneben
  // weder noetig noch vorgesehen. Darunter bleibt beides bestehen -- ein geringfuegiges
  // Einkommen bringt zwar Geld, aber keinen Versicherungsschutz.
  const vollversichert = istVollversichert(gfEinkommen);
  const svJahr = vollversichert
    ? 0
    : CONST.KV_SELBST_MONAT * 12 + (wvAn ? CONST.WV_BG_MIN * CONST.WV_SATZ * 12 : 0);
  // Das Erwerbseinkommen in der Luecke mindert den Kapitalbedarf.
  const nettoEinkommenJahr = nettoErwerbseinkommenJahr(gfEinkommen, versicherungsart);
  const bedarfProJahr = Math.max(0, lebenshaltung * 12 + svJahr - nettoEinkommenJahr);
  const kapital = (lueckenmonate / 12) * bedarfProJahr;
  return {
    svJahr, nettoEinkommenJahr, vollversichert, kapital, kapitalPuffer: kapital * 1.15,
  };
}

// "gelb" nur, wenn der Nachkauf für den Anspruch tatsächlich nötig war – also unterhalb
// des Regelpensionsalters, wo die Korridorpension 504 Versicherungsmonate verlangt. Ab dem
// Regelpensionsalter erhöht ein Nachkauf bloß die Pension, er entscheidet nichts.
function ampelFuer(anspruch, monate, antrittsalter, regelalter, korridor) {
  if (!anspruch.ok) return 'rot';
  const nachkaufNoetig = antrittsalter < regelalter
    && monate.vmOhneNachkauf < korridor.monate;
  return nachkaufNoetig ? 'gelb' : 'gruen';
}

// Marginale Netto-Wirkung einer zusätzlichen Bruttopension: Differenz der Nettopension
// mit und ohne den Zuschlag. Berücksichtigt damit Progression, KV-Beitrag und
// Sonderzahlungsbesteuerung am tatsächlichen Pensionsniveau.
function zusatzNetto(bruttoMonat, zusatzBrutto) {
  return nettoMonat(bruttoMonat + zusatzBrutto) - nettoMonat(bruttoMonat);
}

// Steuerersparnis, wenn genau ein Nachkauf-Monat in einem Jahr als Sonderausgabe
// abgesetzt wird (Grenzsteuersatz beim gegebenen Gehalt).
function nachkaufErsparnisEinMonat(gehalt, versicherungsart = 'asvg') {
  const bemessung = steuerBemessung(gehalt, versicherungsart);
  return tarif(bemessung) - tarif(Math.max(0, bemessung - CONST.NK_KOSTEN_MONAT));
}

// Wie lange trägt ein Kapital eine monatliche Entnahme, wenn der Restbestand weiter
// verzinst wird? Klassische Rentenformel, nach der Laufzeit aufgelöst:
//   K = P × (1 − (1+i)^−n) / i   →   n = −ln(1 − K·i/P) / ln(1+i)
// Ergebnis in Jahren; null, wenn die Entnahme die laufenden Zinsen nicht übersteigt –
// dann reicht das Kapital ewig und amortisiert sich nie.
export function entnahmedauerJahre(kapital, entnahmeProMonat, jahresRendite) {
  if (entnahmeProMonat <= 0) return null;
  const i = (1 + jahresRendite) ** (1 / 12) - 1;
  if (i <= 0) return kapital / entnahmeProMonat / 12;
  const zinsProMonat = kapital * i;
  if (entnahmeProMonat <= zinsProMonat) return null;
  const n = -Math.log(1 - zinsProMonat / entnahmeProMonat) / Math.log(1 + i);
  return n / 12;
}

// Was kostet eine Stundenreduzierung um X % an monatlicher Pension? Betroffen sind nur
// die noch offenen Erwerbsmonate (Gutschrift-Stichtag bis Ausstieg) – bereits erworbene
// Kontogutschrift, Weiterversicherung und Nachkauf bleiben unberührt.
//
// Wichtig: Liegt das Gehalt über der Höchstbeitragsgrundlage, wirkt eine Reduktion gar
// nicht oder nur teilweise, weil die Gutschrift ohnehin bei der HBGl gedeckelt ist.
export function stundenreduzierungEffekt({
  reduktionProzent, gehalt, versicherungsart = 'asvg', konto, arbeitsmonate, lueckenmonate, wvAn, nkMonate,
  antrittsalter, vm, regelalter, korridor, bruttoMonat, nettoMonatVoll, ok,
}) {
  if (!ok || !reduktionProzent) return null;
  const gehaltReduziert = gehalt * (1 - reduktionProzent / 100);
  const gutschriftReduziert = gutschriftBeiAntritt({
    konto, gehalt: gehaltReduziert, versicherungsart, arbeitsmonate, lueckenmonate, wvAn, nkMonate,
  });
  const anspruchReduziert = anspruchUndBrutto({
    antrittsalter, vm, gutschrift: gutschriftReduziert, regelalter, korridor,
  });
  if (!anspruchReduziert.ok) return null;
  const bruttoReduziert = anspruchReduziert.bruttoMonat;
  const nettoReduziert = nettoMonat(bruttoReduziert);
  // Beitragswirksames Jahreseinkommen vor/nach Reduktion (auf HBGl gedeckelt)
  const wirksamVoll = jahresBeitragsgrundlage(gehalt, versicherungsart);
  const wirksamReduziert = jahresBeitragsgrundlage(gehaltReduziert, versicherungsart);
  return {
    reduktionProzent,
    gehaltReduziert,
    bruttoReduziert,
    nettoReduziert,
    verlustBrutto: bruttoMonat - bruttoReduziert,
    verlustNetto: nettoMonatVoll - nettoReduziert,
    // Bruttoeinkommen, das pro Jahr wegfällt (ungedeckelt – das spürt man im Geldbeutel)
    einkommensverlustProJahr: versicherungsart === 'gsvg'
      ? gehalt - gehaltReduziert
      : (gehalt - gehaltReduziert) * 14,
    // Anteil der Reduktion, der sich überhaupt auf die Pension auswirkt
    hbglGedeckelt: wirksamVoll >= CONST.HBGL_JAHR,
    wirksameReduktionProzent: wirksamVoll > 0
      ? ((wirksamVoll - wirksamReduziert) / wirksamVoll) * 100
      : 0,
  };
}

// Faustregel-Amortisation für den Kauf von genau 1 Nachkauf-Monat (unabhängig von der
// tatsächlich gewählten Anzahl). Durchgehend in Netto-Größen gerechnet: Kostenseite nach
// Steuerersparnis, Pensionsseite nach KV und Lohnsteuer – nur so sind die beiden Seiten
// überhaupt vergleichbar.
export function amortisationEinMonat({
  abschlag, zuschlag, jahreBisAntritt, ok, gehalt, versicherungsart = 'asvg', bruttoMonat,
}) {
  if (!ok) return null;
  const kostenBrutto = CONST.NK_KOSTEN_MONAT;
  const steuerersparnis = nachkaufErsparnisEinMonat(gehalt, versicherungsart);
  const kostenNetto = kostenBrutto - steuerersparnis;
  const faktor = abschlag > 0 ? (1 - abschlag) : (1 + zuschlag);
  const zusatzBruttoProMonat = (CONST.NK_GUTSCHRIFT_MONAT / 14) * faktor;
  const zusatzNettoProMonat = zusatzNetto(bruttoMonat, zusatzBruttoProMonat);
  const jahreEinfach = kostenNetto / zusatzNettoProMonat / 12;
  // Alternativszenario: die Nettokosten werden bis zum Antritt angelegt und danach
  // monatlich um die entgangene Zusatzpension entnommen – der Restbestand verzinst sich
  // dabei weiter. Beide Dauern zählen ab Pensionsbeginn und sind damit vergleichbar.
  const jbA = Math.max(0, jahreBisAntritt);
  const kapitalBeiAntritt = kostenNetto * (1 + CONST.AMORTISATION_RENDITE_REAL) ** jbA;
  const jahreVsAlternative = entnahmedauerJahre(
    kapitalBeiAntritt, zusatzNettoProMonat, CONST.AMORTISATION_RENDITE_REAL,
  );
  return {
    kostenBrutto,
    steuerersparnis,
    kostenNetto,
    zusatzBruttoProMonat,
    zusatzNettoProMonat,
    kapitalBeiAntritt,
    jahreEinfach,
    jahreVsAlternative,
  };
}

// Amortisation der freiwilligen PV-Weiterversicherung: lohnt sich 1 Jahr Beitrag bei
// gegebener Beitragsgrundlage (Minimum oder aktuelles Gehalt, gedeckelt) überhaupt?
// Ebenfalls netto gerechnet. Auf der Kostenseite ist netto = brutto: die Beiträge fallen
// in der Erwerbslücke an, wo es mangels Einkommen nichts abzusetzen gibt.
export function wvAmortisation(basis, { abschlag, zuschlag, ok, bruttoMonat }) {
  if (!ok) return null;
  const beitragProJahr = basis * CONST.WV_SATZ * 12;
  const gutschriftProJahr = CONST.KONTOPROZENTSATZ * basis * 12;
  const faktor = abschlag > 0 ? (1 - abschlag) : (1 + zuschlag);
  const zusatzBruttoProMonat = (gutschriftProJahr / 14) * faktor;
  const zusatzNettoProMonat = zusatzNetto(bruttoMonat, zusatzBruttoProMonat);
  const jahreEinfach = beitragProJahr / zusatzNettoProMonat / 12;
  return {
    basis, beitragProJahr, zusatzBruttoProMonat, zusatzNettoProMonat, jahreEinfach,
  };
}

export function berechnePensionsszenario(eingaben) {
  const antrittsalter = Math.max(eingaben.antrittsalter, eingaben.ausstiegsalter);
  const regelalter = regelpensionsalter(eingaben.geschlecht, eingaben.geburtsdatum);
  const korridor = korridorVoraussetzungen(eingaben.geburtsdatum);
  const monate = versicherungsmonate({ ...eingaben, antrittsalter, regelalter });
  const gutschrift = gutschriftBeiAntritt({
    konto: eingaben.konto,
    gehalt: eingaben.gehalt,
    versicherungsart: eingaben.versicherungsart,
    arbeitsmonate: monate.arbeitsmonate,
    lueckenmonate: monate.lueckenmonate,
    wvAn: eingaben.wvAn,
    gfEinkommen: eingaben.gfEinkommen,
    nkMonate: monate.nkMonate,
  });
  const anspruch = anspruchUndBrutto({
    antrittsalter, vm: monate.vm, gutschrift, regelalter, korridor,
  });
  const netto = anspruch.ok ? nettoMonat(anspruch.bruttoMonat) : null;
  const jahreBisAntritt = monateZwischen(eingaben.kontoStichtag, monate.stichtagPension) / 12;
  const nachkauf = nachkaufSteuereffekt({
    nkMonate: monate.nkMonate,
    gehalt: eingaben.gehalt,
    versicherungsart: eingaben.versicherungsart,
    nachkaufJahre: eingaben.nachkaufJahre,
    jahreBisAntritt,
  });
  const kapital = kapitalbedarf({
    lueckenmonate: monate.lueckenmonate,
    lebenshaltung: eingaben.lebenshaltung,
    wvAn: eingaben.wvAn,
    gfEinkommen: eingaben.gfEinkommen,
    versicherungsart: eingaben.versicherungsart,
  });
  const amortisation = amortisationEinMonat({
    abschlag: anspruch.abschlag,
    zuschlag: anspruch.zuschlag,
    jahreBisAntritt,
    ok: anspruch.ok,
    gehalt: eingaben.gehalt,
    versicherungsart: eingaben.versicherungsart,
    bruttoMonat: anspruch.bruttoMonat,
  });
  const wvArgs = {
    abschlag: anspruch.abschlag,
    zuschlag: anspruch.zuschlag,
    ok: anspruch.ok,
    bruttoMonat: anspruch.bruttoMonat,
  };
  // Die Weiterversicherung rechnet mit einer MONATLICHEN Beitragsgrundlage. Im GSVG
  // ist die Eingabe aber ein Jahresbetrag -- also erst auf den Monat umlegen.
  const monatsBGAktuell = jahresBeitragsgrundlage(eingaben.gehalt, eingaben.versicherungsart) / 12;
  const wvVergleich = {
    minimum: wvAmortisation(CONST.WV_BG_MIN, wvArgs),
    aktuell: wvAmortisation(clamp(monatsBGAktuell, CONST.WV_BG_MIN, CONST.WV_BG_MAX), wvArgs),
  };
  const stundenreduzierung = stundenreduzierungEffekt({
    reduktionProzent: eingaben.reduktionProzent,
    gehalt: eingaben.gehalt,
    versicherungsart: eingaben.versicherungsart,
    konto: eingaben.konto,
    arbeitsmonate: monate.arbeitsmonate,
    lueckenmonate: monate.lueckenmonate,
    wvAn: eingaben.wvAn,
    nkMonate: monate.nkMonate,
    antrittsalter,
    vm: monate.vm,
    regelalter,
    korridor,
    bruttoMonat: anspruch.bruttoMonat,
    nettoMonatVoll: netto,
    ok: anspruch.ok,
  });

  return {
    eingaben: { ...eingaben, antrittsalter },
    regelalter,
    korridor,
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
    stundenreduzierung,
    ampel: ampelFuer(anspruch, monate, antrittsalter, regelalter, korridor),
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
  const spaetererAntritt = Math.max(segA.antrittM, segB.antrittM);
  // Zwei Horizonte: bis PLAUSIBEL (40 Jahre nach dem späteren Antritt) ist ein
  // Schnittpunkt lebensnah, darüber hinaus nur noch rechnerisch interessant. Gesucht wird
  // bis SUCHE, damit ein sehr späterer Ausgleich ausgewiesen statt verschwiegen wird.
  const horizontPlausibel = spaetererAntritt + 480;
  const horizontSuche = spaetererAntritt + 1800;
  const breakpoints = [...new Set([segA.ausstiegM, segA.antrittM, segB.ausstiegM, segB.antrittM])]
    .sort((a, b) => a - b);
  const punkte = [...breakpoints, horizontPlausibel, horizontSuche];
  const diff = (m) => segmentWert(segA, m) - segmentWert(segB, m);
  const dominanzBei = (m) => {
    const d = diff(m);
    return d > 0.005 ? 'A' : d < -0.005 ? 'B' : 'gleich';
  };

  for (let i = 0; i < punkte.length - 1; i++) {
    const m0 = punkte[i];
    const m1 = punkte[i + 1];
    const d0 = diff(m0);
    const d1 = diff(m1);
    let treffer = null;
    if (Math.abs(d0) < 0.005) {
      treffer = m0;
    } else if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) {
      treffer = m0 + (d0 / (d0 - d1)) * (m1 - m0);
    }
    if (treffer !== null) {
      const alterMonate = Math.round(treffer);
      return {
        gefunden: true,
        alterMonate,
        jenseitsHorizont: alterMonate > horizontPlausibel,
        // Wer liegt im lebensnahen Zeitraum vorn (nur bei sehr spätem Ausgleich relevant)
        dominanzPlausibel: dominanzBei(horizontPlausibel),
        // Wer ist nach dem Schnittpunkt wirtschaftlicher – hinter dem letzten Knick ist
        // die Differenz linear, der Wert am Suchhorizont gilt also dauerhaft.
        dominanzDanach: dominanzBei(horizontSuche),
      };
    }
  }
  return {
    gefunden: false,
    dominanz: dominanzBei(horizontSuche),
  };
}
