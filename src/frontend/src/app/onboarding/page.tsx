'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Input,
  Modal,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  Badge,
  Alert,
  SectionHeader,
} from '../../components/ui';
import { formatNumber, formatDate, formatDateTime } from '../../lib/utils';
import type { ApiError, OnboardingRecord } from '../../lib/types';

const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'red' | 'gray' | 'blue'> = {
  applied: 'yellow',
  eligible: 'blue',
  ineligible: 'red',
  approved: 'green',
  rejected: 'red',
  allocated: 'green',
  withdrawn: 'gray',
};

export default function OnboardingPage() {
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // All onboarding records aggregated across assets
  const [allRecords, setAllRecords] = useState<OnboardingRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const assets = useAsync(() => api.getAssets());
  const investors = useAsync(() => api.getInvestors());

  // Fetch onboarding records for each asset
  useEffect(() => {
    if (!assets.data) return;

    let cancelled = false;
    const fetchAll = async () => {
      setRecordsLoading(true);
      setRecordsError(null);
      try {
        const results: OnboardingRecord[] = [];
        for (const asset of assets.data!) {
          try {
            const recs = await api.getOnboardingRecords({ asset_id: asset.id });
            results.push(...recs);
          } catch {
            // skip assets with no records
          }
        }
        if (!cancelled) {
          // Deduplicate by id and sort by applied_at desc
          const seen = new Set<string>();
          const unique = results.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
          unique.sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
          setAllRecords(unique);
        }
      } catch (err) {
        if (!cancelled) {
          setRecordsError((err as { message?: string })?.message || 'Failed to load onboarding records');
        }
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [assets.data, refreshKey]);

  const refetchRecords = () => setRefreshKey(k => k + 1);

  const investorMap: Record<string, string> = {};
  if (investors.data) {
    for (const inv of investors.data) {
      investorMap[inv.id] = inv.name;
    }
  }
  const assetMap: Record<string, string> = {};
  if (assets.data) {
    for (const a of assets.data) {
      assetMap[a.id] = a.name;
    }
  }

  const assetOptions = [
    { value: '', label: 'Select asset...' },
    ...(assets.data?.map((a) => ({ value: a.id, label: a.name })) ?? []),
  ];

  const investorOptions = [
    { value: '', label: 'Select investor...' },
    ...(investors.data?.map((i) => ({ value: i.id, label: `${i.name} (${i.jurisdiction})` })) ?? []),
  ];

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const investor_id = form.get('investor_id') as string;
    const asset_id = form.get('asset_id') as string;
    const requested_units = Number(form.get('requested_units'));

    if (!investor_id || !asset_id || !requested_units || requested_units <= 0) {
      setFormError('All fields are required. Units must be positive.');
      return;
    }

    try {
      await api.applyToFund({ investor_id, asset_id, requested_units });
      setShowApplyForm(false);
      setActionMsg({ type: 'success', text: 'Onboarding application submitted.' });
      refetchRecords();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to submit application');
    }
  };

  const handleAction = async (action: 'check' | 'approve' | 'reject' | 'allocate', record: OnboardingRecord) => {
    setActionMsg(null);
    setActionLoading(record.id + action);

    try {
      if (action === 'check') {
        const result = await api.checkOnboardingEligibility(record.id);
        setActionMsg({
          type: result.eligible ? 'success' : 'error',
          text: result.eligible
            ? `${investorMap[record.investor_id] || 'Investor'} is eligible. All checks passed.`
            : `${investorMap[record.investor_id] || 'Investor'} is not eligible. ${result.checks.filter(c => !c.passed).map(c => c.message).join('; ')}`,
        });
      } else if (action === 'approve') {
        await api.reviewOnboarding(record.id, { decision: 'approved' });
        setActionMsg({ type: 'success', text: 'Application approved.' });
      } else if (action === 'reject') {
        await api.reviewOnboarding(record.id, { decision: 'rejected', rejection_reasons: ['Manual rejection'] });
        setActionMsg({ type: 'success', text: 'Application rejected.' });
      } else if (action === 'allocate') {
        await api.allocateOnboarding(record.id);
        setActionMsg({ type: 'success', text: 'Units allocated successfully.' });
      }
      refetchRecords();
      setSelectedRecord(null);
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as ApiError).message || `Failed to ${action}` });
    } finally {
      setActionLoading(null);
    }
  };

  // Group records by status
  const pending = allRecords.filter(r => r.status === 'applied');
  const eligible = allRecords.filter(r => r.status === 'eligible');
  const approved = allRecords.filter(r => r.status === 'approved');
  const completed = allRecords.filter(r => ['allocated', 'rejected', 'ineligible', 'withdrawn'].includes(r.status));

  const loading = assets.loading || investors.loading || recordsLoading;

  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="Investor onboarding pipeline and eligibility management"
        action={
          <Button onClick={() => setShowApplyForm(true)}>+ New Application</Button>
        }
      />

      {actionMsg && (
        <div className="mb-4">
          <Alert variant={actionMsg.type === 'success' ? 'success' : 'error'}>{actionMsg.text}</Alert>
        </div>
      )}

      <Modal
        open={showApplyForm}
        onClose={() => setShowApplyForm(false)}
        title="Apply to Fund"
      >
        <form onSubmit={handleApply} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Select label="Investor" name="investor_id" options={investorOptions} required />
          <Select label="Asset" name="asset_id" options={assetOptions} required />
          <Input label="Requested Units" name="requested_units" type="number" min={1} required placeholder="e.g., 10000" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowApplyForm(false)}>Cancel</Button>
            <Button type="submit">Submit Application</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Onboarding Details"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Investor</p>
                <p className="mt-0.5 text-sm text-ink">{investorMap[selectedRecord.investor_id] || selectedRecord.investor_id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Asset</p>
                <p className="mt-0.5 text-sm text-ink">{assetMap[selectedRecord.asset_id] || selectedRecord.asset_id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Requested Units</p>
                <p className="mt-0.5 text-sm tabular-nums text-ink">{formatNumber(selectedRecord.requested_units)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Status</p>
                <div className="mt-0.5">
                  <Badge variant={STATUS_COLORS[selectedRecord.status] || 'gray'}>{selectedRecord.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Applied</p>
                <p className="mt-0.5 text-sm text-ink">{formatDateTime(selectedRecord.applied_at)}</p>
              </div>
              {selectedRecord.reviewed_at && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Reviewed</p>
                  <p className="mt-0.5 text-sm text-ink">{formatDateTime(selectedRecord.reviewed_at)}</p>
                </div>
              )}
            </div>

            {selectedRecord.rejection_reasons && selectedRecord.rejection_reasons.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-red-700 mb-1">Rejection Reasons</p>
                <ul className="space-y-0.5">
                  {selectedRecord.rejection_reasons.map((r, i) => (
                    <li key={i} className="text-sm text-red-700">&bull; {r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-edge-subtle">
              {selectedRecord.status === 'applied' && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={actionLoading === selectedRecord.id + 'check'}
                  onClick={() => handleAction('check', selectedRecord)}
                >
                  {actionLoading === selectedRecord.id + 'check' ? 'Checking...' : 'Check Eligibility'}
                </Button>
              )}
              {(selectedRecord.status === 'eligible' || selectedRecord.status === 'applied') && (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={!!actionLoading}
                    onClick={() => handleAction('reject', selectedRecord)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={!!actionLoading}
                    onClick={() => handleAction('approve', selectedRecord)}
                  >
                    Approve
                  </Button>
                </>
              )}
              {selectedRecord.status === 'approved' && (
                <Button
                  size="sm"
                  disabled={actionLoading === selectedRecord.id + 'allocate'}
                  onClick={() => handleAction('allocate', selectedRecord)}
                >
                  {actionLoading === selectedRecord.id + 'allocate' ? 'Allocating...' : 'Allocate Units'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {loading ? (
        <LoadingSpinner />
      ) : recordsError ? (
        <ErrorMessage message={recordsError} onRetry={refetchRecords} />
      ) : allRecords.length > 0 ? (
        <div className="space-y-6">
          {/* Pipeline Summary */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Applied</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{pending.length}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Eligible</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{eligible.length}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Approved</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-600">{approved.length}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Completed</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{completed.length}</p>
            </Card>
          </div>

          {/* Records Table */}
          <div>
            <SectionHeader title="All Applications" description={`${allRecords.length} total`} />
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-edge">
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Investor</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Asset</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Units</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Status</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Applied</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge-subtle">
                    {allRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-surface-subtle transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-ink">
                          {investorMap[rec.investor_id] || rec.investor_id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-3 text-sm text-ink">
                          {assetMap[rec.asset_id] || rec.asset_id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">
                          {formatNumber(rec.requested_units)}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={STATUS_COLORS[rec.status] || 'gray'}>{rec.status}</Badge>
                        </td>
                        <td className="px-6 py-3 text-xs tabular-nums text-ink-secondary">
                          {formatDate(rec.applied_at)}
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                          >
                            View &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No onboarding applications"
          description="Submit a new application to start the investor onboarding process."
          action={<Button onClick={() => setShowApplyForm(true)}>+ New Application</Button>}
        />
      )}
    </div>
  );
}
