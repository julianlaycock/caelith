# Caelith â€” MVP Completion Report & Strategic Foundation

**Date:** February 9, 2026 (updated: Caelith rebrand + Berlin pivot)
**Author:** Product & Technical Assessment
**Status:** Fundable Prototype â€” Weeks 1â€“6 Technical Complete âœ…
**Classification:** Internal â€” Founder Reference Document

---

## Executive Summary

Caelith is source-available compliance infrastructure for tokenized assets. It provides programmable transfer restrictions that work off-chain today and on-chain tomorrow.

The MVP was built in 7 days (February 1â€“8, 2026) and has since been upgraded to a fundable prototype over an additional 2 days of intensive development. The system validates the core technical thesis: private asset transfer compliance can be codified into a deterministic, auditable rules engine that replaces manual compliance workflows.

**Current state:** PostgreSQL database, JWT authentication with RBAC (3 roles), 7 built-in validation rules + composable AND/OR/NOT custom rules, 6 EU regulatory templates (MiFID II, AIFMD, DLT Pilot, MiCA), HMAC-signed webhooks, cap table PDF export, security headers with rate limiting, interactive API documentation (Swagger UI), 19+ API endpoints, 7 frontend pages with institutional-grade UI, and 65 automated tests.

The product targets EU-based tokenization and digital securities platforms as its primary customer. These companies need compliant transfer restriction infrastructure but cannot justify building it internally. Caelith fills the gap between manual compliance processes and expensive enterprise platforms.

This document is the single source of truth for the project's direction.

---

## Part 1: What Was Built

### Technical Inventory

| Layer | Components | Status |
|-------|-----------|--------|
| **Database** | PostgreSQL 16, 10 tables, migration system, 6 repositories | Complete |
| **Auth** | JWT + RBAC (admin, compliance_officer, viewer), bcrypt password hashing | Complete |
| **Rules Engine** | 7 built-in rules + composable AND/OR/NOT custom rules, pure functions, deterministic | Complete |
| **EU Templates** | 6 pre-built templates (MiFID II, AIFMD, DLT Pilot, MiCA, DACH) | Complete |
| **Backend API** | Express.js, 19+ REST endpoints, 8 service classes, event logging, webhooks | Complete |
| **Security** | Security headers, rate limiting (API/auth/export), input sanitization | Complete |
| **Frontend** | Next.js 14, 7 pages, institutional dark-sidebar UI, DM Sans typography | Complete |
| **PDF Export** | Cap table PDF generation with pdfkit (branded, professional layout) | Complete |
| **Webhooks** | HMAC-SHA256 signed payloads, delivery tracking, retry support | Complete |
| **API Docs** | Swagger UI at /api/docs, OpenAPI 3.0 spec | Complete |
| **Testing** | Vitest, 65 tests (29 unit, 2 repository, 34 e2e) | Complete |
| **DevOps** | Docker Compose, Dockerfile, seed script, GitHub private repo | Complete |

### Rules Engine â€” The Core Asset

The rules engine is the product's primary differentiator. It validates transfers against configurable constraints:

**Built-in Rules (per asset):**

| Rule | What It Checks | Implementation |
|------|---------------|----------------|
| Self-transfer | Sender â‰  receiver | Equality check on investor IDs |
| Positive units | Units > 0 | Numeric validation |
| Sufficient units | Sender has enough units | Holdings lookup |
| Qualification | Receiver is accredited (if required) | Boolean flag on investor profile |
| Lockup period | Time since acquisition > lockup days | Date arithmetic against holding record |
| Jurisdiction whitelist | Receiver's jurisdiction is approved | Set membership check |
| Transfer whitelist | Receiver is on approved list (if restricted) | Set membership check |

**Composite Rules (custom, per asset):**

