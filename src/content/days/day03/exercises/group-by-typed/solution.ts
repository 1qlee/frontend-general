/**
 * Group items by the key `keyFn` returns — the behaviour of ES2024 `Object.groupBy`.
 *
 * Why `Partial<Record<K, T[]>>`? If K is a union of literals ('core' | 'infra'),
 * nothing guarantees every member was produced — an empty input yields `{}`.
 * `Record<K, T[]>` would claim `result.core` is always an array; Partial makes the
 * caller handle `undefined`. (TypeScript's own lib typing of Object.groupBy does the same.)
 */
export function groupBy<T, K extends PropertyKey>(
  items: Iterable<T>,
  keyFn: (item: T, index: number) => K,
): Partial<Record<K, T[]>> {
  // A null-prototype object has no inherited 'constructor'/'toString' to collide with,
  // and '__proto__' is an ordinary key on it (on a plain object, assigning it would
  // replace the prototype instead of creating a property).
  const groups = Object.create(null) as Partial<Record<K, T[]>>;
  let index = 0;
  for (const item of items) {
    const key = keyFn(item, index++);
    const group = groups[key];
    if (group) {
      group.push(item);
    } else {
      groups[key] = [item];
    }
  }
  return groups;
}
