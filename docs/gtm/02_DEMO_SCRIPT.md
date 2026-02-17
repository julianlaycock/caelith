# CAELITH DEMO SCRIPT
**Duration: 15 minutes | Format: Live product demo via screen share**

---

## PRE-DEMO CHECKLIST

- [ ] Demo environment running (docker compose up)
- [ ] Logged in as admin
- [ ] German KVG seed data loaded (Rheingold Capital demo fund)
- [ ] Browser zoomed to 110% for readability on screen share
- [ ] Copilot sidebar closed (open during copilot section)
- [ ] Close all other browser tabs
- [ ] Have Calendly link ready for follow-up booking

---

## THE SCRIPT

### OPENING (60 seconds)

> "Thanks for taking the time, [Name]. I'll keep this to 15 minutes — all product, no slides.
>
> Quick context: Caelith is a compliance engine for AIFMD II. It does three things:
> 1. Runs eligibility checks against your jurisdiction's rules
> 2. Creates tamper-evident decision records for every check
> 3. Generates evidence bundles you can hand to BaFin
>
> Let me show you how it works with a realistic scenario."

---

### ACT 1: THE DASHBOARD (90 seconds)

**Show the dashboard. Point out:**

> "This is the compliance dashboard for a sample KVG — Rheingold Capital. You can see:
> - **Portfolio overview**: 3 fund structures, mix of Spezial-AIF and SIF
> - **Investor type breakdown**: how your investor base splits across institutional, professional, semi-professional
> - **KYC expiry horizon**: which investors need re-verification soon
> - **Jurisdiction exposure**: where your investors are domiciled
>
> Everything here updates in real time as you onboard investors and run checks."

**Transition:** "But the real value isn't the dashboard — it's what happens when you check eligibility."

---

### ACT 2: ELIGIBILITY CHECK (3 minutes) — THE MONEY SHOT

**Navigate to a fund → select an investor → run eligibility check**

> "Let's say a new investor wants to subscribe to the Rheingold European Real Estate SIF. They claim to be a semi-professional investor with €125,000.
>
> I click 'Check Eligibility' and Caelith runs 6 validation checks:"

**Show the results screen. Walk through each check:**

> "1. **Fund status** — is the fund open for subscriptions? ✅
> 2. **Investor type eligibility** — does this fund accept semi-professional investors? ✅ (SIF allows it under CSSF Circ. 06/241)
> 3. **Minimum investment** — €125,000 meets the SIF minimum ✅
> 4. **Suitability requirement** — semi-professional investors require suitability declaration ⚠️
> 5. **KYC verified** — is their identity verified? ✅
> 6. **KYC not expired** — is verification still current? ✅
>
> Result: Eligible with one condition — suitability declaration required."

**Key message:** "Every one of these checks cites the specific regulation — CSSF Circular 06/241 Article 2, KAGB §1 Abs. 19 Nr. 33. Not generic compliance — *your jurisdiction's actual rules.*"

**Now show a REJECTION scenario:**

> "Now let's try a retail investor with €50,000 wanting to enter the same SIF.
>
> Immediately: **Ineligible**. Two failures:
> - Investor type: SIF does not accept retail investors (CSSF Circ. 06/241 Art. 2)
> - Minimum investment: €50,000 below €125,000 threshold
>
> This is a hard rejection — no override possible. And it's documented."

---

### ACT 3: DECISION PROVENANCE (3 minutes) — THE DIFFERENTIATOR

**Navigate to the decision record just created**

> "This is where Caelith is fundamentally different from a spreadsheet or a checklist tool.
>
> Every eligibility check creates an **immutable decision record**. Let me show you what's in it:"

**Point out each section:**

> "- **Input snapshot**: the exact investor data at the moment of the check — type, jurisdiction, KYC status, investment amount
> - **Rule version snapshot**: the exact eligibility rules that applied — not today's rules, the rules *at decision time*
> - **Result details**: each of the 6 checks with pass/fail and regulatory citation
> - **Integrity hash**: SHA-256 hash linking this record to every previous decision
>
> If anyone changes a single byte of any historical record, the hash chain breaks. You can verify the entire chain with one click."

