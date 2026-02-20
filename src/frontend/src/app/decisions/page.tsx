'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import type { DecisionExplanation } from '../../lib/types';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Badge,
  SkeletonTable,
  ErrorMessage,
  EmptyState,
  SectionHeader,
  Alert,
  ExportMenu,
} from '../../components/ui';
import { exportCSV } from '../../lib/export-csv';
import { formatDateTime, classNames, titleCase } from '../../lib/utils';
import { Pagination, usePagination } from '../../components/pagination';
import type { DecisionRecord } from '../../lib/types';
import { useI18n } from '../../lib/i18n';

function useDecisionTypeOptions() {
  const { t } = useI18n();
  return [
    { value: '', label: t('decisions.allTypes') },
    { value: 'transfer_validation', label: t('decisions.type.transferValidation') },
    { value: 'eligibility_check', label: t('decisions.type.eligibilityCheck') },
    { value: 'onboarding_approval', label: t('decisions.type.onboardingApproval') },
  ];
}

function useResultOptions() {
  const { t } = useI18n();
  return [
    { value: '', label: t('decisions.allResults') },
    { value: 'approved', label: t('decisions.approved') },
    { value: 'rejected', label: t('decisions.rejected') },
    { value: 'simulated', label: t('decisions.type.simulated') },
  ];
}

function resultBadgeVariant(result: string): 'green' | 'red' | 'gray' | 'yellow' {
  if (result === 'approved' || result === 'pass') return 'green';
  if (result === 'rejected' || result === 'fail') return 'red';
  if (result === 'simulated') return 'yellow';
  return 'gray';
}

