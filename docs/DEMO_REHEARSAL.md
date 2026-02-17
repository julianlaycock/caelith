# Caelith ALFI Demo — Rehearsal Runbook

## Pre-Flight Checklist

Run these on the **target demo machine** before the event.

### Environment

- [ ] `node -v` returns v18+ or v20+
- [ ] `psql --version` — PostgreSQL 15+ is running
- [ ] `.env` file exists at project root with valid `DATABASE_URL`
- [ ] No AI API keys needed (embeddings gracefully disabled)
- [ ] Port 3000 (frontend) and 3001 (backend) are free
  - If not: `npx tsx scripts/free-port.js 3000 3001`

### Reset & Start

```bash
# 1. Wipe database and create demo account
npx tsx scripts/demo-reset.ts

# 2. Start backend (terminal 1)
cd src/backend && npx tsx server.ts

# 3. Start frontend (terminal 2)
cd src/frontend && npm run dev

# 4. Open browser
open http://localhost:3000/login
```

Credentials: `demo@caelith.io` / `Demo1234!`

---

## Demo Narrative (8 minutes)

### Act 1 — First Impression (1 min)

1. **Login** with the demo credentials.
2. **Dashboard** — Show the Setup Wizard: "Welcome to Caelith". Call out:
   - No empty metric cards cluttering the screen
   - Two clear paths: spreadsheet import (recommended) or manual
   - "Explore the dashboard first" link at the bottom

**Talking point:** "Day-one experience. No training needed — the system guides the compliance officer through setup."

### Act 2 — CSV Import (2 min)

1. Click **"Import from Spreadsheet"**.
2. Select **"Investors"** from the entity picker.
3. Show the **4-step stepper** (Upload → Map → Preview → Import).
4. Upload the pre-prepared `test-investors.csv` (3 rows: Acme Capital, Rhine Partners, Loire Holdings).
5. On **Map Columns**: point out the sample values under each CSV column, the auto-mapping, the required-field badges.
6. Briefly show the **duplicate warning** (map two columns to same target, then fix it).
7. Click **Next: Preview & Edit** — show the editable table with dropdowns for enum fields (jurisdiction, investor type).
8. Click **Import 3 Investors** — show the success screen.
9. Point out the **bridge CTA**: "Start Eligibility Checks" — don't click it yet, click **"Continue to Dashboard"**.

**Talking point:** "Flat files are the reality of fund administration. We parse, validate, and let you fix errors before they hit the database."

### Act 3 — Manual Fund Setup (1.5 min)

1. Dashboard shows Setup Wizard again (no funds yet). Click **"Create Manually"**.
2. Show the **3-step stepper** (Create Fund → Add Investors → Review).
3. Fill in: `Demo Fund I`, SIF, LU (Luxembourg), AIFMD, 10000 units.
4. Point out: **domicile labels** show "LU (Luxembourg)" not bare codes, **units label** says "Share Class Units (authorized)".
5. Add one investor: `Test Investor AG`, DE (Germany), Professional.
6. **Review step**: point out the dynamic button text: "Create Fund & Import 1 Investor".
7. Click submit → success screen with counts.
8. Click **"Go to Dashboard"**.

**Talking point:** "Every dropdown uses human-readable labels — Luxembourg, not LU. Reduces classification errors at the source."

### Act 4 — Dashboard with Data (30 sec)

1. Show the **metric cards** now visible (Active Funds: 1, etc.).
2. Show the **Getting Started checklist** with green checkmarks on completed steps.
3. Click **"Run a compliance check"** to go to `/onboarding`.

**Talking point:** "Guided onboarding — the checklist tells you exactly what's next."

### Act 5 — Onboarding Pipeline (2 min)

1. Show the **empty state** with investor count: "You have 4 investors ready."
2. Click **"Bulk Apply"** — show the modal:
   - Fund / Share Class selector (not "Asset")
   - Investor list with checkboxes and Select All
   - Click Select All, note "Submit 4 Applications" button
3. Submit → show the **progress bar** filling up.
4. **Kanban board** appears: 5 columns, all 4 cards in "Applied".
5. Click **"Check"** on a card → **Eligibility Results modal**:
   - Green banner: "All eligibility checks passed — Status updated to Eligible"
   - Individual check results with green checkmarks
   - Single "Close" button — honest, no fake confirmation
6. Close → card moves to "Eligible" column. Green success toast.

**Talking point:** "Every status change is transparent. The system tells you exactly what happened — no hidden mutations."

### Act 6 — Compliance Copilot (1 min)

1. Click the **"Compliance Copilot"** button (bottom-right).
2. Show: 480px panel, disclaimer box, placeholder text about AIFMD/SIF.
3. Click a **suggested prompt** (e.g., "What are the SIF investor requirements?").
4. Point out: **"Caelith AI" badge**, footer disclaimer "AI-generated — not legal or regulatory advice", **suggested follow-up chips**.
5. Close the panel.

**Talking point:** "AI that knows it's not a lawyer. Every response carries a disclaimer and a citation trail."

---

## Emergency Playbook

| Problem | Fix |
|---------|-----|
| Backend won't start | Check `.env` has valid `DATABASE_URL`. Run `npx tsx scripts/demo-reset.ts` again. |
| "Port in use" | `npx tsx scripts/free-port.js 3000 3001` |
| Login fails | Run `npx tsx scripts/demo-reset.ts` to recreate the user. |
| Blank dashboard after login | Backend may be down. Check terminal 1 for errors. |
| CSV import error | Ensure `test-investors.csv` has exactly 3 data rows and correct headers. |
| Eligibility check fails | Investor may have `kyc_status: pending`. This is expected for Alpine Wealth — it demonstrates the ineligible flow. |
| Copilot returns error | No AI API key configured. The error message should say "temporarily unavailable" — this is graceful degradation by design. |

## Files to Prepare

Save this as `test-investors.csv` on the demo machine desktop:

```csv
company_name,country,type,email
Acme Capital,LU,professional,acme@example.com
Rhine Partners,DE,institutional,rhine@example.com
Loire Holdings,FR,well_informed,loire@example.com
```
