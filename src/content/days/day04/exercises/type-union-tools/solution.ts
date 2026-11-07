/** Indexing an array/tuple type with `number` gives the union of its element types. */
export type TupleToUnion<T extends readonly unknown[]> = T[number];

/** Iterate over the keys of both; prefer B's property type when B has the key. */
export type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
};

/**
 * 1. `U extends unknown ? (arg: U) => void : never` distributes: (arg: A) => void | (arg: B) => void
 * 2. Inferring a single type from a parameter (a contravariant position) across a union of
 *    functions makes TypeScript pick the type that works for ALL of them — the intersection.
 */
export type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never;
