# Codex — MVP Completion Report & Strategic Foundation

**Date:** February 9, 2026
**Author:** Product & Technical Assessment
**Status:** MVP Complete → Transitioning to Fundable Prototype
**Classification:** Internal — Founder Reference Document

---

## Executive Summary

Codex is source-available compliance infrastructure for tokenized assets. It provides programmable transfer restrictions that work off-chain today and on-chain tomorrow.

The MVP was built in 7 days (February 1–8, 2026) and validates the core technical thesis: private asset transfer compliance can be codified into a deterministic, auditable rules engine that replaces manual compliance workflows. The system currently handles investor registration, ownership tracking, rule configuration, transfer validation, and immutable audit logging across 13 API endpoints, 7 frontend pages, and 49 automated tests.

The product targets EU-based tokenization and digital securities platforms as its primary customer. These companies need compliant transfer restriction infrastructure but cannot justify building it internally. Codex fills the gap between manual compliance processes and expensive enterprise platforms.

This document replaces all previous planning documents (HANDOFF.md, BUILD_PLAN.md) as the single source of truth for the project's direction.

---

## Part 1: What Was Built

### Technical Inventory

| Layer | Components | Status |
|-------|-----------|--------|
| **Database** | SQLite (sql.js), 6 tables, migration system, 6 repositories | Complete |
| **Rules Engine** | 7 validation rules, pure functions, deterministic, zero side effects | Complete |
| **Backend API** | Express.js, 13 REST endpoints, 5 service classes, event logging | Complete |
| **Frontend** | Next.js 14, 7 pages (Dashboard, Assets, Investors, Holdings, Rules, Transfers, Audit) | Complete |
| **Testing** | Vitest, 49 tests (20 unit, 2 repository, 27 e2e) | Complete |
| **Documentation** | README, OpenAPI spec, Docker Compose, seed script | Complete |

### Rules Engine — The Core Asset

The rules engine is the product's primary differentiator. It validates transfers against configurable constraints:

| Rule | What It Checks | Implementation |
|------|---------------|----------------|
| Self-transfer | Sender ≠ receiver | Equality check on investor IDs |
| Positive units | Units > 0 | Numeric validation |
| Sufficient units | Sender has enough units | Holdings lookup |
| Qualification | Receiver is accredited (if required) | Boolean flag on investor profile |
| Lockup period | Time since acquisition > lockup days | Date arithmetic against holding record |
| Jurisdiction whitelist | Receiver's jurisdiction is approved | Set membership check |
| Transfer whitelist | Receiver is on approved list (if restricted) | Set membership check |

Key properties:
- **Deterministic:** Same inputs always produce the same output
- **Pure:** No side effects, no database mutations during validation
- **Composable:** Rules are evaluated independently and violations are aggregated
- **Simulatable:** `/transfers/simulate` endpoint validates without executing

### API Endpoints

| Resource | Endpoints | Operations |
|----------|-----------|-----------|
| Assets | 4 | Create, list, get by ID, utilization stats |
| Investors | 4 | Create, list, get by ID, update |
| Holdings | 3 | Allocate, query by asset/investor, cap table view |
| Rules | 2 | Create/update, get by asset |
| Transfers | 4 | Simulate, execute, list, history with names |
| Events | 1 | Filterable audit trail |
| System | 1 | Database reset (testing) |

### Known Bugs (Open)

1. **Holdings allocation form** — `Select` component may not forward `name` prop correctly, causing FormData to return null. Fix: verify `name` attribute on `<select>` element in `ui.tsx`.
2. **Holdings allocation missing `acquired_at`** — Frontend doesn't send `acquired_at` field. Fix: add `acquired_at: new Date().toISOString()` to the `allocateHolding` call.
3. **Utilization `formatNumber` crash** — `formatNumber()` receives `undefined` when utilization data is missing. Fix: add null guard `if (n == null) return '0'` in `utils.ts`.

### Test Coverage

```
Total: 49/49 passing
├── Rules Engine: 20 tests (unit)
├── Repositories: 2 tests (integration)
└── E2E API: 27 tests (happy path + validation failures + audit trail)
```

---

## Part 2: Product Identity

### Name

**Codex** — A codex is a book of laws. The name directly maps to the product's function: a codified set of transfer rules that are programmable, versioned, and auditable.

Works across contexts:
- Product: "Codex Compliance Engine"
- CLI: `codex validate`, `codex simulate`
- API: `api.codex.dev`
- Brand: Authoritative, technical, neutral

