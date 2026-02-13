'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import {
  Card,
  MetricCard,
  Badge,
  SectionHeader,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
} from '../../../components/ui';
import { formatNumber, formatDate, formatDateTime } from '../../../lib/utils';
import type { Holding, Asset, DecisionRecord, OnboardingRecord } from '../../../lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function daysUntilExpiry(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { days, label: `${Math.abs(days)}d overdue`, urgency: 'expired' as const };
  if (days <= 30) return { days, label: `${days}d`, urgency: 'critical' as const };
  if (days <= 90) return { days, label: `${days}d`, urgency: 'warning' as const };
  return { days, label: `${days}d`, urgency: 'ok' as const };
}

export default function InvestorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isValid = UUID_RE.test(id);

  const investor = useAsync(
    () => (isValid ? api.getInvestor(id) : Promise.reject(new Error('INVALID_ID'))),
    [id, isValid]
  );
  const holdings = useAsync(
    () => (isValid ? api.getHoldingsByInvestor(id) : Promise.resolve([] as Holding[])),
    [id, isValid]
  );
  const assets = useAsync(
    () => (isValid ? api.getAssets() : Promise.resolve([] as Asset[])),
    [id, isValid]
  );
  const decisions = useAsync(
    () => (isValid ? api.getDecisionsByInvestor(id) : Promise.resolve([] as DecisionRecord[])),
    [id, isValid]
  );
  const onboarding = useAsync(
    () => (isValid ? api.getOnboardingRecords({ investor_id: id }) : Promise.resolve([] as OnboardingRecord[])),
    [id, isValid]
  );

  const backLink = (
    <div className="mb-6">
      <Link href="/investors" className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors">
        &larr; Back to Investors
      </Link>
    </div>
  );

  const notFound =
    !isValid ||
    (!!investor.error &&
      (investor.error.toLowerCase().includes('not found') || investor.error.includes('INVALID_ID')));

  if (notFound) {
    return (
      <div>
        {backLink}
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-ink">Investor not found</p>
            <p className="mt-1 text-sm text-ink-secondary">
              The investor id <span className="font-mono">{id}</span> does not exist.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (investor.loading) {
    return (
      <div>
        {backLink}
        <LoadingSpinner />
      </div>
    );
  }

  if (investor.error) {
    return (
      <div>
        {backLink}
        <ErrorMessage message={investor.error} onRetry={investor.refetch} />
      </div>
    );
  }

  if (!investor.data) return null;

  const inv = investor.data;
  const expiry = daysUntilExpiry(inv.kyc_expiry);

  // Build asset lookup map
  const assetMap = new Map((assets.data ?? []).map(a => [a.id, a]));

  const kycVariant = inv.kyc_status === 'verified' ? 'green' : inv.kyc_status === 'expired' ? 'red' : 'yellow';
  const kycAccent = inv.kyc_status === 'verified' ? 'success' : inv.kyc_status === 'expired' ? 'danger' : 'warning';

  const expiryAccent = !expiry ? 'default'
    : expiry.urgency === 'ok' ? 'success'
    : expiry.urgency === 'warning' ? 'warning'
    : 'danger';

  return (
    <div>
      {backLink}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{inv.name}</h1>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <Badge variant="gray">{inv.jurisdiction}</Badge>
          <Badge variant="gray">{inv.investor_type.replace(/_/g, ' ')}</Badge>
          <Badge variant={kycVariant}>{inv.kyc_status}</Badge>
          <Badge variant={inv.accredited ? 'green' : 'yellow'}>
            {inv.accredited ? 'Accredited' : 'Non-Accredited'}
          </Badge>
        </div>
        {(inv.email || inv.lei || inv.tax_id) && (
          <div className="mt-2 flex items-center gap-4 text-xs text-ink-tertiary">
            {inv.email && <span>{inv.email}</span>}
            {inv.lei && <span className="font-mono">LEI: {inv.lei}</span>}
            {inv.tax_id && <span className="font-mono">Tax ID: {inv.tax_id}</span>}
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="KYC Status"
          value={inv.kyc_status}
          sub={inv.kyc_status === 'verified' ? 'Identity verified' : inv.kyc_status === 'expired' ? 'Renewal required' : 'Awaiting verification'}
          accent={kycAccent}
        />
        <MetricCard
          label="KYC Expiry"
          value={expiry ? expiry.label : '—'}
          sub={inv.kyc_expiry ? formatDate(inv.kyc_expiry) : 'No expiry set'}
          accent={expiryAccent}
        />
        <MetricCard
          label="Holdings"
          value={holdings.data?.length ?? '—'}
          sub={holdings.loading ? 'Loading...' : `${holdings.data?.length ?? 0} position${(holdings.data?.length ?? 0) !== 1 ? 's' : ''}`}
          accent="default"
        />
        <MetricCard
          label="Accreditation"
          value={inv.accredited ? 'Yes' : 'No'}
          sub={inv.accredited ? 'Accredited investor' : 'Non-accredited'}
          accent={inv.accredited ? 'success' : 'warning'}
        />
      </div>

      {/* Holdings Table */}
      <div className="mb-6">
        <SectionHeader title="Holdings" description={holdings.data ? `${holdings.data.length} holding${holdings.data.length !== 1 ? 's' : ''}` : undefined} />
        {holdings.loading ? (
          <LoadingSpinner />
        ) : holdings.error ? (
          <ErrorMessage message={holdings.error} onRetry={holdings.refetch} />
        ) : holdings.data && holdings.data.length > 0 ? (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Asset</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Units</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Fund</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Acquired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {holdings.data.map((h) => {
                    const asset = assetMap.get(h.asset_id);
                    return (
                      <tr key={h.id} className="hover:bg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-ink">
                          {asset?.name ?? <span className="font-mono text-ink-tertiary">{h.asset_id.substring(0, 8)}</span>}
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums font-mono text-ink-secondary">
                          {formatNumber(h.units)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">
                          {asset?.fund_structure_id ? (
                            <Link href={`/funds/${asset.fund_structure_id}`} className="text-accent-400 hover:text-accent-300">
                              View Fund
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">
                          {formatDate(h.acquired_at || h.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState title="No holdings" description="This investor has no holdings yet." />
          </Card>
        )}
      </div>

      {/* Decision History */}
      <div className="mb-6">
        <SectionHeader title="Decision History" description={decisions.data ? `${decisions.data.length} decision${decisions.data.length !== 1 ? 's' : ''}` : undefined} />
        {decisions.loading ? (
          <LoadingSpinner />
        ) : decisions.error ? (
          <ErrorMessage message={decisions.error} onRetry={decisions.refetch} />
        ) : decisions.data && decisions.data.length > 0 ? (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Time</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Result</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Violations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {decisions.data.slice(0, 20).map((d) => {
                    const resultVariant = d.result === 'approved' ? 'green' : d.result === 'rejected' ? 'red' : 'gray';
                    const violationCount = d.result_details?.violation_count ?? 0;
                    return (
                      <tr key={d.id} className="hover:bg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-xs tabular-nums text-ink-secondary">
                          {formatDateTime(d.decided_at)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink">
                          {d.decision_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={resultVariant}>{d.result}</Badge>
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">
                          {violationCount === 0 ? 'All passed' : `${violationCount} violation${violationCount !== 1 ? 's' : ''}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState title="No decisions" description="No decision records found for this investor." />
          </Card>
        )}
      </div>

      {/* Onboarding Records */}
      <div className="mb-6">
        <SectionHeader title="Onboarding Records" description={onboarding.data ? `${onboarding.data.length} record${onboarding.data.length !== 1 ? 's' : ''}` : undefined} />
        {onboarding.loading ? (
          <LoadingSpinner />
        ) : onboarding.error ? (
          <ErrorMessage message={onboarding.error} onRetry={onboarding.refetch} />
        ) : onboarding.data && onboarding.data.length > 0 ? (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Asset</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Status</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Units</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Applied</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {onboarding.data.map((rec) => {
                    const asset = assetMap.get(rec.asset_id);
                    const statusVariant =
                      rec.status === 'approved' || rec.status === 'allocated' ? 'green'
                      : rec.status === 'rejected' || rec.status === 'ineligible' ? 'red'
                      : rec.status === 'applied' || rec.status === 'eligible' ? 'yellow'
                      : 'gray';
                    return (
                      <tr key={rec.id} className="hover:bg-bg-tertiary transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-ink">
                          {asset?.name ?? <span className="font-mono text-ink-tertiary">{rec.asset_id.substring(0, 8)}</span>}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={statusVariant}>{rec.status}</Badge>
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums font-mono text-ink-secondary">
                          {formatNumber(rec.requested_units)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">
                          {formatDate(rec.applied_at)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink-secondary">
                          {rec.reviewed_at ? formatDate(rec.reviewed_at) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState title="No onboarding records" description="No onboarding applications found for this investor." />
          </Card>
        )}
      </div>
    </div>
  );
}