**Click 'Verify Chain':**

> "See? 'Chain verified: [N] records, all hashes valid.' This is cryptographic proof that no decision has been tampered with since it was created."

**Click 'Download Evidence Bundle':**

> "And this is the PDF you hand to BaFin. Decision ID, timestamp, input data, rules applied, result, integrity hash. Everything a regulator needs to reconstruct exactly what happened and why."

**Pause. Let this land.**

> "[Name], this is what I mean by 'decision provenance.' It's not just logging that a check happened — it's proving what inputs and rules produced the result, and proving it hasn't changed since."

---

### ACT 4: SCENARIO MODELING (2 minutes)

> "One more thing. Let's say the CSSF changes the minimum investment for semi-professional investors from €125,000 to €200,000. Who's affected?"

**Run a what-if scenario:**

> "Caelith instantly shows you: [N] investors currently hold positions that would fail under the new threshold. Here's the list, with their current investment amounts and the gap.
>
> You can see this *before* the rule changes — so you can prepare, not react."

---

### ACT 5: AI COPILOT (90 seconds) — Quick demo

**Open copilot sidebar**

> "Last piece: the compliance copilot. You can ask natural language questions about AIFMD regulations."

**Type:** "What are the eligibility requirements for semi-professional investors in a Luxembourg SIF?"

> "It pulls from the actual regulatory text — CSSF circulars, AIFMD articles — and gives you a sourced answer with citations. Not ChatGPT guessing — retrieval-augmented generation from the actual regulations."

---

### CLOSING (2 minutes)

> "[Name], that's Caelith. Eligibility checks, decision provenance, evidence bundles, scenario modeling, and a compliance copilot. All in one platform.
>
> Three questions for you:
>
> 1. **How are you handling eligibility documentation today?** (Listen. This tells you their pain.)
> 2. **If this existed 6 months ago, would it have saved you time?** (Validation.)
> 3. **We're running free 3-month pilots for German KVGs. Would that be interesting?** (The ask.)

**If they say yes:**

> "Great. I'll send over a simple pilot agreement — one page, no commitment, just scope and data handling. We can have you running checks on your actual fund data within a day."

**If they need to think / check internally:**

> "Completely understand. I'll send you a summary email with what we covered. Who else on your team should see this? Happy to run the demo again for your [COO / General Counsel / team]."

**If they say no:**

> "Appreciate your time, [Name]. If anything changes as April 16 gets closer, I'm here. I'll send a follow-up with our contact details."

---

## POST-DEMO ACTIONS

Immediately after every demo:

1. **Send follow-up email** within 1 hour (template below)
2. **Log the call** in your prospect tracker: date, attendees, questions asked, interest level (hot/warm/cold), next step, timeline
3. **Note every question they asked** — these become product priorities
4. **Note pricing reactions** — did they flinch? nod? ask for comparison?

### Follow-up Email Template
```
Subject: Caelith demo recap — next steps

Hi [Name],

Thanks for taking the time today. Quick recap of what we covered:

• Deterministic eligibility checking with KAGB/CSSF rule citations
• Tamper-evident decision records with SHA-256 integrity chain
• PDF evidence bundles for regulatory examinations
• Scenario modeling for rule change impact analysis

As discussed, we're offering a free 3-month pilot. Here's what that includes:
- Full platform access for your fund structures
- White-glove onboarding (I'll set up your fund data personally)
- Unlimited eligibility checks and decision records
- Direct Slack/email support with me

I've attached the pilot agreement (1 page). If it looks good, we can get started as early as [date].

[If they mentioned involving someone else:]
Happy to run the demo again for [person they mentioned]. Just forward this email and they can book directly: [Calendly link]

Best,
Julian
```
