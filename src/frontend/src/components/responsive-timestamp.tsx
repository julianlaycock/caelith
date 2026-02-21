'use client';

import React from 'react';
import { formatDateTime } from '../lib/utils';

/**
 * Shows full timestamp on desktop, compact on mobile via CSS.
 */
export function ResponsiveTimestamp({ value }: { value: string }) {
  const full = formatDateTime(value);
  const d = new Date(value);
  const compact = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  return (
    <>
      <span className="timestamp-verbose">{full}</span>
      <span className="timestamp-compact">{compact}</span>
    </>
  );
}
