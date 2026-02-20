'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import type { ScenarioResult, RulePackInfo } from '../../../lib/types';
import Link from 'next/link';
import { BackLink } from '../../../components/back-link';
import { DetailBreadcrumb } from '../../../components/breadcrumb';
import {
  Card,
  MetricCard,
  Badge,
  Button,
  Alert,
  Modal,
  Select,
  RiskFlagCard,
  UtilizationBar,
  SectionHeader,
  LoadingSpinner,
  ErrorMessage,
} from '../../../components/ui';
import { InvestorTypeDonut, JurisdictionExposureBar, KycExpiryHorizon } from '../../../components/charts';
import { formatNumber, formatDate, formatDateTime, titleCase } from '../../../lib/utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function FundDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isValidFundId = UUID_RE.test(id);

  // Rule Pack state
  const [rulePackOpen, setRulePackOpen] = useState(false);
  const [rulePackLoading, setRulePackLoading] = useState(false);
  const [rulePackMsg, setRulePackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rulePacks, setRulePacks] = useState<RulePackInfo[]>([]);
  const [selectedPack, setSelectedPack] = useState('');
  const [rulePackApplied, setRulePackApplied] = useState(0);

  const openRulePackModal = useCallback(async () => {
    setRulePackOpen(true);
    setRulePackMsg(null);
    try {
      const packs = await api.getRulePacks();
      setRulePacks(packs);
    } catch {
      // silently fail — user can still see the modal
    }
  }, []);

  const handleApplyRulePack = useCallback(async () => {
    setRulePackLoading(true);
    setRulePackMsg(null);
    try {
      const result = await api.applyRulePack(id, selectedPack || undefined);
      setRulePackMsg({ type: 'success', text: `Applied "${result.rule_pack}" — ${result.criteria_created} criteria created for ${result.legal_form}.` });
      setRulePackApplied(prev => prev + 1);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to apply rule pack';
      setRulePackMsg({ type: 'error', text: msg });
    } finally {
      setRulePackLoading(false);
    }
  }, [id, selectedPack]);

  // Scenario modeling state
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioMinInvestment, setScenarioMinInvestment] = useState('');
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  const runScenario = useCallback(async () => {
    if (!id) return;
    setScenarioLoading(true);
    try {
      const proposedChanges: Parameters<typeof api.analyzeScenarioImpact>[0]['proposed_changes'] = {};
      if (scenarioMinInvestment) {
        proposedChanges.minimum_investment = Math.round(parseFloat(scenarioMinInvestment) * 100);
      }
      const result = await api.analyzeScenarioImpact({ fund_structure_id: id, proposed_changes: proposedChanges });
      setScenarioResult(result);
    } catch (err) {
      console.error('Scenario analysis failed:', err);
    } finally {
      setScenarioLoading(false);
    }
  }, [id, scenarioMinInvestment]);

  const fund = useAsync(
    () => (isValidFundId ? api.getFundStructure(id) : Promise.reject(new Error('INVALID_FUND_ID'))),
    [id, isValidFundId]
  );
  const report = useAsync(
    () => (isValidFundId ? api.getComplianceReport(id) : Promise.resolve(null)),
    [id, isValidFundId, rulePackApplied]
  );

  const fundNotFound =
    !isValidFundId ||
    (!!fund.error &&
      (fund.error.toLowerCase().includes('not found') ||
        fund.error.includes('INVALID_FUND_ID')));

  if (fundNotFound) {
    return (
      <div>
        <div className="mb-6">
          <BackLink href="/funds" label="Back to Fund Structures" />
        </div>
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-ink">Fund not found</p>
            <p className="mt-1 text-sm text-ink-secondary">
              The fund id <span className="font-mono">{id}</span> does not exist.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (fund.loading || report.loading) {
    return (
      <div>
        <div className="mb-6">
          <BackLink href="/funds" label="Back to Fund Structures" />
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (fund.error) {
    return (
      <div>
        <div className="mb-6">
          <BackLink href="/funds" label="Back to Fund Structures" />
        </div>
        <ErrorMessage message={fund.error} onRetry={fund.refetch} />
      </div>
    );
  }

  if (!fund.data) return null;

  const f = fund.data;
  const r = report.data;

  // Derive KYC segment data from investor breakdown
  const kycSegments = r ? {
    verified: r.investor_breakdown.by_kyc_status.find(s => s.status === 'verified')?.count ?? 0,
    pending: r.investor_breakdown.by_kyc_status.find(s => s.status === 'pending')?.count ?? 0,
    expired: r.investor_breakdown.by_kyc_status.find(s => s.status === 'expired')?.count ?? 0,
    expiring_soon: r.investor_breakdown.kyc_expiring_within_90_days.length,
  } : null;

  return (
    <div>
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <DetailBreadcrumb items={[{ label: 'Funds', href: '/funds' }, { label: f.name }]} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-semibold tracking-tight text-ink">{f.name}</h1>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="gray">{f.legal_form}</Badge>
              <Badge variant="gray">{f.domicile}</Badge>
              {f.regulatory_framework && <Badge variant="green">{f.regulatory_framework}</Badge>}
              <Badge variant={f.status === 'active' ? 'green' : 'gray'}>{f.status}</Badge>
              {f.sfdr_classification && f.sfdr_classification !== 'not_classified' && (
                <Badge variant={f.sfdr_classification === 'article_9' ? 'green' : f.sfdr_classification === 'article_8' ? 'yellow' : 'gray'}>
                  SFDR {f.sfdr_classification.replace('article_', 'Art. ')}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={openRulePackModal}>
              Apply Rule Pack
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                try { await api.downloadAnnexIVXml(id); } catch { /* silent */ }
              }}
            >
              Annex IV XML
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                try { await api.downloadEvidenceBundle(id); } catch { /* silent */ }
              }}
            >
              Evidence Bundle
            </Button>
            {r && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try { await api.downloadComplianceReportPdf(id); } catch { /* silent */ }
                }}
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Fund Info */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">AIFM</p>
            <p className="mt-0.5 text-sm text-ink">{f.aifm_name || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">AIFM LEI</p>
            <p className="mt-0.5 text-sm font-mono text-ink">{f.aifm_lei || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Inception</p>
            <p className="mt-0.5 text-sm text-ink">{f.inception_date ? formatDate(f.inception_date) : '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Currency</p>
            <p className="mt-0.5 text-sm text-ink">{f.currency}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">SFDR</p>
            <p className="mt-0.5 text-sm text-ink">{f.sfdr_classification ? f.sfdr_classification.replace('article_', 'Article ').replace('not_classified', 'Not classified') : 'Not classified'}</p>
          </div>
        </div>
      </Card>

      {report.error && (
        <ErrorMessage message={report.error} onRetry={report.refetch} />
      )}

      {r && (
        <>
          {/* Metrics */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Total Investors"
              value={r.fund.total_investors}
              sub="Across all assets"
              accent="default"
            />
            <MetricCard
              label="Total AUM"
              value={formatNumber(r.fund.total_aum_units)}
              sub="Total units"
              accent="default"
            />
            <MetricCard
              label="Allocated"
              value={formatNumber(r.fund.total_allocated_units)}
              sub={`${r.fund.utilization_pct.toFixed(1)}% utilized`}
              accent="success"
            />
            <MetricCard
              label="Assets"
              value={r.fund.assets.length}
              sub={`${r.fund.assets.length} asset${r.fund.assets.length !== 1 ? 's' : ''} in fund`}
              accent="default"
            />
          </div>

          {/* Risk Flags */}
          {r.risk_flags.length > 0 && (
            <div className="mb-6">
              <SectionHeader title="Risk Flags" description={`${r.risk_flags.length} flag${r.risk_flags.length !== 1 ? 's' : ''} detected`} />
              <div className="space-y-2">
                {r.risk_flags.map((flag, i) => (
                  <RiskFlagCard key={i} severity={flag.severity} category={flag.category} message={flag.message} />
                ))}
              </div>
            </div>
          )}

          {r.risk_flags.length === 0 && (
            <div className="mb-6">
              <div className="rounded-xl border border-accent-500/20 bg-accent-500/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent-500/100" />
                  <p className="text-sm font-medium text-accent-200">All Clear</p>
                </div>
                <p className="mt-1 text-sm text-accent-300">No risk flags detected for this fund structure.</p>
              </div>
            </div>
          )}

          {/* Assets */}
          <div className="mb-6">
            <SectionHeader title="Assets" />
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-edge">
                    <tr className="border-b border-edge">
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Name</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Total Units</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Allocated</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Utilization</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Holders</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge-subtle">
                    {r.fund.assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-ink">{asset.name}</td>
                        <td className="px-6 py-3"><Badge variant="gray">{asset.asset_type}</Badge></td>
                        <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">{formatNumber(asset.total_units)}</td>
                        <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">{formatNumber(asset.allocated_units)}</td>
                        <td className="px-6 py-3 w-40">
                          <UtilizationBar allocated={asset.allocated_units} total={asset.total_units} />
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">{asset.holder_count}</td>
                        <td className="px-6 py-3">
                          <Link href={`/holdings?asset=${asset.id}&fund=${id}&fundName=${encodeURIComponent(f.name)}`} className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                            Cap Table →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Eligibility Criteria */}
          {r.eligibility_criteria.length > 0 && (
            <div className="mb-6">
              <SectionHeader title="Eligibility Criteria" description="Configured investor eligibility rules" />
              <Card padding={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-edge">
                      <tr className="border-b border-edge">
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Investor Type</th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Jurisdiction</th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Min Investment (EUR)</th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Suitability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge-subtle">
                      {r.eligibility_criteria.map((c, i) => (
                        <tr key={i} className="hover:bg-bg-tertiary transition-colors">
                          <td className="px-6 py-3 text-sm text-ink">{c.investor_type}</td>
                          <td className="px-6 py-3 text-sm text-ink">{c.jurisdiction}</td>
                          <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">{formatNumber(c.minimum_investment_eur)}</td>
                          <td className="px-6 py-3">
                            <Badge variant={c.suitability_required ? 'yellow' : 'green'}>
                              {c.suitability_required ? 'Required' : 'Not required'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Investor Breakdown - Charts */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InvestorTypeDonut data={r.investor_breakdown.by_type} />
            <JurisdictionExposureBar data={r.investor_breakdown.by_jurisdiction} />
          </div>

          {/* KYC Status - Segmented Bar + Expiring Soon */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {kycSegments && <KycExpiryHorizon data={kycSegments} />}

            {r.investor_breakdown.kyc_expiring_within_90_days.length > 0 && (
              <div>
                <SectionHeader title="KYC Expiring Soon" description="Within 90 days" />
                <Card padding={false}>
                  <div className="divide-y divide-edge-subtle">
                    {r.investor_breakdown.kyc_expiring_within_90_days.map((inv) => (
                      <div key={inv.investor_id} className="flex items-center justify-between px-6 py-3">
                        <span className="text-sm text-ink">{inv.investor_name}</span>
                        <span className="text-xs tabular-nums text-red-400">{formatDate(inv.kyc_expiry)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Onboarding Pipeline */}
          {r.onboarding_pipeline.total > 0 && (
            <div className="mb-6">
              <SectionHeader title="Onboarding Pipeline" description={`${r.onboarding_pipeline.total} total application${r.onboarding_pipeline.total !== 1 ? 's' : ''}`} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card padding={false}>
                  <div className="divide-y divide-edge-subtle">
                    {r.onboarding_pipeline.by_status.map((row) => {
                      const statusBadge = row.status === 'approved' || row.status === 'allocated' ? 'green'
                        : row.status === 'rejected' || row.status === 'ineligible' ? 'red'
                        : row.status === 'applied' || row.status === 'eligible' ? 'yellow'
                        : 'gray';
                      return (
                        <div key={row.status} className="flex items-center justify-between px-6 py-3">
                          <Badge variant={statusBadge}>{row.status}</Badge>
                          <span className="text-sm tabular-nums text-ink">{row.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
                <Card padding={false}>
                  <div className="divide-y divide-edge-subtle">
                    {r.onboarding_pipeline.recent.map((rec) => (
                      <div key={rec.id} className="px-6 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-ink">{rec.investor_name}</span>
                          <Badge variant={rec.status === 'approved' || rec.status === 'allocated' ? 'green' : rec.status === 'rejected' ? 'red' : 'yellow'}>
                            {rec.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          {rec.asset_name} &middot; {formatNumber(rec.requested_units)} units &middot; {formatDate(rec.applied_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Recent Decisions */}
          {r.recent_decisions.length > 0 && (
            <div className="mb-6">
              <SectionHeader title="Recent Decisions" />
              <Card padding={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-edge">
                      <tr className="border-b border-edge">
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Time</th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Result</th>
                        <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Violations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge-subtle">
                      {r.recent_decisions.map((d) => {
                        const resultVariant = d.result === 'approved' || d.result === 'pass'
                          ? 'green'
                          : d.result === 'rejected' || d.result === 'fail'
                          ? 'red'
                          : 'gray';
                        return (
                          <tr key={d.id} className="hover:bg-bg-tertiary transition-colors">
                            <td className="px-6 py-3 text-xs tabular-nums text-ink-secondary">
                              {formatDateTime(d.decided_at)}
                            </td>
                            <td className="px-6 py-3 text-sm text-ink">
                              {titleCase(d.decision_type)}
                            </td>
                            <td className="px-6 py-3">
                              <Badge variant={resultVariant}>{d.result}</Badge>
                            </td>
                            <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">
                              {d.violation_count === 0 ? 'All passed' : `${d.violation_count} violation${d.violation_count !== 1 ? 's' : ''}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Scenario Modeling */}
          <Card>
            <div className="flex items-center justify-between">
              <SectionHeader title="Scenario Modeling" description="What-if analysis for eligibility criteria changes" />
              <Button variant={scenarioOpen ? 'secondary' : 'primary'} size="sm" onClick={() => setScenarioOpen(!scenarioOpen)}>
                {scenarioOpen ? 'Close' : '🔮 Run Scenario'}
              </Button>
            </div>

            {scenarioOpen && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-ink-secondary mb-1">New Minimum Investment (€)</label>
                    <input
                      type="number"
                      value={scenarioMinInvestment}
                      onChange={(e) => setScenarioMinInvestment(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/30"
                    />
                  </div>
                  <Button variant="primary" size="sm" onClick={runScenario} disabled={scenarioLoading || !scenarioMinInvestment}>
                    {scenarioLoading ? 'Analyzing...' : 'Analyze Impact'}
                  </Button>
                </div>

                {scenarioResult && (
                  <div className="space-y-4 mt-4">
                    {/* Impact summary */}
                    <div className={`rounded-lg border p-4 ${scenarioResult.newly_ineligible > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                      <p className="text-sm font-medium text-ink">{scenarioResult.impact_summary}</p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-edge-subtle p-3 text-center">
                        <div className="text-2xl font-bold text-ink tabular-nums">{scenarioResult.total_investors_analyzed}</div>
                        <div className="text-[10px] text-ink-tertiary uppercase tracking-wide">Analyzed</div>
                      </div>
                      <div className="rounded-lg border border-edge-subtle p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-600 tabular-nums">{scenarioResult.proposed_eligible}</div>
                        <div className="text-[10px] text-ink-tertiary uppercase tracking-wide">Would Pass</div>
                      </div>
                      <div className="rounded-lg border border-edge-subtle p-3 text-center">
                        <div className="text-2xl font-bold text-red-500 tabular-nums">{scenarioResult.newly_ineligible}</div>
                        <div className="text-[10px] text-ink-tertiary uppercase tracking-wide">Newly At Risk</div>
                      </div>
                      <div className="rounded-lg border border-edge-subtle p-3 text-center">
                        <div className="text-2xl font-bold text-amber-600 tabular-nums">{scenarioResult.percentage_at_risk}%</div>
                        <div className="text-[10px] text-ink-tertiary uppercase tracking-wide">Units At Risk</div>
                      </div>
                    </div>

                    {/* Affected investors */}
                    {scenarioResult.affected_investors.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-ink mb-2">Affected Investors</p>
                        <div className="rounded-lg border border-edge-subtle overflow-hidden">
                          <table className="w-full text-left">
                            <thead className="border-b border-edge">
                              <tr>
                                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Name</th>
                                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Units</th>
                                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Status Change</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-edge-subtle">
                              {scenarioResult.affected_investors.map((inv) => (
                                <tr key={inv.investor_id} className="hover:bg-bg-tertiary/50">
                                  <td className="px-4 py-2 text-sm text-ink">{inv.investor_name}</td>
                                  <td className="px-4 py-2 text-xs text-ink-secondary">{inv.investor_type}</td>
                                  <td className="px-4 py-2 text-xs tabular-nums text-ink-secondary">{formatNumber(inv.current_units)}</td>
                                  <td className="px-4 py-2">
                                    <Badge variant={inv.proposed_eligible ? 'green' : 'red'}>
                                      {inv.current_eligible ? 'Eligible' : 'Ineligible'} → {inv.proposed_eligible ? 'Eligible' : 'Ineligible'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-ink-tertiary">Decision recorded as ID: {scenarioResult.decision_record_id.substring(0, 8)}...</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Rule Pack Modal */}
      <Modal open={rulePackOpen} onClose={() => { setRulePackOpen(false); setRulePackMsg(null); }} title="Apply AIFMD II Rule Pack">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Select a pre-configured regulatory rule pack to apply to <span className="font-medium text-ink">{f.name}</span>.
            This will replace existing eligibility criteria and update rules for all assets.
          </p>

          <Select
            label="Rule Pack"
            value={selectedPack}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedPack(e.target.value); setRulePackMsg(null); }}
            options={[
              { value: '', label: `Auto-detect from legal form (${f.legal_form})` },
              ...rulePacks.map(p => ({ value: p.legal_form, label: `${p.name} — ${p.description}` })),
            ]}
          />

          {rulePackMsg && (
            <Alert variant={rulePackMsg.type === 'success' ? 'success' : 'error'}>{rulePackMsg.text}</Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setRulePackOpen(false); setRulePackMsg(null); }}>Cancel</Button>
            <Button onClick={handleApplyRulePack} disabled={rulePackLoading}>
              {rulePackLoading ? 'Applying...' : 'Apply Rule Pack'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

