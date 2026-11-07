/**
 * Implement the built-in `Exclude<T, U>` and `Extract<T, U>` (don't use them).
 *
 *   MyExclude<'a' | 'b' | 'c', 'a'>            // 'b' | 'c'   — drop members assignable to U
 *   MyExtract<'a' | 'b' | 'c', 'a' | 'z'>      // 'a'         — keep members assignable to U
 *
 *   type Shape = { kind: 'circle'; r: number } | { kind: 'square'; size: number };
 *   MyExtract<Shape, { kind: 'circle' }>       // { kind: 'circle'; r: number }
 *
 * This needs a *conditional type* (`A extends B ? X : Y`). When the checked type is
 * a naked type parameter, a conditional type is applied to each union member
 * separately ("distributive") — that's the whole trick. Day 4 covers conditional
 * types in depth; this is your preview.
 */
export type MyExclude<T, U> = any;

export type MyExtract<T, U> = any;
