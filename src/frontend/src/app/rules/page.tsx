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
  Checkbox,
  Modal,
  LoadingSpinner,
  EmptyState,
  Badge,
  Alert,
} from '../../components/ui';
import { formatDate } from '../../lib/utils';
import type { RuleSet, ApiError } from '../../lib/types';

const ALL_JURISDICTIONS = [
  'US', 'GB', 'CA', 'DE', 'FR', 'JP', 'SG', 'HK', 'CH', 'AU', 'KR', 'BR', 'IN', 'CN', 'RU',
];

export default function RulesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [qualRequired, setQualRequired] = useState(false);
  const [lockupDays, setLockupDays] = useState('0');
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([]);
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [whitelistIds, setWhitelistIds] = useState('');

  const assets = useAsync(() => api.getAssets());
  const rules = useAsync(
    () => (selectedAssetId ? api.getRules(selectedAssetId).catch(() => null) : Promise.resolve(null)),
    [selectedAssetId, successMsg]
  );

  const assetOptions = [
    { value: '', label: 'Select an asset...' },
    ...(assets.data?.map((a) => ({ value: a.id, label: a.name })) ?? []),
  ];

  const toggleJurisdiction = (code: string) => {
    setSelectedJurisdictions((prev) =>
      prev.includes(code) ? prev.filter((j) => j !== code) : [...prev, code]
    );
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const asset_id = form.get('asset_id') as string;

    if (!asset_id) {
      setFormError('Please select an asset.');
      return;
    }

    if (selectedJurisdictions.length === 0) {
      setFormError('At least one jurisdiction must be whitelisted.');
      return;
    }

    const transfer_whitelist = whitelistEnabled
      ? whitelistIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    try {
      await api.createRules({
        asset_id,
        qualification_required: qualRequired,
        lockup_days: Number(lockupDays) || 0,
        jurisdiction_whitelist: selectedJurisdictions,
        transfer_whitelist,
      });
      setShowForm(false);
      setSuccessMsg('Rules saved successfully.');
      setSelectedAssetId(asset_id);
    } catch (err) {
      setFormError((err as ApiError).message || 'Failed to save rules');
    }
  };

  // Pre-fill form when editing existing rules
  const openForm = (existing?: RuleSet | null) => {
    if (existing) {
      setQualRequired(existing.qualification_required);
      setLockupDays(String(existing.lockup_days));
      setSelectedJurisdictions(existing.jurisdiction_whitelist);
      setWhitelistEnabled(existing.transfer_whitelist !== null);
      setWhitelistIds(existing.transfer_whitelist?.join(', ') ?? '');
    } else {
      setQualRequired(false);
      setLockupDays('0');
      setSelectedJurisdictions([]);
      setWhitelistEnabled(false);
      setWhitelistIds('');
    }
    setFormError(null);
    setShowForm(true);
  };

  return (
    <div>
      <PageHeader
        title="Transfer Rules"
        description="Configure compliance rules per asset"
        action={
          <Button onClick={() => openForm()}>+ Create Rules</Button>
        }
      />

      {successMsg && (
        <div className="mb-4">
          <Alert variant="success">{successMsg}</Alert>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Configure Rules"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Select label="Asset" name="asset_id" options={assetOptions} defaultValue={selectedAssetId} required />

          <Checkbox
            label="Require accredited investor status"
            checked={qualRequired}
            onChange={(e) => setQualRequired(e.target.checked)}
          />

          <Input
            label="Lockup Period (days)"
            type="number"
            min={0}
            value={lockupDays}
            onChange={(e) => setLockupDays(e.target.value)}
          />

          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">
              Jurisdiction Whitelist
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_JURISDICTIONS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleJurisdiction(code)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedJurisdictions.includes(code)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Checkbox
              label="Enable transfer whitelist (restrict to specific investors)"
              checked={whitelistEnabled}
              onChange={(e) => setWhitelistEnabled(e.target.checked)}
            />
            {whitelistEnabled && (
              <div className="mt-2">
                <Input
                  label="Allowed Investor IDs (comma-separated)"
                  value={whitelistIds}
                  onChange={(e) => setWhitelistIds(e.target.value)}
                  placeholder="uuid1, uuid2, ..."
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Rules</Button>
          </div>
        </form>
      </Modal>

      {/* View Rules */}
      <Card className="mb-6">
        <div className="max-w-xs">
          <Select
            label="View Rules for Asset"
            options={assetOptions}
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
          />
        </div>
      </Card>

      {!selectedAssetId ? (
        <EmptyState
          title="Select an asset"
          description="Choose an asset above to view its rules."
        />
      ) : rules.loading ? (
        <LoadingSpinner />
      ) : rules.data ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Active Rules (v{rules.data.version})
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openForm(rules.data)}
            >
              Edit
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-gray-600">
                Qualification Required
              </span>
              <Badge
                variant={
                  rules.data.qualification_required ? 'green' : 'gray'
                }
              >
                {rules.data.qualification_required ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-gray-600">Lockup Period</span>
              <span className="font-medium text-gray-900">
                {rules.data.lockup_days} days
              </span>
            </div>
            <div className="border-b pb-3">
              <span className="text-sm text-gray-600">
                Jurisdiction Whitelist
              </span>
              <div className="mt-2 flex flex-wrap gap-1">
                {rules.data.jurisdiction_whitelist.map((j: string) => (
                  <Badge key={j} variant="blue">
                    {j}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Transfer Whitelist</span>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {rules.data.transfer_whitelist === null
                  ? 'Unrestricted (any investor)'
                  : `${rules.data.transfer_whitelist.length} investor(s) whitelisted`}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Created {formatDate(rules.data.created_at)}
          </p>
        </Card>
      ) : (
        <EmptyState
          title="No rules configured"
          description="This asset has no transfer rules yet."
          action={
            <Button onClick={() => openForm()}>+ Create Rules</Button>
          }
        />
      )}
    </div>
  );
}