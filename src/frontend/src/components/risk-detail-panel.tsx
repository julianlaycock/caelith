'use client';

import React from 'react';
import Link from 'next/link';
import { classNames } from '../lib/utils';
import type { RiskFlag } from '../lib/dashboard-utils';

interface RiskDetailPanelProps {
  risk: RiskFlag;
  today: string;
  onClose: () => void;
}

export function RiskDetailPanel({ risk, today, onClose }: RiskDetailPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="ml-auto relative z-10 w-full md:max-w-md h-full bg-surface shadow-xl border-l border-edge overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-surface px-6 py-4">
          <h2 className="text-base font-semibold text-ink">Risikoflagge Detail</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-ink-tertiary hover:bg-bg-tertiary hover:text-ink transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Severity */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Schweregrad</p>
            <span className={classNames(
              'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider',
              risk.severity === 'high' && 'bg-semantic-danger-bg text-semantic-danger',
              risk.severity === 'medium' && 'bg-semantic-warning-bg text-semantic-warning',
              risk.severity === 'low' && 'bg-accent-500/15 text-accent-300',
            )}>
              {risk.severity}
            </span>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Kategorie</p>
            <p className="text-sm font-medium text-ink">{risk.category}</p>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Beschreibung</p>
            <p className="text-sm text-ink leading-relaxed">{risk.message}</p>
          </div>

          {/* Affected Entities / Recommended Actions */}
          <div>
            {risk.details && risk.details.length > 0 ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Betroffene Einheiten</p>
                <div className="space-y-2">
                  {risk.details.map((detail, di) => (
                    <div key={di} className="rounded-lg border border-edge bg-bg-tertiary p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{detail.label}</p>
                          <p className="text-xs text-ink-secondary mt-0.5">{detail.info}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {detail.href && (
                            <Link
                              href={detail.href}
                              className="text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors whitespace-nowrap"
                              onClick={onClose}
                            >
                              Anzeigen →
                            </Link>
                          )}
                          {detail.actionLabel && detail.actionHref && (
                            <Link
                              href={detail.actionHref}
                              className={classNames(
                                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                                risk.severity === 'high'
                                  ? 'bg-semantic-danger-bg text-semantic-danger hover:bg-semantic-danger/15'
                                  : risk.severity === 'medium'
                                  ? 'bg-semantic-warning-bg text-semantic-warning hover:bg-semantic-warning/15'
                                  : 'bg-accent-500/15 text-accent-300 hover:bg-accent-500/25',
                              )}
                              onClick={onClose}
                            >
                              {detail.actionLabel} →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary mb-2">Empfohlene Maßnahmen</p>
                <div className={classNames(
                  'rounded-lg border p-4 space-y-2',
                  risk.severity === 'high' ? 'border-semantic-danger/20 bg-semantic-danger-bg' : risk.severity === 'medium' ? 'border-semantic-warning/20 bg-semantic-warning-bg' : 'border-accent-500/20 bg-accent-500/10',
                )}>
                  {risk.severity === 'high' && (
                    <>
                      <p className="text-sm text-semantic-danger font-medium">Sofortige Aufmerksamkeit erforderlich</p>
                      <ul className="space-y-1 text-sm text-semantic-danger">
                        <li>&bull; Überprüfen und beheben Sie die markierte Bedingung</li>
                        <li>&bull; Bei Nichtlösung an Compliance Officer eskalieren</li>
                        <li>&bull; Behebungsschritte dokumentieren</li>
                      </ul>
                    </>
                  )}
                  {risk.severity === 'medium' && (
                    <>
                      <p className="text-sm text-semantic-warning font-medium">Innerhalb von 7 Tagen überprüfen</p>
                      <ul className="space-y-1 text-sm text-semantic-warning">
                        <li>&bull; Markierte Bedingung untersuchen</li>
                        <li>&bull; Folgeaktion bei Bedarf planen</li>
                        <li>&bull; Auf Eskalation überwachen</li>
                      </ul>
                    </>
                  )}
                  {risk.severity === 'low' && (
                    <>
                      <p className="text-sm text-ink font-medium">Beobachten und überprüfen</p>
                      <ul className="space-y-1 text-sm text-accent-300">
                        <li>&bull; Für die nächste regelmäßige Überprüfung vormerken</li>
                        <li>&bull; Kein sofortiger Handlungsbedarf</li>
                      </ul>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Timestamp */}
          <div className="rounded-lg bg-bg-tertiary px-4 py-3">
            <p className="text-xs text-ink-tertiary">Markiert am: {today}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
