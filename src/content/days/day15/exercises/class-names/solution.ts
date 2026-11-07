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
  const classes: string[] = [];

  const visit = (value: ClassValue): void => {
    if (!value || value === true) return; // skips every falsy value, and `true`
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
      classes.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(visit); // recursion handles any nesting depth
    } else {
      for (const key of Object.keys(value)) {
        // Object.keys = own enumerable keys only (a bare for...in would include inherited ones)
        if (value[key]) classes.push(key);
      }
    }
  };

  args.forEach(visit);
  // Collect into one array and join once: nested empty arrays/objects never produce double spaces.
  return classes.join(' ');
}
