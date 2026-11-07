export interface CachedFetcherOptions {
  /** How long (ms) a value stays fresh after its fetch resolved. */
  ttl: number;
  /** Extra time (ms) after `ttl` during which the stale value is served while revalidating. Default 0. */
  staleWhileRevalidate?: number;
}

export interface CachedFetcher<T> {
  get(key: string): Promise<T>;
  /** Drop one key (or everything) so the next get() fetches again. */
  invalidate(key?: string): void;
}

/**
 * Wrap `fetcher` with an in-memory cache keyed by string.
 *
 * get(key):
 * - age < ttl                         → resolve with the cached value, no fetch
 * - ttl ≤ age < ttl + staleWhileRevalidate → resolve with the STALE value immediately and
 *                                        start ONE background revalidation for that key
 * - no entry / older than that        → fetch and resolve with the new value
 * - concurrent get()s for a key share a single in-flight request (dedupe)
 * - errors are never cached: waiting callers get the rejection, the next get() retries,
 *   and a failed background revalidation evicts the stale entry
 *   (without causing an unhandled promise rejection)
 *
 * Use Date.now() for timestamps (tests use fake timers).
 */
export function createCachedFetcher<T>(
  fetcher: (key: string) => Promise<T>,
  options: CachedFetcherOptions,
): CachedFetcher<T> {
  throw new Error('Not implemented');
}
