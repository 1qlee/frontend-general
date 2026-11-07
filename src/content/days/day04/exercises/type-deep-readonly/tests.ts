import type { Equal, Expect } from './type-utils';
import type { DeepReadonly, Mutable } from './solution';

// test: makes top-level properties readonly
type case1 = Expect<Equal<DeepReadonly<{ a: string; b: number }>, { readonly a: string; readonly b: number }>>;

// test: recurses into nested objects
type case2 = Expect<
  Equal<
    DeepReadonly<{ user: { name: string; address: { city: string } } }>,
    { readonly user: { readonly name: string; readonly address: { readonly city: string } } }
  >
>;

// test: arrays become readonly arrays of deep-readonly items
type case3 = Expect<Equal<DeepReadonly<{ todos: { done: boolean }[] }>, { readonly todos: readonly { readonly done: boolean }[] }>>;

// test: tuples become readonly tuples
type case4 = Expect<Equal<DeepReadonly<[1, { a: 'x' }]>, readonly [1, { readonly a: 'x' }]>>;

// test: leaves functions untouched
type case5 = Expect<Equal<DeepReadonly<{ onClick: (id: string) => void }>, { readonly onClick: (id: string) => void }>>;

// test: primitives and null pass through unchanged
type case6 = Expect<Equal<DeepReadonly<string | null>, string | null>>;

// test: handles unions member by member
type case7 = Expect<Equal<DeepReadonly<{ a: { b: 1 } | 'none' }>, { readonly a: { readonly b: 1 } | 'none' }>>;

// test: writing to a deeply nested property is a compile error
declare const config: DeepReadonly<{ api: { baseUrl: string } }>;
// @ts-expect-error — baseUrl is readonly
config.api.baseUrl = 'https://evil.example';

// test: pushing into a nested array is a compile error
declare const state: DeepReadonly<{ items: string[] }>;
// @ts-expect-error — readonly arrays have no push
state.items.push('x');

// test: Mutable removes readonly from own properties only
type case8 = Expect<Equal<Mutable<{ readonly id: string; readonly tags: readonly string[] }>, { id: string; tags: readonly string[] }>>;

// test: Mutable keeps optional properties optional
type case9 = Expect<Equal<Mutable<{ readonly a?: number }>, { a?: number }>>;