### Positioning Statement

> Source-available compliance infrastructure for tokenized assets — programmable transfer restrictions that work off-chain today and on-chain tomorrow.

### Licensing Model

**Source-available with open API** (Business Source License style)

- Source code is readable and auditable — critical for regulated entities that need to inspect compliance logic
- Commercial use requires a license — protects the business model
- Open API specification — enables ecosystem integrations without exposing core IP
- Converts to fully open-source after 3-4 years (BSL standard practice)

This model is proven by MongoDB (SSPL), HashiCorp (BSL), Sentry (BSL), and MariaDB (BSL).

---

## Part 3: Market Context

### The Opportunity

The transfer agency services market is valued at approximately €14B with 7% CAGR through 2033. Within this, tokenized real-world assets on-chain exceeded €27B as of September 2025, with forecasts projecting €550B+ by 2030.

Three forces are converging:

1. **EU regulatory clarity.** MiCA (fully enforceable 2025), DLT Pilot Regime, and national sandbox programs provide clear frameworks for tokenized securities. This is pulling institutional capital into the space.

2. **Infrastructure build-out.** Tokenization platforms are actively building right now. They need compliance infrastructure but face a build-vs-buy decision where building is increasingly untenable (see section 3 below).

3. **Transfer restriction gap.** Nobody offers a source-available, programmable compliance engine for tokenized asset transfers that works both on-chain and off-chain. Carta owns cap tables. Securitize owns tokenized issuance. The transfer restriction layer is unowned.

### Why Now

The EU's DLT Pilot Regime allows market infrastructures to trade and settle tokenized securities under regulatory supervision. This creates immediate demand for compliant transfer restriction systems. Platforms operating under the regime need to enforce investor eligibility, jurisdiction restrictions, lockup periods, and transfer limits — exactly what Codex does.

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
- Tokeny (Luxembourg) — tokenization compliance platform
- Centrifuge (Germany) — on-chain RWA infrastructure
- Securitize EU operations
- Bitpanda (Austria) — tokenized assets
- Backed Finance (Switzerland) — tokenized securities
- CashOnLedger (Germany) — tokenized invoices and bonds

**Secondary (future expansion):**
- Fund administrators managing private equity/VC
- SPV platforms
- Family offices with complex holdings

### Competitive Landscape

| Competitor | What They Do | Why Codex Wins |
|-----------|-------------|----------------|
| **Carta** ($7.4B valuation) | Cap table management, 409A valuations, fund admin | No programmable transfer rules. US-focused. Proprietary. €2,500+/year. |
| **Pulley** | Simpler cap table management | No transfer restriction logic. No EU compliance. |
| **Ledgy** | EU-focused equity management | No programmable compliance engine. Equity focus, not tokenized assets. |
| **Securitize** | Tokenized securities issuance platform | Full platform (not embeddable). Expensive. Not source-available. |
| **Tokeny** | Token compliance (T-REX protocol) | Blockchain-only. Ethereum-specific. Not off-chain compatible. |
| **Captable.inc** | Open-source Carta alternative | Abandoned (6 months no updates). No rules engine. |
| **Custom builds** | In-house compliance logic | Unsustainable: can't maintain regulatory correctness, security certs, integrations |

**Codex's unique position:** The only source-available, programmable compliance engine that works off-chain (API) and can bridge to on-chain (smart contract rule export). This is infrastructure, not a platform — it embeds into existing products.

---

## Part 4: Honest Assessment — Gaps & Risks

### Technical Gaps (Ordered by Priority)

| Gap | Severity | Cost to Fix | Notes |
|-----|----------|------------|-------|
| No authentication or RBAC | **Critical** | 1-2 weeks | Cannot demo to any serious prospect without this |
| SQLite (no concurrency) | **Critical** | 1 week | PostgreSQL migration required for any multi-user scenario |
| No data encryption at rest | **High** | 3-5 days | Required for GDPR and any enterprise conversation |
| No webhook/event streaming | **High** | 1 week | Tokenization platforms need real-time event feeds |
| No document generation | **Medium** | 1-2 weeks | Transfer certificates, compliance reports, cap table PDFs |
| Frontend is MVP-grade | **Medium** | 2-3 weeks | Functional but doesn't inspire enterprise confidence |
| No composite rules (AND/OR) | **Medium** | 1 week | Real-world compliance requires boolean logic |
| No KYC/AML integration | **Medium** | 1-2 weeks | Sandbox integration with EU provider (e.g., Jumio, Onfido, IDnow) |
| No blockchain bridge | **Low (now)** | 4-8 weeks | Important for positioning, not required for first pilots |

