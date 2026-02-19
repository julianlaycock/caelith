/**
 * Annex IV Routes — AIFMD Annex IV Report Generation & XML Export
 */

import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { generateAnnexIVReport, type AnnexIVReport } from '../services/annex-iv-service.js';

const router = express.Router();

/** GET /api/reports/annex-iv/:fundStructureId — JSON report */
router.get('/:fundStructureId', asyncHandler(async (req, res) => {
  const { fundStructureId } = req.params;
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;
  const period = start && end ? { start, end } : undefined;
  const report = await generateAnnexIVReport(fundStructureId, period);
  res.json(report);
}));

/** GET /api/reports/annex-iv/:fundStructureId/xml — XML download */
router.get('/:fundStructureId/xml', asyncHandler(async (req, res) => {
  const { fundStructureId } = req.params;
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;
  const period = start && end ? { start, end } : undefined;
  const report = await generateAnnexIVReport(fundStructureId, period);
  const xml = serializeAnnexIVToXml(report);

  const filename = `annex-iv-${fundStructureId.substring(0, 8)}-${report.aif_identification.reporting_period.end}.xml`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(xml);
}));

export default router;

// ── XML Serializer ──────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name: string, value: string | number | boolean | null | undefined, attrs?: Record<string, string>): string {
  if (value === null || value === undefined) return `<${name}/>`;
  const attrStr = attrs ? ' ' + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ') : '';
  return `<${name}${attrStr}>${escapeXml(String(value))}</${name}>`;
}

