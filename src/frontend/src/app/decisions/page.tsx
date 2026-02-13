'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { PageHeader, Card, Badge, Button, Select, MetricCard, LoadingSpinner, ErrorMessage, EmptyState } from '../../components/ui';
import { formatDateTime, formatNumber, classNames } from '../../lib/utils';
import type { DecisionRecord, DecisionChainVerificationResult } from '../../lib/types';

/* ── SHA-256 hash computation ─────────────────────────── */

/* ── Filter options ───────────────────────────────────── */

const typeOptions = [
  { value: '', label: 'All types' },
  { value: 'transfer_validation', label: 'Transfer Validation' },
  { value: 'eligibility_check', label: 'Eligibility Check' },
  { value: 'onboarding_approval', label: 'Onboarding Approval' },
  { value: 'scenario_analysis', label: 'Scenario Analysis' },
];

const resultOptions = [
  { value: '', label: 'All results' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'simulated', label: 'Simulated' },
];

/* ── Regulatory citation map ──────────────────────────── */

const RULE_CITATIONS: Record<string, string> = {
  investor_type_eligible: 'AIFMD Art. 4(1)(ag) — investor categorisation',
  minimum_investment: 'AIFMD Art. 43(1) — marketing to retail investors',
  kyc_valid: 'AMLD5 Art. 13 — customer due diligence',
  kyc_not_expired: 'AMLD5 Art. 14(5) — ongoing monitoring',
  fund_status: 'AIFMD Art. 7 — authorisation conditions',
  suitability_required: 'MiFID II Art. 25(2) — suitability assessment',
  fund_exists: 'AIFMD Art. 7 — authorisation conditions',
};

/* ── Badge variant helper ─────────────────────────────── */

function resultBadgeVariant(result: string): 'green' | 'red' | 'gray' {
  if (result === 'approved') return 'green';
  if (result === 'rejected') return 'red';
  return 'gray';
}

/* ── Border color helper ──────────────────────────────── */

function resultBorderClass(result: string): string {
  if (result === 'approved') return 'border-l-accent-500';
  if (result === 'rejected') return 'border-l-red-500';
  return 'border-l-edge-strong';
}

/* ── Decision type label helper ───────────────────────── */

