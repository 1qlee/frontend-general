import type { Equal, Expect } from './type-utils';
import type { MyReadonly } from './solution';

interface Todo {
  title: string;
  description?: string;
  meta: { author: string };
}

// test: makes every property readonly and keeps optional ones optional
type case1 = Expect<
  Equal<MyReadonly<Todo>, { readonly title: string; readonly description?: string; readonly meta: { author: string } }>
>;

// test: is shallow — nested objects keep their mutable properties
type case2 = Expect<Equal<MyReadonly<Todo>['meta'], { author: string }>>;

// test: assigning to a property is a compile error
declare const todo: MyReadonly<Todo>;
// @ts-expect-error
todo.title = 'changed';

// test: arrays become readonly arrays (no push)
type case4 = Expect<Equal<MyReadonly<string[]>, readonly string[]>>;

// test: tuples become readonly tuples
type case5 = Expect<Equal<MyReadonly<[1, 'a']>, readonly [1, 'a']>>;
