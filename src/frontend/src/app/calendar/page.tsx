'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import {
  Card,
  Badge,
  Button,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
} from '../../components/ui';
import { classNames } from '../../lib/utils';
import type { CalendarEvent } from '../../lib/types';

function useCategoryLabels() {
  const { t } = useI18n();
  return {
    kyc: t('calendar.cat.kyc'),
    reporting: t('calendar.cat.reporting'),
    regulatory: t('calendar.cat.regulatory'),
    document: t('calendar.cat.document'),
    review: t('calendar.cat.review'),
  } as Record<string, string>;
}

const CATEGORY_COLORS: Record<string, string> = {
  kyc: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  reporting: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  regulatory: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  document: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  review: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

function useSeverityConfig() {
  const { t } = useI18n();
  return {
    critical: { badge: 'red' as const, icon: '🔴', label: t('calendar.sev.critical') },
    warning: { badge: 'yellow' as const, icon: '🟡', label: t('calendar.sev.warning') },
    info: { badge: 'gray' as const, icon: '🔵', label: t('calendar.sev.info') },
  };
}

function DaysLabel({ days }: { days: number }) {
  const { t } = useI18n();
  if (days < 0) {
    return (
      <span className="text-xs font-semibold text-red-400">
        {Math.abs(days)}d {t('calendar.overdue').toLowerCase()}
      </span>
    );
  }
  if (days === 0) {
    return <span className="text-xs font-semibold text-red-400">{t('calendar.today')}</span>;
  }
  if (days <= 7) {
    return <span className="text-xs font-semibold text-red-400">{days}d</span>;
  }
  if (days <= 30) {
    return <span className="text-xs font-semibold text-amber-400">{days}d</span>;
  }
  return <span className="text-xs text-ink-tertiary">{days}d</span>;
}

function EventCard({ event }: { event: CalendarEvent }) {
  const { t } = useI18n();
  const SEVERITY_CONFIG = useSeverityConfig();
  const CATEGORY_LABELS = useCategoryLabels();
  const config = SEVERITY_CONFIG[event.severity];
  const catColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.review;

  return (
    <div className={classNames(
      'group flex items-start gap-4 rounded-xl border p-4 transition-colors hover:bg-bg-tertiary',
      event.daysUntil < 0 ? 'border-red-500/30 bg-red-500/5' :
      event.severity === 'critical' ? 'border-red-500/20 bg-bg-secondary' :
      event.severity === 'warning' ? 'border-amber-500/20 bg-bg-secondary' :
      'border-edge bg-bg-secondary'
    )}>
      {/* Date column */}
      <div className="flex-shrink-0 w-16 text-center">
        <div className="text-2xl font-bold tabular-nums text-ink">
          {new Date(event.date + 'T00:00:00').getDate()}
        </div>
        <div className="text-xs uppercase text-ink-tertiary">
          {new Date(event.date + 'T00:00:00').toLocaleDateString('en', { month: 'short' })}
        </div>
        <div className="text-xs tabular-nums text-ink-tertiary">
          {new Date(event.date + 'T00:00:00').getFullYear()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-ink truncate">{event.title}</h3>
          <span className={classNames('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', catColor)}>
            {CATEGORY_LABELS[event.category] || event.category}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-secondary line-clamp-2">{event.description}</p>
        {event.entityId && event.entityType === 'investor' && (
          <Link
            href={`/investors/${event.entityId}`}
            className="mt-1.5 inline-flex items-center text-xs text-accent-400 hover:text-accent-300 hover:underline"
          >
            {t('calendar.viewInvestor')} →
          </Link>
        )}
        {event.entityId && event.entityType === 'fund_structure' && (
          <Link
            href={`/funds/${event.entityId}`}
            className="mt-1.5 inline-flex items-center text-xs text-accent-400 hover:text-accent-300 hover:underline"
          >
            {t('calendar.viewFund')} →
          </Link>
        )}
      </div>

      {/* Right: severity + days */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <Badge variant={config.badge}>{config.label}</Badge>
        <DaysLabel days={event.daysUntil} />
      </div>
    </div>
  );
}

type ViewMode = 'all' | 'upcoming' | 'overdue';
type CategoryFilter = 'all' | 'kyc' | 'reporting' | 'regulatory' | 'document';

export default function CalendarPage() {
  const { t } = useI18n();
  const CATEGORY_LABELS = useCategoryLabels();
  const [view, setView] = useState<ViewMode>('upcoming');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const calendarData = useAsync(() => api.getCalendarEvents(), []);
  const alertData = useAsync(() => api.getCalendarAlerts(90), []);

  const events = useMemo(() => {
    const all = calendarData.data?.events || [];
    let filtered = all;

    if (view === 'upcoming') {
      filtered = filtered.filter(e => e.daysUntil >= 0);
    } else if (view === 'overdue') {
      filtered = filtered.filter(e => e.daysUntil < 0);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    return filtered;
  }, [calendarData.data, view, categoryFilter]);

  const summary = alertData.data?.summary;

  if (calendarData.loading) return <LoadingSpinner />;
  if (calendarData.error) return <ErrorMessage message={calendarData.error} onRetry={calendarData.refetch} />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-ink">{t('calendar.title')}</h1>
          <p className="text-sm text-ink-secondary">{t('calendar.subtitle')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => calendarData.refetch()}>
          {t('common.refresh')}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('calendar.next90')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{summary.total}</p>
            <p className="text-xs text-ink-tertiary">{t('calendar.events')}</p>
          </Card>
          <Card className={classNames('!p-4', summary.overdue > 0 ? 'ring-1 ring-red-500/30' : '')}>
            <p className="text-xs font-medium uppercase tracking-wide text-red-400">{t('calendar.overdue')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-red-400">{summary.overdue}</p>
            <p className="text-xs text-ink-tertiary">{t('calendar.requireAction')}</p>
          </Card>
          <Card className={classNames('!p-4', summary.critical > 0 ? 'ring-1 ring-amber-500/30' : '')}>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-400">{t('calendar.sev.critical')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">{summary.critical}</p>
            <p className="text-xs text-ink-tertiary">{t('calendar.within30')}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">{t('calendar.sev.warning')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{summary.warning}</p>
            <p className="text-xs text-ink-tertiary">{t('calendar.within90')}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {(['upcoming', 'overdue', 'all'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={classNames(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              view === v
                ? 'bg-accent-500/20 text-accent-300'
                : 'text-ink-secondary hover:text-ink hover:bg-bg-tertiary'
            )}
          >
            {v === 'upcoming' ? t('calendar.upcoming') : v === 'overdue' ? t('calendar.overdue') : t('common.all')}
            {v === 'overdue' && summary?.overdue ? ` (${summary.overdue})` : ''}
          </button>
        ))}

        <span className="mx-2 h-4 w-px bg-edge" />

        {(['all', 'kyc', 'reporting', 'regulatory', 'document'] as CategoryFilter[]).map(c => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={classNames(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              categoryFilter === c
                ? 'bg-accent-500/20 text-accent-300'
                : 'text-ink-secondary hover:text-ink hover:bg-bg-tertiary'
            )}
          >
            {c === 'all' ? t('calendar.allTypes') : CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      {/* Event List */}
      {events.length === 0 ? (
        <EmptyState
          title={t('calendar.noEvents')}
          description={view === 'overdue' ? t('calendar.noOverdue') : t('calendar.noEventsDesc')}
        />
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
