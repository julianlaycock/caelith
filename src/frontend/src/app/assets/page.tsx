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
  Badge,
  Alert,
} from '../../components/ui';
import { formatNumber, formatDate } from '../../lib/utils';
import type { ApiError } from '../../lib/types';

const ASSET_TYPES = [
  { value: 'Fund', label: 'Fund' },
  { value: 'LP Interest', label: 'LP Interest' },
  { value: 'SPV', label: 'SPV' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Private Equity', label: 'Private Equity' },
  { value: 'Other', label: 'Other' },
];

export default function AssetsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const assets = useAsync(() => api.getAssets());

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const asset_type = form.get('asset_type') as string;
    const total_units = Number(form.get('total_units'));

    if (!name || !asset_type || !total_units || total_units <= 0) {
      setFormError('All fields are required. Total units must be positive.');
      return;
    }

    try {
      await api.createAsset({ name, asset_type, total_units });
      setFormSuccess(true);
      setShowForm(false);
      assets.refetch();
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to create asset');
    }
  };

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Manage private asset definitions"
        action={
          <Button onClick={() => setShowForm(true)}>+ Create Asset</Button>
        }
      />

      {formSuccess && (
        <div className="mb-4">
          <Alert variant="success">Asset created successfully.</Alert>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Create Asset"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input label="Asset Name" name="name" required placeholder="e.g., Growth Fund I" />
          <Select
            label="Asset Type"
            name="asset_type"
            options={[{ value: '', label: 'Select type...' }, ...ASSET_TYPES]}
            required
          />
          <Input
            label="Total Units"
            name="total_units"
            type="number"
            min={1}
            required
            placeholder="e.g., 1000000"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      {selectedAsset && (
        <AssetDetailModal assetId={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}

      {assets.loading ? (
        <LoadingSpinner />
      ) : assets.error ? (
        <ErrorMessage message={assets.error} onRetry={assets.refetch} />
      ) : assets.data && assets.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.data.map((asset) => (
            <Card key={asset.id} className="cursor-pointer transition-shadow hover:shadow-md">
              <div onClick={() => setSelectedAsset(asset.id)}>
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{asset.name}</h3>
                  <Badge variant="blue">{asset.asset_type}</Badge>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatNumber(asset.total_units)}
                </p>
                <p className="text-xs text-slate-500">total units</p>
                <p className="mt-3 text-xs text-slate-400">
                  Created {formatDate(asset.created_at)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No assets yet"
          description="Create your first asset to get started."
          action={<Button onClick={() => setShowForm(true)}>+ Create Asset</Button>}
        />
      )}
    </div>
  );
}

function AssetDetailModal({
  assetId,
  onClose,
}: {
  assetId: string;
  onClose: () => void;
}) {
  const asset = useAsync(() => api.getAsset(assetId), [assetId]);
  const utilization = useAsync(() => api.getAssetUtilization(assetId), [assetId]);

  return (
    <Modal open={true} onClose={onClose} title="Asset Details">
      {asset.loading ? (
        <LoadingSpinner />
      ) : asset.error ? (
        <ErrorMessage message={asset.error} />
      ) : asset.data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Name</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{asset.data.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Type</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{asset.data.asset_type}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Units</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{formatNumber(asset.data.total_units)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Created</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{formatDate(asset.data.created_at)}</p>
            </div>
          </div>

          {utilization.data && (
            <div className="border-t border-slate-200 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Utilization</p>
              <div className="mb-2 h-1.5 w-full rounded-full bg-slate-200">
                <div
                  className="h-1.5 rounded-full bg-blue-800"
                  style={{ width: `${Math.min(utilization.data.utilization_percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{formatNumber(utilization.data.allocated_units)} allocated</span>
                <span>{formatNumber(utilization.data.available_units)} available</span>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4">
            <p className="font-mono text-xs text-slate-400">ID: {asset.data.id}</p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}