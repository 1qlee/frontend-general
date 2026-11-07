import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/** The slice of the Web Storage API the hook needs — easy to fake in tests. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface UseLocalStorageOptions<T> {
  /** Defaults to window.localStorage. Pass null to opt out of persistence (behaves like useState). */
  storage?: StorageLike | null;
  /** Runtime guard for what comes out of storage: it is `unknown` until proven otherwise. */
  validate?: (value: unknown) => value is T;
}

function getDefaultStorage(): StorageLike | null {
  try {
    // Even *reading* window.localStorage can throw (SecurityError) in sandboxed iframes
    // or when the user has blocked site data.
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

type ReadResult<T> = { found: true; value: T } | { found: false };

function readStored<T>(storage: StorageLike | null, key: string, validate?: (value: unknown) => value is T): ReadResult<T> {
  if (!storage) return { found: false };
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { found: false };
    const parsed: unknown = JSON.parse(raw); // may throw on corrupted data
    if (validate && !validate(parsed)) return { found: false };
    // Without a validator we have to trust the stored shape — that's the one deliberate cast.
    return { found: true, value: parsed as T };
  } catch {
    return { found: false };
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {},
): readonly [T, Dispatch<SetStateAction<T>>] {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;

  // Lazy initializer: storage is read (and initialValue() computed) on the first render only.
  const [value, setValue] = useState<T>(() => {
    const stored = readStored(storage, key, options.validate);
    if (stored.found) return stored.value;
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  // Persist after commit. React's own setter gives us functional updates and batching for free.
  useEffect(() => {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      // QuotaExceededError / private mode: keep working with the in-memory value.
    }
  }, [storage, key, value]);

  // `as const` keeps the tuple type: without it TS would infer (T | Dispatch<…>)[].
  return [value, setValue] as const;
}

// ---- Live preview ---------------------------------------------------------
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
