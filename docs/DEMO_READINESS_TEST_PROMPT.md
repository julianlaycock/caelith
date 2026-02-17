# Caelith Demo Readiness — QA Test Prompt

> Paste this entire prompt into OpenClaw (or any AI QA agent with browser control).

---

## SYSTEM CONTEXT

You are testing a web application called **Caelith**, an AIFMD II compliance engine for alternative investment funds. The application has a **backend** (Node.js/Express on port 3001) and a **frontend** (Next.js on port 3000).

You will execute 22 verification tests to confirm that recent legal/regulatory fixes have been correctly applied. Each test has a PASS/FAIL criterion. Record the result of every test. At the end, produce a summary table.

**Important rules:**
- Navigate using the sidebar on the left. The sidebar has these links: Dashboard (`/`), Funds (`/funds`), Investors (`/investors`), Transfers (`/transfers`), Rules (`/rules`), Decisions (`/decisions`).
- The Copilot panel is opened by clicking the floating button labeled "Compliance Copilot" in the bottom-right corner of every page. It slides in from the right.
- When a test says "verify text contains X", perform a case-insensitive substring match unless stated otherwise.
- Do NOT modify any data unless a test explicitly instructs you to.
- If a test depends on data that does not exist (e.g., no decision records), note it as BLOCKED and move to the next test.
- Take a screenshot after each verification step.

---

## PREREQUISITES

1. Open a browser and navigate to `http://localhost:3000/login`
2. Log in with: **Email:** `admin@caelith.com` **Password:** `Admin1234`
3. Wait for the dashboard to load. Confirm you see either the Setup Wizard or the main dashboard with metric cards.
4. If the Setup Wizard is showing (means no funds exist yet), click **"Explore the dashboard first"** (the ghost/text-only button at the bottom) to dismiss it and reach the empty dashboard.

You are now authenticated and on the Dashboard. Begin testing.

---

## GROUP A: COPILOT PANEL TESTS

### TEST 1 — Session-level disclaimer visible on panel open

**Steps:**
1. Look at the bottom-right corner of the screen. Click the floating button that says **"Compliance Copilot"**.
2. The Copilot panel slides in from the right side.
3. Do NOT type anything. Look at the center area of the panel, between the Copilot icon/title and the list of suggested prompt buttons.

**PASS criteria:** There is an amber/yellow bordered box containing text that includes ALL of the following phrases:
- "AI-generated informational assistance only"
- "do not constitute legal, regulatory, or compliance advice"
- "independent verification by a qualified professional"
- "does not provide legal advice"

**FAIL criteria:** The disclaimer box is missing, or any of the four phrases above are absent.

---

### TEST 2 — Per-message disclaimer font size and wording

**Steps:**
1. With the Copilot panel still open from Test 1, click any one of the suggested prompt buttons (e.g., "Summarize my portfolio compliance status").
2. Wait for the AI response to appear (you will see a typing animation, then the response text).
3. Look below the response message. There is a thin horizontal line, then a row with text on the left and two small icon buttons (thumbs up, thumbs down) on the right.

**PASS criteria:** The text on the left of that row reads exactly: **"AI-generated — not legal or regulatory advice. Verify independently."** and the text is clearly legible (not microscopic — it should be roughly 11px, which is smaller than the response text but still easily readable).

**FAIL criteria:** The text says "AI-assisted interpretation — not legal advice" (old wording), or the font is so tiny it's barely visible (9px or smaller).

---

### TEST 3 — Ungrounded LLM fallback shows UNVERIFIED label

**Precondition:** This test works only if NO regulatory documents have been uploaded to the RAG pipeline. On a fresh demo instance, this is the default. If documents have been uploaded, mark this test as SKIPPED.

**Steps:**
1. With the Copilot panel still open, clear any previous conversation by closing the panel (click the X in the top-right of the panel) and reopening it (click the floating button again).
2. In the text input at the bottom of the panel, type: `What are the CSSF requirements for SIF funds?`
3. Press Enter and wait for the response.

