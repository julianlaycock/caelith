'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import type { RuleCondition, Investor } from '../../lib/types';

interface RuleTestPanelProps {
  operator: 'AND' | 'OR' | 'NOT';
  conditions: RuleCondition[];
}

interface TestResult {
  investor: Investor;
  blocked: boolean;
}

function resolveField(investor: Investor, field: string): unknown {
  // In test mode, we treat each investor as the "to" (recipient) party
  const map: Record<string, unknown> = {
    'to.jurisdiction': investor.jurisdiction,
    'to.accredited': investor.accredited,
    'from.jurisdiction': investor.jurisdiction,
    'from.accredited': investor.accredited,
    // transfer.units and holding.units cannot be meaningfully tested without context
  };
  return map[field];
}

function evaluateCondition(condition: RuleCondition, investor: Investor): boolean {
  const actual = resolveField(investor, condition.field);
  if (actual === undefined) return true; // skip fields we can't resolve

  const { operator, value } = condition;
  switch (operator) {
    case 'eq': return actual === value;
    case 'neq': return actual !== value;
    case 'gt': return typeof actual === 'number' && actual > (value as number);
    case 'gte': return typeof actual === 'number' && actual >= (value as number);
    case 'lt': return typeof actual === 'number' && actual < (value as number);
    case 'lte': return typeof actual === 'number' && actual <= (value as number);
    case 'in': return Array.isArray(value) && value.includes(String(actual));
    case 'not_in': return Array.isArray(value) && !value.includes(String(actual));
    default: return true;
  }
}

function evaluateRule(operator: 'AND' | 'OR' | 'NOT', conditions: RuleCondition[], investor: Investor): boolean {
  if (conditions.length === 0) return true;
  const results = conditions.map((c) => evaluateCondition(c, investor));
  switch (operator) {
    case 'AND': return results.every(Boolean);
    case 'OR': return results.some(Boolean);
    case 'NOT': return !results.every(Boolean);
  }
}

export function RuleTestPanel({ operator, conditions }: RuleTestPanelProps) {
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const investors = await api.getInvestors();
      const testResults = investors.map((investor: Investor) => ({
        investor,
        blocked: !evaluateRule(operator, conditions, investor),
      }));
      setResults(testResults);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load investors');
    } finally {
      setLoading(false);
    }
  };

  const blockedCount = results?.filter((r) => r.blocked).length ?? 0;
  const totalCount = results?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Test Results</h3>
        <button
          type="button"
          onClick={runTest}
          disabled={loading || conditions.length === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-bg-secondary border border-edge px-3 py-1 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-bg-tertiary transition-colors disabled:opacity-50"
        >
          {loading ? (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
          )}
          Test
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {results && (
        <div className="rounded-xl border border-edge bg-bg-tertiary p-3 space-y-2">
          <p className="text-sm font-medium text-ink">
            Would block <span className="text-red-400">{blockedCount}</span> of {totalCount} investors
          </p>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.map((r) => (
              <div
                key={r.investor.id}
                className="flex items-center justify-between rounded-lg px-2 py-1 text-xs"
              >
                <span className="text-ink">
                  {r.investor.name}
                  <span className="text-ink-tertiary ml-1">({r.investor.jurisdiction})</span>
                </span>
                {r.blocked ? (
                  <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                    blocked
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-300 ring-1 ring-inset ring-accent-500/20">
                    pass
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-ink-tertiary italic">
            Approximate preview. Each investor is tested as the recipient. Save and run official validation for authoritative results.
          </p>
        </div>
      )}
    </div>
  );
}
