import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONST, tarif, monateZwischen, stichtagPension, ausstiegsdatum,
  berechnePensionsszenario, addMonths, breakEvenPunkt, regelpensionsalter,
  amortisationEinMonat, wvAmortisation, entnahmedauerJahre,
} from './pension.js';

// Referenzperson: geb. 24.02.1983, Konto 22.812 € per 01.01.2026, 203 VM per Stichtag,
// Einkommen über HBGL, durchgehend versichert (Ausstieg = Antritt).
const basis = {
  geschlecht: 'mann',
  geburtsdatum: '1983-02-24',
  konto: 22812,
  kontoStichtag: '2026-01-01',
  vmStart: 203,
  gehalt: 9000,
  lebenshaltung: 2000,
  nachkaufMonate: 0,
  nachkaufJahre: 5,
  wvAn: true,
};

test('Datumslogik: stichtagPension = erster Monatserster nach dem Geburtstag', () => {
  assert.deepEqual(stichtagPension('1983-02-24', 63), new Date(2046, 2, 1));
});

test('Datumslogik: ausstiegsdatum = Monatsende des Geburtstagsmonats', () => {
  assert.deepEqual(ausstiegsdatum('1983-02-24', 60), new Date(2043, 1, 28));
});

test('Monatszählung: 203 + 242 = 445 Monate, Korridor fehlt um genau 59 Monate', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 63, antrittsalter: 63,
  });
  assert.equal(r.monate.arbeitsmonate, 242);
  assert.equal(r.monate.lueckenmonate, 0);
  assert.equal(r.monate.vmOhneNachkauf, 445);
  assert.equal(CONST.KORRIDOR_MONATE - r.monate.vmOhneNachkauf, 59);

  const mitNachkauf = berechnePensionsszenario({
    ...basis, ausstiegsalter: 63, antrittsalter: 63, nachkaufMonate: 59,
  });
  assert.equal(mitNachkauf.monate.nkMonate, 59);
  assert.equal(mitNachkauf.monate.vm, 504);
});

test('Antritt 63 (mit ausreichend Versicherungsmonaten): brutto ~3.697 €, Abschlag 10,2 %', () => {
  // vmStart wird auf 262 angehoben, um die 504-Monats-Hürde ohne Nachkauf zu
  // erfüllen – so wird die Abschlagsformel isoliert vom Nachkauf-Gutschriftbonus geprüft.
  const r = berechnePensionsszenario({
    ...basis, vmStart: 262, ausstiegsalter: 63, antrittsalter: 63,
  });
  assert.ok(r.ok);
  assert.equal(r.monate.vm, 504);
  assert.ok(Math.abs(r.abschlag - 0.102) < 1e-9);
  assert.ok(Math.abs(r.bruttoMonat - 3697) < 20, `bruttoMonat=${r.bruttoMonat}`);
});

test('Antritt 65: brutto ~4.364 €, kein Abschlag', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 65, antrittsalter: 65,
  });
  assert.ok(r.ok);
  assert.equal(r.abschlag, 0);
  assert.equal(r.zuschlag, 0);
  assert.ok(Math.abs(r.bruttoMonat - 4364) < 20, `bruttoMonat=${r.bruttoMonat}`);
});

test('Antritt 65: netto ~3.174 €', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 65, antrittsalter: 65,
  });
  assert.ok(Math.abs(r.nettoMonat - 3174) < 50, `nettoMonat=${r.nettoMonat}`);
});

test('Antritt 68: Zuschlag 15,3 % (Deckel greift)', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 68, antrittsalter: 68,
  });
  assert.ok(Math.abs(r.zuschlag - 0.153) < 1e-9);
});

test('Antritt 62: kein Anspruch (Korridor erst ab 63)', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 62, antrittsalter: 62,
  });
  assert.equal(r.ok, false);
  assert.equal(r.fehlercode, 'ZU_FRUEH');
  assert.equal(r.bruttoMonat, null);
});

test('tarif(): Grenzsteuerlogik im 40/48-%-Band', () => {
  const diff = tarif(92973) - tarif(72071);
  assert.ok(Math.abs(diff - 10033) < 5, `diff=${diff}`);
});

test('Nachkauf aus + Antritt 63 + vm < 504: Status rot, keine Pensionsbeträge', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 63, antrittsalter: 63,
  });
  assert.equal(r.ampel, 'rot');
  assert.equal(r.ok, false);
  assert.equal(r.fehlercode, 'ZU_WENIG_MONATE');
  assert.equal(r.fehlendeMonate, 59);
  assert.equal(r.bruttoMonat, null);
  assert.equal(r.nettoMonat, null);
});

