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
import { formatDate, formatDateTime } from '../../lib/utils';
import type { RuleSet, CompositeRule, ApiError } from '../../lib/types';

const ALL_JURISDICTIONS = [
  'US', 'GB', 'CA', 'DE', 'FR', 'ES', 'IT', 'JP', 'SG', 'HK', 'CH', 'AU', 'KR', 'IE', 'BR', 'IN',
];

const CONDITION_FIELDS = [
  { value: 'to.jurisdiction', label: 'Recipient jurisdiction' },
  { value: 'to.accredited', label: 'Recipient accredited' },
  { value: 'from.jurisdiction', label: 'Sender jurisdiction' },
  { value: 'from.accredited', label: 'Sender accredited' },
  { value: 'transfer.units', label: 'Transfer units' },
  { value: 'holding.units', label: 'Sender holding units' },
];

const CONDITION_OPERATORS = [
  { value: 'eq', label: '= (equals)' },
  { value: 'neq', label: '≠ (not equals)' },
  { value: 'gt', label: '> (greater than)' },
  { value: 'gte', label: '≥ (greater or equal)' },
  { value: 'lt', label: '< (less than)' },
  { value: 'lte', label: '≤ (less or equal)' },
  { value: 'in', label: 'in (list)' },
  { value: 'not_in', label: 'not in (list)' },
];

