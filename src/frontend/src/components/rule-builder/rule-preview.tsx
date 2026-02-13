'use client';

import React from 'react';
import type { RuleCondition } from '../../lib/types';

interface RulePreviewProps {
  name: string;
  description: string;
  assetId: string;
  operator: 'AND' | 'OR' | 'NOT';
  conditions: RuleCondition[];
}

export function RulePreview({ name, description, assetId, operator, conditions }: RulePreviewProps) {
  const payload = {
    name: name || '(untitled)',
    description: description || '',
    asset_id: assetId || '(select asset)',
    operator,
    conditions,
    enabled: true,
  };

  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-2">JSON Preview</h3>
      <pre className="rounded-xl border border-edge bg-surface-subtle p-4 text-xs leading-relaxed text-ink overflow-x-auto font-mono">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
