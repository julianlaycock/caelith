'use client';

import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface SortState<T> {
  key: keyof T | null;
  direction: SortDirection;
}

export function useSort<T>(data: T[] | undefined) {
  const [sort, setSort] = useState<SortState<T>>({ key: null, direction: null });

  const toggle = (key: keyof T) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const sorted = useMemo(() => {
    if (!data || !sort.key || !sort.direction) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key!];
      const bVal = b[sort.key!];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(String(bVal))
        : Number(aVal) - Number(bVal);
      return sort.direction === 'desc' ? -cmp : cmp;
    });
  }, [data, sort.key, sort.direction]);

  return { sorted, sort, toggle };
}