| Feature | Description |
|---------|-------------|
| AND/OR/NOT operators | Boolean logic for combining conditions |
| Field conditions | `to.jurisdiction`, `to.accredited`, `from.jurisdiction`, `from.accredited`, `transfer.units`, `holding.units` |
| Comparison operators | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in` |
| Enable/disable | Toggle rules without deleting them |
| Versioning | Full history of every rule change |

Key properties:
- **Deterministic:** Same inputs always produce the same output
- **Pure:** No side effects, no database mutations during validation
- **Composable:** Rules are evaluated independently and violations are aggregated
- **Simulatable:** `/transfers/simulate` endpoint validates without executing
- **Explainable:** Returns per-rule check results with human-readable messages

### EU Regulatory Templates

Pre-built compliance configurations that can be applied to assets:

| Template | Framework | Key Settings |
|----------|-----------|-------------|
| MiFID II â€” Professional | MiFID II | EEA only, accredited required, no lockup |
| MiFID II â€” Retail | MiFID II | EEA only, 7-day lockup |
| AIFMD â€” Qualified | AIFMD | EEA only, accredited required, 90-day lockup, min 100 units |
| DLT Pilot Regime | EU Reg 2022/858 | EU only, both parties accredited, 30-day lockup |
| MiCA â€” CASP | MiCA | EU only, 14-day withdrawal lockup |
| DACH Private Placement | National (DE/AT/CH) | DACH only, accredited, 180-day lockup |

### API Endpoints

| Resource | Endpoints | Operations |
|----------|-----------|-----------|
| Auth | 2 | Register, login |
| Assets | 4 | Create, list, get by ID, utilization stats |
| Investors | 4 | Create, list, get by ID, update |
| Holdings | 4 | Allocate, query by asset/investor, cap table, **PDF export** |
| Rules | 3 | Create/update, get by asset, version history |
| Composite Rules | 4 | Create, list, update, delete |
| Transfers | 4 | Simulate, execute, list, history with names |
| Templates | 2 | List all, get by ID |
| Webhooks | 5 | Register, list, update, delete, delivery history |
| Events | 1 | Filterable audit trail |
| System | 2 | Health check, database reset (testing) |
| Docs | 1 | Swagger UI |

### Security

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT tokens with bcrypt password hashing |
| Authorization | Role-based (admin, compliance_officer, viewer) |
| Security headers | X-Content-Type-Options, X-Frame-Options, CSP, HSTS, Referrer-Policy |
| Rate limiting | 200 req/15min (API), 20 req/15min (auth), 10 req/min (exports) |
| Input sanitization | Null byte removal, whitespace trimming, length limiting |
| Secrets management | JWT_SECRET required from environment (no hardcoded fallbacks) |

### Known Bugs

All 3 original MVP bugs have been fixed. No known bugs at this time.

### Test Coverage

```
Total: 65/65 passing
â”œâ”€â”€ Rules Engine: 20 tests (unit)
â”œâ”€â”€ Composite Rules: 9 tests (unit)
â”œâ”€â”€ Repositories: 2 tests (integration)
â”œâ”€â”€ Happy Path E2E: 10 tests
â”œâ”€â”€ Validation Failures E2E: 8 tests
â”œâ”€â”€ Audit Trail E2E: 10 tests
â””â”€â”€ Composite Rules E2E: 6 tests
```

---

## Part 2: Product Identity

### Name

**Caelith** (pronounced KAY-lith) — From Latin *caelum* (sky, heavens). Evokes clarity, oversight, and the elevated perspective required for compliance infrastructure. The name is elegant, scientific, and completely ownable — zero results on TMView across Classes 9, 35, 36, and 42 (verified February 9, 2026).

Works across contexts:
- Product: "Caelith Compliance Engine"
- CLI: `caelith validate`, `caelith simulate`
- API: `api.caelith.tech`
- Domain: `caelith.tech`
- Brand: Elegant, precise, institutional

Brand personality: celestial + minimal + modern (Anthropic / Stripe / Notion energy)

**Trademark search history:** Codex (153 results, blocked), Ledgr (35, blocked by exact match), Proviso (118, crowded), Meridian (1,788), Reverie (203), Zenith (1,650), Boreal (787), Chronicle (1,116), Circadian (87, conflicts in target classes). Caelith: **0 results**.

### Positioning Statement

> Source-available compliance infrastructure for tokenized assets â€” programmable transfer restrictions that work off-chain today and on-chain tomorrow.

### Licensing Model

**Source-available with open API** (Business Source License style)

- Source code is readable and auditable â€” critical for regulated entities that need to inspect compliance logic
- Commercial use requires a license â€” protects the business model
- Open API specification â€” enables ecosystem integrations without exposing core IP
- Converts to fully open-source after 3-4 years (BSL standard practice)

This model is proven by MongoDB (SSPL), HashiCorp (BSL), Sentry (BSL), and MariaDB (BSL).

---

## Part 3: Market Context

### The Opportunity

The transfer agency services market is valued at approximately â‚¬14B with 7% CAGR through 2033. Within this, tokenized real-world assets on-chain exceeded â‚¬27B as of September 2025, with forecasts projecting â‚¬550B+ by 2030.

Three forces are converging:

1. **EU regulatory clarity.** MiCA (fully enforceable 2025), DLT Pilot Regime, and national sandbox programs provide clear frameworks for tokenized securities. This is pulling institutional capital into the space.

2. **Infrastructure build-out.** Tokenization platforms are actively building right now. They need compliance infrastructure but face a build-vs-buy decision where building is increasingly untenable.

3. **Transfer restriction gap.** Nobody offers a source-available, programmable compliance engine for tokenized asset transfers that works both on-chain and off-chain. Carta owns cap tables. Securitize owns tokenized issuance. The transfer restriction layer is unowned.

### Why Now

The EU's DLT Pilot Regime allows market infrastructures to trade and settle tokenized securities under regulatory supervision. This creates immediate demand for compliant transfer restriction systems. Platforms operating under the regime need to enforce investor eligibility, jurisdiction restrictions, lockup periods, and transfer limits â€” exactly what Caelith does.

MiCA's full enforcement means crypto-asset service providers across the EU now need formal compliance systems. The market is transitioning from "experimental pilots" to "production infrastructure" in 2026.

### Target Customer Profile

**Primary:** EU-based tokenization and digital securities platforms

Characteristics:
- 5-50 employees, Series Seed to Series B
- Building infrastructure for tokenized bonds, real estate, private credit, or fund units
- Operating under (or applying for) MiFID II, DLT Pilot Regime, or national sandbox licenses
- Technical team that evaluates via API documentation, not sales demos
- Need compliance infrastructure but can't justify a dedicated compliance engineering team
- Currently using manual processes, hardcoded smart contract logic, or expensive consultants

**Examples of potential customers (EU):**
- Tokeny (Luxembourg) â€” tokenization compliance platform
- Centrifuge (Germany) â€” on-chain RWA infrastructure
- Securitize EU operations
- Bitpanda (Austria) â€” tokenized assets
- Backed Finance (Switzerland) â€” tokenized securities
- CashOnLedger (Germany) â€” tokenized invoices and bonds

**Secondary (future expansion):**
- Fund administrators managing private equity/VC
- SPV platforms
- Family offices with complex holdings

### Competitive Landscape

| Competitor | What They Do | Why Caelith Wins |
|-----------|-------------|----------------|
| **Carta** ($7.4B valuation) | Cap table management, 409A valuations, fund admin | No programmable transfer rules. US-focused. Proprietary. â‚¬2,500+/year. |
| **Pulley** | Simpler cap table management | No transfer restriction logic. No EU compliance. |
| **Ledgy** | EU-focused equity management | No programmable compliance engine. Equity focus, not tokenized assets. |
| **Securitize** | Tokenized securities issuance platform | Full platform (not embeddable). Expensive. Not source-available. |
| **Tokeny** | Token compliance (T-REX protocol) | Blockchain-only. Ethereum-specific. Not off-chain compatible. |
| **Captable.inc** | Open-source Carta alternative | Abandoned (6 months no updates). No rules engine. |
| **Custom builds** | In-house compliance logic | Unsustainable: can't maintain regulatory correctness, security certs, integrations |

**Caelith's unique position:** The only source-available, programmable compliance engine that works off-chain (API) and can bridge to on-chain (smart contract rule export). This is infrastructure, not a platform â€” it embeds into existing products.

---

## Part 4: Honest Assessment â€” Gaps & Risks

### Technical Gaps (Ordered by Priority)

| Gap | Severity | Cost to Fix | Notes |
|-----|----------|------------|-------|
| ~~No authentication or RBAC~~ | ~~Critical~~ | ~~1-2 weeks~~ | **âœ… DONE â€” JWT + 3 RBAC roles** |
| ~~SQLite (no concurrency)~~ | ~~Critical~~ | ~~1 week~~ | **âœ… DONE â€” PostgreSQL 16** |
| ~~No webhook/event streaming~~ | ~~High~~ | ~~1 week~~ | **âœ… DONE â€” HMAC-SHA256 webhooks** |
| ~~No document generation~~ | ~~Medium~~ | ~~1-2 weeks~~ | **âœ… DONE â€” Cap table PDF export** |
| ~~Frontend is MVP-grade~~ | ~~Medium~~ | ~~2-3 weeks~~ | **âœ… DONE â€” Institutional redesign** |
| ~~No composite rules (AND/OR)~~ | ~~Medium~~ | ~~1 week~~ | **âœ… DONE â€” AND/OR/NOT with field conditions** |
| ~~Security headers, rate limiting~~ | ~~High~~ | ~~1 week~~ | **âœ… DONE â€” Headers, rate limiting, sanitization** |
| No data encryption at rest | **High** | 3-5 days | Required for GDPR and any enterprise conversation |
| No KYC/AML integration | **Medium** | 1-2 weeks | Sandbox integration with EU provider (e.g., IDnow) |
| No API key management | **Medium** | 2-3 days | Platforms integrate via API keys, not JWT |
| No blockchain bridge | **Low (now)** | 4-8 weeks | Important for positioning, not required for first pilots |

### Strategic Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **Tokenization market slowdown** | Low | Market is accelerating (MiCA, DLT Pilot Regime). Hedge by keeping fund admin as secondary market. |
| **Large player enters space** | Medium | Carta or Securitize could build this. Mitigation: speed + source-available model (they won't open their code). |
| **Solo founder risk** | High | Investors will ask about this. Mitigation: demonstrate velocity, use AI leverage as narrative, actively build advisory network. |
| **Regulatory complexity exceeds capacity** | Medium | Can't be an expert in all EU jurisdictions alone. Mitigation: start with 2-3 jurisdictions (DE, LU, AT), hire compliance advisor post-funding. |
| **Customer discovery reveals wrong assumptions** | Medium | This is actually good â€” better to learn early. Start conversations immediately. |

### What's Defensible (The Moat)

The moat is not the code. It's the combination of:

1. **Compliance knowledge encoded in software** â€” Rule templates for MiFID II, AIFMD, DLT Pilot Regime that are tested, versioned, and auditable
2. **Source-available trust** â€” Regulated entities can inspect the compliance logic, unlike proprietary competitors
3. **Certifications** â€” SOC 2, ISO 27001, pentest reports (post-funding) create switching costs
4. **Network effects** â€” Rule template marketplace where compliance teams share and improve rule sets
5. **Integration depth** â€” Deep integrations with KYC providers, custodians, and blockchain networks create lock-in

None of these can be replicated by a competitor prompting Claude for a weekend. This is the answer to "why can't someone just rebuild this with AI?"

---

## Part 5: Roadmap â€” MVP to Fundable Prototype

### Guiding Principles

1. **Customer discovery runs in parallel with development.** Don't wait to finish building before talking to people.
2. **Build for one customer, design for many.** Every feature should solve a specific problem a tokenization platform CTO told you about.
3. **Source-available from day one.** Put the repo on GitHub with BSL license early. It's a trust signal.
4. **EU-first, US-ready.** Architecture supports both, but compliance validation targets EU (MiFID II, DLT Pilot, MiCA) first.

### Sprint Plan (12 Weeks to Fundable Prototype)

#### Weeks 1-2: Foundation + Customer Discovery Start âœ… COMPLETE

**Technical â€” ALL DONE:**
- [x] Fix 3 known frontend bugs (Select name prop, acquired_at, formatNumber null guard)
- [x] PostgreSQL migration (replace SQLite, keep repository layer clean)
- [x] Authentication system (JWT + refresh tokens)
- [x] RBAC (3 roles: admin, compliance_officer, investor_readonly)
- [x] Environment configuration (dev/staging/production)
- [x] Git cleanup and repository on GitHub (private)

**Business:**
- [ ] Set up LinkedIn presence for Caelith
- [ ] Draft outreach message for tokenization platform contacts
- [ ] Identify 20 EU tokenization platforms and their CTOs/technical leads
- [ ] Send first 10 outreach messages
- [ ] Schedule 3-5 discovery calls for weeks 3-4

#### Weeks 3-4: Compliance Engine V2 + First Conversations âœ… COMPLETE

**Technical â€” ALL DONE:**
- [x] Composite rules (AND/OR/NOT logic for complex constraints)
- [x] Rule versioning with full history (which rules applied to which transfer, when)
- [x] EU jurisdiction rule templates (MiFID II, AIFMD, DLT Pilot, MiCA, DACH)
- [x] Transfer simulation with detailed explanations (per-rule check results)
- [x] Webhook system for event notifications (HMAC-SHA256 signed payloads)

**Business:**
- [ ] Conduct 3-5 customer discovery calls
- [ ] Document pain points, current workflows, willingness to pilot
- [ ] Collect quotes (even informal ones)
- [ ] Refine positioning based on conversations
- [ ] Identify which specific compliance features matter most to prospects

#### Weeks 5-6: Integration Layer + Demo Environment âœ… PARTIALLY COMPLETE

**Technical:**
- [ ] KYC/AML sandbox integration (IDnow or Onfido)
- [x] ~~REST + basic GraphQL API~~ â†’ **Deferred (REST is sufficient)**
- [ ] API key management for platform integrations
- [x] Interactive API documentation (Swagger UI at /api/docs)
- [x] Demo environment with pre-loaded realistic data (3 assets, 10 investors, rules, transfers)
- [ ] Scenario modeling endpoint ("what-if" analysis for rule changes)

**Also completed (pulled forward from weeks 7-8):**
- [x] Cap table PDF export
- [x] Security headers + rate limiting + input sanitization
- [x] Frontend redesign (institutional-grade dark sidebar UI)

**Business:**
- [ ] Conduct 3-5 more discovery calls (total: 6-10)
- [ ] Identify 1-2 prospects willing to pilot
- [ ] Begin incubator research and relationship-building
- [ ] Draft one-pager for Caelith

#### Weeks 7-8: Remaining Frontend + Security Hardening ðŸ”œ NEXT

**Technical:**
- [x] ~~Redesign frontend with professional financial UI~~ **âœ… DONE (pulled forward)**
- [ ] Visual rule builder (drag-and-drop constraint configuration)
- [ ] Investor self-service portal (read-only view of holdings and transfer history)
- [x] ~~Document generation (cap table PDF)~~ **âœ… DONE (pulled forward)**
- [ ] Data encryption at rest (PostgreSQL transparent data encryption)
- [x] ~~Security headers, rate limiting, input sanitization~~ **âœ… DONE (pulled forward)**
- [ ] API key management for platform integrations

**Business:**
- [ ] Finalize pilot terms with 1-2 prospects (free pilot, 3-month term, feedback commitment)
- [ ] Submit first incubator application(s)
- [ ] Prepare pitch deck (10 slides)

#### Weeks 9-10: Pilot Preparation + Blockchain Preview

**Technical:**
- [ ] On-chain rule export preview (generate ERC-1400/ERC-3643 compatible configs)
- [ ] Multi-asset support (multiple funds/assets under one instance) â€” already works
- [ ] Notification system (email alerts on transfers, rule changes, violations)
- [ ] Performance optimization (target: <50ms p99 validation latency)
- [ ] Comprehensive logging and monitoring (structured logs, health checks)

**Business:**
- [ ] Begin pilot with first customer
- [ ] Collect early feedback and iterate
- [ ] Continue incubator conversations
- [ ] Attend 1-2 EU fintech/blockchain events (virtual or in-person)

#### Weeks 11-12: Documentation + Incubator Readiness

**Technical:**
- [ ] Comprehensive developer documentation site
- [ ] Getting started guide ("Integrate Caelith in 30 minutes")
- [ ] Architecture decision records (ADRs) for key technical choices
- [ ] Automated CI/CD pipeline
- [ ] Load testing and performance benchmarks published

**Business:**
- [ ] Compile pilot feedback into case study
- [ ] Finalize incubator applications with pilot data
- [ ] Record 3-minute product demo video
- [ ] Prepare 5-minute pitch for incubator interviews
- [ ] Update one-pager with validation data

---

## Part 6: What Requires Funding (Cannot Be Done Solo for Free)

### Pre-Funding (â‚¬0 â€” Solo Founder + AI)

Everything in the 12-week sprint plan above. AI-accelerated development makes all technical work achievable at zero cash cost.

### Post-Funding â€” Phase 1 (â‚¬30K-â‚¬60K)

| Item | Cost | Why |
|------|------|-----|
| Legal entity formation (Germany UG) | â‚¬2K-â‚¬5K | UG (haftungsbeschränkt) in Berlin — ~€300-500 to set up. Required for contracts, GDPR compliance |
| GDPR compliance (DPO, privacy policy, DPIA) | â‚¬5K-â‚¬15K | Non-negotiable for EU B2B SaaS handling personal data |
| KYC provider production access | â‚¬3K-â‚¬10K | Sandbox is free, production requires contract + fees |
| Basic penetration test | â‚¬8K-â‚¬20K | Required for enterprise prospects and incubator credibility |
| Infrastructure (hosting, monitoring, backups) | â‚¬3K-â‚¬8K/year | Production PostgreSQL, logging, uptime monitoring |
| Trademark registration (EU) | â‚¬1K-â‚¬2K | Protect the Caelith name — TMView clear (0 results), file at EUIPO in Classes 9, 35, 36, 42 |

### Post-Funding â€” Phase 2 (â‚¬50K-â‚¬150K)

| Item | Cost | Why |
|------|------|-----|
| SOC 2 Type I certification | â‚¬25K-â‚¬50K | Enterprise procurement requirement |
| Additional integrations (e-signature, custodian) | â‚¬10K-â‚¬30K | Production contracts with DocuSign/qualified e-sig provider |
| Compliance advisor (part-time) | â‚¬15K-â‚¬40K/year | Expert review of rule templates for MiFID II/AIFMD accuracy |
| First hire (senior engineer or compliance specialist) | Market rate | Once revenue or significant funding secured |

**Total to enterprise-ready: â‚¬80K-â‚¬210K over 12-18 months.**

---

## Part 7: Incubator Strategy

### Recommended Programs (EU, Fintech/RegTech Focus)

#### Tier 1 — Strong Fit (Berlin / Germany)

| Program | Location | Focus | Why It Fits | Application |
|---------|----------|-------|-------------|-------------|
| **EXIST Gründerstipendium** | Germany (HWR Berlin) | Deep tech / academic | Up to €150K grant (no equity). You're a student at HWR — textbook fit. | Through HWR startup office |
| **HWR Berlin Startup Incubator** | Berlin | University startups | Direct access, warm relationship, they want their students to succeed. | Internal application |
| **Techstars Fintech (various)** | London/remote | Fintech | Strong mentor network in financial infrastructure. €100K+ investment. | Cohort-based, check dates quarterly |
| **FinTech Hub Berlin / de:hub Fintech** | Berlin | Fintech ecosystem | Berlin's official fintech cluster. Network access, events, corporate partnerships. | Application/membership |
| **Startup Wise Guys FinTech** | Tallinn, Estonia | B2B Fintech | Focused specifically on financial technology. €50K investment. | Cohort-based, ~2 per year |

#### Tier 2 — Worth Exploring

| Program | Location | Focus | Why |
|---------|----------|-------|-----|
| **F10 Zurich/Madrid** | Zurich, Madrid | FinTech & RegTech | Swiss finance network. Partnerships with SIX, Julius Baer. Madrid cohort possible remote. |
| **Plug and Play Fintech** | Various EU hubs | Fintech | Corporate partnership network (banks, asset managers). No equity taken. |
| **German Accelerator** | Berlin/remote | German startups going global | Government-backed. Focus on scaling German startups internationally. |
| **Seedcamp** | London | Generalist (strong fintech portfolio) | €100K-€200K pre-seed. Strong European network. |
| **EIT Digital** | Pan-EU | Digital innovation | Grants + acceleration. Focus on digital infrastructure. |

#### Tier 3 — Grants (No Equity)

| Grant | Amount | Notes |
|-------|--------|-------|
| **EXIST Gründerstipendium** | Up to €150K | Your #1 priority. Student at HWR Berlin = direct eligibility. |
| **INVEST Grant (Germany)** | 25% subsidy on angel investments | Incentivizes business angels to invest in German startups |
| **Horizon Europe / EIC Accelerator** | Up to €2.5M | Highly competitive but significant. |
| **ENISA (Spain)** | Up to €300K | Participative loan. If you establish a Spanish entity later. Remote possible. |
| **CDTI (Spain)** | Varies | R&D grants for tech companies in Spain. Remote possible from Valencia connections. |

### Approach Strategy

**Do not cold-apply.** For every program above:

1. Find a portfolio company founder or mentor on LinkedIn
2. Message them asking for advice about the program (not asking to be introduced)
3. Mention you're building compliance infrastructure for tokenized assets in the EU
4. Ask if they'd be willing to share their experience with the program
5. Build the relationship over 2-3 conversations
6. Then ask if they'd recommend applying, and if they'd be willing to introduce you

This warm approach has 5-10x the success rate of cold applications.

### EXIST Should Be Your First Move

You're a student at HWR Berlin, building a fintech product in Germany, and EXIST grants go up to €150K with no equity dilution. As a student at a German university with a working prototype, you're a textbook fit for EXIST. Apply through HWR's startup support office as soon as possible.

**Secondary:** ENISA (Spain) remains an option if you establish a Spanish entity later, and Berlin-based incubators (see Tier 1 below) provide ecosystem access.
---

## Part 8: Customer Discovery Playbook

### Outreach Script (For EU Tokenization Platform CTOs)

**LinkedIn message (first contact):**

> Hi [Name] â€” I've been following [Company]'s work on [specific thing they've done]. I'm building open compliance infrastructure for tokenized asset transfers (think: programmable transfer restrictions as an API) and I'm trying to understand how platforms like yours currently handle investor eligibility checks and transfer validation. Would you have 15 minutes for a quick call? Not selling anything â€” just learning.

**What to ask on calls:**

1. "Walk me through what happens when an investor wants to transfer tokenized securities on your platform today."
2. "How do you currently enforce transfer restrictions â€” is that in smart contracts, manual review, or something else?"
3. "What's the most painful part of compliance for your engineering team?"
4. "If you could outsource one piece of your compliance infrastructure, what would it be?"
5. "How do you handle jurisdiction-specific rules? Is that configured per asset or globally?"
6. "What would a compliance API need to do for you to consider integrating it?"

**What to listen for:**
- "We built it ourselves and it's a nightmare to maintain" â†’ strong signal
- "Our compliance team reviews every transfer manually" â†’ strong signal
- "We hardcoded rules into our smart contracts" â†’ strong signal
- "We use [competitor]" â†’ find out what's missing
- "This isn't a priority for us" â†’ move on, not your customer

### Target Companies (First 20)

**Germany (priority — Berlin ecosystem):** Centrifuge, CashOnLedger, Finoa, Tangany, Black Manta Capital
**Luxembourg:** Tokeny, FundsDLT, InvestSuite
**Switzerland:** Backed Finance, Sygnum, SDX (SIX Digital Exchange), Taurus
**Austria:** Bitpanda (institutional), Artis
**Spain:** Onyze, Bit2Me (institutional arm)
**France:** Société Générale FORGE, Spiko
**Nordics:** Fnality, SEB Digital Assets

---

## Part 9: Technical Architecture â€” Current State

### Architecture (As Built)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    Caelith Dashboard (Next.js 14)                  â”‚
â”‚  Dashboard â”‚ Assets â”‚ Investors â”‚ Holdings â”‚ Rules â”‚ Transfers  â”‚
â”‚  Audit Trail â”‚ Login/Register                                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚ HTTPS/JSON
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                      Caelith API (Express)                         â”‚
â”‚  Security Headers â”‚ Rate Limiting â”‚ Input Sanitization           â”‚
â”‚  Auth (JWT) â”‚ RBAC (3 roles) â”‚ Swagger UI                       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   Business Logic Layer                            â”‚
â”‚  AssetService â”‚ InvestorService â”‚ TransferService                â”‚
â”‚  RulesService â”‚ HoldingService â”‚ AuthService â”‚ WebhookService    â”‚
â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
     â”‚                                         â”‚
     â”‚    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
     â”‚    â”‚          Caelith Compliance Engine                       â”‚
     â”‚    â”‚  - 7 built-in validation rules                        â”‚
     â”‚    â”‚  - Composite rules (AND/OR/NOT)                       â”‚
     â”‚    â”‚  - 6 EU regulatory templates                          â”‚
     â”‚    â”‚  - Rule versioning + audit                            â”‚
     â”‚    â”‚  - Transfer simulation + explanation                  â”‚
     â”‚    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
     â”‚                                         â”‚
â”Œâ”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              Data Access Layer (6 Repositories)                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                      PostgreSQL 16                                â”‚
â”‚  assets â”‚ investors â”‚ holdings â”‚ transfers â”‚ rules â”‚ events      â”‚
â”‚  rule_versions â”‚ composite_rules â”‚ users â”‚ webhooks              â”‚
â”‚  webhook_deliveries                                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

Outputs:
  â”œâ”€â”€ Cap Table PDF (pdfkit)
  â”œâ”€â”€ Webhook Events (HMAC-SHA256 signed)
  â””â”€â”€ Swagger UI (/api/docs)
```

