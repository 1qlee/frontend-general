/**
 * First<T>: the type of the first element of a tuple, or `never` for an empty tuple.
 *
 *   First<['a', 'b', 'c']>        // 'a'
 *   First<[]>                     // never
 *   First<readonly [1, 2]>        // 1   (as const tuples are readonly — accept them too)
 *   First<'not an array'>         // ❌ compile error
 *
 * Careful: `T[0]` alone gives `undefined` for an empty tuple, and an element whose
 * type IS `undefined` must still come back as `undefined`.
 */
export type First<T> = any;
