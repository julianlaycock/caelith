# Germany Pilot Strategy — Caelith Market Entry

**Author:** Board of Directors
**Date:** 2026-02-16
**Deadline:** AIFMD II transposition — 16 April 2026 (59 days)

---

## 1. Why Germany First

### Structural advantages
- **Julian is in Berlin** — face-to-face demos, local network, incubator access
- **BaFin is aggressive on AIFMD II enforcement** — German AIFMs are under pressure to comply by April 16
- **KAGB is well-structured** — clear rules for Spezial-AIF (§1 KAGB), Publikums-AIF, and open-ended vehicles
- **Germany has 500+ registered KVGs** (Kapitalverwaltungsgesellschaften) — large addressable market
- **RegTech adoption in DACH is behind LU/IE** — German fund managers still rely heavily on manual processes
- **Berlin startup ecosystem** — access to incubators, VCs, and fintech-friendly regulatory sandbox

### Regulatory specifics we must nail
| Requirement | Source | Our Implementation |
|-------------|--------|--------------------|
| Spezial-AIF: €200K minimum for semi-professional | KAGB §1 Abs. 6 | ✅ Eligibility criteria seeded |
| Spezial-AIF: max 1 non-professional investor | KAGB §1 Abs. 6 Nr. 2 | ⚠️ Need to add specific rule |
| Publikums-AIF: retail-accessible with prospectus | KAGB §264 ff. | 🔲 Template needed |
| BaFin reporting: quarterly for >€100M AUM | KAGB §35 | ✅ Annex IV covers this |
| KVG organizational requirements | KAGB §28-29 | ✅ Decision provenance satisfies audit trail |
| AIFMD II leverage limits for German AIFs | KAGB §215-217, AIFMD II Art 15 | ✅ Leverage compliance enforced |
| LMT selection for German vehicles | KAGB §98 (redemption), AIFMD II Art 16(2b) | ✅ LMT tracking on fund structures |

---

## 2. Target Segments (Priority Order)

### Tier 1: Small-to-mid KVGs (primary target)
- **Profile:** €50M-€500M AUM, 2-10 AIFs, 1-3 compliance staff
- **Pain:** Manual eligibility checks, Excel-based investor registers, audit preparation takes weeks
- **Value prop:** Automate eligibility enforcement + get regulator-ready decision records
- **Price point:** €800-1,500/month
- **Examples:** Boutique real estate KVGs, private debt managers, infrastructure fund managers

### Tier 2: Fund administrators serving German KVGs
- **Profile:** Service providers handling back-office for multiple KVGs
- **Pain:** Different rules per fund/jurisdiction, manual reconciliation between KVG instructions and investor data
- **Value prop:** One engine for all funds, each with jurisdiction-specific rules
- **Price point:** €1,500-3,000/month (platform license)
- **Examples:** Universal Investment, HANSAINVEST, INTREAL, Hauck Aufhäuser Lampe

### Tier 3: Berlin/Munich fintech incubator cohorts
- **Profile:** Early-stage fund management / investment platforms
- **Pain:** Need compliance infrastructure but can't afford to build it
- **Value prop:** Embeddable compliance API — compliance-as-a-service
- **Price point:** API licensing, per-check pricing (€0.10-0.50/check)

---

## 3. Berlin Incubator & Accelerator Targets

### Direct application targets
| Incubator | Focus | Why relevant | Action |
|-----------|-------|--------------|--------|
| **FinLeap / Fintech Hub Berlin** | Fintech infrastructure | Invested in Solarisbank, Penta. Strong B2B fintech focus. | Apply to accelerator program |
| **Plug and Play Berlin** | Multi-vertical, fintech track | Corporate partners include Deutsche Bank, Commerzbank | Apply to fintech batch |
| **Axel Springer Porsche** | Deep tech / B2B SaaS | Porsche connection to asset management | Apply |
| **Berlin Startup Academy** | Early-stage Berlin focus | Local network, demo days | Join community |
| **APX (Axel Springer + Porsche)** | Pre-seed/seed B2B | Quick decisions, €50K-500K tickets | Apply for funding |
| **InsurTech Hub Munich** | Insurance + asset management | Cross-pollination with AIF managers | Network |

### Partnership / networking targets
| Organization | Value |
|-------------|-------|
| **BaFin Innovation Hub** | Regulatory sandbox access, legitimacy signal |
| **Bundesverband Alternative Investments (BAI)** | German AIF industry association — events, member directory |
| **BVI (Bundesverband Investment und Asset Management)** | Largest German fund industry association |
| **Frankfurt Fintech Community** | Frankfurt = fund management capital of Germany |
| **de:hub Berlin / Frankfurt** | Government-backed digital hub network |

---

## 4. Germany-Pilot Readiness Checklist

