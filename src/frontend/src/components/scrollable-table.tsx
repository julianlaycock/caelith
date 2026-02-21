'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { classNames } from '../lib/utils';

/**
 * Wrapper that adds horizontal scroll with a gradient fade indicator.
 */
export function ScrollableTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflows = el.scrollWidth > el.clientWidth + 1;
    setHasOverflow(overflows);
    if (overflows) {
      setScrolledEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    }
  }, []);

  useEffect(() => {
    check();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [check]);

  return (
    <div
      ref={ref}
      className={classNames(
        'table-scroll-wrapper',
        hasOverflow && 'has-overflow',
        scrolledEnd && 'scrolled-end',
        className,
      )}
    >
      {children}
    </div>
  );
}
