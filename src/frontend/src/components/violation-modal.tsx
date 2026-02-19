'use client';

import React from 'react';
import { Modal, Badge } from './ui';
import { classNames, formatDateTime } from '../lib/utils';
import type { DecisionRecord, ComplianceReport } from '../lib/types';

interface ViolationModalProps {
  violationAsset: string | null;
  violationDecisions: DecisionRecord[];
  violationLoading: boolean;
  reports: ComplianceReport[];
  onClose: () => void;
}

export function ViolationModal({ violationAsset, violationDecisions, violationLoading, reports, onClose }: ViolationModalProps) {
  const eligCriteria = reports.flatMap((r) => r.eligibility_criteria);

  return (
    <Modal open={!!violationAsset} onClose={onClose} title={`Verstöße — ${violationAsset || ''}`}>
      {violationAsset && (() => {
        if (violationLoading) {
          return (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
              <span className="ml-2 text-sm text-ink-secondary">Lade Entscheidungen…</span>
            </div>
          );
        }

        return violationDecisions.length > 0 ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {violationDecisions.map((d) => (
              <div key={d.id} className="rounded-lg border border-edge-subtle p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ink">{d.decision_type.replace(/_/g, ' ')}</span>
                  <Badge variant={d.result === 'approved' ? 'green' : d.result === 'rejected' ? 'red' : 'gray'}>
                    {d.result}
                  </Badge>
                </div>
                <p className="text-xs tabular-nums text-ink-tertiary mb-3">{formatDateTime(d.decided_at)}</p>

                {d.result_details?.checks && d.result_details.checks.length > 0 && (
                  <div className="space-y-1.5">
                    {d.result_details.checks.map((check, ci) => (
                      <div
                        key={ci}
                        className={classNames(
                          'flex items-start gap-2 rounded-md px-3 py-2 text-xs',
                          check.passed ? 'bg-accent-500/10' : 'bg-semantic-danger-bg'
                        )}
                      >
                        <span className="mt-0.5 flex-shrink-0">
                          {check.passed ? (
                            <svg className="h-3.5 w-3.5 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5 text-semantic-danger" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={classNames('font-medium', check.passed ? 'text-accent-200' : 'text-semantic-danger')}>
                            {check.rule}
                          </p>
                          <p className={classNames('mt-0.5', check.passed ? 'text-accent-300' : 'text-semantic-danger')}>
                            {check.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {eligCriteria.length > 0 && (
                  <div className="mt-3 rounded-md border border-edge-subtle bg-bg-tertiary px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary mb-1">Regulatorische Zitate</p>
                    <div className="space-y-0.5">
                      {eligCriteria
                        .filter((c) => c.source_reference)
                        .slice(0, 5)
                        .map((c, ci) => (
                          <p key={ci} className="text-xs text-ink-secondary">
                            <span className="font-medium text-ink">{c.investor_type.replace(/_/g, ' ')}</span>
                            {' — '}
                            <span className="font-mono text-[11px]">{c.source_reference}</span>
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-secondary py-4 text-center">Keine detaillierten Verstoßdaten verfügbar.</p>
        );
      })()}
    </Modal>
  );
}
