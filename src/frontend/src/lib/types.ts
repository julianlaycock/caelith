// Types matching backend models (src/backend/models/index.ts)

export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  total_units: number;
  fund_structure_id: string | null;
  unit_price: number | null;
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

// ── AIFMD Types (Vertical B) ────────────────────────────

export type InvestorType = 'institutional' | 'professional' | 'semi_professional' | 'well_informed' | 'retail';
export type KycStatus = 'pending' | 'verified' | 'expired' | 'rejected';
export type OnboardingStatus = 'applied' | 'eligible' | 'ineligible' | 'approved' | 'rejected' | 'allocated' | 'withdrawn';

export type LegalForm =
  | 'SICAV' | 'SIF' | 'RAIF' | 'SCSp' | 'SCA'
  | 'ELTIF' | 'Spezial_AIF' | 'Publikums_AIF'
  | 'QIAIF' | 'RIAIF' | 'LP' | 'other';

export type RegulatoryFramework = 'AIFMD' | 'UCITS' | 'ELTIF' | 'national';

export type FundStatus = 'active' | 'closing' | 'closed' | 'liquidating';

export type DecisionType =
  | 'transfer_validation'
  | 'eligibility_check'
  | 'onboarding_approval'
  | 'scenario_analysis';

export type DecisionResult = 'approved' | 'rejected' | 'simulated';

export type EventType =
  | 'asset.created'
  | 'asset.updated'
  | 'asset.deleted'
  | 'investor.created'
  | 'investor.updated'
  | 'holding.allocated'
  | 'holding.updated'
  | 'rules.created'
  | 'rules.updated'
  | 'transfer.executed'
  | 'transfer.rejected'
  | 'transfer.pending_approval'
  | 'composite_rule.created'
  | 'composite_rule.updated'
  | 'composite_rule.deleted'
  | 'fund_structure.created'
  | 'fund_structure.updated'
  | 'eligibility.checked'
  | 'eligibility_criteria.created'
  | 'eligibility_criteria.updated'
  | 'onboarding.applied'
  | 'onboarding.eligible'
  | 'onboarding.ineligible'
  | 'onboarding.approved'
  | 'onboarding.rejected'
  | 'onboarding.allocated'
  | 'onboarding.withdrawn'
  | 'nl_compiler.attempt'
  | 'copilot.query'
  | 'copilot.rule_proposed';

export type EntityType =
  | 'asset'
  | 'investor'
  | 'holding'
  | 'rules'
  | 'transfer'
  | 'composite_rule'
  | 'fund_structure'
  | 'eligibility_criteria'
  | 'decision_record'
  | 'onboarding_record'
  | 'regulatory_document';

