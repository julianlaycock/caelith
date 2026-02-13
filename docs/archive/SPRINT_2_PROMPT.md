# Caelith — Sprint 2 Agent Prompt
## RAG Pipeline + NL Compiler Live + Compliance Copilot

**Date:** February 12, 2026
**Sprint tag:** `sprint-2-ai-layer`
**Prerequisite:** Anthropic API credits FUNDED ✅

---

## Status Summary — Where We Stand

### Completed Work

**Pre-Sprint (Phases 1–3):** Full-stack foundation built in ~9 days. PostgreSQL with 15 migrations, JWT auth with 3 RBAC roles (admin, compliance_officer, viewer), 7 built-in transfer validation rules plus composite AND/OR/NOT logic, transfer simulation and execution with decision records, eligibility checking (6 regulatory checks with citations), onboarding workflow (4-step state machine), fund structure modeling (SIF, RAIF, ELTIF), investor classification (5-tier), compliance PDF export, webhook system (HMAC-SHA256), NL rule compiler (code-complete but untested live), EU regulatory templates (MiFID II, AIFMD, DLT Pilot, MiCA, DACH), full frontend redesign with institutional green design system across 10+ pages, dashboard with 5 data visualization charts.

**Sprint 0 — Stabilize (Feb 11–12) ✅** `sprint-0-stable`
9 stress test fixes: PostgreSQL placeholders, transfer whitelist UI, eligibility modal, decisions hash chain, KYC chart, auth guards, admin normalization, PDF pagination, legacy page polish. `.gitignore` updated (`dist/` excluded). "New Application" button added to onboarding Kanban.

**Sprint 1 — Foundations (Feb 12–13) ✅** `sprint-1-foundations`
- **1A Multi-Tenancy:** Migration 016 added `tenants` table + `tenant_id` on all 16 core tables. Default tenant `00000000-0000-0000-0000-000000000099` ("Caelith Demo"). All existing data backfilled. JWT carries `tenantId`, auth middleware extracts it. `DEFAULT_TENANT_ID` constant + `withTenant()` helper. Tenant API routes. RLS policies written as comments, ready to enable.
- **1B Blockchain Audit Log:** Migration 017 added `sequence_number`, `integrity_hash`, `previous_hash` on `decision_records`. `integrity-service.ts` with `computeRecordHash()`, `sealRecord()`, `verifyChain()`, `sealAllUnsealed()`. Repository calls `sealRecord()` after every INSERT. Verify-chain endpoint + seal-all endpoint. Frontend reads server-side hashes, "Verify Chain" button with green/red banner. Seed scripts call `sealAllUnsealed()` after seeding.

### Current Baseline
- **Git tags:** `sprint-0-stable`, `sprint-1-foundations`
- **Production:** https://caelith.tech (Railway.app)
- **17 migrations** applied, **96 tests** passing, `npm run build` clean
- **All core tables** have `tenant_id` columns
- **Decision records** have verified hash chain (integrity_hash, previous_hash, sequence_number)
- **Anthropic API credits:** FUNDED
- **Remaining sprints:** 3 (MCP + visual rule builder), 4 (on-chain export + investor detail + OpenAPI), 5 (polish + deploy + demo)
- **Deadline:** April 16, 2026 (AIFMD 2.0 transposition)

---

## Sprint 2 Scope — What to Build

This sprint delivers the full AI-powered regulatory intelligence stack: RAG pipeline for regulatory document search, live NL rule compiler integration, and a compliance copilot chat interface.

---

## PROMPT 2A — RAG Pipeline + NL Compiler Live

### Context

You are working on Caelith, a regulatory compliance engine for tokenized fund securities. The codebase uses Node.js + Express (TypeScript) backend, Next.js (React/TypeScript) frontend, and PostgreSQL. Sprint 0 and Sprint 1 are complete. You are now building Sprint 2A: the RAG pipeline for regulatory document ingestion and querying, plus making the NL rule compiler work with real API calls.

### Current State

- 17 migrations applied, 96 tests passing, `npm run build` clean
- Table `regulatory_documents` already exists from migration 015 — verify it has a vector column or add one via new migration
- `nl-rule-compiler.ts` exists at `src/backend/services/nl-rule-compiler.ts` — code-complete but untested with live API
- All tables have `tenant_id` columns (Sprint 1)
- Decision records have hash chain via `integrity-service.ts` (Sprint 1)

