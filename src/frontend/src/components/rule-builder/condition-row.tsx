'use client';

import React, { useState } from 'react';
import { FIELDS, OPERATOR_LABELS, getFieldDef } from './field-config';
import type { RuleCondition } from '../../lib/types';

// ── List value input with chip display ──────────────────────────────────────

function ListValueInput({ value, onChange }: { value: string[]; onChange: (items: string[]) => void }) {
  const [inputText, setInputText] = useState('');

  const addItems = (text: string) => {
    const newItems = text.split(',').map((s) => s.trim()).filter(Boolean);
    if (newItems.length === 0) return;
    const merged = Array.from(new Set([...value, ...newItems]));
    onChange(merged);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addItems(inputText);
    } else if (e.key === 'Backspace' && !inputText && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (inputText.trim()) addItems(inputText);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 min-w-[120px]">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-edge bg-white px-2 py-1 focus-within:ring-1 focus-within:ring-[#000042] min-h-[34px]">
        {value.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-0.5 rounded bg-surface-subtle border border-edge-subtle px-1.5 py-0.5 text-xs font-mono text-ink"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="ml-0.5 text-ink-tertiary hover:text-red-600 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? 'US, LU, DE' : ''}
          className="flex-1 min-w-[60px] border-0 bg-transparent px-0 py-0.5 text-sm outline-none placeholder:text-ink-placeholder"
        />
      </div>
    </div>
  );
}

// ── Condition row ───────────────────────────────────────────────────────────

interface ConditionRowProps {
  condition: RuleCondition;
  onChange: (updated: RuleCondition) => void;
  onDelete: () => void;
}

export function ConditionRow({ condition, onChange, onDelete }: ConditionRowProps) {
  const fieldDef = getFieldDef(condition.field);
  const fieldType = fieldDef?.type ?? 'string';
  const validOperators = fieldDef?.operators ?? ['eq'];

  const handleFieldChange = (newField: string) => {
    const def = getFieldDef(newField);
    const ops = def?.operators ?? ['eq'];
    const firstOp = ops[0] as RuleCondition['operator'];
    const defaultValue = def?.type === 'boolean' ? true : def?.type === 'number' ? 0 : '';
    onChange({ field: newField, operator: firstOp, value: defaultValue });
  };

  const handleOperatorChange = (newOp: string) => {
    const isListOp = newOp === 'in' || newOp === 'not_in';
    const wasListOp = condition.operator === 'in' || condition.operator === 'not_in';
    let newValue = condition.value;

    if (isListOp && !wasListOp) {
      newValue = typeof condition.value === 'string' && condition.value ? [condition.value] : [];
    } else if (!isListOp && wasListOp) {
      newValue = Array.isArray(condition.value) ? condition.value[0] ?? '' : '';
    }

    onChange({ ...condition, operator: newOp as RuleCondition['operator'], value: newValue });
  };

  const isListOperator = condition.operator === 'in' || condition.operator === 'not_in';

  return (
    <div className="flex items-center gap-2 rounded-lg border border-edge bg-white p-3">
      {/* Field */}
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="rounded-lg border border-edge px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#000042] min-w-[170px]"
      >
        <option value="">Select field...</option>
        {FIELDS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => handleOperatorChange(e.target.value)}
        className="rounded-lg border border-edge px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#000042] min-w-[140px]"
      >
        {validOperators.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op] || op}</option>
        ))}
      </select>

      {/* Value */}
      {fieldType === 'boolean' ? (
        <select
          value={String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
          className="rounded-lg border border-edge px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#000042] min-w-[90px]"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : fieldType === 'number' ? (
        <input
          type="number"
          value={typeof condition.value === 'number' ? condition.value : ''}
          onChange={(e) => onChange({ ...condition, value: e.target.value === '' ? 0 : Number(e.target.value) })}
          placeholder="0"
          className="rounded-lg border border-edge px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#000042] w-32"
        />
      ) : isListOperator ? (
        <ListValueInput
          value={Array.isArray(condition.value) ? condition.value : []}
          onChange={(items) => onChange({ ...condition, value: items })}
        />
      ) : (
        <input
          type="text"
          value={typeof condition.value === 'string' ? condition.value : String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Value"
          className="rounded-lg border border-edge px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#000042] flex-1 min-w-[120px]"
        />
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg p-1.5 text-ink-tertiary hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Remove condition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
