# Caelith Onboarding Journey — End-to-End Test Suite

## Context

You are testing a web application called **Caelith**, an AIFMD II compliance engine for fund managers. The app runs locally. The frontend is at `http://localhost:3000`. The backend API is at `http://localhost:3001`.

You will execute 10 test scenarios in sequence. Each test builds on the state created by previous tests. Do NOT skip tests or change the order. After each test, report PASS or FAIL with a brief note on what you observed.

---

## Setup Before Testing

1. Navigate to `http://localhost:3000/login`.
2. If no account exists, register a new one using:
   - Email: `tester@caelith.io`
   - Password: `TestPass123!`
   - Name: `QA Tester`
3. After login, you should land on the Dashboard at `/`.

---

## Test 1: Dashboard First-Load — Empty State

**Goal:** Verify the Setup Wizard is the primary content when no funds exist. No empty metric cards should be visible.

**Steps:**
1. You are on `/` (Dashboard) with a fresh account that has zero funds and zero investors.
2. Look at the page content below the "Dashboard / Compliance engine overview" header.

**Assertions:**
- [ ] The Setup Wizard is visible with the heading "Welcome to Caelith".
- [ ] The subtitle reads exactly: "Import your investor register or create a fund structure to get started."
- [ ] There are NO metric cards showing values like "0" for "Active Funds", "Verified Investors", "Units Allocated", or "Actions Required".
- [ ] Three options are visible: "Import from Spreadsheet" (with a green "Recommended" badge), "Create Manually", and a link at the bottom.
- [ ] The bottom link reads "Explore the dashboard first" — NOT "Skip for now".

---

## Test 2: CSV Import — Stepper, Sample Values, Duplicate Warning, Bridge CTA

**Goal:** Verify the full CSV import flow including the 4-step progress stepper, sample data preview in column mapping, duplicate mapping warning, and the bridge CTA to onboarding on the success screen.

**Preparation:** Create a CSV file with this exact content and save it as `test-investors.csv`:
```csv
company_name,country,type,email
Acme Capital,LU,professional,acme@example.com
Rhine Partners,DE,institutional,rhine@example.com
Loire Holdings,FR,well_informed,loire@example.com
```

**Steps:**
1. On the Dashboard, click the "Import from Spreadsheet" button.
2. You should see an entity type picker screen titled "What would you like to import?" with options for Investors, Fund Structures, Holdings, and Eligibility Criteria.
3. Click "Investors".
4. You are now on the CSV upload step.

**Assertions (Upload step):**
- [ ] A 4-step progress stepper is visible above the upload card with labels: "Upload", "Map Columns", "Preview", "Import".
- [ ] Step 1 ("Upload") is highlighted/active. Steps 2-4 are grayed out.

5. Upload the `test-investors.csv` file by dragging it onto the drop zone or clicking "Browse Files".
6. You should automatically advance to the Map Columns step.

**Assertions (Map Columns step):**
- [ ] The stepper now shows step 1 with a checkmark, step 2 ("Map Columns") highlighted, steps 3-4 grayed out.
- [ ] Each CSV column name on the left side (company_name, country, type, email) has small gray sample values beneath it showing the first few values from the CSV. For example, under "company_name" you should see text like "e.g. Acme Capital, Rhine Partners, Loire Holdings".
- [ ] The mapping dropdowns allow selecting target fields like "Name *", "Jurisdiction *", "Investor Type", "Email".

7. Map the columns: `company_name` → `Name *`, `country` → `Jurisdiction *`, `type` → `Investor Type`, `email` → `Email`.
8. Now test duplicate detection: change the `email` column's dropdown to also map to `Name *` (so both company_name and email point to the same target).

**Assertions (Duplicate warning):**
- [ ] An amber/yellow warning banner appears with text containing "Multiple CSV columns are mapped to the same field".

9. Fix it: change `email` back to `Email`.
10. Confirm the warning disappears.
11. Click the "Next: Preview" button.

