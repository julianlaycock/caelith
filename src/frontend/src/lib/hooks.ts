'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setData: (data: T) => void;
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
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(() => {
    inFlightRef.current = null; // allow re-fetch
    setTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    // Wait for auth token to be restored from localStorage before fetching
    // The AuthProvider sets the token in its own useEffect, which may run
    // after child useEffects. Poll briefly for the token to appear.
    const token = api.getToken();
    if (!token) {
      // Token not yet set — retry in 100ms (AuthProvider will set it shortly)
      retryRef.current = setTimeout(() => {
        inFlightRef.current = null;
        setTrigger((t) => t + 1);
      }, 150);
      return () => {
        if (retryRef.current) clearTimeout(retryRef.current);
      };
    }

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
      // Allow re-fetch on next effect run (React Strict Mode double-fires effects)
      inFlightRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, ...deps]);

  return { data, loading, error, refetch, setData };
}
