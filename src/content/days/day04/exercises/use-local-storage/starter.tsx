import { type Dispatch, type SetStateAction } from 'react';

/**
 * useLocalStorage<T> — useState that survives a reload.
 *
 *   const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light', { validate: isTheme });
 *   setTheme('dark');
 *   setTheme((t) => (t === 'light' ? 'dark' : 'light'));
 *
 * Requirements (see the tests for the exact spec):
 *  - Return a readonly 2-tuple [value, setValue] typed like useState's.
 *  - On the FIRST render only: read `key` from storage and JSON.parse it. Use it if it parses and
 *    (when `validate` is given) passes the guard; otherwise fall back to initialValue.
 *    initialValue may be a lazy function — call it at most once, and not at all if storage had a value.
 *  - setValue accepts a value or an updater function, with the same semantics as useState
 *    (two functional updates in one event handler must both apply).
 *  - Persist every change as JSON.
 *  - Never crash because of storage: corrupted JSON, getItem/setItem throwing (SecurityError,
 *    QuotaExceededError) or storage being unavailable (`storage: null`) all degrade to in-memory state.
 *  - `options.storage` defaults to window.localStorage (tests inject a fake).
 */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface UseLocalStorageOptions<T> {
  storage?: StorageLike | null;
  validate?: (value: unknown) => value is T;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {},
): readonly [T, Dispatch<SetStateAction<T>>] {
  throw new Error('Not implemented');
}

// ---- Live preview (uses your hook) ----------------------------------------
export default function Demo() {
  const [count, setCount] = useLocalStorage('demo-count', 0, {
    validate: (v): v is number => typeof v === 'number',
  });
  return (
    <div>
      <p>Persisted count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
