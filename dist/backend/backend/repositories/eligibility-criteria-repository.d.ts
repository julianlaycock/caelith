import { EligibilityCriteria, CreateEligibilityCriteriaInput, InvestorType } from '../models/index.js';
export declare function createEligibilityCriteria(input: CreateEligibilityCriteriaInput): Promise<EligibilityCriteria>;
/**
 * Core lookup: find the active eligibility criteria for a given fund structure,
 * investor jurisdiction, and investor type.
 *
 * Resolution order:
 *   1. Exact jurisdiction match (e.g., 'DE') — most specific
 *   2. Wildcard '*' — applies to all jurisdictions
 *
 * Only returns criteria where:
 *   - effective_date <= today
 *   - superseded_at IS NULL (still active)
 */
export declare function findApplicableCriteria(fundStructureId: string, investorJurisdiction: string, investorType: InvestorType): Promise<EligibilityCriteria | null>;
/**
 * Find all active criteria for a fund structure (for display / template export)
 */
export declare function findCriteriaByFundStructure(fundStructureId: string): Promise<EligibilityCriteria[]>;
/**
 * Supersede a criteria row (soft-replace with a new effective_date row)
 */
export declare function supersedeCriteria(id: string): Promise<void>;
//# sourceMappingURL=eligibility-criteria-repository.d.ts.map