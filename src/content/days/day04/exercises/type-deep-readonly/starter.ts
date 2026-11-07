/**
 * DeepReadonly<T> — make a value immutable all the way down.
 *
 *   type Config = { api: { baseUrl: string; retries: number }; features: string[] };
 *   type Frozen = DeepReadonly<Config>;
 *   // { readonly api: { readonly baseUrl: string; readonly retries: number };
 *   //   readonly features: readonly string[] }
 *
 * Rules:
 *  - every property of every nested object becomes `readonly`
 *  - arrays become readonly arrays (and tuples readonly tuples) of deep-readonly items
 *  - functions are returned unchanged (don't map over a function's keys!)
 *  - primitives are returned unchanged; unions are handled member by member
 *
 * Mutable<T> — the opposite, ONE level deep: remove `readonly` from T's own properties
 * (keep optional modifiers as they are).
 *
 * Don't use the built-in Readonly<T>.
 */
export type DeepReadonly<T> = any;

export type Mutable<T> = any;
