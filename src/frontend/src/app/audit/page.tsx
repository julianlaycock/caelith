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
];

const EVENT_BADGE_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  'asset.created': 'blue',
  'investor.created': 'blue',
  'investor.updated': 'yellow',
  'holding.allocated': 'green',
  'holding.updated': 'yellow',
  'rules.created': 'blue',
  'rules.updated': 'yellow',
  'transfer.executed': 'green',
  'transfer.rejected': 'red',
};

export default function AuditPage() {
  const [eventType, setEventType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [limit, setLimit] = useState(50);

  const events = useAsync(
    () =>
      api.getEvents({
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
            variant="secondary"
            size="sm"
            onClick={() => {
              setEventType('');
              setEntityId('');
              setLimit(50);
            }}
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
        <div className="space-y-2">
          {events.data.map((event) => (
            <Card key={event.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={EVENT_BADGE_COLORS[event.event_type] ?? 'gray'}
                  >
                    {event.event_type}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {event.entity_type}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDateTime(event.timestamp)}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-400">
                  Entity: {event.entity_id}
                </p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-800">
                    View payload
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </details>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No events found"
          description="No events match the current filters."
        />
      )}
    </div>
  );
}