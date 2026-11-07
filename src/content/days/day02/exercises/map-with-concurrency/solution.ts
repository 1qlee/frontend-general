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
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}`);
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0; // shared cursor: safe because JS is single-threaded and we read+increment synchronously
  let failed = false;

  // Each worker pulls the next unclaimed index until the list is exhausted.
  // `limit` workers => at most `limit` calls in flight, and a slot is refilled the moment it frees up.
  const worker = async (): Promise<void> => {
    while (nextIndex < items.length && !failed) {
      const index = nextIndex++;
      try {
        results[index] = await fn(items[index], index);
      } catch (error) {
        failed = true; // stop the other workers from starting new items
        throw error;
      }
    }
  };

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
