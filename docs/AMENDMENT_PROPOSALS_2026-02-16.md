# Amendment Proposals — Post-Implementation Critical Review

**Date:** 2026-02-16
**Author:** Engineering Review (Board Directive)
**Status:** Approved for Implementation
**Scope:** Data onboarding, UX, security, observability, trust layer

---

## Executive Summary

Following the implementation of the 90-day "Proof and Trust" masterplan (10 items across P0-P2), a critical review identified structural gaps in the data onboarding experience, security assumptions, and UX completeness. The most significant finding is that the bulk import system assumes a greenfield scenario where users manually enter data, whereas real-world fund administrators arrive with existing investor registers in Excel/CSV format.

This document defines 10 prioritized amendments with full technical specifications.

---

## Industry Context

### How Alternative Fund Platforms Handle Data Onboarding

| Platform | Primary Import | Secondary | API |
|---|---|---|---|
| eFront (BlackRock) | Excel/CSV bulk loads | SOAP/REST API | REST (v2) |
| FIS Investran | Excel templates | SWIFT accredited | REST API |
| SS&C Geneva | Agreed-format trade files | RSL queries | REST + SOAP |
| Allvue Systems | Deep Excel integration | Outlook workflow | Azure-native |
| Apex Group (Tocan) | Digital onboarding SaaS | Excel bulk loads | REST API |

**Key insight:** The industry is overwhelmingly Excel/CSV-first for initial data loads. API integrations are used for ongoing synchronization, not day-one onboarding.

### What Fund Administrators Expect on Day One

1. Upload their existing Excel investor register and have it mapped into the system
2. See compliance status immediately after import (KYC expiry, restricted jurisdictions)
3. Download pre-built templates to prepare data offline
4. Export to Excel for board/investor reporting (non-negotiable)
5. Full audit trail from the moment of first import

### Regulatory Format Requirements

- **AIFMD Annex IV:** ESMA mandates XML format for all reports from June 30, 2026
- **ILPA Templates:** Institutional Limited Partners Association provides standardized Excel-based reporting templates (v2.0, Q1 2026 implementation)
- **CSSF Technical Guidance:** 95-page field definition document defining mandatory (M), conditional (C), and optional (O) fields

---

## P0 — Must Do Before Any Demo

### P0.1: CSV/Excel Upload with Column Mapping

**Problem:** The current bulk import only accepts a JSON payload via `POST /api/import/bulk`. Real users have investor registers in Excel/CSV format. The setup wizard requires manual data entry per investor, which is unusable for any fund with more than ~5 investors.

**Solution:** Add server-side CSV parsing with a two-phase upload flow:

#### Backend Changes

**New endpoint: `POST /api/import/parse-csv`**
- Accepts `multipart/form-data` with a single CSV file + `entityType` field
- Uses `multer` (already in dependencies) for file handling with memory storage (no disk writes)
- Parses CSV using built-in string splitting (no new dependencies needed)
- Returns parsed column headers + first 5 preview rows + total row count
- File size limit: 5MB (configurable)

```typescript
// Request: multipart/form-data
// - file: CSV file
// - entityType: 'investors' | 'fund_structures' | 'holdings'

// Response:
interface CsvParseResult {
  columns: string[];           // Detected CSV column headers
  preview: string[][];         // First 5 rows of data
  totalRows: number;           // Total rows (excluding header)
  suggestedMapping: Record<string, string>; // Auto-mapped columns
}
```

**New endpoint: `POST /api/import/csv`**
- Accepts `multipart/form-data` with CSV file + JSON `columnMapping` + `entityType`
- Applies column mapping to transform CSV rows into domain objects
- Feeds transformed data into the existing `executeBulkImport()` pipeline
- Returns the same `BulkImportResult` response

```typescript
// Request: multipart/form-data
// - file: CSV file
// - entityType: 'investors' | 'fund_structures' | 'holdings'
// - columnMapping: JSON string of { csvColumn: schemaField }

// Response: BulkImportResult (same as POST /api/import/bulk)
```

**Auto-mapping logic:**
- Fuzzy matching of CSV headers to schema fields
- Exact match (case-insensitive): `"Name"` -> `name`, `"Jurisdiction"` -> `jurisdiction`
- Common synonyms: `"Country"` -> `jurisdiction`, `"Type"` -> `investor_type`, `"KYC Status"` -> `kyc_status`
- Underscore/space normalization: `"Investor Type"` -> `investor_type`

#### Frontend Changes

**New component: `CsvUploadWizard`**
- Integrated into the setup wizard as the primary onboarding path
- 4 steps: Upload -> Map Columns -> Preview & Validate -> Import
- Drag-and-drop file zone with click fallback
- Auto-detect column mapping with manual override
- Validation preview with inline error highlighting (red rows for invalid data)
- Row count and entity count display

