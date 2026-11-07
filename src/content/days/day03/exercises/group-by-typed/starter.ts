/**
 * Group items by the key `keyFn` returns — the behaviour of ES2024 `Object.groupBy`
 * (implement it yourself; don't call Object.groupBy).
 *
 *   const people = [
 *     { name: 'Ada', team: 'core' },
 *     { name: 'Linus', team: 'infra' },
 *     { name: 'Grace', team: 'core' },
 *   ] as const;
 *   groupBy(people, (p) => p.team);
 *   // { core: [Ada, Grace], infra: [Linus] }   typed Partial<Record<'core' | 'infra', Person[]>>
 *
 * Requirements:
 *  - Accept any iterable (arrays, Sets, generators). Items keep their original order in each group.
 *  - `keyFn(item, index)` receives the item and its index; keys may be strings, numbers or symbols.
 *  - Only keys that were actually produced appear on the result.
 *  - Keys such as 'constructor', 'toString' or '__proto__' must work like any other key.
 *
 * Types: the return type is Partial<Record<K, T[]>> — think about why it is Partial.
 */
export function groupBy<T, K extends PropertyKey>(
  items: Iterable<T>,
  keyFn: (item: T, index: number) => K,
): Partial<Record<K, T[]>> {
  throw new Error('Not implemented');
}
