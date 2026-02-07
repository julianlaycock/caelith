# PRD.md

## Product: Private Asset Registry & Transfer Rules Engine (MVP)

### Overview
Simulation platform for managing private asset ownership records and validating transfers against programmable compliance rules.

### Core Value Proposition
Demonstrate how private assets can be managed with automated rule enforcement without blockchain infrastructure.

### Target User
- Fund administrators
- Compliance officers
- Private market operators
- Technical evaluators

### MVP Scope

#### In Scope
| Feature | Description |
|---------|-------------|
| Asset creation | Define private asset with metadata |
| Investor registry | Maintain investor profiles with attributes |
| Ownership ledger | Track unit allocations per investor |
| Rule definition | Configure transfer constraints |
| Transfer simulation | Test proposed transfers |
| Transfer validation | Enforce rules before execution |
| Audit trail | Immutable event log |
| Cap table view | Current ownership snapshot |

#### Explicitly Out of Scope
- Blockchain integration
- Wallet management
- Payment processing
- Token issuance
- Custodial services
- Securities regulation automation
- Multi-tenancy
- User authentication (single local user)

### Functional Requirements

#### FR-1: Asset Management
- Create asset with: name, total units, asset type
- View asset details
- Assets are immutable after creation

#### FR-2: Investor Registry
- Add investor with: name, jurisdiction, accreditation status
- Update investor attributes
- View investor list

#### FR-3: Ownership Records
- Initial allocation of units to investors
- View current holdings per investor
- View full cap table

#### FR-4: Rule Configuration
- Define rule set per asset with:
  - `qualification_required` (boolean)
  - `lockup_days` (integer)
  - `jurisdiction_whitelist` (string array)
  - `transfer_whitelist` (investor ID array or null for unrestricted)
- Update rules (versioned)
- View active rules

#### FR-5: Transfer Operations
- Simulate transfer: validate without executing
- Execute transfer: validate + record
- Transfer inputs: from, to, units, timestamp
- Validation checks all active rules
- Return validation result with pass/fail + reasons

#### FR-6: Audit Trail
- Log all events: asset creation, allocations, transfers, rule changes
- Events include: timestamp, type, actor, payload
- Read-only event log
- Query events by asset, investor, date range

#### FR-7: Reporting
- Cap table: investor → units
- Transfer history: chronological list
- Validation failures: rejected transfer attempts

### Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Performance | < 100ms validation response |
| Data integrity | ACID transactions |
| Determinism | Same inputs → same validation outcome |
| Testability | All validation logic unit-testable |
| Deployment | Single-machine Docker setup |

### Success Criteria
- [ ] Create asset with 1M units
- [ ] Register 10 investors
- [ ] Allocate units to 5 investors
- [ ] Define 4-rule constraint set
- [ ] Simulate 20 transfers (mix of valid/invalid)
- [ ] Execute 10 valid transfers
- [ ] View accurate cap table
- [ ] Export audit trail

### Future Considerations (Post-MVP)
- Multi-asset support
- Complex rule combinations (AND/OR logic)
- Role-based access control
- API authentication
- Event webhooks
- Advanced reporting