### Strategic Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **Tokenization market slowdown** | Low | Market is accelerating (MiCA, DLT Pilot Regime). But hedge by keeping fund admin as secondary market. |
| **Large player enters space** | Medium | Carta or Securitize could build this. Mitigation: speed + source-available model (they won't open their code). |
| **Solo founder risk** | High | Investors will ask about this. Mitigation: demonstrate velocity, use AI leverage as narrative, actively build advisory network. |
| **Regulatory complexity exceeds capacity** | Medium | Can't be an expert in all EU jurisdictions alone. Mitigation: start with 2-3 jurisdictions (DE, ES, LU), hire compliance advisor post-funding. |
| **Customer discovery reveals wrong assumptions** | Medium | This is actually good — better to learn early. Start conversations immediately. |

### What's Defensible (The Moat)

The moat is not the code. It's the combination of:

1. **Compliance knowledge encoded in software** — Rule templates for MiFID II, AIFMD, DLT Pilot Regime that are tested, versioned, and auditable
2. **Source-available trust** — Regulated entities can inspect the compliance logic, unlike proprietary competitors
3. **Certifications** — SOC 2, ISO 27001, pentest reports (post-funding) create switching costs
4. **Network effects** — Rule template marketplace where compliance teams share and improve rule sets
5. **Integration depth** — Deep integrations with KYC providers, custodians, and blockchain networks create lock-in

None of these can be replicated by a competitor prompting Claude for a weekend. This is the answer to "why can't someone just rebuild this with AI?"

---

## Part 5: Roadmap — MVP to Fundable Prototype

### Guiding Principles

1. **Customer discovery runs in parallel with development.** Don't wait to finish building before talking to people.
2. **Build for one customer, design for many.** Every feature should solve a specific problem a tokenization platform CTO told you about.
3. **Source-available from day one.** Put the repo on GitHub with BSL license early. It's a trust signal.
4. **EU-first, US-ready.** Architecture supports both, but compliance validation targets EU (MiFID II, DLT Pilot, MiCA) first.

### Sprint Plan (12 Weeks to Fundable Prototype)

#### Weeks 1-2: Foundation + Customer Discovery Start

**Technical:**
- [ ] Fix 3 known frontend bugs (Select name prop, acquired_at, formatNumber null guard)
- [ ] PostgreSQL migration (replace SQLite, keep repository layer clean)
- [ ] Authentication system (JWT + refresh tokens)
- [ ] RBAC (3 roles: admin, compliance_officer, investor_readonly)
- [ ] Environment configuration (dev/staging/production)
- [ ] Git cleanup and repository rename to `codex`

**Business:**
- [ ] Set up LinkedIn presence for Codex
- [ ] Draft outreach message for tokenization platform contacts
- [ ] Identify 20 EU tokenization platforms and their CTOs/technical leads
- [ ] Send first 10 outreach messages
- [ ] Schedule 3-5 discovery calls for weeks 3-4

**Deliverables:** Authenticated, role-based API running on PostgreSQL. First outreach batch sent.

#### Weeks 3-4: Compliance Engine V2 + First Conversations

**Technical:**
- [ ] Composite rules (AND/OR/NOT logic for complex constraints)
- [ ] Rule versioning with full history (which rules applied to which transfer, when)
- [ ] EU jurisdiction rule templates (MiFID II investor classification, AIFMD qualification)
- [ ] Transfer simulation with detailed explanations (not just pass/fail, but why)
- [ ] Webhook system for event notifications (transfer.executed, transfer.rejected, rules.updated)

**Business:**
- [ ] Conduct 3-5 customer discovery calls
- [ ] Document pain points, current workflows, willingness to pilot
- [ ] Collect quotes (even informal ones — "I would use this if...")
- [ ] Refine positioning based on conversations
- [ ] Identify which specific compliance features matter most to prospects

**Deliverables:** Compliance engine that handles real EU regulatory scenarios. Documented customer insights from 3-5 calls.

#### Weeks 5-6: Integration Layer + Demo Environment

**Technical:**
- [ ] KYC/AML sandbox integration (IDnow or Onfido — pick one EU-focused provider)
- [ ] REST + basic GraphQL API (developer-friendly, well-documented)
- [ ] API key management for platform integrations
- [ ] Interactive API documentation (Swagger UI or Redoc)
- [ ] Demo environment with pre-loaded realistic data (3 assets, 15 investors, multiple rule sets, transfer history)
- [ ] Scenario modeling endpoint ("what-if" analysis for rule changes)

**Business:**
- [ ] Conduct 3-5 more discovery calls (total: 6-10)
- [ ] Identify 1-2 prospects willing to pilot
- [ ] Begin incubator research and relationship-building
- [ ] Draft one-pager for Codex

**Deliverables:** Integration-ready API with sandbox KYC. Live demo environment. 6-10 customer conversations documented.

#### Weeks 7-8: Frontend Overhaul + Security Hardening

**Technical:**
- [ ] Redesign frontend with professional financial UI (dark theme option, data-dense dashboards)
- [ ] Visual rule builder (drag-and-drop constraint configuration)
- [ ] Real-time compliance dashboard (live transfer status, violation alerts, risk overview)
- [ ] Investor self-service portal (read-only view of holdings and transfer history)
- [ ] Document generation (transfer certificates, cap table exports as PDF)
- [ ] Data encryption at rest (PostgreSQL transparent data encryption or application-level)
- [ ] Security headers, rate limiting, input sanitization audit

**Business:**
- [ ] Finalize pilot terms with 1-2 prospects (free pilot, 3-month term, feedback commitment)
- [ ] Submit first incubator application(s)
- [ ] Prepare pitch deck (10 slides)

**Deliverables:** Demo-ready frontend. Security-hardened backend. Pilot agreements in progress.

#### Weeks 9-10: Pilot Preparation + Blockchain Preview

**Technical:**
- [ ] On-chain rule export preview (generate ERC-1400/ERC-3643 compatible transfer restriction configs)
- [ ] Multi-asset support (multiple funds/assets under one instance)
- [ ] Notification system (email alerts on transfers, rule changes, violations)
- [ ] Performance optimization (target: <50ms p99 validation latency)
- [ ] Comprehensive logging and monitoring (structured logs, health checks)

**Business:**
- [ ] Begin pilot with first customer
- [ ] Collect early feedback and iterate
- [ ] Continue incubator conversations
- [ ] Attend 1-2 EU fintech/blockchain events (virtual or in-person)

**Deliverables:** First pilot running. Blockchain bridge preview demonstrating on-chain potential.

#### Weeks 11-12: Documentation + Incubator Readiness

**Technical:**
- [ ] Comprehensive developer documentation site
- [ ] Getting started guide ("Integrate Codex in 30 minutes")
- [ ] Architecture decision records (ADRs) for key technical choices
- [ ] Automated CI/CD pipeline
- [ ] Load testing and performance benchmarks published

**Business:**
- [ ] Compile pilot feedback into case study
- [ ] Finalize incubator applications with pilot data
- [ ] Record 3-minute product demo video
- [ ] Prepare 5-minute pitch for incubator interviews
- [ ] Update one-pager with validation data

**Deliverables:** Production-ready documentation. Incubator applications submitted with customer validation.

---

## Part 6: What Requires Funding (Cannot Be Done Solo for Free)

### Pre-Funding (€0 — Solo Founder + AI)

Everything in the 12-week sprint plan above. AI-accelerated development makes all technical work achievable at zero cash cost.

### Post-Funding — Phase 1 (€30K-€60K)

| Item | Cost | Why |
|------|------|-----|
| Legal entity formation (EU) | €2K-€5K | Required for contracts, licensing, GDPR compliance |
| GDPR compliance (DPO, privacy policy, DPIA) | €5K-€15K | Non-negotiable for EU B2B SaaS handling personal data |
| KYC provider production access | €3K-€10K | Sandbox is free, production requires contract + fees |
| Basic penetration test | €8K-€20K | Required for enterprise prospects and incubator credibility |
| Infrastructure (hosting, monitoring, backups) | €3K-€8K/year | Production PostgreSQL, logging, uptime monitoring |
| Trademark registration (EU) | €1K-€2K | Protect the Codex name |

### Post-Funding — Phase 2 (€50K-€150K)

| Item | Cost | Why |
|------|------|-----|
| SOC 2 Type I certification | €25K-€50K | Enterprise procurement requirement |
| Additional integrations (e-signature, custodian) | €10K-€30K | Production contracts with DocuSign/qualified e-sig provider |
| Compliance advisor (part-time) | €15K-€40K/year | Expert review of rule templates for MiFID II/AIFMD accuracy |
| First hire (senior engineer or compliance specialist) | Market rate | Once revenue or significant funding secured |

**Total to enterprise-ready: €80K-€210K over 12-18 months** — aligning with your original estimate.

---

## Part 7: Incubator Strategy

### Recommended Programs (EU, Fintech/RegTech Focus)

#### Tier 1 — Strong Fit

| Program | Location | Focus | Why It Fits | Application |
|---------|----------|-------|-------------|-------------|
| **Techstars Fintech (various)** | London/remote | Fintech | Strong mentor network in financial infrastructure. €100K+ investment. | Cohort-based, check dates quarterly |
| **Startup Wise Guys FinTech** | Tallinn, Estonia | B2B Fintech | Focused specifically on financial technology. €50K investment. | Cohort-based, ~2 per year |
| **F10 Zurich/Madrid** | Zurich, Madrid | FinTech & RegTech | You're in Spain — Madrid cohort is accessible. Swiss finance network. Partnerships with SIX, Julius Baer. | Rolling applications |
| **Plug and Play Fintech** | Various EU hubs | Fintech | Corporate partnership network (banks, asset managers). No equity taken. | Rolling |

#### Tier 2 — Worth Exploring

| Program | Location | Focus | Why |
|---------|----------|-------|-----|
| **EXIST (Germany)** | Germany | Deep tech / academic | Up to €150K grant (not equity). Requires German university affiliation — explore partnership. |
| **ENISA (Spain)** | Spain | Startup loans | Participative loans up to €300K for early-stage Spanish companies. Low interest, no equity. |
| **EIT Digital** | Pan-EU | Digital innovation | Grants + acceleration. Focus on digital infrastructure. |
| **Seedcamp** | London | Generalist (strong fintech portfolio) | €100K-€200K pre-seed. Strong European network. |
| **Station F (L'Oréal/LVMH not relevant, but MAIF)** | Paris | Various | MAIF program focuses on fintech/insurance infrastructure. |

#### Tier 3 — Grants (No Equity)

| Grant | Amount | Notes |
|-------|--------|-------|
| **ENISA (Spain)** | Up to €300K | Participative loan. Founder-friendly. You're based in Spain — use this. |
| **CDTI (Spain)** | Varies | R&D grants for tech companies in Spain |
| **Horizon Europe / EIC Accelerator** | Up to €2.5M | Highly competitive but significant. Grant + equity component. |
| **ICO Spain (Next Generation EU funds)** | Varies | Digital transformation funding |

### Approach Strategy

**Do not cold-apply.** For every program above:

1. Find a portfolio company founder or mentor on LinkedIn
2. Message them asking for advice about the program (not asking to be introduced)
3. Mention you're building compliance infrastructure for tokenized assets in the EU
4. Ask if they'd be willing to share their experience with the program
5. Build the relationship over 2-3 conversations
6. Then ask if they'd recommend applying, and if they'd be willing to introduce you

This warm approach has 5-10x the success rate of cold applications.

### ENISA Should Be Your First Move

You're based in Spain, working full-time on this, and ENISA (Empresa Nacional de Innovación) offers participative loans of up to €300K for early-stage companies with no equity dilution. The application process is well-documented, the terms are founder-friendly, and you can apply as soon as you have a Spanish entity (SL or SLU). This can fund your entire first 12-18 months including certifications, legal, and first hire.

---

## Part 8: Customer Discovery Playbook

### Outreach Script (For EU Tokenization Platform CTOs)

**LinkedIn message (first contact):**

> Hi [Name] — I've been following [Company]'s work on [specific thing they've done, e.g., "tokenizing private credit under the DLT Pilot Regime"]. I'm building open compliance infrastructure for tokenized asset transfers (think: programmable transfer restrictions as an API) and I'm trying to understand how platforms like yours currently handle investor eligibility checks and transfer validation. Would you have 15 minutes for a quick call? Not selling anything — just learning.

**What to ask on calls:**

1. "Walk me through what happens when an investor wants to transfer tokenized securities on your platform today."
2. "How do you currently enforce transfer restrictions — is that in smart contracts, manual review, or something else?"
3. "What's the most painful part of compliance for your engineering team?"
4. "If you could outsource one piece of your compliance infrastructure, what would it be?"
5. "How do you handle jurisdiction-specific rules? Is that configured per asset or globally?"
6. "What would a compliance API need to do for you to consider integrating it?"

**What to listen for:**
- "We built it ourselves and it's a nightmare to maintain" → strong signal
- "Our compliance team reviews every transfer manually" → strong signal
- "We hardcoded rules into our smart contracts" → strong signal
- "We use [competitor]" → find out what's missing
- "This isn't a priority for us" → move on, not your customer

### Target Companies (First 20)

Research these and find their CTO / Head of Engineering / Head of Compliance:

**Germany:** Centrifuge, CashOnLedger, Finoa, Tangany, Black Manta Capital
**Luxembourg:** Tokeny, FundsDLT, InvestSuite
**Switzerland:** Backed Finance, Sygnum, SDX (SIX Digital Exchange), Taurus
**Austria:** Bitpanda (institutional), Artis
**Spain:** Onyze, Bit2Me (institutional arm)
**France:** Société Générale FORGE, Spiko
**Nordics:** Fnality, SEB Digital Assets

---

## Part 9: Technical Architecture — Next State

### Target Architecture (Post-12-Week Sprint)

```
┌─────────────────────────────────────────────────────────────┐
│                    Codex Dashboard (React)                   │
│     Compliance Dashboard │ Rule Builder │ Investor Portal    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS/JSON
┌──────────────────────────▼──────────────────────────────────┐
│                   Codex API Gateway                          │
│        Auth (JWT) │ RBAC │ Rate Limiting │ API Keys          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Business Logic Layer                         │
│   AssetService │ InvestorService │ TransferService           │
│                ComplianceService │ WebhookService             │
└────┬─────────────────────────────────────┬──────────────────┘
     │                                     │
     │         ┌───────────────────────────▼──────────────────┐
     │         │        Codex Compliance Engine                │
     │         │  - Composite rules (AND/OR/NOT)               │
     │         │  - EU jurisdiction templates                  │
     │         │  - Rule versioning + audit                    │
     │         │  - Transfer simulation + explanation          │
     │         │  - On-chain rule export (preview)             │
     │         └───────────────────────────┬──────────────────┘
     │                                     │
┌────▼─────────────────────────────────────▼──────────────────┐
│              Data Access Layer (Repositories)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  PostgreSQL (Encrypted)                       │
│   assets │ investors │ holdings │ transfers │ rules          │
│   rule_versions │ events │ users │ api_keys │ webhooks       │
└─────────────────────────────────────────────────────────────┘

External Integrations:
  ├── KYC/AML Provider (IDnow sandbox)
  ├── Webhook Endpoints (customer systems)
  └── Blockchain Bridge (ERC-1400 rule export — preview)
```

### Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL | Concurrent users, encryption at rest, production-grade |
| Auth | JWT + refresh tokens | Stateless, standard, works for API + frontend |
| Licensing | BSL 1.1 | Source-available, converts to open after 4 years |
| API style | REST (primary) + GraphQL (optional) | REST for simplicity, GraphQL for complex queries |
| Hosting (dev) | Docker Compose (local) | Zero cost during development |
| Hosting (production) | Hetzner Cloud (EU) | GDPR-compliant, €20-50/month, German data centers |
| KYC sandbox | IDnow | EU-focused, strong in DACH region, sandbox available |

---

## Part 10: Key Metrics & Milestones

### 12-Week Milestones

| Week | Milestone | Success Criteria |
|------|-----------|-----------------|
| 2 | Foundation complete | Authenticated API on PostgreSQL, 3 RBAC roles working |
| 4 | Compliance V2 live | Composite rules, EU templates, webhook system, 3+ discovery calls done |
| 6 | Integration-ready | Sandbox KYC working, API docs published, demo environment live |
| 8 | Demo-ready | Professional frontend, visual rule builder, 1-2 pilot agreements |
| 10 | Pilot running | First customer using Codex in staging/sandbox environment |
| 12 | Incubator-ready | Applications submitted with customer validation, demo video, pitch deck |

### Key Metrics to Track

| Metric | Target (Week 12) | Why It Matters |
|--------|------------------|---------------|
| Discovery calls completed | 10+ | Validates market assumptions |
| Pilot agreements signed | 1-2 | Proves willingness to use the product |
| API response time (p99) | <50ms | Technical credibility |
| Test coverage | >80% | Code quality signal for source-available |
| GitHub stars (after public) | 50+ | Community interest signal |
| Incubator applications submitted | 2-3 | Pipeline for funding |

---

## Part 11: Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| No customer interest after 10 calls | Low | Critical | Pivot to fund admin market (secondary target) | Founder |
| Codex name already trademarked in EU | Medium | Medium | Check EUIPO database immediately. Have backup names ready (Aegis, Quorum). | Founder |
| Solo founder burnout | Medium | High | Strict weekly schedule. Sunday off. Ship small, celebrate progress. | Founder |
| PostgreSQL migration breaks existing tests | Low | Medium | Repository pattern abstracts DB — migration should be clean | Founder |
| Incubator rejection | Medium | Medium | Apply to 3+ programs. Use ENISA (Spain) as non-competitive backup. | Founder |
| Security vulnerability discovered | Low | High | Basic pentest before any pilot. Responsible disclosure policy. | Founder |
| Competitor launches similar product | Low | Medium | Speed advantage + source-available trust. Focus on EU (competitors are US-focused). | Founder |

---

## Part 12: Immediate Next Steps (This Week)

1. **Fix the 3 known bugs** — Select name prop, acquired_at in allocation form, formatNumber null guard
2. **Check EUIPO trademark database** for "Codex" in software/fintech classes — if taken, use Aegis
3. **Rename the repository** from `private-asset-registry` to `codex`
4. **Start PostgreSQL migration** — this is the critical path for everything else
5. **Draft LinkedIn outreach messages** to 10 tokenization platform contacts
6. **Research ENISA application requirements** — this is your most accessible funding path
7. **Begin authentication + RBAC implementation** after PostgreSQL is stable

---

## Appendix A: Files in Current Codebase

```
codex/ (currently private-asset-registry/)
├── data/registry.db                    # SQLite database (to be replaced by PostgreSQL)
├── migrations/001_initial_schema.sql   # Database schema
├── scripts/
│   ├── migrate.ts                      # Migration runner
│   ├── seed-data.ts                    # Demo data generator
│   └── test-api.ts                     # API integration test
├── src/
│   ├── backend/
│   │   ├── db.ts                       # Database connection
│   │   ├── server.ts                   # Express server (port 3001)
│   │   ├── models/index.ts             # TypeScript interfaces
│   │   ├── repositories/ (6 files)     # Data access layer
│   │   ├── services/ (5 files)         # Business logic
│   │   └── routes/ (6 files)           # API endpoints
│   ├── rules-engine/
│   │   ├── types.ts                    # Validation types
│   │   ├── validator.ts                # Rule validation logic (7 rules)
│   │   └── validator.test.ts           # 20 unit tests
│   └── frontend/                       # Next.js 14 app (port 3000)
│       └── src/
│           ├── app/ (7 pages)
│           ├── components/ (ui.tsx, sidebar.tsx)
│           └── lib/ (api.ts, types.ts, hooks.ts, utils.ts)
├── tests/
│   ├── unit/repositories.test.ts       # 2 repository tests
│   ├── e2e/ (3 files)                  # 27 e2e tests
│   └── fixtures/test-data.ts           # Test data
├── openapi.yml                         # API specification
├── docker-compose.yml                  # Container orchestration
├── Dockerfile                          # Backend container
├── README.md                           # Project documentation
├── CODEX_REPORT.md                     # THIS DOCUMENT
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Appendix B: Document Supersession

This document **replaces** the following as the project's source of truth:

| Document | Status | Notes |
|----------|--------|-------|
| HANDOFF.md | **Superseded** | Phase 3→4 transition doc. No longer current. |
| BUILD_PLAN.md | **Superseded** | Original 7-day MVP plan. Completed. |
| BOOTSTRAP_SUMMARY.md | **Archived** | Initial setup record. Historical reference only. |
| PRD.md | **Partially superseded** | Core requirements still valid. Strategic direction updated here. |
| ARCHITECTURE.md | **Partially superseded** | Layer architecture still valid. Target architecture updated here. |
| DATA_MODEL.md | **Active** | Schema reference remains accurate. Will be updated during PostgreSQL migration. |
| WORKING_RULES.md | **Active** | Code conventions remain in effect. |
| strategic-assessment.md | **Incorporated** | Market research incorporated into this document. |

---

**This document is the single source of truth for the Codex project.**

Last updated: February 9, 2026
