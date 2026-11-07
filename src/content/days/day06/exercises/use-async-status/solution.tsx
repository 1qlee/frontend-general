import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** A discriminated union: `data` only exists when status is 'success', `error` only on 'error'. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

/** Injected data source. Should respect `signal`, but the hook must not rely on it. */
export type Fetcher<T> = (key: string, signal: AbortSignal) => Promise<T>;

const IDLE = { status: 'idle' } as const;
const LOADING = { status: 'loading' } as const;

/**
 * Loads data for `key` (null = don't load). Re-runs only when `key` changes — the fetcher may be an
 * inline function with a new identity every render.
 */
export function useAsync<T>(key: string | null, fetcher: Fetcher<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>(key === null ? IDLE : LOADING);

  // Latest-ref: always call the newest fetcher without making it an effect dependency.
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (key === null) {
      setState(IDLE); // constant object → React bails out if we're already idle
      return;
    }
    const controller = new AbortController();
    setState(LOADING);

    fetcherRef.current(key, controller.signal).then(
      (data) => {
        // Aborted = the key changed or we unmounted: this response is stale, drop it.
        if (!controller.signal.aborted) setState({ status: 'success', data });
      },
      (reason: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', error: reason instanceof Error ? reason : new Error(String(reason)) });
      },
    );

    return () => controller.abort();
  }, [key]);

  return state;
}
