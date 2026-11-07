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
  const { leading = false, trailing = true } = options;
  let timer: ReturnType<typeof setTimeout> | undefined; // defined <=> a burst is in progress
  let pendingArgs: A | undefined; // defined <=> a trailing call is owed
  let pendingThis: unknown;

  const invokePending = () => {
    const args = pendingArgs as A;
    const context = pendingThis;
    // Clear state BEFORE calling fn so a re-entrant call starts cleanly.
    pendingArgs = undefined;
    pendingThis = undefined;
    fn.apply(context, args);
  };

  const endBurst = () => {
    timer = undefined;
    if (trailing && pendingArgs) invokePending();
    pendingArgs = undefined;
    pendingThis = undefined;
  };

  const debounced = function (this: unknown, ...args: A): void {
    const isFirstCallOfBurst = timer === undefined;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(endBurst, wait); // every call restarts the quiet-period clock

    if (isFirstCallOfBurst && leading) {
      fn.apply(this, args); // leading edge: nothing is owed for this call
    } else {
      pendingArgs = args; // remember only the latest call
      pendingThis = this;
    }
  } as Debounced<A>;

  debounced.cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pendingArgs = undefined;
    pendingThis = undefined;
  };

  debounced.flush = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    endBurst();
  };

  return debounced;
}
