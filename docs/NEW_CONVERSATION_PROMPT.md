# PROMPT — Paste this to start your new Caelith conversation

---

I'm continuing development on Caelith, an AIFMD compliance orchestration platform for EU alternative fund managers. Please read the project knowledge files before responding:

1. **`HANDOFF_CONTEXT_UPDATED.md`** — Full technical context: tech stack (Node/Express/Next.js/PostgreSQL+pgvector), database schema (19 migrations), API surface (35+ endpoints), file structure, seed data, and development history. Sprints 0–3 are complete.

2. **`HANDOFF_SESSION_20260212.md`** — Legal context: AIFMD II gap analysis (39% coverage score), 14-slide incubator pitch deck, business positioning, and strategic priorities.

**Current state:**
- Working product live at caelith.tech, 96 tests passing, git tag `sprint-3-integration`
- Sprints complete: multi-tenancy (016), blockchain audit log (017), RAG pipeline (018, 1,246 regulatory chunks embedded), security hardening (019), NL compiler live, compliance copilot, MCP server (7 tools), visual rule builder (8 components)
- AI stack operational: Anthropic API (copilot + NL compiler) + OpenAI API (embeddings)
- 15 frontend pages, 8+ components, 4 lib modules
- Critical gaps identified: delegation oversight (17%), liquidity management (0%), loan origination portfolio-side (36%)
- 62 days until AIFMD II enforcement (16 April 2026)
- Applying to Startup Incubator Berlin, raising €500K pre-seed

**What I need to work on next** (pick up from here):
- Sprint 4: On-chain export (ERC-3643 JSON from sealed decisions) + investor detail page + OpenAPI documentation
- See `PILOT_EXECUTION_PLAN.md` for Sprint 4 file-level specification

Let me know when you've reviewed the project knowledge and are ready to proceed.

---
