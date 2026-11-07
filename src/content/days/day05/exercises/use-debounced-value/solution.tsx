import { useEffect, useState } from 'react';

/**
 * Returns `value`, but only after it has stopped changing for `delay` ms.
 * Every change restarts the timer; unmounting cancels the pending update.
 *
 * const debouncedQuery = useDebouncedValue(query, 300);
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    // Synchronise with an external system (a timer)…
    const id = setTimeout(() => setDebounced(value), delay);
    // …and stop synchronising before the next run (value/delay changed) or on unmount.
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
