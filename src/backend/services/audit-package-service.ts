/**
 * Audit Package Service
 * 
 * Generates a comprehensive WP-ready (Wirtschaftsprüfer) audit package per fund:
 * - Fund overview + compliance score
 * - All compliance decisions with SHA-256 verification chain
 * - Investor KYC status summary
 * - Rule execution history (pass/fail)
 * - Transfer approval chain
 * - Risk flag timeline
 * - Document verification status
 * - Regulatory deadline compliance
 */

import { queryInTenantContext, DEFAULT_TENANT_ID } from '../db.js';
import { generateComplianceReport } from './compliance-report-service.js';
import { logger } from '../lib/logger.js';

// ─── Types ───────────────────────────────────────────────────────────

export interface AuditPackageData {
  generatedAt: string;
  fund: {
    id: string;
    name: string;
    legalForm: string;
    domicile: string;
    regulatoryFramework: string;
    sfdrClassification: string;
    status: string;
    aifmName: string | null;
    aifmLei: string | null;
    inceptionDate: string | null;
    currency: string;
  };
  compliance: {
    overallScore: number;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    riskFlags: Array<{ severity: string; category: string; message: string }>;
  };
  decisions: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    records: Array<{
      id: string;
      type: string;
      result: string;
      decidedAt: string;
      integrityHash: string | null;
      previousHash: string;
      checks: Array<{ rule: string; passed: boolean; message: string }>;
    }>;
    chainValid: boolean;
  };
  investors: {
    total: number;
    byKycStatus: Record<string, number>;
    byType: Record<string, number>;
    expiredKyc: Array<{ id: string; name: string; kycExpiry: string; kycStatus: string }>;
    records: Array<{
      id: string;
      name: string;
      type: string;
      jurisdiction: string;
      kycStatus: string;
      kycExpiry: string | null;
      accredited: boolean;
    }>;
  };
  transfers: {
    total: number;
    byStatus: Record<string, number>;
    records: Array<{
      id: string;
      fromInvestor: string;
      toInvestor: string;
      units: number;
      status: string;
      executedAt: string;
      assetName: string;
    }>;
  };
  rules: {
    activeRules: number;
    compositeRules: Array<{
      name: string;
      severity: string;
      enabled: boolean;
      jurisdiction: string | null;
    }>;
  };
  documents: {
    total: number;
    byStatus: Record<string, number>;
    expiringSoon: Array<{
      investorName: string;
      documentType: string;
      expiryDate: string;
      status: string;
    }>;
  };
  integrityChain: {
    totalDecisions: number;
    chainIntact: boolean;
    firstHash: string | null;
    lastHash: string | null;
    brokenLinks: string[];
  };
}

// ─── Data Queries ────────────────────────────────────────────────────

interface DecisionRow {
  id: string;
  decision_type: string;
  result: string;
  decided_at: string;
  integrity_hash: string | null;
  previous_hash: string;
  result_details: string | object;
}

interface InvestorRow {
  id: string;
  name: string;
  investor_type: string;
  jurisdiction: string;
  kyc_status: string;
  kyc_expiry: string | null;
  accredited: boolean;
}

interface TransferRow {
  id: string;
  from_name: string;
  to_name: string;
  units: number;
  status: string;
  executed_at: string;
  asset_name: string;
}

interface RuleRow {
  name: string;
  severity: string;
  enabled: boolean;
  jurisdiction: string | null;
}

interface DocRow {
  investor_name: string;
  document_type: string;
  expiry_date: string;
  status: string;
}

interface DocStatusRow {
  status: string;
  count: number;
}

