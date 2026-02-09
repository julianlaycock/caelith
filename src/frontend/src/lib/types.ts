// Types matching backend models (src/backend/models/index.ts)

export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  total_units: number;
  created_at: string;
}

export interface CreateAssetRequest {
  name: string;
  asset_type: string;
  total_units: number;
}

export interface AssetUtilization {
  asset_id: string;
  asset_name: string;
  total_units: number;
  allocated_units: number;
  available_units: number;
  utilization_percentage: number;
}

export interface Investor {
  id: string;
  name: string;
  jurisdiction: string;
  accredited: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInvestorRequest {
  name: string;
  jurisdiction: string;
  accredited: boolean;
}

export interface UpdateInvestorRequest {
  name?: string;
  jurisdiction?: string;
  accredited?: boolean;
}

export interface Holding {
  id: string;
  investor_id: string;
  asset_id: string;
  units: number;
  acquired_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHoldingRequest {
  investor_id: string;
  asset_id: string;
  units: number;
  acquired_at?: string;
}

export interface CapTableEntry {
  investor_id: string;
  investor_name: string;
  units: number;
  percentage: number;
}

export interface RuleSet {
  id: string;
  asset_id: string;
  version: number;
  qualification_required: boolean;
  lockup_days: number;
  jurisdiction_whitelist: string[];
  transfer_whitelist: string[] | null;
  created_at: string;
}

export interface CreateRuleSetRequest {
  asset_id: string;
  qualification_required: boolean;
  lockup_days: number;
  jurisdiction_whitelist: string[];
  transfer_whitelist: string[] | null;
}

export interface Transfer {
  id: string;
  asset_id: string;
  from_investor_id: string;
  to_investor_id: string;
  units: number;
  executed_at: string;
  created_at: string;
}

export interface TransferRequest {
  asset_id: string;
  from_investor_id: string;
  to_investor_id: string;
  units: number;
  execution_date: string;
}

export interface TransferHistoryEntry {
  id: string;
  asset_id: string;
  from_investor_id: string;
  from_name: string;
  to_investor_id: string;
  to_name: string;
  units: number;
  executed_at: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

export interface Event {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface ApiError {
  error: string;
  message: string;
  violations?: string[];
  details?: Record<string, unknown>;
}

// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'compliance_officer' | 'viewer';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface CheckResult {
  rule: string;
  passed: boolean;
  message: string;
}

export interface DetailedValidationResult extends ValidationResult {
  checks: CheckResult[];
  summary: string;
}

// ── Composite Rules ──────────────────────────────────
export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

export interface CompositeRule {
  id: string;
  asset_id: string;
  name: string;
  description: string;
  operator: 'AND' | 'OR' | 'NOT';
  conditions: RuleCondition[];
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCompositeRuleRequest {
  asset_id: string;
  name: string;
  description: string;
  operator: 'AND' | 'OR' | 'NOT';
  conditions: RuleCondition[];
  enabled?: boolean;
}

export interface RuleVersion {
  id: string;
  asset_id: string;
  version: number;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}
