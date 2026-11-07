/**
 * Map over `items` with an async `fn`, running at most `limit` calls at the same time.
 *
 * - Fulfils with the results in INPUT order.
 * - Never more than `limit` calls in flight; start the next item as soon as ANY slot frees up
 *   (a pool, not fixed batches).
 * - `fn` receives (item, index).
 * - If any call rejects, reject with that error and do not START any further items
 *   (calls already in flight are allowed to finish).
 * - `limit` must be a positive integer: otherwise reject with a RangeError.
 * - An empty array fulfils with [] without calling `fn`.
 */
export function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  throw new Error('Not implemented');
}
