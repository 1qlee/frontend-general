/**
 * TupleToObject<T>: turn a tuple of keys into an object type whose keys and values
 * are the tuple's elements.
 *
 * - `readonly PropertyKey[]` accepts `as const` tuples (which are readonly) and
 *   rejects elements that can't be keys. PropertyKey = string | number | symbol.
 * - `T[number]` is the union of all element types ("index the tuple with any number").
 * - The mapped type turns each member K of that union into a property `K: K`.
 */
export type TupleToObject<T extends readonly PropertyKey[]> = {
  [K in T[number]]: K;
};
