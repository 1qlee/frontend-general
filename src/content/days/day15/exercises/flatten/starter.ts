/** A value, or an array nested to any depth. */
export type Nested<T> = T | readonly Nested<T>[];

/**
 * Flattens `arr` up to `depth` levels (default: completely), like `Array.prototype.flat`
 * — but WITHOUT using `flat` or `flatMap`.
 *
 * - depth 0 (or negative) returns a shallow copy
 * - never mutates the input; always returns a new array
 * - only real arrays are flattened (strings, Sets, array-likes stay as values)
 * - empty slots in sparse arrays are skipped, like `flat()` does
 */
export function flatten<T>(arr: readonly Nested<T>[]): T[];
export function flatten<T>(arr: readonly Nested<T>[], depth: number): Nested<T>[];
export function flatten<T>(arr: readonly Nested<T>[], depth = Infinity): Nested<T>[] {
  throw new Error('Not implemented');
}
