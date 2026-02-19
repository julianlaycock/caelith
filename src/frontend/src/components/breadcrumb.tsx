'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const labelMap: Record<string, string> = {
  dashboard: 'Übersicht',
  funds: 'Fonds',
  investors: 'Investoren',
  transfers: 'Transfers',
  rules: 'Regelwerk',
  decisions: 'Entscheidungen',
  audit: 'Audit',
  onboarding: 'Onboarding',
  holdings: 'Bestände',
  assets: 'Vermögenswerte',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="mb-3 md:mb-4 flex items-center gap-1.5 text-xs overflow-x-auto" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        const label = labelMap[seg] || decodeURIComponent(seg);

        return (
          <React.Fragment key={href}>
            {i > 0 && <span className="text-ink-muted">/</span>}
            {isLast ? (
              <span className="font-medium text-ink">{label}</span>
            ) : (
              <Link href={href} className="text-ink-tertiary hover:text-ink-secondary transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
