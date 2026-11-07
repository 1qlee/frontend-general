import { useEffect, useState } from 'react';

/**
 * Returns `value`, but only after it has stopped changing for `delay` ms.
 * Every change restarts the timer; unmounting cancels the pending update.
 *
 * const debouncedQuery = useDebouncedValue(query, 300);
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  // TODO: you need one piece of state (useState) and one effect (useEffect) with a cleanup.
  throw new Error('Not implemented');
}
