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
// ── Main Report Generator ───────────────────────────────────
export async function generateComplianceReport(fundStructureId) {
    const now = new Date().toISOString();
    // 1. Fund structure
    const funds = await query('SELECT * FROM fund_structures WHERE id = $1', [fundStructureId]);
    if (funds.length === 0) {
        throw new Error(`Fund structure not found: ${fundStructureId}`);
    }
    const fund = funds[0];
    // 2. Assets in this fund
    const assets = await query(`SELECT a.*,
       COALESCE(SUM(h.units), 0) as allocated_units,
       COUNT(DISTINCT h.investor_id) FILTER (WHERE h.units > 0) as holder_count
     FROM assets a
     LEFT JOIN holdings h ON h.asset_id = a.id
     WHERE a.fund_structure_id = $1
     GROUP BY a.id
     ORDER BY a.name`, [fundStructureId]);
    const assetIds = assets.map((a) => a.id);
    const assetSummaries = assets.map((a) => ({
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
    // 3. Eligibility criteria
    const criteria = await query(`SELECT investor_type, jurisdiction, minimum_investment, suitability_required, source_reference
     FROM eligibility_criteria
     WHERE fund_structure_id = $1
     ORDER BY investor_type, jurisdiction`, [fundStructureId]);
    const criteriaSummaries = criteria.map((c) => ({
        investor_type: c.investor_type,
        jurisdiction: c.jurisdiction,
        minimum_investment_eur: c.minimum_investment / 100,
        suitability_required: c.suitability_required,
        source_reference: c.source_reference,
    }));
    // 4. Investor breakdown (only investors with holdings in this fund's assets)
    let investorBreakdown = {
        by_type: [],
        by_jurisdiction: [],
        by_kyc_status: [],
        kyc_expiring_within_90_days: [],
    };
    if (assetIds.length > 0) {
        const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(',');
        const byType = await query(`SELECT COALESCE(i.investor_type, 'unknown') as type, COUNT(DISTINCT i.id) as count, COALESCE(SUM(h.units), 0) as total_units
       FROM holdings h JOIN investors i ON h.investor_id = i.id
       WHERE h.asset_id IN (${placeholders}) AND h.units > 0
       GROUP BY i.investor_type ORDER BY total_units DESC`, assetIds);
        investorBreakdown.by_type = byType.map((r) => ({
            type: r.type,
            count: Number(r.count),
            total_units: Number(r.total_units),
        }));
        const byJurisdiction = await query(`SELECT i.jurisdiction, COUNT(DISTINCT i.id) as count, COALESCE(SUM(h.units), 0) as total_units
       FROM holdings h JOIN investors i ON h.investor_id = i.id
       WHERE h.asset_id IN (${placeholders}) AND h.units > 0
       GROUP BY i.jurisdiction ORDER BY total_units DESC`, assetIds);
        investorBreakdown.by_jurisdiction = byJurisdiction.map((r) => ({
            jurisdiction: r.jurisdiction,
            count: Number(r.count),
            total_units: Number(r.total_units),
        }));
        const byKyc = await query(`SELECT COALESCE(i.kyc_status, 'unknown') as status, COUNT(DISTINCT i.id) as count
       FROM holdings h JOIN investors i ON h.investor_id = i.id
       WHERE h.asset_id IN (${placeholders}) AND h.units > 0
       GROUP BY i.kyc_status ORDER BY count DESC`, assetIds);
        investorBreakdown.by_kyc_status = byKyc.map((r) => ({
            status: r.status,
            count: Number(r.count),
        }));
        const kycExpiring = await query(`SELECT DISTINCT i.id as investor_id, i.name as investor_name, i.kyc_expiry
       FROM holdings h JOIN investors i ON h.investor_id = i.id
       WHERE h.asset_id IN (${placeholders}) AND h.units > 0
         AND i.kyc_expiry IS NOT NULL
         AND i.kyc_expiry <= NOW() + INTERVAL '90 days'
       ORDER BY i.kyc_expiry`, assetIds);
        investorBreakdown.kyc_expiring_within_90_days = kycExpiring.map((r) => ({
            investor_id: r.investor_id,
            investor_name: r.investor_name,
            kyc_expiry: r.kyc_expiry,
        }));
    }
    // 5. Onboarding pipeline
    let onboardingPipeline = { total: 0, by_status: [], recent: [] };
    if (assetIds.length > 0) {
        const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(',');
        const obByStatus = await query(`SELECT status, COUNT(*) as count
       FROM onboarding_records
       WHERE asset_id IN (${placeholders})
       GROUP BY status ORDER BY count DESC`, assetIds);
        onboardingPipeline.by_status = obByStatus.map((r) => ({
            status: r.status,
            count: Number(r.count),
        }));
        onboardingPipeline.total = onboardingPipeline.by_status.reduce((s, r) => s + r.count, 0);
        const obRecent = await query(`SELECT ob.id, i.name as investor_name, a.name as asset_name,
              ob.status, ob.requested_units, ob.applied_at
       FROM onboarding_records ob
       JOIN investors i ON ob.investor_id = i.id
       JOIN assets a ON ob.asset_id = a.id
       WHERE ob.asset_id IN (${placeholders})
       ORDER BY ob.applied_at DESC LIMIT 10`, assetIds);
        onboardingPipeline.recent = obRecent.map((r) => ({
            id: r.id,
            investor_name: r.investor_name,
            asset_name: r.asset_name,
            status: r.status,
            requested_units: r.requested_units,
            applied_at: r.applied_at,
        }));
    }
    // 6. Recent decisions
    let recentDecisions = [];
    if (assetIds.length > 0) {
        const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(',');
        const decisions = await query(`SELECT id, decision_type, result, subject_id, asset_id, decided_at, decided_by, result_details
       FROM decision_records
       WHERE asset_id IN (${placeholders})
       ORDER BY decided_at DESC LIMIT 20`, assetIds);
        recentDecisions = decisions.map((d) => {
            let violationCount = 0;
            if (d.result_details) {
                const details = typeof d.result_details === 'string'
                    ? JSON.parse(d.result_details)
                    : d.result_details;
                violationCount = details.violation_count || 0;
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
    }
    // 7. Risk flags
    const riskFlags = [];
    // Flag: fund not active
    if (fund.status !== 'active') {
        riskFlags.push({
            severity: 'high',
            category: 'fund_status',
            message: `Fund status is '${fund.status}' — not accepting new investments`,
        });
    }
    // Flag: KYC expiring soon
    if (investorBreakdown.kyc_expiring_within_90_days.length > 0) {
        riskFlags.push({
            severity: 'medium',
            category: 'kyc_expiry',
            message: `${investorBreakdown.kyc_expiring_within_90_days.length} investor(s) have KYC expiring within 90 days`,
        });
    }
    // Flag: high concentration (single investor > 25%)
    if (assetIds.length > 0) {
        const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(',');
        const concentration = await query(`SELECT i.name, SUM(h.units) as total_units
       FROM holdings h JOIN investors i ON h.investor_id = i.id
       WHERE h.asset_id IN (${placeholders}) AND h.units > 0
       GROUP BY i.id, i.name
       HAVING SUM(h.units)::numeric / NULLIF($${assetIds.length + 1}::numeric, 0) > 0.25
       ORDER BY total_units DESC`, [...assetIds, totalUnits]);
        concentration.forEach((c) => {
            const pct = ((Number(c.total_units) / totalUnits) * 100).toFixed(1);
            riskFlags.push({
                severity: 'medium',
                category: 'concentration',
                message: `${c.name} holds ${pct}% of total fund units (above 25% threshold)`,
            });
        });
    }
    // Flag: pending onboarding applications
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
    // Flag: rejected decisions in last 30 days
    const recentRejections = recentDecisions.filter(d => d.result === 'rejected');
    if (recentRejections.length > 0) {
        riskFlags.push({
            severity: 'low',
            category: 'recent_rejections',
            message: `${recentRejections.length} rejection(s) in recent decisions — review for patterns`,
        });
    }
    // Unique investors across all assets
    let totalInvestors = 0;
    if (assetIds.length > 0) {
        const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(',');
        const invCount = await query(`SELECT COUNT(DISTINCT investor_id) as count FROM holdings WHERE asset_id IN (${placeholders}) AND units > 0`, assetIds);
        totalInvestors = Number(invCount[0]?.count || 0);
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
//# sourceMappingURL=compliance-report-service.js.map