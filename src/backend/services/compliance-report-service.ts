/**
 * Compliance Report Service — Slice 6
 *
 * Generates a fund-level compliance status snapshot:
 *   - Fund structure details
 *   - Eligibility criteria in force
 *   - Investor breakdown (by type, jurisdiction, KYC status)
 *   - Onboarding pipeline (by status)
 *   - Recent decision records (audit trail)
 *   - Concentration / risk flags
 *
 * Single endpoint, single fund, comprehensive view.
 */

import { query } from '../db.js';
import { NotFoundError } from '../errors.js';

// ── Public Types ────────────────────────────────────────────

export interface ComplianceReport {
  generated_at: string;
  fund: FundSummary;
  eligibility_criteria: CriteriaSummary[];
  investor_breakdown: InvestorBreakdown;
  onboarding_pipeline: OnboardingPipeline;
  recent_decisions: DecisionSummary[];
  risk_flags: RiskFlag[];
}

interface FundSummary {
  id: string;
  name: string;
  legal_form: string;
  domicile: string;
  status: string;
  regulatory_framework: string | null;
  assets: AssetSummary[];
  total_aum_units: number;
  total_allocated_units: number;
  utilization_pct: number;
  total_investors: number;
}

interface AssetSummary {
  id: string;
  name: string;
  asset_type: string;
  total_units: number;
  allocated_units: number;
  unit_price: number | null;
  holder_count: number;
}

interface CriteriaSummary {
  investor_type: string;
  jurisdiction: string;
  minimum_investment_eur: number;
  suitability_required: boolean;
  source_reference: string | null;
}

interface InvestorBreakdown {
  by_type: { type: string; count: number; total_units: number }[];
  by_jurisdiction: { jurisdiction: string; count: number; total_units: number }[];
  by_kyc_status: { status: string; count: number }[];
  kyc_expiring_within_90_days: { investor_id: string; investor_name: string; kyc_expiry: string }[];
}

interface OnboardingPipeline {
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
}

interface DecisionSummary {
  id: string;
  decision_type: string;
  result: string;
  subject_id: string | null;
  asset_id: string;
  decided_at: string;
  decided_by: string | null;
  violation_count: number;
}

interface RiskFlag {
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
}

// ── DB Row Types ────────────────────────────────────────────

interface FundRow {
  id: string;
  name: string;
  legal_form: string;
  domicile: string;
  status: string;
  regulatory_framework: string | null;
}

interface AssetRow {
  id: string;
  name: string;
  asset_type: string;
  total_units: number;
  unit_price: string | null;
  allocated_units: string;
  holder_count: string;
}

interface CriteriaRow {
  investor_type: string;
  jurisdiction: string;
  minimum_investment: number;
  suitability_required: boolean;
  source_reference: string | null;
}

interface TypeRow { type: string; count: string; total_units: string }
interface JurisdictionRow { jurisdiction: string; count: string; total_units: string }
interface KycStatusRow { status: string; count: string }
interface KycExpiringRow { investor_id: string; investor_name: string; kyc_expiry: string }
interface ObStatusRow { status: string; count: string }

interface ObRecentRow {
  id: string;
  investor_name: string;
  asset_name: string;
  status: string;
  requested_units: number;
  applied_at: string;
}

interface DecisionRow {
  id: string;
  decision_type: string;
  result: string;
  subject_id: string | null;
  asset_id: string;
  decided_at: string;
  decided_by: string | null;
  result_details: Record<string, unknown> | string | null;
}

interface ConcentrationRow { name: string; total_units: string }
interface CountRow { count: string }

// ── Main Report Generator ───────────────────────────────────

