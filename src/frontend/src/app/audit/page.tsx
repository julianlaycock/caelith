'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import {
  PageHeader,
  Card,
  Select,
  Input,
  Button,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  Badge,
} from '../../components/ui';
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
  'transfer.rejected': 'red',
  'composite_rule.created': 'yellow',
  'composite_rule.updated': 'yellow',
  'composite_rule.deleted': 'red',
};

export default function AuditPage() {
  const [eventType, setEventType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [limit, setLimit] = useState(50);

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
        title="Audit Trail"
        description="Immutable event log of all operations"
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Select
              label="Event Type"
              options={EVENT_TYPE_OPTIONS}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>
          <div className="w-64">
            <Input
              label="Entity ID"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
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
              onChange={(e) => setLimit(Number(e.target.value) || 50)}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEventType(''); setEntityId(''); setLimit(50); }}
          >
            Reset
          </Button>
        </div>
      </Card>

      {/* Event List */}
      {events.loading ? (
        <LoadingSpinner />
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