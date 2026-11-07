## Event-loop ordering rules

Memorise these five rules and you can answer any "what does this print?" question.

1. **Synchronous code runs to completion first.** Nothing interrupts the call stack.
2. **Then the whole microtask queue drains**, including microtasks queued *by* microtasks.
3. **Then the browser may render** (`requestAnimationFrame` callbacks → style → layout → paint), typically once per frame and only if needed.
4. **Then one task** (macrotask) runs: a timer, a message, an I/O callback, a user-input event. Then back to rule 2.
5. **`async` functions run synchronously until the first `await`**; everything after an `await` is a microtask, even `await` of a non-promise.

| Queue | Sources | Runs |
|---|---|---|
| Call stack | Your synchronous code, the `new Promise` executor, `async` function bodies up to the first `await` | Immediately |
| **Microtasks** | `.then/.catch/.finally` reactions, `await` continuations, `queueMicrotask`, `MutationObserver` | After the current task, until empty |
| Rendering | `requestAnimationFrame`, style, layout, paint | Between tasks, about once per frame |
| **Tasks** | `setTimeout`, `setInterval`, `MessageChannel`, network and I/O callbacks, user-input events | One per loop iteration |
| Idle | `requestIdleCallback` | When the browser has spare time |

```ts run
// Predict the order, then run it.
console.log('A: sync start');

setTimeout(() => console.log('H: setTimeout (task)'), 0);

queueMicrotask(() => console.log('D: queueMicrotask'));

Promise.resolve()
  .then(() => console.log('E: then #1'))
  .then(() => console.log('G: then #2 (queued only when #1 finished)'));

(async () => {
  console.log('B: async body is synchronous until the first await');
  await null;
  console.log('F: code after await is a microtask');
})();

console.log('C: sync end');
```

Gotchas worth saying out loud:

- `setTimeout(fn, 0)` means "as a task, no earlier than ~0 ms". Nested timers are clamped to at least 4 ms after five levels of nesting.
- Chained `.then`s don't queue together: each one is queued only when the previous settles. That's why `F` beats `G`.
- Events dispatched **by code** (`el.click()`, `dispatchEvent`) run listeners synchronously; real user clicks run each listener as part of a task with a microtask checkpoint between listeners.
- **Node.js differs:** `process.nextTick` callbacks run before promise microtasks; `setImmediate` runs in the check phase. The order of `setTimeout(0)` vs `setImmediate` in the main module is not deterministic.

## `this` rules

`this` is decided by **how a function is called**, not where it is defined (except arrow functions). Check the rules in order of precedence:

| # | Call form | `this` is | Example |
|---|---|---|---|
| 1 | `new` | The newly created object | `new User()` |
| 2 | Explicit | The given object (a `bind` is permanent; only `new` overrides it) | `fn.call(obj)`, `fn.apply(obj, args)`, `fn.bind(obj)` |
| 3 | Implicit (method call) | The object before the dot **at call time** | `obj.method()` |
| 4 | Default (plain call) | `undefined` in strict mode (modules, classes); `globalThis` in sloppy scripts | `fn()` |
| — | Arrow function | Lexical: inherited from the enclosing scope; `call`/`bind` can't change it | `() => this.x` |
| — | DOM listener (`function`) | The element the listener is attached to (`currentTarget`) | `el.addEventListener('click', function () { this })` |

```ts run
const counter = {
  count: 0,
  inc() {
    return ++this.count;
  },
  snapshot() {
    return [1, 2].map(() => this.count); // arrow: `this` comes from snapshot's call
  },
};

console.log('implicit:', counter.inc()); // 1

const detached = counter.inc; // the "lost this" bug: callbacks, destructuring, setTimeout(obj.method)
try {
  console.log('detached:', detached());
} catch (e) {
  console.log('detached threw', (e as Error).name, '(this was undefined: modules are strict)');
}

console.log('explicit:', counter.inc.call({ count: 41 })); // 42
const bound = counter.inc.bind({ count: 99 });
console.log('bind beats call:', bound.call({ count: 0 })); // 100
console.log('arrow is lexical:', counter.snapshot());
```