export async function generateComplianceReport(
  fundStructureId: string
): Promise<ComplianceReport> {
  const now = new Date().toISOString();

  // 1. Fund structure (must resolve first — abort if missing)
  const funds = await query<FundRow>(
    'SELECT * FROM fund_structures WHERE id = $1',
    [fundStructureId]
  );
  if (funds.length === 0) {
    throw new NotFoundError('Fund structure', fundStructureId);
  }
  const fund = funds[0];

  // 2. Assets + eligibility criteria in parallel (both depend only on fundStructureId)
  const [assets, criteria] = await Promise.all([
    query<AssetRow>(
      `SELECT a.*,
         COALESCE(SUM(h.units), 0) as allocated_units,
         COUNT(DISTINCT h.investor_id) FILTER (WHERE h.units > 0) as holder_count
       FROM assets a
       LEFT JOIN holdings h ON h.asset_id = a.id
       WHERE a.fund_structure_id = $1
       GROUP BY a.id
       ORDER BY a.name`,
      [fundStructureId]
    ),
    query<CriteriaRow>(
      `SELECT investor_type, jurisdiction, minimum_investment, suitability_required, source_reference
       FROM eligibility_criteria
       WHERE fund_structure_id = $1
       ORDER BY investor_type, jurisdiction`,
      [fundStructureId]
    ),
  ]);

  const assetIds = assets.map((a) => a.id);
  const assetSummaries: AssetSummary[] = assets.map((a) => ({
    id: a.id,
    name: a.name,
    asset_type: a.asset_type,
    total_units: a.total_units,
    allocated_units: Number(a.allocated_units),
    unit_price: a.unit_price ? Number(a.unit_price) : null,
    holder_count: Number(a.holder_count),
  }));

  const totalUnits = assetSummaries.reduce((s, a) => s + a.total_units, 0);
  const totalAllocated = assetSummaries.reduce((s, a) => s + a.allocated_units, 0);

  const criteriaSummaries: CriteriaSummary[] = criteria.map((c) => ({
    investor_type: c.investor_type,
    jurisdiction: c.jurisdiction,
    minimum_investment_eur: c.minimum_investment / 100,
    suitability_required: c.suitability_required,
    source_reference: c.source_reference,
  }));

  // 3. All asset-dependent queries in a single parallel batch
  let investorBreakdown: InvestorBreakdown = {
    by_type: [],
    by_jurisdiction: [],
    by_kyc_status: [],
    kyc_expiring_within_90_days: [],
  };
  let onboardingPipeline: OnboardingPipeline = { total: 0, by_status: [], recent: [] };
  let recentDecisions: DecisionSummary[] = [];
  let totalInvestors = 0;
  const riskFlags: RiskFlag[] = [];

  if (assetIds.length > 0) {
    const ph = assetIds.map((_, i) => `$${i + 1}`).join(',');

    const [
      byType, byJurisdiction, byKyc, kycExpiring,
      obByStatus, obRecent,
      decisions, concentration, invCount,
    ] = await Promise.all([
      // ── Investor breakdown ──
      query<TypeRow>(
        `SELECT COALESCE(i.investor_type, 'unknown') as type, COUNT(DISTINCT i.id) as count, COALESCE(SUM(h.units), 0) as total_units
         FROM holdings h JOIN investors i ON h.investor_id = i.id
         WHERE h.asset_id IN (${ph}) AND h.units > 0
         GROUP BY i.investor_type ORDER BY total_units DESC`,
        assetIds
      ),
      query<JurisdictionRow>(
        `SELECT i.jurisdiction, COUNT(DISTINCT i.id) as count, COALESCE(SUM(h.units), 0) as total_units
         FROM holdings h JOIN investors i ON h.investor_id = i.id
         WHERE h.asset_id IN (${ph}) AND h.units > 0
         GROUP BY i.jurisdiction ORDER BY total_units DESC`,
        assetIds
      ),
      query<KycStatusRow>(
        `SELECT COALESCE(i.kyc_status, 'unknown') as status, COUNT(DISTINCT i.id) as count
         FROM holdings h JOIN investors i ON h.investor_id = i.id
         WHERE h.asset_id IN (${ph}) AND h.units > 0
         GROUP BY i.kyc_status ORDER BY count DESC`,
        assetIds
      ),
      query<KycExpiringRow>(
        `SELECT DISTINCT i.id as investor_id, i.name as investor_name, i.kyc_expiry
         FROM holdings h JOIN investors i ON h.investor_id = i.id
         WHERE h.asset_id IN (${ph}) AND h.units > 0
           AND i.kyc_expiry IS NOT NULL
           AND i.kyc_expiry <= NOW() + INTERVAL '90 days'
         ORDER BY i.kyc_expiry`,
        assetIds
      ),
      // ── Onboarding pipeline ──
      query<ObStatusRow>(
        `SELECT status, COUNT(*) as count
         FROM onboarding_records
         WHERE asset_id IN (${ph})
         GROUP BY status ORDER BY count DESC`,
        assetIds
      ),
      query<ObRecentRow>(
        `SELECT ob.id, i.name as investor_name, a.name as asset_name,
                ob.status, ob.requested_units, ob.applied_at
         FROM onboarding_records ob
         JOIN investors i ON ob.investor_id = i.id
         JOIN assets a ON ob.asset_id = a.id
         WHERE ob.asset_id IN (${ph})
         ORDER BY ob.applied_at DESC LIMIT 10`,
        assetIds
      ),
      // ── Recent decisions ──
      query<DecisionRow>(
        `SELECT id, decision_type, result, subject_id, asset_id, decided_at, decided_by, result_details
         FROM decision_records
         WHERE asset_id IN (${ph})
         ORDER BY decided_at DESC LIMIT 20`,
        assetIds
      ),
      // ── Concentration risk ──
      query<ConcentrationRow>(
        `SELECT i.name, SUM(h.units) as total_units
         FROM holdings h JOIN investors i ON h.investor_id = i.id
         WHERE h.asset_id IN (${ph}) AND h.units > 0
         GROUP BY i.id, i.name
         HAVING SUM(h.units)::numeric / NULLIF($${assetIds.length + 1}::numeric, 0) > 0.25
         ORDER BY total_units DESC`,
        [...assetIds, totalUnits]
      ),
      // ── Unique investor count ──
      query<CountRow>(
        `SELECT COUNT(DISTINCT investor_id) as count FROM holdings WHERE asset_id IN (${ph}) AND units > 0`,
        assetIds
      ),
    ]);

    // Process investor breakdown
    investorBreakdown = {
      by_type: byType.map((r) => ({ type: r.type, count: Number(r.count), total_units: Number(r.total_units) })),
      by_jurisdiction: byJurisdiction.map((r) => ({ jurisdiction: r.jurisdiction, count: Number(r.count), total_units: Number(r.total_units) })),
      by_kyc_status: byKyc.map((r) => ({ status: r.status, count: Number(r.count) })),
      kyc_expiring_within_90_days: kycExpiring.map((r) => ({ investor_id: r.investor_id, investor_name: r.investor_name, kyc_expiry: r.kyc_expiry })),
    };

    // Process onboarding pipeline
    const obStatusList = obByStatus.map((r) => ({ status: r.status, count: Number(r.count) }));
    onboardingPipeline = {
      total: obStatusList.reduce((s, r) => s + r.count, 0),
      by_status: obStatusList,
      recent: obRecent.map((r) => ({
        id: r.id,
        investor_name: r.investor_name,
        asset_name: r.asset_name,
        status: r.status,
        requested_units: r.requested_units,
        applied_at: r.applied_at,
      })),
    };

    // Process decisions
    recentDecisions = decisions.map((d) => {
      let violationCount = 0;
      if (d.result_details) {
        const details = typeof d.result_details === 'string'
          ? (JSON.parse(d.result_details) as Record<string, unknown>)
          : d.result_details;
        violationCount = Number(details.violation_count) || 0;
      }
      return {
        id: d.id,
        decision_type: d.decision_type,
        result: d.result,
        subject_id: d.subject_id,
        asset_id: d.asset_id,
        decided_at: d.decided_at,
        decided_by: d.decided_by,
        violation_count: violationCount,
      };
    });

    // Process concentration risk flags
    for (const c of concentration) {
      const pct = ((Number(c.total_units) / totalUnits) * 100).toFixed(1);
      riskFlags.push({
        severity: 'medium',
        category: 'concentration',
        message: `${c.name} holds ${pct}% of total fund units (above 25% threshold)`,
      });
    }

    totalInvestors = Number(invCount[0]?.count || 0);
  }

  // 4. Compute remaining risk flags from query results
  if (fund.status !== 'active') {
    riskFlags.push({
      severity: 'high',
      category: 'fund_status',
      message: `Fund status is '${fund.status}' — not accepting new investments`,
    });
  }

  if (investorBreakdown.kyc_expiring_within_90_days.length > 0) {
    riskFlags.push({
      severity: 'medium',
      category: 'kyc_expiry',
      message: `${investorBreakdown.kyc_expiring_within_90_days.length} investor(s) have KYC expiring within 90 days`,
    });
  }

  const pendingCount = onboardingPipeline.by_status
    .filter(s => s.status === 'applied' || s.status === 'eligible')
    .reduce((sum, s) => sum + s.count, 0);
  if (pendingCount > 0) {
    riskFlags.push({
      severity: 'low',
      category: 'onboarding_pending',
      message: `${pendingCount} onboarding application(s) awaiting action`,
    });
  }

  const recentRejections = recentDecisions.filter(d => d.result === 'rejected');
  if (recentRejections.length > 0) {
    riskFlags.push({
      severity: 'low',
      category: 'recent_rejections',
      message: `${recentRejections.length} rejection(s) in recent decisions — review for patterns`,
    });
  }

  return {
    generated_at: now,
    fund: {
      id: fund.id,
      name: fund.name,
      legal_form: fund.legal_form,
      domicile: fund.domicile,
      status: fund.status,
      regulatory_framework: fund.regulatory_framework,
      assets: assetSummaries,
      total_aum_units: totalUnits,
      total_allocated_units: totalAllocated,
      utilization_pct: totalUnits > 0 ? Math.round((totalAllocated / totalUnits) * 10000) / 100 : 0,
      total_investors: totalInvestors,
    },
    eligibility_criteria: criteriaSummaries,
    investor_breakdown: investorBreakdown,
    onboarding_pipeline: onboardingPipeline,
    recent_decisions: recentDecisions,
    risk_flags: riskFlags,
  };
}