### pgvector Setup

Before any code runs:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

If `regulatory_documents` lacks an embedding vector column, create migration 018:
```sql
ALTER TABLE regulatory_documents
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS article_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_regulatory_docs_embedding
  ON regulatory_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Files to Create

#### `src/backend/services/embedding-service.ts` — CREATE

Wrapper around embedding API. Must support both providers via `.env` config:
- `EMBEDDING_PROVIDER=openai` → use `text-embedding-3-small` (1536 dimensions)
- `EMBEDDING_PROVIDER=anthropic` → use `voyage-3` (1024 dimensions)

```typescript
export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}
```

Use `fetch()` directly to call the API (no SDK dependency needed). Include rate limit retry logic with exponential backoff (max 3 retries). Read `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` from `process.env`.

#### `src/backend/services/rag-service.ts` — CREATE

Three main functions:

**`ingestDocument(pdfBuffer: Buffer, metadata: DocumentMetadata): Promise<IngestResult>`**
1. Extract text from PDF using `pdf-parse` (install: `npm install pdf-parse`)
2. Chunk by article/section headers using regex: `/Art(?:icle)?\s*\d+/i`, `/Section\s*\d+/i`, `/Chapter\s*\d+/i`
3. Fallback: chunk by paragraph with ~500 token windows, 50 token overlap
4. For each chunk: call `embeddingService.embed(chunkText)`
5. Store in `regulatory_documents` with: `content`, `embedding`, `document_title`, `jurisdiction`, `framework`, `article_ref`, `chunk_index`, `metadata`, `tenant_id`
6. Return `{ documentId, chunksCreated, totalTokensEstimated }`

**`query(question: string, filters?: QueryFilters): Promise<RagResult[]>`**
1. Embed the question
2. Cosine similarity search against `regulatory_documents`:
   ```sql
   SELECT id, document_title, article_ref, content, jurisdiction, framework,
          1 - (embedding <=> $1::vector) AS similarity
   FROM regulatory_documents
   WHERE tenant_id = $2
   ORDER BY embedding <=> $1::vector
   LIMIT $3
   ```
3. Filter by `similarity > 0.5` (configurable threshold)
4. Return top-K results (default K=5) with citations: `{ content, documentTitle, articleRef, jurisdiction, similarity }`
5. Optional filters: `jurisdiction`, `framework`, `documentTitle`

**`suggestRules(fundStructureId: string): Promise<RuleSuggestion[]>`**
1. Look up fund structure (type + jurisdiction)
2. Query RAG for applicable regulations
3. Parse chunks for eligibility criteria references
4. Return structured suggestions with regulatory citations

#### `src/backend/routes/regulatory-routes.ts` — CREATE

```typescript
// POST /api/regulatory/ingest — admin only
// Accepts multipart/form-data with PDF file + metadata JSON
// Calls ragService.ingestDocument()
// Returns { documentId, chunksCreated }

// POST /api/regulatory/query
// Body: { question: string, filters?: { jurisdiction?, framework? }, topK?: number }
// Calls ragService.query()
// Returns { results: RagResult[], query: string }

// POST /api/regulatory/suggest-rules
// Body: { fundStructureId: string }
// Calls ragService.suggestRules()
// Returns { suggestions: RuleSuggestion[] }
```

Follow existing route handler pattern: `async (req: Request, res: Response): Promise<void>` with `res.status().json(); return;`

Error pattern: `err: unknown` + `instanceof Error`. Codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`.

#### `src/backend/server.ts` — MODIFY

Mount regulatory routes:
```typescript
import { createRegulatoryRoutes } from './routes/regulatory-routes';
// ...
app.use('/api/regulatory', authenticateToken, createRegulatoryRoutes());
```

#### `scripts/ingest-regulations.ts` — CREATE

CLI script to bulk-ingest the 6 regulatory PDFs. These PDFs are available at `/mnt/project/` during development:

