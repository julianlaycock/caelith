'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import type { RuleCondition, ApiError } from '../../lib/types';

interface NLIntegrationProps {
  assetId: string;
  onApply: (result: { operator: 'AND' | 'OR' | 'NOT'; conditions: RuleCondition[]; name: string; description: string }) => void;
}

export function NLIntegration({ assetId, onApply }: NLIntegrationProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !assetId) return;
    setLoading(true);
    setError(null);
    setConfidence(null);
    try {
      const result = await api.compileNaturalLanguageRule(prompt, assetId);
      const rule = result.proposed_rule;
      onApply({
        operator: rule.operator as 'AND' | 'OR' | 'NOT',
        conditions: rule.conditions || [],
        name: rule.name || '',
        description: rule.description || '',
      });
      setConfidence(result.confidence);
    } catch (err) {
      setError((err as ApiError)?.message || 'Failed to generate rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
          placeholder="Describe your rule in English..."
          maxLength={500}
          disabled={!assetId}
          className="flex-1 rounded-lg border border-edge px-3 py-2 text-sm bg-bg-secondary focus:outline-none focus:ring-1 focus:ring-accent-400/30 disabled:opacity-50 placeholder:text-ink-placeholder"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim() || !assetId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-[#000033] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
          Generate
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!assetId && (
        <p className="text-xs text-ink-tertiary">Select an asset first to use the AI rule generator.</p>
      )}

      {confidence !== null && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-300 ring-1 ring-inset ring-accent-500/20">
            Confidence: {Math.round(confidence * 100)}%
          </span>
          <span className="text-xs text-ink-tertiary">Conditions populated below — review and edit before saving.</span>
        </div>
      )}
    </div>
  );
}
