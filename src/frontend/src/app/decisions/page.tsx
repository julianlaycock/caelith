'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Card,
  Select,
  Modal,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  Badge,
  SectionHeader,
} from '../../components/ui';
import { formatDateTime } from '../../lib/utils';
import type { DecisionRecord } from '../../lib/types';

const RESULT_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  approved: 'green',
  pass: 'green',
  eligible: 'green',
  rejected: 'red',
  fail: 'red',
  ineligible: 'red',
  pending: 'yellow',
};

export default function DecisionsPage() {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedDecision, setSelectedDecision] = useState<DecisionRecord | null>(null);

  const assets = useAsync(() => api.getAssets());

  const decisions = useAsync(
    () => selectedAssetId ? api.getDecisionsByAsset(selectedAssetId) : Promise.resolve([]),
    [selectedAssetId]
  );

  const assetOptions = [
    { value: '', label: 'Select an asset...' },
    ...(assets.data?.map((a) => ({ value: a.id, label: a.name })) ?? []),
  ];

  return (
    <div>
      <PageHeader
        title="Decisions"
        description="Compliance decision audit trail"
      />

      {/* Filter */}
      <Card className="mb-6">
        <div className="max-w-xs">
          <Select
            label="Filter by Asset"
            options={assetOptions}
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
          />
        </div>
      </Card>

      {/* Decision Detail Modal */}
      <Modal
        open={!!selectedDecision}
        onClose={() => setSelectedDecision(null)}
        title="Decision Details"
      >
        {selectedDecision && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</p>
                <p className="mt-0.5 text-sm text-ink">{selectedDecision.decision_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Result</p>
                <div className="mt-0.5">
                  <Badge variant={RESULT_COLORS[selectedDecision.result] || 'gray'}>
                    {selectedDecision.result}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Decided At</p>
                <p className="mt-0.5 text-sm text-ink">{formatDateTime(selectedDecision.decided_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Decided By</p>
                <p className="mt-0.5 text-sm text-ink">{selectedDecision.decided_by || 'System'}</p>
              </div>
              {selectedDecision.subject_id && (
                <div className="col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Subject ID</p>
                  <p className="mt-0.5 text-sm font-mono text-ink-secondary">{selectedDecision.subject_id}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Asset ID</p>
                <p className="mt-0.5 text-sm font-mono text-ink-secondary">{selectedDecision.asset_id}</p>
              </div>
            </div>

            {/* Checks */}
            {selectedDecision.result_details?.checks && selectedDecision.result_details.checks.length > 0 && (
              <div>
                <SectionHeader title="Compliance Checks" description={`${selectedDecision.result_details.violation_count} violation${selectedDecision.result_details.violation_count !== 1 ? 's' : ''}`} />
                <div className="space-y-1.5">
                  {selectedDecision.result_details.checks.map((check, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={check.passed ? 'text-brand-600 mt-0.5' : 'text-red-600 mt-0.5'}>
                        {check.passed ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </span>
                      <div>
                        <span className="font-medium text-ink">{check.rule}</span>
                        <span className="text-ink-secondary"> — {check.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-edge-subtle pt-3">
              <p className="font-mono text-xs text-ink-tertiary">ID: {selectedDecision.id}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Content */}
      {!selectedAssetId ? (
        <EmptyState
          title="Select an asset"
          description="Choose an asset above to view its compliance decisions."
        />
      ) : decisions.loading ? (
        <LoadingSpinner />
      ) : decisions.error ? (
        <ErrorMessage message={decisions.error} onRetry={decisions.refetch} />
      ) : decisions.data && decisions.data.length > 0 ? (
        <div>
          <SectionHeader
            title="Decision Records"
            description={`${decisions.data.length} decision${decisions.data.length !== 1 ? 's' : ''}`}
          />
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Time</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Type</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Result</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">Violations</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary">By</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-ink-tertiary"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {decisions.data.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-subtle transition-colors">
                      <td className="px-6 py-3 text-xs tabular-nums text-ink-secondary">
                        {formatDateTime(d.decided_at)}
                      </td>
                      <td className="px-6 py-3 text-sm text-ink">
                        {d.decision_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={RESULT_COLORS[d.result] || 'gray'}>{d.result}</Badge>
                      </td>
                      <td className="px-6 py-3 text-sm tabular-nums text-ink-secondary">
                        {d.result_details?.violation_count === 0
                          ? 'All passed'
                          : `${d.result_details?.violation_count ?? '?'} violation${(d.result_details?.violation_count ?? 0) !== 1 ? 's' : ''}`}
                      </td>
                      <td className="px-6 py-3 text-xs text-ink-secondary">
                        {d.decided_by || 'System'}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setSelectedDecision(d)}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="No decisions found"
          description="No compliance decisions have been recorded for this asset yet."
        />
      )}
    </div>
  );
}
