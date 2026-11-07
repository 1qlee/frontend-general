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
  throw new Error('Not implemented');
}
