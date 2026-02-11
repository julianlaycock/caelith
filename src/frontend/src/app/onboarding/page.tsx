'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Button,
  Select,
  Input,
  Modal,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  Badge,
  Alert,
} from '../../components/ui';
import { formatNumber, formatDate, formatDateTime, classNames } from '../../lib/utils';
import type { ApiError, OnboardingRecord } from '../../lib/types';

// ── Column definitions ───────────────────────────────────

interface KanbanColumn {
  key: string;
  label: string;
  statuses: string[];
  color: string;
  dotColor: string;
}

const COLUMNS: KanbanColumn[] = [
  { key: 'applied',   label: 'Applied',    statuses: ['applied'],              color: 'border-t-amber-400',  dotColor: 'bg-amber-400' },
  { key: 'eligible',  label: 'Eligible',   statuses: ['eligible'],             color: 'border-t-blue-400',   dotColor: 'bg-blue-400' },
  { key: 'approved',  label: 'Approved',   statuses: ['approved'],             color: 'border-t-brand-500',  dotColor: 'bg-brand-500' },
  { key: 'allocated', label: 'Allocated',  statuses: ['allocated'],            color: 'border-t-brand-700',  dotColor: 'bg-brand-700' },
  { key: 'closed',    label: 'Closed',     statuses: ['rejected', 'ineligible', 'withdrawn'], color: 'border-t-red-400', dotColor: 'bg-red-400' },
];

const STATUS_BADGE: Record<string, 'green' | 'yellow' | 'red' | 'gray' | 'blue'> = {
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
  const applyFormRef = useRef<HTMLFormElement>(null);

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
      applyFormRef.current?.reset();
      setShowApplyForm(false);
      setFormError(null);
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

  // ── Drag-and-Drop State & Logic ──────────────────────
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  // Valid column transitions: source → { targetColumn → action }
  const VALID_MOVES: Record<string, Record<string, 'check' | 'approve' | 'reject' | 'allocate'>> = {
    applied:  { eligible: 'check', closed: 'reject' },
    eligible: { approved: 'approve', closed: 'reject' },
    approved: { allocated: 'allocate' },
  };

  const getRecordColumn = (rec: OnboardingRecord): string => {
    return COLUMNS.find(c => c.statuses.includes(rec.status))?.key || 'applied';
  };

  const isValidDrop = (recordId: string, targetCol: string): boolean => {
    const rec = allRecords.find(r => r.id === recordId);
    if (!rec) return false;
    const sourceCol = getRecordColumn(rec);
    if (sourceCol === targetCol) return false;
    return !!(VALID_MOVES[sourceCol]?.[targetCol]);
  };

  const handleDragStart = (e: React.DragEvent, recordId: string) => {
    setDraggedId(recordId);
    setDragError(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', recordId);
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    if (draggedId && isValidDrop(draggedId, colKey)) {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(colKey);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    setDropTarget(null);
    setDraggedId(null);

    const recordId = e.dataTransfer.getData('text/plain');
    const rec = allRecords.find(r => r.id === recordId);
    if (!rec) return;

    const sourceCol = getRecordColumn(rec);
    const action = VALID_MOVES[sourceCol]?.[targetCol];

    if (!action) {
      setDragError(`Cannot move from "${sourceCol}" to "${targetCol}".`);
      setTimeout(() => setDragError(null), 3000);
      return;
    }

    await handleAction(action, rec);
  };

  // Group records into columns
  const columnRecords: Record<string, OnboardingRecord[]> = {};
  for (const col of COLUMNS) {
    columnRecords[col.key] = allRecords.filter(r => col.statuses.includes(r.status));
  }

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

      {dragError && (
        <div className="mb-4">
          <Alert variant="error">{dragError}</Alert>
        </div>
      )}

      {/* Apply Modal */}
      <Modal
        open={showApplyForm}
        onClose={() => { setShowApplyForm(false); setFormError(null); }}
        title="Apply to Fund"
      >
        <form ref={applyFormRef} onSubmit={handleApply} className="space-y-4">
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

      {/* Detail / Action Modal */}
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
                  <Badge variant={STATUS_BADGE[selectedRecord.status] || 'gray'}>{selectedRecord.status}</Badge>
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
        <>
          {/* Pipeline Summary Metrics */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            {COLUMNS.map((col) => (
              <div key={col.key} className={classNames('rounded-xl border border-edge border-t-[3px] bg-white p-4 shadow-sm', col.color)}>
                <div className="flex items-center gap-2">
                  <span className={classNames('h-2 w-2 rounded-full', col.dotColor)} />
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">{col.label}</p>
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{columnRecords[col.key].length}</p>
              </div>
            ))}
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                className={classNames(
                  'flex flex-col rounded-lg transition-colors',
                  dropTarget === col.key && 'ring-2 ring-brand-500 bg-brand-50/30',
                )}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column Header */}
                <div className={classNames('mb-3 flex items-center justify-between rounded-lg border border-edge border-t-[3px] bg-white px-3 py-2', col.color)}>
                  <div className="flex items-center gap-2">
                    <span className={classNames('h-2 w-2 rounded-full', col.dotColor)} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink">{col.label}</span>
                  </div>
                  <span className="rounded-md bg-surface-subtle px-1.5 py-0.5 text-xs font-medium tabular-nums text-ink-secondary">
                    {columnRecords[col.key].length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 flex-1 min-h-[80px]">
                  {columnRecords[col.key].length === 0 && (
                    <div className="rounded-lg border border-dashed border-edge bg-surface-subtle/50 px-3 py-6 text-center">
                      <p className="text-xs text-ink-tertiary">
                        {dropTarget === col.key ? 'Drop here' : 'No records'}
                      </p>
                    </div>
                  )}
                  {columnRecords[col.key].map((rec) => (
                    <div
                      key={rec.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, rec.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedRecord(rec)}
                      className={classNames(
                        'w-full rounded-lg border border-edge bg-white p-3 text-left shadow-sm transition-all hover:shadow-md hover:border-navy-300 cursor-grab active:cursor-grabbing',
                        draggedId === rec.id && 'opacity-40 scale-95',
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium text-ink leading-tight">
                          {investorMap[rec.investor_id] || rec.investor_id.slice(0, 8)}
                        </p>
                        <Badge variant={STATUS_BADGE[rec.status] || 'gray'}>{rec.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-secondary truncate">
                        {assetMap[rec.asset_id] || rec.asset_id.slice(0, 8)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-medium tabular-nums text-ink-secondary">
                          {formatNumber(rec.requested_units)} units
                        </span>
                        <span className="text-[10px] tabular-nums text-ink-tertiary">
                          {formatDate(rec.applied_at)}
                        </span>
                      </div>
                      {rec.rejection_reasons && rec.rejection_reasons.length > 0 && (
                        <p className="mt-1.5 truncate rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">
                          {rec.rejection_reasons[0]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
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
