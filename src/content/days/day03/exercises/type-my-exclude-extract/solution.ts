/**
 * Implement the built-in `Exclude<T, U>` and `Extract<T, U>` (don't use them).
 *
 * `T extends U ? never : T` is a distributive conditional type: because T is a naked
 * type parameter, `MyExclude<'a' | 'b', 'a'>` is evaluated as
 * `('a' extends 'a' ? never : 'a') | ('b' extends 'a' ? never : 'b')` = `never | 'b` = `'b'`.
 * `never` disappears from unions, so returning it "removes" a member.
 */
export type MyExclude<T, U> = T extends U ? never : T;

export type MyExtract<T, U> = T extends U ? T : never;
