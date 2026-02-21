'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import {
  Card,
  Badge,
  Button,
  SectionHeader,
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';
import { classNames } from '../../lib/utils';
import type { BulkScreeningResult, ScreeningResult } from '../../lib/types';

const STATUS_CONFIG = {
  clear: { badge: 'green' as const, label: 'Clear', icon: '✓' },
  potential_match: { badge: 'yellow' as const, label: 'Potential Match', icon: '⚠' },
  confirmed_match: { badge: 'red' as const, label: 'Confirmed Match', icon: '🚨' },
};

function ResultCard({ result }: { result: ScreeningResult }) {
  const config = STATUS_CONFIG[result.status];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={classNames(
      'rounded-xl border p-4 transition-colors',
      result.status === 'confirmed_match' ? 'border-red-500/30 bg-red-500/5' :
      result.status === 'potential_match' ? 'border-amber-500/30 bg-amber-500/5' :
      'border-edge bg-bg-secondary'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{config.icon}</span>
          <div>
            <Link href={`/investors/${result.investorId}`} className="text-sm font-medium text-ink hover:text-accent-400 hover:underline">
              {result.investorName}
            </Link>
            <p className="text-xs text-ink-tertiary">
              Screened {new Date(result.screenedAt).toLocaleString('de-DE')} · {result.provider === 'mock' ? 'Demo mode' : 'OpenSanctions'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.badge}>{config.label}</Badge>
          {result.matches.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-accent-400 hover:underline">
              {expanded ? 'Hide' : `${result.matches.length} match${result.matches.length > 1 ? 'es' : ''}`}
            </button>
          )}
        </div>
      </div>

      {expanded && result.matches.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-edge pt-3">
          {result.matches.map((match, i) => (
            <div key={i} className="rounded-lg bg-bg-tertiary p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{match.name}</span>
                <span className={classNames(
                  'text-xs font-bold tabular-nums',
                  match.matchScore >= 80 ? 'text-red-400' :
                  match.matchScore >= 60 ? 'text-amber-400' : 'text-ink-secondary'
                )}>
                  {match.matchScore}% match
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {match.topics.map(t => (
                  <span key={t} className={classNames(
                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                    t === 'sanction' ? 'bg-red-500/10 text-red-400' :
                    t === 'pep' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-gray-500/10 text-gray-400'
                  )}>
                    {t}
                  </span>
                ))}
                {match.datasets.map(d => (
                  <span key={d} className="text-[10px] text-ink-tertiary">{d}</span>
                ))}
              </div>
              {match.referenceUrl && match.referenceUrl !== '#mock-result' && (
                <a href={match.referenceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-accent-400 hover:underline">
                  View on OpenSanctions →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScreeningPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBulkScreening = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.bulkScreen();
      setResults(data);
    } catch (err) {
      setError((err as Error).message || 'Screening failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-ink">Sanctions & PEP Screening</h1>
          <p className="text-sm text-ink-secondary">Screen investors against EU/UN/OFAC sanctions lists and PEP databases</p>
        </div>
        <Button onClick={runBulkScreening} disabled={loading}>
          {loading ? 'Screening...' : 'Run Full Screening'}
        </Button>
      </div>

      {!process.env.NEXT_PUBLIC_OPENSANCTIONS_KEY && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-400">
            <strong>Demo Mode:</strong> Running with simulated screening results. Set OPENSANCTIONS_API_KEY for live sanctions data.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {results && !loading && (
        <>
          {/* Summary */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="!p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Screened</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{results.totalScreened}</p>
              <p className="text-xs text-ink-tertiary">investors</p>
            </Card>
            <Card className="!p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-green-400">Clear</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-green-400">{results.clear}</p>
              <p className="text-xs text-ink-tertiary">no matches</p>
            </Card>
            <Card className={classNames('!p-4', results.potentialMatches > 0 ? 'ring-1 ring-amber-500/30' : '')}>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-400">Flagged</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">{results.potentialMatches}</p>
              <p className="text-xs text-ink-tertiary">require review</p>
            </Card>
            <Card className="!p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">Provider</p>
              <p className="mt-1 text-sm font-medium text-ink">{results.results[0]?.provider === 'mock' ? 'Demo Mode' : 'OpenSanctions'}</p>
              <p className="text-xs text-ink-tertiary">{new Date(results.screenedAt).toLocaleString('de-DE')}</p>
            </Card>
          </div>

          {/* Results */}
          <SectionHeader title="Results" description={`${results.totalScreened} investors screened`} />
          <div className="space-y-3">
            {/* Show flagged first */}
            {results.results
              .sort((a, b) => {
                const order = { confirmed_match: 0, potential_match: 1, clear: 2 };
                return order[a.status] - order[b.status];
              })
              .map(result => (
                <ResultCard key={result.investorId} result={result} />
              ))
            }
          </div>
        </>
      )}

      {!results && !loading && (
        <EmptyState
          title="No screening results"
          description="Click 'Run Full Screening' to screen all investors against sanctions and PEP databases."
        />
      )}
    </div>
  );
}