### Must-have (before first demo)
- [x] KAGB Spezial-AIF eligibility criteria (€200K semi-professional)
- [x] Decision provenance with integrity chain
- [x] Leverage compliance enforcement
- [x] LMT tracking (AIFMD II Art 16(2b))
- [x] Annex IV data export with leverage + liquidity
- [ ] **Copilot decision explanation** (in progress — template-based)
- [ ] **Scenario modeling** ("what if we change minimum to €250K?")
- [ ] **German-language regulatory citations** in check messages
- [ ] **KAGB-specific composite rule template** (Spezial-AIF compliance bundle)
- [ ] **5-minute demo script** (see Section 5)

### Nice-to-have (before pilot contract)
- [ ] Publikums-AIF template (retail German funds)
- [ ] BaFin reporting format alignment (quarterly §35 KAGB)
- [ ] German-language UI option (or at minimum, German regulatory terms in the engine)
- [ ] DSGVO/GDPR data processing documentation
- [ ] CI pipeline running

### Post-pilot
- [ ] Multi-tenancy (needed for fund admin platform play)
- [ ] RAG pipeline with KAGB full text
- [ ] API documentation for embedders (Tier 3 play)

---

## 5. Demo Script (5 minutes)

### Minute 0-1: The Problem
"April 16 is 8 weeks away. Your Spezial-AIF investor eligibility checks are in spreadsheets. When BaFin asks 'show me the decision trail for investor X from 6 months ago,' how long does it take? Hours? Days?"

### Minute 1-2: Fund Setup
Show: Create a Spezial-AIF fund structure → Set KAGB §1 eligibility criteria (€200K semi-professional) → Point out regulatory citation on every rule.

### Minute 2-3: Eligibility in Action
Show: Run eligibility check on a retail investor → **REJECTED** with clear explanation: "Retail investors not eligible for Spezial-AIF per KAGB §1 Abs. 6." Then run on a semi-professional with €150K → **REJECTED**: "Below €200,000 minimum per KAGB §1." Then with €250K → **APPROVED**.

### Minute 3-4: Decision Provenance
Show: Click on the decision record → Full audit trail: input snapshot, rule version, per-check results, integrity hash. "This is what you hand BaFin. Every decision, every rule version, cryptographically linked."

### Minute 4-5: What-If Scenario
Show: "What if we lower the minimum to €150K?" → Scenario analysis: "3 additional investors would qualify, representing €2.1M in potential subscriptions." Then show Annex IV export with leverage + liquidity data.

### Close
"This runs today. No integration needed. Your compliance officer logs in Monday morning and starts checking. €800/month. Want to try it with your actual fund data?"

---

## 6. Outreach Strategy (First 2 Weeks)

### Week 1: Warm outreach
1. **BAI member directory** — identify 20 German AIFMs with €50-500M AUM
2. **LinkedIn** — connect with compliance officers and COOs at target KVGs
3. **Cold email template:**

> Subject: AIFMD II compliance deadline — 8 weeks. Ready?
>
> Hi [Name],
>
> April 16 is the AIFMD II transposition deadline. German KVGs must comply with new leverage reporting, LMT requirements, and enhanced investor classification rules.
>
> We built Caelith — a compliance engine that automates investor eligibility checks for Spezial-AIFs and generates regulator-ready decision records with full audit trails. Every check cites the specific KAGB paragraph.
>
> I'm offering 3 free compliance health checks this month: run your fund structure through our engine, see what it catches. No commitment, 30 minutes.
>
> Based in Berlin. Happy to meet in person.
>
> Julian, CEO @ Caelith

### Week 2: Incubator applications + events
1. Submit to FinLeap, APX, Plug and Play
2. Attend BAI or BVI networking event (check calendar)
3. Post on LinkedIn: "We built the decision provenance engine that AIFMD II demands. Here's what most KVGs are missing." (Thought leadership)
4. Reach out to 3 fund administrators (Universal Investment, HANSAINVEST, INTREAL)

---

## 7. Success Metrics (30 days)

| Metric | Target |
|--------|--------|
| Demo calls completed | 5+ |
| Free health checks delivered | 3+ |
| Pilot LOIs signed | 1+ |
| Incubator applications submitted | 3+ |
| LinkedIn connections (compliance/fund mgmt) | 50+ |
| Pricing validation data points | 5+ (from conversations) |

---

## 8. Competitive Positioning

### Against spreadsheets (primary competitor)
"Spreadsheets don't have integrity chains. When BaFin asks for the decision trail, you're reconstructing from emails. We generate it automatically."

### Against big compliance platforms (Confluence, Deloitte tools)
"They charge €50K/year and take 6 months to implement. We're €800/month, live in a day, and our rules engine actually understands KAGB §1."

### Against other RegTech startups
"Show me the decision provenance. Show me the integrity chain. Show me the per-rule regulatory citation. That's what we do that nobody else does."

### The AIFMD II angle
"This isn't about being compliant — it's about being *provably* compliant. Every decision, every rule version, cryptographically linked. That's what the new directive demands."
