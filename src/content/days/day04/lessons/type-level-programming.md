## Why interviewers ask about advanced types

On Day 3 you *used* `Partial`, `Pick`, `Omit` and generics. Today you learn to *build* them. Interviewers ask about conditional types, `infer` and mapped types for three reasons:

1. **It shows you can read library types.** React's `ComponentProps`, React Router's typed params, TanStack Query's inferred data, zod's `z.infer` — all of them are conditional + mapped types. A senior engineer can open a `.d.ts` and explain what they see.
2. **Type challenges are a common live-coding format** for TypeScript-heavy roles ("implement `MyPick`", "write `DeepReadonly`", "type this `get(obj, 'a.b.c')`").
3. **It separates "makes the red squiggles go away" from "designs APIs that are hard to misuse".** The strongest candidates can say *when* type-level code pays off — and when it is over-engineering.

The bar is not memorising every trick. It's being able to explain the mechanism in plain words and connect it to a real problem.

## The mental model: types are sets, `extends` means "fits inside"

Day 3's mental model is the key to everything today. Think of a type as the **set of values** it allows. `'a'` is a set with one value; `string` is the set of all strings; `'a' | 'b'` is the union of two sets; `never` is the **empty set**; `unknown` is the set of everything.

`A extends B` asks: **is every value of A also a value of B?** (is A assignable to B / a subset of B?). That single question powers everything below.

Type-level programming is then just functional programming with odd syntax:

| Value-level idea | Type-level equivalent |
|---|---|
| function parameter | generic type parameter `<T>` |
| `if / else` | conditional type `T extends U ? X : Y` |
| destructuring / regex capture | `infer` |
| `array.map` over keys | mapped type `{ [K in keyof T]: … }` |
| `filter` | key remapping to `never` |
| string interpolation | template literal types `` `on${Capitalize<K>}` `` |
| recursion / loops | a type alias that refers to itself |

> [!INTERVIEW] Say it like this
> "I think of types as sets of values. `extends` in a conditional type asks whether one set fits inside another. Conditional types are if/else on types, `infer` is pattern matching that captures part of a type, and mapped types loop over keys. With those three you can implement almost every built-in utility type yourself."

## Conditional types

On Day 3 you *read* `Exclude` and implemented `MyExclude`; now let's make the rules precise.

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>;      // false
```

When `T` is still generic (inside another generic function or type), the conditional is **deferred** — TypeScript can't pick a branch until it knows `T`. That's why you sometimes see unresolved `T extends … ? … : …` in hover tooltips.

### Distribution over unions — and how to opt out

When the checked type is a **naked type parameter** (just `T`, not wrapped in anything) and you pass a union, the conditional is applied **to each member separately** and the results are unioned. This is called a *distributive conditional type*.

```ts
type ToArray<T> = T extends unknown ? T[] : never;

type X = ToArray<string | number>;
//   = ToArray<string> | ToArray<number>
//   = string[] | number[]          ← not (string | number)[]
```

Distribution is exactly what makes the built-in filters work:

```ts
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T extends null | undefined ? never : T; // the built-in is now `T & {}`

type Status = 'idle' | 'loading' | 'success' | 'error';
type Settled = MyExclude<Status, 'idle' | 'loading'>; // 'success' | 'error'
```

`never` disappears from unions (`'a' | never` is `'a'`), so "map a member to `never`" means "remove it".

To **turn distribution off**, wrap both sides in a one-element tuple. `[T]` is no longer a naked type parameter:

```ts
type ToArrayOnce<T> = [T] extends [unknown] ? T[] : never;
type Y = ToArrayOnce<string | number>; // (string | number)[]
```

### `never` is the empty union

A distributive conditional over `never` distributes over *zero* members, so the result is `never` — not either branch. This trips people up constantly:

```ts
type IsNeverWrong<T> = T extends never ? true : false;
type W = IsNeverWrong<never>; // never   (!)