test('Nachkauf an + Antritt 63 + ausreichend Monate: Status gelb', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 63, antrittsalter: 63, nachkaufMonate: 59,
  });
  assert.equal(r.ampel, 'gelb');
  assert.ok(r.ok);
});

test('Antritt 65 ohne Nachkaufbedarf: Status grün', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 65, antrittsalter: 65,
  });
  assert.equal(r.ampel, 'gruen');
});

test('monateZwischen: gleiche Tageszahl ergibt exakte Monatsdifferenz', () => {
  assert.equal(monateZwischen('2026-01-01', '2046-03-01'), 242);
});

test('Nachkauf-Steuereffekt: Ersparnis liegt zwischen 0 und den vollen Kosten', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 63, antrittsalter: 63, nachkaufMonate: 59, nachkaufJahre: 5,
  });
  assert.equal(r.nachkauf.kostenVoll, 59 * CONST.NK_KOSTEN_MONAT);
  assert.ok(r.nachkauf.ersparnis > 0);
  assert.ok(r.nachkauf.ersparnis < r.nachkauf.kostenVoll);
  assert.ok(Math.abs(r.nachkauf.ratePerJahr - r.nachkauf.kostenVoll / 5) < 1e-9);
});

test('Nachkauf-Alternative: Nettokosten mit 5%/Jahr bis Antritt verzinst (ETF statt Nachkauf)', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 63, antrittsalter: 63, nachkaufMonate: 59, nachkaufJahre: 5,
  });
  const jahre = monateZwischen('2026-01-01', r.monate.stichtagPension) / 12;
  const erwartet = r.nachkauf.kostenNetto * (1.05 ** jahre);
  assert.ok(Math.abs(r.nachkauf.etfWert - erwartet) < 1e-6);
  assert.ok(r.nachkauf.etfWert > r.nachkauf.kostenNetto, 'sollte über die Jahre wachsen');
});

test('Nachkauf-Alternative: 0 ohne Nachkauf', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 65, antrittsalter: 65,
  });
  assert.equal(r.nachkauf.etfWert, 0);
});

test('regelpensionsalter: Männer immer 65, unabhängig vom Geburtsdatum', () => {
  assert.equal(regelpensionsalter('mann', '1965-01-01'), 65);
  assert.equal(regelpensionsalter('mann', '2000-01-01'), 65);
});

test('regelpensionsalter: Frauen-Übergangsjahrgänge laut Stufenplan', () => {
  assert.equal(regelpensionsalter('frau', '1962-01-01'), 60);
  assert.equal(regelpensionsalter('frau', '1965-01-01'), 62);
  assert.equal(regelpensionsalter('frau', '1970-01-01'), 65);
});

test('Frau mit Regelpensionsalter 62: voller Anspruch (0 Abschlag) genau am eigenen Regelalter', () => {
  const r = berechnePensionsszenario({
    ...basis, geschlecht: 'frau', geburtsdatum: '1965-01-01', ausstiegsalter: 62, antrittsalter: 62,
  });
  assert.ok(r.ok);
  assert.equal(r.regelalter, 62);
  assert.equal(r.abschlag, 0);
  assert.equal(r.zuschlag, 0);
});

test('Frau mit Regelpensionsalter 62: 2 Jahre früher (60) unterhalb Korridor-Untergrenze -> kein Anspruch', () => {
  const r = berechnePensionsszenario({
    ...basis, geschlecht: 'frau', geburtsdatum: '1965-01-01', ausstiegsalter: 60, antrittsalter: 60,
  });
  assert.equal(r.ok, false);
  assert.equal(r.fehlercode, 'ZU_FRUEH');
});

test('Frau mit Regelpensionsalter 64: Korridorpension mit 1 Jahr Abschlag bei Antritt 63', () => {
  const r = berechnePensionsszenario({
    ...basis, geschlecht: 'frau', geburtsdatum: '1967-03-01', vmStart: 500, ausstiegsalter: 63, antrittsalter: 63,
  });
  assert.equal(r.regelalter, 64);
  assert.ok(r.ok, `erwartete Anspruch, vm=${r.monate.vm}`);
  assert.ok(Math.abs(r.abschlag - 0.051) < 1e-9);
});

test('addMonths: addiert Kalendermonate', () => {
  assert.deepEqual(addMonths('2000-01-01', 24), new Date(2002, 0, 1));
});