export async function generateAuditPackage(
  fundStructureId: string,
  tenantId: string = DEFAULT_TENANT_ID
): Promise<AuditPackageData> {
  // 1. Get compliance report (reuse existing service)
  const report = await generateComplianceReport(fundStructureId);

  // 2. Get all decisions for this fund's assets
  const decisions = await queryInTenantContext<DecisionRow>(
    `SELECT dr.id, dr.decision_type, dr.result, dr.decided_at,
            dr.integrity_hash, dr.previous_hash, dr.result_details
     FROM decision_records dr
     JOIN assets a ON dr.asset_id = a.id
     WHERE a.fund_structure_id = $1 AND dr.tenant_id = $2
     ORDER BY dr.sequence_number ASC`,
    [fundStructureId, tenantId],
    tenantId
  );

  // 3. Verify integrity chain
  const brokenLinks: string[] = [];
  let chainIntact = true;
  for (let i = 1; i < decisions.length; i++) {
    if (decisions[i].previous_hash !== decisions[i - 1].integrity_hash) {
      chainIntact = false;
      brokenLinks.push(decisions[i].id);
    }
  }

  // 4. Get investors holding assets in this fund
  const investors = await queryInTenantContext<InvestorRow>(
    `SELECT DISTINCT i.id, i.name, i.investor_type, i.jurisdiction,
            i.kyc_status, i.kyc_expiry, i.accredited
     FROM investors i
     JOIN holdings h ON h.investor_id = i.id
     JOIN assets a ON h.asset_id = a.id
     WHERE a.fund_structure_id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL
     ORDER BY i.name`,
    [fundStructureId, tenantId],
    tenantId
  );

  // 5. Get transfers
  const transfers = await queryInTenantContext<TransferRow>(
    `SELECT t.id,
            fi.name as from_name, ti.name as to_name,
            t.units, t.status, t.executed_at, a.name as asset_name
     FROM transfers t
     JOIN investors fi ON t.from_investor_id = fi.id
     JOIN investors ti ON t.to_investor_id = ti.id
     JOIN assets a ON t.asset_id = a.id
     WHERE a.fund_structure_id = $1 AND t.tenant_id = $2
     ORDER BY t.executed_at DESC`,
    [fundStructureId, tenantId],
    tenantId
  );

  // 6. Get active composite rules
  const rules = await queryInTenantContext<RuleRow>(
    `SELECT cr.name, cr.severity, cr.enabled, cr.jurisdiction
     FROM composite_rules cr
     JOIN assets a ON cr.asset_id = a.id
     WHERE a.fund_structure_id = $1 AND cr.tenant_id = $2
     ORDER BY cr.severity DESC, cr.name`,
    [fundStructureId, tenantId],
    tenantId
  );

  // 7. Get document stats for fund investors
  const docStats = await queryInTenantContext<DocStatusRow>(
    `SELECT d.status, COUNT(*)::int as count
     FROM investor_documents d
     JOIN investors i ON d.investor_id = i.id
     JOIN holdings h ON h.investor_id = i.id
     JOIN assets a ON h.asset_id = a.id
     WHERE a.fund_structure_id = $1 AND d.tenant_id = $2
     GROUP BY d.status`,
    [fundStructureId, tenantId],
    tenantId
  );

  const expDocs = await queryInTenantContext<DocRow>(
    `SELECT i.name as investor_name, d.document_type, d.expiry_date, d.status
     FROM investor_documents d
     JOIN investors i ON d.investor_id = i.id
     JOIN holdings h ON h.investor_id = i.id
     JOIN assets a ON h.asset_id = a.id
     WHERE a.fund_structure_id = $1 AND d.tenant_id = $2
       AND d.expiry_date IS NOT NULL
       AND d.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
     ORDER BY d.expiry_date ASC`,
    [fundStructureId, tenantId],
    tenantId
  );

  // ─── Assemble ────────────────────────────────────────────────────

  const kycStatusMap: Record<string, number> = {};
  const typeMap: Record<string, number> = {};
  const expiredKyc: AuditPackageData['investors']['expiredKyc'] = [];

  for (const inv of investors) {
    kycStatusMap[inv.kyc_status] = (kycStatusMap[inv.kyc_status] || 0) + 1;
    typeMap[inv.investor_type] = (typeMap[inv.investor_type] || 0) + 1;
    if (inv.kyc_status === 'expired' || (inv.kyc_expiry && new Date(inv.kyc_expiry) < new Date())) {
      expiredKyc.push({
        id: inv.id,
        name: inv.name,
        kycExpiry: inv.kyc_expiry ? new Date(inv.kyc_expiry).toISOString().slice(0, 10) : 'N/A',
        kycStatus: inv.kyc_status,
      });
    }
  }

  const transferStatusMap: Record<string, number> = {};
  for (const t of transfers) {
    const s = t.status || 'executed';
    transferStatusMap[s] = (transferStatusMap[s] || 0) + 1;
  }

  const docStatusMap: Record<string, number> = {};
  for (const d of docStats) {
    docStatusMap[d.status] = d.count;
  }

  const decisionRecords = decisions.map(d => {
    const details = typeof d.result_details === 'string'
      ? JSON.parse(d.result_details) as { checks?: Array<{ rule: string; passed: boolean; message: string }> }
      : d.result_details as { checks?: Array<{ rule: string; passed: boolean; message: string }> };

    return {
      id: d.id,
      type: d.decision_type,
      result: d.result,
      decidedAt: new Date(d.decided_at).toISOString(),
      integrityHash: d.integrity_hash,
      previousHash: d.previous_hash,
      checks: details?.checks || [],
    };
  });

  const approved = decisionRecords.filter(d => d.result === 'approved').length;
  const rejected = decisionRecords.filter(d => d.result === 'rejected').length;
  const pending = decisionRecords.filter(d => d.result === 'pending').length;

  const f = report.fund;

  return {
    generatedAt: new Date().toISOString(),
    fund: {
      id: fundStructureId,
      name: f.name,
      legalForm: f.legal_form,
      domicile: f.domicile,
      regulatoryFramework: f.regulatory_framework,
      sfdrClassification: (f as Record<string, unknown>).sfdr_classification as string || 'not_classified',
      status: f.status,
      aifmName: f.aifm_name || null,
      aifmLei: f.aifm_lei || null,
      inceptionDate: f.inception_date || null,
      currency: f.currency,
    },
    compliance: {
      overallScore: report.compliance_score,
      totalChecks: report.risk_flags.length + (report.compliance_score === 100 ? 1 : 0),
      passedChecks: report.compliance_score === 100 ? 1 : 0,
      failedChecks: report.risk_flags.length,
      riskFlags: report.risk_flags,
    },
    decisions: {
      total: decisionRecords.length,
      approved,
      rejected,
      pending,
      records: decisionRecords,
      chainValid: chainIntact,
    },
    investors: {
      total: investors.length,
      byKycStatus: kycStatusMap,
      byType: typeMap,
      expiredKyc,
      records: investors.map(i => ({
        id: i.id,
        name: i.name,
        type: i.investor_type,
        jurisdiction: i.jurisdiction,
        kycStatus: i.kyc_status,
        kycExpiry: i.kyc_expiry ? new Date(i.kyc_expiry).toISOString().slice(0, 10) : null,
        accredited: i.accredited,
      })),
    },
    transfers: {
      total: transfers.length,
      byStatus: transferStatusMap,
      records: transfers.map(t => ({
        id: t.id,
        fromInvestor: t.from_name,
        toInvestor: t.to_name,
        units: Number(t.units),
        status: t.status || 'executed',
        executedAt: new Date(t.executed_at).toISOString(),
        assetName: t.asset_name,
      })),
    },
    rules: {
      activeRules: rules.filter(r => r.enabled).length,
      compositeRules: rules.map(r => ({
        name: r.name,
        severity: r.severity,
        enabled: r.enabled,
        jurisdiction: r.jurisdiction,
      })),
    },
    documents: {
      total: Object.values(docStatusMap).reduce((a, b) => a + b, 0),
      byStatus: docStatusMap,
      expiringSoon: expDocs.map(d => ({
        investorName: d.investor_name,
        documentType: d.document_type.replace(/_/g, ' '),
        expiryDate: new Date(d.expiry_date).toISOString().slice(0, 10),
        status: d.status,
      })),
    },
    integrityChain: {
      totalDecisions: decisions.length,
      chainIntact,
      firstHash: decisions[0]?.integrity_hash || null,
      lastHash: decisions[decisions.length - 1]?.integrity_hash || null,
      brokenLinks,
    },
  };
}