### Technology Stack

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Node.js 20+ / TypeScript (strict) | Type safety, fast iteration |
| API | Express.js | Simple, well-understood |
| Database | PostgreSQL 16 | ACID, concurrent users, production-grade |
| Auth | JWT + bcrypt | Stateless, standard |
| Frontend | Next.js 14 + Tailwind CSS | Component reuse, rapid UI development |
| PDF | pdfkit | Native Node.js, no external dependencies |
| Testing | Vitest | Fast, TypeScript-native |
| Deployment | Docker Compose | One-command local setup |
| Repository | GitHub (private) | Standard, CI/CD ready |
| Hosting (production) | Hetzner Cloud (EU) | GDPR-compliant, â‚¬20-50/month, German data centers |

---

## Part 10: Key Metrics & Milestones

### 12-Week Milestones

| Week | Milestone | Status |
|------|-----------|--------|
| 2 | Foundation complete | âœ… Auth, RBAC, PostgreSQL |
| 4 | Compliance V2 live | âœ… Composite rules, EU templates, webhooks |
| 6 | Integration-ready | âœ… Swagger UI, demo environment, PDF export, security hardening |
| 8 | Demo-ready | ðŸ”œ API keys, visual rule builder, pilot agreements |
| 10 | Pilot running | Pending |
| 12 | Incubator-ready | Pending |