Fixes for lost `this`: an arrow wrapper (`() => obj.method()`), `bind` once in the constructor, or a class field arrow (`handle = () => {…}`, one function per instance).

## Closures in three lines

- A closure is a function plus references to the **variables** (not values) of the scope where it was created.
- Each call of the outer function creates a **new** environment; `for (let …)` creates a fresh binding per iteration.
- Closures keep memory alive: clear timers, remove listeners, unsubscribe. In React, every render's handlers close over that render's state (stale closures).

## Equality

| Comparison | `==` | `===` | `Object.is` |
|---|---|---|---|
| `NaN`, `NaN` | false | false | **true** |
| `+0`, `-0` | true | true | **false** |
| `null`, `undefined` | **true** | false | false |
| `'0'`, `0` | **true** | false | false |
| `''`, `0` | **true** | false | false |
| `[]`, `false` | **true** | false | false |
| `null`, `0` | false | false | false |
| `{}`, `{}` (two objects) | false | false | false |

**`==` in one breath:** same type → `===`; `null` and `undefined` equal only each other; booleans become numbers; string vs number → number; object vs primitive → `ToPrimitive` the object. Use `===` everywhere, except the idiom `x == null` (null **or** undefined).

| Algorithm | Used by | NaN equals NaN? | +0 equals -0? |
|---|---|---|---|
| Strict (`===`) | `===`, `indexOf`, `switch` | No | Yes |
| SameValueZero | `includes`, `Map`/`Set` keys | Yes | Yes |
| SameValue | `Object.is`, React's state and deps comparison | Yes | No |

```ts run
const loose = (a: unknown, b: unknown) => a == b;
const strict = (a: unknown, b: unknown) => a === b;

const rows: Array<[string, unknown, unknown]> = [
  ['NaN, NaN', NaN, NaN],
  ['+0, -0', +0, -0],
  ['null, undefined', null, undefined],
  ["'0', 0", '0', 0],
  ['[], false', [], false],
  ['null, 0', null, 0],
];
for (const [label, a, b] of rows) {
  console.log(label.padEnd(16), '==', String(loose(a, b)).padEnd(6), '===', String(strict(a, b)).padEnd(6), 'Object.is', Object.is(a, b));
}
console.log('[NaN].includes(NaN):', [NaN].includes(NaN), '| [NaN].indexOf(NaN):', [NaN].indexOf(NaN));
```

## Coercion gotchas

| Expression | Result | Why |
|---|---|---|
| `[] + []` | `''` | Both become `''` via `ToPrimitive` |
| `[] + {}` | `'[object Object]'` | String concatenation |
| `1 + '2'` / `'5' - 2` | `'12'` / `3` | `+` concatenates if either side is a string; `-` is always numeric |
| `+''`, `+' '`, `+'\n'` | `0` | Whitespace-only strings convert to 0 |
| `+'12px'` vs `parseInt('12px')` | `NaN` vs `12` | `Number` is strict; `parseInt` stops at the first invalid char |
| `Number(null)` / `Number(undefined)` | `0` / `NaN` | |
| `null >= 0` but `null == 0` | `true` / `false` | Relational operators convert to number; `==` has special null rules |
| `typeof null` / `typeof NaN` | `'object'` / `'number'` | Historical bug / NaN is a number value |
| `0.1 + 0.2 === 0.3` | `false` | IEEE-754 doubles |
| `['1','2','3'].map(parseInt)` | `[1, NaN, NaN]` | `map` passes the index as the radix |
| `[10, 1, 2].sort()` | `[1, 10, 2]` | Default sort compares strings |
| `Math.max()` / `Math.min()` | `-Infinity` / `Infinity` | Identity values for max/min |
| `!!'false'`, `!![]`, `!!{}` | `true` | Only 8 falsy values: `false, 0, -0, 0n, '', null, undefined, NaN` |
| `{} + []` typed at a console prompt | `0` | Parsed as an empty block, then unary `+[]`. Inside an expression it's `'[object Object]'` |

