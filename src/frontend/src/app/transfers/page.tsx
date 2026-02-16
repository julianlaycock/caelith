'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Modal,
  SkeletonTable,
  ErrorMessage,
  EmptyState,
  Alert,
  ExportMenu,
  SortableHeader,
} from '../../components/ui';
import { useAuth } from '../../components/auth-provider';
import { exportCSV } from '../../lib/export-csv';
import { formatNumber, formatDateTime, classNames } from '../../lib/utils';
import type { DetailedValidationResult, ApiError, TransferHistoryEntry } from '../../lib/types';

type TransferSortKey = 'executed_at' | 'from_name' | 'to_name' | 'units';
type TransferSortDirection = 'asc' | 'desc' | null;
type TransferSortState = { key: TransferSortKey | null; direction: TransferSortDirection };
const TRANSFER_SORT_KEYS = new Set<TransferSortKey>(['executed_at', 'from_name', 'to_name', 'units']);

interface BulkTransferRow {
  id: string;
  from_investor_id: string;
  to_investor_id: string;
  units: string;
}

interface BulkTransferResult {
  rowId: string;
  valid: boolean;
  summary: string;
}

type TransfersViewMode = 'table' | 'kanban';

interface TransferKanbanColumn {
  key: 'pending_approval' | 'executed' | 'rejected';
  label: string;
  badgeClass: string;
  borderClass: string;
}
type TransferKanbanStatus = TransferKanbanColumn['key'];

const TRANSFER_KANBAN_COLUMNS: TransferKanbanColumn[] = [
  {
    key: 'pending_approval',
    label: 'Pending Approval',
    badgeClass: 'bg-amber-500/15 text-amber-700 ring-amber-500/30',
    borderClass: 'border-t-amber-500',
  },
  {
    key: 'executed',
    label: 'Executed',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30',
    borderClass: 'border-t-emerald-500',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    badgeClass: 'bg-red-500/15 text-red-600 ring-red-500/30',
    borderClass: 'border-t-red-500',
  },
];

