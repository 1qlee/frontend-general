export interface Throttled<A extends unknown[]> {
  (...args: A): void;
  /** Drop any pending trailing invocation and reset, so the next call invokes immediately. */
  cancel(): void;
}

/**
 * Returns a throttled version of `fn` that invokes it AT MOST once per `wait` ms,
 * on both edges (like lodash's default):
 *
 * - leading: a call when no window is open invokes `fn` immediately and opens a `wait` ms window.
 * - trailing: calls during the window are not invoked right away; when the window ends, `fn` is
 *   invoked once with the LATEST arguments and `this` — and that invocation opens a new window.
 * - If nothing was called during the window, it simply closes.
 */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, wait: number): Throttled<A> {
  throw new Error('Not implemented');
}
