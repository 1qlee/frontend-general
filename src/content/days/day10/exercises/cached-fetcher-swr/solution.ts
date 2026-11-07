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

interface Entry<T> {
  value: T;
  fetchedAt: number;
}

export function createCachedFetcher<T>(
  fetcher: (key: string) => Promise<T>,
  options: CachedFetcherOptions,
): CachedFetcher<T> {
  const { ttl, staleWhileRevalidate = 0 } = options;
  const cache = new Map<string, Entry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  /** Start (or join) the single in-flight request for `key`. */
  function load(key: string): Promise<T> {
    const existing = inFlight.get(key);
    if (existing) return existing;

    // `new Promise(resolve => resolve(fetcher(key)))` turns a synchronous throw into a rejection.
    const request: Promise<T> = new Promise<T>((resolve) => resolve(fetcher(key))).then(
      (value) => {
        // Ignore the result if this request was invalidated while in flight.
        if (inFlight.get(key) === request) cache.set(key, { value, fetchedAt: Date.now() });
        return value;
      },
      (error: unknown) => {
        // Never cache failures — and drop any stale value so we don't serve it forever.
        if (inFlight.get(key) === request) cache.delete(key);
        throw error;
      },
    );
    inFlight.set(key, request);
    // Clean up whichever way it settles. The no-op catch keeps this derived promise
    // from becoming an unhandled rejection; callers handle `request` itself.
    request
      .finally(() => {
        if (inFlight.get(key) === request) inFlight.delete(key);
      })
      .catch(() => {});
    return request;
  }

  return {
    get(key) {
      const entry = cache.get(key);
      if (entry) {
        const age = Date.now() - entry.fetchedAt;
        if (age < ttl) return Promise.resolve(entry.value);
        if (age < ttl + staleWhileRevalidate) {
          // Serve stale now; revalidate in the background (deduped by load()).
          // Nobody awaits this promise, so swallow its rejection here — load() already evicted.
          load(key).catch(() => {});
          return Promise.resolve(entry.value);
        }
      }
      return load(key);
    },
    invalidate(key) {
      if (key === undefined) {
        cache.clear();
        inFlight.clear();
      } else {
        cache.delete(key);
        inFlight.delete(key);
      }
    },
  };
}