**Modified: `SetupWizard`**
- Welcome screen adds two paths: "Import from Spreadsheet" (primary) and "Create Manually" (secondary)
- "Download Template" button on welcome screen

#### Technical Constraints
- `multer` already in `package.json` — no new backend dependency
- Frontend CSV preview uses client-side parsing for instant feedback
- Server-side re-parse for security (never trust client-parsed data)
- Maximum 5,000 rows per file (consistent with existing `POST /api/import/bulk` limit)

---

### P0.2: Downloadable Import Templates

**Problem:** Users don't know what columns to include in their CSV. They need a reference template.

**Solution:** Serve pre-built CSV template files with correct headers, example data, and inline field documentation.

#### Templates to Create

**1. `investors-template.csv`**
```
name,jurisdiction,investor_type,accredited,kyc_status,kyc_expiry,tax_id,lei,email
"Example Corp GmbH",DE,professional,true,verified,2027-01-15,DE123456789,5493001KJTIIGC8Y1R12,compliance@example.com
```

**2. `fund-structures-template.csv`**
```
name,legal_form,domicile,regulatory_framework,aifm_name,currency,target_size,total_units,status
"Luxembourg Growth Fund I",SIF,LU,AIFMD,"Example AIFM S.A.",EUR,50000000,10000,active
```

**3. `holdings-template.csv`**
```
investor_name,asset_name,units,acquired_at
"Example Corp GmbH","Luxembourg Growth Fund I — Share Class A",500,2025-06-15
```

#### Backend
- `GET /api/import/templates/:entityType` — returns CSV template file as `text/csv` download
- No authentication required (templates contain only example data)

#### Frontend
- "Download Template" buttons on wizard welcome screen and CSV upload step

---

### P0.3: Fix Bulk Import Tenant Context

**Problem:** `import-service.ts` uses `DEFAULT_TENANT_ID` for all imported entities instead of the authenticated user's tenant. This breaks multi-tenant isolation.

**Solution:**

```typescript
// Before (insecure):
export async function executeBulkImport(payload: BulkImportPayload): Promise<BulkImportResult>

// After (tenant-aware):
export async function executeBulkImport(
  payload: BulkImportPayload,
  tenantId: string,
  userId: string,
): Promise<BulkImportResult>
```

- Pass `req.user.tenantId` and `req.user.id` from the route handler
- Replace all `DEFAULT_TENANT_ID` references with the `tenantId` parameter
- Include `userId` in audit event payload

---

## P1 — Should Do Before Pilot

### P1.1: Partial Success Mode for Imports

**Problem:** The current import is all-or-nothing. If 1 out of 200 investors has a validation error, the entire import fails. Real-world data is always messy.

**Solution:** Add a `mode` parameter to the import endpoints:

```typescript
interface BulkImportPayload {
  // ... existing fields ...
  mode?: 'strict' | 'best_effort';  // default: 'strict'
}

interface BulkImportResult {
  // ... existing fields ...
  errors?: ImportRowError[];   // Only present in best_effort mode
  skipped: number;             // Number of rows skipped due to errors
}

interface ImportRowError {
  entityType: string;
  index: number;
  ref?: string;
  errors: string[];
}
```

**Behavior:**
- `strict` (default): Current all-or-nothing behavior. Any validation error rolls back everything.
- `best_effort`: Valid rows are imported, invalid rows are collected into the `errors` array. Each invalid row includes the specific validation errors so the user can fix and re-import.

**Implementation:**
- In `best_effort` mode, wrap each entity insert in a SAVEPOINT
- On validation failure for a single entity, ROLLBACK TO SAVEPOINT and add to error list
- Continue processing remaining entities
- COMMIT the transaction with all valid entities

---

### P1.2: Deduplication Detection

**Problem:** Uploading the same CSV twice creates duplicate entities. No protection against accidental re-import.

**Solution:** Before inserting each entity, check for potential duplicates:

**Investor deduplication key:** `(name, jurisdiction)` — case-insensitive match
**Fund structure deduplication key:** `(name, legal_form, domicile)` — case-insensitive match

```typescript
interface BulkImportResult {
  // ... existing fields ...
  warnings?: ImportWarning[];
}

interface ImportWarning {
  entityType: string;
  index: number;
  message: string;  // e.g., "Investor 'Example Corp' (DE) already exists (id: abc-123)"
  existingId: string;
  action: 'created' | 'skipped';  // In strict mode: error. In best_effort: skipped.
}
```

**Behavior:**
- In `strict` mode: Duplicates generate a validation error (import fails)
- In `best_effort` mode: Duplicates are skipped with a warning; existing entity IDs are used for cross-references (e.g., holdings referencing an existing investor)

---

### P1.3: Persistent Onboarding Checklist

**Problem:** After the setup wizard, users who click "Skip for now" see an empty dashboard with no guidance. Users who complete the wizard don't know what to do next.

