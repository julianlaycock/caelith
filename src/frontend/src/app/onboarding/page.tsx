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
  ExportMenu,
} from '../../components/ui';
import { exportCSV } from '../../lib/export-csv';
import { formatNumber, formatDate, formatDateTime, classNames, getErrorMessage, toAssetOptions, toInvestorOptions } from '../../lib/utils';
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
  { key: 'approved',  label: 'Approved',   statuses: ['approved'],             color: 'border-t-accent-400',  dotColor: 'bg-accent-500' },
  { key: 'allocated', label: 'Allocated',  statuses: ['allocated'],            color: 'border-t-accent-500',  dotColor: 'bg-accent-600' },
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
  const [showBulkApply, setShowBulkApply] = useState(false);
  const [bulkAssetId, setBulkAssetId] = useState('');
  const [bulkUnits, setBulkUnits] = useState('1000');
  const [bulkSelectedInvestors, setBulkSelectedInvestors] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);
  const [handoffOwner, setHandoffOwner] = useState('');
  const [handoffNotes, setHandoffNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dragSupported, setDragSupported] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<{ record: OnboardingRecord; fromDrag?: { targetCol: string } } | null>(null);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectCustom, setRejectCustom] = useState('');
  const [eligibilityResult, setEligibilityResult] = useState<{
    record: OnboardingRecord;
    eligible: boolean;
    checks: { rule: string; passed: boolean; message: string }[];
  } | null>(null);
  const applyFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const supportsDnD =
      typeof window !== 'undefined' &&
      typeof window.DragEvent !== 'undefined' &&
      'draggable' in document.createElement('div');
    setDragSupported(supportsDnD);
  }, []);

  useEffect(() => {
    if (!selectedRecord) return;
    setHandoffOwner(selectedRecord.owner_tag || '');
    setHandoffNotes(selectedRecord.handoff_notes || '');
  }, [selectedRecord]);

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
          setRecordsError(getErrorMessage(err, 'Failed to load onboarding records'));
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

  const assetOptions = toAssetOptions(assets.data);
  const investorOptions = toInvestorOptions(investors.data);

  // ── Standard rejection reason categories ──────────────
  const REJECTION_REASONS = [
    'KYC/AML verification failed',
    'Investor type not eligible for fund',
    'Jurisdiction not permitted',
    'Minimum investment threshold not met',
    'Sanctions or PEP screening flag',
    'Incomplete documentation',
    'Suitability assessment not satisfied',
    'Concentration limit exceeded',
  ];

  const openRejectModal = (record: OnboardingRecord, fromDrag?: { targetCol: string }) => {
    setRejectTarget({ record, fromDrag });
    setRejectReasons([]);
    setRejectCustom('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    const reasons = [...rejectReasons];
    if (rejectCustom.trim()) reasons.push(rejectCustom.trim());
    if (reasons.length === 0) {
      setActionMsg({ type: 'error', text: 'At least one rejection reason is required.' });
      return;
    }

    setActionLoading(rejectTarget.record.id + 'reject');
    setActionMsg(null);
    try {
      await api.reviewOnboarding(rejectTarget.record.id, { decision: 'rejected', rejection_reasons: reasons });
      setActionMsg({ type: 'success', text: 'Application rejected.' });
      refetchRecords();
      setSelectedRecord(null);
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as ApiError).message || 'Failed to reject' });
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
      setPendingDrag(null);
    }
  };

  const handleBulkApply = async () => {
    if (!bulkAssetId || bulkSelectedInvestors.size === 0) return;
    const units = Number(bulkUnits) || 1000;
    setBulkLoading(true);
    setBulkProgress({ done: 0, total: bulkSelectedInvestors.size });
    let successCount = 0;
    let failCount = 0;
    const investorIds = Array.from(bulkSelectedInvestors);
    for (const investorId of investorIds) {
      try {
        await api.applyToFund({ investor_id: investorId, asset_id: bulkAssetId, requested_units: units });
        successCount++;
      } catch {
        failCount++;
      }
      setBulkProgress({ done: successCount + failCount, total: investorIds.length });
    }
    setBulkLoading(false);
    setShowBulkApply(false);
    setBulkSelectedInvestors(new Set());
    setActionMsg({
      type: failCount === 0 ? 'success' : 'error',
      text: `Submitted ${successCount} application${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}.`,
    });
    refetchRecords();
  };

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const investor_id = form.get('investor_id') as string;
    const asset_id = form.get('asset_id') as string;
    const requested_units = Number(form.get('requested_units'));
    const owner_tag = ((form.get('owner_tag') as string) || '').trim();
    const handoff_notes = ((form.get('handoff_notes') as string) || '').trim();

    if (!investor_id || !asset_id || !requested_units || requested_units <= 0) {
      setFormError('All fields are required. Units must be positive.');
      return;
    }

    try {
      await api.applyToFund({
        investor_id,
        asset_id,
        requested_units,
        owner_tag: owner_tag || undefined,
        handoff_notes: handoff_notes || undefined,
      });
      applyFormRef.current?.reset();
      setShowApplyForm(false);
      setFormError(null);
      setActionMsg({ type: 'success', text: 'Onboarding application submitted.' });
      refetchRecords();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to submit application');
    }
  };

  const saveHandoffDetails = async () => {
    if (!selectedRecord) return;
    setActionLoading(selectedRecord.id + 'handoff');
    setActionMsg(null);
    try {
      const updated = await api.updateOnboardingHandoff(selectedRecord.id, {
        owner_tag: handoffOwner.trim() || undefined,
        handoff_notes: handoffNotes.trim() || undefined,
      });
      setSelectedRecord(updated);
      setActionMsg({ type: 'success', text: 'Handoff details updated.' });
      refetchRecords();
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as ApiError).message || 'Failed to update handoff details' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (action: 'check' | 'approve' | 'reject' | 'allocate', record: OnboardingRecord) => {
    setActionMsg(null);
    setActionLoading(record.id + action);

    try {
      if (action === 'check') {
        const result = await api.checkOnboardingEligibility(record.id);
        // Backend auto-advances status; show results modal for transparency
        setEligibilityResult({
          record: result.onboarding,
          eligible: result.eligible,
          checks: result.checks,
        });
        setSelectedRecord(null);
        refetchRecords();
        return;
      } else if (action === 'approve') {
        await api.reviewOnboarding(record.id, { decision: 'approved' });
        setActionMsg({ type: 'success', text: 'Application approved.' });
      } else if (action === 'reject') {
        openRejectModal(record);
        return; // handled by rejection modal
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
  const [pendingDrag, setPendingDrag] = useState<{ record: OnboardingRecord; action: 'check' | 'approve' | 'reject' | 'allocate'; targetCol: string } | null>(null);

  // Valid column transitions: source → { targetColumn → action }
  const VALID_MOVES: Record<string, Record<string, 'check' | 'approve' | 'reject' | 'allocate'>> = {
    applied:  { eligible: 'check', closed: 'reject' },
    eligible: { approved: 'approve', closed: 'reject' },
    approved: { allocated: 'allocate' },
  };

  const getRecordColumn = (rec: OnboardingRecord): string => {
    return COLUMNS.find(c => c.statuses.includes(rec.status))?.key || 'applied';
  };

  const getQuickActions = (rec: OnboardingRecord): Array<'check' | 'approve' | 'reject' | 'allocate'> => {
    if (rec.status === 'applied') return ['check', 'reject'];
    if (rec.status === 'eligible') return ['approve', 'reject'];
    if (rec.status === 'approved') return ['allocate'];
    return [];
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
      const hints: Record<string, string> = {
        applied: 'Applied records must first pass eligibility check before advancing.',
        eligible: 'Eligible records can be approved or rejected.',
        approved: 'Approved records can only be moved to Allocated.',
        allocated: 'Allocated records cannot be moved.',
        closed: 'Closed records cannot be moved.',
      };
      setDragError(`Cannot move from "${sourceCol}" to "${targetCol}". ${hints[sourceCol] || ''}`);
      setTimeout(() => setDragError(null), 5000);
      return;
    }

    // Rejections go through the rejection reasons modal
    if (action === 'reject') {
      openRejectModal(rec, { targetCol });
      return;
    }

    // Other actions show the compliance guardrails confirmation
    setPendingDrag({ record: rec, action, targetCol });
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
        description="Manage investor onboarding and eligibility checks"
        action={
          <div className="flex items-center gap-2">
            <ExportMenu
              onExportCSV={() => {
                if (!allRecords.length) return;
                exportCSV('caelith-onboarding.csv',
                  ['Status', 'Investor ID', 'Asset ID', 'Requested Units', 'Applied At', 'Reviewed At'],
                  allRecords.map(r => [
                    r.status, r.investor_id, r.asset_id,
                    String(r.requested_units), r.applied_at, r.reviewed_at || ''
                  ])
                );
              }}
            />
            <Button variant="secondary" onClick={() => setShowBulkApply(true)}>Bulk Apply</Button>
            <Button onClick={() => setShowApplyForm(true)}>+ New Application</Button>
          </div>
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

      {!dragSupported && (
        <div className="mb-4">
          <Alert variant="info">
            Drag and drop is unavailable in this browser. Use the action buttons on each card to advance onboarding.
          </Alert>
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
          <Select label="Fund / Share Class" name="asset_id" options={assetOptions} required />
          <Input label="Requested Units" name="requested_units" type="number" min={1} required placeholder="e.g., 10000" />
          <Input label="Owner Tag" name="owner_tag" placeholder="e.g., Compliance Desk A" />
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-1.5">
              Handoff Notes
            </label>
            <textarea
              name="handoff_notes"
              rows={3}
              className="w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
              placeholder="Operational context for next reviewer..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowApplyForm(false)}>Cancel</Button>
            <Button type="submit">Submit Application</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Apply Modal */}
      <Modal
        open={showBulkApply}
        onClose={() => { setShowBulkApply(false); setBulkSelectedInvestors(new Set()); }}
        title="Bulk Apply Investors"
      >
        <div className="space-y-4">
          <Select
            label="Fund / Share Class"
            value={bulkAssetId}
            onChange={(e) => setBulkAssetId(e.target.value)}
            options={[{ value: '', label: '— Select —' }, ...assetOptions]}
          />
          <Input
            label="Requested Units (per investor)"
            type="number"
            value={bulkUnits}
            onChange={(e) => setBulkUnits(e.target.value)}
            min={1}
          />
          {investors.data && investors.data.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium uppercase tracking-wide text-ink-tertiary">
                  Select Investors ({bulkSelectedInvestors.size} of {investors.data.length})
                </label>
                <button
                  type="button"
                  className="text-xs text-accent-400 hover:text-accent-300"
                  onClick={() => {
                    if (bulkSelectedInvestors.size === investors.data!.length) {
                      setBulkSelectedInvestors(new Set());
                    } else {
                      setBulkSelectedInvestors(new Set(investors.data!.map(inv => inv.id)));
                    }
                  }}
                >
                  {bulkSelectedInvestors.size === investors.data.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-edge divide-y divide-edge-subtle">
                {investors.data.map((inv) => (
                  <label key={inv.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-edge text-accent-400 focus:ring-accent-400"
                      checked={bulkSelectedInvestors.has(inv.id)}
                      onChange={(e) => {
                        setBulkSelectedInvestors(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(inv.id); else next.delete(inv.id);
                          return next;
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink truncate">{inv.name}</p>
                      <p className="text-[10px] text-ink-tertiary">{inv.investor_type.replace(/_/g, ' ')} · {inv.jurisdiction}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          {bulkLoading && (
            <div className="rounded-lg bg-bg-tertiary p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
                <p className="text-xs text-ink-secondary">Submitting {bulkProgress.done} of {bulkProgress.total}...</p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-500 transition-all"
                  style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowBulkApply(false)} disabled={bulkLoading}>Cancel</Button>
            <Button
              onClick={handleBulkApply}
              disabled={bulkLoading || !bulkAssetId || bulkSelectedInvestors.size === 0}
            >
              Submit {bulkSelectedInvestors.size} Application{bulkSelectedInvestors.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
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

            <div className="rounded-lg border border-edge-subtle bg-bg-tertiary p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Handoff</p>
              <div className="space-y-3">
                <Input
                  label="Owner Tag"
                  value={handoffOwner}
                  onChange={(e) => setHandoffOwner(e.target.value)}
                  placeholder="Assign operational owner"
                />
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-1.5">
                    Handoff Notes
                  </label>
                  <textarea
                    rows={3}
                    value={handoffNotes}
                    onChange={(e) => setHandoffNotes(e.target.value)}
                    className="w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                    placeholder="Context for next reviewer..."
                  />
                </div>
              </div>
            </div>

            {selectedRecord.rejection_reasons && selectedRecord.rejection_reasons.length > 0 && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-red-400 mb-1">Rejection Reasons</p>
                <ul className="space-y-0.5">
                  {selectedRecord.rejection_reasons.map((r, i) => (
                    <li key={i} className="text-sm text-red-400">&bull; {r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-edge-subtle">
              <Button
                size="sm"
                variant="secondary"
                disabled={actionLoading === selectedRecord.id + 'handoff'}
                onClick={saveHandoffDetails}
              >
                {actionLoading === selectedRecord.id + 'handoff' ? 'Saving...' : 'Save Handoff'}
              </Button>
              {selectedRecord.status === 'applied' && (
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
                    variant="secondary"
                    disabled={actionLoading === selectedRecord.id + 'check'}
                    onClick={() => handleAction('check', selectedRecord)}
                  >
                    {actionLoading === selectedRecord.id + 'check' ? 'Checking...' : 'Check Eligibility'}
                  </Button>
                </>
              )}
              {selectedRecord.status === 'eligible' && (
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

      {/* Drag Confirmation Modal with Compliance Guardrails */}
      <Modal
        open={!!pendingDrag}
        onClose={() => setPendingDrag(null)}
        title="Confirm Action"
      >
        {pendingDrag && (() => {
          const { record, action, targetCol } = pendingDrag;
          const investorName = investorMap[record.investor_id] || record.investor_id.slice(0, 8);
          const assetName = assetMap[record.asset_id] || record.asset_id.slice(0, 8);
          const targetLabel = COLUMNS.find(c => c.key === targetCol)?.label || targetCol;

          const guardrails: { label: string; description: string }[] = [];
          if (action === 'check') {
            guardrails.push(
              { label: 'Investor type classification', description: 'Verify investor meets fund type requirements' },
              { label: 'KYC/AML status', description: 'Confirm KYC status is verified and not expired' },
              { label: 'Minimum investment threshold', description: 'Check investment meets fund minimum' },
              { label: 'Jurisdiction eligibility', description: 'Verify investor jurisdiction is permitted' },
            );
          } else if (action === 'approve') {
            guardrails.push(
              { label: 'Eligibility check passed', description: 'Investor has already passed automated eligibility' },
              { label: 'Compliance officer review', description: 'Manual review confirms suitability' },
            );
          } else if (action === 'allocate') {
            guardrails.push(
              { label: 'Approval on file', description: 'Application has been approved by compliance' },
              { label: 'Unit availability', description: 'Sufficient units available in asset for allocation' },
              { label: 'Concentration limit', description: 'Allocation does not breach concentration limits' },
            );
          } else if (action === 'reject') {
            guardrails.push(
              { label: 'Rejection documented', description: 'Reason for rejection will be recorded in audit trail' },
            );
          }

          return (
            <div className="space-y-4">
              <div className="rounded-lg bg-bg-tertiary p-3">
                <p className="text-sm text-ink">
                  Move <span className="font-semibold">{investorName}</span> to{' '}
                  <span className="font-semibold">{targetLabel}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  Asset: {assetName} &middot; {formatNumber(record.requested_units)} units
                </p>
              </div>

              {guardrails.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary mb-2">
                    Compliance checks
                  </p>
                  <div className="space-y-1.5">
                    {guardrails.map((g, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-md bg-accent-500/10 px-3 py-2">
                        <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-accent-200">{g.label}</p>
                          <p className="text-[11px] text-accent-300">{g.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-edge-subtle">
                <Button variant="secondary" size="sm" onClick={() => setPendingDrag(null)}>Cancel</Button>
                <Button
                  size="sm"
                  variant={action === 'reject' ? 'danger' : 'primary'}
                  disabled={!!actionLoading}
                  onClick={async () => {
                    await handleAction(action, record);
                    setPendingDrag(null);
                  }}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Eligibility Check Results Modal */}
      <Modal
        open={!!eligibilityResult}
        onClose={() => { setEligibilityResult(null); refetchRecords(); }}
        title="Eligibility Check Results"
      >
        {eligibilityResult && (
          <div className="space-y-4">
            {eligibilityResult.eligible ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">All eligibility checks passed</p>
                    <p className="text-xs text-emerald-400 mt-0.5">Status updated to Eligible</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-300">Investor does not meet eligibility requirements</p>
                    <p className="text-xs text-red-400 mt-0.5">Status updated to Ineligible</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Check Results</p>
              {eligibilityResult.checks.map((check, i) => (
                <div key={i} className={classNames(
                  'flex items-start gap-2 rounded-lg px-3 py-2',
                  check.passed ? 'bg-accent-500/10 border border-accent-500/20' : 'bg-red-500/10 border border-red-500/20'
                )}>
                  {check.passed ? (
                    <svg className="h-4 w-4 mt-0.5 text-accent-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 mt-0.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  )}
                  <div>
                    <p className={classNames('text-sm font-medium', check.passed ? 'text-accent-200' : 'text-red-300')}>
                      {check.rule.replace(/_/g, ' ')}
                    </p>
                    <p className={classNames('text-xs', check.passed ? 'text-accent-300' : 'text-red-400')}>
                      {check.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-edge-subtle">
              {!eligibilityResult.eligible && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const record = eligibilityResult.record;
                    setEligibilityResult(null);
                    openRejectModal(record);
                  }}
                >
                  Reject with Reasons
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setEligibilityResult(null);
                  if (eligibilityResult.eligible) {
                    setActionMsg({ type: 'success', text: 'Eligibility check complete — investor advanced to Eligible.' });
                  }
                  refetchRecords();
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Reasons Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Application"
      >
        {rejectTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-bg-tertiary p-3">
              <p className="text-sm text-ink">
                Rejecting <span className="font-semibold">{investorMap[rejectTarget.record.investor_id] || rejectTarget.record.investor_id.slice(0, 8)}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Asset: {assetMap[rejectTarget.record.asset_id] || rejectTarget.record.asset_id.slice(0, 8)} &middot; {formatNumber(rejectTarget.record.requested_units)} units
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Reason(s) for rejection</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {REJECTION_REASONS.map((reason) => (
                  <label key={reason} className="flex items-start gap-2 cursor-pointer rounded-md px-3 py-2 hover:bg-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-edge text-accent-400 focus:ring-accent-400"
                      checked={rejectReasons.includes(reason)}
                      onChange={(e) => {
                        setRejectReasons(prev =>
                          e.target.checked ? [...prev, reason] : prev.filter(r => r !== reason)
                        );
                      }}
                    />
                    <span className="text-sm text-ink">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-1">
                Additional details (optional)
              </label>
              <textarea
                className="w-full rounded-lg border border-edge px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
                rows={3}
                placeholder="Provide additional context for the audit trail..."
                value={rejectCustom}
                onChange={(e) => setRejectCustom(e.target.value)}
              />
            </div>

            {rejectReasons.length === 0 && !rejectCustom.trim() && (
              <p className="text-xs text-amber-400">Select at least one reason or provide details to proceed.</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-edge-subtle">
              <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button
                size="sm"
                variant="danger"
                disabled={!!actionLoading || (rejectReasons.length === 0 && !rejectCustom.trim())}
                onClick={handleRejectSubmit}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
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
              <div key={col.key} className={classNames('rounded-xl border border-edge border-t-[3px] bg-bg-secondary p-4', col.color)}>
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
                  dragSupported && dropTarget === col.key && 'ring-2 ring-accent-400 bg-accent-400/10',
                )}
                onDragOver={dragSupported ? (e) => handleDragOver(e, col.key) : undefined}
                onDragLeave={dragSupported ? handleDragLeave : undefined}
                onDrop={dragSupported ? (e) => handleDrop(e, col.key) : undefined}
              >
                {/* Column Header */}
                <div className={classNames('mb-3 flex items-center justify-between rounded-lg border border-edge border-t-[3px] bg-bg-secondary px-3 py-2', col.color)}>
                  <div className="flex items-center gap-2">
                    <span className={classNames('h-2 w-2 rounded-full', col.dotColor)} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink">{col.label}</span>
                  </div>
                  <span className="rounded-md bg-bg-tertiary px-1.5 py-0.5 text-xs font-medium tabular-nums text-ink-secondary">
                    {columnRecords[col.key].length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 flex-1 min-h-[80px]">
                  {columnRecords[col.key].length === 0 && (
                    <div className="rounded-lg border border-dashed border-edge bg-bg-tertiary/50 px-3 py-6 text-center">
                      <p className="text-xs text-ink-tertiary">
                        {dropTarget === col.key ? 'Drop here' : 'No records'}
                      </p>
                    </div>
                  )}
                  {columnRecords[col.key].map((rec) => (
                    <div
                      key={rec.id}
                      draggable={dragSupported}
                      onDragStart={dragSupported ? (e) => handleDragStart(e, rec.id) : undefined}
                      onDragEnd={dragSupported ? handleDragEnd : undefined}
                      onClick={() => setSelectedRecord(rec)}
                      className={classNames(
                        'w-full rounded-lg border border-edge bg-bg-secondary p-3 text-left transition-all hover:border-accent-500/30 cursor-pointer',
                        dragSupported && 'cursor-grab active:cursor-grabbing',
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
                      {rec.owner_tag && (
                        <p className="mt-1 text-[11px] text-ink-tertiary">
                          Owner: <span className="font-medium text-ink-secondary">{rec.owner_tag}</span>
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-medium tabular-nums text-ink-secondary">
                          {formatNumber(rec.requested_units)} units
                        </span>
                        <span className="text-[10px] tabular-nums text-ink-tertiary">
                          {formatDate(rec.applied_at)}
                        </span>
                      </div>
                      {rec.rejection_reasons && rec.rejection_reasons.length > 0 && (
                        <p className="mt-1.5 truncate rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">
                          {rec.rejection_reasons[0]}
                        </p>
                      )}

                      {getQuickActions(rec).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-edge-subtle pt-2">
                          {getQuickActions(rec).map((action) => (
                            <Button
                              key={action}
                              size="sm"
                              variant={action === 'reject' ? 'danger' : action === 'check' ? 'secondary' : 'primary'}
                              disabled={!!actionLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleAction(action, rec);
                              }}
                            >
                              {action === 'check' ? 'Check' : action === 'approve' ? 'Approve' : action === 'allocate' ? 'Allocate' : 'Reject'}
                            </Button>
                          ))}
                        </div>
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
          description={
            investors.data && investors.data.length > 0
              ? `You have ${investors.data.length} investor${investors.data.length !== 1 ? 's' : ''} ready. Submit them for eligibility checking against your fund rules.`
              : 'Import investors first, then submit them as onboarding applications for compliance checking.'
          }
          action={
            <div className="flex items-center gap-2">
              {investors.data && investors.data.length > 0 && assets.data && assets.data.length > 0 && (
                <Button onClick={() => setShowBulkApply(true)}>Bulk Apply {investors.data.length} Investors</Button>
              )}
              <Button variant={investors.data && investors.data.length > 0 ? 'secondary' : 'primary'} onClick={() => setShowApplyForm(true)}>+ New Application</Button>
            </div>
          }
        />
      )}
    </div>
  );
}
