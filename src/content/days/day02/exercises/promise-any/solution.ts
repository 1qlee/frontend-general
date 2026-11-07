/**
 * Re-implement Promise.any WITHOUT using Promise.any / all / allSettled / race.
 *
 * - Fulfils with the value of the FIRST input to fulfil (rejections are ignored while
 *   another input could still fulfil).
 * - If every input rejects, rejects with an AggregateError whose `errors` array holds the
 *   rejection reasons in INPUT order.
 * - Plain values count as already-fulfilled inputs.
 * - An empty array rejects with an AggregateError (there is nothing that could fulfil).
 */
export function promiseAny<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>> {
  return new Promise<Awaited<T[number]>>((resolve, reject) => {
    const errors: unknown[] = new Array(values.length);
    let remaining = values.length;

    if (remaining === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }

    values.forEach((value: unknown, index: number) => {
      Promise.resolve(value as T[number]).then(
        resolve, // first fulfilment wins; later calls are no-ops
        (reason: unknown) => {
          errors[index] = reason; // by index => input order, like Promise.all's results
          remaining -= 1;
          if (remaining === 0) reject(new AggregateError(errors, 'All promises were rejected'));
        },
      );
    });
  });
}
