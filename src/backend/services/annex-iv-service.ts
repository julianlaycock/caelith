/**
 * AIFMD Annex IV Report Service — Article 24 Reporting
 *
 * Generates the Annex IV data export required by every EU AIFM
 * for submission to their NCA (e.g. CSSF in Luxembourg).
 *
 * Sections:
 *   1. AIF Identification
 *   2. Investor Concentration
 *   3. Principal Exposures
 *   4. Risk Profile
 *   5. Compliance Status
 */

import { query } from '../db.js';
import { NotFoundError } from '../errors.js';

// ── Public Types ────────────────────────────────────────────

export interface AnnexIVReport {
  aif_identification: {
    reporting_period: { start: string; end: string };
    aif_name: string;
    aif_national_code: string;
    aif_type: string;
    domicile: string;
    inception_date: string | null;
    aifm_name: string | null;
    aifm_lei: string | null;
    reporting_obligation: 'Article 24(1)' | 'Article 24(2)' | 'Article 24(4)';
    base_currency: string;
  };

  investor_concentration: {
    total_investors: number;
    by_type: Array<{
      investor_type: string;
      count: number;
      percentage_of_nav: number;
    }>;
    by_domicile: Array<{
      domicile: string;
      count: number;
      percentage_of_nav: number;
    }>;
    beneficial_owners_concentration: {
      top_5_investors_pct: number;
    };
  };

  principal_exposures: {
    total_aum_units: number;
    total_allocated_units: number;
    utilization_pct: number;
    asset_breakdown: Array<{
      asset_name: string;
      asset_type: string;
      units: number;
      percentage_of_total: number;
    }>;
  };

  risk_profile: {
    liquidity: {
      investor_redemption_frequency: string;
      portfolio_liquidity_pct: number;
    };
    operational: {
      total_open_risk_flags: number;
      high_severity_flags: number;
    };
  };

  compliance_status: {
    kyc_coverage_pct: number;
    eligible_investor_pct: number;
    recent_violations: number;
    last_compliance_check: string;
  };

  generated_at: string;
  report_version: '1.0';
  disclaimer: string;
}

// ── DB Row Types ────────────────────────────────────────────

interface FundRow {
  id: string;
  name: string;
  legal_form: string;
  domicile: string;
  status: string;
  regulatory_framework: string | null;
  aifm_name: string | null;
  aifm_lei: string | null;
  inception_date: string | null;
  currency: string;
}

interface AssetRow {
  id: string;
  name: string;
  asset_type: string;
  total_units: number;
  allocated_units: string;
}

interface TypeRow { investor_type: string; count: string; total_units: string }
interface DomicileRow { jurisdiction: string; count: string; total_units: string }
interface TopInvestorRow { total_units: string }
interface KycRow { status: string; count: string }
interface DecisionViolationRow { violation_count: number }

// ── Helpers ─────────────────────────────────────────────────

