import type { Equal, Expect } from './type-utils';
import type { MyPick } from './solution';

interface Todo {
  title: string;
  description?: string;
  readonly completed: boolean;
}

// test: picks a single key
type case1 = Expect<Equal<MyPick<Todo, 'title'>, { title: string }>>;

// test: picks a union of keys
type case2 = Expect<Equal<MyPick<Todo, 'title' | 'completed'>, { title: string; readonly completed: boolean }>>;

// test: preserves the optional modifier
type case3 = Expect<Equal<MyPick<Todo, 'description'>, { description?: string }>>;

// test: preserves the readonly modifier
type case4 = Expect<Equal<MyPick<Todo, 'completed'>, { readonly completed: boolean }>>;

// test: rejects a key that does not exist on T
// @ts-expect-error
type case5 = MyPick<Todo, 'nope'>;

// test: rejects a union that contains an unknown key
// @ts-expect-error
type case6 = MyPick<Todo, 'title' | 'nope'>;
