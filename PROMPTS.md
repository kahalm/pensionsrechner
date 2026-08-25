# Die Prompts

Der Ausgangsprompt steht in `SPEC.md`. Hier stehen die Folge-Prompts eines Tages – das,
was aus einem funktionierenden Rechner das fertige Werkzeug gemacht hat. Zeiten in MESZ.

**So wurde redigiert:** Die Prompts stehen in Originalschreibweise, Tippfehler inklusive.
Persönliche Angaben sind entfernt oder verallgemeinert und in `[eckigen Klammern]`
markiert. Alle Zahlenwerte (Beträge, Alter, Monate, Prozentsätze, Jahre) sind durch
`[Zahl]` ersetzt; Aufzählungsnummern („ad 1“) bleiben, Mengenangaben sind ausgeschrieben.
Eingefügte Bildschirmausgaben des Rechners sind zu `[eingefügte Ausgabe …]` gekürzt.
Links zu öffentlichen Quellen bleiben; Links auf den Rechner mit Beispielwerten sind
ersetzt. Weggelassen: Gespräche über Schreibrechte und Setup, rund vierzig
Kurzbestätigungen („ist gepusht“), die 27 automatischen Monitoring-Abfragen und Fragen
ohne Bezug zum Produkt.

---

## 1 · Start und Deployment (10:10–10:40)

> *(Spezifikation, siehe `SPEC.md`)*

> project auf github legen

> docker sollte an dem üblichen ort in meinem stack liegen

## 2 · Vom Rechner zum Vergleichswerkzeug (10:37–11:00)

> erweitere um die möglichkeit zwei sezenarien zu definieren mit vergleich kosten bei ausstieg, kosten nachkauf und monatliche pension. zeige break-even point an

> die werte die man eingibt sollen lokal gespeichert werden. standardmäßig sollen sie beim aufruf leer sein

> mach hinter pensionskonto gutschrift und versichrungsmonate ein (i) mit info wo man das herbekommt. https://www.neuespensionskonto.at/pensionskonto/ -> idaustria -> gutschrift ist auf der übresicht + stichtag. versicherungsmonate sieht man unter Pensionswert

> am pc können die kacheln der szenarien ruhig nebeneinander sein

> beim nachkauf der jahre ein (i) das erklärt was die voraussetzung/maximum ist. möglichkeit bei den persönlichen daten zum eingeben der max nachkaufjahre noch möglich auch mit (i)

> szenario in szenario a umbenennen. szenario b bekommt einen knopf übernimm einstellungen von szenaria a. Kachel soll EXAKT gleich aussehen (bis auf übername der daten der andren seite)

> dann jeweils darunter eine kachel mit den daten von szenario a und daneben daten von szenario b

> dann eine kachel mit vergleich (inkl. break even point)

> und erweitere für mann/frau (glaub die haben andre korridor und so)

## 3 · Layout, Slider, Kopplung (11:15–12:00)

> szenario a und b karten sind im browser noch untereinander.

> gib szenario a auch eine neinstellungen von b übernehmen button

> checkbox nachkaufen weg und mit slider erstetzten. slider geht normal von [Zahl]-max (oben eingestellt). wenn der antritt unter [Zahl] geschoben wird dann soll der nachkaufslider (sofern nidriger) auf das minimum gestellt werden damit der antritt möglich ist. wenn nicht möglich popup das darauf hinweist. und umgekehert wenn antritt unter [Zahl] und der slider wird unter das minimum geschoben das antrittsalter nach oben schieben.

> bei allen slidern ist die wert verloren gegangen - ich seh ihn nicht mehr. sehr doof

> das mit den slidern war temporär - geht eh schon wieder. vermutlich reload problem

## 4 · Die Nachkauf-Frage (11:40–12:56)

> beim nachkauf der jahre - rechne nettowert mit [Zahl] % versteuert bis antritt pension zum kapitalbedarf dazu

> ist das eine faire rechnung oder hab ich da einen denkfehler?

> ich verstehe deine rückfrage nicht