type IsNever<T> = [T] extends [never] ? true : false;
type R = IsNever<never>;      // true
```

> [!MISTAKE]
> Saying "conditional types distribute over unions" without the qualifier. They only distribute when the checked type is a **naked type parameter**. `T[] extends …`, `[T] extends …` or `Promise<T> extends …` do not distribute.

{{quiz:l1-distribution}}

## `infer`: pattern matching on types

Inside the `extends` clause you can declare a type variable with `infer X`. If the match succeeds, `X` is bound to whatever sits in that position — like a regex capture group.

```ts
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
type MyParameters<F> = F extends (...args: infer P) => any ? P : never;
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type R1 = MyReturnType<() => Promise<string>>;     // Promise<string>
type P1 = MyParameters<(id: string, n: number) => void>; // [id: string, n: number]
type E1 = ElementOf<readonly ['a', 1]>;             // 'a' | 1
type U1 = UnwrapPromise<Promise<Promise<number>>>;   // Promise<number> — only one level!
```

The built-in `Awaited<T>` is the recursive (and thenable-aware) version of `UnwrapPromise`, which is why `Awaited<Promise<Promise<number>>>` is `number`.

Two modern details worth knowing:

- **`infer X extends C`** (TS 4.7+) constrains the capture: `` S extends `${infer N extends number}` ? N : never `` turns `'42'` into the number literal `42`.
- **Where you can't avoid `any`:** `(...args: any[]) => infer R` is the idiomatic "any function" pattern in constraints. `unknown[]` would reject functions with specific parameter types because parameters are checked contravariantly (see variance below).

### Real use: typing what a library gives you

```ts
import type { ComponentProps } from 'react';
import { DatePicker } from 'some-ui-lib';

