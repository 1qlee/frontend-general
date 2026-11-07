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
  const cache = new Map<unknown, R>();
  const memoized = function (this: unknown, ...args: A): R {
    const key = resolver ? resolver.apply(this, args) : args[0];
    // Use has() rather than a truthiness check so cached `undefined`/0/'' results still hit.
    if (cache.has(key)) return cache.get(key) as R;
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  } as Memoized<A, R>;
  memoized.cache = cache;
  return memoized;
}
