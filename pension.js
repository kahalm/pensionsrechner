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

export function versicherungsmonate({
  geburtsdatum, kontoStichtag, vmStart, antrittsalter, ausstiegsalter, nachkaufAn, wvAn,
}) {
  const ausstieg = ausstiegsdatum(geburtsdatum, ausstiegsalter);
  const stichtagP = stichtagPension(geburtsdatum, antrittsalter);
  const arbeitsmonate = Math.max(0, monateZwischen(kontoStichtag, ausstieg));
  const lueckenmonate = Math.max(0, monateZwischen(ausstieg, stichtagP));
  const vmOhneNachkauf = vmStart + arbeitsmonate + (wvAn ? lueckenmonate : 0);
  const nkMonate = (nachkaufAn && antrittsalter < CONST.REGELPENSIONSALTER)
    ? clamp(CONST.KORRIDOR_MONATE - vmOhneNachkauf, 0, CONST.NK_MAX_MONATE)
    : 0;
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

export function anspruchUndBrutto({ antrittsalter, vm, gutschrift }) {
  if (antrittsalter < CONST.KORRIDOR_ALTER) {
    return {
      ok: false, fehlercode: 'ZU_FRUEH', fehlendeMonate: null, abschlag: null, zuschlag: null, bruttoMonat: null,
    };
  }
  if (antrittsalter < CONST.REGELPENSIONSALTER) {
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
    const abschlag = (CONST.REGELPENSIONSALTER - antrittsalter) * CONST.ABSCHLAG_PA;
    return {
      ok: true, fehlercode: null, fehlendeMonate: 0, abschlag, zuschlag: 0, bruttoMonat: (gutschrift / 14) * (1 - abschlag),
    };
  }
  const zuschlag = Math.min((antrittsalter - CONST.REGELPENSIONSALTER) * CONST.ZUSCHLAG_PA, CONST.ZUSCHLAG_MAX);
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

export function nachkaufSteuereffekt({ nkMonate, gehalt, nachkaufJahre }) {
  const kostenVoll = nkMonate * CONST.NK_KOSTEN_MONAT;
  if (kostenVoll <= 0) {
    return {
      kostenVoll: 0, ratePerJahr: 0, ersparnis: 0, kostenNetto: 0, effSatz: 0,
    };
  }
  const bemessung = 12 * gehalt - 12 * Math.min(gehalt, CONST.HBGL_MONAT) * CONST.SV_DN_SATZ;
  const rate = kostenVoll / nachkaufJahre;
  const ersparnis = nachkaufJahre * (tarif(bemessung) - tarif(Math.max(0, bemessung - rate)));
  const kostenNetto = kostenVoll - ersparnis;
  return {
    kostenVoll, ratePerJahr: rate, ersparnis, kostenNetto, effSatz: ersparnis / kostenVoll,
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

export function berechnePensionsszenario(eingaben) {
  const antrittsalter = Math.max(eingaben.antrittsalter, eingaben.ausstiegsalter);
  const monate = versicherungsmonate({ ...eingaben, antrittsalter });
  const gutschrift = gutschriftBeiAntritt({
    konto: eingaben.konto,
    gehalt: eingaben.gehalt,
    arbeitsmonate: monate.arbeitsmonate,
    lueckenmonate: monate.lueckenmonate,
    wvAn: eingaben.wvAn,
    nkMonate: monate.nkMonate,
  });
  const anspruch = anspruchUndBrutto({ antrittsalter, vm: monate.vm, gutschrift });
  const netto = anspruch.ok ? nettoMonat(anspruch.bruttoMonat) : null;
  const nachkauf = nachkaufSteuereffekt({
    nkMonate: monate.nkMonate, gehalt: eingaben.gehalt, nachkaufJahre: eingaben.nachkaufJahre,
  });
  const kapital = kapitalbedarf({
    lueckenmonate: monate.lueckenmonate, lebenshaltung: eingaben.lebenshaltung, wvAn: eingaben.wvAn,
  });

  return {
    eingaben: { ...eingaben, antrittsalter },
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
    ampel: ampelFuer(anspruch, monate),
  };
}

export function vergleichsdiagramm(eingaben, alterListe = [63, 64, 65, 66, 67, 68]) {
  return alterListe.map((alter) => {
    const r = berechnePensionsszenario({ ...eingaben, ausstiegsalter: alter, antrittsalter: alter });
    return { alter, bruttoMonat: r.ok ? r.bruttoMonat : null, ok: r.ok };
  });
}