**Solution:** A persistent checklist component shown on the dashboard until all steps are complete.

**Checklist items:**
1. Create your first fund structure (completed if any fund exists)
2. Import your investor register (completed if any investor exists)
3. Configure eligibility rules (completed if any eligibility criteria exist for any fund)
4. Run your first compliance check (completed if any decision record exists)

**Implementation:**
- New component: `OnboardingChecklist`
- Queries existing data to determine completion state
- Dismissable (stored in `localStorage`)
- Renders between the metric cards and analytics sections on the dashboard

---

### P1.4: Landing Page Countdown Guard

**Problem:** The countdown to April 16, 2026 will show "0 days" on deadline day and negative numbers after.

**Solution:**
```javascript
const days = Math.max(0, Math.ceil((deadline - now) / 86400000));
if (days > 0) {
  element.textContent = `${days} days`;
} else if (days === 0) {
  element.textContent = 'Today';
} else {
  element.textContent = 'In effect';
}
```

Also update surrounding copy:
- Before deadline: "AIFMD II transposition deadline in **X days**"
- On deadline: "AIFMD II transposition deadline is **today**"
- After deadline: "AIFMD II is **in effect**"

---

## P2 — Nice to Have

### P2.1: Copilot Feedback Mechanism

**Problem:** No signal on AI response quality. No evidence that users reviewed AI output (relevant for audit).

**Solution:** Add thumbs-up/thumbs-down buttons on each assistant message in the copilot panel.

**Frontend:**
- Two small icon buttons below each assistant message
- On click, fire `POST /api/copilot/feedback` with `{ messageId, rating: 'positive' | 'negative', comment?: string }`
- Visual confirmation (button highlights)

**Backend:**
- New table: `copilot_feedback (id, message_id, rating, comment, user_id, created_at)`
- New endpoint: `POST /api/copilot/feedback`
- Logged as an audit event

---

### P2.2: Evidence Bundle Download Error Handling

**Problem:** The "Download Evidence Bundle" button in `decisions/page.tsx` silently fails (`catch {}`) if the PDF endpoint is unavailable. User clicks and nothing happens.

**Solution:**
- Add a toast/notification component for transient feedback
- On download failure, show: "Evidence bundle download failed. The PDF export service may be unavailable."
- Use the existing `Alert` component in a temporary overlay pattern

---

## Implementation Order

```
Phase 1 (P0): Critical path — blocks demo readiness
  P0.3  Fix tenant context          ~30 min   (security fix, do first)
  P0.2  Import templates            ~1 hour   (simple, unblocks P0.1 UX)
  P0.1  CSV upload + mapping        ~3 hours  (backend + frontend, largest item)

Phase 2 (P1): Pilot readiness
  P1.4  Countdown guard             ~15 min   (trivial fix)
  P1.1  Partial success mode        ~2 hours  (backend SAVEPOINT logic)
  P1.2  Deduplication detection     ~1.5 hours (query-before-insert pattern)
  P1.3  Onboarding checklist        ~1.5 hours (frontend component + API queries)

Phase 3 (P2): Polish
  P2.2  Evidence bundle errors      ~30 min   (error handling)
  P2.1  Copilot feedback            ~2 hours  (new table + endpoint + UI)
```

---

## Files Affected

### New Files
- `src/backend/services/csv-import-service.ts` — CSV parsing, column mapping, auto-detection
- `src/backend/routes/import-routes.ts` — Extended with CSV endpoints + template downloads
- `src/frontend/src/components/csv-upload-wizard.tsx` — File upload + column mapping UI

### Modified Files
- `src/backend/services/import-service.ts` — Tenant parameter, partial success mode, deduplication
- `src/frontend/src/components/setup-wizard.tsx` — CSV upload integration, template downloads
- `src/frontend/src/app/page.tsx` — Onboarding checklist
- `src/frontend/src/lib/api.ts` — CSV upload methods, copilot feedback
- `src/frontend/src/lib/types.ts` — New interfaces
- `src/frontend/src/components/copilot.tsx` — Feedback buttons
- `src/frontend/src/app/decisions/page.tsx` — Error handling on evidence download
- `landing/index.html` — Countdown guard

---

## Success Criteria

1. **CSV Upload:** A compliance officer can drag-drop their existing Excel export (saved as CSV), map columns in <30 seconds, preview the data, and import 200+ investors in a single operation
2. **Template Download:** Templates are downloadable without authentication and include all valid enum values as documentation
3. **Tenant Isolation:** All imported entities are scoped to the authenticated user's tenant
4. **Partial Success:** In best-effort mode, 198/200 valid rows import successfully while 2 invalid rows produce actionable error messages
5. **Deduplication:** Re-importing the same CSV produces warnings, not duplicate entities
6. **Onboarding Guidance:** A new user sees a clear 4-step checklist guiding them from first login to first compliance run