### Key Metrics to Track

| Metric | Target (Week 12) | Current |
|--------|------------------|---------|
| Discovery calls completed | 10+ | 0 |
| Pilot agreements signed | 1-2 | 0 |
| API response time (p99) | <50ms | Not yet measured |
| Test coverage | >80% | 65 tests passing |
| GitHub stars (after public) | 50+ | Private repo |
| Incubator applications submitted | 2-3 | 0 |

---

## Part 11: Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| No customer interest after 10 calls | Low | Critical | Pivot to fund admin market (secondary target) | Founder |
| ~~Caelith name already trademarked in EU~~ | ~~Medium~~ | ~~Medium~~ | **✅ Resolved — "Caelith" has 0 TMView results. Domain: caelith.tech** | Founder |
| Solo founder burnout | Medium | High | Strict weekly schedule. Sunday off. Ship small, celebrate progress. | Founder |
| ~~PostgreSQL migration breaks tests~~ | ~~Low~~ | ~~Medium~~ | **âœ… Resolved â€” all 65 tests passing** | |
| Incubator rejection | Medium | Medium | Apply to 3+ programs. EXIST through HWR as primary. ENISA as remote backup. | Founder |
| Security vulnerability discovered | Low | High | Basic pentest before any pilot. Responsible disclosure policy. | Founder |
| Competitor launches similar product | Low | Medium | Speed advantage + source-available trust. EU-focused. | Founder |