| File | Document Title | Jurisdiction | Framework | Est. Chunks |
|------|---------------|-------------|-----------|-------------|
| `CELEX_32011L0061_EN_TXT.pdf` | AIFMD Directive 2011/61/EU | EU | AIFMD | ~120 |
| `CELEX_32023R0606_EN_TXT.pdf` | ELTIF 2.0 Regulation (EU) 2023/606 | EU | ELTIF | ~80 |
| `cssf15_633eng.pdf` | CSSF Circular 15/633 | LU | AIFMD | ~40 |
| `cssf18_698eng.pdf` | CSSF Circular 18/698 | LU | AIFMD | ~30 |
| `L_230716_RAIF_eng.pdf` | RAIF Law 23 Jul 2016 | LU | AIFMD | ~50 |
| `CBI_AIFMD_QA.pdf` | CBI AIFMD Q&A | IE | AIFMD | ~60 |

The script should:
1. Read each PDF from disk
2. Call `ragService.ingestDocument()` for each
3. Log progress: `[1/6] Ingesting AIFMD Directive... 120 chunks created`
4. Be idempotent: check if document already ingested (by title), skip if yes

**⚠️ Important:** CSSF Circular 15/633 is about financial reporting, NOT investor eligibility. Include it in the corpus but note this in metadata.

### NL Compiler Live Integration

**`src/backend/services/nl-rule-compiler.ts` — MODIFY**

The file exists and is code-complete. Add:
1. **Error handling for API failures:** Rate limit detection (429 status), retry with exponential backoff (max 3 attempts), timeout handling (30s)
2. **Input validation:** Max prompt length (500 chars), sanitize input
3. **Response validation:** Verify the generated rule JSON matches expected schema before returning
4. **Logging:** Log each compilation attempt as an event (`event_type: 'nl_compiler.attempt'`)

**`src/frontend/src/app/rules/page.tsx` (or appropriate rules page) — MODIFY**

Add a "Create Rule from English" button that:
1. Opens a modal with a text input
2. User types natural language (e.g., "Block retail investors from SIF funds")
3. Calls `POST /api/nl-rules/from-natural-language` with `{ prompt, asset_id }`
4. Shows the generated rule JSON with confidence score
5. "Apply" button saves the rule via existing rules API
6. Loading state + error handling for API timeouts

### Constraints

- Route handler pattern: `async (req, res): Promise<void>` with `res.status().json(); return;`
- Error pattern: `err: unknown` + `instanceof Error`
- All new entities must include `tenant_id` (use `DEFAULT_TENANT_ID` from `db.ts`)
- PostgreSQL: Use `$1, $2` placeholders (auto-converted by db.ts)
- Design tokens: `brand-*`, `ink-*`, `edge-*`, `surface-*` — no raw Tailwind colors
- Font: DM Sans (body) + JetBrains Mono (data/IDs)
- All 96 existing tests must still pass
- `npm run build` must compile cleanly

### Verification Commands

```bash
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

# 5. Existing tests still pass
npx vitest run

# 6. Build clean
npm run build
cd src/frontend && npm run build
```

---

## PROMPT 2B — Compliance Copilot

### Context

Sprint 2A (RAG pipeline + NL compiler) is now complete. Build the compliance copilot: an AI-powered chat interface for compliance officers to ask questions and get answers grounded in regulatory text.

### Files to Create

#### `src/backend/services/copilot-service.ts` — CREATE

Orchestrator service with intent classification via Anthropic API tool use.

**Intent classification (4 intents):**

| Intent | Trigger Phrases | Backend Call | Response Format |
|--------|----------------|-------------|-----------------|
| `explain_decision` | "Why was transfer X rejected?", "Explain decision..." | Fetch decision record → format checks + citations | Per-check breakdown with regulatory references |
| `regulatory_qa` | "What does AIFMD say about...", "What are the requirements for..." | `ragService.query()` | RAG chunks with source citations |
| `draft_rule` | "Create a rule that blocks...", "Make a rule for..." | `POST /api/nl-rules/from-natural-language` | Proposed rule JSON + confidence + explanation |
| `what_if` | "What if we changed minimum to...", "What would happen if..." | Impact analysis against investor base | Summary: N investors affected, N transfers would be blocked |

**Implementation:**