**PASS criteria:** The response message begins with text that includes: **"UNVERIFIED"** AND **"based on the AI model's general regulatory knowledge, not verified document sources"**. The response also contains: **"must be independently verified before reliance"**.

**FAIL criteria:** The response does not contain "UNVERIFIED" or does not warn about unverified sources.

---

### TEST 4 — RAG-grounded response does NOT show UNVERIFIED label

**Precondition:** This test requires regulatory documents to have been ingested. If no documents have been uploaded, mark as SKIPPED.

**Steps:**
1. Open the Copilot panel, type a regulatory question, press Enter.
2. Wait for the response.

**PASS criteria:** The response does NOT begin with "UNVERIFIED". Source citation pills (small badges with document names) appear below the response.

**FAIL criteria:** The response begins with "UNVERIFIED" despite documents being available.

---

**Close the Copilot panel before proceeding.** Click the X button in the top-right corner of the panel.

---

## GROUP B: DECISIONS PAGE TESTS

### TEST 5 — Page header says "tamper-evident"

**Steps:**
1. In the left sidebar, click **"Decisions"**. Wait for the page to load.
2. Read the page header area (top of the content area, large title and smaller description text below it).

**PASS criteria:** The description text contains the word **"tamper-evident"**.

**FAIL criteria:** The description contains the word "immutable" instead.

---

### TEST 6 — Decision detail disclaimer uses correct language

**Precondition:** The decisions table must have at least one row. If the table is empty or shows "No decisions found", mark as BLOCKED.

**Steps:**
1. On the `/decisions` page, click any row in the decisions table. A detail panel slides in from the right.
2. Scroll to the very bottom of that detail panel. Find the amber/yellow disclaimer box (the last element before the panel ends).

**PASS criteria:** The disclaimer text contains ALL of these phrases:
- "protected by a cryptographic integrity chain (SHA-256)"
- "Any modification to the record or its chain position is detectable"
- "tamper-evidence suitable for audit purposes"

**FAIL criteria:** The disclaimer says "immutable and tamper-evident" or just "immutable".

---

### TEST 7 — Minimum investment citation says "well-informed investor"

**Precondition:** Requires at least one eligibility_check decision in the table. Look for a row where the Type column says "eligibility check". If none exists, mark as BLOCKED.

**Steps:**
1. On the `/decisions` page, click a row where the Type column says **"eligibility check"**.
2. In the detail panel, scroll down until you see the **"Explain This Decision"** button. Click it.
3. Wait for the explanation to load (you will see "Analyzing..." then the explanation section appears with per-rule cards).
4. Find the card labeled **"minimum investment"** (look for that text in bold at the top of one of the rule cards).
5. Inside that card, find the small monospace pill/badge that starts with a book icon or "Jurisdiction-specific:".

**PASS criteria:** The regulatory basis text contains **"well-informed investor"** for the Luxembourg entry (specifically: "LU SIF Law Art 2 (€125K well-informed investor)").

**FAIL criteria:** The text contains "semi-pro" for the Luxembourg entry.

---

### TEST 8 — Classification evidence citation is correct

**Steps:**
1. In the same explanation view from Test 7 (or click "Explain This Decision" on another eligibility check decision), find the card labeled **"classification evidence"**.
2. Read the regulatory basis pill/badge inside that card.

**PASS criteria:** The text reads **"MiFID II Art 16(6)-(7), AIFMD Art 22"**.

**FAIL criteria:** The text reads "MiFID II Art 69".

---

**Close the detail panel** by clicking the X button or clicking the dark overlay.

---

## GROUP C: ELIGIBILITY ENGINE LOGIC TESTS

### TEST 9 — Classification evidence FAILS when no evidence exists

This is the most critical logic test. It verifies that non-retail investors without classification documentation are correctly flagged.

**Steps:**
1. In the left sidebar, click **"Investors"**. Wait for the investor list to load.
2. In the table, find an investor whose **Type** column says "professional", "semi_professional", or "institutional". Note their name.
3. Click that investor's **name** (it is a blue/underlined link). This navigates you to their detail page at `/investors/{id}`.
4. On the investor detail page, look at the top-right area near the page title. Click the button that says **"Check Eligibility"**.
5. A modal/dialog opens. It has a dropdown labeled "Fund to check against" (or similar). Select any available fund from the dropdown.
6. Click the **"Run Check"** button.
7. The modal now shows the eligibility verdict and a list of per-rule check results (each with a green checkmark or red X).
8. Find the check labeled **"classification evidence"**.

