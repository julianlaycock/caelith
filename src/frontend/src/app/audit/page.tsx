'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Card,
  Select,
  Input,
  Button,
  SkeletonTable,
  ErrorMessage,
  EmptyState,
  Badge,
  ExportMenu,
} from '../../components/ui';
import { exportCSV } from '../../lib/export-csv';
import { formatDateTime } from '../../lib/utils';

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All event types' },
  { value: 'asset.created', label: 'Asset Created' },
  { value: 'investor.created', label: 'Investor Created' },
  { value: 'investor.updated', label: 'Investor Updated' },
  { value: 'holding.allocated', label: 'Holding Allocated' },
  { value: 'holding.updated', label: 'Holding Updated' },
  { value: 'rules.created', label: 'Rules Created' },
  { value: 'rules.updated', label: 'Rules Updated' },
  { value: 'transfer.executed', label: 'Transfer Executed' },
  { value: 'transfer.pending_approval', label: 'Transfer Pending Approval' },
  { value: 'transfer.rejected', label: 'Transfer Rejected' },
  { value: 'composite_rule.created', label: 'Custom Rule Created' },
  { value: 'composite_rule.updated', label: 'Custom Rule Updated' },
  { value: 'composite_rule.deleted', label: 'Custom Rule Deleted' },
];

const EVENT_BADGE_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  'asset.created': 'blue',
  'investor.created': 'blue',
  'investor.updated': 'gray',
  'holding.allocated': 'green',
  'holding.updated': 'gray',
  'rules.created': 'blue',
  'rules.updated': 'yellow',
  'transfer.executed': 'green',
  'transfer.pending_approval': 'yellow',
  'transfer.rejected': 'red',
  'composite_rule.created': 'yellow',
  'composite_rule.updated': 'yellow',
  'composite_rule.deleted': 'red',
};

export default function AuditPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parseLimit = (value: string | null) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(500, Math.max(1, parsed));
  };

  const [eventType, setEventType] = useState(searchParams.get('eventType') || '');
  const [entityId, setEntityId] = useState(searchParams.get('entityId') || '');
  const [limit, setLimit] = useState(parseLimit(searchParams.get('limit')));

  useEffect(() => {
    setEventType(searchParams.get('eventType') || '');
    setEntityId(searchParams.get('entityId') || '');
    setLimit(parseLimit(searchParams.get('limit')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateUrl = (next: { eventType?: string; entityId?: string; limit?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.eventType !== undefined) {
      if (next.eventType) params.set('eventType', next.eventType);
      else params.delete('eventType');
    }
    if (next.entityId !== undefined) {
      if (next.entityId) params.set('entityId', next.entityId);
      else params.delete('entityId');
    }
    if (next.limit !== undefined) {
      if (next.limit === 50) params.delete('limit');
      else params.set('limit', String(next.limit));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const events = useAsync(
    () => api.getEvents({
      eventType: eventType || undefined,
      entityId: entityId || undefined,
      limit,
    }),
    [eventType, entityId, limit]
  );

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Review the immutable event log of all operations"
        action={
          <ExportMenu
            onExportCSV={() => {
              if (!events.data) return;
              exportCSV('caelith-audit.csv',
                ['Event Type', 'Entity Type', 'Entity ID', 'Timestamp', 'Payload'],
                events.data.map(e => [
                  e.event_type, e.entity_type, e.entity_id,
                  e.timestamp, JSON.stringify(e.payload)
                ])
              );
            }}
          />
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Select
              label="Event Type"
              options={EVENT_TYPE_OPTIONS}
              value={eventType}
              onChange={(e) => {
                const value = e.target.value;
                setEventType(value);
                updateUrl({ eventType: value });
              }}
            />
          </div>
          <div className="w-64">
            <Input
              label="Entity ID"
              value={entityId}
              onChange={(e) => {
                const value = e.target.value;
                setEntityId(value);
                updateUrl({ entityId: value.trim() });
              }}
              placeholder="Filter by entity UUID..."
            />
          </div>
          <div className="w-24">
            <Input
              label="Limit"
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => {
                const value = parseLimit(e.target.value);
                setLimit(value);
                updateUrl({ limit: value });
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEventType('');
              setEntityId('');
              setLimit(50);
              updateUrl({ eventType: '', entityId: '', limit: 50 });
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      {/* Event List */}
      {events.loading ? (
        <SkeletonTable rows={8} />
      ) : events.error ? (
        <ErrorMessage message={events.error} onRetry={events.refetch} />
      ) : events.data && events.data.length > 0 ? (
        <Card padding={false}>
          <div className="divide-y divide-edge-subtle">
            {events.data.map((event) => (
              <div key={event.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={EVENT_BADGE_COLORS[event.event_type] ?? 'gray'}>
                      {event.event_type}
                    </Badge>
                    <span className="text-sm text-ink-secondary">{event.entity_type}</span>
                  </div>
                  <span className="text-xs text-ink-tertiary">{formatDateTime(event.timestamp)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-4">
                  <span className="font-mono text-xs text-ink-tertiary">{event.entity_id}</span>
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-accent-400 hover:text-accent-300">
                      View payload
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-edge bg-bg-tertiary p-3 font-mono text-xs text-ink-secondary">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState title="No events found" description="No events match the current filters." />
      )}
    </div>
  );
}
