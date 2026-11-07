type Whitespace = ' ' | '\n' | '\t';

/** Peel one whitespace character off the front, then recurse until the pattern stops matching. */
export type TrimLeft<S extends string> = S extends `${Whitespace}${infer Rest}` ? TrimLeft<Rest> : S;

type TrimRight<S extends string> = S extends `${infer Rest}${Whitespace}` ? TrimRight<Rest> : S;

export type Trim<S extends string> = TrimLeft<TrimRight<S>>;

/**
 * `${infer Head}_${infer Tail}` matches at the FIRST underscore (Head is inferred as short as possible).
 * Capitalize the tail and recurse to handle the remaining underscores.
 */
export type CamelCase<S extends string> = S extends `${infer Head}_${infer Tail}` ? `${Head}${CamelCase<Capitalize<Tail>>}` : S;

/** Key remapping with `as`: non-string keys (symbols, numbers) are kept as they are. */
export type CamelCaseKeys<T> = { [K in keyof T as K extends string ? CamelCase<K> : K]: T[K] };
