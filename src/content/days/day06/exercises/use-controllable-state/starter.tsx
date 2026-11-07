import { type SetStateAction } from 'react';

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
 *
 * Returns `[currentValue, setValue]`. `setValue` accepts a value or an updater function
 * (like useState), and must keep the same identity across renders.
 */
export function useControllableState<T>(
  options: UseControllableStateOptions<T>,
): readonly [T, (next: SetStateAction<T>) => void] {
  void options;
  throw new Error('Not implemented');
}