---

## Part 12: Immediate Next Steps

### Technical (This Week)
1. **API key management** â€” platforms integrate via API keys, not JWT login
2. **Scenario modeling endpoint** â€” "what-if" rule change analysis
3. **CI/CD pipeline** â€” GitHub Actions for automated testing on push

### Business (This Week)
1. **Secure caelith.tech domain** — do this immediately before someone grabs it
2. **Contact HWR Berlin startup office** — inquire about EXIST application process and incubator
3. **Draft LinkedIn outreach messages** to 10 tokenization platform contacts (Berlin-first: Centrifuge, CashOnLedger, Finoa, Tangany)
4. **Research EXIST Gründerstipendium requirements** — most accessible funding path as HWR student
5. **Draft Caelith one-pager** (PDF) for outreach conversations
---

## Appendix A: Files in Current Codebase

```
caelith/ (GitHub: github.com/julianlaycock/caelith)
â”œâ”€â”€ migrations/                    # PostgreSQL schema migrations
â”œâ”€â”€ scripts/
â”‚   â”œâ”€â”€ migrate.ts                 # Migration runner
â”‚   â”œâ”€â”€ seed-data.ts               # Demo data generator (3 assets, 10 investors)
â”‚   â””â”€â”€ test-api.ts                # API integration test
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ backend/
â”‚   â”‚   â”œâ”€â”€ db.ts                  # PostgreSQL connection (pg Pool)
â”‚   â”‚   â”œâ”€â”€ server.ts              # Express server (port 3001)
â”‚   â”‚   â”œâ”€â”€ models/index.ts        # TypeScript interfaces
â”‚   â”‚   â”œâ”€â”€ repositories/ (6)      # Data access layer
â”‚   â”‚   â”œâ”€â”€ services/ (8)          # Business logic + PDF export
â”‚   â”‚   â”œâ”€â”€ routes/ (9)            # API endpoints + templates
â”‚   â”‚   â””â”€â”€ middleware/ (2)        # Auth/RBAC + security
â”‚   â”œâ”€â”€ rules-engine/
â”‚   â”‚   â”œâ”€â”€ types.ts               # Rule interfaces
â”‚   â”‚   â”œâ”€â”€ validator.ts           # 7 built-in validation rules
â”‚   â”‚   â”œâ”€â”€ composite.ts           # AND/OR/NOT rule evaluator
â”‚   â”‚   â”œâ”€â”€ validator.test.ts      # 20 unit tests
â”‚   â”‚   â””â”€â”€ composite.test.ts      # 9 unit tests
â”‚   â””â”€â”€ frontend/                  # Next.js 14 app (port 3000)
â”‚       â””â”€â”€ src/
â”‚           â”œâ”€â”€ app/ (7 pages + login)
â”‚           â”œâ”€â”€ components/ (ui.tsx, sidebar.tsx, auth-layout.tsx)
â”‚           â””â”€â”€ lib/ (api.ts, types.ts, hooks.ts, utils.ts)
â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ unit/repositories.test.ts  # 2 repository tests
â”‚   â”œâ”€â”€ e2e/ (4 files)             # 34 e2e tests
â”‚   â””â”€â”€ fixtures/test-data.ts      # Test data + helpers
â”œâ”€â”€ openapi.yml                    # API specification (v2)
â”œâ”€â”€ docker-compose.yml             # PostgreSQL + backend + frontend
â”œâ”€â”€ Dockerfile                     # Backend container
â”œâ”€â”€ README.md                      # Comprehensive project docs
â”œâ”€â”€ CAELITH_REPORT.md                # THIS DOCUMENT (formerly CODEX_REPORT.md)
â”œâ”€â”€ package.json
â”œâ”€â”€ tsconfig.json
â””â”€â”€ vitest.config.ts
```

