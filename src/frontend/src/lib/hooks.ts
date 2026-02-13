'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAsync<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const inFlightRef = useRef<string | null>(null);

  const refetch = useCallback(() => {
    setTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    const key = JSON.stringify([trigger, ...deps]);
    if (inFlightRef.current === key) return;
    inFlightRef.current = key;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err?.message || err?.error || 'An unexpected error occurred';
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, ...deps]);

  return { data, loading, error, refetch };
}
