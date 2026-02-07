# BUILD_PLAN.md

## Build Plan - MVP Delivery

### Phases

| Phase | Scope | Deliverable | Duration |
|-------|-------|-------------|----------|
| 1 | Database + Models | Working schema + migrations | 1 day |
| 2 | Rules Engine | Testable validation logic | 1 day |
| 3 | Backend API | REST endpoints + integration | 2 days |
| 4 | Frontend UI | Basic CRUD + transfer form | 2 days |
| 5 | Integration Testing | End-to-end workflows | 1 day |

**Total: 7 days**

---

## Phase 1: Database + Models

### Tasks
- [ ] Set up PostgreSQL container
- [ ] Define schema (see DATA_MODEL.md)
- [ ] Create migration scripts
- [ ] Implement repository layer
- [ ] Write repository unit tests

### Deliverables
- `migrations/001_initial_schema.sql`
- `src/backend/repositories/*.ts`
- `src/backend/models/*.ts`
- Repository tests

### Validation
- [ ] Can create asset
- [ ] Can create investor
- [ ] Can record holding
- [ ] Can log event
- [ ] All foreign keys enforced

---

## Phase 2: Rules Engine

### Tasks
- [ ] Define TypeScript interfaces for rules
- [ ] Implement validation functions
- [ ] Write validation unit tests (100% coverage target)
- [ ] Document validation logic

### Deliverables
- `src/rules-engine/types.ts`
- `src/rules-engine/validator.ts`
- `src/rules-engine/validator.test.ts`
- Test fixture data

### Test Cases
- [ ] Qualification check (pass/fail)
- [ ] Lockup check (before/after)
- [ ] Jurisdiction whitelist (allowed/blocked)
- [ ] Transfer whitelist (unrestricted/restricted)
- [ ] Multiple violation aggregation
- [ ] Edge cases (zero units, self-transfer)

### Validation
- [ ] All tests pass
- [ ] Deterministic (same input → same output)
- [ ] No database dependencies

---

## Phase 3: Backend API

### Tasks
- [ ] Set up Express server
- [ ] Implement service layer
- [ ] Implement API routes
- [ ] Add request validation middleware
- [ ] Error handling
- [ ] Integration tests

### Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | /assets | Create asset |
| GET | /assets/:id | Get asset details |
| POST | /investors | Create investor |
| GET | /investors | List investors |
| PATCH | /investors/:id | Update investor |
| POST | /holdings | Allocate units |
| GET | /holdings?assetId=X | Cap table |
| POST | /rules | Create/update rules |
| GET | /rules/:assetId | Get active rules |
| POST | /transfers/simulate | Validate transfer |
| POST | /transfers | Execute transfer |
| GET | /transfers?assetId=X | Transfer history |
| GET | /events | Audit trail |

### Deliverables
- `src/backend/server.ts`
- `src/backend/routes/*.ts`
- `src/backend/services/*.ts`
- `src/backend/middleware/*.ts`
- API integration tests

### Validation
- [ ] All endpoints respond correctly
- [ ] Validation errors return 400
- [ ] Business logic errors return 422
- [ ] Successful operations return 200/201
- [ ] Events logged for all mutations

---

## Phase 4: Frontend UI

### Tasks
- [ ] Set up React project
- [ ] Create layout components
- [ ] Implement asset creation form
- [ ] Implement investor management
- [ ] Implement transfer form
- [ ] Implement cap table view
- [ ] Implement transfer history view
- [ ] Add validation result display

### Pages

| Page | Components | Features |
|------|-----------|----------|
| Assets | AssetForm, AssetList | Create, view |
| Investors | InvestorForm, InvestorTable | Create, edit, list |
| Holdings | HoldingForm, CapTable | Allocate, view ownership |
| Rules | RuleForm | Configure, view |
| Transfers | TransferForm, TransferList, ValidationResult | Simulate, execute, history |
| Audit | EventLog | View events |

### Deliverables
- `src/frontend/src/pages/*.tsx`
- `src/frontend/src/components/*.tsx`
- Basic CSS styling

### Validation
- [ ] Can complete full workflow via UI
- [ ] Validation errors displayed clearly
- [ ] Forms validate input client-side
- [ ] Loading states shown
- [ ] Success/error messages

---

## Phase 5: Integration Testing

### Tasks
- [ ] Write end-to-end test scenarios
- [ ] Test full workflows
- [ ] Document test data setup
- [ ] Fix integration bugs
- [ ] Performance baseline

### Test Scenarios
1. **Happy Path**
   - Create asset
   - Register 5 investors
   - Allocate units
   - Configure rules
   - Execute valid transfers
   - Verify cap table

2. **Validation Failures**
   - Non-qualified investor transfer
   - Lockup violation
   - Jurisdiction blocked
   - Transfer whitelist violation

3. **Audit Trail**
   - Execute operations
   - Verify all events logged
   - Verify event ordering

### Deliverables
- `tests/e2e/*.test.ts`
- Test data fixtures
- Performance baseline report

### Validation
- [ ] All scenarios pass
- [ ] Transfer validation < 100ms
- [ ] Cap table query < 50ms
- [ ] Event log complete

---

## Phase 6: Documentation & Deployment (Bonus)

### Tasks
- [ ] Write README.md
- [ ] Document API endpoints (OpenAPI)
- [ ] Create Docker Compose file
- [ ] Deployment instructions
- [ ] Sample data script

### Deliverables
- `README.md`
- `docker-compose.yml`
- `openapi.yml`
- `scripts/seed-data.ts`

---

## Definition of Done

### MVP Complete When:
- [ ] All 5 phases delivered
- [ ] All validation criteria met
- [ ] Test coverage > 80%
- [ ] No critical bugs
- [ ] Documentation current
- [ ] Demo script works