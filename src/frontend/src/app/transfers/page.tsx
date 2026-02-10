'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Modal,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  Alert,
} from '../../components/ui';
import { formatNumber, formatDateTime } from '../../lib/utils';
import type { DetailedValidationResult, ApiError } from '../../lib/types';

export default function TransfersPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
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

  const assets = useAsync(() => api.getAssets());
  const investors = useAsync(() => api.getInvestors());
  const history = useAsync(
    () => selectedAssetId ? api.getTransferHistory(selectedAssetId) : Promise.resolve([]),
    [selectedAssetId, successMsg]
  );

  const assetOptions = [
    { value: '', label: 'Select asset...' },
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
      await api.executeTransfer(pendingTransfer);
      setShowForm(false);
      setValidationResult(null);
      setPendingTransfer(null);
      setSuccessMsg('Transfer executed successfully.');
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

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Simulate, execute, and review transfers"
        action={<Button onClick={() => setShowForm(true)}>+ New Transfer</Button>}
      />

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      <Modal open={showForm} onClose={resetForm} title="Transfer Units">
        <form onSubmit={handleSimulate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Select label="Asset" name="asset_id" options={assetOptions} required />
          <Select label="From (Sender)" name="from_investor_id" options={investorOptions} required />
          <Select label="To (Receiver)" name="to_investor_id" options={investorOptions} required />
          <Input label="Units" name="units" type="number" min={1} required placeholder="e.g., 1000" />

          {/* Validation Result */}
          {validationResult && (
            <div className={`rounded-lg border p-4 ${
              validationResult.valid ? 'border-brand-200 bg-brand-50' : 'border-red-200 bg-red-50'
            }`}>
              <p className={`mb-1 text-sm font-semibold ${
                validationResult.valid ? 'text-brand-800' : 'text-red-800'
              }`}>
                {validationResult.valid ? '✓ Validation Passed' : '✗ Validation Failed'}
              </p>
              {validationResult.summary && (
                <p className="mb-2 text-sm text-ink-secondary">{validationResult.summary}</p>
              )}
              {validationResult.checks && validationResult.checks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {validationResult.checks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={check.passed ? 'text-brand-600' : 'text-red-600'}>
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
                    <li key={i} className="text-sm text-red-700">• {v}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={resetForm}>Cancel</Button>
            <Button type="submit" disabled={simulating}>
              {simulating ? 'Simulating...' : 'Simulate'}
            </Button>
            {validationResult?.valid && (
              <Button type="button" onClick={handleExecute} disabled={executing}>
                {executing ? 'Executing...' : 'Execute Transfer'}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* History Selector */}
      <Card className="mb-6">
        <div className="max-w-xs">
          <Select
            label="Transfer History for Asset"
            options={assetOptions}
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
          />
        </div>
      </Card>

      {/* Transfer History */}
      {!selectedAssetId ? (
        <EmptyState title="Select an asset" description="Choose an asset above to view its transfer history." />
      ) : history.loading ? (
        <LoadingSpinner />
      ) : history.error ? (
        <ErrorMessage message={history.error} onRetry={history.refetch} />
      ) : history.data && history.data.length > 0 ? (
        <Card padding={false}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge">
              <tr>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Date</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">From</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">To</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-tertiary">Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {history.data.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-surface-subtle">
                  <td className="px-5 py-3 text-ink-tertiary">{formatDateTime(t.executed_at)}</td>
                  <td className="px-5 py-3 font-medium text-ink">{t.from_name}</td>
                  <td className="px-5 py-3 font-medium text-ink">{t.to_name}</td>
                  <td className="px-5 py-3 text-right font-mono font-medium text-ink-secondary">{formatNumber(t.units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          title="No transfers yet"
          description="No transfers have been executed for this asset."
          action={<Button onClick={() => setShowForm(true)}>+ New Transfer</Button>}
        />
      )}
    </div>
  );
}