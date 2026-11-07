import type { Equal, Expect } from './type-utils';
import type { MyExclude, MyExtract } from './solution';

type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'square'; size: number }
  | { kind: 'rect'; w: number; h: number };

// test: MyExclude removes one member of a union
type case1 = Expect<Equal<MyExclude<'a' | 'b' | 'c', 'a'>, 'b' | 'c'>>;

// test: MyExclude removes several members
type case2 = Expect<Equal<MyExclude<'a' | 'b' | 'c', 'a' | 'b'>, 'c'>>;

// test: MyExclude removes members assignable to a wider type
type case3 = Expect<Equal<MyExclude<string | number | (() => void), Function>, string | number>>;

// test: MyExtract keeps only members assignable to U
type case4 = Expect<Equal<MyExtract<'a' | 'b' | 'c', 'a' | 'z'>, 'a'>>;

// test: MyExtract selects a discriminated-union member by its tag
type case5 = Expect<Equal<MyExtract<Shape, { kind: 'circle' }>, { kind: 'circle'; r: number }>>;

// test: MyExclude drops discriminated-union members by tag
type case6 = Expect<Equal<MyExclude<Shape, { kind: 'circle' | 'square' }>, { kind: 'rect'; w: number; h: number }>>;

// test: MyExtract with no overlap is never
type case7 = Expect<Equal<MyExtract<'a' | 'b', 'c'>, never>>;