> ich hätte die jahre sofort nachgekauft - die werden ja vermutlich auch indexiert? wäre es in dem fall sinnvoller sie kurz vor antritt zu kaufen (z.b. von [Zahl]-[Zahl])?

> und warum [Zahl] % - anstelle von jahre nachkaufen kann ich das geld ja in etf anlegen und habe dann mit [Zahl] mehr 'startkapital' - die [Zahl] % waren da einfach ca [Zahl] % - kest und nicht zu hoch ansetzten.

> ad 1 ist doch genau andersrum? 2 ja 3 ja

> wenn ich [Zahl] nicht zahle kann ich sie nicht absetzten sondern bekomm nur [Zahl] -> das heißt ich muss die [Zahl] versteuern und dann reinrechnen

> also ich kaufe heuer um [Zahl] euro jahre nach. im steuerausgleich bekomm ich dann z.b. [Zahl] zurück. also waren die nettokosten [Zahl], wenn ich investiert hätte hät ich ehrlicherweise auch nur die [Zahl] anlegen können.

> bzgl. nauchkauf der jahre - [wenn das studium nicht abgeschlossen wurde]. ist das ein problem?

> erweitere das in der erklärung. mach die (i) klickbar -> hint soll dann als popup kommen. dort soll der link (z.b. zur pensionsversicherung) hinterlegt sein.

> muss [man] in den jahren von z.b. [Zahl] - [Zahl] noch in den topf einzahlen? oder ist das optional?

> schalter für weiterversicherung für pension, kv immer rechnen

> beim vergleich noch einen schalter: nachkaufjahre nettowert/nachkaufjahre etf investiert. der preis kommt dann noch zu kosten beim ausstieg dazu

> bau einen info-bereich ein der folg. sachen berechnet: ein monat nachkaufen -> wie lange bis sich das amortisiert. verwende für etf [Zahl] % und schreib in erklärung wieviel das brutto ist wenn man mit ca. [Zahl] % inflation rechnet.

> ausserdem: zahlt es sich finanziell aus die freiwillige weiterversicherung zu zahlen oder nicht (also ab wann amortisiert sich das. enimal mit minimum, einmal mit aktuellen wert weiterzahlen).

> Anspruch nur durch Nachkauf von [Zahl] Monaten erreicht. -> hier schreibt er das nicht richtig hin - rechne genau aus wieviele durch nachkauf notwendig sind - momentan schreibt er alle vom slider hin

> und mach das feature mit wenn nachkaufjahre unter minimum fallen dann springt antrittsalter auf [Zahl] rückgängig - wird in dem hinweis eh schon angezeigt. zeig dort an wieviel monate fehlen.

> verlinke auch irgendwo prominent https://www.neuespensionskonto.at/pensionskontorechner/

> passe das wording an: [zitierter Popup-Text zum Nachkauf bei abgebrochenem Studium] abgebrochen weg - zählt jedes semester mit ausreind nachgewiesenem Studienfortschritt.

> muss das studium hauptberufllich sein?

> für später noch zu ergänzen: alle aufrufe sollen in es in einem eigenen index landen

*(Pause: Nutzungslimit, eine Stunde.)*

## 5 · Amortisation und Break-even (13:55–14:15)

> amortisation soll in beiden fällen mit dem nettobetrag rechnen, alles andre ist nicht sinnvoll also sowohl bei einfach als auch bei den [Zahl] %

> und nimm hier [eingefügte Ausgabe: Freiwillige Weiterversicherung, zwei Amortisationszeilen mit identischem Wert] die zeile mit dem aktuellen gehalt raus. nimm darüber die das wort mindestbetrag raus und erwähne im infoteil dass das linear ist und sich jeder beitrag gleich schnell amortisiert.

> aktuelles beispiel [aus dem Rechner]: Anspruch nur durch Nachkauf von [Zahl] Monaten erreicht. -> wenn der slider für nachkauf unter [Zahl] ist sollte es rot sein und dahinter schreiben x fehlen. wenn es erreicht (oder darüber ist) soll es grün werden und dahinter x zusätzlich schreiben.

