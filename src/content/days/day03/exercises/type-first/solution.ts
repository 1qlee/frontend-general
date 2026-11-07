/**
 * First<T>: the type of the first element of a tuple, or `never` for an empty tuple.
 *
 * - The constraint `readonly unknown[]` accepts both mutable and readonly arrays/tuples
 *   (a mutable array is assignable to a readonly one, not vice versa) and rejects
 *   non-arrays.
 * - `T extends readonly []` asks "is T an empty tuple?". It must say `readonly []`,
 *   otherwise `readonly []` (from `[] as const`) would not match `[]`.
 *
 * An equally good answer uses `infer` (Day 4):
 *   T extends readonly [infer Head, ...unknown[]] ? Head : never
 */
export type First<T extends readonly unknown[]> = T extends readonly [] ? never : T[0];
