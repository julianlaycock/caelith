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
import { formatNumber, formatPercentage } from '../../lib/utils';
import type { ApiError } from '../../lib/types';

export default function HoldingsPage() {
  const [showForm, setShowForm] = useState(false);
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
    () =>
      selectedAssetId
        ? api.getAssetUtilization(selectedAssetId)
        : Promise.resolve(null),
    [selectedAssetId]
  );

  const assetOptions = [
    { value: '', label: 'Select an asset...' },
    ...(assets.data?.map((a) => ({ value: a.id, label: a.name })) ?? []),
  ];

  const investorOptions = [
    { value: '', label: 'Select an investor...' },
    ...(investors.data?.map((i) => ({
      value: i.id,
      label: `${i.name} (${i.jurisdiction})`,
    })) ?? []),
  ];

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
      await api.allocateHolding({ asset_id, investor_id, units });
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
          <Button onClick={() => setShowForm(true)}>+ Allocate Units</Button>
        }
      />

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      {/* Allocate Modal */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setFormError(null);
        }}
        title="Allocate Units"
      >
        <form onSubmit={handleAllocate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Select label="Asset" name="asset_id" options={assetOptions} required />
          <Select
            label="Investor"
            name="investor_id"
            options={investorOptions}
            required
          />
          <Input
            label="Units"
            name="units"
            type="number"
            min={1}
            required
            placeholder="e.g., 10000"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Allocate</Button>
          </div>
        </form>
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

        {/* Utilization bar */}
        {utilization.data && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-600">
                {formatNumber(utilization.data.allocated_units)} /{' '}
                {formatNumber(utilization.data.total_units)} units allocated
              </span>
              <span className="font-medium text-gray-900">
                {formatPercentage(utilization.data.utilization_percentage)}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${Math.min(utilization.data.utilization_percentage, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Cap Table */}
      {!selectedAssetId ? (
        <EmptyState
          title="Select an asset"
          description="Choose an asset above to view its cap table."
        />
      ) : capTable.loading ? (
        <LoadingSpinner />
      ) : capTable.error ? (
        <ErrorMessage message={capTable.error} onRetry={capTable.refetch} />
      ) : capTable.data && capTable.data.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Investor</th>
                <th className="px-6 py-3 text-right">Units</th>
                <th className="px-6 py-3 text-right">Ownership %</th>
                <th className="px-6 py-3">Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {capTable.data.map((entry) => (
                <tr key={entry.investor_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {entry.investor_name}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {formatNumber(entry.units)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatPercentage(entry.percentage)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-2 w-full max-w-[120px] rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
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
          action={
            <Button onClick={() => setShowForm(true)}>+ Allocate Units</Button>
          }
        />
      )}
    </div>
  );
}