**PASS criteria:** The classification evidence check shows a **red X (FAIL)** with a message that includes: **"No classification evidence on file"** AND **"Evidence of investor classification is required"**.

**FAIL criteria:** The classification evidence check shows a green checkmark (PASS) with a "WARNING" message.

**Note:** If the investor you picked happens to have classification evidence already on file, the check will correctly PASS. In that case, try a different investor. Investors created via CSV import without explicit classification fields will have no evidence.

---

### TEST 10 — Classification evidence PASSES when evidence exists

**Steps:**
1. Close the eligibility modal from Test 9.
2. Click the browser back button or click **"Investors"** in the sidebar to return to the investor list.
3. Find a different investor who is professional/institutional AND was created by the demo seed data (investors like "CalPERS", "Allianz Global Investors", or "Rothschild & Co Wealth Management" typically have classification data).
4. Click their **name** to go to their detail page.
5. Click **"Check Eligibility"**, select a fund, click **"Run Check"**.
6. Find the "classification evidence" check.

**PASS criteria:** The check shows a **green checkmark (PASS)** with a message like "Investor classification method: self_declaration" (or similar method name).

**FAIL criteria:** The check shows FAIL despite the investor having classification evidence on file.

---

### TEST 11 — Retail investors skip classification evidence check entirely

**Steps:**
1. Return to the investor list (click **"Investors"** in the sidebar).
2. Find an investor whose **Type** column says **"retail"** (e.g., "Thomas Keller", "Amelie Dubois", "Anna Kowalski").
3. Click their **name** to go to their detail page.
4. Click **"Check Eligibility"**.
5. In the fund dropdown, you need to select a fund that accepts retail investors. Look for an **ELTIF** fund (e.g., "Horizon ELTIF 2.0 Epsilon"). If no ELTIF fund exists in the dropdown, mark as BLOCKED (retail investors are not eligible for SIF/RAIF/Spezial-AIF, so the check would fail on investor_type before reaching classification_evidence).
6. Click **"Run Check"**.
7. Scan through ALL the per-rule checks in the results list.

**PASS criteria:** There is **no** check labeled "classification evidence" anywhere in the list. The check is completely absent for retail investors.

**FAIL criteria:** A "classification evidence" check appears for a retail investor.

---

## GROUP D: CSV IMPORT DEFAULT INVESTOR TYPE

### TEST 12 — Missing investor_type defaults to "retail"

**Steps:**
1. Create a test CSV file on your local machine named `test-no-type.csv` with this exact content:
   ```
   name,jurisdiction,kyc_status
   QA Test Investor GmbH,DE,verified
   ```
2. This test requires using the API directly since the CSV wizard is only accessible from the Setup Wizard. Open a new browser tab and navigate to the browser's developer tools (press F12), go to the **Console** tab.
3. Paste and run this JavaScript in the console:
   ```javascript
   fetch('/api/import/bulk', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify({
       investors: [{ name: 'QA Test Investor GmbH', jurisdiction: 'DE' }]
     })
   }).then(r => r.json()).then(d => console.log('Import result:', d));
   ```
4. Wait for the console to show "Import result:" with a success response.
5. Go back to the Caelith tab. In the sidebar, click **"Investors"**.
6. In the search box (if visible) or by scrolling, find **"QA Test Investor GmbH"**.
7. Check the **Type** column for that investor.

**PASS criteria:** The investor type is **"retail"**.

**FAIL criteria:** The investor type is "professional".

---

### TEST 13 — Explicit investor_type is preserved

**Steps:**
1. In the browser console (same developer tools from Test 12), paste and run:
   ```javascript
   fetch('/api/import/bulk', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify({
       investors: [{ name: 'QA Test Professional AG', jurisdiction: 'DE', investor_type: 'professional' }]
     })
   }).then(r => r.json()).then(d => console.log('Import result:', d));
   ```
