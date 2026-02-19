# Businessplan

## Caelith -- Regulatorische Compliance-Plattform fuer EU-Fondsverwalter

**Gruender:** Julian Laycock
**Gruendungsdatum:** 01.04.2026
**Rechtsform:** Einzelunternehmen (geplanter Wechsel zu UG haftungsbeschraenkt)
**Standort:** Berlin
**Branche:** Software-as-a-Service (SaaS) / Regulatorische Technologie (RegTech)

---

## Inhaltsverzeichnis

1. [Zusammenfassung](#1-zusammenfassung)
2. [Geschaeftsidee](#2-geschaeftsidee)
3. [Gruenderprofil](#3-gruenderprofil)
4. [Marktanalyse](#4-marktanalyse)
5. [Wettbewerbsanalyse](#5-wettbewerbsanalyse)
6. [Zielkunden](#6-zielkunden)
7. [Marketing und Vertrieb](#7-marketing-und-vertrieb)
8. [Preiskalkulation](#8-preiskalkulation)
9. [Umsatzkalkulation](#9-umsatzkalkulation)
10. [Unternehmensorganisation und Rechtsform](#10-unternehmensorganisation-und-rechtsform)
11. [Standort](#11-standort)
12. [Risikoanalyse](#12-risikoanalyse)
13. [Finanzplanung](#13-finanzplanung-verweise)
14. [Anlagen](#14-anlagen)

---

## 1. Zusammenfassung

### Die Geschaeftsidee

**Caelith** ist eine cloudbasierte Compliance-Software (SaaS) fuer EU-Fondsmanager, die die Einhaltung der AIFMD-II-Richtlinie automatisiert. Die Plattform ueberprueft die Zulaessigkeit von Investoren, setzt Transferbeschraenkungen durch und erzeugt kryptographisch gesicherte Entscheidungsprotokolle -- bereit fuer die regulatorische Pruefung durch BaFin, CSSF oder CBI.

### Der Gruender

Julian Laycock ist ein erfahrener Softwareentwickler mit Kenntnissen in [RELEVANTE ERFAHRUNGEN EINFUEGEN: Finanzbranche, Regulatorik, SaaS-Entwicklung]. Das Produkt wurde vollstaendig selbst entwickelt und ist funktionsfaehig (13 verifizierte API-Endpunkte, 65 automatisierte Tests, Demo-Umgebung mit Echtdaten).

### Der Markt

Die AIFMD-II-Richtlinie (2024/927/EU) muss bis zum **16. April 2026** in nationales Recht umgesetzt werden. Ueber 500 deutsche Kapitalverwaltungsgesellschaften (KVGs) muessen ihre Compliance-Prozesse anpassen. Die meisten kleinen und mittleren KVGs arbeiten noch mit Excel-Tabellen und manuellen Pruefprozessen -- eine Luecke, die Caelith schliesst.

### Der Finanzbedarf

Der Gesamtkapitalbedarf betraegt ca. 7.000 EUR und wird vollstaendig aus Eigenkapital finanziert. Die persoenliche Absicherung erfolgt durch den Gruendungszuschuss. Erste Umsaetze werden ab Monat 3 erwartet. Break-even auf Unternehmensebene wird voraussichtlich in Monat 6-7 erreicht.

---

## 2. Geschaeftsidee

### 2.1 Entstehung der Geschaeftsidee

Die Idee zu Caelith entstand aus der Beobachtung, dass EU-Fondsmanager -- insbesondere kleine und mittlere Kapitalverwaltungsgesellschaften (KVGs) mit einem verwalteten Vermoegen von 50 bis 500 Mio. EUR -- ihre regulatorischen Compliance-Pflichten noch immer ueberwiegend manuell erfuellen: Investorenklassifizierungen in Excel-Tabellen, Zulaessigkeitspruefungen per E-Mail-Kommunikation und Entscheidungsdokumentation in unstrukturierten Aktenordnern.

Mit dem Inkrafttreten der AIFMD-II-Richtlinie (Directive 2024/927/EU) am 16. April 2026 verschaerfen sich die Anforderungen erheblich: erweiterte Investorenklassifizierung (5-stufiges System), Liquiditaetsmanagement-Instrumente, Leverage-Berichterstattung und umfassende Annex-IV-Meldepflichten. Diese Anforderungen manuell zu erfuellen, ist fuer kleine KVGs weder wirtschaftlich noch zuverlaessig.

Caelith automatisiert diesen Prozess vollstaendig: von der Investorenklassifizierung ueber die Zulaessigkeitspruefung bis hin zur Erzeugung prueffaehiger Entscheidungsprotokolle mit kryptographischer Integritaetssicherung.

### 2.2 Produktbeschreibung

Caelith ist eine webbasierte SaaS-Plattform mit folgenden Kernfunktionen:

**Fundament (vollstaendig entwickelt und betriebsbereit):**

| Funktion | Beschreibung |
|----------|--------------|
| **Fondsstruktur-Verwaltung** | Modellierung von Fondsstrukturen (Rechtsform, Domizil, Regulierungsrahmen, AIFM-LEI) |
| **Investorenregister** | 5-stufige AIFMD-II-Investorenklassifizierung (institutionell, professionell, semi-professionell, sachkundig, Privatanleger) |
| **Regelbasierte Compliance-Engine** | 7 vordefinierte Pruefregeln mit boolescher Komposition (UND/ODER/NICHT) |
| **Zulaessigkeitspruefung** | Automatische Pruefung von Investoren gegen fondsspezifische und jurisdiktionsspezifische Regeln |
| **Entscheidungsprotokolle (Decision Provenance)** | Kryptographisch verkettete Entscheidungsaufzeichnungen (SHA-256) mit vollstaendiger Regelversion-Archivierung |
| **Transfersimulation und -ausfuehrung** | Atomare Transaktionen mit automatischer Compliance-Pruefung |
| **Szenariomodellierung** | Auswirkungsanalyse bei Regelaenderungen ("Was-waere-wenn") |
| **AIFMD Annex IV Datenexport** | Automatische Aufbereitung der Meldedaten (Art. 24 AIFMD) |
| **Audit-Trail** | Unveraenderliches, append-only Ereignisprotokoll |
| **PDF-Export** | Entscheidungsnachweise als druckfaehiges PDF fuer Pruefer |

**Unterstuezte Rechtsrahmen:**

| Jurisdiktion | Fondstypen | Rechtsgrundlage |
|-------------|-----------|-----------------|
| Deutschland | Spezial-AIF | KAGB Paragraph 1 (Mindestanlage 200.000 EUR fuer Semi-Professionelle) |
| Luxemburg | SIF, RAIF | SIF-Gesetz vom 13.02.2007, RAIF-Gesetz vom 23.07.2016 |
| Irland | QIAIF | CBI AIF Rulebook, SI 257/2013 |
| EU-weit | ELTIF 2.0 | VO (EU) 2023/606 |

### 2.3 Alleinstellungsmerkmal (USP)

Das zentrale Differenzierungsmerkmal von Caelith ist die **Decision Provenance** -- die kryptographisch gesicherte Entscheidungskette:

- Jede Compliance-Entscheidung (Zulaessigkeitspruefung, Transfervalidierung, Onboarding-Genehmigung) wird mit einem vollstaendigen Eingabe-Snapshot, einer Regelversion und einem SHA-256-Integritaets-Hash aufgezeichnet.
- Entscheidungen sind kryptographisch miteinander verkettet (Hash-Chain), sodass nachtraegliche Manipulationen sofort erkennbar sind.
- Zu jeder Pruefung wird die exakte Rechtsgrundlage zitiert (z.B. "KAGB Paragraph 1 Abs. 19 Nr. 33").

**Kein anderes Produkt am Markt bietet diese Kombination aus deterministischer Regelpruefung und kryptographisch gesicherter Entscheidungsnachvollziehbarkeit.**

Dies erfuellt:
- AIFMD Art. 12(1)(d) -- Risikomanagement-Dokumentation
- DSGVO Art. 22(3) -- Recht auf Erklaerung automatisierter Entscheidungen
- AIFMD II Art. 24 -- Annex-IV-Meldepflichten

### 2.4 Ziele

| Zeitraum | Ziel |
|----------|------|
| Monat 1-3 | Markteintritt: 5+ Demo-Gespraeche, 3+ kostenlose Compliance-Checks, 1. zahlender Kunde |
| Monat 4-6 | Wachstum: 4 zahlende Kunden, Break-even auf Unternehmensebene |
| Monat 7-12 | Skalierung: 7+ Kunden, positiver Cashflow, Aufnahme erster Fondsadministratoren |
| Jahr 2 | 15-20 Kunden, ca. 180.000-240.000 EUR Jahresumsatz, Einstellung 1. Mitarbeiter |
| Jahr 3 | 30-40 Kunden, ca. 360.000-480.000 EUR Jahresumsatz, Expansion in weitere EU-Maerkte |

---

## 3. Gruenderprofil

### 3.1 Persoenliche Angaben

| | |
|---|---|
| **Name** | Julian Laycock |
| **Wohnort** | Berlin |
| **Geburtsdatum** | [GEBURTSDATUM] |

### 3.2 Fachliche Qualifikation

| Bereich | Qualifikation |
|---------|---------------|
| **Softwareentwicklung** | TypeScript, Node.js, PostgreSQL, React/Next.js, Docker [BITTE ERGAENZEN] |
| **Regulatorik** | AIFMD / AIFMD II, KAGB, MiFID II, DSGVO, ELTIF 2.0, AMLD-Richtlinien |
| **KI / Machine Learning** | LLM-Integration (Anthropic Claude), RAG-Pipelines, Vektorsuche (pgvector) |
| **Sicherheit** | JWT-Authentifizierung, RBAC, SHA-256-Integritaetsketten, HMAC-Signaturen |

### 3.3 Kaufmaennische Qualifikation

[BITTE ERGAENZEN: Relevante Erfahrungen in Unternehmensfuehrung, Budgetverantwortung, B2B-Vertrieb, Projektmanagement, oder kaufmaennische Weiterbildungen]

> **Hinweis fuer IHK**: Falls keine formale kaufmaennische Ausbildung vorliegt, werden kaufmaennische Kenntnisse durch folgende Nachweise belegt:
> - Eigenstaendige Entwicklung und technische Architektur eines marktfaehigen SaaS-Produkts
> - Erstellung von Businessplan, Finanzplanung und Marketingstrategie
> - [WEITERE NACHWEISE EINFUEGEN]

### 3.4 Beruflicher Werdegang

[BITTE ERGAENZEN -- siehe Lebenslauf-Vorlage (07-lebenslauf-vorlage.md)]

### 3.5 Motivation

Die Gruendung von Caelith verbindet meine technische Expertise in Softwareentwicklung und Datenbankarchitektur mit fundiertem Wissen ueber die EU-Fondsregulierung. Das Produkt loest ein konkretes, regulatorisch getriebenes Problem: Kleine und mittlere KVGs koennen sich die Enterprise-Loesungen der grossen Anbieter nicht leisten (ab 50.000 EUR/Jahr), sind aber durch AIFMD II zu umfassender Compliance verpflichtet. Caelith schliesst diese Luecke mit einer erschwinglichen, sofort einsatzbereiten Loesung.

---

## 4. Marktanalyse

### 4.1 Marktumfeld

Die EU-Richtlinie AIFMD II (2024/927/EU) stellt die bedeutendste regulatorische Aenderung fuer Alternative Investmentfonds seit der urspruenglichen AIFMD (2011/61/EU) dar. Die Umsetzungsfrist laeuft am **16. April 2026** ab.

Wesentliche Neuerungen:
- Erweiterte 5-stufige Investorenklassifizierung
- Verpflichtende Liquiditaetsmanagement-Instrumente (LMTs)
- Verschaerfte Leverage-Berichterstattung
- Umfassendere Annex-IV-Meldepflichten
- Erweiterte Befugnisse der nationalen Aufsichtsbehoerden (NCAs)

### 4.2 Marktgroesse

**Deutschland (Primaermarkt):**

| Segment | Anzahl | Quelle |
|---------|-------:|--------|
| Registrierte KVGs gesamt | 500+ | BaFin-Register |
| KVGs im Zielsegment (50-500 Mio. EUR AuM) | 50-100 | BaFin-Statistik, eigene Schaetzung |
| Kleine KVGs (unter 50 Mio. EUR) | 200-300 | Potenzielle Aufsteiger |
| Fondsadministratoren | ca. 50 | Branchenverzeichnisse |

**EU-weit (Mittelfristig):**

| Jurisdiktion | AIFMs im Zielsegment | Quelle |
|-------------|---------------------:|--------|
| Luxemburg | 100+ | CSSF-Register |
| Irland | 80+ | CBI-Register |
| Deutschland | 50-100 | BaFin-Register |
| **Gesamt adressierbarer Markt** | **250-350** | |

**Marktvolumen (Total Addressable Market):**
- 250-350 potenzielle Kunden x durchschnittlich 12.000 EUR/Jahr = **3,0 - 4,2 Mio. EUR TAM**
- Mittelfristig mit Fund-Administratoren und API-Lizenzen: **8-12 Mio. EUR SAM**

### 4.3 Markttreiber

1. **Regulatorischer Druck**: AIFMD-II-Umsetzungsfrist 16. April 2026 -- Compliance ist nicht optional
2. **Kostendruck**: Enterprise-Loesungen (eFront, SS&C) ab 50.000 EUR/Jahr fuer kleine KVGs unerschwinglich
3. **Digitalisierung**: Zunehmende Akzeptanz von Cloud-Loesungen auch in der konservativen Fondsbranche
4. **Audit-Anforderungen**: BaFin-Pruefungen erfordern lueckenlose Entscheidungsnachweise -- Excel genuegt nicht mehr
5. **DSGVO-Anforderungen**: Automatisierte Entscheidungen muessen erklaerbar sein (Art. 22 DSGVO)

### 4.4 Markttrends

- RegTech-Markt in Europa waechst jaehrlich um 20-25% (Quelle: Deloitte RegTech Universe 2024)
- Zunehmende Konsolidierung bei Fondsadministratoren (Universal Investment, HANSAINVEST, INTREAL)
- BaFin verstaerkt die Aufsicht ueber Alternative Investmentfonds (Schwerpunkt 2025/2026)
- Europaeische Initiativen zur Standardisierung von Compliance-Reporting (ESMA Guidelines)

---

## 5. Wettbewerbsanalyse

### 5.1 Direkte Wettbewerber

| Wettbewerber | Preisbereich | Zielgruppe | Staerken | Schwaechen |
|-------------|-------------|-----------|----------|-----------|
| **eFront (BlackRock)** | Ab 50.000 EUR/Jahr | Grosse AIFMs, PE-Hauser | Umfassendes Feature-Set, Marktfuehrer | Teuer, 6+ Monate Implementierung, nicht AIFMD-II-nativ |
| **FIS Investran** | Ab 75.000 EUR/Jahr | Institutionelle Investoren | Enterprise-Skalierung | Komplexitaet, hohe Kosten, Legacy-Architektur |
| **SS&C Geneva** | Ab 60.000 EUR/Jahr | Fund Admins, grosse KVGs | End-to-End Fund Accounting | Compliance nur als Modul, keine Decision Provenance |
| **Deloitte / PwC Custom** | 100.000-500.000 EUR | Grosse AIFMs | Beraterkompetenz | Einmalig, keine SaaS, keine Automatisierung |

### 5.2 Indirekte Wettbewerber

| Wettbewerber | Beschreibung | Caelith-Vorteil |
|-------------|-------------|-----------------|
| **Excel / manuell** | Primaerer "Wettbewerber" bei kleinen KVGs | Automatisierung, Audit-Trail, Regelzitate |
| **Eigenentwicklungen** | Interne Compliance-Tools bei groesseren KVGs | Kosteneffizienz, sofortige Einsatzbereitschaft, regulatorische Updates |
| **Steuerberater / Compliance-Berater** | Manuelle Pruefung durch externe Berater | Geschwindigkeit, Skalierbarkeit, Prueffaehigkeit |

### 5.3 Wettbewerbsvorteile von Caelith

| Differenzierungsmerkmal | Caelith | Enterprise-Loesungen | Excel/Manuell |
|------------------------|---------|---------------------|---------------|
| **Preis** | 990-1.500 EUR/Monat | 50.000-100.000+ EUR/Jahr | Personalkosten |
| **Implementierungszeit** | 1 Tag | 3-12 Monate | Sofort, aber fehleranfaellig |
| **Decision Provenance** | SHA-256-Integritaetskette | Keine | Keine |
| **Regelzitate** | Jede Pruefung mit KAGB/AIFMD-Verweis | Teilweise | Keine |
| **AIFMD II nativ** | Ja (von Grund auf gebaut) | Nachgeruestet | Nein |
| **Szenariomodellierung** | Ja | Eingeschraenkt | Nein |
| **Annex-IV-Export** | Automatisch | Teilweise | Manuell |

### 5.4 Wettbewerbsstrategie

Caelith positioniert sich als **kostenguenstige, sofort einsetzbare Alternative** fuer KVGs, die:
1. Zu klein fuer Enterprise-Loesungen sind (unter 500 Mio. EUR AuM)
2. Zu reguliert fuer Excel-Tabellen sind (AIFMD II, BaFin-Pruefungen)
3. Prueffaehige Entscheidungsnachweise benoetigen (Decision Provenance)

---

## 6. Zielkunden

### 6.1 Primaere Zielgruppe: Kleine und mittlere KVGs

| Merkmal | Beschreibung |
|---------|-------------|
| **Verwaltendes Vermoegen** | 50-500 Mio. EUR |
| **Anzahl Fonds** | 2-10 Alternative Investmentfonds |
| **Compliance-Personal** | 1-3 Mitarbeiter |
| **Anlageklassen** | Private Equity, Immobilien, Private Debt, Infrastruktur |
| **Aktuelles Problem** | Manuelle Compliance, Excel-basiert, zeitaufwendige Audit-Vorbereitung |
| **Budget** | 10.000-20.000 EUR/Jahr fuer Compliance-Software |

**Entscheidungstraeger:** Compliance-Beauftragter, Geschaeftsfuehrer, COO

### 6.2 Sekundaere Zielgruppe: Fondsadministratoren

| Merkmal | Beschreibung |
|---------|-------------|
| **Profil** | Dienstleister fuer Back-Office-Verwaltung mehrerer KVGs |
| **Bedarf** | Ein System fuer alle verwalteten Fonds mit jurisdiktionsspezifischen Regeln |
| **Budget** | 18.000-36.000 EUR/Jahr |
| **Beispiele** | Universal Investment, HANSAINVEST, INTREAL, Hauck Aufhaeuser Lampe |

### 6.3 Bestehende Kundenkontakte

[BITTE ERGAENZEN: Falls bereits Kontakte zu potenziellen Kunden bestehen, hier auflisten. Falls nicht:]

Zum Gruendungszeitpunkt bestehen noch keine verbindlichen Kundenvertraege. Folgende Schritte zur Kundengewinnung sind geplant:
- Identifikation von 20 KVGs im Zielsegment ueber BAI-Mitgliederliste und BaFin-Register
- LinkedIn-Direktansprache von Compliance-Beauftragten und Geschaeftsfuehrern
- Kostenlose Compliance-Checks ("Compliance Health Check") als Einstiegsangebot
- Teilnahme an Branchenveranstaltungen (BAI, BVI, Fondsforum)

---

## 7. Marketing und Vertrieb

### 7.1 Marketingstrategie

**Kern-Botschaft:** "Nachweisbar compliant -- nicht nur compliant. Jede Entscheidung dokumentiert, jede Regel zitiert, kryptographisch gesichert."

**Kanaele:**

| Kanal | Massnahme | Budget (monatlich) | Erwarteter Effekt |
|-------|-----------|-------------------:|-------------------|
| **LinkedIn** | Fachartikel zu AIFMD II, BaFin-Pruefungen, KAGB-Compliance | 100 EUR (Ads) | Sichtbarkeit bei Zielgruppe |
| **Branchenevents** | BAI Investor Conference, BVI-Veranstaltungen, Fondsforum | 200 EUR (Teilnahme) | Direkter Kontakt zu Entscheidern |
| **Kalt-E-Mail** | Personalisierte Ansprache von 20 KVGs pro Monat | 0 EUR | Direkte Pipeline |
| **Content Marketing** | Blog-Artikel, AIFMD-II-Checklisten, Whitepaper | 0 EUR (eigene Erstellung) | SEO + Thought Leadership |
| **Empfehlungen** | Zufriedene Pilotkunden empfehlen weiter | 0 EUR | Hoechste Konversionsrate |
| **Partner-Kanal** | Steuerberater, Rechtsanwaelte, Compliance-Berater | 0 EUR | Vertrauenswuerdige Empfehlung |

### 7.2 Vertriebsstrategie

**Verkaufsprozess (B2B SaaS, typisch 4-8 Wochen):**

1. **Erstkontakt**: LinkedIn-Nachricht, E-Mail oder Event-Kontakt
2. **Qualifizierung**: 15-Minuten-Telefonat -- Fondsstruktur, AuM, aktuelle Compliance-Prozesse
3. **Demo**: 30-minuetige Live-Demo mit der eigenen Fondsstruktur des Interessenten
4. **Kostenloser Compliance-Check**: Pruefung der aktuellen Compliance-Situation ("Health Check")
5. **Pilotphase**: 30 Tage kostenlos oder zu reduziertem Preis
6. **Vertragsabschluss**: Monatliches SaaS-Abonnement

**Kundenakquisitionskosten (CAC, geschaetzt):**
- Zeitaufwand: ca. 20 Stunden pro gewonnenem Kunden (Kontakt bis Vertrag)
- Direkte Kosten: ca. 200 EUR (Events, LinkedIn Ads)
- Gesamt-CAC: ca. 500-700 EUR (inkl. Zeitwert)

**Customer Lifetime Value (CLV, geschaetzt):**
- Durchschnittliche Vertragsdauer: 24+ Monate (regulatorisch bedingt -- Wechsel ist aufwendig)
- Durchschnittlicher Monatsumsatz: 990-1.500 EUR
- CLV: 23.760-36.000 EUR
- **CLV:CAC-Verhaeltnis: 34-51x** (exzellent fuer B2B SaaS)

### 7.3 Akquisitionsstrategie (erste 6 Monate)

| Phase | Zeitraum | Massnahmen | Ziel |
|-------|----------|-----------|------|
| **Launch** | Monat 1-2 | 20 KVGs identifizieren, LinkedIn-Profil aufbauen, 5+ Demos | Marktvalidierung |
| **Pilot** | Monat 3-4 | Kostenlose Compliance-Checks, 1-2 Pilotkunden | Erste Referenzen |
| **Wachstum** | Monat 5-6 | Fallstudien publizieren, Partner-Kanal aufbauen | 4+ zahlende Kunden |

---

## 8. Preiskalkulation

### 8.1 Preismodell

| Tarif | Zielgruppe | Preis (monatlich) | Preis (jaehrlich) | Leistungsumfang |
|-------|-----------|------------------:|-------------------:|----------------|
| **Essentials** | Kleine KVGs (1-3 Fonds) | 990,00 EUR | 10.692,00 EUR (10% Rabatt) | Bis 5 Fonds, 500 Investoren, E-Mail-Support, Basis-Reporting |
| **Professional** | Mittlere KVGs (4-10 Fonds) | 1.500,00 EUR | 16.200,00 EUR (10% Rabatt) | Unbegrenzte Fonds + Investoren, Annex IV Export, Szenariomodellierung, Prioritaets-Support |
| **Enterprise** | Fondsadministratoren | Individuell (ab 2.500 EUR) | Individuell | Multi-Mandant, API-Zugang, SLA (99,5% Uptime), Dedizierter Ansprechpartner |

### 8.2 Preisbegruendung

**Vergleich mit Alternativen:**

| Loesung | Jaehrliche Kosten | Caelith-Vorteil |
|---------|-------------------:|-----------------|
| eFront (Enterprise) | Ab 50.000 EUR | 80-85% guenstiger |
| Compliance-Berater (extern) | 20.000-40.000 EUR | 57-78% guenstiger + automatisiert |
| Interner Compliance-Mitarbeiter | 60.000-80.000 EUR (Gehalt) | 85-89% guenstiger + skalierbar |
| Caelith Essentials | 11.880 EUR | -- |

**Berechnung der Kostendeckung:**
- Deckungsbeitrag pro Essentials-Kunde: 990 EUR - ca. 80 EUR variable Kosten (Hosting, API) = **910 EUR (92% Bruttomarge)**
- Break-even bei Fixkosten von ca. 1.041 EUR/Monat: **2 Kunden**

### 8.3 Preisanpassungsstrategie

- Jahr 1: Einfuehrungspreise wie oben
- Jahr 2: Moderate Erhoehung um 5-10% bei bestehenden Kunden
- Neue Funktionen (Annex IV Vollautomatisierung, BaFin-Reporting): als Aufpreis oder im Professional-Tarif

---

## 9. Umsatzkalkulation

### 9.1 Annahmen

| Parameter | Wert | Begruendung |
|-----------|------|-------------|
| Durchschnittlicher Monatsumsatz pro Kunde | 990,00 EUR | Essentials-Tarif |
| Kundengewinnungsrate | 1-2 Neukunden pro Monat | Konservativ fuer Solo-Gruender im B2B-Bereich |
| Kuendigungsrate (Churn) | 5% pro Quartal | Niedrig aufgrund regulatorischer Bindung |
| Arbeitstage pro Monat | 20 | Davon ca. 10 Vertrieb/Marketing, 10 Produktentwicklung |

### 9.2 Umsatzprognose (12 Monate)

| Monat | Neukunden | Kunden gesamt | Monatsumsatz (EUR) |
|-------|----------:|-----:|-------------------:|
| Apr 2026 (M1) | 0 | 0 | 0 |
| Mai 2026 (M2) | 0 | 0 | 0 |
| Jun 2026 (M3) | 1 | 1 | 990 |
| Jul 2026 (M4) | 1 | 2 | 1.980 |
| Aug 2026 (M5) | 0 | 2 | 1.980 |
| Sep 2026 (M6) | 1 | 3 | 2.970 |
| Okt 2026 (M7) | 1 | 4 | 3.960 |
| Nov 2026 (M8) | 1 | 5 | 4.950 |
| Dez 2026 (M9) | 0 | 5 | 4.950 |
| Jan 2027 (M10) | 1 | 6 | 5.940 |
| Feb 2027 (M11) | 1 | 7 | 6.930 |
| Maer 2027 (M12) | 0 | 7 | 6.930 |
| **Gesamt Jahr 1** | **7** | | **41.580** |

> **Hinweis:** Diese Prognose ist bewusst konservativ gehalten. Es wird angenommen, dass in einigen Monaten keine Neukunden gewonnen werden (laengere Vertriebszyklen, Urlaubszeiten). Keine Kuendigung in Jahr 1 angenommen (regulatorische Bindung).

### 9.3 Jahresvergleich (3 Jahre)

| | Jahr 1 | Jahr 2 | Jahr 3 |
|---|-------:|-------:|-------:|
| Kunden (Jahresende) | 7 | 20 | 35 |
| Durchschnittl. Monatsumsatz/Kunde | 990 EUR | 1.500 EUR | 1.800 EUR |
| **Jahresumsatz** | **41.580 EUR** | **252.000 EUR** | **600.000 EUR** |

---

## 10. Unternehmensorganisation und Rechtsform

### 10.1 Rechtsform

**Phase 1 (Gruendung): Einzelunternehmen**
- Einfache Gruendung (Gewerbeanmeldung genuegt)
- Keine Mindestkapitalanforderung
- Volle Entscheidungsfreiheit
- Haftung: Unbeschraenkt mit Privatvermoegen

**Phase 2 (ab ca. 10 Kunden): UG (haftungsbeschraenkt)**
- Beschraenkte Haftung fuer B2B-Kundenvertraege
- Hoehere Glaubwuerdigkeit bei Fondsmanagern und Administratoren
- Mindestkapital: 1 EUR (empfohlen: 1.000-2.500 EUR)
- Notarielle Beurkundung erforderlich

### 10.2 Personalplanung

| Zeitraum | Mitarbeiter | Funktion |
|----------|------------|----------|
| Monat 1-12 | 1 (Gruender) | Produktentwicklung, Vertrieb, Support |
| Monat 12-18 | 2 (+ 1 Mitarbeiter) | Vertrieb / Customer Success (Werkstudent oder Teilzeit) |
| Ab Monat 18 | 3 (+ 1 weiterer) | Softwareentwicklung (Backend/Frontend) |

### 10.3 Gesellschafterstruktur

Einzelgruendung: 100% Julian Laycock

### 10.4 Externe Dienstleister

| Dienstleister | Zweck | Geschaetzte Kosten |
|---------------|-------|-------------------:|
| Steuerberater | Buchhaltung, USt-Voranmeldung, Jahresabschluss | 150-300 EUR/Monat |
| Rechtsanwalt | AGB, Datenschutzerklaerung, Vertraege (punktuell) | 500-1.000 EUR einmalig |
| Haftpflichtversicherung | IT-Berufshaftpflicht | 45-80 EUR/Monat |

---

## 11. Standort

### 11.1 Geschaeftsadresse

**Standort:** Berlin (Home-Office)
**Anschrift:** [STRASSE, PLZ BERLIN]

### 11.2 Begruendung der Standortwahl

| Faktor | Begruendung |
|--------|-------------|
| **FinTech-Oekosystem** | Berlin ist Deutschlands groesstes FinTech-Zentrum (FinLeap, N26, Raisin, solarisBank) |
| **Accelerator-Zugang** | APX, Plug and Play, FinLeap, BHT Startup Hub |
| **Talent-Pool** | Zugang zu Softwareentwicklern und Compliance-Spezialisten |
| **Kosteneffizienz** | Guenstigere Miet- und Personalkosten als Frankfurt oder Muenchen |
| **Internationalitaet** | Englischsprachige Geschaeftsumgebung fuer EU-weite Expansion |
| **Infrastruktur** | Schnelles Internet, gute Anbindung (Flughafen BER fuer Kundentermine) |

### 11.3 Erreichbarkeit und Servicegebiet

- **Kunden in ganz Deutschland**: Vertrieb und Support ueber Videokonferenzen, persoenliche Termine nach Bedarf
- **EU-weit**: Luxemburg und Irland als mittelfristige Expansionsmaerkte (Erreichbarkeit per Flug/Bahn)
- **Geschaeftszeiten**: Mo-Fr 9:00-18:00 (Produktsupport), Software 24/7 verfuegbar (Cloud-basiert)

---

## 12. Risikoanalyse

### 12.1 Marktrisiken

| Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|--------|:---------------------------:|:----------:|----------------|
| Verschiebung der AIFMD-II-Frist | Niedrig | Hoch | Produkt hat auch ohne AIFMD II Mehrwert (Audit-Trail, Decision Provenance). Richtlinie ist bereits verabschiedet -- Verschiebung unwahrscheinlich. |
| Geringe Zahlungsbereitschaft bei kleinen KVGs | Mittel | Mittel | Kostenloser Compliance-Check als Einstieg, Pilotphase, Preismodell 80% unter Enterprise-Alternativen |
| Markteintritt grosser Wettbewerber (z.B. eFront Lite) | Niedrig-Mittel | Mittel | First-Mover-Vorteil im SMB-Segment, Decision Provenance als USP, Kundenbindung durch Integritaetskette |
| Laengere Vertriebszyklen als geplant | Mittel | Mittel | Konservative Umsatzplanung (2-3 Monate ohne Neukunden), Gruendungszuschuss als Puffer |

### 12.2 Technische Risiken

| Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|--------|:---------------------------:|:----------:|----------------|
| Sicherheitsvorfall / Datenleck | Niedrig | Sehr hoch | JWT-Auth, RBAC, RLS (Row-Level Security), Verschluesselung, regelmaessige Sicherheitsaudits |
| Systemausfall | Niedrig | Hoch | Cloud-Hosting mit Redundanz, automatische Backups, Monitoring |
| Skalierungsprobleme | Niedrig | Mittel | PostgreSQL skaliert fuer 100+ Kunden, Cloud-Hosting flexibel erweiterbar |
| API-Abhaengigkeit (Anthropic Claude) | Niedrig | Mittel | KI-Copilot ist Zusatzfunktion, nicht Kernfunktion. Regelengine funktioniert ohne KI. |

### 12.3 Persoenliche Risiken

| Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|--------|:---------------------------:|:----------:|----------------|
| Ueberlastung / Burnout | Mittel | Hoch | Klare Arbeitszeitstruktur, Priorisierung, fruehe Delegation (Werkstudent ab Monat 12) |
| Krankheit / Ausfall | Niedrig | Hoch | Cloud-basiertes Produkt laeuft automatisch weiter. Kurzfristiger Ausfall ueber 2-4 Wochen moeglich ohne Kundenverlust. |
| Finanzielle Engpaesse | Niedrig | Mittel | Gruendungszuschuss + Eigenkapital decken 15+ Monate. Konservative Planung mit Puffer. |

---

## 13. Finanzplanung (Verweise)

Die detaillierte Finanzplanung ist in separaten Dokumenten aufgefuehrt:

| Dokument | Datei | Beschreibung |
|----------|-------|-------------|
| **Kapitalbedarfsplan** | 02-kapitalbedarfsplan.md | Einmalige Investitionen + Betriebsmittel |
| **Finanzierungsplan** | 03-finanzierungsplan.md | Eigenkapital + Finanzierungsquellen |
| **Umsatz- und Rentabilitaetsvorschau** | 04-umsatz-rentabilitaetsvorschau.md | 12 Monate, monatliche Aufstellung |
| **Liquiditaetsplan** | 05-liquiditaetsplan.md | 12 Monate, monatliche Aufstellung |
| **Private Lebenshaltungskosten** | 06-private-lebenshaltungskosten.md | Monatliche Einnahmen und Ausgaben |

### Zusammenfassung Finanzplanung

| Kennzahl | Wert |
|----------|------|
| Gesamtkapitalbedarf | ca. 7.000 EUR |
| Finanzierung | Eigenkapital (100%) |
| Umsatz Jahr 1 | ca. 41.580 EUR (konservativ) |
| Umsatz Jahr 2 | ca. 252.000 EUR |
| Umsatz Jahr 3 | ca. 600.000 EUR |
| Break-even (Unternehmen) | Monat 6-7 |
| Kunden Jahresende 1 | 7 |
| Persoenliche Absicherung | Gruendungszuschuss (15 Monate) |

---

## 14. Anlagen

1. Kapitalbedarfsplan (02-kapitalbedarfsplan.md)
2. Finanzierungsplan (03-finanzierungsplan.md)
3. Umsatz- und Rentabilitaetsvorschau (04-umsatz-rentabilitaetsvorschau.md)
4. Liquiditaetsplan (05-liquiditaetsplan.md)
5. Aufstellung private Lebenshaltungskosten (06-private-lebenshaltungskosten.md)
6. Lebenslauf mit Zeugnissen (07-lebenslauf-vorlage.md)
7. Produktdokumentation (Screenshots, API-Dokumentation) -- separat beizufuegen
8. Marktrecherche (BaFin-Register, AIFMD-II-Richtlinientext) -- separat beizufuegen

---

*Erstellt: Februar 2026*
*Version: 1.0*
