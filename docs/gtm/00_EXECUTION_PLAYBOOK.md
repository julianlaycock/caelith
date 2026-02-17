# CAELITH EXECUTION PLAYBOOK
**Created: February 17, 2026 | Deadline: April 16, 2026 (58 days)**

---

## PRIORITY ORDER

Execute in this exact sequence. Each step unlocks the next.

| # | Action | Time | Unlocks |
|---|--------|------|---------|
| **1** | Git security cleanup | 30 min | Safe to share repo/demo |
| **2** | Pre-load demo environment with realistic German KVG data | 2 hours | All demos and calls |
| **3** | LinkedIn profile optimization | 1 hour | Outreach credibility |
| **4** | Send 20 LinkedIn connection requests to German compliance heads | 3 hours | Pipeline (5-8 calls) |
| **5** | Send 10 cold emails to KVGs with public contact info | 2 hours | Pipeline (2-4 calls) |
| **6** | Submit EXIST Gruenderstipendium application | 6 hours | €150K + 18 months runway |
| **7** | Submit 2 accelerator applications (LHoFT + APX) | 4 hours | Funding + network |
| **8** | Run first demo calls | 30 min each | Pricing validation + pilot LOIs |
| **9** | Add critical test coverage (eligibility + integrity chain) | 8 hours | Confidence for pilot deployments |
| **10** | Convert demo interest to signed pilot agreements | 2 hours | First customers |

---

## WEEK 1 (Feb 17-23): COMMERCIAL ACTIVATION

### Day 1 (Mon Feb 17) — Security + Demo Prep
- [ ] Scrub git history of leaked .env secrets (see instructions below)
- [ ] Rotate any API keys that were in the .env
- [ ] Create realistic German KVG demo seed data
- [ ] Test demo flow end-to-end: login → dashboard → fund → eligibility check → decision → evidence PDF

### Day 2 (Tue Feb 18) — LinkedIn + Profile
- [ ] Update LinkedIn headline: "Building Caelith — AIFMD II compliance engine for alternative investment funds | HWR Berlin"
- [ ] Update LinkedIn About section (template in 01_OUTREACH_MESSAGES.md)
- [ ] Post first LinkedIn article: "58 days to AIFMD II — what KVGs need to know" (see template)
- [ ] Connect with 20 compliance heads at German KVGs (messages in 01_OUTREACH_MESSAGES.md)

### Day 3 (Wed Feb 19) — Email Outreach
- [ ] Build prospect list: 30 German KVGs from BaFin registry + BAI members (methodology in 05_TARGET_COMPANIES.md)
- [ ] Send 10 cold emails using templates in 01_OUTREACH_MESSAGES.md
- [ ] Register for any AIFMD II webinars/events in Feb-Mar

### Day 4 (Thu Feb 20) — EXIST Application Start
- [ ] Contact HWR Berlin Gruendungsservice (startup office) — they must sponsor the EXIST application
- [ ] Begin EXIST Gruenderstipendium application (details in 04_INCUBATOR_TARGETS.md)
- [ ] Draft 1-page business plan for EXIST

### Day 5 (Fri Feb 21) — Accelerator Applications
- [ ] Submit LHoFT application (Luxembourg — direct market access)
- [ ] Submit APX application (Berlin — local network)
- [ ] Follow up on any LinkedIn connection acceptances with demo invitations

### Weekend (Feb 22-23) — Critical Tests
- [ ] Write unit tests for eligibility-check-helper (6-point framework)
- [ ] Write unit tests for integrity-service (hash chain)
- [ ] Fix any bugs found during testing

---

## WEEK 2 (Feb 24-28): FIRST DEMOS

### Target: 3-5 demo calls completed
- [ ] Run demos using the script in 02_DEMO_SCRIPT.md
- [ ] Record every question prospects ask — this is your product roadmap
- [ ] Validate pricing in every call ("We're targeting €X/month — how does that compare to your compliance costs?")
- [ ] Send pilot agreement (03_PILOT_AGREEMENT.md) to anyone interested
- [ ] Follow up on all unanswered cold emails (use follow-up template)
- [ ] Post second LinkedIn article based on demo learnings
- [ ] Send 10 more cold emails to new prospects

---

## WEEK 3-4 (Mar 1-14): PILOT CONVERSION

### Target: 1-3 signed pilot LOIs
- [ ] Convert interested demos to signed pilot agreements
- [ ] Onboard first pilot customer (white-glove, hands-on)
- [ ] Collect feedback obsessively — what works, what's confusing, what's missing
- [ ] Build only what pilot customers explicitly request
- [ ] Continue LinkedIn outreach (10 new connections/week)
- [ ] Submit remaining accelerator applications

---

## WEEK 5-8 (Mar 15 — Apr 16): DEADLINE SPRINT

### Target: 3-5 pilots running, first paid conversion
- [ ] Convert free pilots to paid subscriptions
- [ ] Expand outreach to Luxembourg (ALFI network, Big Four contacts)
- [ ] Hire first team member (compliance domain expert OR BD)
- [ ] Prepare for AIFMD II go-live: customer success, support, monitoring

---

## GIT SECURITY CLEANUP (Priority 1 — Do First)

Run these commands to scrub leaked secrets from git history:

```bash
# 1. First, make sure your current .env is in .gitignore (it should be)
echo ".env" >> .gitignore

# 2. Install git-filter-repo (if not installed)
pip install git-filter-repo

# 3. Remove .env from entire git history
git filter-repo --path .env --invert-paths --force

# 4. If git-filter-repo isn't available, use BFG Repo-Cleaner:
# Download bfg.jar from https://rtyley.github.io/bfg-repo-cleaner/
# java -jar bfg.jar --delete-files .env
# git reflog expire --expire=now --all && git gc --prune=now --aggressive

# 5. Force push (this is the one time force push is correct)
git push origin main --force

# 6. Rotate ALL API keys that were ever in .env:
# - ANTHROPIC_API_KEY: https://console.anthropic.com/settings/keys
# - OPENAI_API_KEY: https://platform.openai.com/api-keys
# - JWT_SECRET: generate new with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# - Any database passwords
```

**This must be done BEFORE sharing the repo with anyone — investors, incubators, or customers.**
