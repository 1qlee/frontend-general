/** A discriminated union: `data` only exists when status is 'success', `error` only on 'error'. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

/** Injected data source. Should respect `signal`, but the hook must not rely on it. */
export type Fetcher<T> = (key: string, signal: AbortSignal) => Promise<T>;

/**
 * Loads data for `key` (null = don't load).
 *
 * - idle when key is null; loading → success | error otherwise
 * - a new key aborts the previous request; stale responses (and stale errors) are ignored
 * - unmount aborts the in-flight request
 * - re-runs only when `key` changes, even if `fetcher` is an inline function (new identity every render)
 */
export function useAsync<T>(key: string | null, fetcher: Fetcher<T>): AsyncState<T> {
  void key;
  void fetcher;
  throw new Error('Not implemented');
}
