import type { Equal, Expect } from './type-utils';
import type { TupleToUnion, Merge, UnionToIntersection } from './solution';

// test: TupleToUnion of a literal tuple
type case1 = Expect<Equal<TupleToUnion<['a', 'b', 'c']>, 'a' | 'b' | 'c'>>;

// test: TupleToUnion of an `as const` array (readonly tuple)
const ROLES = ['admin', 'editor', 'viewer'] as const;
type case2 = Expect<Equal<TupleToUnion<typeof ROLES>, 'admin' | 'editor' | 'viewer'>>;

// test: TupleToUnion of an empty tuple is never; of a plain array is the element type
type case3 = Expect<Equal<TupleToUnion<[]>, never>>;
type case3b = Expect<Equal<TupleToUnion<number[]>, number>>;

// test: Merge — the second type wins on conflicts
type case4 = Expect<Equal<Merge<{ a: string; b: number }, { b: string; c: boolean }>, { a: string; b: string; c: boolean }>>;

// test: Merge produces a flat object (an intersection A & B would not be Equal here)
type case5 = Expect<Equal<Merge<{ id: number }, { name: string }>, { id: number; name: string }>>;

// test: UnionToIntersection of object types
type case6 = Expect<Equal<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>;

// test: UnionToIntersection of function types gives an overloaded function
type Fns = ((x: string) => void) | ((x: number) => void);
type case7 = Expect<Equal<UnionToIntersection<Fns>, ((x: string) => void) & ((x: number) => void)>>;

// test: UnionToIntersection of incompatible primitives is never
type case8 = Expect<Equal<UnionToIntersection<'a' | 'b'>, never>>;