test('breakEvenPunkt: findet Schnittpunkt bei höherer Pension trotz Anfangskosten', () => {
  const ergebnisA = {
    ok: true,
    monate: { ausstieg: new Date(2060, 0, 1), stichtagPension: new Date(2063, 0, 1) },
    kapital: { kapitalPuffer: 36000 },
    nachkauf: { kostenNetto: 0 },
    nettoMonat: 1400,
  };
  const ergebnisB = {
    ok: true,
    monate: { ausstieg: new Date(2065, 0, 1), stichtagPension: new Date(2065, 0, 1) },
    kapital: { kapitalPuffer: 0 },
    nachkauf: { kostenNetto: 0 },
    nettoMonat: 1300,
  };
  const be = breakEvenPunkt({ geburtsdatum: '2000-01-01', ergebnisA, ergebnisB });
  assert.equal(be.gefunden, true);
  assert.equal(be.alterMonate, 804); // 67 Jahre exakt
});

test('breakEvenPunkt: kein Schnittpunkt, wenn ein Szenario durchgehend dominiert', () => {
  const ergebnisA = {
    ok: true,
    monate: { ausstieg: new Date(2060, 0, 1), stichtagPension: new Date(2063, 0, 1) },
    kapital: { kapitalPuffer: 36000 },
    nachkauf: { kostenNetto: 0 },
    nettoMonat: 1000,
  };
  const ergebnisB = {
    ok: true,
    monate: { ausstieg: new Date(2065, 0, 1), stichtagPension: new Date(2065, 0, 1) },
    kapital: { kapitalPuffer: 0 },
    nachkauf: { kostenNetto: 0 },
    nettoMonat: 1500,
  };
  const be = breakEvenPunkt({ geburtsdatum: '2000-01-01', ergebnisA, ergebnisB });
  assert.equal(be.gefunden, false);
  assert.equal(be.dominanz, 'B');
});

test('breakEvenPunkt: sehr späten Ausgleich ausweisen statt "kein Ausgleich"', () => {
  // Späterer Antritt kostet mehr UND startet später – der Vorsprung aus dem zusätzlichen
  // Bezugsjahr verschiebt den Schnittpunkt weit hinaus, er existiert aber.
  const ergebnisA = {
    ok: true,
    monate: { ausstieg: new Date(2043, 1, 28), stichtagPension: new Date(2048, 2, 1) },
    kapital: { kapitalPuffer: 177002 },
    nachkauf: { kostenNetto: 0 },
    nettoMonat: 2820,
  };
  const ergebnisB = {
    ok: true,
    monate: { ausstieg: new Date(2043, 1, 28), stichtagPension: new Date(2049, 2, 1) },
    kapital: { kapitalPuffer: 212403 },
    nachkauf: { kostenNetto: 0 },
    nettoMonat: 2933,
  };
  const be = breakEvenPunkt({ geburtsdatum: '1983-02-24', ergebnisA, ergebnisB });
  assert.equal(be.gefunden, true);
  assert.equal(be.jenseitsHorizont, true);
  assert.equal(be.dominanzPlausibel, 'A');
  // B hat die höhere laufende Pension, ist also nach dem Schnittpunkt vorn
  assert.equal(be.dominanzDanach, 'B');
  // ~Alter 117: A liegt bei B-Antritt um Kostendifferenz + ein Bezugsjahr vorne
  assert.ok(Math.abs(be.alterMonate / 12 - 117.1) < 0.5, `Alter=${be.alterMonate / 12}`);
});

test('breakEvenPunkt: lebensnaher Schnittpunkt wird nicht als jenseits markiert', () => {
  const ergebnisA = {
    ok: true,
    monate: { ausstieg: new Date(2043, 1, 28), stichtagPension: new Date(2048, 2, 1) },
    kapital: { kapitalPuffer: 177002 },
    nachkauf: { kostenNetto: 0 },
    nettoMonat: 2820,
  };
  const ergebnisB = {
    ok: true,
    monate: { ausstieg: new Date(2043, 1, 28), stichtagPension: new Date(2049, 2, 1) },
    kapital: { kapitalPuffer: 190000 },
    nachkauf: { kostenNetto: 0 },
    nettoMonat: 3200,
  };
  const be = breakEvenPunkt({ geburtsdatum: '1983-02-24', ergebnisA, ergebnisB });
  assert.equal(be.gefunden, true);
  assert.equal(be.jenseitsHorizont, false);
  // Nach dem Schnittpunkt liegt das Szenario mit der höheren laufenden Pension vorn
  assert.equal(be.dominanzDanach, 'B');
});

