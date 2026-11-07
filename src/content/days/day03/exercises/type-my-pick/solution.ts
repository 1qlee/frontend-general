/**
 * Implement the built-in `Pick<T, K>` yourself (don't use `Pick`).
 *
 * `K extends keyof T` restricts K to real keys of T. The mapped type iterates over
 * K and looks each property's type up with an indexed access `T[P]`. Because K is
 * constrained to `keyof T`, TypeScript treats the mapped type as homomorphic and
 * copies the `?` and `readonly` modifiers from T.
 */
export type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};
