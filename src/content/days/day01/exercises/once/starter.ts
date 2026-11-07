/**
 * Returns a function that invokes `fn` at most once.
 * Every call after the first returns the first call's result.
 * `this` and arguments must be forwarded to `fn`.
 */
export function once<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  throw new Error('Not implemented');
}
