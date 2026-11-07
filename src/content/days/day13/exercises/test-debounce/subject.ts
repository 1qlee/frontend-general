export interface Debounced<This, Args extends unknown[]> {
  (this: This, ...args: Args): void;
  /** Drops the pending call, if there is one. */
  cancel(): void;
}

/**
 * Trailing-edge debounce.
 *
 * - `fn` runs once, `wait` ms after the LAST call in a burst.
 * - Every call restarts the timer.
 * - `fn` receives the arguments and `this` of that last call.
 * - `cancel()` drops a pending call; the debounced function keeps working afterwards.
 */
export function debounce<This, Args extends unknown[]>(
  fn: (this: This, ...args: Args) => void,
  wait: number,
): Debounced<This, Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function debounced(this: This, ...args: Args): void {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, wait);
  }

  debounced.cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