**Assertions (Preview step):**
- [ ] The stepper shows steps 1-2 with checkmarks, step 3 ("Preview") highlighted, step 4 grayed out.
- [ ] A table shows the first 3 rows of data with the mapped column headers (Name, Jurisdiction, Investor Type, Email).
- [ ] Text reads "3 investors will be imported."

12. Click "Import 3 Investors".
13. A loading spinner should appear briefly.

**Assertions (Complete step):**
- [ ] The stepper shows steps 1-3 with checkmarks, step 4 ("Import") highlighted.
- [ ] Green checkmark icon visible.
- [ ] Heading reads "Import Complete".
- [ ] Text reads "Successfully imported 3 entities."
- [ ] A summary shows "Investors: 3".
- [ ] A bordered box is visible below the summary with text containing "Next step" and "Submit your 3 investors for eligibility checking against your fund rules."
- [ ] A button labeled "Start Eligibility Checks" is visible inside that box.
- [ ] A secondary button "Continue to Dashboard" is also visible.

14. Click "Continue to Dashboard" (do NOT click "Start Eligibility Checks" yet).
15. You should land on `/` (Dashboard).

---

## Test 3: Manual Setup — Domicile Labels, Unit Label, Button Microcopy

**Goal:** Verify the manual fund creation path has correct domicile labels, unit label, and dynamic button text.

**Steps:**
1. On `/` (Dashboard), you should see the Setup Wizard again (no funds exist yet).
2. Click "Create Manually".

**Assertions (Fund creation step):**
- [ ] A 3-step stepper is visible: "Create Fund" (highlighted), "Add Investors", "Review & Import".
- [ ] The "Domicile" dropdown shows entries in the format "LU (Luxembourg)", "DE (Germany)", "IE (Ireland)", "FR (France)", etc. — NOT bare codes like "LU", "DE".
- [ ] The field label for the units input reads "Share Class Units (authorized)" — NOT "Total Units".

3. Fill in the form:
   - Fund Name: `Demo Fund I`
   - Legal Form: `SIF — Specialised Investment Fund (Luxembourg)`
   - Domicile: `LU (Luxembourg)`
   - Regulatory Framework: `AIFMD`
   - Share Class Units: `10000`
4. Click "Next: Add Investors".

**Assertions (Investors step):**
- [ ] The investor "Jurisdiction" dropdown also shows "LU (Luxembourg)", "DE (Germany)" format — NOT bare codes.
- [ ] The investor "Type" dropdown shows "Semi-professional" and "Well-informed" — properly hyphenated, NOT "Semi_professional" or "Well_Informed".

5. Fill in one investor:
   - Name: `Test Investor AG`
   - Jurisdiction: `DE (Germany)`
   - Type: `Professional`
6. Click "Next: Review".

**Assertions (Review step):**
- [ ] The submit button text is dynamic and reads exactly: "Create Fund & Import 1 Investor" — NOT "Import & Create".

7. Click the submit button.
8. Wait for the success screen.

**Assertions (Complete step):**
- [ ] Success screen shows counts for fund structures, assets, investors, and eligibility criteria.

9. Click "Go to Dashboard".

---

## Test 4: Dashboard With Data — Checklist Visible

**Goal:** Verify metric cards and the Getting Started checklist appear correctly now that data exists.

**Steps:**
1. You are on `/` (Dashboard) with at least one fund created.

**Assertions:**
- [ ] The four metric cards are now visible: "Active Funds" (showing 1), "Verified Investors", "Units Allocated", "Actions Required".
- [ ] A "Getting Started" card is visible with a progress bar.
- [ ] The checklist shows 4 steps: "Create a fund structure" (with a green checkmark), "Add investors", "Configure eligibility rules", "Run a compliance check".
- [ ] The unchecked steps are clickable and have a chevron arrow on the right side.

2. Click "Run a compliance check" in the checklist.

