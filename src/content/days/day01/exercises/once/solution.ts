/**
 * Returns a function that invokes `fn` at most once.
 * Every call after the first returns the first call's result.
 * `this` and arguments must be forwarded to `fn`.
 */
export function once<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let called = false;
  let result: R;
  return function (this: unknown, ...args: A): R {
    if (!called) {
      called = true; // set before calling so re-entrant calls don't invoke fn twice
      result = fn.apply(this, args);
    }
    return result;
  };
}
