'use client';

import { useRouter } from 'next/navigation';
import { classNames } from '../../../lib/utils';
import { useI18n } from '../../../lib/i18n';
import type { ActionQueueItem } from '../../../lib/dashboard-utils';

export function ActionQueueSidebar({ items }: { items: ActionQueueItem[] }) {
  const router = useRouter();
  const { t } = useI18n();

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-edge bg-surface overflow-hidden">
      <div
        className="px-3.5 py-3 flex justify-between items-center border-b border-[rgba(248,113,113,0.08)]"
        style={{ background: 'linear-gradient(90deg, rgba(248,113,113,0.08) 0%, rgba(252,165,165,0.03) 100%)' }}
      >
        <span className="text-xs font-bold text-[#fca5a5]">⚡ {t('dashboard.actionQueue')}</span>
        <span className="text-[13px] font-extrabold text-semantic-danger bg-[rgba(248,113,113,0.12)] w-6 h-6 rounded-full flex items-center justify-center">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-edge-subtle">
        {items.map((item) => {
          const isHigh = item.severity === 'high';
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-bg-tertiary transition-colors text-left"
            >
              <div
                className={classNames(
                  'w-[3px] h-6 rounded-full bg-gradient-to-b flex-shrink-0',
                  isHigh ? 'from-[#fca5a5] to-[#f87171]' : 'from-[#f0c9a6] to-[#E8A87C]'
                )}
              />
              <div className="min-w-0">
                <div className={classNames('text-[11px] font-semibold', isHigh ? 'text-[#fca5a5]' : 'text-[#f0c9a6]')}>
                  {item.title}
                </div>
                <div className="text-[10px] text-ink-tertiary">{item.detail}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