**Assertions:**
- [ ] You navigate to `/onboarding`.

---

## Test 5: Onboarding Empty State + Bulk Apply

**Goal:** Verify the onboarding page shows a contextual empty state and the bulk apply flow works.

**Steps:**
1. You are on `/onboarding` with no onboarding records yet, but investors exist in the system.

**Assertions (Empty state):**
- [ ] The empty state description mentions the number of investors available, e.g. "You have 4 investors ready. Submit them for eligibility checking against your fund rules."
- [ ] A primary button reads "Bulk Apply 4 Investors" (or however many investors exist).
- [ ] A secondary button reads "+ New Application".
- [ ] In the page header, there is also a "Bulk Apply" button.

2. Click the "Bulk Apply" button (either the one in the empty state or the header).

**Assertions (Bulk Apply modal):**
- [ ] Modal opens with title "Bulk Apply Investors".
- [ ] First field label reads "Fund / Share Class" — NOT "Asset".
- [ ] Second field reads "Requested Units (per investor)" with a default value.
- [ ] Below the fields, a list of investors with checkboxes is visible, each showing the investor name, type, and jurisdiction.
- [ ] A "Select All" / "Deselect All" toggle link is visible in the top-right of the investor list.

3. Select a fund/share class from the dropdown (e.g., "Demo Fund I — Share Class A").
4. Leave the units at the default value (or set to 1000).
5. Click "Select All" to check all investors.

**Assertions:**
- [ ] All investor checkboxes are checked.
- [ ] The submit button reads "Submit 4 Applications" (matching the count of selected investors).

6. Click the submit button.

**Assertions (During submission):**
- [ ] A progress indicator appears showing "Submitting X of Y..." with a progress bar filling up.

7. Wait for completion.

**Assertions (After submission):**
- [ ] A green success alert appears: "Submitted 4 applications" (or similar count).
- [ ] The Kanban board is now visible with 5 columns: Applied, Eligible, Approved, Allocated, Closed.
- [ ] All submitted investors appear as cards in the "Applied" column.
- [ ] Each card shows the investor name, asset name, requested units, and a "Check" button.

---

## Test 6: Eligibility Check — Explicit Advance Required

**Goal:** Verify that running an eligibility check shows results in a modal and requires the user to explicitly choose to advance (no auto-movement).

**Steps:**
1. You are on `/onboarding` with cards in the "Applied" column.
2. On any card in the Applied column, find and click the "Check" button.
3. Wait for the eligibility check to complete.

**Assertions (Eligibility results modal — eligible case):**
- [ ] A modal opens titled "Eligibility Check Results".
- [ ] If the investor is eligible: a green banner reads "All eligibility checks passed".
- [ ] Individual check results are listed below, each with a green checkmark icon, the rule name, and a message.
- [ ] Two buttons at the bottom: "Keep in Current Status" (secondary) and "Confirm Advance to Eligible" (primary).

4. Click "Keep in Current Status".

**Assertions:**
- [ ] The modal closes.
- [ ] The card remains in the "Applied" column. It did NOT move automatically.

5. Click "Check" on the same card again.
6. This time click "Confirm Advance to Eligible".

**Assertions:**
- [ ] A success message appears.
- [ ] The card moves from the "Applied" column to the "Eligible" column.

**If the investor is ineligible:**
- [ ] A red banner reads "Investor does not meet eligibility requirements".
- [ ] Failed checks are shown with red X icons.
- [ ] Buttons: "Close" (secondary) and "Reject with Reasons" (danger).

---

## Test 7: Single Application — Fund / Share Class Label

**Goal:** Verify the single application modal uses correct labeling.

**Steps:**
1. On `/onboarding`, click the "+ New Application" button in the top-right header area.

**Assertions:**
- [ ] A modal opens titled "Apply to Fund".
- [ ] The second dropdown field's label reads "Fund / Share Class" — NOT "Asset".

2. Close the modal (click Cancel or the X button).

---