export default function TransfersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const parseSort = (): TransferSortState => {
    const key = searchParams.get('sort');
    const dir = searchParams.get('dir');
    if (key && TRANSFER_SORT_KEYS.has(key as TransferSortKey) && (dir === 'asc' || dir === 'desc')) {
      return { key: key as TransferSortKey, direction: dir };
    }
    return { key: null, direction: null };
  };

  const parseView = (): TransfersViewMode => (
    searchParams.get('view') === 'kanban' ? 'kanban' : 'table'
  );

  const [showForm, setShowForm] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(searchParams.get('asset') || '');
  const [sort, setSort] = useState<TransferSortState>(() => parseSort());
  const [viewMode, setViewMode] = useState<TransfersViewMode>(() => parseView());
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<DetailedValidationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<{
    asset_id: string;
    from_investor_id: string;
    to_investor_id: string;
    units: number;
    execution_date: string;
  } | null>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkAssetId, setBulkAssetId] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkTransferRow[]>([
    { id: crypto.randomUUID(), from_investor_id: '', to_investor_id: '', units: '' },
  ]);
  const [bulkResults, setBulkResults] = useState<BulkTransferResult[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkExecuting, setBulkExecuting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [kanbanError, setKanbanError] = useState<string | null>(null);
  const [kanbanItems, setKanbanItems] = useState<TransferHistoryEntry[]>([]);
  const [draggedTransferId, setDraggedTransferId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TransferKanbanStatus | null>(null);

  // ── Drag state for simulation modal ───────────────────
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const assets = useAsync(() => api.getAssets());
  const investors = useAsync(() => api.getInvestors());
  const history = useAsync(
    () => api.getTransferHistory(selectedAssetId || undefined),
    [selectedAssetId, successMsg]
  );

  useEffect(() => {
    setSelectedAssetId(searchParams.get('asset') || '');
    setSort(parseSort());
    setViewMode(parseView());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setKanbanItems(history.data ?? []);
  }, [history.data]);

  const updateUrl = (next: { asset?: string; sort?: TransferSortKey | null; dir?: TransferSortDirection; view?: TransfersViewMode }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.asset !== undefined) {
      if (next.asset) params.set('asset', next.asset);
      else params.delete('asset');
    }
    if (next.sort !== undefined) {
      if (next.sort) params.set('sort', next.sort);
      else params.delete('sort');
    }
    if (next.dir !== undefined) {
      if (next.dir) params.set('dir', next.dir);
      else params.delete('dir');
    }
    if (next.view !== undefined) {
      if (next.view === 'kanban') params.set('view', 'kanban');
      else params.delete('view');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const toggleSort = (key: TransferSortKey) => {
    setSort((prev) => {
      const next: TransferSortState =
        prev.key !== key
          ? { key, direction: 'asc' }
          : prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : { key: null, direction: null };

      updateUrl({ sort: next.key, dir: next.direction });
      return next;
    });
  };

  const sortedHistory = useMemo(() => {
    if (!history.data) return [];
    const key = sort.key;
    if (!key || !sort.direction) return history.data;
    return [...history.data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(String(bVal))
        : Number(aVal) - Number(bVal);
      return sort.direction === 'desc' ? -cmp : cmp;
    });
  }, [history.data, sort]);

  const canReviewPendingTransfers = user?.role === 'admin' || user?.role === 'compliance_officer';

  const kanbanGroups = useMemo<Record<TransferKanbanColumn['key'], TransferHistoryEntry[]>>(() => {
    const source = kanbanItems;
    const withFallbackStatus = source.map((item) => ({
      ...item,
      status: item.status || 'executed',
    }));
    return {
      pending_approval: withFallbackStatus.filter((item) => item.status === 'pending_approval'),
      executed: withFallbackStatus.filter((item) => item.status === 'executed'),
      rejected: withFallbackStatus.filter((item) => item.status === 'rejected'),
    };
  }, [kanbanItems]);

  // ── Drag handlers ─────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - dragPos.x, y: e.clientY - dragPos.y });
  }, [dragPos]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      setDragPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const onUp = () => setIsDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (!showForm) setDragPos({ x: 0, y: 0 });
  }, [showForm]);

  const canDragTransferCard = useCallback((item: TransferHistoryEntry): boolean => {
    return canReviewPendingTransfers && item.status === 'pending_approval' && pendingActionId !== item.id;
  }, [canReviewPendingTransfers, pendingActionId]);

  const canDropTransferToColumn = useCallback((target: TransferKanbanStatus): boolean => {
    if (!canReviewPendingTransfers || !draggedTransferId) return false;
    const dragged = kanbanItems.find((item) => item.id === draggedTransferId);
    if (!dragged || dragged.status !== 'pending_approval') return false;
    return target === 'executed' || target === 'rejected';
  }, [canReviewPendingTransfers, draggedTransferId, kanbanItems]);

  const handleTransferDrop = useCallback(async (target: TransferKanbanStatus) => {
    if (!draggedTransferId) return;

    const transferId = draggedTransferId;
    setDragOverColumn(null);
    setDraggedTransferId(null);

    const dragged = kanbanItems.find((item) => item.id === transferId);
    if (!dragged || dragged.status !== 'pending_approval') return;

    if (target === 'rejected') {
      setRejectTargetId(transferId);
      setRejectReason('');
      return;
    }

    if (target !== 'executed') return;

    const previousItems = [...kanbanItems];
    setKanbanItems((prev) =>
      prev.map((item) =>
        item.id === transferId
          ? { ...item, status: 'executed', pending_reason: null, rejection_reason: null }
          : item
      )
    );

    setPendingActionId(transferId);
    setKanbanError(null);
    try {
      await api.approveTransfer(transferId);
      setSuccessMsg('Pending transfer approved and executed.');
      history.refetch();
    } catch (err) {
      setKanbanItems(previousItems);
      setKanbanError((err as ApiError).message || 'Failed to approve pending transfer.');
    } finally {
      setPendingActionId(null);
    }
  }, [draggedTransferId, kanbanItems, history]);

  const assetOptions = [
    { value: '', label: 'All assets' },
    ...(assets.data?.map((a) => ({ value: a.id, label: a.name })) ?? []),
  ];

  const investorOptions = [
    { value: '', label: 'Select investor...' },
    ...(investors.data?.map((i) => ({
      value: i.id,
      label: `${i.name} (${i.jurisdiction})`,
    })) ?? []),
  ];

  const getFormData = (form: HTMLFormElement) => {
    const data = new FormData(form);
    return {
      asset_id: data.get('asset_id') as string,
      from_investor_id: data.get('from_investor_id') as string,
      to_investor_id: data.get('to_investor_id') as string,
      units: Number(data.get('units')),
      execution_date: new Date().toISOString(),
    };
  };

  const handleSimulate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setValidationResult(null);
    setPendingTransfer(null);

    const transfer = getFormData(e.currentTarget);
    if (!transfer.asset_id || !transfer.from_investor_id || !transfer.to_investor_id || !transfer.units || transfer.units <= 0) {
      setFormError('All fields are required. Units must be positive.');
      return;
    }

    if (transfer.from_investor_id === transfer.to_investor_id) {
      setFormError('From and To investor must be different.');
      return;
    }

    setSimulating(true);
    try {
      const result = await api.simulateTransfer(transfer);
      setValidationResult(result);
      setPendingTransfer(transfer);
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to simulate transfer');
    } finally {
      setSimulating(false);
    }
  };

  const handleExecute = async () => {
    if (!pendingTransfer) return;
    setFormError(null);
    setExecuting(true);

    try {
      const transfer = await api.executeTransfer(pendingTransfer);
      setShowForm(false);
      setValidationResult(null);
      setPendingTransfer(null);
      setSuccessMsg(
        transfer.status === 'pending_approval'
          ? 'Transfer submitted to approval queue.'
          : 'Transfer executed successfully.'
      );
      history.refetch();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.violations) {
        setValidationResult({
          valid: false,
          violations: apiErr.violations,
          checks: [],
          summary: 'Transfer validation failed.',
        });
      } else {
        setFormError(apiErr.message || 'Failed to execute transfer');
      }
    } finally {
      setExecuting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormError(null);
    setValidationResult(null);
    setPendingTransfer(null);
  };

  const resetBulkForm = () => {
    setShowBulkForm(false);
    setBulkAssetId('');
    setBulkRows([{ id: crypto.randomUUID(), from_investor_id: '', to_investor_id: '', units: '' }]);
    setBulkResults([]);
    setBulkError(null);
  };

  const updateBulkRow = (rowId: string, patch: Partial<BulkTransferRow>) => {
    setBulkRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
    setBulkResults([]);
    setBulkError(null);
  };

  const addBulkRow = () => {
    setBulkRows((prev) => [...prev, { id: crypto.randomUUID(), from_investor_id: '', to_investor_id: '', units: '' }]);
    setBulkResults([]);
    setBulkError(null);
  };

  const removeBulkRow = (rowId: string) => {
    setBulkRows((prev) => prev.filter((row) => row.id !== rowId));
    setBulkResults((prev) => prev.filter((result) => result.rowId !== rowId));
  };

  const getBulkRequest = (row: BulkTransferRow) => ({
    asset_id: bulkAssetId,
    from_investor_id: row.from_investor_id,
    to_investor_id: row.to_investor_id,
    units: Number(row.units),
    execution_date: new Date().toISOString(),
  });

  const simulateBulk = async () => {
    setBulkError(null);
    setBulkResults([]);

    if (!bulkAssetId) {
      setBulkError('Select an asset for the bulk transfer batch.');
      return;
    }
    if (bulkRows.length === 0) {
      setBulkError('Add at least one transfer row.');
      return;
    }

    setBulkLoading(true);
    try {
      const results = await Promise.all(
        bulkRows.map(async (row): Promise<BulkTransferResult> => {
          if (!row.from_investor_id || !row.to_investor_id || !row.units) {
            return { rowId: row.id, valid: false, summary: 'Missing required fields.' };
          }
          if (row.from_investor_id === row.to_investor_id) {
            return { rowId: row.id, valid: false, summary: 'Sender and receiver must be different.' };
          }
          if (Number(row.units) <= 0) {
            return { rowId: row.id, valid: false, summary: 'Units must be greater than zero.' };
          }
          try {
            const response = await api.simulateTransfer(getBulkRequest(row));
            return { rowId: row.id, valid: response.valid, summary: response.summary };
          } catch (err) {
            const message = (err as ApiError).message || 'Simulation failed.';
            return { rowId: row.id, valid: false, summary: message };
          }
        })
      );
      setBulkResults(results);
    } finally {
      setBulkLoading(false);
    }
  };

  const executeBulk = async () => {
    if (bulkResults.length === 0) {
      setBulkError('Run simulation before executing bulk transfers.');
      return;
    }
    const invalid = bulkResults.filter((result) => !result.valid);
    if (invalid.length > 0) {
      setBulkError('Resolve failed rows before executing.');
      return;
    }

    setBulkExecuting(true);
    setBulkError(null);
    try {
      let successCount = 0;
      let queuedCount = 0;
      const executionResults: BulkTransferResult[] = [];
      for (const row of bulkRows) {
        try {
          const transfer = await api.executeTransfer(getBulkRequest(row));
          successCount += 1;
          if (transfer.status === 'pending_approval') {
            queuedCount += 1;
            executionResults.push({ rowId: row.id, valid: true, summary: 'Queued for approval.' });
          } else {
            executionResults.push({ rowId: row.id, valid: true, summary: 'Executed successfully.' });
          }
        } catch (err) {
          executionResults.push({
            rowId: row.id,
            valid: false,
            summary: (err as ApiError).message || 'Execution failed.',
          });
        }
      }
      setBulkResults(executionResults);
      history.refetch();

      if (successCount === bulkRows.length) {
        const executedCount = successCount - queuedCount;
        setSuccessMsg(
          queuedCount > 0
            ? `Processed ${successCount} transfers (${executedCount} executed, ${queuedCount} queued for approval).`
            : `Executed ${successCount} bulk transfer${successCount !== 1 ? 's' : ''}.`
        );
        resetBulkForm();
      } else {
        setBulkError(`Executed ${successCount} of ${bulkRows.length}. Review failed rows.`);
      }
    } finally {
      setBulkExecuting(false);
    }
  };

  const handleApprovePending = async (transferId: string) => {
    setPendingActionId(transferId);
    setKanbanError(null);
    const previousItems = [...kanbanItems];
    setKanbanItems((prev) =>
      prev.map((item) =>
        item.id === transferId
          ? { ...item, status: 'executed', pending_reason: null, rejection_reason: null }
          : item
      )
    );
    try {
      await api.approveTransfer(transferId);
      setSuccessMsg('Pending transfer approved and executed.');
      history.refetch();
    } catch (err) {
      setKanbanItems(previousItems);
      setKanbanError((err as ApiError).message || 'Failed to approve pending transfer.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRejectPending = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      setKanbanError('Rejection reason is required.');
      return;
    }
    const transferId = rejectTargetId;
    const reason = rejectReason.trim();
    setPendingActionId(rejectTargetId);
    setKanbanError(null);
    const previousItems = [...kanbanItems];
    setKanbanItems((prev) =>
      prev.map((item) =>
        item.id === transferId
          ? { ...item, status: 'rejected', rejection_reason: reason, pending_reason: null }
          : item
      )
    );
    try {
      await api.rejectTransfer(transferId, reason);
      setSuccessMsg('Pending transfer rejected.');
      setRejectTargetId(null);
      setRejectReason('');
      history.refetch();
    } catch (err) {
      setKanbanItems(previousItems);
      setKanbanError((err as ApiError).message || 'Failed to reject pending transfer.');
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Simulate, execute, and review unit transfers"
        action={
          <div className="flex items-center gap-2">
            <ExportMenu
              onExportCSV={() => {
                if (!history.data || history.data.length === 0) return;
                exportCSV('caelith-transfers.csv',
                  ['Date', 'From', 'To', 'Status', 'Units'],
                  history.data.map(t => [
                    t.executed_at, t.from_name, t.to_name, t.status || 'executed',
                    String(t.units)
                  ])
                );
              }}
            />
            <Button variant="secondary" onClick={() => setShowBulkForm(true)}>Bulk Transfer</Button>
            <Button onClick={() => setShowForm(true)}>+ New Transfer</Button>
          </div>
        }
      />

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      {kanbanError && (
        <div className="mb-4">
          <Alert variant="error">{kanbanError}</Alert>
        </div>
      )}

      {/* ── Custom Draggable Transfer Modal ──────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm} />
          <div
            className="relative z-10 w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl border border-edge bg-bg-secondary shadow-xl"
            style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}
          >
            {/* Draggable Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-edge cursor-move select-none flex-shrink-0"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-ink-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                </svg>
                <h2 className="text-base font-semibold text-ink">Transfer Units</h2>
              </div>
              <button
                onClick={resetForm}
                className="rounded-lg p-1 text-ink-tertiary hover:bg-bg-tertiary hover:text-ink transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <form id="transfer-form" onSubmit={handleSimulate} className="space-y-4">
                {formError && <Alert variant="error">{formError}</Alert>}

                <Select label="Asset" name="asset_id" options={assetOptions} required />
                <Select label="From (Sender)" name="from_investor_id" options={investorOptions} required />
                <Select label="To (Receiver)" name="to_investor_id" options={investorOptions} required />
                <Input label="Units" name="units" type="number" min={1} required placeholder="e.g., 1000" />

                {/* Validation Result */}
                {validationResult && (
                  <div className={classNames(
                    'rounded-lg border p-4',
                    validationResult.valid ? 'border-accent-500/20 bg-accent-500/10' : 'border-red-500/20 bg-red-500/10'
                  )}>
                    <p className={classNames(
                      'mb-1 text-sm font-semibold',
                      validationResult.valid ? 'text-accent-200' : 'text-red-300'
                    )}>
                      {validationResult.valid ? '✓ Validation Passed' : '✗ Validation Failed'}
                    </p>
                    {validationResult.summary && (
                      <p className="mb-2 text-sm text-ink-secondary">{validationResult.summary}</p>
                    )}
                    {validationResult.checks && validationResult.checks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {validationResult.checks.map((check, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className={check.passed ? 'text-accent-400' : 'text-red-400'}>
                              {check.passed ? '✓' : '✗'}
                            </span>
                            <span className="font-medium text-ink">{check.rule}</span>
                            <span className="text-ink-tertiary">— {check.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!validationResult.checks || validationResult.checks.length === 0) && validationResult.violations.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {validationResult.violations.map((v, i) => (
                          <li key={i} className="text-sm text-red-400">• {v}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-4 border-t border-edge bg-bg-primary rounded-b-xl flex-shrink-0">
              <div className="flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={resetForm}>Cancel</Button>
                <Button type="submit" form="transfer-form" disabled={simulating}>
                  {simulating ? 'Simulating...' : 'Simulate'}
                </Button>
                {validationResult?.valid && (
                  <Button type="button" onClick={handleExecute} disabled={executing}>
                    {executing ? 'Executing...' : 'Execute Transfer'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={resetBulkForm} />
          <div className="relative z-10 w-full max-w-4xl rounded-xl border border-edge bg-bg-secondary shadow-xl">
            <div className="flex items-center justify-between border-b border-edge px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Bulk Transfer Batch</h2>
                <p className="mt-0.5 text-xs text-ink-secondary">Simulate and execute multiple transfers in one workflow.</p>
              </div>
              <button
                onClick={resetBulkForm}
                className="rounded-lg p-1 text-ink-tertiary transition-colors hover:bg-bg-tertiary hover:text-ink"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {bulkError && (
                <div className="mb-4">
                  <Alert variant="error">{bulkError}</Alert>
                </div>
              )}

              <div className="mb-4 max-w-sm">
                <Select
                  label="Asset"
                  options={assetOptions}
                  value={bulkAssetId}
                  onChange={(e) => {
                    setBulkAssetId(e.target.value);
                    setBulkResults([]);
                    setBulkError(null);
                  }}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-edge-subtle">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-edge bg-bg-tertiary/60">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-tertiary">From</th>
                      <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-tertiary">To</th>
                      <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Units</th>
                      <th className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Result</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-ink-tertiary">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge-subtle">
                    {bulkRows.map((row) => {
                      const result = bulkResults.find((item) => item.rowId === row.id);
                      return (
                        <tr key={row.id}>
                          <td className="px-4 py-2">
                            <select
                              aria-label="From investor"
                              className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                              value={row.from_investor_id}
                              onChange={(e) => updateBulkRow(row.id, { from_investor_id: e.target.value })}
                            >
                              {investorOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              aria-label="To investor"
                              className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                              value={row.to_investor_id}
                              onChange={(e) => updateBulkRow(row.id, { to_investor_id: e.target.value })}
                            >
                              {investorOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              aria-label="Units"
                              type="number"
                              min={1}
                              className="block w-full rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                              value={row.units}
                              onChange={(e) => updateBulkRow(row.id, { units: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            {result ? (
                              <span className={classNames(
                                'text-xs font-medium',
                                result.valid ? 'text-emerald-600' : 'text-red-500'
                              )}>
                                {result.summary}
                              </span>
                            ) : (
                              <span className="text-xs text-ink-tertiary">Pending simulation</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={bulkRows.length === 1}
                              onClick={() => removeBulkRow(row.id)}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={addBulkRow}>
                  + Add Row
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-edge bg-bg-primary px-6 py-4">
              <Button variant="secondary" onClick={resetBulkForm}>Cancel</Button>
              <Button variant="secondary" disabled={bulkLoading} onClick={simulateBulk}>
                {bulkLoading ? 'Simulating...' : 'Simulate Batch'}
              </Button>
              <Button disabled={bulkExecuting} onClick={executeBulk}>
                {bulkExecuting ? 'Executing...' : 'Execute Batch'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!rejectTargetId}
        onClose={() => {
          setRejectTargetId(null);
          setRejectReason('');
        }}
        title="Reject Pending Transfer"
      >
        <div className="space-y-4">
          <Input
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Provide a clear reason for rejection"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setRejectTargetId(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim() || pendingActionId === rejectTargetId}
              onClick={handleRejectPending}
            >
              {pendingActionId === rejectTargetId ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* History Selector */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xs">
            <Select
              label="Asset Scope (optional)"
              options={assetOptions}
              value={selectedAssetId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedAssetId(value);
                updateUrl({ asset: value });
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">View</span>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              onClick={() => {
                setViewMode('table');
                updateUrl({ view: 'table' });
              }}
            >
              Table
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
              onClick={() => {
                setViewMode('kanban');
                updateUrl({ view: 'kanban' });
              }}
            >
              Kanban
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-tertiary">
          Showing {history.data?.length ?? 0} transfer{(history.data?.length ?? 0) === 1 ? '' : 's'}
          {selectedAssetId ? ' in selected asset' : ' across all assets'}.
        </p>
        {viewMode === 'kanban' && canReviewPendingTransfers && (
          <p className="mt-2 text-xs text-ink-tertiary">
            Drag pending cards to Executed to approve, or to Rejected to open rejection flow.
          </p>
        )}
      </Card>

      {/* Transfer History */}
      {history.loading ? (
        <SkeletonTable rows={5} />
      ) : history.error ? (
        <ErrorMessage message={history.error} onRetry={history.refetch} />
      ) : history.data && history.data.length > 0 ? (
        viewMode === 'table' ? (
          <Card padding={false}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <SortableHeader label="Date" sortKey="executed_at" sort={sort} onToggle={toggleSort} />
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Asset</th>
                  <SortableHeader label="From" sortKey="from_name" sort={sort} onToggle={toggleSort} />
                  <SortableHeader label="To" sortKey="to_name" sort={sort} onToggle={toggleSort} />
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Status</th>
                  <SortableHeader label="Units" sortKey="units" sort={sort} onToggle={toggleSort} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-subtle">
                {sortedHistory.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-bg-tertiary">
                    <td className="px-5 py-3 text-ink-tertiary">{formatDateTime(t.executed_at)}</td>
                    <td className="px-5 py-3 text-ink-secondary">{t.asset_name ?? t.asset_id}</td>
                    <td className="px-5 py-3 font-medium text-ink">{t.from_name}</td>
                    <td className="px-5 py-3 font-medium text-ink">{t.to_name}</td>
                    <td className="px-5 py-3">
                      <span className={classNames(
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1',
                        (t.status || 'executed') === 'executed' && 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25',
                        (t.status || 'executed') === 'pending_approval' && 'bg-amber-500/15 text-amber-700 ring-amber-500/25',
                        (t.status || 'executed') === 'rejected' && 'bg-red-500/15 text-red-600 ring-red-500/25',
                      )}>
                        {t.status || 'executed'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-medium text-ink-secondary">{formatNumber(t.units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {TRANSFER_KANBAN_COLUMNS.map((column) => {
              const items = kanbanGroups[column.key];
              const isDropActive = dragOverColumn === column.key;
              const canDropHere = canDropTransferToColumn(column.key);
              return (
                <div
                  key={column.key}
                  onDragOver={(event) => {
                    if (!canDropHere) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverColumn(column.key);
                  }}
                  onDragLeave={() => {
                    if (dragOverColumn === column.key) {
                      setDragOverColumn(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleTransferDrop(column.key);
                  }}
                  className={classNames(
                    'rounded-xl border border-edge bg-bg-secondary border-t-[3px] p-3 transition-colors',
                    column.borderClass,
                    isDropActive && canDropHere && 'bg-bg-tertiary/70 ring-1 ring-accent-400/30'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1', column.badgeClass)}>
                        {column.label}
                      </span>
                    </div>
                    <span className="rounded-md bg-bg-tertiary px-2 py-0.5 text-xs font-medium text-ink-secondary">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {column.key === 'pending_approval' && items.length > 0 && !canReviewPendingTransfers && (
                      <p className="rounded-md bg-bg-tertiary px-2 py-1 text-[11px] text-ink-tertiary">
                        Approval actions require admin or compliance officer role.
                      </p>
                    )}
                    {column.key !== 'pending_approval' && isDropActive && canDropHere && (
                      <p className="rounded-md bg-accent-500/10 px-2 py-1 text-[11px] text-ink-secondary">
                        Drop to set status to {column.label.toLowerCase()}.
                      </p>
                    )}
                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-edge-subtle bg-bg-tertiary/40 px-3 py-6 text-center text-xs text-ink-tertiary">
                        No transfers
                      </div>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          draggable={canDragTransferCard(item)}
                          onDragStart={(event) => {
                            if (!canDragTransferCard(item)) return;
                            setDraggedTransferId(item.id);
                            setDragOverColumn(null);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', item.id);
                          }}
                          onDragEnd={() => {
                            setDraggedTransferId(null);
                            setDragOverColumn(null);
                          }}
                          className={classNames(
                            'rounded-lg border border-edge-subtle bg-bg-primary p-3',
                            canDragTransferCard(item) && 'cursor-grab active:cursor-grabbing'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-ink">{item.from_name} -&gt; {item.to_name}</p>
                            <span className="text-xs font-mono text-ink-secondary">{formatNumber(item.units)}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-ink-secondary">{item.asset_name ?? item.asset_id}</p>
                          <p className="mt-1 text-[11px] text-ink-tertiary">{formatDateTime(item.executed_at)}</p>

                          {item.pending_reason && item.status === 'pending_approval' && (
                            <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700">
                              {item.pending_reason}
                            </p>
                          )}
                          {item.rejection_reason && item.status === 'rejected' && (
                            <p className="mt-2 rounded-md bg-red-500/10 px-2 py-1 text-[11px] text-red-600">
                              {item.rejection_reason}
                            </p>
                          )}

                          {item.status === 'pending_approval' && canReviewPendingTransfers && (
                            <div className="mt-2 flex gap-2 border-t border-edge-subtle pt-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={pendingActionId === item.id}
                                onClick={() => handleApprovePending(item.id)}
                              >
                                {pendingActionId === item.id ? 'Approving...' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={pendingActionId === item.id}
                                onClick={() => {
                                  setRejectTargetId(item.id);
                                  setRejectReason('');
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <EmptyState
          title="No transfers yet"
          description={selectedAssetId ? 'No transfers found for selected asset.' : 'Simulate and execute your first transfer using the button above.'}
        />
      )}
    </div>
  );
}
