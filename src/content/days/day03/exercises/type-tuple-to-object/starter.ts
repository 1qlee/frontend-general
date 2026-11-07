/**
 * TupleToObject<T>: turn a tuple of keys into an object type whose keys and values
 * are the tuple's elements.
 *
 *   const tuple = ['tesla', 'model 3'] as const;
 *   type Cars = TupleToObject<typeof tuple>;
 *   // { tesla: 'tesla'; 'model 3': 'model 3' }
 *
 * Requirements:
 *  - Works with readonly tuples produced by `as const`.
 *  - Elements may be strings, numbers or unique symbols (anything usable as an object key).
 *  - Elements that cannot be object keys (arrays, objects) must be a compile error.
 *
 * Tools: a constraint on T, the indexed access `T[number]`, and a mapped type.
 */
export type TupleToObject<T> = any;
