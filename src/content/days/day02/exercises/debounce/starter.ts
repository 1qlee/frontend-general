export interface DebounceOptions {
  /** Invoke on the LEADING edge of a burst (the first call). Default: false. */
  leading?: boolean;
  /** Invoke on the TRAILING edge of a burst (after `wait` ms without calls). Default: true. */
  trailing?: boolean;
}

export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  /** Drop any pending trailing invocation. The next call starts a new burst. */
  cancel(): void;
  /** If a trailing invocation is pending, run it now. The next call starts a new burst. */
  flush(): void;
}

/**
 * Returns a debounced version of `fn`: bursts of calls collapse into one invocation.
 *
 * - A "burst" lasts until `wait` ms pass without a call (every call restarts the clock).
 * - trailing (default): invoke once at the end of the burst with the LATEST arguments and `this`.
 * - leading: invoke immediately on the first call of a burst. With both edges enabled, the trailing
 *   invocation only happens if there were additional calls during the burst.
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
  options: DebounceOptions = {},
): Debounced<A> {
  throw new Error('Not implemented');
}