2. Navigate to **"Investors"** in the sidebar.
3. Find **"QA Test Professional AG"**.
4. Check the **Type** column.

**PASS criteria:** The investor type is **"professional"**.

**FAIL criteria:** The investor type is "retail" (meaning the explicit value was overridden).

---

## GROUP E: LANDING PAGE TESTS

For these tests, open the landing page HTML file directly in a browser.

### Setup:
Open a new browser tab and navigate to: `file:///[PROJECT_PATH]/landing/index.html`
(Replace `[PROJECT_PATH]` with the actual path to the project, e.g., `C:/Users/julia/projects/private-asset-registry_Caelith_v2`)

If the file path does not work, try: `http://localhost:3000/../landing/index.html` or simply open the file via File > Open in your browser.

---

### TEST 14 — Hero badge text

**Steps:**
1. On the landing page, look at the very top of the hero section (below the navigation bar and the red deadline banner). There is a small rounded pill/badge with a green pulsing dot.

**PASS criteria:** The badge text reads **"Preparing for AIFMD II"**.

**FAIL criteria:** The badge text reads "AIFMD II Ready".

---

### TEST 15 — Hero heading text

**Steps:**
1. On the same page, read the large main heading directly below the badge.

**PASS criteria:** The heading reads **"Compliance orchestration for alternative investment funds"**.

**FAIL criteria:** The heading reads "Compliance enforcement for alternative investment funds".

---

### TEST 16 — Stats row — deterministic label

**Steps:**
1. Scroll down slightly (or look below the "Book a Free Demo" buttons) to the row of 4 statistics: 13, 3, 100%, <100ms.
2. Read the label under the **"100%"** stat.

**PASS criteria:** The label reads **"Deterministic rules engine"**.

**FAIL criteria:** The label reads "Deterministic enforcement".

---

### TEST 17 — Luxembourg jurisdiction card

**Steps:**
1. Scroll down to the **"Jurisdictions"** section (below "How It Works", above the dark CTA section). You will see 4 cards with flag emojis: Germany, Luxembourg, Ireland, EU-wide.
2. Find the **Luxembourg** card (flag: LU).
3. Read the blue bold text at the bottom of that card.

**PASS criteria:** The text reads **"€125K well-informed investor"**.

**FAIL criteria:** The text reads "€125K semi-pro minimum".

---

### TEST 18 — Decision Provenance feature card

**Steps:**
1. Scroll up to the **"Platform"** / Features section (heading: "Built for AIFMD. Not adapted from something else.").
2. Find the card titled **"Decision Provenance"**.
3. Read the paragraph description inside that card.

**PASS criteria:** The description contains **"tamper-evident record"**.

**FAIL criteria:** The description contains "immutable record".

---

## GROUP F: PITCH DECK TESTS

### Setup:
Open a new browser tab and navigate to: `file:///[PROJECT_PATH]/landing/deck.html`

The deck is a series of slides stacked vertically. Scroll down through them.

---

### TEST 19 — Slide 1 (Cover) heading

**Steps:**
1. The first slide has a dark background with "Caelith" at the top and a large heading in the center.

**PASS criteria:** The heading reads **"The compliance engine that documents your decisions"**.

**FAIL criteria:** The heading reads "The compliance engine that proves you're compliant".

---

### TEST 20 — Slide 10 (Closing) heading

**Steps:**
1. Scroll all the way to the bottom of the page. The last slide has a blue gradient background and a large heading.

**PASS criteria:** The heading reads **"Demonstrably documented. Not hopefully compliant."**

**FAIL criteria:** The heading reads "Provably compliant. Not hopefully compliant."

---

### TEST 21 — Slide 3 (Solution) heading and subtitle

**Steps:**
1. Scroll back up. Slide 3 has a blue gradient background, labeled "The Solution" in the top-left area.
2. Read the heading and the paragraph below it.

**PASS criteria:**
- Heading contains **"deterministic validation"** (not "deterministic enforcement")
- Paragraph contains **"automatically validated against"** (not "automatically enforced against")

