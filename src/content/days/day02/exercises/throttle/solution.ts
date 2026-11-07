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
  let timer: ReturnType<typeof setTimeout> | undefined; // defined <=> a window is open
  let pendingArgs: A | undefined;
  let pendingThis: unknown;

  const openWindow = () => {
    timer = setTimeout(() => {
      timer = undefined;
      if (pendingArgs) {
        const args = pendingArgs;
        const context = pendingThis;
        pendingArgs = undefined;
        pendingThis = undefined;
        openWindow(); // the trailing call counts as an invocation: keep calls >= wait apart
        fn.apply(context, args);
      }
    }, wait);
  };

  const throttled = function (this: unknown, ...args: A): void {
    if (timer === undefined) {
      openWindow(); // open the window first so a re-entrant call is throttled
      fn.apply(this, args);
    } else {
      pendingArgs = args;
      pendingThis = this;
    }
  } as Throttled<A>;

  throttled.cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pendingArgs = undefined;
    pendingThis = undefined;
  };

  return throttled;
}
