export interface QueryOptions {
  /** How long (ms) data counts as fresh after it was fetched. Default 0: always stale. */
  staleTime?: number;
}

export interface QueryCache {
  /**
   * Resolve the data for `key`:
   * - a request for `key` is already in flight → return THAT promise (dedupe);
   * - cached data is fresh (younger than staleTime, not invalidated) → resolve it without fetching;
   * - otherwise → call `fetcher` and cache the result on success. Errors are not cached.
   */
  fetch<T>(key: string, fetcher: () => Promise<T>, options?: QueryOptions): Promise<T>;
  /** Last successfully fetched data for `key` (fresh or stale), or undefined. */
  getData<T>(key: string): T | undefined;
  /**
   * Mark `key` stale so the next fetch refetches. Keeps the old data readable via getData
   * (stale-while-revalidate). A request already in flight is NOT reused by later fetches,
   * and its result must not overwrite data from a newer request.
   */
  invalidate(key: string): void;
}

/** A tiny TanStack-Query-style cache. `defaults.staleTime` applies when a fetch passes none. */
export function createQueryCache(defaults: QueryOptions = {}): QueryCache {
  throw new Error('Not implemented');
}