function serializeAnnexIVToXml(report: AnnexIVReport): string {
  const id = report.aif_identification;
  const ic = report.investor_concentration;
  const pe = report.principal_exposures;
  const lev = report.leverage;
  const risk = report.risk_profile;
  const cs = report.compliance_status;

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<AIFReportingInfo xmlns="urn:esma:aifmd:reporting" reportVersion="1.0">');
  lines.push('  <AIFRecordInfo>');

  // Section 1: AIF Identification
  lines.push('    <AIFIdentification>');
  lines.push(`      ${tag('ReportingPeriodStart', id.reporting_period.start)}`);
  lines.push(`      ${tag('ReportingPeriodEnd', id.reporting_period.end)}`);
  lines.push(`      ${tag('AIFName', id.aif_name)}`);
  lines.push(`      ${tag('AIFNationalCode', id.aif_national_code)}`);
  lines.push(`      ${tag('AIFType', id.aif_type)}`);
  lines.push(`      ${tag('AIFDomicile', id.domicile)}`);
  lines.push(`      ${tag('InceptionDate', id.inception_date)}`);
  lines.push(`      ${tag('AIFMName', id.aifm_name)}`);
  lines.push(`      ${tag('AIFMLEI', id.aifm_lei)}`);
  lines.push(`      ${tag('ReportingObligation', id.reporting_obligation)}`);
  lines.push(`      ${tag('BaseCurrency', id.base_currency)}`);
  lines.push('    </AIFIdentification>');

  // Section 2: Investor Concentration
  lines.push('    <InvestorConcentration>');
  lines.push(`      ${tag('TotalInvestors', ic.total_investors)}`);
  lines.push('      <InvestorsByType>');
  for (const t of ic.by_type) {
    lines.push(`        <InvestorType type="${escapeXml(t.investor_type)}" count="${t.count}" percentageOfNAV="${t.percentage_of_nav}"/>`);
  }
  lines.push('      </InvestorsByType>');
  lines.push('      <InvestorsByDomicile>');
  for (const d of ic.by_domicile) {
    lines.push(`        <InvestorDomicile domicile="${escapeXml(d.domicile)}" count="${d.count}" percentageOfNAV="${d.percentage_of_nav}"/>`);
  }
  lines.push('      </InvestorsByDomicile>');
  lines.push(`      ${tag('Top5InvestorConcentrationPct', ic.beneficial_owners_concentration.top_5_investors_pct)}`);
  lines.push('    </InvestorConcentration>');

  // Section 3: Principal Exposures
  lines.push('    <PrincipalExposures>');
  lines.push(`      ${tag('TotalAUMUnits', pe.total_aum_units)}`);
  lines.push(`      ${tag('TotalAllocatedUnits', pe.total_allocated_units)}`);
  lines.push(`      ${tag('UtilizationPct', pe.utilization_pct)}`);
  lines.push('      <AssetBreakdown>');
  for (const a of pe.asset_breakdown) {
    lines.push(`        <Asset name="${escapeXml(a.asset_name)}" type="${escapeXml(a.asset_type)}" units="${a.units}" pctOfTotal="${a.percentage_of_total}"/>`);
  }
  lines.push('      </AssetBreakdown>');
  lines.push('    </PrincipalExposures>');

  // Section 4: Leverage
  lines.push('    <Leverage>');
  lines.push(`      ${tag('CommitmentMethod', lev.commitment_method)}`);
  lines.push(`      ${tag('GrossMethod', lev.gross_method)}`);
  lines.push(`      ${tag('CommitmentLimit', lev.commitment_limit)}`);
  lines.push(`      ${tag('GrossLimit', lev.gross_limit)}`);
  lines.push(`      ${tag('LeverageCompliant', lev.leverage_compliant)}`);
  lines.push('    </Leverage>');

  // Section 5: Risk Profile
  lines.push('    <RiskProfile>');
  lines.push('      <Liquidity>');
  lines.push(`        ${tag('InvestorRedemptionFrequency', risk.liquidity.investor_redemption_frequency)}`);
  if (risk.liquidity.portfolio_liquidity_profile.length > 0) {
    lines.push('        <PortfolioLiquidityProfile>');
    for (const b of risk.liquidity.portfolio_liquidity_profile) {
      lines.push(`          <Bucket period="${escapeXml(b.bucket)}" pct="${b.pct}"/>`);
    }
    lines.push('        </PortfolioLiquidityProfile>');
  }
  if (risk.liquidity.liquidity_management_tools.length > 0) {
    lines.push('        <LiquidityManagementTools>');
    for (const t of risk.liquidity.liquidity_management_tools) {
      lines.push(`          <Tool type="${escapeXml(t.type)}" active="${t.active}">${escapeXml(t.description)}</Tool>`);
    }
    lines.push('        </LiquidityManagementTools>');
  }
  lines.push('      </Liquidity>');
  lines.push('      <Operational>');
  lines.push(`        ${tag('TotalOpenRiskFlags', risk.operational.total_open_risk_flags)}`);
  lines.push(`        ${tag('HighSeverityFlags', risk.operational.high_severity_flags)}`);
  lines.push('      </Operational>');
  lines.push('    </RiskProfile>');

  // Section 6: Geographic Focus
  if (report.geographic_focus.length > 0) {
    lines.push('    <GeographicFocus>');
    for (const g of report.geographic_focus) {
      lines.push(`      <Region name="${escapeXml(g.region)}" pct="${g.pct}"/>`);
    }
    lines.push('    </GeographicFocus>');
  }

  // Section 7: Counterparty Risk
  if (report.counterparty_risk.top_5_counterparties.length > 0) {
    lines.push('    <CounterpartyRisk>');
    lines.push(`      ${tag('TotalCounterpartyCount', report.counterparty_risk.total_counterparty_count)}`);
    for (const cp of report.counterparty_risk.top_5_counterparties) {
      const lei = cp.lei ? ` lei="${escapeXml(cp.lei)}"` : '';
      lines.push(`      <Counterparty name="${escapeXml(cp.name)}"${lei} exposurePct="${cp.exposure_pct}"/>`);
    }
    lines.push('    </CounterpartyRisk>');
  }

  // Section 8: Compliance Status
  lines.push('    <ComplianceStatus>');
  lines.push(`      ${tag('KYCCoveragePct', cs.kyc_coverage_pct)}`);
  lines.push(`      ${tag('EligibleInvestorPct', cs.eligible_investor_pct)}`);
  lines.push(`      ${tag('RecentViolations', cs.recent_violations)}`);
  lines.push(`      ${tag('LastComplianceCheck', cs.last_compliance_check)}`);
  lines.push('    </ComplianceStatus>');

  // Metadata
  lines.push(`    ${tag('GeneratedAt', report.generated_at)}`);
  lines.push(`    ${tag('ReportVersion', report.report_version)}`);
  lines.push(`    ${tag('Disclaimer', report.disclaimer)}`);

  lines.push('  </AIFRecordInfo>');
  lines.push('</AIFReportingInfo>');

  return lines.join('\n');
}
