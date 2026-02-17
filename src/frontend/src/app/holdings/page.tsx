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
  SkeletonTable,
  ErrorMessage,
  EmptyState,
  Alert,
  ExportMenu,
} from '../../components/ui';
import { exportCSV } from '../../lib/export-csv';
import { formatNumber, formatPercentage, toAssetOptions, toInvestorOptions } from '../../lib/utils';
import type { ApiError } from '../../lib/types';
import { CsvUploadWizard } from '../../components/csv-upload-wizard';

export default function HoldingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const assets = useAsync(() => api.getAssets());
  const investors = useAsync(() => api.getInvestors());
  const capTable = useAsync(
    () => (selectedAssetId ? api.getCapTable(selectedAssetId) : Promise.resolve([])),
    [selectedAssetId]
  );
  const utilization = useAsync(
    () => selectedAssetId ? api.getAssetUtilization(selectedAssetId) : Promise.resolve(null),
    [selectedAssetId]
  );

  const assetOptions = toAssetOptions(assets.data);
  const investorOptions = toInvestorOptions(investors.data);

  const handleAllocate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const asset_id = form.get('asset_id') as string;
    const investor_id = form.get('investor_id') as string;
    const units = Number(form.get('units'));

    if (!asset_id || !investor_id || !units || units <= 0) {
      setFormError('All fields are required. Units must be positive.');
      return;
    }

    try {
      await api.allocateHolding({ asset_id, investor_id, units, acquired_at: new Date().toISOString() });
      setShowForm(false);
      setSuccessMsg('Units allocated successfully.');
      capTable.refetch();
      utilization.refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to allocate units');
    }
  };

  return (
    <div>
      <PageHeader
        title="Holdings & Cap Table"
        description="View ownership and allocate units"
        action={
          <div className="flex items-center gap-2">
            {selectedAssetId && (
              <ExportMenu
                onExportCSV={() => {
                  if (!capTable.data || capTable.data.length === 0) return;
                  exportCSV('caelith-cap-table.csv',
                    ['Investor', 'Units', 'Ownership %'],
                    capTable.data.map(e => [e.investor_name, String(e.units), String(e.percentage)])
                  );
                }}
                onExportPDF={() => api.downloadCapTablePdf(selectedAssetId)}
              />
            )}
            <Button variant="secondary" onClick={() => setShowCsvImport(true)}>Import CSV</Button>
            <Button onClick={() => setShowForm(true)} disabled={!selectedAssetId}>+ Allocate Units</Button>
          </div>
        }
      />

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setFormError(null); }} title="Allocate Units">
        <form onSubmit={handleAllocate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Select label="Asset" name="asset_id" options={assetOptions} required defaultValue={selectedAssetId} />
          <Select label="Investor" name="investor_id" options={investorOptions} required />
          <Input label="Units" name="units" type="number" min={1} required placeholder="e.g., 10000" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Allocate</Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={showCsvImport} onClose={() => setShowCsvImport(false)} title="Import Holdings from CSV" size="lg">
        <CsvUploadWizard
          entityType="holdings"
          onComplete={() => { setShowCsvImport(false); capTable.refetch(); }}
          onCancel={() => setShowCsvImport(false)}
        />
      </Modal>

      {/* Asset Selector */}
      <Card className="mb-6">
        <div className="max-w-xs">
          <Select
            label="Select Asset for Cap Table"
            options={assetOptions}
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
          />
        </div>

        {utilization.data && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-ink-secondary">
                {formatNumber(utilization.data.allocated_units)} / {formatNumber(utilization.data.total_units)} units allocated
              </span>
              <span className="font-medium text-ink">
                {formatPercentage(utilization.data.utilization_percentage)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-bg-tertiary">
              <div
                className="h-1.5 rounded-full bg-accent-500 transition-all"
                style={{ width: `${Math.min(utilization.data.utilization_percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Cap Table */}
      {!selectedAssetId ? (
        <EmptyState title="Select an asset" description="Choose an asset above to view its cap table." />
      ) : capTable.loading ? (
        <SkeletonTable rows={5} />
      ) : capTable.error ? (
        <ErrorMessage message={capTable.error} onRetry={capTable.refetch} />
      ) : capTable.data && capTable.data.length > 0 ? (
        <Card padding={false}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge">
              <tr>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Investor</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-tertiary">Units</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-tertiary">Ownership %</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {capTable.data.map((entry) => (
                <tr key={entry.investor_id} className="transition-colors hover:bg-bg-tertiary">
                  <td className="px-5 py-3 font-medium text-ink">{entry.investor_name}</td>
                  <td className="px-5 py-3 text-right font-mono text-ink-secondary">{formatNumber(entry.units)}</td>
                  <td className="px-5 py-3 text-right font-mono font-medium text-ink">{formatPercentage(entry.percentage)}</td>
                  <td className="px-5 py-3">
                    <div className="h-1.5 w-full max-w-[120px] rounded-full bg-bg-tertiary">
                      <div
                        className="h-1.5 rounded-full bg-accent-500"
                        style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState
          title="No holdings"
          description="No units have been allocated for this asset yet."
          action={<Button onClick={() => setShowForm(true)}>+ Allocate Units</Button>}
        />
      )}
    </div>
  );
}