> vergiss den ersten teil - neue anweisung: habe in szenaria a antritt mit [Zahl] trozdem steht darunter Anspruch nur durch Nachkauf von [Zahl] Monaten erreicht.

> auch wenn keine jahre nachgekauft werden den block immer einblenden, dann halt mit [Zahl]: [eingefügte Ausgabe: Nachkauf – Kosten & Steuereffekt]

> wie rechnet er bei amortisierung … mit [Zahl] % Alternativrendite - korrekte wäre [Zahl] % -> bis zum rentenantrittsalter und dann als rentenrechnung monatlich den erhöhten betrag 'abehben' aber weiter mit [Zahl] % verzinsen.

> und wie kommt er auf das ergebnis: [eingefügte Vergleichstabelle Szenario A / B, darunter „Kein Ausgleich im Betrachtungszeitraum“] … nach [Zahl] jahren sollte B besser werden?

> und wenn du irgendwo break even von zwei varianten schreibst dnan schreib auch variante A (oder B) anschließend wirtschftlicher

## 6 · Logging (14:13–14:25)

> mach den teil mit elastisearch analog zu den andren projecten (z.b. [ein anderes Projekt])

> gib am Ende von Szenario a und b noch aus wieviel mich eine stundenreduzierung von x prozent kosten würde an der monatlichen pension. x soll bei den szenarien mitkonfigurierbar sein.

> vorher noch: glaub du hast in es keinen index angelegt?

> ich seh ihn momentan nicht in kibana deshalb frag ich

> echte cleint ip machen

## 7 · Ausland, Zuverdienst, Nachkaufkosten (17:39–19:30)

> wie ist das wenn jemand im ausland gearbeitet hat? [mehrere Zeiträume in verschiedenen EU-Ländern]

> für die gutschrift ist das feld doch eh hinfällig?

> ergänz den hinweis

> hab ein hypothetisches beispiel: [Link auf den Rechner mit Beispielwerten]

> wenn ich ein jahr voll arbeite - sagen wir [Zahl] - was zahle ich da an monate für die pensionskasse?

> ist Amortisation ab Pensionsbeginn [Zahl] Jahre [Zahl] Monate dann mit dem bruttobetrag oder dem nettobetrag gerechnet? [Link auf den Rechner mit Beispielwerten]

> d.h. ein monat nachkaufen kostet [Zahl] euro. wieviel muss ich bei + euro über der geringfügigkeit für das monat abgeben? wieviel der dienstnehmer?

> mach noch in der homepage eine checkbox über auststiegsalter -> bis zum antritt geringfügig arbeiten.

> also geringfügig + [Zahl] euro

> heißt das eigentlich ein nachgekauftes monat bringt keine gutschrift? oder kommt da der selbe betrag in die gutschrift wie wenn ich das gearbeitet hätte?

> die kosten für den nachkauf orientieren sich [am] aktuellen gehalt?

> verlinke deine quellin im fuß des tools

> quellen dann am ende der hp ausweisen. verifizier die zahl.

> und nimm dann den ehrlichenmittelweg und erklär das im hint

> warum sagst du das das nachkaufen für die höhe effizienter ist ([Zahl] % war deine aussage) als arbeiten?

> gib in der fußzeile einen link wo du das genau erklärst incl. ein paar echten beispielen

> kann [man] nicht z.b. [den partner] anstellen und [umgekehrt]? zb. [einer den anderen] als gärtner und [der andere] als putzfrau

> in der erklärung sollte auch irgendwo stehen für [Zahl] euro einbezahlt erhöht sich die pension um x

> die idee wäre eben geringfügig + [Zahl] euro damit versicherung und pensionsjahre günstig hergehen - was kostet beide seiten in dem fall die beiden dinge?

> [Link auf den Rechner mit Beispielwerten] - warum ändert die checkbox mit geringfügig + [Zahl] nichts am kapitalbedarf?

> reduziert das geringfüg + [Zahl] auch den betrag da ich je [Zahl] oder so netto bekomm und gegen [die] z.b. [Zahl] rechnen kann?

