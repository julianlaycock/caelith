import { randomUUID } from 'crypto';
import { query } from '../db.js';
import {
  EligibilityCriteria,
  CreateEligibilityCriteriaInput,
  InvestorType,
} from '../models/index.js';

export async function createEligibilityCriteria(input: CreateEligibilityCriteriaInput): Promise<EligibilityCriteria> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const result = await query(
    `INSERT INTO eligibility_criteria
       (id, fund_structure_id, jurisdiction, investor_type, minimum_investment,
        maximum_allocation_pct, documentation_required, suitability_required,
        source_reference, effective_date, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      id, input.fund_structure_id, input.jurisdiction, input.investor_type,
      input.minimum_investment, input.maximum_allocation_pct ?? null,
      JSON.stringify(input.documentation_required ?? []),
      input.suitability_required ?? false, input.source_reference ?? null,
      input.effective_date, now,
    ]
  );

  return rowToCriteria(result[0]);
}

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
export async function findApplicableCriteria(
  fundStructureId: string,
  investorJurisdiction: string,
  investorType: InvestorType
): Promise<EligibilityCriteria | null> {
  const result = await query(
    `SELECT * FROM eligibility_criteria
     WHERE fund_structure_id = $1
       AND investor_type = $2
       AND (jurisdiction = $3 OR jurisdiction = '*')
       AND effective_date <= CURRENT_DATE
       AND superseded_at IS NULL
     ORDER BY
       CASE WHEN jurisdiction = $3 THEN 0 ELSE 1 END,
       effective_date DESC
     LIMIT 1`,
    [fundStructureId, investorType, investorJurisdiction]
  );

  return result[0] ? rowToCriteria(result[0]) : null;
}

/**
 * Find all active criteria for a fund structure (for display / template export)
 */
export async function findCriteriaByFundStructure(fundStructureId: string): Promise<EligibilityCriteria[]> {
  const result = await query(
    `SELECT * FROM eligibility_criteria
     WHERE fund_structure_id = $1
       AND superseded_at IS NULL
     ORDER BY jurisdiction, investor_type`,
    [fundStructureId]
  );

  return result.map(rowToCriteria);
}

/**
 * Supersede a criteria row (soft-replace with a new effective_date row)
 */
export async function supersedeCriteria(id: string): Promise<void> {
  await query(
    `UPDATE eligibility_criteria SET superseded_at = CURRENT_DATE WHERE id = $1`,
    [id]
  );
}

function rowToCriteria(row: any): EligibilityCriteria {
  return {
    id: row.id,
    fund_structure_id: row.fund_structure_id,
    jurisdiction: row.jurisdiction,
    investor_type: row.investor_type,
    minimum_investment: Number(row.minimum_investment),
    maximum_allocation_pct: row.maximum_allocation_pct ? Number(row.maximum_allocation_pct) : null,
    documentation_required: typeof row.documentation_required === 'string'
      ? JSON.parse(row.documentation_required)
      : row.documentation_required ?? [],
    suitability_required: Boolean(row.suitability_required),
    source_reference: row.source_reference ?? null,
    effective_date: String(row.effective_date),
    superseded_at: row.superseded_at ? String(row.superseded_at) : null,
    created_at: String(row.created_at),
  };
}
