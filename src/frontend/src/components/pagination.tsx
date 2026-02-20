'use client';

import React from 'react';
import { classNames } from '../lib/utils';

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ total, page, perPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  // Generate visible page numbers (show max 5 around current)
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const btnBase = 'inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors h-8 min-w-[32px] px-2';

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <span className="text-xs text-ink-tertiary">
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={classNames(btnBase, 'text-ink-secondary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed')}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="px-1 text-ink-muted text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={classNames(
                btnBase,
                p === page
                  ? 'bg-[rgba(197,224,238,0.15)] text-ink border border-[rgba(197,224,238,0.2)]'
                  : 'text-ink-secondary hover:bg-bg-tertiary'
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={classNames(btnBase, 'text-ink-secondary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed')}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Hook for paginating an array client-side */
export function usePagination<T>(items: T[], perPage = 20) {
  const [page, setPage] = React.useState(1);
  const total = items.length;
  const totalPages = Math.ceil(total / perPage);
  const safeP = Math.max(1, Math.min(page, totalPages || 1));
  const paginated = items.slice((safeP - 1) * perPage, safeP * perPage);

  // Reset to page 1 when items change significantly
  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [totalPages, page]);

  return { page: safeP, setPage, paginated, total, perPage };
}