## Appendix B: Document Supersession

| Document | Status | Notes |
|----------|--------|-------|
| HANDOFF.md | **Superseded** | Phase 3â†’4 transition doc. Historical only. |
| BUILD_PLAN.md | **Superseded** | Original 7-day MVP plan. Completed. |
| BOOTSTRAP_SUMMARY.md | **Archived** | Initial setup record. Historical only. |
| PRD.md | **Partially superseded** | Core requirements valid. Strategy updated here. |
| ARCHITECTURE.md | **Superseded** | Current architecture documented in Part 9 above. |
| DATA_MODEL.md | **Active** | Schema reference. Updated for PostgreSQL. |
| WORKING_RULES.md | **Active** | Code conventions remain in effect. |
| CODEX_REPORT.md | **Superseded** | Replaced by CAELITH_REPORT.md. All references to "Codex" now refer to "Caelith". |

## Appendix C: Development Velocity Log

| Date | Work Completed |
|------|---------------|
| Feb 1-7 | MVP: SQLite, Express API, rules engine, Next.js frontend, 49 tests |
| Feb 8 | E2E tests, Docker Compose, OpenAPI spec, seed script, README |
| Feb 9 AM | PostgreSQL migration, auth + RBAC, composite rules, webhooks, frontend V2 |
| Feb 9 PM | Swagger UI, GitHub repo, security hardening, PDF export, EU templates, README rewrite |

| Feb 9 EVE | Brand finalization (Caelith), trademark clearance, Berlin pivot, strategic doc update |

**Total development time: ~9 days (solo founder + AI)**
**Current state: 65 tests, 19+ endpoints, 7 pages, 6 EU templates, production security**

---

**This document is the single source of truth for the Caelith project.
Formerly known as "Codex" — rebranded February 9, 2026 after trademark clearance.**

Last updated: February 9, 2026, 16:30 UTC (Caelith rebrand + Berlin pivot)