```typescript
export interface CopilotRequest {
  message: string;
  context?: {
    currentPage?: string;
    selectedEntityId?: string;
    selectedEntityType?: string;
  };
}

export interface CopilotResponse {
  message: string;
  intent: string;
  citations?: Citation[];
  suggestedActions?: SuggestedAction[];
}

export async function chat(request: CopilotRequest, tenantId: string): Promise<CopilotResponse> {
  // 1. Classify intent using Anthropic API with tool_use
  //    System prompt: "You are a compliance copilot. Classify the user's intent..."
  //    Tools: explain_decision, regulatory_qa, draft_rule, what_if
  // 2. Route to appropriate service based on classified intent
  // 3. Format response with citations
  // 4. Log interaction as event (event_type: 'copilot.query')
  // 5. Return formatted response
}
```

For `explain_decision`:
- Extract decision ID from user message (regex or NLP)
- Fetch decision record from `decision-record-repository`
- Parse `result_details` → format each check with pass/fail + regulatory reference
- If no specific ID mentioned, fetch most recent decisions and summarize

For `regulatory_qa`:
- Pass user question to `ragService.query()`
- Use Anthropic API to synthesize a natural language answer from retrieved chunks
- Include citations: `[Source: {documentTitle}, {articleRef}]`

For `draft_rule`:
- Extract the rule intent from user message
- Call NL compiler service
- Format the result: show proposed rule conditions, confidence score, suggested next steps

For `what_if`:
- Parse changed parameter from user message
- Query affected investors from DB
- Simulate impact: how many investors would fail eligibility, how many transfers would be blocked
- Return summary with specific numbers

**Rate limiting:** Max 20 copilot queries per user per hour. Track via events table.

#### `src/backend/routes/copilot-routes.ts` — CREATE

```typescript
// POST /api/copilot/chat
// Body: { message: string, context?: { currentPage?, selectedEntityId?, selectedEntityType? } }
// Calls copilotService.chat()
// Returns CopilotResponse
// Logs event: { event_type: 'copilot.query', payload: { intent, message_length, response_length } }
```

#### `src/backend/server.ts` — MODIFY

Mount copilot routes:
```typescript
import { createCopilotRoutes } from './routes/copilot-routes';
// ...
app.use('/api/copilot', authenticateToken, createCopilotRoutes());
```

#### `src/frontend/src/components/copilot.tsx` — CREATE

Slide-out panel component:
- Position: right side, 400px wide, slides in from right edge
- Toggle: floating button at bottom-right of screen (chat bubble icon)
- Header: "Compliance Copilot" + close button
- Body: scrollable message list (user messages right-aligned, copilot left-aligned)
- Footer: text input + send button
- Messages render markdown (use existing markdown rendering if available)
- Citations render as clickable chips below the answer
- Loading state: typing indicator while waiting for API response
- Error state: "Something went wrong" with retry button

**Design requirements:**
- Use design tokens: `brand-*`, `ink-*`, `edge-*`, `surface-*`
- Font: DM Sans for chat text, JetBrains Mono for code/IDs in responses
- Smooth slide-in animation (300ms ease-in-out)
- Z-index above all other content but below modals
- Responsive: on mobile (<768px), full-width overlay

**Suggested prompts** (shown when chat is empty):
- "What are the SIF investor requirements?"
- "Why was the last transfer rejected?"
- "Create a rule to block retail investors"
- "What if minimum investment changed to €200K?"

#### `src/frontend/src/app/layout.tsx` — MODIFY

Add copilot toggle button (floating, bottom-right). Manage copilot open/close state.

#### `src/frontend/src/components/sidebar.tsx` — MODIFY

Add copilot icon in sidebar footer area.

### Constraints

- Same constraints as Prompt 2A (route patterns, error patterns, tenant_id, design tokens)
- Copilot interactions MUST be logged as events (`event_type: 'copilot.query'`)
- All Anthropic API calls must have timeout (30s) and error handling
- Never expose raw API errors to frontend — always return user-friendly messages
- Copilot must work even if RAG corpus is empty (graceful fallback: "No regulatory documents have been ingested yet")

### Verification Commands