export default function DecisionsPage() {
  const { t } = useI18n();
  const DECISION_TYPE_OPTIONS = useDecisionTypeOptions();
  const RESULT_OPTIONS = useResultOptions();
  const [filterType, setFilterType] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<DecisionRecord | null>(null);
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  const [explainError, setExplainError] = useState<string | null>(null);

  const handleExplain = useCallback(async (decisionId: string) => {
    setExplainLoading(true);
    setExplainError(null);
    try {
      const result = await api.explainDecision(decisionId);
      setExplanation(result);
    } catch (err) {
      console.error('Failed to explain decision:', err);
      setExplainError('Unable to generate explanation. Please try again.');
    } finally {
      setExplainLoading(false);
    }
  }, []);
  const [chainResult, setChainResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const decisions = useAsync(() => api.getDecisions({ limit: 200 }));

  const filtered = useMemo(() => {
    if (!decisions.data?.decisions) return [];
    let result = decisions.data.decisions;
    if (filterType) result = result.filter(d => d.decision_type === filterType);
    if (filterResult) result = result.filter(d => d.result === filterResult);
    return result;
  }, [decisions.data, filterType, filterResult]);

  const { page, setPage, paginated: paginatedDecisions, total: paginatedTotal, perPage } = usePagination(filtered, 25);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyDecisionChain(100);
      setChainResult({ valid: result.valid, message: result.message });
    } catch {
      setChainResult({ valid: false, message: 'Chain verification failed — could not reach backend.' });
    } finally {
      setVerifying(false);
    }
  };

  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportEvidence = async (d: DecisionRecord) => {
    setExportError(null);
    try {
      await api.downloadDecisionEvidenceBundle(d.id);
    } catch (err) {
      const message = (err as Error)?.message || 'Failed to generate evidence PDF';
      setExportError(message);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('decisions.decisionProvenance')}
        description={t('decisions.provenanceDesc')}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleVerifyChain}
              disabled={verifying}
            >
              {verifying ? 'Verifying...' : '🔗 Verify Chain Integrity'}
            </Button>
            <ExportMenu
              onExportCSV={() => {
                if (!filtered.length) return;
                exportCSV('caelith-decisions.csv',
                  ['ID', 'Type', 'Result', 'Violations', 'Decided By', 'Decided At'],
                  filtered.map(d => [
                    d.id,
                    d.decision_type,
                    d.result,
                    String(d.result_details?.violation_count ?? 0),
                    d.decided_by_name || d.decided_by || 'System',
                    d.decided_at,
                  ])
                );
              }}
            />
          </div>
        }
      />

      {/* Chain integrity result */}
      {chainResult && (
        <div className="mb-4">
          <Alert variant={chainResult.valid ? 'success' : 'error'}>
            {chainResult.message}
          </Alert>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[200px]">
            <Select
              label="Decision Type"
              value={filterType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
              options={DECISION_TYPE_OPTIONS}
            />
          </div>
          <div className="w-[160px]">
            <Select
              label="Result"
              value={filterResult}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterResult(e.target.value)}
              options={RESULT_OPTIONS}
            />
          </div>
          {(filterType || filterResult) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterType(''); setFilterResult(''); }}>
              Clear
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-tertiary">
          Showing {filtered.length} of {decisions.data?.total ?? 0} decisions
        </p>
      </Card>

      {/* Decisions Table */}
      {decisions.loading ? (
        <SkeletonTable rows={10} />
      ) : decisions.error ? (
        <ErrorMessage message={decisions.error} onRetry={decisions.refetch} />
      ) : filtered.length > 0 ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="border-b border-edge">
              <tr>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Time</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Result</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Checks</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Decided By</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Seq</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {paginatedDecisions.map((d) => {
                const violations = d.result_details?.violation_count ?? 0;
                const totalChecks = d.result_details?.checks?.length ?? 0;
                return (
                  <tr
                    key={d.id}
                    className="transition-colors hover:bg-bg-tertiary cursor-pointer"
                    onClick={() => { setSelectedDecision(d); setExplanation(null); }}
                  >
                    <td className="px-5 py-3 text-xs tabular-nums text-ink-secondary">
                      {formatDateTime(d.decided_at)}
                    </td>
                    <td className="px-5 py-3 text-sm text-ink">
                      {titleCase(d.decision_type)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={resultBadgeVariant(d.result)}>{d.result}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-ink-secondary">
                      {violations === 0
                        ? <span className="text-emerald-600">{totalChecks} passed</span>
                        : <span className="text-red-400">{violations} of {totalChecks} failed</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-sm text-ink-secondary">
                      {d.decided_by_name || 'System'}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-ink-tertiary">
                      {d.sequence_number != null ? `#${d.sequence_number}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedDecision(d); }}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div className="px-4">
            <Pagination total={paginatedTotal} page={page} perPage={perPage} onPageChange={setPage} />
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No decisions found"
          description={filterType || filterResult ? 'Try adjusting your filters.' : 'Compliance decisions will appear here as transfers and eligibility checks are processed.'}
        />
      )}

      {/* Decision Detail Slide-Out */}
      {selectedDecision && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDecision(null)} />
          <div className="ml-auto relative z-10 w-full md:max-w-xl h-full bg-bg-secondary shadow-xl border-l border-edge overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-bg-secondary px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Decision Record</h2>
                <p className="text-xs text-ink-tertiary font-mono">{selectedDecision.id.substring(0, 8)}…</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleExportEvidence(selectedDecision)}>
                  Export PDF
                </Button>
                {exportError && (
                  <span className="text-[10px] text-red-400 max-w-[180px] truncate" title={exportError}>
                    Export failed
                  </span>
                )}
                <button
                  onClick={() => setSelectedDecision(null)}
                  className="rounded-lg p-1 text-ink-tertiary hover:bg-bg-tertiary hover:text-ink transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-1">Type</p>
                  <p className="text-sm font-medium text-ink">{titleCase(selectedDecision.decision_type)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-1">Result</p>
                  <Badge variant={resultBadgeVariant(selectedDecision.result)}>{selectedDecision.result}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-1">Decided By</p>
                  <p className="text-sm text-ink">{selectedDecision.decided_by_name || 'System (automated)'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-1">Timestamp</p>
                  <p className="text-sm tabular-nums text-ink">{formatDateTime(selectedDecision.decided_at)}</p>
                </div>
              </div>

              {/* Chain integrity */}
              {selectedDecision.sequence_number != null && (
                <div className="rounded-lg border border-edge-subtle bg-bg-tertiary px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-ink-tertiary">Chain Position:</span>
                    <span className="text-xs font-mono text-ink">#{selectedDecision.sequence_number}</span>
                  </div>
                  {selectedDecision.integrity_hash && (
                    <p className="mt-1 text-[10px] font-mono text-ink-muted break-all">
                      Hash: {selectedDecision.integrity_hash}
                    </p>
                  )}
                </div>
              )}

              {/* Per-Rule Check Results */}
              <div>
                <SectionHeader title="Compliance Checks" description="Per-rule pass/fail with explanations" />
                {selectedDecision.result_details?.checks?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDecision.result_details.checks.map((check, i) => (
                      <div
                        key={i}
                        className={classNames(
                          'flex items-start gap-3 rounded-lg px-4 py-3 text-sm',
                          check.passed
                            ? 'bg-emerald-500/5 border border-emerald-500/10'
                            : 'bg-red-500/5 border border-red-500/10'
                        )}
                      >
                        <span className="mt-0.5 flex-shrink-0">
                          {check.passed ? (
                            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={classNames(
                            'text-xs font-semibold uppercase tracking-wide',
                            check.passed ? 'text-emerald-600' : 'text-red-500'
                          )}>
                            {check.rule.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-secondary">{check.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-secondary">No detailed check data available.</p>
                )}
              </div>

              {/* AI Explanation */}
              <div>
                {!explanation ? (
                  <>
                    <button
                      onClick={() => handleExplain(selectedDecision.id)}
                      disabled={explainLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#24364A]/20 bg-[#24364A]/5 px-4 py-3 text-sm font-medium text-[#24364A] transition-all hover:bg-[#24364A]/10 disabled:opacity-50"
                    >
                      {explainLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#24364A]/30 border-t-[#24364A]" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          Explain This Decision
                        </>
                      )}
                    </button>
                    {explainError && (
                      <p className="mt-2 text-sm text-red-600">{explainError}</p>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <SectionHeader title="AI Explanation" description="Regulatory context and recommendation" />

                    {/* Summary */}
                    <div className="rounded-lg border border-[#24364A]/15 bg-[#24364A]/5 p-4">
                      <p className="text-sm font-medium text-ink">{explanation.summary}</p>
                    </div>

                    {/* Enriched checks with regulatory basis */}
                    <div className="space-y-2">
                      {explanation.checks.map((check, i) => (
                        <div key={i} className="rounded-lg border border-edge-subtle p-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5">
                              {check.passed ? (
                                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-ink">{check.rule.replace(/_/g, ' ')}</p>
                              <p className="mt-0.5 text-xs text-ink-secondary">{check.explanation}</p>
                              {check.regulatory_basis && (
                                <p className="mt-1 text-[10px] font-mono text-[#24364A]/60 bg-[#24364A]/5 rounded px-1.5 py-0.5 inline-block">
                                  📖 {check.regulatory_basis}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recommendation */}
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Recommendation</p>
                      <p className="text-xs text-emerald-600">{explanation.recommendation}</p>
                    </div>

                    {/* Trust actions */}
                    <div className="flex items-center gap-2">
                      <Button variant="primary" size="sm" onClick={() => handleExportEvidence(selectedDecision)}>
                        Download Evidence Bundle
                      </Button>
                      {exportError && (
                        <span className="text-xs text-red-400">{exportError}</span>
                      )}
                    </div>

                    {/* AI-generated disclaimer */}
                    <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-[10px] text-amber-600/80 italic leading-relaxed">
                          {explanation.disclaimer}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Snapshot */}
              {selectedDecision.input_snapshot && Object.keys(selectedDecision.input_snapshot).length > 0 && (
                <div>
                  <SectionHeader title="Input Snapshot" description="Exact data at decision time" />
                  <div className="rounded-lg border border-edge-subtle bg-bg-tertiary p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-ink-secondary whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedDecision.input_snapshot, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Rule Version Snapshot */}
              {selectedDecision.rule_version_snapshot && Object.keys(selectedDecision.rule_version_snapshot).length > 0 && (
                <div>
                  <SectionHeader title="Rule Version Snapshot" description="Exact rules that applied at decision time" />
                  <div className="rounded-lg border border-edge-subtle bg-bg-tertiary p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-ink-secondary whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedDecision.rule_version_snapshot, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <p className="text-xs text-amber-600">
                  This decision record is protected by a cryptographic integrity chain (SHA-256). Any modification to the record or its chain position is detectable. This provides tamper-evidence suitable for audit purposes. For regulatory inquiries, export the evidence bundle as PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
