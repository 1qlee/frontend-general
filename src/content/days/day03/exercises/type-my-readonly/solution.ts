/**
 * Implement the built-in `Readonly<T>` yourself (don't use `Readonly`).
 *
 * A homomorphic mapped type (`[K in keyof T]`) keeps T's optional modifiers and,
 * when T is an array or tuple type, produces an array/tuple type — so the
 * `readonly` modifier turns `string[]` into `readonly string[]`.
 */
export type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};
