'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, SectionHeader } from './ui';
import { classNames } from '../lib/utils';
import type { ActionQueueItem } from '../lib/dashboard-utils';

interface ActionQueueProps {
  items: ActionQueueItem[];
}

export function ActionQueue({ items }: ActionQueueProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <SectionHeader title="Aktionswarteschlange" description="Priorisierte Aktionen aus dem Portfoliostatus" />
      <Card padding={false}>
        <div className="divide-y divide-edge-subtle">
          {items.map((item) => {
            const severityClass = item.severity === 'high'
              ? 'text-semantic-danger bg-semantic-danger-bg ring-semantic-danger/20'
              : item.severity === 'medium'
              ? 'text-semantic-warning bg-semantic-warning-bg ring-semantic-warning/20'
              : 'text-accent-700 bg-accent-500/10 ring-accent-500/20';

            const buttonClass = item.severity === 'high'
              ? 'bg-semantic-danger-bg text-semantic-danger border-semantic-danger/20 hover:bg-semantic-danger/10'
              : item.severity === 'medium'
              ? 'bg-semantic-warning-bg text-semantic-warning border-semantic-warning/20 hover:bg-semantic-warning/10'
              : 'border-edge text-ink-secondary hover:border-edge-strong hover:text-ink';

            return (
              <div key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={classNames(
                      'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1',
                      severityClass
                    )}>
                      {item.severity}
                    </span>
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink-secondary">{item.detail}</p>
                </div>
                <button
                  onClick={() => router.push(item.href)}
                  className={classNames(
                    'self-start sm:self-auto sm:ml-3 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    buttonClass
                  )}
                >
                  Öffnen
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