// The library doesn't export its props type? Extract it.
type DatePickerProps = ComponentProps<typeof DatePicker>;
// An API client function doesn't export its result type? Extract it.
type Invoice = Awaited<ReturnType<typeof api.getInvoice>>;
```

`ComponentProps<typeof X>` and `Awaited<ReturnType<typeof fn>>` are the two most common `infer`-powered utilities in React codebases.

## Mapped types

A mapped type iterates over a union of keys and builds an object type:

```ts
type MyPartial<T>  = { [K in keyof T]?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyRecord<K extends PropertyKey, V> = { [P in K]: V };
```

When the keys come from `keyof T` for a type parameter `T` (a **homomorphic** mapped type), TypeScript **preserves** each property's `readonly` and `?` modifiers, and maps arrays to arrays and tuples to tuples. That's why `Partial<string[]>` is still an array type.

### Modifiers: `+` and `-`

You can add (`+`, the default) or **remove** (`-`) the `readonly` and `?` modifiers:

```ts
type Mutable<T>    = { -readonly [K in keyof T]: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };

type Draft = Mutable<{ readonly id: string }>;     // { id: string }
type Full  = MyRequired<{ name?: string }>;       // { name: string }
```

Note that `-?` also strips the `undefined` that optionality added: `Required<{ a?: string | undefined }>` is `{ a: string }` (unless `exactOptionalPropertyTypes` is on).

### Key remapping with `as`

TS 4.1 added an `as` clause that transforms each key. Two uses cover 95% of real code:

```ts
// 1. Rename keys
type Getters<T> = { [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K] };
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// 2. Filter keys — remapping a key to `never` drops it
type DataOnly<T> = { [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K] };
type MyOmit<T, K extends PropertyKey> = { [P in keyof T as P extends K ? never : P]: T[P] };
```

`keyof T & string` matters: `keyof` can include `number` and `symbol` keys, and a symbol can't be placed in a template literal.

> [!MISTAKE]
> Using `Omit` on a **union** and expecting it to apply per member. `Omit<A | B, 'id'>` uses `keyof (A | B)` — only the keys *common to all members* — so it collapses a discriminated union into one flat type and loses the variant-specific props. Write a distributive version when you need it: `type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;`

## Template literal types

Template literal types build string literal types, and they **distribute over unions as a cross product**:

```ts
type Size = 'sm' | 'md' | 'lg';
type Tone = 'neutral' | 'danger';
type ButtonClass = `btn-${Size}-${Tone}`; // 6 members: 'btn-sm-neutral' | … | 'btn-lg-danger'

type Px = `${number}px`;
const gap: Px = '8px';   // ✅
// const bad: Px = '8em'; // ❌
```

The four **intrinsic** string types are `Uppercase<S>`, `Lowercase<S>`, `Capitalize<S>` and `Uncapitalize<S>` — implemented inside the compiler, not in a `.d.ts`.

Combined with `infer`, template literals become a tiny parser. A classic app-level use is typed route parameters (React Router's `generatePath` types work on this principle):

```ts run
type RouteParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | RouteParams<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never;

// RouteParams<'/users/:userId/posts/:postId'> = 'userId' | 'postId'
function buildPath<P extends string>(path: P, params: Record<RouteParams<P>, string | number>): string {
  return path.replace(/:(\w+)/g, (_, key: string) => encodeURIComponent(String(params[key as RouteParams<P>])));
}

console.log(buildPath('/users/:userId/posts/:postId', { userId: 42, postId: 'hello world' }));
// buildPath('/users/:userId', {});  ← compile error: property 'userId' is missing
```

The runnable part shows the runtime; the value is that a missing or misspelled param is now a **compile error** at every call site.

## Recursive types

A type alias may refer to itself, which is how you express "all the way down":

```ts
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type DeepPartial<T> = T extends (...args: any[]) => unknown
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
```

`DeepPartial` is a realistic app type: test fixtures and settings patches (`updateSettings(patch: DeepPartial<Settings>)`). You'll write `DeepReadonly` in today's exercises.

Practical limits to mention in an interview:

- Deep recursion has a cost: complex recursive types slow down the editor and can hit "Type instantiation is excessively deep and possibly infinite". TS 4.5+ optimises **tail-recursive** conditional types (allowing roughly 1,000 levels), but non-tail recursion is limited much sooner.
- Huge unions explode: a `Path<T>` type over a large nested object can produce thousands of members. Treat arrays and built-ins (Date, Map) as leaves.

## How the built-ins are implemented

Being able to write these from memory is a strong signal — they're all one-liners built from the pieces above:

| Utility | Implementation (simplified from `lib.es5.d.ts`) | Technique |
|---|---|---|
| `Partial<T>` | `{ [P in keyof T]?: T[P] }` | mapped + `?` |
| `Required<T>` | `{ [P in keyof T]-?: T[P] }` | mapped + `-?` |
| `Readonly<T>` | `{ readonly [P in keyof T]: T[P] }` | mapped + `readonly` |
| `Pick<T, K extends keyof T>` | `{ [P in K]: T[P] }` | mapped over a key subset |
| `Record<K, T>` | `{ [P in K]: T }` | mapped over arbitrary keys |
| `Exclude<T, U>` | `T extends U ? never : T` | distributive conditional |
| `Extract<T, U>` | `T extends U ? T : never` | distributive conditional |
| `Omit<T, K>` | `Pick<T, Exclude<keyof T, K>>` | composition (not distributive!) |
| `NonNullable<T>` | `T & {}` | intersection (`{}` = any non-nullish value) |
| `ReturnType<T>` | `T extends (...args: any) => infer R ? R : any` | `infer` |
| `Parameters<T>` | `T extends (...args: infer P) => any ? P : never` | `infer` |
| `Awaited<T>` | recursive unwrap of thenables | recursive conditional + `infer` |

Note that `Omit`'s `K` is `K extends keyof any`, not `keyof T` — you can omit keys that don't exist, which is convenient but means typos aren't caught. Some teams define a `StrictOmit<T, K extends keyof T>`.

## Variance in five minutes

Variance answers: if `Dog` is assignable to `Animal`, what about `Box<Dog>` and `Box<Animal>`?

- **Covariant** (same direction): outputs. A function returning `Dog` is assignable to one returning `Animal`. `readonly Dog[]` → `readonly Animal[]` is safe.
- **Contravariant** (reversed): inputs. A handler accepting `Animal` can be used where a handler of `Dog` is expected — but not the other way round. With `strictFunctionTypes` (part of `strict`), function-type **parameters** are checked contravariantly.
- **Bivariant** (either direction, unsound): TypeScript deliberately keeps **method** parameters bivariant, even under `strict`, and mutable arrays are treated covariantly (also unsound — `Dog[]` is assignable to `Animal[]` and you can push a `Cat`).

The method-vs-function-property distinction is a favourite "does this compile?" question:

```ts run
interface MethodStyle {
  log(value: string | number): void; // method shorthand → bivariant parameter check
}
interface PropertyStyle {
  log: (value: string | number) => void; // function-typed property → contravariant (strict)
}

const shout = (value: string) => console.log(value.toUpperCase());

const a: MethodStyle = { log: shout }; // ✅ compiles (unsound!)
// const b: PropertyStyle = { log: shout }; // ❌ parameters incompatible: 'string | number' is not assignable to 'string'

a.log('fine');
try {
  a.log(42); // type-checks, crashes at runtime
} catch (e) {
  console.log('TypeError:', (e as Error).message);
}
```

Practical rule: declare callbacks in your props and interfaces as **function-typed properties** (`onChange: (value: string) => void`) so they get the strict check. That's also how React's own types declare event handlers.

> [!NOTE]
> TS 4.7 added optional variance annotations (`interface Box<out T>`, `<in T>`, `<in out T>`). You'll rarely write them in app code — they mainly help library authors document intent and speed up checking.

{{quiz:l1-bivariance}}

## Branded (nominal) types

TypeScript is **structural**: two types with the same shape are interchangeable. Usually great; sometimes dangerous — a `userId: string` and an `orderId: string` can be swapped silently. A **brand** adds a phantom property that never exists at runtime, making the types incompatible:

```ts run
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId = Brand<string, 'UserId'>;
type Cents = Brand<number, 'Cents'>;

// The ONLY way to get a UserId: a function that checks (a "smart constructor").
function toUserId(raw: string): UserId {
  if (!/^usr_[a-z0-9]+$/.test(raw)) throw new Error(`Invalid user id: ${raw}`);
  return raw as UserId; // the single, audited cast
}
const toCents = (amount: number) => Math.round(amount * 100) as Cents;

function chargeUser(id: UserId, amount: Cents) {
  return `charging ${id} ${amount}¢`;
}

const id = toUserId('usr_42');
console.log(chargeUser(id, toCents(19.99)));
console.log('at runtime it is just a', typeof id);
// chargeUser('usr_42', 1999);      ❌ string is not UserId, number is not Cents
// chargeUser(id, toCents(1) * 2);  ❌ arithmetic returns plain number
```

Good uses: IDs of different entities, money in minor units, validated values (`Email`, `SanitizedHtml`, `NonEmptyString`), absolute vs relative paths. The brand turns "I validated this somewhere" into something the compiler tracks — the same idea as "parse, don't validate" in lesson 3.

Trade-off: every value needs to pass through a constructor (or a cast), so brand only where mixing values up has real cost.

> [!INTERVIEW] Say it like this
> "TypeScript is structural, so two `string` IDs are interchangeable. A branded type intersects the base type with a phantom property — `string & { readonly [brand]: 'UserId' }` — so it's still a string at runtime but not assignable from a plain string. I pair it with a smart constructor that validates, so having a `UserId` proves it was checked."

## When would you actually write this in an app?

| Need | Tool | Example |
|---|---|---|
| Derive a type from a value so they can't drift | `typeof`, `as const`, indexed access | `type Role = (typeof ROLES)[number]` |
| Use a library's unexported type | `infer`-based utilities | `ComponentProps<typeof Foo>`, `Awaited<ReturnType<typeof fetchUser>>` |
| Generate props/handlers from a model | mapped type + `as` + template literal | `onFieldChange` handlers from a form model |
| Convert API casing | template literal + recursion | `CamelCaseKeys<ApiUser>` |
| Typed routes, i18n keys, event names | template literal + `infer` | `buildPath('/users/:id', { id })` |
| Prevent mixing look-alike primitives | branded types | `UserId`, `Cents` |
| Immutable state / config | `DeepReadonly`, `as const` | Redux state, feature flags |

And when **not** to: if a type takes longer to read than the code it protects, or produces error messages nobody can decode, prefer a simpler explicit type or a runtime check. Clever types are a maintenance cost; mention that trade-off unprompted and you'll sound senior.

## Key takeaways

- `A extends B` asks "is A a subset of B?". Conditional types are if/else on that question.
- Conditional types **distribute** only over a **naked type parameter**; wrap in `[T] extends [U]` to opt out. `never` is the empty union, so distributing over it yields `never`.
- `infer` captures part of a matched type: `ReturnType`, `Parameters`, `Awaited`, `ComponentProps` all use it.
- Mapped types loop over keys; `-readonly` / `-?` remove modifiers; `as` renames keys or filters them (remap to `never`).
- Template literal types build string unions (cross product) and, with `infer`, parse strings.
- Function-typed **properties** are checked contravariantly under `strict`; **methods** stay bivariant — declare callbacks as properties.
- Branded types add nominal typing to a structural system; pair them with validating constructors.
