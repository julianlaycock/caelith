import { useState, useCallback } from 'react';
import type { ApiError } from './types';

export function useFormAction() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (
    action: () => Promise<unknown>,
    fallbackMessage = 'An error occurred',
  ): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      await action();
      return true;
    } catch (err) {
      setError((err as ApiError)?.message || fallbackMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { error, loading, execute, setError };
}
