import { useCallback, useLayoutEffect, useRef, useState, type SetStateAction } from 'react';

export interface UseControllableStateOptions<T> {
  /** Controlled value. `undefined` means "uncontrolled" (note: `null` is a real, controlled value). */
  value?: T;
  /** Initial value for uncontrolled mode. Read on mount only. */
  defaultValue: T;
  /** Called with the next value in both modes — but only when it actually changes. */
  onChange?: (value: T) => void;
}

/**
 * One hook that lets a component support both APIs:
 *   controlled   → <Switch checked={on} onCheckedChange={setOn} />
 *   uncontrolled → <Switch defaultChecked />
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>): readonly [T, (next: SetStateAction<T>) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : internal;

  // "Latest ref": the setter below is created once, so it reads everything it needs from here.
  // Updated after every commit, so it never runs during render.
  const latest = useRef({ current, isControlled, onChange });
  useLayoutEffect(() => {
    latest.current = { current, isControlled, onChange };
  });

  const setValue = useCallback((next: SetStateAction<T>) => {
    const snapshot = latest.current;
    const resolved = typeof next === 'function' ? (next as (prev: T) => T)(snapshot.current) : next;
    if (Object.is(resolved, snapshot.current)) return;

    if (!snapshot.isControlled) {
      // Record it immediately so a second updater in the same event builds on this one.
      snapshot.current = resolved;
      setInternal(resolved);
    }
    // Controlled: only report. The parent decides whether `value` changes.
    snapshot.onChange?.(resolved);
  }, []);

  return [current, setValue] as const;
}
