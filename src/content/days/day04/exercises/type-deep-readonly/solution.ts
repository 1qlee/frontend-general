/**
 * DeepReadonly<T> — make a value immutable all the way down.
 *
 * 1. Functions first: they are objects too, and mapping over them would erase the call signature.
 * 2. Any other object (including arrays and tuples): a homomorphic mapped type. Because `T` is a
 *    type parameter, `{ readonly [K in keyof T]: … }` preserves array/tuple-ness and turns
 *    `X[]` into `readonly X[]` automatically.
 * 3. Everything else (primitives) passes through. `T` is a naked type parameter, so the whole
 *    conditional distributes over unions.
 */
export type DeepReadonly<T> = T extends (...args: any[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Remove `readonly` from T's own properties (the `-readonly` modifier). Optional `?` is preserved. */
export type Mutable<T> = { -readonly [K in keyof T]: T[K] };