```bash
# 1. Test copilot — regulatory Q&A
curl -s -H "Authorization: Bearer <token>" \
  -X POST http://localhost:3001/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the minimum investment requirements for semi-professional investors in a SIF?"}' | jq .
# Expected: answer citing SIF Law Art. 2, €125K minimum

# 2. Test copilot — explain decision
curl -s -H "Authorization: Bearer <token>" \
  -X POST http://localhost:3001/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Why was the last transfer rejected?"}' | jq .

# 3. Test copilot — draft rule
curl -s -H "Authorization: Bearer <token>" \
  -X POST http://localhost:3001/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a rule that blocks investors with expired KYC from buying SIF Class A"}' | jq .

# 4. Test copilot — what-if
curl -s -H "Authorization: Bearer <token>" \
  -X POST http://localhost:3001/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What if we changed the minimum investment to €200K for SIF Alpha?"}' | jq .

# 5. Manual: open copilot panel → ask regulatory question → get cited answer
# 6. Manual: verify copilot events logged in events table

# 7. All tests pass
npx vitest run

# 8. Full build clean
npm run build
cd src/frontend && npm run build
```

---

## Sprint 2 Completion

### Gate Criteria

- [ ] pgvector enabled, regulatory_documents has embedding column
- [ ] 6 PDFs ingested (~380 chunks total)
- [ ] RAG query for "SIF investor requirements" returns correct chunks with Art. 2 citation
- [ ] NL compiler generates valid rules from natural language with live Anthropic API
- [ ] NL compiler has error handling for rate limits and API failures
- [ ] Frontend has "Create Rule from English" button that works end-to-end
- [ ] Copilot panel opens/closes with smooth animation
- [ ] Copilot handles all 4 intents: explain decision, regulatory Q&A, draft rule, what-if
- [ ] Copilot responses include citations from regulatory documents
- [ ] All copilot interactions logged as events
- [ ] All 96+ existing tests pass
- [ ] `npm run build` compiles cleanly
- [ ] Frontend build compiles cleanly

### Git

```bash
git add .
git commit -m "feat: sprint 2 — RAG pipeline + NL compiler live + compliance copilot"
git tag sprint-2-ai-layer
git push && git push --tags
```

### What's Next (Sprint 3)

MCP server (7 tools for Claude Desktop integration) + visual rule builder (drag-and-drop composite rule creation). See `PILOT_EXECUTION_PLAN.md` Sprint 3 section.

---

## Reference — Seed Data (for testing copilot)

| Entity | Details |
|--------|---------|
| **Tenant** | Caelith Demo (ID: ...0099) |
| **Fund Structures** | Luxembourg SIF Alpha (ID: ...0001), Luxembourg RAIF Beta (ID: ...0002) |
| **Eligibility Criteria** | 6 records: professional/semi_pro/institutional × SIF/RAIF |
| **Assets** | SIF Class A (1M units @€1), SIF Class B (500K @€10), RAIF Class A (2M @€1) |
| **Rules** | 3 permissive rule sets (one per asset) |
| **Investors** | Marie Laurent (FR, professional), Klaus Schmidt (DE, semi_pro, KYC expires 2026-05-15), Acme Capital (LU, institutional) |
| **Holdings** | Marie: 200K SIF-A, Klaus: 150K SIF-A, Acme: 400K SIF-A + 500K RAIF-A |
| **Decision Records** | 3 sealed records with verified hash chain |

**Risk flag triggers:** Acme at 40% concentration in SIF-A (>25% threshold), Klaus KYC expiring within ~90 days.

## Reference — Regulatory Sources

| Fund Type | Source | Key Rule |
|-----------|--------|----------|
| Luxembourg SIF | SIF Law 13 Feb 2007, Art. 2 | Well-informed investors only; €125K minimum for semi-professional |
| Luxembourg RAIF | RAIF Law 23 Jul 2016, Art. 3 | Same as SIF (mirrors SIF investor requirements) |
| ELTIF 2.0 | Regulation (EU) 2023/606 | €0 minimum for retail (old €10K minimum removed) |

**⚠️ DO NOT use** "CSSF Circular 15/633" as source for SIF eligibility — that circular is about financial reporting, not investor eligibility.

## Reference — DB Column Conventions

- **Money:** stored as integer cents. €125,000 = `12500000`.
- **decision_records.decided_by:** UUID FK to users table. For automated checks, use `NULL`.
- **tenant_id:** Every new row must include `tenant_id`. Use `DEFAULT_TENANT_ID` from `db.ts`.
- **New decision records** must call `sealRecord()` from `integrity-service.ts`.
