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

/** Minimal LRU on top of Map's insertion order: re-insert on read, evict the first key when full. */
class LruCache<V> {
  private readonly map = new Map<string, V>();
  constructor(private readonly capacity: number) {}

  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as string;
      this.map.delete(oldest);
    }
  }
}

const toKey = (query: string) => query.trim().toLowerCase();

export function createAutocompleteClient<T>({
  fetcher,
  debounceMs = 300,
  cacheSize = 50,
}: AutocompleteOptions<T>): AutocompleteClient<T> {
  const cache = new LruCache<T[]>(Math.max(1, cacheSize));
  const listeners = new Set<(state: AutocompleteState<T>) => void>();
  let state: AutocompleteState<T> = { query: '', status: 'idle', results: [], error: null };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: AbortController | undefined;
  let disposed = false;

  const setState = (next: AutocompleteState<T>) => {
    state = next;
    listeners.forEach((listener) => listener(state));
  };

  const cancelTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const abortInFlight = () => {
    inFlight?.abort();
    inFlight = undefined;
  };

  const isCurrent = (key: string) => !disposed && toKey(state.query) === key;

  const startFetch = (query: string, key: string) => {
    abortInFlight();
    const controller = new AbortController();
    inFlight = controller;
    fetcher(query, controller.signal).then(
      (results) => {
        if (controller.signal.aborted) return;
        if (inFlight === controller) inFlight = undefined;
        cache.set(key, results); // valid data for its key, even if the user has typed on
        if (isCurrent(key)) setState({ ...state, status: 'success', results, error: null });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (inFlight === controller) inFlight = undefined;
        if (isCurrent(key)) setState({ ...state, status: 'error', results: [], error });
      },
    );
  };

  return {
    setQuery(query) {
      if (disposed) return;
      cancelTimer();
      const key = toKey(query);

      if (key === '') {
        abortInFlight();
        setState({ query, status: 'idle', results: [], error: null });
        return;
      }

      const cached = cache.get(key);
      if (cached) {
        setState({ query, status: 'success', results: cached, error: null });
        return;
      }

      setState({ query, status: 'loading', results: state.results, error: null });
      timer = setTimeout(() => {
        timer = undefined;
        startFetch(query.trim(), key);
      }, debounceMs);
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      cancelTimer();
      abortInFlight();
      listeners.clear();
    },
  };
}