test('breakEvenPunkt: null, wenn ein Szenario keinen Anspruch hat', () => {
  const be = breakEvenPunkt({
    geburtsdatum: '2000-01-01',
    ergebnisA: { ok: false },
    ergebnisB: { ok: true, monate: {}, kapital: {}, nachkauf: {}, nettoMonat: 1 },
  });
  assert.equal(be, null);
});

test('Kapitalbedarf: Lückenjahre × (Lebenshaltung + SV-Kosten), Puffer +15 %', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 60, antrittsalter: 63, nachkaufMonate: 59, wvAn: true,
  });
  assert.ok(r.monate.lueckenmonate > 0);
  assert.ok(Math.abs(r.kapital.kapitalPuffer - r.kapital.kapital * 1.15) < 1e-6);
});

const amArgs = {
  ok: true, abschlag: 0, zuschlag: 0, jahreBisAntritt: 0, gehalt: 9000, bruttoMonat: 4364,
};

test('amortisationEinMonat: null ohne Anspruch', () => {
  assert.equal(amortisationEinMonat({ ...amArgs, ok: false }), null);
});

test('amortisationEinMonat: rechnet netto auf beiden Seiten', () => {
  const r = amortisationEinMonat(amArgs);
  // Kostenseite: Bruttopreis minus Steuerersparnis
  assert.equal(r.kostenBrutto, CONST.NK_KOSTEN_MONAT);
  assert.ok(r.steuerersparnis > 0, 'Steuerersparnis muss greifen');
  assert.ok(Math.abs(r.kostenNetto - (r.kostenBrutto - r.steuerersparnis)) < 1e-9);
  assert.ok(r.kostenNetto < r.kostenBrutto);

  // Ertragsseite: Nettopension liegt unter der Bruttopension
  assert.ok(Math.abs(r.zusatzBruttoProMonat - CONST.NK_GUTSCHRIFT_MONAT / 14) < 1e-9);
  assert.ok(r.zusatzNettoProMonat > 0);
  assert.ok(r.zusatzNettoProMonat < r.zusatzBruttoProMonat);

  // Amortisation nutzt konsequent die Netto-Größen
  assert.ok(Math.abs(r.jahreEinfach - (r.kostenNetto / r.zusatzNettoProMonat / 12)) < 1e-9);
  // Ohne Zeit bis Antritt entspricht das Kapital den Nettokosten …
  assert.ok(Math.abs(r.kapitalBeiAntritt - r.kostenNetto) < 1e-9);
  // … die Alternativrechnung ist aber trotzdem länger, weil sich der Restbestand
  // während der Entnahme weiter verzinst
  assert.ok(r.jahreVsAlternative > r.jahreEinfach);
});

test('amortisationEinMonat: Abschlag senkt die Zusatzpension und verlängert die Amortisation', () => {
  const ohne = amortisationEinMonat(amArgs);
  const mitAbschlag = amortisationEinMonat({ ...amArgs, abschlag: 0.102 });
  assert.ok(mitAbschlag.zusatzBruttoProMonat < ohne.zusatzBruttoProMonat);
  assert.ok(mitAbschlag.jahreEinfach > ohne.jahreEinfach, 'Abschlag verlängert die Amortisation');
});

test('amortisationEinMonat: Alternativszenario ist eine Entnahmerechnung mit Weiterverzinsung', () => {
  const r = amortisationEinMonat({ ...amArgs, jahreBisAntritt: 20 });
  assert.ok(r.jahreVsAlternative > r.jahreEinfach);
  // Kapital bei Antritt = Nettokosten, bis zum Antritt aufgezinst
  const erwartetesKapital = r.kostenNetto * (1 + CONST.AMORTISATION_RENDITE_REAL) ** 20;
  assert.ok(Math.abs(r.kapitalBeiAntritt - erwartetesKapital) < 1e-9);
  // Danach Entnahmerechnung: identisch zu entnahmedauerJahre()
  const erwartet = entnahmedauerJahre(
    r.kapitalBeiAntritt, r.zusatzNettoProMonat, CONST.AMORTISATION_RENDITE_REAL,
  );
  assert.ok(Math.abs(r.jahreVsAlternative - erwartet) < 1e-9);
  // Weiterverzinsung während der Entnahme verlängert gegenüber bloßem Kapital ÷ Rate
  const ohneWeiterverzinsung = r.kapitalBeiAntritt / r.zusatzNettoProMonat / 12;
  assert.ok(r.jahreVsAlternative > ohneWeiterverzinsung);
});

