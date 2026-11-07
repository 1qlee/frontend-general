/** Anything you can pass to classNames(). */
export type ClassValue = string | number | bigint | boolean | null | undefined | ClassDictionary | ClassValue[];

/** `{ active: isActive, 'is-disabled': disabled }` — keys are included when their value is truthy. */
export interface ClassDictionary {
  [className: string]: unknown;
}

/**
 * Builds a space-separated className string, like the `classnames` / `clsx` packages.
 *
 * - strings and non-zero numbers are included as-is
 * - falsy values (false, null, undefined, 0, '', NaN) and `true` are skipped
 * - objects contribute each OWN key whose value is truthy
 * - arrays are flattened recursively (to any depth)
 * - the result has single spaces and no leading/trailing whitespace
 */
export function classNames(...args: ClassValue[]): string {
  throw new Error('Not implemented');
}
