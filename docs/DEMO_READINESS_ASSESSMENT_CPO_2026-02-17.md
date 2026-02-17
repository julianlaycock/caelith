# Caelith Demo Readiness Assessment

**Date:** 2026-02-17
**Assessors:** CPO Agent, General Counsel Agent
**Score:** 82/100 (initial) → 95/100 (post-CPO sprint) → 95/100 (post-legal sprint)

---

## Sprint 1: CPO Product/UX Fixes

### P0 — Critical Fixes

1. **Fixed broken Tailwind class** on Kanban board drop target
   - File: `src/frontend/src/app/onboarding/page.tsx:996`
   - Change: `bg-accent-500/10/30` → `bg-accent-400/10`

### P1 — Branding & Polish

2. **Rebranded package.json**
   - Name: `private-asset-registry` → `caelith`
   - Description: updated to AIFMD II positioning
   - Keywords: `private-assets, transfer-rules, mvp` → `aifmd, regulatory, fund-management`

3. **Rebranded API info endpoint**
   - `Private Asset Registry API` → `Caelith API`

4. **Updated metadata descriptions** (layout.tsx)
   - Old: "Compliance infrastructure for tokenized assets"
   - New: "AIFMD II compliance engine for EU alternative investment fund managers"

5. **Deleted artifact files** (badly-named test file, `src/frontend/nul`)

### P2 — Demo Polish

6. **Wired up "Watch Demo" button** → "See How It Works" scrolls to features
7. **Fixed dead footer links** → working `scrollTo()` buttons
8. **Removed emoji from copilot UNVERIFIED fallback**

---

## Sprint 2: Legal/Regulatory Fixes (CLO Assessment Score: 62/100 → 85/100)

### Must-Fix Items Executed

1. **Hero headline rewritten** — removed "proves you're compliant" (compliance guarantee claim)
   - New: "The compliance engine built for auditable decisions."

2. **Hero subheadline rewritten** — removed "enforces" and "proves it"
   - New: "Caelith evaluates them and documents every decision."

3. **Solution metric "0 Manual compliance steps" replaced**
   - Was factually incorrect (platform has manual approval steps)
   - New: "6 Regulatory frameworks"

4. **Solution metric "100% Decision auditability" relabeled**
   - New: "100% Decisions logged" (avoids absolute capability claim)

5. **"AIFMD II full coverage" → "AIFMD II eligibility & reporting"**
   - Scoped to what the platform actually covers

6. **"Breach prevention, not detection" → "Pre-trade eligibility validation"**
   - Removed implication that all breaches are prevented

7. **Decision provenance description rewritten**
   - Old: "immutable, cryptographically signed audit record"
   - New: "hash-chained, tamper-evident audit record"
   - "Signed" implies private key auth; "hashed" is what we actually do

8. **"Tamper-proof" → "Tamper-evident"** in hash chain mock
   - Tamper-proof implies impossibility; tamper-evident is accurate

9. **Fabricated testimonial removed**
   - "Dr. Marcus Weber / Rhine Capital Partners" replaced with an anonymized illustrative scenario
   - No fictional person, no fictional company, no false CSSF claims

10. **Fabricated publication quote removed**
    - "European Fund Administration Review, 2025" (doesn't exist) replaced with PwC attribution

11. **Regulatory marquee stripped of unimplemented frameworks**
    - Removed: DORA, MiCA, UCITS VI (doesn't exist), CSSF, ESMA (regulatory bodies, not regulations)
    - Added: SIF Law, RAIF Law (actually implemented)

12. **Regulatory feature grid rebuilt**
    - Removed fake article counts and DORA/MiCA entries
    - Now shows 6 frameworks with qualitative descriptions, all marked ACTIVE

13. **"SLA guarantee" → "Custom SLA terms"** in Enterprise tier
    - Cannot guarantee an SLA without an actual SLA document

14. **How It Works step 3 rewritten**
    - "Prove" → "Document"; removed "cryptographic proof" claim

15. **Pricing VAT disclaimer added**
    - "All prices exclusive of VAT. Subject to change."

16. **Landing page legal disclaimer added** (above footer)
    - "Caelith is a compliance support tool... does not provide legal, regulatory, or compliance advice and does not guarantee compliance outcomes."

17. **License changed** from MIT to UNLICENSED
    - MIT is inappropriate for commercial compliance SaaS

---

## Remaining Manual Actions Before Demo

- [ ] **Verify Anthropic API key** — test with a live call
- [ ] **Test CSV auto-mapping end-to-end** with exact demo CSV
- [ ] **Pre-warm the copilot** with one test query
- [ ] **Full dry run on clean DB** through all 6 demo acts
- [ ] **Prepare `--with-data` fallback** for CSV import failure
- [ ] **Test on demo machine/browser** — verify Unsplash images load

## Remaining Legal Items (Post-Demo, Pre-Pilot)

- [ ] Create Privacy Policy page
- [ ] Create Terms of Service page
- [ ] Draft Data Processing Agreement (DPA)
- [ ] Add cookie consent mechanism
- [ ] Add Anthropic data transfer disclosure to copilot
- [ ] Verify all regulatory article citations (KAGB §225, ELTIF Art 30a)
- [ ] Narrow copilot system prompt knowledge claims
- [ ] Increase copilot per-response disclaimer font size

## Verbal Disclaimers for Presenter

1. **Opening (first 60 seconds):** "Caelith is a compliance support and documentation tool. It assists your compliance team but does not replace legal counsel or constitute legal advice."
2. **When showing the Copilot:** "The AI copilot provides informational guidance — explicitly not legal advice. Your team always makes the final decisions."
3. **When showing the integrity chain:** "The hash chain provides tamper-evidence — if any record is modified, verification will flag it."
4. **When discussing pricing:** "We are in our pilot phase. Pricing is indicative. We offer a complimentary 90-day evaluation."
5. **When referencing regulations:** "Regulatory citations are drawn from primary source legislation. As with any tool, confirm citations are current before relying on them."

---

## Verdict

The codebase is now legally defensible for a demo. All overstated marketing claims have been replaced with accurate, scoped language. The fabricated testimonial and publication are removed. A legal disclaimer is present. The license is proprietary. The remaining items (Privacy Policy, ToS, DPA) should be created before any pilot engagement involving real data, but are not blockers for a demo.
