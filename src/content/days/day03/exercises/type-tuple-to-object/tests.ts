import type { Equal, Expect } from './type-utils';
import type { TupleToObject } from './solution';

const cars = ['tesla', 'model 3', 'model X'] as const;
const numbers = [1, 2, 3] as const;
const sym1 = Symbol('one');
const sym2 = Symbol('two');
const symbols = [sym1, sym2] as const;
const mixed = [1, '2', sym1] as const;

// test: maps string literals to themselves
type case1 = Expect<Equal<TupleToObject<typeof cars>, { tesla: 'tesla'; 'model 3': 'model 3'; 'model X': 'model X' }>>;

// test: works with numeric literals
type case2 = Expect<Equal<TupleToObject<typeof numbers>, { 1: 1; 2: 2; 3: 3 }>>;

// test: works with unique symbols
type case3 = Expect<Equal<TupleToObject<typeof symbols>, { [sym1]: typeof sym1; [sym2]: typeof sym2 }>>;

// test: works with a mix of key types
type case4 = Expect<Equal<TupleToObject<typeof mixed>, { 1: 1; '2': '2'; [sym1]: typeof sym1 }>>;

// test: an empty tuple gives an empty object type
type case5 = Expect<Equal<TupleToObject<[]>, {}>>;

// test: rejects elements that cannot be object keys
// @ts-expect-error
type case6 = TupleToObject<[[1, 2], { a: 1 }]>;
