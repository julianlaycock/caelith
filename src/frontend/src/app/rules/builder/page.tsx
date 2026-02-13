'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import { PageHeader, Card, Button, Input, Alert, LoadingSpinner } from '../../../components/ui';
import { ConditionGroup, RulePreview, RuleTestPanel, NLIntegration } from '../../../components/rule-builder';
import type { RuleCondition } from '../../../lib/types';

export default function RuleBuilderPage() {
  const router = useRouter();
  const { data: assets, loading: assetsLoading } = useAsync(() => api.getAssets());

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assetId, setAssetId] = useState('');
  const [operator, setOperator] = useState<'AND' | 'OR' | 'NOT'>('AND');
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { field: 'to.jurisdiction', operator: 'eq', value: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNlApply = (result: { operator: 'AND' | 'OR' | 'NOT'; conditions: RuleCondition[]; name: string; description: string }) => {
    setOperator(result.operator);
    setConditions(result.conditions.length > 0 ? result.conditions : conditions);
    if (result.name) setName(result.name);
    if (result.description) setDescription(result.description);
  };

  const handleSave = async () => {
    if (!assetId) { setError('Please select an asset.'); return; }
    if (!name.trim()) { setError('Please enter a rule name.'); return; }
    if (conditions.length === 0) { setError('Add at least one condition.'); return; }

    const hasEmpty = conditions.some((c) => {
      if (typeof c.value === 'string' && !c.value) return true;
      if (Array.isArray(c.value) && c.value.length === 0) return true;
      return false;
    });
    if (hasEmpty) { setError('All conditions must have values.'); return; }

    setSaving(true);
    setError(null);
    try {
      await api.createCompositeRule({
        asset_id: assetId,
        name: name.trim(),
        description: description.trim(),
        operator,
        conditions,
        enabled: true,
      });
      router.push('/rules');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save rule';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (assetsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  const assetOptions = (assets || []).map((a) => ({ value: a.id, label: a.name }));

  return (
    <div>
      <PageHeader
        title="Rule Builder"
        description="Visually create compliance rules with conditions and logic operators"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push('/rules')}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Rule'}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4"><Alert variant="error">{error}</Alert></div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* NL Integration */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-4 w-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">AI Rule Generator</span>
            </div>
            <NLIntegration assetId={assetId} onApply={handleNlApply} />
          </Card>

          {/* Asset Selection */}
          <Card>
            <label htmlFor="asset-select" className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">
              Asset
            </label>
            <select
              id="asset-select"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="block w-full rounded-lg border border-edge px-3 py-2 text-sm bg-bg-primary text-ink focus:outline-none focus:ring-1 focus:ring-accent-400/30 focus:border-accent-400 placeholder:text-ink-muted"
            >
              <option value="">Select asset...</option>
              {assetOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Card>

          {/* Conditions */}
          <Card>
            <h2 className="text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-3">Conditions</h2>
            <ConditionGroup
              operator={operator}
              conditions={conditions}
              onOperatorChange={setOperator}
              onConditionsChange={setConditions}
            />
          </Card>

          {/* Name & Description */}
          <Card>
            <div className="space-y-4">
              <Input
                label="Rule Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SIF eligible investor gate"
                required
              />
              <div>
                <label htmlFor="rule-description" className="block text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-1.5">
                  Description
                </label>
                <textarea
                  id="rule-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this rule does..."
                  rows={3}
                  className="block w-full rounded-lg border border-edge px-3 py-2 text-sm bg-bg-primary text-ink border-edge focus:outline-none focus:ring-1 focus:ring-accent-400/30 focus:border-accent-400 resize-none placeholder:text-ink-muted"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: Preview + Test */}
        <div className="space-y-6">
          <Card>
            <RulePreview
              name={name}
              description={description}
              assetId={assetId}
              operator={operator}
              conditions={conditions}
            />
          </Card>

          <Card>
            <RuleTestPanel operator={operator} conditions={conditions} />
          </Card>
        </div>
      </div>
    </div>
  );
}
