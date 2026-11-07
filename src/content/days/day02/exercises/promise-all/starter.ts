/**
 * Re-implement Promise.all WITHOUT using Promise.all / allSettled / any / race.
 *
 * - Fulfils with an array of results in INPUT order (not settle order).
 * - Rejects as soon as any input rejects, with that reason (fail fast).
 * - Non-promise values and thenables are allowed: treat them like Promise.resolve(value).
 * - An empty array fulfils with [].
 *
 * The signature mirrors lib.es2015.promise.d.ts, so tuples keep their element types:
 *   const [n, s] = await promiseAll([Promise.resolve(1), 'two']); // n: number, s: string
 */
export function promiseAll<T extends readonly unknown[] | []>(
  values: T,
): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
  throw new Error('Not implemented');
}
