# Sprint 2 Kickoff — RAG Pipeline + NL Compiler Live + Compliance Copilot

## Current State
- Sprint 0 (stabilize) and Sprint 1 (multi-tenancy + blockchain audit log) are COMPLETE
- Git tags: `sprint-0-stable`, `sprint-1-foundations`
- Production: https://caelith.tech (Railway.app)
- Anthropic API credits: FUNDED
- 17 migrations applied, 96 tests passing, `npm run build` clean
- All core tables have `tenant_id` columns, decision records have hash chain (integrity_hash, previous_hash, sequence_number)

## What to Build

### 2A. RAG Pipeline (Week 1)
**Goal:** Ingest 6 regulatory PDFs → chunk by article/section → embed → store in `regulatory_documents` with pgvector → query endpoint returns relevant chunks with citations.

**New/modified files:**
- `src/backend/services/rag-service.ts` — CREATE: ingestDocument(), query(), suggestRules()
- `src/backend/services/embedding-service.ts` — CREATE: embed() wrapper for Anthropic voyage-3 or OpenAI text-embedding-3-small
- `src/backend/routes/regulatory-routes.ts` — CREATE: POST /api/regulatory/ingest (admin), POST /api/regulatory/query, POST /api/regulatory/suggest-rules
- `src/backend/server.ts` — mount regulatory routes
- `scripts/ingest-regulations.ts` — CREATE: CLI to bulk-ingest the 6 PDFs from project files

**pgvector prerequisite:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
Table `regulatory_documents` already exists (migration 015). Verify it has a vector column or add one.

**Initial corpus (all in project knowledge as PDFs):**
| Document | Est. chunks |
|----------|------------|
| CELEX_32011L0061 (AIFMD Directive) | ~120 |
| CELEX_32023R0606 (ELTIF 2.0) | ~80 |
| cssf15_633eng (CSSF Circular) | ~40 |
| cssf18_698eng (CSSF Circular) | ~30 |
| L_230716_RAIF_eng (RAIF Law) | ~50 |
| CBI_AIFMD_QA (CBI Q&A) | ~60 |

### 2B. NL Compiler Live Test (Week 1, parallel)
**Goal:** The NL rule compiler (`src/backend/services/nl-rule-compiler.ts`) is already code-complete. Just needs:
- Live test with real Anthropic API
- Error handling for rate limits / API failures
- Frontend button/UI to invoke it (currently no UI exists)

### 2C. Compliance Copilot (Week 2)
**Goal:** Chat interface for compliance officers to ask questions and get answers grounded in regulatory text.

**New/modified files:**
- `src/frontend/src/components/copilot.tsx` — CREATE: slide-out panel (right side, ~400px), chat messages + input
- `src/backend/services/copilot-service.ts` — CREATE: intent classification → route to appropriate service → format response with citations
- `src/backend/routes/copilot-routes.ts` — CREATE: POST /api/copilot/chat
- `src/frontend/src/app/layout.tsx` — add copilot toggle button (floating, bottom-right)

**Copilot capabilities (4 intents):**
| Intent | Example | Backend call |
|--------|---------|-------------|
| Explain decision | "Why was transfer X rejected?" | Fetch decision record → format |
| Regulatory Q&A | "What does AIFMD say about..." | POST /api/regulatory/query → RAG |
| Draft rule | "Create a rule that blocks..." | POST /api/nl-rules/from-natural-language |
| What-if analysis | "What if minimum changed to €150K?" | Impact analysis against investor base |

## Constraints
- Route handler pattern: `async (req, res): Promise<void>` with `res.status().json(); return;`
- Error pattern: `err: unknown` + `instanceof Error`
- Design tokens: brand-*, ink-*, edge-*, surface-*
- All 96 existing tests must still pass
- `npm run build` must compile cleanly
- PostgreSQL: Use `$1, $2` or `?` (auto-converted by db.ts)
- All new entities must include `tenant_id` (DEFAULT_TENANT_ID from db.ts)
- New decision records must call `sealRecord()` from integrity-service.ts
- Log copilot interactions as events (event_type: 'copilot.query')

## Verification
```powershell
# 1. Enable pgvector
docker exec caelith-db psql -U codex -d codex -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. Run ingestion
npx tsx scripts/ingest-regulations.ts

# 3. Test RAG query
curl -s -H "Authorization: Bearer <token>" \
  -X POST http://localhost:3001/api/regulatory/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the investor requirements for a Luxembourg SIF?"}' | jq .
# Expected: chunks from SIF Law Art. 2 with citations

# 4. Test NL compiler
curl -s -H "Authorization: Bearer <token>" \
  -X POST http://localhost:3001/api/nl-rules/from-natural-language \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Block retail investors from SIF funds", "asset_id": "..."}' | jq .

# 5. Test copilot
curl -s -H "Authorization: Bearer <token>" \
  -X POST http://localhost:3001/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the minimum investment requirements for semi-professional investors in a SIF?"}' | jq .

# 6. All tests pass
npx vitest run

# 7. Frontend build clean
cd src/frontend && npm run build

# 8. Manual: open copilot panel → ask regulatory question → get cited answer
```

## Git (after verification)
```powershell
git add .
git commit -m "feat: sprint 2 — RAG pipeline + NL compiler live + compliance copilot"
git tag sprint-2-ai-layer
git push && git push --tags
```

## Reference
See `PILOT_EXECUTION_PLAN.md` Sprint 2 section for complete file-level specification including chunking strategy, embedding config, copilot intent classification, and what-if analysis endpoint.