```ts run
console.log(['1', '2', '3'].map(parseInt)); // radix = index
console.log([10, 1, 2].sort(), [10, 1, 2].sort((a, b) => a - b));
console.log(0.1 + 0.2, Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON);
console.log(Math.max(), Math.min());
console.log(parseInt('12px'), Number('12px'));
console.log(typeof null, typeof NaN, typeof class {});
```

## Array and object methods: cost and mutation

| Operation | Time | Mutates? | Non-mutating alternative / note |
|---|---|---|---|
| `push`, `pop` | O(1) amortised | Yes | `[...arr, x]` (O(n)) |
| `shift`, `unshift` | O(n) | Yes | For queues, use a head index or a deque |
| `splice` | O(n) | Yes | `toSpliced` (ES2023) |
| `sort` | O(n log n), stable since ES2019 | **Yes** | `toSorted` (ES2023) |
| `reverse` | O(n) | **Yes** | `toReversed` (ES2023) |
| `arr[i] = x` | O(1) | Yes | `arr.with(i, x)` (ES2023) |
| `slice`, `concat`, spread | O(k) / O(n+m) | No | |
| `indexOf`, `includes`, `find`, `findLast` | O(n) | No | Use a `Set`/`Map` for repeated lookups |
| `map`, `filter`, `reduce`, `flatMap` | O(n) | No | Chains allocate intermediate arrays |
| `at(-1)` | O(1) | No | ES2022 |
| `Object.keys/values/entries` | O(n) | No | Order: integer keys ascending, then string keys in insertion order |
| `key in obj` / `Object.hasOwn(obj, key)` | O(1) avg | No | `in` checks the prototype chain; `hasOwn` (ES2022) only own keys |
| `Map`/`Set` `get/set/has/delete` | O(1) avg | — | Insertion-ordered; any key type; SameValueZero |
| `Object.groupBy`, `Map.groupBy` | O(n) | No | ES2024 |
| `Set` `union`, `intersection`, `difference` | O(n) | No | ES2025; check your runtime support |
| `structuredClone(x)` | O(n) | No | Deep copy with cycles, `Date`, `Map`, `Set`; throws on functions and DOM nodes |
| `JSON.parse(JSON.stringify(x))` | O(n) | No | Drops `undefined` and functions, `Date` becomes a string, `Map`/`Set` become `{}`, throws on cycles |

## Promise combinators

| Combinator | Fulfils when | Rejects when | Fulfilment value | Empty input |
|---|---|---|---|---|
| `Promise.all` | **All** fulfil | **First** rejection | Array of values in **input order** | Fulfils with `[]` |
| `Promise.allSettled` | All settle | Never (for promise rejections) | `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }` per input | Fulfils with `[]` |
| `Promise.race` | First to **settle** fulfils | First to settle rejects | That value | **Pending forever** |
| `Promise.any` | First to **fulfil** | **All** reject | That value; rejection is an `AggregateError` with `.errors` | Rejects with `AggregateError` |

Also know: `Promise.withResolvers()` (ES2024) returns `{ promise, resolve, reject }`; `Promise.try` (ES2025). None of the combinators **cancel** the losers: use an `AbortController` for that.

```ts run
function wait<T>(ms: number, value: T, fail = false): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => (fail ? reject(new Error(String(value))) : resolve(value)), ms),
  );
}
const inputs = () => [wait(30, 'slow'), wait(10, 'fast-fail', true), wait(20, 'medium')];

console.log('all        ->', await Promise.all(inputs()).catch((e: Error) => `rejected: ${e.message}`));
console.log('allSettled ->', (await Promise.allSettled(inputs())).map((r) => r.status));
console.log('race       ->', await Promise.race(inputs()).catch((e: Error) => `rejected: ${e.message}`));
console.log('any        ->', await Promise.any(inputs()));
console.log('all([])    ->', await Promise.all([]));
console.log('any([])    ->', await Promise.any([]).catch((e: unknown) => (e as Error).name));
```

## TypeScript: type vs interface

