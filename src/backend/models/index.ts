// Core domain models for Caelith — AIFMD Compliance Orchestration Platform
// Updated: 2026-02-10 for Vertical B schema (migrations 007–014)

// ============================================================================
// ENUMS (as union types for TypeScript)
// ============================================================================

export type InvestorType =
  | 'institutional'
  | 'professional'
  | 'semi_professional'
  | 'well_informed'
  | 'retail';

export type KycStatus = 'pending' | 'verified' | 'expired' | 'rejected';

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

export type OnboardingStatus =
  | 'applied' | 'eligible' | 'ineligible'
  | 'approved' | 'rejected' | 'allocated' | 'withdrawn';

// ============================================================================
// CORE ENTITIES (extended for Vertical B)
// ============================================================================

/**
 * Asset - Represents a private asset (e.g., fund share class)
 * Extended: fund_structure_id, unit_price
 */
export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  total_units: number;
  fund_structure_id: string | null;
  unit_price: number | null;
  created_at: string;
}

/**
 * Investor - Represents an investor in the registry
 * Extended: AIFMD 5-tier classification, KYC lifecycle, identifiers
 */
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

/**
 * Holding - Represents ownership of units in an asset
 */
export interface Holding {
  id: string;
  investor_id: string;
  asset_id: string;
  units: number;
  acquired_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * RuleSet - Transfer rules for an asset
 * Extended: AIFMD-specific parameters
 */
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

/**
 * Transfer - Record of an executed transfer
 * Extended: decision_record_id
 */
export interface Transfer {
  id: string;
  asset_id: string;
  from_investor_id: string;
  to_investor_id: string;
  units: number;
  decision_record_id: string | null;
  executed_at: string;
  created_at: string;
}

/**
 * Event - Audit trail entry
 */
export interface Event {
  id: string;
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// NEW ENTITIES (Vertical B)
// ============================================================================

/**
 * FundStructure - Legal structure, domicile, and regulatory framework of a fund
 */
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

/**
 * EligibilityCriteria - Jurisdiction-specific investor eligibility rules per fund structure
 */
export interface EligibilityCriteria {
  id: string;
  fund_structure_id: string;
  jurisdiction: string;
  investor_type: InvestorType;
  minimum_investment: number;
  maximum_allocation_pct: number | null;
  documentation_required: string[];
  suitability_required: boolean;
  source_reference: string | null;
  effective_date: string;
  superseded_at: string | null;
  created_at: string;
}

/**
 * DecisionRecord - Temporal provenance archive for compliance decisions
 */
export interface DecisionRecord {
  id: string;
  decision_type: DecisionType;
  asset_id: string | null;
  subject_id: string;
  input_snapshot: Record<string, unknown>;
  rule_version_snapshot: Record<string, unknown>;
  result: DecisionResult;
  result_details: DecisionResultDetails;
  decided_by: string | null;
  decided_at: string;
  created_at: string;
  sequence_number?: number;
  integrity_hash?: string | null;
  previous_hash?: string | null;
}

/**
 * Structured result details for decision records
 */
export interface DecisionResultDetails {
  checks: DecisionCheck[];
  overall: DecisionResult;
  violation_count: number;
}

export interface DecisionCheck {
  rule: string;
  passed: boolean;
  message: string;
}

/**
 * OnboardingRecord - Investor application lifecycle for fund subscription
 */
export interface OnboardingRecord {
  id: string;
  investor_id: string;
  asset_id: string;
  status: OnboardingStatus;
  requested_units: number;
  eligibility_decision_id: string | null;
  approval_decision_id: string | null;
  reviewed_by: string | null;
  rejection_reasons: string[] | null;
  applied_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * RegulatoryDocument - Chunked regulatory text for RAG pipeline
 */
export interface RegulatoryDocument {
  id: string;
  source_name: string;
  jurisdiction: string;
  framework: string;
  article_ref: string | null;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
  created_at: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type EventType =
  // Original events
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
  | 'composite_rule.created'
  | 'composite_rule.updated'
  | 'composite_rule.deleted'
  // Vertical B events
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
  // Vertical B entities
  | 'fund_structure'
  | 'eligibility_criteria'
  | 'decision_record'
  | 'onboarding_record'
  | 'regulatory_document';

// ============================================================================
// CREATE INPUT TYPES
// ============================================================================

export interface CreateAssetInput {
  name: string;
  asset_type: string;
  total_units: number;
  fund_structure_id?: string;
  unit_price?: number;
}

export interface CreateInvestorInput {
  name: string;
  jurisdiction: string;
  accredited?: boolean;
  investor_type?: InvestorType;
  kyc_status?: KycStatus;
  kyc_expiry?: string;
  tax_id?: string;
  lei?: string;
  email?: string;
}

export interface CreateHoldingInput {
  investor_id: string;
  asset_id: string;
  units: number;
  acquired_at: string;
}

export interface CreateRuleSetInput {
  asset_id: string;
  qualification_required: boolean;
  lockup_days: number;
  jurisdiction_whitelist: string[];
  transfer_whitelist: string[] | null;
  investor_type_whitelist?: InvestorType[] | null;
  minimum_investment?: number;
  maximum_investors?: number;
  concentration_limit_pct?: number;
  kyc_required?: boolean;
}

export interface CreateTransferInput {
  asset_id: string;
  from_investor_id: string;
  to_investor_id: string;
  units: number;
  executed_at: string;
}

export interface CreateEventInput {
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  payload: Record<string, unknown>;
  tenant_id?: string;
}

export interface CreateFundStructureInput {
  name: string;
  legal_form: LegalForm;
  domicile: string;
  regulatory_framework: RegulatoryFramework;
  aifm_name?: string;
  aifm_lei?: string;
  inception_date?: string;
  target_size?: number;
  currency?: string;
  status?: FundStatus;
}

export interface CreateEligibilityCriteriaInput {
  fund_structure_id: string;
  jurisdiction: string;
  investor_type: InvestorType;
  minimum_investment: number;
  maximum_allocation_pct?: number;
  documentation_required?: string[];
  suitability_required?: boolean;
  source_reference?: string;
  effective_date: string;
}

export interface CreateDecisionRecordInput {
  decision_type: DecisionType;
  asset_id?: string;
  subject_id: string;
  input_snapshot: Record<string, unknown>;
  rule_version_snapshot: Record<string, unknown>;
  result: DecisionResult;
  result_details: DecisionResultDetails;
  decided_by?: string;
}

export interface CreateOnboardingRecordInput {
  investor_id: string;
  asset_id: string;
  requested_units: number;
}

// ============================================================================
// UPDATE INPUT TYPES
// ============================================================================

export interface UpdateAssetInput {
  name?: string;
  asset_type?: string;
  total_units?: number;
}

export interface UpdateInvestorInput {
  name?: string;
  jurisdiction?: string;
  accredited?: boolean;
  investor_type?: InvestorType;
  kyc_status?: KycStatus;
  kyc_expiry?: string;
  tax_id?: string;
  lei?: string;
  email?: string;
}

export interface UpdateHoldingInput {
  units?: number;
}

export interface UpdateFundStructureInput {
  name?: string;
  aifm_name?: string;
  aifm_lei?: string;
  inception_date?: string;
  target_size?: number;
  status?: FundStatus;
}

export interface UpdateOnboardingInput {
  status: OnboardingStatus;
  reviewed_by?: string;
  rejection_reasons?: string[];
  eligibility_decision_id?: string;
  approval_decision_id?: string;
}

// ============================================================================
// QUERY / VIEW TYPES
// ============================================================================

/**
 * Eligibility check request — "Can this investor invest in this fund?"
 */
export interface EligibilityCheckRequest {
  investor_id: string;
  fund_structure_id: string;
  investment_amount?: number;
}

/**
 * Eligibility check response with full provenance
 */
export interface EligibilityCheckResult {
  eligible: boolean;
  investor_type: InvestorType;
  fund_legal_form: LegalForm;
  jurisdiction: string;
  checks: DecisionCheck[];
  criteria_applied: EligibilityCriteria | null;
  decision_record_id: string;
}

/**
 * Cap table entry with investor classification breakdown
 */
export interface CapTableEntry {
  investor_id: string;
  investor_name: string;
  investor_type: InvestorType;
  jurisdiction: string;
  units: number;
  percentage: number;
}
