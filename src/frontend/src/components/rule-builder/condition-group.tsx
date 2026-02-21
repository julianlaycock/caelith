'use client';

import React from 'react';
import { OperatorToggle } from './operator-toggle';
import { ConditionRow } from './condition-row';
import type { RuleCondition } from '../../lib/types';

// NOTE [2026-02-21]: v2 feature — support nested ConditionGroups for (A AND (B OR C))
// patterns. Current implementation supports flat condition lists with a single operator.
// Tracked as: BACKLOG — Nested composite rule conditions

interface ConditionGroupProps {
  operator: 'AND' | 'OR' | 'NOT';
  conditions: RuleCondition[];
  onOperatorChange: (op: 'AND' | 'OR' | 'NOT') => void;
  onConditionsChange: (conditions: RuleCondition[]) => void;
}

export function ConditionGroup({ operator, conditions, onOperatorChange, onConditionsChange }: ConditionGroupProps) {
  const handleConditionChange = (index: number, updated: RuleCondition) => {
    const next = [...conditions];
    next[index] = updated;
    onConditionsChange(next);
  };

  const handleDelete = (index: number) => {
    onConditionsChange(conditions.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onConditionsChange([...conditions, { field: 'to.jurisdiction', operator: 'eq', value: '' }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Logic</span>
        <OperatorToggle value={operator} onChange={onOperatorChange} />
      </div>

      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <ConditionRow
            key={index}
            condition={condition}
            onChange={(updated) => handleConditionChange(index, updated)}
            onDelete={() => handleDelete(index)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-edge px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:border-edge-strong hover:bg-bg-tertiary transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add condition
      </button>
    </div>
  );
}