| | `interface` | `type` alias |
|---|---|---|
| Object shapes | Yes | Yes |
| Extending | `extends` (errors on incompatible members) | `&` intersection (conflicts silently become `never`) |
| Declaration merging | **Yes**: re-declaring adds members (used to augment `Window`, library types) | No: duplicate identifier error |
| Unions, tuples, primitives, mapped/conditional types | No | **Yes** |
| `implements` in classes | Yes | Yes (if it's an object type) |
| Compiler performance | `extends` relationships are cached | Large intersections are re-computed |

> [!INTERVIEW] Say it like this
> "Both describe object shapes. Interfaces can be extended and merged, which suits public APIs and props; type aliases can express unions, tuples, mapped and conditional types. I default to interfaces for object shapes and use types when I need the extra expressiveness, and I value consistency in a codebase over the choice itself."

## `any`, `unknown`, `never`, `void`

| Type | Meaning | Use it for |
|---|---|---|
| `any` | Turns checking off; assignable to and from everything; spreads silently | Almost never; migrations, with a TODO |
| `unknown` | Top type: anything can be assigned to it, but you must **narrow** before using it | External data: `JSON.parse`, API responses, `catch (e)` (unknown under `strict` since TS 4.4) |
| `never` | Bottom type: no values | Functions that always throw, exhaustiveness checks, filtering in conditional types |
| `void` | "Return value is not used" | Callback return types; a `() => void` callback may still return a value |
| `object` / `{}` | Any non-primitive / any non-nullish value | Rarely; prefer specific shapes or `Record<string, unknown>` |

## Narrowing techniques

| Technique | Example | Narrows to |
|---|---|---|
| `typeof` | `typeof x === 'string'` | Primitives (remember `typeof null === 'object'`) |
| Truthiness | `if (user)` | Removes `null`/`undefined` (also `''`, `0`, `NaN`!) |
| Equality | `x === null`, `x == null`, `status === 'ok'` | Literal and nullish types |
| `in` | `'swim' in animal` | Union members that have the property |
| `instanceof` | `err instanceof Error` | Class instances |
| Discriminated union | `switch (action.type)` | The matching variant |
| `Array.isArray` | `Array.isArray(x)` | `any[]` (narrow elements further) |
| Type predicate | `function isFish(p: Pet): p is Fish` | Your own check |
| Assertion function | `function assert(c: unknown): asserts c` | Narrows after the call |
| Inferred predicates (TS 5.5+) | `arr.filter((x) => x !== undefined)` | `T[]` without a hand-written guard |
| Exhaustiveness | `const _never: never = x` in `default` | Compile error when a case is missing |

```ts run
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rect':
      return shape.width * shape.height;
    default: {
      const unreachable: never = shape; // compile error here if a new kind is added
      throw new Error(`Unhandled shape: ${JSON.stringify(unreachable)}`);
    }
  }
}
const shapes: Shape[] = [{ kind: 'circle', radius: 1 }, { kind: 'rect', width: 2, height: 3 }];
console.log(shapes.map((s) => area(s).toFixed(2)));

function isApiError(value: unknown): value is { status: number; message: string } {
  return (
    typeof value === 'object' && value !== null &&
    'status' in value && typeof value.status === 'number' &&
    'message' in value && typeof value.message === 'string'
  );
}
const payload: unknown = JSON.parse('{"status":404,"message":"Not found"}');
if (isApiError(payload)) console.log(`API error ${payload.status}: ${payload.message}`);

// TS 5.5+: filter infers the predicate, so `names` is string[]
const names = ['ada', undefined, 'grace'].filter((n) => n !== undefined);
console.log(names.map((n) => n.toUpperCase()));
```

## Utility types

| Utility | Result | Example |
|---|---|---|
| `Partial<T>` / `Required<T>` | All props optional / required | Patch payloads |
| `Readonly<T>` | All props `readonly` (shallow) | Props, frozen config |
| `Pick<T, K>` | Only keys `K` (must exist in `T`) | `Pick<User, 'id' \| 'name'>` |
| `Omit<T, K>` | All keys except `K` (`K` is **not** checked against `T`) | `Omit<Props, 'onChange'>` |
| `Record<K, V>` | Object with keys `K` and values `V` | `Record<Status, string>` |
| `Exclude<U, E>` / `Extract<U, E>` | Remove / keep union members assignable to `E` | `Exclude<Status, 'idle'>` |
| `NonNullable<T>` | Removes `null` and `undefined` | |
| `ReturnType<F>` / `Parameters<F>` | Function return type / parameter tuple | `ReturnType<typeof setTimeout>` |
| `Awaited<T>` | Recursively unwraps promises (TS 4.5) | `Awaited<ReturnType<typeof fetchUser>>` |
| `InstanceType<C>` / `ConstructorParameters<C>` | From a class constructor type | |
| `NoInfer<T>` | Blocks inference from this position (TS 5.4) | `fn<T>(values: T[], fallback: NoInfer<T>)` |
| `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` | String-literal manipulation | `Capitalize<'click'>` is `'Click'` |

## Generics and constraints

```tsx
// Constrain with `extends`; relate parameters to each other with keyof
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Default type parameters
interface ApiResponse<T = unknown> { data: T; error?: string }

// const type parameters (TS 5.0): infer literal, readonly types without `as const` at the call site
function routes<const T extends readonly string[]>(paths: T): T { return paths; }
const r = routes(['/', '/about']); // readonly ['/', '/about']

// Generic React component (in .tsx, write an arrow as <T,>(…) => to avoid JSX ambiguity)
interface ListProps<T> { items: T[]; renderItem: (item: T) => React.ReactNode; getKey: (item: T) => string }
function List<T>({ items, renderItem, getKey }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>;
}
```

**Rule of thumb:** a type parameter should appear at least twice (e.g. in a parameter *and* the return type). If it only appears once, use the constraint type directly.

## Type-level patterns

```ts
// Conditional types + infer
type ElementOf<T> = T extends readonly (infer U)[] ? U : never;

// Distribution: conditional types distribute over a *naked* type parameter
type ToArray<T> = T extends unknown ? T[] : never;            // ToArray<string | number> → string[] | number[]
type ToArrayNoDist<T> = [T] extends [unknown] ? T[] : never;  // (string | number)[]

// Mapped types: modifiers and key remapping with `as` (TS 4.1)
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Getters<T> = { [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K] };
type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };

// Template literal types
type HandlerName<E extends string> = `on${Capitalize<E>}`;    // HandlerName<'click'> → 'onClick'
type UserRoute = `/users/${number}`;                           // '/users/42' ok, '/users/me' error
type Split<S extends string, D extends string> =
  S extends `${infer Head}${D}${infer Rest}` ? [Head, ...Split<Rest, D>] : [S];
```

### `as const`, `satisfies` and enums

- `as const` makes literals readonly and narrow: `['a', 'b'] as const` is `readonly ['a', 'b']`.
- `satisfies` (TS 4.9) **checks** a value against a type without widening it: `const theme = { primary: '#06c' } satisfies Record<string, string>` keeps the exact keys.
- Prefer string-literal unions or `as const` objects over `enum`: enums generate runtime code and don't work with "erasable syntax only" setups (TS 5.8's `erasableSyntaxOnly` flag, Node's built-in type stripping).

> [!MISTAKE]
> Using `as` to silence errors (`data as User`). A cast is an unchecked claim. For external data, accept `unknown` and narrow with a type guard or a schema validator (such as Zod) at the boundary.

## Key takeaways

- Event loop: sync → **all** microtasks → maybe render → **one** task → repeat. Code after `await` is a microtask.
- `this`: `new` > explicit (`bind` permanent) > implicit (object before the dot) > default (`undefined` in strict). Arrows are lexical.
- Use `===`; know `Object.is` (React uses it) and SameValueZero (`includes`, `Map`, `Set`).
- `sort`, `reverse`, `splice` mutate; ES2023 gives `toSorted`, `toReversed`, `toSpliced`, `with`.
- `all` fails fast, `allSettled` never rejects, `race` takes the first settled, `any` the first fulfilled.
- TS: `unknown` + narrowing at boundaries, discriminated unions + `never` for exhaustiveness, utility and mapped types instead of copy-pasted shapes.
