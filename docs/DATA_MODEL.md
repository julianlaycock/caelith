# DATA_MODEL.md

## Data Model Specification

### ER Diagram (Text)
```
ASSETS (1) ──< (M) HOLDINGS (M) >── (1) INVESTORS
  │                                      
  │                                      
  ▼                                      
RULES                                    
  │                                      
  │                                      
  ▼                                      
RULE_VERSIONS                            
  
TRANSFERS (M) ──> (1) ASSETS
          (M) ──> (1) INVESTORS (from)
          (M) ──> (1) INVESTORS (to)

EVENTS (append-only log)
```

---

## Tables

### assets
**Purpose:** Asset definitions (immutable after creation)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Asset name |
| asset_type | VARCHAR(100) | NOT NULL | e.g., "Fund", "LP Interest" |
| total_units | BIGINT | NOT NULL, > 0 | Total authorized units |
| created_at | TIMESTAMP | NOT NULL | Creation time |

**Indexes:**
- PRIMARY KEY (id)

---

### investors
**Purpose:** Investor registry with attributes for rule validation

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Investor name |
| jurisdiction | VARCHAR(100) | NOT NULL | Country/region code (ISO 3166) |
| accredited | BOOLEAN | NOT NULL | Accreditation status |
| created_at | TIMESTAMP | NOT NULL | Registration time |
| updated_at | TIMESTAMP | NOT NULL | Last update time |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (jurisdiction)

---

### holdings
**Purpose:** Current ownership positions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| investor_id | UUID | FK → investors.id | Owner |
| asset_id | UUID | FK → assets.id | Asset |
| units | BIGINT | NOT NULL, >= 0 | Units held |
| acquired_at | TIMESTAMP | NOT NULL | Initial acquisition time (for lockup) |
| created_at | TIMESTAMP | NOT NULL | Record creation |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Constraints:**
- UNIQUE (investor_id, asset_id)
- CHECK (units >= 0)

**Indexes:**
- PRIMARY KEY (id)
- INDEX (asset_id)
- INDEX (investor_id)

---

### rules
**Purpose:** Active rule configuration per asset

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| asset_id | UUID | FK → assets.id, UNIQUE | Asset (one active ruleset per asset) |
| version | INTEGER | NOT NULL | Version number (starts at 1) |
| qualification_required | BOOLEAN | NOT NULL | Must be accredited investor |
| lockup_days | INTEGER | NOT NULL, >= 0 | Days after acquisition before transfer |
| jurisdiction_whitelist | JSONB | NOT NULL | Array of allowed jurisdiction codes |
| transfer_whitelist | JSONB | NULL | Array of investor IDs or null (unrestricted) |
| created_at | TIMESTAMP | NOT NULL | Rule creation time |

**Constraints:**
- UNIQUE (asset_id)
- CHECK (lockup_days >= 0)

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (asset_id)

---

### transfers
**Purpose:** Transfer history (executed only)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| asset_id | UUID | FK → assets.id | Asset transferred |
| from_investor_id | UUID | FK → investors.id | Sender |
| to_investor_id | UUID | FK → investors.id | Receiver |
| units | BIGINT | NOT NULL, > 0 | Units transferred |
| executed_at | TIMESTAMP | NOT NULL | Transfer execution time |
| created_at | TIMESTAMP | NOT NULL | Record creation (for ordering) |

**Constraints:**
- CHECK (units > 0)
- CHECK (from_investor_id != to_investor_id)

**Indexes:**
- PRIMARY KEY (id)
- INDEX (asset_id, executed_at DESC)
- INDEX (from_investor_id)
- INDEX (to_investor_id)

---

### events
**Purpose:** Immutable audit trail

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| event_type | VARCHAR(100) | NOT NULL | Event category |
| entity_type | VARCHAR(100) | NOT NULL | Affected entity (asset, investor, etc.) |
| entity_id | UUID | NOT NULL | Affected entity ID |
| payload | JSONB | NOT NULL | Event data (schema varies by type) |
| timestamp | TIMESTAMP | NOT NULL | Event occurrence time |

**Event Types:**
- `asset.created`
- `investor.created`
- `investor.updated`
- `holding.allocated`
- `holding.updated`
- `rules.created`
- `rules.updated`
- `transfer.executed`
- `transfer.rejected`

**Indexes:**
- PRIMARY KEY (id)
- INDEX (timestamp DESC)
- INDEX (entity_type, entity_id)
- INDEX (event_type)

---

## Relationships

### Foreign Keys
- holdings.investor_id → investors.id (ON DELETE RESTRICT)
- holdings.asset_id → assets.id (ON DELETE RESTRICT)
- rules.asset_id → assets.id (ON DELETE RESTRICT)
- transfers.asset_id → assets.id (ON DELETE RESTRICT)
- transfers.from_investor_id → investors.id (ON DELETE RESTRICT)
- transfers.to_investor_id → investors.id (ON DELETE RESTRICT)

### Invariants
1. Sum of holdings.units for an asset <= assets.total_units
2. holdings.units cannot go negative
3. Transfer execution must update both sender and receiver holdings atomically
4. Every mutation logged in events table

---

## Query Patterns

### Cap Table (Current Ownership)
```sql
SELECT 
  i.name,
  h.units,
  (h.units::float / a.total_units * 100) as percentage
FROM holdings h
JOIN investors i ON h.investor_id = i.id
JOIN assets a ON h.asset_id = a.id
WHERE h.asset_id = :asset_id
  AND h.units > 0
ORDER BY h.units DESC;
```

### Transfer History
```sql
SELECT 
  t.executed_at,
  fi.name as from_name,
  ti.name as to_name,
  t.units
FROM transfers t
JOIN investors fi ON t.from_investor_id = fi.id
JOIN investors ti ON t.to_investor_id = ti.id
WHERE t.asset_id = :asset_id
ORDER BY t.executed_at DESC;
```

### Audit Trail
```sql
SELECT 
  timestamp,
  event_type,
  entity_type,
  payload
FROM events
WHERE entity_id = :entity_id
  OR (payload->>'asset_id' = :entity_id)
ORDER BY timestamp DESC;
```

### Validation Context Fetch
```sql
SELECT 
  r.*,
  h.units as from_units,
  h.acquired_at,
  fi.accredited as from_accredited,
  fi.jurisdiction as from_jurisdiction,
  ti.accredited as to_accredited,
  ti.jurisdiction as to_jurisdiction
FROM rules r
LEFT JOIN holdings h ON h.asset_id = r.asset_id 
  AND h.investor_id = :from_investor_id
JOIN investors fi ON fi.id = :from_investor_id
JOIN investors ti ON ti.id = :to_investor_id
WHERE r.asset_id = :asset_id;
```

---

## Migration Strategy
1. Initial schema: Single migration file
2. Future changes: Sequential numbered migrations
3. Never alter existing migrations
4. Always include rollback SQL

---

## Data Integrity Checks
- [ ] No orphaned holdings
- [ ] Holdings sum <= total_units per asset
- [ ] No negative balances
- [ ] All transfers have corresponding events
- [ ] All foreign keys valid