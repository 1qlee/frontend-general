/**
 * Memoize a function.
 *
 * - By default the cache key is the FIRST argument (like lodash.memoize).
 * - An optional `resolver` computes the key from all arguments.
 * - The returned function exposes its cache as `.cache` (a Map) so callers can clear it.
 * - `this` must be forwarded.
 */
export type Memoized<A extends unknown[], R> = ((...args: A) => R) & { cache: Map<unknown, R> };

export function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  resolver?: (...args: A) => unknown,
): Memoized<A, R> {
  throw new Error('Not implemented');
}