function formatDecisionType(type: string): string {
  return type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/* ── Page ─────────────────────────────────────────────── */

export default function DecisionAuditTrailPage() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<DecisionChainVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  /* ── Fetch decisions ──────────────────────────────── */

  const fetchDecisions = async (currentOffset: number, append: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const params: { decision_type?: string; result?: string; limit: number; offset: number } = {
        limit,
        offset: currentOffset,
      };
      if (typeFilter) params.decision_type = typeFilter;
      if (resultFilter) params.result = resultFilter;

      const data = await api.getDecisions(params);
      setDecisions(prev => append ? [...prev, ...data.decisions] : data.decisions);
      setTotal(data.total);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to load decisions';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    fetchDecisions(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, resultFilter]);

  /* ── Compute hashes ───────────────────────────────── */

  /* ── Load more ────────────────────────────────────── */

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchDecisions(newOffset, true);
  };

  /* ── Copy hash ────────────────────────────────────── */

  const copyHash = async (hash: string | null | undefined, id: string) => {
    if (!hash) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(hash);
    } else {
      const ta = document.createElement('textarea');
      ta.value = hash;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyDecisionChain();
      setChainStatus(result);
    } catch {
      setChainStatus({
        valid: false,
        total_verified: 0,
        message: 'Verification failed',
      });
    } finally {
      setVerifying(false);
    }
  };

  /* ── Stats ────────────────────────────────────────── */

  const approvedCount = decisions.filter(d => d.result === 'approved').length;
  const rejectedCount = decisions.filter(d => d.result === 'rejected').length;
  const simulatedCount = decisions.filter(d => d.result === 'simulated').length;

  /* ── Toggle expanded ──────────────────────────────── */

  const toggleExpanded = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      {/* A. Page Header */}
      <PageHeader
        title="Decision Audit Trail"
        description="Immutable provenance chain - every compliance decision recorded"
        action={
          <Button onClick={handleVerifyChain} disabled={verifying} variant="secondary" size="sm">
            {verifying ? 'Verifying...' : 'Verify Chain'}
          </Button>
        }
      />
      {chainStatus && (
        <div
          className={classNames(
            'mb-4 rounded-lg border px-4 py-3 text-sm',
            chainStatus.valid
              ? 'border-accent-500/20 bg-accent-500/10 text-accent-200'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          )}
        >
          {chainStatus.valid ? 'Valid:' : 'Invalid:'} {chainStatus.message}
          {chainStatus.valid ? ` (${chainStatus.total_verified} records)` : ''}
        </div>
      )}

      {/* B. Filter bar */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="w-56">
            <Select
              label="Decision Type"
              options={typeOptions}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            />
          </div>
          <div className="w-56">
            <Select
              label="Result"
              options={resultOptions}
              value={resultFilter}
              onChange={e => setResultFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* C. Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total" value={formatNumber(total)} />
        <MetricCard label="Approved" value={formatNumber(approvedCount)} accent="success" />
        <MetricCard label="Rejected" value={formatNumber(rejectedCount)} accent="danger" />
        <MetricCard label="Simulated" value={formatNumber(simulatedCount)} />
      </div>

      {/* D. Decision cards list */}
      {loading && decisions.length === 0 ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} onRetry={() => fetchDecisions(0, false)} />
      ) : decisions.length === 0 ? (
        <EmptyState
          title="No decisions found"
          description="No compliance decisions match the current filters."
        />
      ) : (
        <div className="space-y-4">
          {decisions.map((d, index) => {
            const hash = d.integrity_hash || '';
            const isExpanded = expanded[d.id] || false;
            const seqNumber = String(d.sequence_number ?? index + 1).padStart(4, '0');

            return (
              <div
                key={d.id}
                className={classNames(
                  'rounded-xl border border-edge bg-bg-secondary p-5 border-l-[3px]',
                  resultBorderClass(d.result)
                )}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-ink">#{seqNumber}</span>
                    <Badge variant={resultBadgeVariant(d.result)}>{d.result}</Badge>
                    <span className="text-sm text-ink-secondary">{formatDecisionType(d.decision_type)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ink-tertiary">
                    {/* Lock icon */}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span className="text-xs tabular-nums">{formatDateTime(d.decided_at)}</span>
                  </div>
                </div>

                {/* Hash row */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">SHA-256</span>
                  <span className="font-mono text-xs text-ink-secondary">
                    {hash ? `${hash.substring(0, 16)}...` : '...'}
                  </span>
                  <button
                    onClick={() => copyHash(hash, d.id)}
                    className="rounded p-0.5 text-ink-tertiary hover:text-ink transition-colors"
                    title="Copy full hash"
                  >
                    {copiedId === d.id ? (
                      <svg className="h-3.5 w-3.5 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Previous hash chain reference */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-mono text-[10px] text-ink-tertiary">prev:</span>
                  <span className="font-mono text-[10px] text-ink-tertiary">
                    {d.previous_hash && d.previous_hash !== '0000000000000000000000000000000000000000000000000000000000000000'
                      ? `${d.previous_hash.substring(0, 12)}...`
                      : '000000000000...'}
                  </span>
                </div>

                {/* Body */}
                <div className="mt-3">
                  <p className="text-sm font-semibold text-ink">
                    {d.asset_name || 'Unknown Asset'}
                  </p>

                  {/* Checks list */}
                  {d.result_details?.checks && d.result_details.checks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {d.result_details.checks.map((check, i) => {
                        const citation = RULE_CITATIONS[check.rule];
                        return (
                          <div key={i}>
                            <div className="flex items-start gap-1.5 text-sm">
                              {check.passed ? (
                                <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              ) : (
                                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span className="text-ink-secondary">
                                <span className="font-medium text-ink">{check.rule}</span> — {check.message}
                              </span>
                            </div>
                            {!check.passed && citation && (
                              <p className="ml-[22px] mt-0.5 text-xs font-mono text-ink-tertiary">
                                {citation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(d.decided_by_name || d.decided_by_email || d.decided_by) && (
                    <p className="mt-2 text-xs text-ink-tertiary">
                      Decided by:{' '}
                      <span className="font-medium text-ink-secondary">
                        {d.decided_by_name || d.decided_by_email || d.decided_by}
                      </span>
                      {d.decided_by_name && d.decided_by_email && (
                        <span className="text-ink-tertiary"> ({d.decided_by_email})</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Expandable provenance section */}
                <div className="mt-3 border-t border-edge pt-3">
                  <button
                    onClick={() => toggleExpanded(d.id)}
                    className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink transition-colors"
                  >
                    <svg
                      className={classNames('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    Show raw provenance
                  </button>
                  {isExpanded && (
                    <pre className="mt-2 font-mono text-xs bg-bg-tertiary rounded-lg border border-edge p-4 overflow-x-auto text-ink-secondary">
                      {JSON.stringify(
                        {
                          input_snapshot: d.input_snapshot ?? {},
                          rule_version_snapshot: d.rule_version_snapshot ?? {},
                        },
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination: Load more */}
          {decisions.length < total && (
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : `Load more (${decisions.length} of ${formatNumber(total)})`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