## Test 8: Copilot — Width, Placeholder, Branding, Suggested Actions

**Goal:** Verify the Copilot panel has the correct width, placeholder text, AI branding, disclaimer, and renders suggested action chips.

**Steps:**
1. From any page, find the floating button in the bottom-right corner labeled "Compliance Copilot".
2. Click it to open the Copilot panel.

**Assertions (Panel and placeholder):**
- [ ] The panel slides in from the right side.
- [ ] On desktop, the panel is noticeably wider than a narrow sidebar (it should be 480px wide).
- [ ] The text input placeholder reads: "Ask about AIFMD eligibility, SIF requirements, or your fund's compliance..."
- [ ] Above the suggested prompts, there is an amber/yellow disclaimer box with text about AI-generated informational assistance and that it does not constitute legal advice.

3. Click one of the suggested prompt buttons (e.g., "What are the SIF investor requirements?").
4. Wait for the AI response.

**Assertions (Response branding):**
- [ ] The response has a small badge/tag that reads "Caelith AI" — NOT "AI-generated".
- [ ] Below the response text, there is a footer line that reads: "AI-generated — not legal or regulatory advice. Verify independently."
- [ ] If the response includes suggested follow-up actions, they appear as small clickable pill/chip buttons below the response text. Clicking one sends it as the next message.

5. Close the Copilot panel.

---

## Test 9: Completion Banner

**Goal:** Verify the dashboard shows a green completion banner when all setup steps are done.

**Precondition:** The account must have: at least 1 fund, at least 1 investor, at least 1 eligibility rule (auto-created during manual setup), and at least 1 compliance decision (created by the eligibility check in Test 6).

**Steps:**
1. Navigate to `/` (Dashboard).

**Assertions:**
- [ ] Instead of the Getting Started checklist, a green banner is visible.
- [ ] The banner text reads: "Setup complete — your compliance engine is ready".
- [ ] There is a green checkmark icon next to the text.
- [ ] The Getting Started checklist with the 4 steps is NO longer visible.

---

## Test 10: Import Error Details

**Goal:** Verify that CSV import failures show per-row error details from the backend.

**Preparation:** Create a CSV file with this exact content and save it as `bad-investors.csv`:
```csv
name,jurisdiction
,LU
Test Investor,
```

**Steps:**
1. Navigate to `/` (Dashboard).
2. If the Setup Wizard is visible, click "Import from Spreadsheet", then select "Investors". If not, navigate to any page where you can trigger a CSV import.
3. Upload `bad-investors.csv`.
4. On the Map Columns step, map `name` → `Name *` and `jurisdiction` → `Jurisdiction *`.
5. Click "Next: Preview".
6. On the Preview step, click "Import 2 Investors".

**Assertions:**
- [ ] If the backend rejects rows with validation errors, the error alert shows specific row-level errors (e.g., "Row 1: name is required" or "Row 2: jurisdiction is required").
- [ ] The errors are listed individually, not as a single generic message.
- [ ] If there are more than 10 errors, a "...and N more" overflow message appears.

---

## Reporting Format

After completing all tests, provide a summary table:

| Test | Name | Result | Notes |
|------|------|--------|-------|
| 1 | Dashboard First-Load | PASS/FAIL | ... |
| 2 | CSV Import Flow | PASS/FAIL | ... |
| 3 | Manual Setup Microcopy | PASS/FAIL | ... |
| 4 | Dashboard Checklist | PASS/FAIL | ... |
| 5 | Bulk Apply | PASS/FAIL | ... |
| 6 | Eligibility Explicit Advance | PASS/FAIL | ... |
| 7 | Single Apply Label | PASS/FAIL | ... |
| 8 | Copilot Panel | PASS/FAIL | ... |
| 9 | Completion Banner | PASS/FAIL | ... |
| 10 | Import Error Details | PASS/FAIL | ... |

For any FAIL result, describe exactly what you observed vs. what was expected.
