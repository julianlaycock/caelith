'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useFormAction } from '../../lib/use-form-action';
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
import { ASSET_TYPES } from '../../lib/constants';

export default function AssetsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const createForm = useFormAction();
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const assets = useAsync(() => api.getAssets());

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormSuccess(null);

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const asset_type = form.get('asset_type') as string;
    const total_units = Number(form.get('total_units'));

    if (!name || !asset_type || !total_units || total_units <= 0) {
      createForm.setError('All fields are required. Total units must be positive.');
      return;
    }

    const ok = await createForm.execute(
      () => api.createAsset({ name, asset_type, total_units }),
      'Failed to create asset',
    );
    if (ok) {
      setFormSuccess('Asset created successfully.');
      setShowForm(false);
      assets.refetch();
    }
  };

  const handleAssetChanged = () => {
    setSelectedAsset(null);
    assets.refetch();
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
          <Alert variant="success">{formSuccess}</Alert>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Create Asset"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createForm.error && <Alert variant="error">{createForm.error}</Alert>}
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
        <AssetDetailModal
          assetId={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onDeleted={() => { setFormSuccess('Asset deleted successfully.'); handleAssetChanged(); }}
          onUpdated={() => { setFormSuccess('Asset updated successfully.'); handleAssetChanged(); }}
        />
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
                  <h3 className="text-sm font-semibold text-ink">{asset.name}</h3>
                  <Badge variant="blue">{asset.asset_type}</Badge>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                  {formatNumber(asset.total_units)}
                </p>
                <p className="text-xs text-ink-tertiary">total units</p>
                <p className="mt-3 text-xs text-ink-tertiary">
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
  onDeleted,
  onUpdated,
}: {
  assetId: string;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const action = useFormAction();

  const asset = useAsync(() => api.getAsset(assetId), [assetId]);
  const utilization = useAsync(() => api.getAssetUtilization(assetId), [assetId]);

  const handleDelete = async () => {
    const ok = await action.execute(
      () => api.deleteAsset(assetId),
      'Failed to delete asset',
    );
    if (ok) {
      onDeleted();
    } else {
      setDeleting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const asset_type = form.get('asset_type') as string;
    const total_units = Number(form.get('total_units'));

    if (!name || !asset_type || !total_units || total_units <= 0) {
      action.setError('All fields are required. Total units must be positive.');
      return;
    }

    const ok = await action.execute(
      () => api.updateAsset(assetId, { name, asset_type, total_units }),
      'Failed to update asset',
    );
    if (ok) {
      onUpdated();
    }
  };

  if (deleting) {
    return (
      <Modal open={true} onClose={() => setDeleting(false)} title="Delete Asset">
        <div className="space-y-4">
          {action.error && <Alert variant="error">{action.error}</Alert>}
          <p className="text-sm text-ink-secondary">
            Are you sure you want to delete <strong className="text-ink">{asset.data?.name}</strong>?
            This action cannot be undone.
          </p>
          {utilization.data && utilization.data.allocated_units > 0 && (
            <Alert variant="error">
              This asset has {formatNumber(utilization.data.allocated_units)} allocated units.
              Remove all holdings before deleting.
            </Alert>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={!!utilization.data && utilization.data.allocated_units > 0}
            >
              Delete Asset
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (editing && asset.data) {
    return (
      <Modal open={true} onClose={() => setEditing(false)} title="Edit Asset">
        <form onSubmit={handleUpdate} className="space-y-4">
          {action.error && <Alert variant="error">{action.error}</Alert>}
          <Input
            label="Asset Name"
            name="name"
            required
            defaultValue={asset.data.name}
          />
          <Select
            label="Asset Type"
            name="asset_type"
            options={ASSET_TYPES}
            required
            defaultValue={asset.data.asset_type}
          />
          <Input
            label="Total Units"
            name="total_units"
            type="number"
            min={1}
            required
            defaultValue={asset.data.total_units}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    );
  }

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
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Name</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{asset.data.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Type</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{asset.data.asset_type}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Total Units</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{formatNumber(asset.data.total_units)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Created</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{formatDate(asset.data.created_at)}</p>
            </div>
          </div>

          {utilization.data && (
            <div className="border-t border-edge pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-tertiary">Utilization</p>
              <div className="mb-2 h-1.5 w-full rounded-full bg-surface-subtle">
                <div
                  className="h-1.5 rounded-full bg-brand-500"
                  style={{ width: `${Math.min(utilization.data.utilization_percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-ink-tertiary">
                <span>{formatNumber(utilization.data.allocated_units)} allocated</span>
                <span>{formatNumber(utilization.data.available_units)} available</span>
              </div>
            </div>
          )}

          <div className="border-t border-edge pt-4">
            <p className="font-mono text-xs text-ink-tertiary">ID: {asset.data.id}</p>
          </div>

          <div className="flex justify-end gap-3 border-t border-edge pt-4">
            <Button variant="ghost" size="sm" onClick={() => setDeleting(true)}>
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
