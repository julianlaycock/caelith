'use client';

import React from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Card, LoadingSpinner, ErrorMessage } from '../components/ui';
import { formatNumber, formatDateTime } from '../lib/utils';

export default function DashboardPage() {
  const assets = useAsync(() => api.getAssets());
  const investors = useAsync(() => api.getInvestors());
  const events = useAsync(() => api.getEvents({ limit: 10 }));

  if (assets.loading || investors.loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-gray-500">Total Assets</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {assets.data?.length ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Total Investors</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {investors.data?.length ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Total Units</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {formatNumber(
              assets.data?.reduce((sum, a) => sum + a.total_units, 0) ?? 0
            )}
          </p>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Activity
        </h2>
        {events.loading ? (
          <LoadingSpinner />
        ) : events.error ? (
          <ErrorMessage message={events.error} onRetry={events.refetch} />
        ) : events.data && events.data.length > 0 ? (
          <div className="space-y-3">
            {events.data.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {event.event_type.replace('.', ' → ')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {event.entity_type} · {event.entity_id.slice(0, 8)}…
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDateTime(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No activity yet. Create an asset to get started.
          </p>
        )}
      </Card>
    </div>
  );
}