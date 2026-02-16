'use client';

import Link from 'next/link';
import React from 'react';
import { classNames } from '../lib/utils';

export function BackLink({
  href,
  label,
  className,
  onClick,
}: {
  href?: string;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      {label}
    </>
  );

  const baseClass = classNames(
    'inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 transition-colors hover:text-accent-700',
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {content}
    </button>
  );
}
