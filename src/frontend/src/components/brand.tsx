'use client';

import React from 'react';
import { classNames } from '../lib/utils';

interface LogoProps {
  className?: string;
  title?: string;
}

/**
 * Caelith wordmark — Sora 800, tight tracking.
 * Pure text logo (Concept A). No icon mark.
 */
export function CaelithWordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={classNames('font-extrabold tracking-tight text-ink', className)}
      style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.04em' }}
    >
      Caelith
    </span>
  );
}

/** @deprecated — kept for backward compat, renders wordmark only */
export function NorthStarGridMark({ className, title = 'Caelith logo' }: LogoProps) {
  return (
    <span className={className} role="img" aria-label={title}>
      <CaelithWordmark className="text-lg" />
    </span>
  );
}

export function CaelithBrandLockup({
  className,
  markClassName: _markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={classNames('flex items-center', className)}>
      <CaelithWordmark className={classNames('text-[15px]', wordmarkClassName)} />
    </div>
  );
}
