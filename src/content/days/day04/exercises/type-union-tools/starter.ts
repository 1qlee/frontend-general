/**
 * Three utilities that show up in real codebases and in type-challenge interviews.
 *
 * TupleToUnion<T> — the union of a tuple's/array's element types.
 *   const ROLES = ['admin', 'editor', 'viewer'] as const;
 *   type Role = TupleToUnion<typeof ROLES>;   // 'admin' | 'editor' | 'viewer'
 *
 * Merge<A, B> — like `{ ...a, ...b }` at the type level: B's properties win on conflict.
 *   The result must be a single flattened object type, not an intersection.
 *   Merge<{ a: string; b: number }, { b: string; c: boolean }>  // { a: string; b: string; c: boolean }
 *
 * UnionToIntersection<U> — turn A | B | C into A & B & C.
 *   UnionToIntersection<{ a: 1 } | { b: 2 }>  // { a: 1 } & { b: 2 }
 *   Hint: function parameters are contravariant…
 */
export type TupleToUnion<T extends readonly unknown[]> = any;

export type Merge<A, B> = any;

export type UnionToIntersection<U> = any;
