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

interface Entry {
  hasData: boolean;
  data: unknown;
  updatedAt: number;
  invalidated: boolean;
  /** The current in-flight request, if any. Also used as a "latest request" token. */
  promise?: Promise<unknown>;
}

/** A tiny TanStack-Query-style cache. `defaults.staleTime` applies when a fetch passes none. */
export function createQueryCache(defaults: QueryOptions = {}): QueryCache {
  const entries = new Map<string, Entry>();

  function entryFor(key: string): Entry {
    let entry = entries.get(key);
    if (!entry) {
      entry = { hasData: false, data: undefined, updatedAt: 0, invalidated: false };
      entries.set(key, entry);
    }
    return entry;
  }

  return {
    fetch<T>(key: string, fetcher: () => Promise<T>, options: QueryOptions = {}): Promise<T> {
      const entry = entryFor(key);
      const staleTime = options.staleTime ?? defaults.staleTime ?? 0;

      // 1. Dedupe: everyone asking while a request is in flight shares it.
      if (entry.promise) return entry.promise as Promise<T>;

      // 2. Fresh hit. Same rule as TanStack Query: stale once age >= staleTime,
      //    so staleTime 0 means "always stale" and Infinity means "fresh until invalidated".
      const isFresh = entry.hasData && !entry.invalidated && Date.now() - entry.updatedAt < staleTime;
      if (isFresh) return Promise.resolve(entry.data as T);

      // 3. Fetch. `new Promise(resolve => resolve(fetcher()))` calls the fetcher synchronously
      //    but turns a synchronous throw into a rejection.
      const request: Promise<T> = new Promise<T>((resolve) => resolve(fetcher())).then(
        (data) => {
          // Only the LATEST request may write. If invalidate() ran (or a newer request
          // started) meanwhile, this result may be outdated: hand it to its own callers only.
          if (entry.promise === request) {
            entry.data = data;
            entry.hasData = true;
            entry.updatedAt = Date.now();
            entry.invalidated = false;
            entry.promise = undefined;
          }
          return data;
        },
        (error: unknown) => {
          // Errors are not cached, and the key must not stay "in flight" forever.
          if (entry.promise === request) entry.promise = undefined;
          throw error;
        },
      );
      entry.promise = request;
      return request;
    },

    getData<T>(key: string): T | undefined {
      return entries.get(key)?.data as T | undefined;
    },

    invalidate(key: string): void {
      const entry = entries.get(key);
      if (!entry) return;
      entry.invalidated = true;
      // Forget the in-flight request: the next fetch starts a new one, and the old one
      // fails the `entry.promise === request` check when it settles.
      entry.promise = undefined;
    },
  };
}