> mach anstelle von der hceckbox einen slider von [Zahl]-momentanes monatliches einkommen. markiere die stelle der geringfügigkeit.

## 8 · Veröffentlichung (19:39–20:34)

> [zwei Patch-Dateien für einen Ko-fi-Button eingefügt] füg den hinzu

> ja mache 1 + 2

> schreib mir einen redditpost für r/austria

> wenn ich es verlinke rescheint das als vorschaud Pensionsrechner Ãsterreich â Gedankenspiel FrÃ¼hpension

> nochmal den text - 1 ist blödsinn das war mir schon immer klar.

> mach aus 2. nicht ganz so reisserisch sondern - Nachkaufen kann man von der steuer absetzten und kann in Grenzfällen durchaus sinnvoll sein. streiche 3 - sind dann halt nur zwei sachen. und am ende - ich habe heute selber genug gefunden.

> ausserdem - füge link zu github und reddit zur seite unten hinzu

> ich meinte github link und link zu [meinem] discord

> gib mir fünf vaarianten für den Titel

> ist gepostet - beobachte die logs und berichte mir alle [Zahl] minuten für die nächsten [Zahl]

> [Link auf den Rechner mit Beispielwerten] varianta a mit [Zahl] erschenit mir zu viel?

> verlängere um eine stunde solange der zulauf nicht aflacht

## 9 · Selbständige (21:45–22:00)

> was wäre für selbständige noch umzusetzten?

> https://www.wko.at/sozialversicherung/gewerbliche-sozialversicherungsbeitraege-ausmass

> alles für selbständige drinnen?

*(dazwischen Auswahl aus Optionslisten: „mach mal 2&3“, „mache 1 auhc noch“)*

## 10 · Vollprüfung (22:07)

> prüfe alle annahmen aus dem ganzen programm. alles was angestellet ebtrifft. auch alles was selbständige betrifft. prüfe alle regeln, alle rechenschritte, alle werte.

> nimm auch alle quellen mit die du findest und ergänze die ausweisung am ende

## 11 · Dokumentation (22:34–22:53)

> jemand fragt nach relevanten files für die promts - hast du noch den initialpromt?

> überarbeite die claude.md gewissenhaft - möchte die dann auch online legen.

> gibt es auch noch andre files die interessant sind?

> kannst du aus dem gesammten verlauf ein koherentes md file machen

> ausserdem mach ein file in dem der aufwand (input/output tokens) aufgelistet ist

> eventuell aufgeschlüsselt pro model

> entferne die default ip und prüfe dass im stack das im env hinterlegt ist

> gibt es noch etwas das ich miteveröffentlichen könnte von interesse?

> 1 - erstell das, 2 mach mit. 3. ja und entferne alles persönliche, alle zahlen. 4. ja 5. ja 6. ja

---

## Was an diesen Prompts auffällt

- **Kurz, klein geschrieben, ein Gedanke pro Nachricht.** Kaum ein Prompt hat mehr als
  drei Sätze. Die Spezifikation am Anfang war lang; danach reichte es, auf die Ausgabe zu
  zeigen.
- **Die wichtigsten Prompts sind Fragen.** „Ist das eine faire Rechnung?“, „Wie kommt er
  auf das Ergebnis?“, „Warum sagst du …?“ – jede dieser Fragen hat einen Fehler in der
  Rechnung oder in der Argumentation gefunden. Kein Feature-Prompt hat das geschafft.
- **Korrekturen kamen als Beobachtung, nicht als Diagnose.** „Steht darunter X, obwohl
  Y“ – das Modell musste die Ursache selbst finden. Das hat funktioniert, aber zweimal
  erst nach einem zweiten Anlauf.
- **„Neue Anweisung“ und „vergiss den ersten Teil“** waren die effektivsten Kurskorrekturen
  – ein expliziter Schnitt statt einer weiteren Ergänzung.
- **Ein Link als Prompt** (die WKO-Seite zu den GSVG-Beiträgen) war die knappste und
  ergiebigste Nachricht des Tages: Sie ersetzte eine falsche Websuche durch die
  Primärquelle.
