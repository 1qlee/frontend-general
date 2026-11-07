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
  type Result = { -readonly [K in keyof T]: Awaited<T[K]> };

  return new Promise<Result>((resolve, reject) => {
    const results: unknown[] = new Array(values.length);
    // Count completions explicitly. `results.length` is useless here: assigning
    // results[2] first makes the length 3 while slots 0 and 1 are still empty.
    let remaining = values.length;

    if (remaining === 0) {
      resolve(results as Result);
      return;
    }

    values.forEach((value: unknown, index: number) => {
      // Promise.resolve normalises plain values and adopts thenables.
      Promise.resolve(value).then(
        (result) => {
          results[index] = result; // write by index => input order is preserved
          remaining -= 1;
          if (remaining === 0) resolve(results as Result);
        },
        reject, // first rejection wins; later resolve/reject calls are ignored by the promise
      );
    });
  });
}
