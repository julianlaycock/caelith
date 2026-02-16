'use client';

import React from 'react';
import { classNames } from '../lib/utils';

interface LogoProps {
  className?: string;
  title?: string;
}

export function NorthStarGridMark({ className, title = 'Caelith logo' }: LogoProps) {
  return (
    <svg viewBox="0 0 120 120" className={classNames('text-ink', className)} fill="none" aria-label={title} role="img">
      <rect x="16" y="16" width="88" height="88" rx="24" fill="#DDE2E5" stroke="#3F3933" strokeWidth="6" />
      <path d="M30 40H90M30 60H90M30 80H90M40 30V90M60 30V90M80 30V90" stroke="#BDB0A4" strokeWidth="3" />
      <path d="M60 30L65 55L90 60L65 65L60 90L55 65L30 60L55 55L60 30Z" fill="#D8BA8E" stroke="#3F3933" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="60" cy="60" r="4" fill="#3F3933" />
    </svg>
  );
}

export function CaelithWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={classNames('text-[13px] font-bold uppercase tracking-[0.12em] text-ink', className)}>
      Caelith
    </span>
  );
}

export function CaelithBrandLockup({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={classNames('flex items-center gap-2.5', className)}>
      <NorthStarGridMark className={classNames('h-6 w-6 flex-shrink-0', markClassName)} />
      <CaelithWordmark className={wordmarkClassName} />
    </div>
  );
}