export interface Investor {
  id: string;
  name: string;
  jurisdiction: string;
  accredited: boolean;
  investor_type: InvestorType;
  kyc_status: KycStatus;
  kyc_expiry: string | null;
  tax_id: string | null;
  lei: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvestorRequest {
  name: string;
  jurisdiction: string;
  accredited?: boolean;
  investor_type?: InvestorType;
  kyc_status?: KycStatus;
  kyc_expiry?: string;
  email?: string;
}

export interface UpdateInvestorRequest {
  name?: string;
  jurisdiction?: string;
  accredited?: boolean;
  investor_type?: InvestorType;
  kyc_status?: KycStatus;
  kyc_expiry?: string;
  email?: string;
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
  investor_type: InvestorType;
  jurisdiction: string;
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
  investor_type_whitelist: InvestorType[] | null;
  minimum_investment: number | null;
  maximum_investors: number | null;
  concentration_limit_pct: number | null;
  kyc_required: boolean;
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
  decision_record_id: string | null;
  executed_at: string;
  created_at: string;
  status: 'executed' | 'pending_approval' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  pending_reason?: string | null;
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
  asset_name?: string;
  from_investor_id: string;
  from_name: string;
  to_investor_id: string;
  to_name: string;
  units: number;
  executed_at: string;
  status: 'executed' | 'pending_approval' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  pending_reason?: string | null;
}

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

export interface Event {
  id: string;
  event_type: EventType;
  entity_type: EntityType;
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

// ── Fund Structures ──────────────────────────────────

export interface FundStructure {
  id: string;
  name: string;
  legal_form: LegalForm;
  domicile: string;
  regulatory_framework: RegulatoryFramework;
  aifm_name: string | null;
  aifm_lei: string | null;
  inception_date: string | null;
  target_size: number | null;
  currency: string;
  status: FundStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateFundStructureRequest {
  name: string;
  legal_form: LegalForm;
  domicile: string;
  regulatory_framework: RegulatoryFramework;
  aifm_name?: string;
  aifm_lei?: string;
  status?: FundStatus;
}

// ── Compliance Report ────────────────────────────────

export interface ComplianceReport {
  generated_at: string;
  fund: {
    id: string;
    name: string;
    legal_form: string;
    domicile: string;
    status: string;
    regulatory_framework: string | null;
    assets: {
      id: string;
      name: string;
      asset_type: string;
      total_units: number;
      allocated_units: number;
      unit_price: number | null;
      holder_count: number;
    }[];
    total_aum_units: number;
    total_allocated_units: number;
    utilization_pct: number;
    total_investors: number;
  };
  eligibility_criteria: {
    investor_type: string;
    jurisdiction: string;
    minimum_investment_eur: number;
    suitability_required: boolean;
    source_reference: string | null;
  }[];
  investor_breakdown: {
    by_type: { type: string; count: number; total_units: number }[];
    by_jurisdiction: { jurisdiction: string; count: number; total_units: number }[];
    by_kyc_status: { status: string; count: number }[];
    kyc_expiring_within_90_days: { investor_id: string; investor_name: string; kyc_expiry: string }[];
  };
  onboarding_pipeline: {
    total: number;
    by_status: { status: string; count: number }[];
    recent: {
      id: string;
      investor_name: string;
      asset_name: string;
      status: string;
      requested_units: number;
      applied_at: string;
    }[];
  };
  recent_decisions: {
    id: string;
    decision_type: string;
    result: string;
    subject_id: string | null;
    asset_id: string;
    decided_at: string;
    decided_by: string | null;
    violation_count: number;
  }[];
  risk_flags: {
    severity: 'high' | 'medium' | 'low';
    category: string;
    message: string;
  }[];
}

// ── Eligibility ──────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  investor_type: InvestorType;
  fund_legal_form: LegalForm;
  jurisdiction: string;
  checks: { rule: string; passed: boolean; message: string }[];
  criteria_applied: {
    investor_type: InvestorType;
    jurisdiction: string;
    minimum_investment: number;
    suitability_required: boolean;
    source_reference: string | null;
  } | null;
  decision_record_id: string;
}

// ── Onboarding ───────────────────────────────────────

export interface OnboardingRecord {
  id: string;
  investor_id: string;
  asset_id: string;
  status: OnboardingStatus;
  requested_units: number;
  owner_tag: string | null;
  handoff_notes: string | null;
  eligibility_decision_id: string | null;
  approval_decision_id: string | null;
  reviewed_by: string | null;
  rejection_reasons: string[] | null;
  applied_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingEligibilityResult {
  onboarding: OnboardingRecord;
  eligible: boolean;
  checks: { rule: string; passed: boolean; message: string }[];
  decision_record_id: string;
}

export interface OnboardingReviewResult {
  onboarding: OnboardingRecord;
  decision_record_id: string;
}

// ── Decision Records ─────────────────────────────────

export interface DecisionRecord {
  id: string;
  decision_type: DecisionType;
  asset_id: string | null;
  asset_name?: string;
  subject_id: string;
  input_snapshot: Record<string, unknown>;
  rule_version_snapshot: Record<string, unknown>;
  result: DecisionResult;
  result_details: {
    checks: { rule: string; passed: boolean; message: string }[];
    overall: DecisionResult;
    violation_count: number;
  };
  decided_by: string | null;
  decided_by_name?: string | null;
  decided_by_email?: string | null;
  decided_at: string;
  created_at: string;
  sequence_number?: number;
  integrity_hash?: string | null;
  previous_hash?: string | null;
}

export interface DecisionChainVerificationResult {
  valid: boolean;
  total_verified: number;
  broken_at_sequence?: number;
  broken_at_id?: string;
  expected_hash?: string;
  actual_hash?: string;
  message: string;
}

// ── NL Rule Compiler ────────────────────────────────
export interface NLRuleResponse {
  proposed_rule: {
    name: string;
    description: string;
    operator: 'AND' | 'OR' | 'NOT';
    conditions: RuleCondition[];
    enabled: boolean;
  };
  confidence: number;
  explanation: string;
  source_suggestion: string | null;
  requires_approval: true;
  validation: {
    structurally_valid: boolean;
    errors: string[];
  };
}

// ── Copilot ─────────────────────────────────────────
export interface CopilotCitation {
  documentTitle: string;
  articleRef?: string | null;
  excerpt?: string;
}

export interface CopilotSuggestedAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface CopilotResponse {
  message: string;
  intent: string;
  citations?: CopilotCitation[];
  suggestedActions?: CopilotSuggestedAction[];
}

// Decision Explanation
export interface DecisionExplanation {
  decision_id: string;
  decision_type: string;
  result: string;
  decided_at: string;
  summary: string;
  context: {
    investor_name?: string;
    investor_type?: string;
    fund_name?: string;
    fund_legal_form?: string;
    investment_amount?: number;
  };
  checks: Array<{
    rule: string;
    passed: boolean;
    message: string;
    explanation: string;
    regulatory_basis: string | null;
    severity: 'pass' | 'fail' | 'warning';
  }>;
  violations: Array<{
    rule: string;
    explanation: string;
    regulatory_basis: string | null;
  }>;
  recommendation: string;
  disclaimer: string;
}

// Scenario Modeling
export interface ScenarioResult {
  fund_structure_id: string;
  fund_name: string;
  total_investors_analyzed: number;
  currently_eligible: number;
  proposed_eligible: number;
  newly_ineligible: number;
  newly_eligible: number;
  affected_investors: Array<{
    investor_id: string;
    investor_name: string;
    investor_type: string;
    jurisdiction: string;
    current_units: number;
    current_eligible: boolean;
    proposed_eligible: boolean;
    failing_checks: string[];
  }>;
  impact_summary: string;
  units_at_risk: number;
  percentage_at_risk: number;
  decision_record_id: string;
}