**FAIL criteria:** Either phrase uses "enforcement" or "enforced".

---

### TEST 22 — Slide 6 (Differentiation) heading and table

**Steps:**
1. Scroll to slide 6 — white background, labeled "Differentiation", with a comparison table.
2. Read the heading above the table.
3. Read the first data row of the table (Investor eligibility...).

**PASS criteria:**
- Heading reads **"We don't check boxes. We validate decisions."**
- First row label says **"Investor eligibility validation"**
- Caelith column in that row says **"Deterministic rules engine"**

**FAIL criteria:** Heading says "enforce rules", row says "enforcement", or Caelith column says "Deterministic engine" (without "rules").

---

## RESULTS TEMPLATE

After completing all tests, produce a summary in this exact format:

```
CAELITH DEMO READINESS TEST RESULTS
Date: [DATE]
Tester: OpenClaw AI

| #  | Test Name                                      | Result  | Notes                |
|----|------------------------------------------------|---------|----------------------|
| 1  | Copilot session-level disclaimer               | PASS/FAIL/BLOCKED/SKIPPED |  |
| 2  | Copilot per-message disclaimer wording + size  | PASS/FAIL/BLOCKED/SKIPPED |  |
| 3  | Copilot ungrounded fallback UNVERIFIED label   | PASS/FAIL/BLOCKED/SKIPPED |  |
| 4  | Copilot RAG-grounded no UNVERIFIED label       | PASS/FAIL/BLOCKED/SKIPPED |  |
| 5  | Decisions page header "tamper-evident"          | PASS/FAIL/BLOCKED/SKIPPED |  |
| 6  | Decision detail disclaimer language             | PASS/FAIL/BLOCKED/SKIPPED |  |
| 7  | Min investment citation "well-informed"         | PASS/FAIL/BLOCKED/SKIPPED |  |
| 8  | Classification evidence citation MiFID Art 16   | PASS/FAIL/BLOCKED/SKIPPED |  |
| 9  | Classification evidence FAILS without evidence  | PASS/FAIL/BLOCKED/SKIPPED |  |
| 10 | Classification evidence PASSES with evidence    | PASS/FAIL/BLOCKED/SKIPPED |  |
| 11 | Retail investor skips classification check      | PASS/FAIL/BLOCKED/SKIPPED |  |
| 12 | Default investor_type is "retail"               | PASS/FAIL/BLOCKED/SKIPPED |  |
| 13 | Explicit investor_type preserved                | PASS/FAIL/BLOCKED/SKIPPED |  |
| 14 | Landing page hero badge text                    | PASS/FAIL/BLOCKED/SKIPPED |  |
| 15 | Landing page hero heading                       | PASS/FAIL/BLOCKED/SKIPPED |  |
| 16 | Landing page stats "rules engine"               | PASS/FAIL/BLOCKED/SKIPPED |  |
| 17 | Landing page LU "well-informed investor"        | PASS/FAIL/BLOCKED/SKIPPED |  |
| 18 | Landing page "tamper-evident record"             | PASS/FAIL/BLOCKED/SKIPPED |  |
| 19 | Deck slide 1 "documents your decisions"         | PASS/FAIL/BLOCKED/SKIPPED |  |
| 20 | Deck slide 10 "Demonstrably documented"         | PASS/FAIL/BLOCKED/SKIPPED |  |
| 21 | Deck slide 3 "deterministic validation"         | PASS/FAIL/BLOCKED/SKIPPED |  |
| 22 | Deck slide 6 "validate decisions"               | PASS/FAIL/BLOCKED/SKIPPED |  |

TOTAL: [X]/22 PASSED | [X] FAILED | [X] BLOCKED | [X] SKIPPED
```

If any test FAILS, include a detailed description of what was actually observed vs. what was expected.

---

## CLEANUP (after all tests complete)

If Tests 12 and 13 passed and created test investors, delete them:
1. Navigate to Investors page
2. Find "QA Test Investor GmbH" and "QA Test Professional AG"
3. These can be left in place for now (they use synthetic names and will be cleared on next DB reset)

---

END OF TEST PROMPT
