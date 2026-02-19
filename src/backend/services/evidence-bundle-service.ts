/**
 * Evidence Bundle Service — Audit Evidence Package for Regulatory Inspections
 *
 * Compiles all compliance data for a fund within a date range into
 * a structured evidence package suitable for CSSF inspections.
 */

import { query } from '../db.js';
import { NotFoundError } from '../errors.js';
import { generateComplianceReport } from './compliance-report-service.js';
import { generateAnnexIVReport } from './annex-iv-service.js';

export interface EvidenceBundleOptions {
  fundStructureId: string;
  startDate?: string;
  endDate?: string;
}

export interface EvidenceBundleItem {
  filename: string;
  content_type: string;
  data: unknown;
}

export interface EvidenceBundle {
  fund_name: string;
  fund_id: string;
  generated_at: string;
  reporting_period: { start: string; end: string };
  items: EvidenceBundleItem[];
  summary: {
    total_decisions: number;
    total_investors: number;
    total_rules: number;
    total_eligibility_criteria: number;
  };
}

export async function generateEvidenceBundle(
  options: EvidenceBundleOptions
): Promise<EvidenceBundle> {
  const { fundStructureId } = options;
  const now = new Date();
  const endDate = options.endDate || now.toISOString().split('T')[0];
  const startDate = options.startDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

  // 1. Fund structure
  const funds = await query<{ id: string; name: string; legal_form: string; domicile: string }>(
    'SELECT id, name, legal_form, domicile FROM fund_structures WHERE id = $1',
    [fundStructureId]
  );
  if (funds.length === 0) throw new NotFoundError('Fund structure', fundStructureId);
  const fund = funds[0];

  // 2. Assets in fund
  const assets = await query<{ id: string; name: string }>(
    'SELECT id, name FROM assets WHERE fund_structure_id = $1',
    [fundStructureId]
  );
  const assetIds = assets.map(a => a.id);

  // 3. Decision records for those assets in the date range
  let decisions: Record<string, unknown>[] = [];
  if (assetIds.length > 0) {
    const ph = assetIds.map((_, i) => `$${i + 1}`).join(',');
    decisions = await query<Record<string, unknown>>(
      `SELECT dr.*, u.name as decided_by_name, u.email as decided_by_email
       FROM decision_records dr
       LEFT JOIN users u ON dr.decided_by = u.id
       WHERE dr.asset_id IN (${ph})
         AND dr.decided_at >= $${assetIds.length + 1}
         AND dr.decided_at <= $${assetIds.length + 2}
       ORDER BY dr.sequence_number ASC`,
      [...assetIds, startDate, endDate + 'T23:59:59.999Z']
    );
  }

  // Also include decisions by subject (investor-level, no asset)
  const subjectDecisions = await query<Record<string, unknown>>(
    `SELECT dr.*, u.name as decided_by_name, u.email as decided_by_email
     FROM decision_records dr
     LEFT JOIN users u ON dr.decided_by = u.id
     WHERE dr.asset_id IS NULL
       AND dr.decided_at >= $1
       AND dr.decided_at <= $2
     ORDER BY dr.sequence_number ASC`,
    [startDate, endDate + 'T23:59:59.999Z']
  );
  const allDecisions = [...decisions, ...subjectDecisions];

  // 4. Investors associated with the fund (via holdings)
  let investors: Record<string, unknown>[] = [];
  if (assetIds.length > 0) {
    const ph = assetIds.map((_, i) => `$${i + 1}`).join(',');
    investors = await query<Record<string, unknown>>(
      `SELECT DISTINCT i.id, i.name, i.jurisdiction, i.investor_type,
              i.kyc_status, i.kyc_expiry, i.lei, i.tax_id, i.email,
              i.accredited, i.created_at
       FROM investors i
       JOIN holdings h ON h.investor_id = i.id
       WHERE h.asset_id IN (${ph}) AND h.units > 0
       ORDER BY i.name`,
      assetIds
    );
  }

  // 5. Eligibility criteria
  const criteria = await query<Record<string, unknown>>(
    `SELECT * FROM eligibility_criteria
     WHERE fund_structure_id = $1
     ORDER BY jurisdiction, investor_type`,
    [fundStructureId]
  );

  // 6. Rules for each asset
  let rules: Record<string, unknown>[] = [];
  if (assetIds.length > 0) {
    const ph = assetIds.map((_, i) => `$${i + 1}`).join(',');
    rules = await query<Record<string, unknown>>(
      `SELECT r.*, a.name as asset_name FROM rules r
       JOIN assets a ON a.id = r.asset_id
       WHERE r.asset_id IN (${ph})`,
      assetIds
    );
  }

  // 7. Composite rules
  let compositeRules: Record<string, unknown>[] = [];
  if (assetIds.length > 0) {
    const ph = assetIds.map((_, i) => `$${i + 1}`).join(',');
    compositeRules = await query<Record<string, unknown>>(
      `SELECT cr.*, a.name as asset_name FROM composite_rules cr
       JOIN assets a ON a.id = cr.asset_id
       WHERE cr.asset_id IN (${ph})`,
      assetIds
    );
  }

  // 8. Compliance report snapshot
  let complianceReport: unknown = null;
  try {
    complianceReport = await generateComplianceReport(fundStructureId);
  } catch { /* non-fatal */ }

  // 9. Annex IV report snapshot
  let annexIV: unknown = null;
  try {
    annexIV = await generateAnnexIVReport(fundStructureId, { start: startDate, end: endDate });
  } catch { /* non-fatal */ }

  // Build evidence bundle
  const items: EvidenceBundleItem[] = [
    {
      filename: 'decision-records.json',
      content_type: 'application/json',
      data: allDecisions,
    },
    {
      filename: 'investor-registry.json',
      content_type: 'application/json',
      data: investors,
    },
    {
      filename: 'eligibility-criteria.json',
      content_type: 'application/json',
      data: criteria,
    },
    {
      filename: 'rules-configuration.json',
      content_type: 'application/json',
      data: { built_in_rules: rules, composite_rules: compositeRules },
    },
  ];

  if (complianceReport) {
    items.push({
      filename: 'compliance-report.json',
      content_type: 'application/json',
      data: complianceReport,
    });
  }

  if (annexIV) {
    items.push({
      filename: 'annex-iv-report.json',
      content_type: 'application/json',
      data: annexIV,
    });
  }

  return {
    fund_name: fund.name,
    fund_id: fund.id,
    generated_at: now.toISOString(),
    reporting_period: { start: startDate, end: endDate },
    items,
    summary: {
      total_decisions: allDecisions.length,
      total_investors: investors.length,
      total_rules: rules.length + compositeRules.length,
      total_eligibility_criteria: criteria.length,
    },
  };
}
