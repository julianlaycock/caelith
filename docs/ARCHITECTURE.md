# ARCHITECTURE.md

## System Architecture

### Architecture Pattern
**Monolithic service** with clean layer separation

### Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Backend | Node.js + TypeScript | Type safety, fast iteration |
| API | Express.js | Simple, well-understood |
| Database | PostgreSQL | ACID compliance, JSON support |
| Rules Engine | Custom TypeScript module | Full control, testable |
| Frontend | React + TypeScript | Component reuse, type safety |
| Deployment | Docker Compose | Local-first, reproducible |

### System Components
```
┌─────────────────────────────────────────────────┐
│                  Frontend (React)                │
│         Asset UI │ Investor UI │ Transfer UI     │
└─────────────────────┬───────────────────────────┘
                      │ HTTP/JSON
┌─────────────────────▼───────────────────────────┐
│              API Layer (Express)                 │
│   /assets │ /investors │ /transfers │ /rules    │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              Business Logic Layer                │
│  AssetService │ InvestorService │ TransferService│
└─────┬─────────────────────────────┬─────────────┘
      │                             │
      │         ┌───────────────────▼─────────────┐
      │         │      Rules Engine                │
      │         │  - Load rules                    │
      │         │  - Execute validations           │
      │         │  - Return deterministic results  │
      │         └───────────────────┬─────────────┘
      │                             │
┌─────▼─────────────────────────────▼─────────────┐
│           Data Access Layer (Repositories)       │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              PostgreSQL Database                 │
│  assets │ investors │ holdings │ transfers       │
│  rules │ events                                  │
└─────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### Frontend Layer
- User input forms
- Data visualization (cap table, transfer history)
- Validation result display
- No business logic

#### API Layer
- Request validation (schema)
- Route handling
- Response formatting
- Error handling

#### Business Logic Layer
- Orchestrate operations
- Call rules engine
- Manage transactions
- Generate events

#### Rules Engine
- Load rule configuration
- Execute validation checks
- Return structured results
- Zero side effects (pure functions)

#### Data Access Layer
- Database queries
- Transaction management
- Type mapping
- No business logic

#### Database Layer
- Persistent storage
- Referential integrity
- Audit log

### Data Flow: Transfer Execution
```
1. User submits transfer → Frontend
2. POST /transfers → API Layer
3. TransferService.execute() → Business Logic
4. Load rules → Rules Engine
5. Validate transfer → Rules Engine
6. If valid:
   - Begin transaction
   - Insert transfer record
   - Update holdings
   - Log event
   - Commit transaction
7. Return result → API → Frontend
```

### Rules Engine Design
```typescript
interface RuleSet {
  qualification_required: boolean;
  lockup_days: number;
  jurisdiction_whitelist: string[];
  transfer_whitelist: string[] | null; // null = unrestricted
}

interface ValidationContext {
  transfer: TransferRequest;
  fromInvestor: Investor;
  toInvestor: Investor;
  fromHolding: Holding;
  rules: RuleSet;
}

interface ValidationResult {
  valid: boolean;
  violations: string[];
}

function validateTransfer(ctx: ValidationContext): ValidationResult
```

**Validation Chain:**
1. Check qualification (if required)
2. Check lockup period
3. Check jurisdiction whitelist
4. Check transfer whitelist
5. Aggregate violations

### Database Schema (High-Level)

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| assets | id, name, total_units | Asset definitions |
| investors | id, name, jurisdiction, accredited | Investor registry |
| holdings | investor_id, asset_id, units, acquired_at | Current ownership |
| transfers | from, to, asset_id, units, timestamp | Transfer history |
| rules | asset_id, version, config (JSON) | Rule configurations |
| events | timestamp, type, payload (JSON) | Audit trail |

### Security Considerations (MVP)
- Input validation at API boundary
- SQL injection prevention (parameterized queries)
- Transaction isolation
- No authentication (single local user)

### Scalability Considerations (Post-MVP)
- Horizontal scaling → extract rules engine as service
- Caching → Redis for rule sets
- Read replicas → PostgreSQL streaming replication