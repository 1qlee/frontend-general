export type Fetcher<T> = (query: string, signal: AbortSignal) => Promise<T[]>;

export interface AutocompleteState<T> {
  /** The raw query as typed (what the input shows). */
  query: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  results: T[];
  error: unknown;
}

export interface AutocompleteClient<T> {
  setQuery(query: string): void;
  getState(): AutocompleteState<T>;
  /** Called with the new state after every change. Returns an unsubscribe function. */
  subscribe(listener: (state: AutocompleteState<T>) => void): () => void;
  /** Cancel timers and in-flight requests; stop notifying listeners. */
  dispose(): void;
}

export interface AutocompleteOptions<T> {
  fetcher: Fetcher<T>;
  debounceMs?: number; // default 300
  cacheSize?: number; // default 50 (LRU)
}

/**
 * Framework-agnostic autocomplete data layer (the "model" behind a typeahead UI).
 *
 * setQuery(raw):
 *   - cache key = raw.trim().toLowerCase(); the fetcher receives raw.trim()
 *   - empty key  → status 'idle', results [], abort any in-flight request, no fetch
 *   - cache hit  → status 'success' with the cached results immediately (no timer, no fetch)
 *   - cache miss → status 'loading' immediately (KEEP the previous results so the UI doesn't flash),
 *                  then fetch after `debounceMs` of no further setQuery calls
 *   - starting a fetch aborts the previous in-flight request (via its AbortSignal)
 * Responses:
 *   - only a response for the CURRENT query may change state (latest wins)
 *   - successful responses are cached even if stale (the data is valid for its key)
 *   - aborted requests are ignored; failures are not cached → status 'error', results []
 * The cache is an LRU of `cacheSize` entries (a read counts as a use).
 */
export function createAutocompleteClient<T>(options: AutocompleteOptions<T>): AutocompleteClient<T> {
  throw new Error('Not implemented');
}
