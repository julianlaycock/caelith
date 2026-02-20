'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../lib/i18n';

export function Breadcrumb() {
  const pathname = usePathname();
  const { t } = useI18n();

  const labelMap: Record<string, string> = {
    dashboard: t('breadcrumb.dashboard'),
    funds: t('breadcrumb.funds'),
    investors: t('breadcrumb.investors'),
    transfers: t('breadcrumb.transfers'),
    rules: t('breadcrumb.rules'),
    decisions: t('breadcrumb.decisions'),
    audit: t('breadcrumb.audit'),
    onboarding: t('breadcrumb.onboarding'),
    holdings: t('breadcrumb.holdings'),
    assets: t('breadcrumb.assets'),
    builder: t('breadcrumb.builder'),
  };
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const segments = pathname.split('/').filter(Boolean);

  // Hide auto-breadcrumb on detail pages (they render their own DetailBreadcrumb)
  if (segments.length <= 1 || segments.some(s => UUID_RE.test(s))) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs overflow-x-auto" aria-label="Breadcrumb">
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

/** Explicit breadcrumb for detail pages with custom labels */
interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function DetailBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs mb-3 animate-fade-in">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <svg className="h-3 w-3 text-ink-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          )}
          {item.href ? (
            <Link href={item.href} className="text-accent-400 hover:text-accent-300 transition-colors font-medium">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-secondary font-medium truncate max-w-[200px]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
