import { useEffect, useRef } from 'react';

/**
 * Auto-dismiss a message after a timeout.
 * Returns the current message and a setter.
 * When the message changes to non-null, starts a timer to clear it.
 */
export function useAutoDismiss(
  value: string | null,
  setValue: (v: string | null) => void,
  ms = 4000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value) {
      timerRef.current = setTimeout(() => setValue(null), ms);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, setValue, ms]);
}
