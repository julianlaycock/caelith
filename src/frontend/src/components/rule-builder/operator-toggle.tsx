'use client';

import React from 'react';

type Operator = 'AND' | 'OR' | 'NOT';

interface OperatorToggleProps {
  value: Operator;
  onChange: (value: Operator) => void;
}

const OPTIONS: Operator[] = ['AND', 'OR', 'NOT'];

export function OperatorToggle({ value, onChange }: OperatorToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-edge overflow-hidden">
      {OPTIONS.map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(op)}
          className={
            op === value
              ? 'px-4 py-1.5 text-xs font-semibold bg-[#000042] text-white transition-colors'
              : 'px-4 py-1.5 text-xs font-semibold bg-white text-ink-secondary hover:bg-surface-subtle transition-colors'
          }
        >
          {op}
        </button>
      ))}
    </div>
  );
}