export default function RulesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showCompositeForm, setShowCompositeForm] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [compositeFormError, setCompositeFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Built-in rules form state
  const [qualRequired, setQualRequired] = useState(false);
  const [lockupDays, setLockupDays] = useState('0');
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([]);
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [whitelistIds, setWhitelistIds] = useState('');

  // Composite rule form state
  const [crName, setCrName] = useState('');
  const [crDesc, setCrDesc] = useState('');
  const [crOperator, setCrOperator] = useState<'AND' | 'OR' | 'NOT'>('AND');
  const [crConditions, setCrConditions] = useState([
    { field: 'to.jurisdiction', operator: 'eq', value: '' },
  ]);

  const assets = useAsync(() => api.getAssets());
  const rules = useAsync(
    () => (selectedAssetId ? api.getRules(selectedAssetId).catch(() => null) : Promise.resolve(null)),
    [selectedAssetId, successMsg]
  );
  const compositeRules = useAsync(
    () => (selectedAssetId ? api.getCompositeRules(selectedAssetId).catch(() => []) : Promise.resolve([])),
    [selectedAssetId, successMsg]
  );
  const versions = useAsync(
    () => (selectedAssetId && showVersions ? api.getRuleVersions(selectedAssetId).catch(() => []) : Promise.resolve([])),
    [selectedAssetId, showVersions]
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

  // ── Built-in Rules Form ──
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const asset_id = form.get('asset_id') as string;
    if (!asset_id) { setFormError('Please select an asset.'); return; }
    if (selectedJurisdictions.length === 0) { setFormError('At least one jurisdiction required.'); return; }

    const transfer_whitelist = whitelistEnabled
      ? whitelistIds.split(',').map((s) => s.trim()).filter(Boolean)
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

  const openForm = (existing?: RuleSet | null) => {
    if (existing) {
      setQualRequired(existing.qualification_required);
      setLockupDays(String(existing.lockup_days));
      setSelectedJurisdictions(existing.jurisdiction_whitelist);
      setWhitelistEnabled(existing.transfer_whitelist !== null);
      setWhitelistIds(existing.transfer_whitelist?.join(', ') ?? '');
    } else {
      setQualRequired(false); setLockupDays('0');
      setSelectedJurisdictions([]); setWhitelistEnabled(false); setWhitelistIds('');
    }
    setFormError(null);
    setShowForm(true);
  };

  // ── Composite Rule Form ──
  const addCondition = () => {
    setCrConditions([...crConditions, { field: 'to.jurisdiction', operator: 'eq', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setCrConditions(crConditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, key: string, val: string) => {
    const updated = [...crConditions];
    updated[index] = { ...updated[index], [key]: val };
    setCrConditions(updated);
  };

  const parseConditionValue = (val: string, op: string): unknown => {
    if (op === 'in' || op === 'not_in') {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (val === 'true') return true;
    if (val === 'false') return false;
    const num = Number(val);
    return isNaN(num) ? val : num;
  };

  const handleCreateCompositeRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCompositeFormError(null);
    if (!selectedAssetId) { setCompositeFormError('Select an asset first.'); return; }
    if (!crName.trim()) { setCompositeFormError('Rule name is required.'); return; }
    if (crConditions.some((c) => !c.value)) { setCompositeFormError('All conditions need a value.'); return; }

    try {
      await api.createCompositeRule({
        asset_id: selectedAssetId,
        name: crName,
        description: crDesc,
        operator: crOperator,
        conditions: crConditions.map((c) => ({
          field: c.field,
          operator: c.operator as 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in',
          value: parseConditionValue(c.value, c.operator),
        })),
      });
      setShowCompositeForm(false);
      setCrName(''); setCrDesc(''); setCrOperator('AND');
      setCrConditions([{ field: 'to.jurisdiction', operator: 'eq', value: '' }]);
      setSuccessMsg('Composite rule created.');
    } catch (err) {
      setCompositeFormError((err as ApiError).message || 'Failed to create rule');
    }
  };

  const handleToggleCompositeRule = async (rule: CompositeRule) => {
    try {
      await api.updateCompositeRule(rule.id, { enabled: !rule.enabled });
      setSuccessMsg(rule.enabled ? 'Rule disabled.' : 'Rule enabled.');
    } catch (err) {
      setSuccessMsg(null);
    }
  };

  const handleDeleteCompositeRule = async (id: string) => {
    if (!confirm('Delete this composite rule?')) return;
    try {
      await api.deleteCompositeRule(id);
      setSuccessMsg('Composite rule deleted.');
    } catch (err) {
      setSuccessMsg(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Transfer Rules"
        description="Configure built-in and custom compliance rules per asset"
        action={<Button onClick={() => openForm()}>+ Create Rules</Button>}
      />

      {successMsg && (
        <div className="mb-4"><Alert variant="success">{successMsg}</Alert></div>
      )}

      {/* Built-in Rules Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Configure Built-in Rules">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Select label="Asset" name="asset_id" options={assetOptions} defaultValue={selectedAssetId} required />
          <Checkbox label="Require accredited investor status" checked={qualRequired} onChange={(e) => setQualRequired(e.target.checked)} />
          <Input label="Lockup Period (days)" type="number" min={0} value={lockupDays} onChange={(e) => setLockupDays(e.target.value)} />
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">Jurisdiction Whitelist</p>
            <div className="flex flex-wrap gap-2">
              {ALL_JURISDICTIONS.map((code) => (
                <button key={code} type="button" onClick={() => toggleJurisdiction(code)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedJurisdictions.includes(code)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>{code}</button>
              ))}
            </div>
          </div>
          <div>
            <Checkbox label="Enable transfer whitelist" checked={whitelistEnabled} onChange={(e) => setWhitelistEnabled(e.target.checked)} />
            {whitelistEnabled && (
              <div className="mt-2">
                <Input label="Allowed Investor IDs (comma-separated)" value={whitelistIds} onChange={(e) => setWhitelistIds(e.target.value)} placeholder="uuid1, uuid2, ..." />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Rules</Button>
          </div>
        </form>
      </Modal>

      {/* Composite Rule Modal */}
      <Modal open={showCompositeForm} onClose={() => setShowCompositeForm(false)} title="Create Custom Compliance Rule">
        <form onSubmit={handleCreateCompositeRule} className="space-y-4">
          {compositeFormError && <Alert variant="error">{compositeFormError}</Alert>}
          <Input label="Rule Name" value={crName} onChange={(e) => setCrName(e.target.value)} placeholder="e.g., EU recipients only" required />
          <Input label="Description" value={crDesc} onChange={(e) => setCrDesc(e.target.value)} placeholder="What does this rule enforce?" />
          <Select label="Logic Operator" options={[
            { value: 'AND', label: 'AND — all conditions must be true' },
            { value: 'OR', label: 'OR — any condition can be true' },
            { value: 'NOT', label: 'NOT — condition must be false' },
          ]} value={crOperator} onChange={(e) => setCrOperator(e.target.value as 'AND' | 'OR' | 'NOT')} />

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Conditions</p>
            {crConditions.map((c, i) => (
              <div key={i} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <select value={c.field} onChange={(e) => updateCondition(i, 'field', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="w-36">
                  <select value={c.operator} onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {CONDITION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <input value={c.value} onChange={(e) => updateCondition(i, 'value', e.target.value)}
                    placeholder="Value (e.g., US or 100000)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
                {crConditions.length > 1 && (
                  <button type="button" onClick={() => removeCondition(i)}
                    className="rounded-md p-2 text-red-500 hover:bg-red-50">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addCondition}
              className="mt-1 text-sm text-indigo-600 hover:text-indigo-800">+ Add condition</button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCompositeForm(false)}>Cancel</Button>
            <Button type="submit">Create Rule</Button>
          </div>
        </form>
      </Modal>

      {/* Asset Selector */}
      <Card className="mb-6">
        <div className="max-w-xs">
          <Select label="View Rules for Asset" options={assetOptions} value={selectedAssetId}
            onChange={(e) => { setSelectedAssetId(e.target.value); setSuccessMsg(null); }} />
        </div>
      </Card>

      {!selectedAssetId ? (
        <EmptyState title="Select an asset" description="Choose an asset above to view its rules." />
      ) : rules.loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* Built-in Rules Card */}
          {rules.data ? (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Built-in Rules <Badge variant="blue">v{rules.data.version}</Badge></h3>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowVersions(!showVersions)}>
                    {showVersions ? 'Hide History' : 'Version History'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openForm(rules.data)}>Edit</Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-gray-600">Qualification Required</span>
                  <Badge variant={rules.data.qualification_required ? 'green' : 'gray'}>
                    {rules.data.qualification_required ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-gray-600">Lockup Period</span>
                  <span className="font-medium text-gray-900">{rules.data.lockup_days} days</span>
                </div>
                <div className="border-b pb-3">
                  <span className="text-sm text-gray-600">Jurisdiction Whitelist</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rules.data.jurisdiction_whitelist.map((j: string) => (
                      <Badge key={j} variant="blue">{j}</Badge>
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
              <p className="mt-4 text-xs text-gray-400">Created {formatDate(rules.data.created_at)}</p>
            </Card>
          ) : (
            <Card>
              <EmptyState title="No built-in rules" description="Configure transfer restrictions for this asset."
                action={<Button onClick={() => openForm()}>+ Create Rules</Button>} />
            </Card>
          )}

          {/* Version History */}
          {showVersions && (
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Rule Version History</h3>
              {versions.loading ? <LoadingSpinner /> : versions.data && versions.data.length > 0 ? (
                <div className="space-y-3">
                  {versions.data.map((v) => {
                    const config = v.config as Record<string, unknown>;
                    return (
                      <div key={v.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Version {v.version}</span>
                          <span className="text-xs text-gray-500">{formatDateTime(v.created_at)}</span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>Qualification: {config.qualification_required ? 'required' : 'not required'}</p>
                          <p>Lockup: {String(config.lockup_days)} days</p>
                          <p>Jurisdictions: {Array.isArray(config.jurisdiction_whitelist) ? (config.jurisdiction_whitelist as string[]).join(', ') : 'none'}</p>
                          <p>Transfer whitelist: {config.transfer_whitelist === null ? 'unrestricted' : 'restricted'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No version history available.</p>
              )}
            </Card>
          )}

          {/* Composite Rules Card */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Custom Compliance Rules</h3>
              <Button size="sm" onClick={() => setShowCompositeForm(true)}>+ Add Rule</Button>
            </div>

            {compositeRules.loading ? <LoadingSpinner /> : compositeRules.data && compositeRules.data.length > 0 ? (
              <div className="space-y-3">
                {compositeRules.data.map((rule) => (
                  <div key={rule.id} className={`rounded-lg border p-4 ${rule.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{rule.name}</span>
                        <Badge variant={rule.enabled ? 'green' : 'gray'}>{rule.enabled ? 'Active' : 'Disabled'}</Badge>
                        <Badge variant="blue">{rule.operator}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleCompositeRule(rule)}
                          className="text-xs text-indigo-600 hover:text-indigo-800">
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleDeleteCompositeRule(rule.id)}
                          className="text-xs text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </div>
                    {rule.description && <p className="mb-2 text-sm text-gray-600">{rule.description}</p>}
                    <div className="space-y-1">
                      {rule.conditions.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-700">{c.field}</span>
                          <span className="text-gray-500">{c.operator}</span>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-indigo-700">
                            {Array.isArray(c.value) ? (c.value as string[]).join(', ') : String(c.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">Created {formatDate(rule.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No custom rules" description="Add programmable compliance rules with field conditions."
                action={<Button size="sm" onClick={() => setShowCompositeForm(true)}>+ Add Rule</Button>} />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}