test('entnahmedauerJahre: Rentenformel, Randfälle', () => {
  // Ohne Rendite ist es die einfache Division
  assert.ok(Math.abs(entnahmedauerJahre(1200, 10, 0) - 10) < 1e-9);
  // Entnahme genau in Höhe der Monatszinsen -> Kapital reicht ewig
  const i = (1 + 0.02) ** (1 / 12) - 1;
  assert.equal(entnahmedauerJahre(10000, 10000 * i, 0.02), null);
  // Knapp darüber -> endliche, aber sehr lange Dauer
  assert.ok(entnahmedauerJahre(10000, 10000 * i * 1.01, 0.02) > 100);
  // Höhere Rendite verlängert die Dauer bei gleicher Entnahme
  assert.ok(entnahmedauerJahre(10000, 200, 0.02) > entnahmedauerJahre(10000, 200, 0));
  // Keine Entnahme -> nie aufgebraucht
  assert.equal(entnahmedauerJahre(10000, 0, 0.02), null);
});

test('wvAmortisation: Amortisationsdauer ist unabhängig von der Beitragsgrundlage', () => {
  const wvArgs = { ok: true, abschlag: 0, zuschlag: 0, bruttoMonat: 4364 };
  const min = wvAmortisation(CONST.WV_BG_MIN, wvArgs);
  const max = wvAmortisation(CONST.WV_BG_MAX, wvArgs);
  // Beitragssatz und Kontoprozentsatz sind beide linear in der Grundlage
  assert.ok(Math.abs(min.jahreEinfach - max.jahreEinfach) < 1e-9);
  // Absolute Beträge skalieren aber mit der Grundlage
  assert.ok(max.beitragProJahr > min.beitragProJahr);
  assert.ok(max.zusatzNettoProMonat > min.zusatzNettoProMonat);
});

test('wvAmortisation: rechnet gegen die Nettopension, Beitrag bleibt brutto', () => {
  const r = wvAmortisation(CONST.WV_BG_MIN, {
    ok: true, abschlag: 0, zuschlag: 0, bruttoMonat: 4364,
  });
  // Keine Steuerersparnis in der Lücke: Beitrag = Grundlage × Satz × 12
  assert.ok(Math.abs(r.beitragProJahr - CONST.WV_BG_MIN * CONST.WV_SATZ * 12) < 1e-9);
  assert.ok(r.zusatzNettoProMonat < r.zusatzBruttoProMonat);
  assert.ok(Math.abs(r.jahreEinfach - (r.beitragProJahr / r.zusatzNettoProMonat / 12)) < 1e-9);
});

test('wvAmortisation: null ohne Anspruch', () => {
  assert.equal(wvAmortisation(CONST.WV_BG_MIN, { ok: false, abschlag: 0, zuschlag: 0, bruttoMonat: 4364 }), null);
});

test('Weiterversicherung amortisiert langsamer als Nachkauf (keine Steuerersparnis in der Lücke)', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 65, antrittsalter: 65,
  });
  assert.ok(
    r.wvVergleich.minimum.jahreEinfach > r.amortisation.jahreEinfach,
    'WV sollte langsamer amortisieren als ein Nachkauf-Monat',
  );
});

test('Ampel: Nachkauf ab Regelpensionsalter macht nicht "gelb" (er ist dort nicht anspruchsrelevant)', () => {
  const mitNachkauf = berechnePensionsszenario({
    ...basis, ausstiegsalter: 65, antrittsalter: 65, nachkaufMonate: 95,
  });
  assert.equal(mitNachkauf.ampel, 'gruen');
  assert.ok(mitNachkauf.monate.nkMonate > 0, 'Nachkauf soll trotzdem wirken');

  // Unterhalb des Regelalters bleibt "gelb" korrekt, wenn der Nachkauf den Anspruch trägt
  const korridor = berechnePensionsszenario({
    ...basis, ausstiegsalter: 63, antrittsalter: 63, nachkaufMonate: 59,
  });
  assert.equal(korridor.ampel, 'gelb');
});

test('berechnePensionsszenario liefert amortisation + wvVergleich', () => {
  const r = berechnePensionsszenario({
    ...basis, ausstiegsalter: 65, antrittsalter: 65,
  });
  assert.ok(r.amortisation, 'amortisation fehlt');
  assert.ok(r.wvVergleich.minimum && r.wvVergleich.aktuell, 'wvVergleich unvollständig');
  assert.ok(r.amortisation.jahreEinfach > 0);
});
