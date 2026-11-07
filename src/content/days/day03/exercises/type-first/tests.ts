import type { Equal, Expect } from './type-utils';
import type { First } from './solution';

// test: returns the first element of a tuple
type case1 = Expect<Equal<First<[3, 2, 1]>, 3>>;

// test: works with function and object element types
type case2 = Expect<Equal<First<[() => 123, { a: string }]>, () => 123>>;

// test: an empty tuple gives never (not undefined)
type case3 = Expect<Equal<First<[]>, never>>;

// test: a first element of type undefined is still undefined
type case4 = Expect<Equal<First<[undefined, 1]>, undefined>>;

// test: accepts readonly tuples (as const)
type case5 = Expect<Equal<First<readonly ['a', 'b']>, 'a'>>;

// test: a readonly empty tuple is empty too
type case6 = Expect<Equal<First<readonly []>, never>>;

// test: rejects non-array types
// @ts-expect-error
type case7 = First<'notArray'>;
// @ts-expect-error
type case7b = First<{ 0: 'arrayLike' }>;