function getCurrentQuarter(): { start: string; end: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// ── Main Report Generator ───────────────────────────────────

export async function generateAnnexIVReport(
  fundStructureId: string,
  reportingPeriod?: { start: string; end: string }
): Promise<AnnexIVReport> {
  const now = new Date().toISOString();
  const period = reportingPeriod || getCurrentQuarter();

  // 1. Fund structure
  const funds = await query<FundRow>(
    'SELECT * FROM fund_structures WHERE id = $1',
    [fundStructureId]
  );
  if (funds.length === 0) {
    throw new NotFoundError('Fund structure', fundStructureId);
  }
  const fund = funds[0];

  // 2. Assets
  const assets = await query<AssetRow>(
    `SELECT a.id, a.name, a.asset_type, a.total_units,
       COALESCE(SUM(h.units), 0) as allocated_units
     FROM assets a
     LEFT JOIN holdings h ON h.asset_id = a.id
     WHERE a.fund_structure_id = $1
     GROUP BY a.id
     ORDER BY a.name`,
    [fundStructureId]
  );

  const assetIds = assets.map(a => a.id);
  const totalUnits = assets.reduce((s, a) => s + a.total_units, 0);
  const totalAllocated = assets.reduce((s, a) => s + Number(a.allocated_units), 0);

  // Default empty results
  let totalInvestors = 0;
  let byType: TypeRow[] = [];
  let byDomicile: DomicileRow[] = [];
  let topInvestors: TopInvestorRow[] = [];
  let kycStats: KycRow[] = [];
  let recentViolations = 0;

  if (assetIds.length > 0) {
    const ph = assetIds.map((_, i) => `$${i + 1}`).join(',');

    const [countRes, typeRes, domRes, topRes, kycRes, violRes] = await Promise.all([
      // Unique investor count
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT investor_id) as count FROM holdings WHERE asset_id IN (${ph}) AND units > 0`,
        assetIds
      ),
      // By type
      query<TypeRow>(
        `SELECT COALESCE(i.investor_type, 'unknown') as investor_type, COUNT(DISTINCT i.id) as count, COALESCE(SUM(h.units), 0) as total_units
         FROM holdings h JOIN investors i ON h.investor_id = i.id
         WHERE h.asset_id IN (${ph}) AND h.units > 0
         GROUP BY i.investor_type ORDER BY total_units DESC`,
        assetIds
      ),
      // By domicile
      query<DomicileRow>(
        `SELECT i.jurisdiction, COUNT(DISTINCT i.id) as count, COALESCE(SUM(h.units), 0) as total_units
         FROM holdings h JOIN investors i ON h.investor_id = i.id
         WHERE h.asset_id IN (${ph}) AND h.units > 0
         GROUP BY i.jurisdiction ORDER BY total_units DESC`,
        assetIds
      ),
      // Top 5 investors by total holdings
      query<TopInvestorRow>(
        `SELECT SUM(h.units) as total_units
         FROM holdings h
         WHERE h.asset_id IN (${ph}) AND h.units > 0
         GROUP BY h.investor_id
         ORDER BY total_units DESC
         LIMIT 5`,
        assetIds
      ),
      // KYC status
      query<KycRow>(
        `SELECT COALESCE(i.kyc_status, 'unknown') as status, COUNT(DISTINCT i.id) as count
         FROM holdings h JOIN investors i ON h.investor_id = i.id
         WHERE h.asset_id IN (${ph}) AND h.units > 0
         GROUP BY i.kyc_status`,
        assetIds
      ),
      // Recent violations (decisions with violations in the reporting period)
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM decision_records
         WHERE asset_id IN (${ph}) AND result = 'rejected'
         AND decided_at >= $${assetIds.length + 1} AND decided_at <= $${assetIds.length + 2}`,
        [...assetIds, period.start, period.end]
      ),
    ]);

    totalInvestors = Number(countRes[0]?.count || 0);
    byType = typeRes;
    byDomicile = domRes;
    topInvestors = topRes;
    kycStats = kycRes;
    recentViolations = Number(violRes[0]?.count || 0);
  }

  // Compute top 5 concentration
  const top5Units = topInvestors.reduce((s, r) => s + Number(r.total_units), 0);
  const top5Pct = totalAllocated > 0 ? Math.round((top5Units / totalAllocated) * 10000) / 100 : 0;

  // KYC coverage
  const kycTotal = kycStats.reduce((s, r) => s + Number(r.count), 0);
  const kycVerified = Number(kycStats.find(r => r.status === 'verified')?.count || 0);
  const kycCoverage = kycTotal > 0 ? Math.round((kycVerified / kycTotal) * 10000) / 100 : 0;

  // Eligible investor % (accredited/professional investors)
  const eligibleTypes = ['professional', 'well_informed', 'institutional'];
  const eligibleCount = byType
    .filter(r => eligibleTypes.includes(r.investor_type))
    .reduce((s, r) => s + Number(r.count), 0);
  const eligiblePct = totalInvestors > 0 ? Math.round((eligibleCount / totalInvestors) * 10000) / 100 : 0;

  // Risk flags computation
  let totalRiskFlags = 0;
  let highSeverityFlags = 0;

  if (fund.status !== 'active') highSeverityFlags++;
  totalRiskFlags += highSeverityFlags;

  // KYC expiring
  if (assetIds.length > 0) {
    const ph = assetIds.map((_, i) => `$${i + 1}`).join(',');
    const expiringRes = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT i.id) as count
       FROM holdings h JOIN investors i ON h.investor_id = i.id
       WHERE h.asset_id IN (${ph}) AND h.units > 0
         AND i.kyc_expiry IS NOT NULL AND i.kyc_expiry <= NOW() + INTERVAL '90 days'`,
      assetIds
    );
    const expiringCount = Number(expiringRes[0]?.count || 0);
    if (expiringCount > 0) totalRiskFlags++;
  }

  // Concentration risk
  if (top5Pct > 50) totalRiskFlags++;

  // Determine reporting obligation based on AUM
  const reportingObligation: AnnexIVReport['aif_identification']['reporting_obligation'] =
    totalUnits > 500000000 ? 'Article 24(2)' :
    totalUnits > 100000000 ? 'Article 24(1)' : 'Article 24(4)';

  // Portfolio liquidity: approximate as % of allocated units (simplified)
  const liquidityPct = totalAllocated > 0
    ? Math.round((totalAllocated / totalUnits) * 10000) / 100
    : 100;

  return {
    aif_identification: {
      reporting_period: period,
      aif_name: fund.name,
      aif_national_code: fund.id,
      aif_type: fund.legal_form,
      domicile: fund.domicile,
      inception_date: fund.inception_date,
      aifm_name: fund.aifm_name,
      aifm_lei: fund.aifm_lei,
      reporting_obligation: reportingObligation,
      base_currency: fund.currency || 'EUR',
    },

    investor_concentration: {
      total_investors: totalInvestors,
      by_type: byType.map(r => ({
        investor_type: r.investor_type,
        count: Number(r.count),
        percentage_of_nav: totalAllocated > 0
          ? Math.round((Number(r.total_units) / totalAllocated) * 10000) / 100
          : 0,
      })),
      by_domicile: byDomicile.map(r => ({
        domicile: r.jurisdiction,
        count: Number(r.count),
        percentage_of_nav: totalAllocated > 0
          ? Math.round((Number(r.total_units) / totalAllocated) * 10000) / 100
          : 0,
      })),
      beneficial_owners_concentration: {
        top_5_investors_pct: top5Pct,
      },
    },

    principal_exposures: {
      total_aum_units: totalUnits,
      total_allocated_units: totalAllocated,
      utilization_pct: totalUnits > 0 ? Math.round((totalAllocated / totalUnits) * 10000) / 100 : 0,
      asset_breakdown: assets.map(a => ({
        asset_name: a.name,
        asset_type: a.asset_type,
        units: Number(a.allocated_units),
        percentage_of_total: totalAllocated > 0
          ? Math.round((Number(a.allocated_units) / totalAllocated) * 10000) / 100
          : 0,
      })),
    },

    risk_profile: {
      liquidity: {
        investor_redemption_frequency: 'Quarterly',
        portfolio_liquidity_pct: liquidityPct,
      },
      operational: {
        total_open_risk_flags: totalRiskFlags,
        high_severity_flags: highSeverityFlags,
      },
    },

    compliance_status: {
      kyc_coverage_pct: kycCoverage,
      eligible_investor_pct: eligiblePct,
      recent_violations: recentViolations,
      last_compliance_check: now,
    },

    generated_at: now,
    report_version: '1.0',
    disclaimer:
      'This AIFMD Annex IV report was generated by the Caelith Compliance Engine and represents a point-in-time snapshot for regulatory reporting purposes. It does not constitute legal, regulatory, or financial advice. The AIFM remains solely responsible for the accuracy and completeness of data submitted to the competent authority. This report should be reviewed by qualified compliance personnel before submission.',
  };
}
