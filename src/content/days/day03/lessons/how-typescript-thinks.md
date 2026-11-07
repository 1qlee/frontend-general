## Why interviewers ask this

TypeScript questions in frontend interviews are rarely about obscure syntax. They probe whether you understand what the type checker is actually doing: **a static, structural type system whose types are erased at runtime**, with inference doing most of the work. A candidate who says "TypeScript is Java-style types for JavaScript" is about to give a series of wrong answers. One who says "types are sets of values, compatibility is structural, and none of it exists at runtime" can reason through almost any "does this compile?" question.

What a strong answer demonstrates:

- You can **predict what the compiler infers** (and why `let` and `const` differ).
- You know **where TypeScript is deliberately unsound** (`any`, assertions, some narrowing) and how you guard those edges.
- You make **deliberate choices** — `interface` vs `type`, annotation vs `satisfies` — and can justify each in one sentence.

## The mental model: types are sets of values

Think of a type as the **set of values** it allows. `string` is the set of all strings; `'idle'` is a set with exactly one member; `'idle' | 'loading'` is the union of two sets. "Is `A` assignable to `B`?" is just **"is set A a subset of set B?"**

| Type | As a set | Notes |
|---|---|---|
| `never` | the empty set | assignable to everything; nothing is assignable to it |
| `'a'` | `{ 'a' }` | a literal type |
| `'a' \| 'b'` | `{ 'a', 'b' }` | union = set union |
| `string` | every string | |
| `{ name: string }` | every object with a string `name` — *and anything else* | object types are **open** |
| `unknown` | every value | the top type |
| `any` | not a set — "stop checking" | an escape hatch in both directions |

Two consequences fall straight out of this model:

1. An object type describes a **minimum**: `{ name: string }` includes `{ name: 'Ada', age: 36 }`. More properties means more constraints, a *smaller* set — a subtype.
2. The intersection `A & B` of two object types is "has everything from both" (the set intersection), which is why `&` *adds* properties.

### Types are erased

TypeScript compiles to JavaScript by **deleting** the types. (`enum`, `namespace` and constructor parameter properties are the notable exceptions that emit code.) Nothing checks your types at runtime:

```ts run
interface User {
  name: string;
}

function greet(user: User) {
  return `Hello, ${user.name.toUpperCase()}`;
}

// The API renamed its field. TypeScript can't see this: JSON.parse returns `any`.
const fromServer = JSON.parse('{"fullName":"Ada"}');
try {
  console.log(greet(fromServer));
} catch (e) {
  console.log('Runtime crash despite "type safety":', (e as Error).message);
}
```

That's why typing data that crosses a trust boundary (`fetch`, `localStorage`, `postMessage`, URL params) needs runtime validation — you'll write a validator in today's exercises.

> [!INTERVIEW] Say it like this
> "TypeScript is a static type checker for JavaScript. It's structural — compatibility is decided by the shape of a value, not by declared names — and the types are erased at compile time, so anything crossing a trust boundary like `fetch` has to be validated at runtime."

## Structural typing

TypeScript compares types by their **structure**: if a value has all the required properties with compatible types, it's assignable. No `implements`, no shared ancestry needed — duck typing, checked at compile time.

```ts
interface Point { x: number; y: number }
class Vector {
  constructor(public x: number, public y: number) {}
}

function length(p: Point) {
  return Math.hypot(p.x, p.y);
}

length(new Vector(3, 4));       // ✅ Vector has x and y — that's all Point asks for
const p3d = { x: 1, y: 2, z: 3 };
length(p3d);                    // ✅ extra properties are fine
```

Even classes are structural. Two unrelated classes with the same public members are interchangeable to the checker — even though `instanceof` disagrees at runtime:

```ts run
class Cat { name = 'Tom'; }
class Dog { name = 'Rex'; }

const pet: Dog = new Cat(); // compiles: same shape
console.log(pet instanceof Dog, pet.constructor.name);
```

The exception: a class with `private`, `protected` or `#private` members is only compatible with itself and its subclasses (*"Types have separate declarations of a private property"*). That's the one place TypeScript is nominal out of the box.

When you *want* nominal behaviour — a `UserId` that can't be mixed up with an `OrderId`, both plain strings — the idiom is a **branded type**: `type UserId = string & { readonly __brand: 'UserId' }`, created only through a function that validates it. Day 4 builds on that.

### The exception: excess property checks

If extra properties are fine, why does this fail?

```ts
interface ButtonProps { label: string; variant?: 'primary' | 'secondary' }

const props: ButtonProps = { label: 'Save', varient: 'primary' };
// ❌ Object literal may only specify known properties, but 'varient' does not exist
//    in type 'ButtonProps'. Did you mean to write 'variant'?
```

**Excess property checking** applies only to **fresh object literals** — a literal written directly where a typed value is expected (an annotated variable, an argument, a return value, a `satisfies`). Nobody else can hold a reference to that literal, so an unknown key is almost certainly a typo. Once the object has been stored in a variable, it's no longer fresh and ordinary structural rules apply:

```ts
const draft = { label: 'Save', varient: 'primary' };
const props: ButtonProps = draft; // ✅ compiles — no excess property check, the typo slips through
```

JSX attributes get the same check, which is why `<Button lable="Save" />` is an error — but spread props (`<Button {...rest} />`) are not checked for extras.

> [!MISTAKE]
> "TypeScript rejects objects with extra properties." It doesn't. Structural typing is happy with extras; only **fresh object literals** get the excess property check. Getting this distinction right is a strong signal.

{{quiz:excess-property-fresh}}

## Inference vs annotation

TypeScript infers types from initialisers, `return` statements and context. Good TypeScript has surprisingly few annotations. The rule senior engineers use:

> **Annotate the boundaries, infer the internals.**

| Where | Annotate? | Why |
|---|---|---|
| Function parameters | Yes | Nothing to infer from; unannotated parameters are implicit `any` (an error under `strict`). |
| Callback parameters | No | **Contextual typing**: in `items.map((item) => …)` or `onClick={(e) => …}` the type comes from the expected function type. |
| Exported function return types | Usually | It's the contract: a mistake surfaces *inside* the function instead of at every call site, accidental API changes are caught, and big projects type-check faster (TS 5.5's `isolatedDeclarations` requires them). |
| Local variables | No | `const total = price * qty` is obviously `number`; annotating adds noise and can *widen* the type. |
| Empty or ambiguous initialisers | Yes | `const ids: string[] = []`, `useState<User \| null>(null)` — the initial value doesn't describe the full type. |

```ts
// Boundary: parameters and the return type are annotated
export function totalPrice(items: readonly CartItem[]): number {
  // Internals: inferred (sum and item are contextually typed by reduce)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = subtotal > 100 ? 0.1 : 0;
  return subtotal * (1 - discount);
}
```

> [!TIP]
> In React, props are the boundary — type them (`function Avatar({ user, size = 40 }: AvatarProps)`). Inline event handlers are contextually typed, so `onChange={(e) => setName(e.target.value)}` needs no annotation.

## Widening, literal types and `as const`

How specific is the inferred type? It depends on whether the value can change:

```ts
const status = 'idle';            // 'idle'               — a const can never be anything else
let mode = 'idle';                // string               — widened: you might reassign it
const state = { status: 'idle' }; // { status: string }   — properties are mutable, so they widen too
const sizes = [1, 2];             // number[]
```

The object case produces a classic bug:

```ts
type Status = 'idle' | 'loading' | 'success';
function setStatus(s: Status) { /* … */ }

const initial = { status: 'idle' };
setStatus(initial.status);
// ❌ Argument of type 'string' is not assignable to parameter of type 'Status'.
```

Three fixes, each meaning something different:

1. **Annotate:** `const initial: { status: Status } = { status: 'idle' }` — the variable's type is exactly what you wrote.
2. **`as const`:** `const initial = { status: 'idle' } as const` — infer the narrowest type: literal types, `readonly` properties, and array literals become `readonly` tuples.
3. **`satisfies`** (below) — check against a type but keep the inferred one.

`as const` is the idiomatic way to define values once and derive a type from them:

```ts
const ROLES = ['admin', 'editor', 'viewer'] as const; // readonly ['admin', 'editor', 'viewer']
type Role = (typeof ROLES)[number];                    // 'admin' | 'editor' | 'viewer'
```

One source of truth for the runtime array (to render a `<select>`, to validate input) *and* the type. The `(typeof X)[number]` part is explained in the generics lesson.

`as const` is compile-time only — it does **not** freeze anything:

```ts run
const config = { retries: 3, endpoints: ['a', 'b'] } as const;
// config.retries = 4;  // ❌ compile error: Cannot assign to 'retries' because it is a read-only property
(config as { retries: number }).retries = 4; // but at runtime nothing stops a determined write
console.log(config.retries, Object.isFrozen(config));
```

Use `Object.freeze` when you need runtime immutability (and remember it's shallow too).

## `type` vs `interface`

Both describe object shapes, and for most objects they're interchangeable. The differences interviewers expect you to know:

| | `interface` | `type` alias |
|---|---|---|
| Object shapes | ✅ | ✅ |
| Unions, tuples, primitives, function types, mapped/conditional types | ❌ | ✅ |
| Declaration merging | ✅ two `interface Window {}` blocks merge | ❌ "Duplicate identifier" |
| Extending | `interface B extends A` — **checks** compatibility, errors on conflicts | `type B = A & {…}` — conflicting properties silently become `never` |
| Error messages and hovers | Shown by name (`ButtonProps`) | Often expanded into the full structure |
| Implicit index signature | ❌ not assignable to `Record<string, unknown>` | ✅ assignable |
| Type-checking performance | Relationships between named interfaces are cached | Large intersections are re-checked structurally |

The `extends` vs `&` difference is the one that bites:

```ts
interface Base { id: string }

interface Bad extends Base { id: number }
// ❌ Interface 'Bad' incorrectly extends interface 'Base'. Types of property 'id' are incompatible.

type AlsoBad = Base & { id: number }; // no error here…
const x: AlsoBad = { id: 1 };          // ❌ …only here: Type 'number' is not assignable to type 'never'.
```

**Declaration merging** is a feature, not a quirk: it's how you augment global or third-party types.

```ts
// Add a property to the global Window type (inside a module file)
declare global {
  interface Window { __APP_VERSION__: string }
}

// Module augmentation: add a field to a library's interface
declare module 'some-router' {
  interface RouteMeta { requiresAuth?: boolean }
}
```

The flip side: an interface can merge *accidentally* when its name collides with an existing global in a non-module script.

> [!NOTE] The performance note, precisely
> The TypeScript team's performance guidance recommends `interface … extends` over intersections for composing object types: an interface is a single flat type whose relationships are cached by name, while `A & B` is re-checked structurally each time. It only matters in large codebases — don't lead with it, but it's a good senior-level detail.

What to say: *"I use `interface` for object shapes — especially public, extendable ones like component props — because `extends` checks conflicts and errors show the name. I use `type` for everything an interface can't express: unions, tuples, function types, mapped and conditional types. Consistency within the codebase matters more than the choice."* Both preferences are defensible (plenty of React codebases use `type` everywhere); state yours and why.

## `any` vs `unknown` vs `never`

| | Meaning | Can be assigned… | Can be used as… | Typical use |
|---|---|---|---|---|
| `any` | Opt out of checking | anything | anything, no errors | migrations, genuinely untypeable code — and it's contagious |
| `unknown` | "some value, I don't know what yet" | anything | nothing, until narrowed | untrusted input: `JSON.parse`, `res.json()`, `catch (e)` |
| `never` | no possible value | nothing (but `never`) | anything (it can't happen) | exhaustiveness checks, functions that never return |

```ts
function handle(a: any, u: unknown) {
  a.foo.bar();            // compiles — and may crash at runtime
  u.foo;                  // ❌ 'u' is of type 'unknown'.
  if (typeof u === 'object' && u !== null && 'foo' in u) {
    console.log(u.foo);   // ✅ u: object & Record<'foo', unknown>
  }
}
```

`any` is dangerous mostly because it **spreads**: `anyValue.foo` is `any`, a function that returns it returns `any`, and code you carefully typed silently stops being checked. In review, treat `any` like a disabled lint rule: it needs a justification.

`never` turns up more often than people expect:

- A function that always throws (or never finishes) returns `never`.
- `string & number` is `never` — no value is both.
- When every member of a union has been narrowed away, what's left is `never` — the basis of exhaustiveness checking (next lesson).
- `never` vanishes from unions: `'a' | never` is just `'a'` — the trick behind `Exclude`.

> [!INTERVIEW] Say it like this
> "`unknown` is the type-safe counterpart of `any`: anything can be assigned to it, but you can't do anything with it until you narrow it. `any` turns checking off in both directions and spreads through the code. `never` is the empty type — no value has it — so it's used for exhaustiveness checks and functions that never return."

> [!MISTAKE]
> Treating `catch (error)` as an `Error`. Under `strict` (`useUnknownInCatchVariables`, TS 4.4+) it's `unknown`, because JavaScript can throw anything. Narrow with `error instanceof Error` before reading `.message`.

## The strictness flags that matter

| Flag | What it does | In `strict`? |
|---|---|---|
| `strict` | Umbrella for `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict` (and `strictBuiltinIteratorReturn` since 5.6) | — |
| `strictNullChecks` | `null` and `undefined` are their own types instead of members of every type. **The most valuable flag of all.** | ✅ |
| `noImplicitAny` | Error wherever TS would silently fall back to `any` | ✅ |
| `noUncheckedIndexedAccess` | `arr[i]` and `record[key]` include `\| undefined` | ❌ opt-in |
| `exactOptionalPropertyTypes` | `{ a?: string }` means "absent or a string": explicitly assigning `undefined` is an error | ❌ opt-in |

```ts
// with noUncheckedIndexedAccess
const names: string[] = [];
const first = names[0];       // string | undefined — honest
const byId: Record<string, User> = {};
byId['42'].name;              // ❌ Object is possibly 'undefined'.
```

Without `noUncheckedIndexedAccess`, `names[0]` is typed `string` even for an empty array — a steady source of "Cannot read properties of undefined" crashes. It adds some friction in index-heavy loops (prefer `for…of` or an explicit check), so: on for new projects, a deliberate migration for old ones.

`exactOptionalPropertyTypes` separates "missing" from "present but `undefined`". That matters for `'key' in obj`, for spreads (`{ ...defaults, ...overrides }` — an explicit `undefined` in `overrides` *overwrites* the default!) and for PATCH-style APIs. Few projects enable it because many libraries' types weren't written for it; knowing why it exists is enough.

## Annotation vs assertion vs `satisfies`

Three ways to "put a type on" a value:

```ts
type Theme = Record<'primary' | 'danger', string | [number, number, number]>;

// 1. Annotation: the value is checked, and the variable's type IS Theme
const a: Theme = { primary: '#0af', danger: [255, 0, 0] };
a.primary.toUpperCase(); // ❌ Property 'toUpperCase' does not exist on type 'string | [number, number, number]'.

// 2. Assertion: "trust me" — barely checked, can lie
const b = { primary: '#0af' } as Theme; // ✅ compiles, although `danger` is missing!

// 3. satisfies (TS 4.9): checked against Theme, but the inferred type is kept
const c = { primary: '#0af', danger: [255, 0, 0] } satisfies Theme;
c.primary.toUpperCase();        // ✅ c.primary: string
c.danger.map((n) => n / 255);   // ✅ c.danger: [number, number, number]
```

| | Checks the value? | Resulting type | Use it for |
|---|---|---|---|
| `const x: T = v` | Yes, incl. excess properties | `T` (wider) | boundaries; when the variable should *be* `T` (e.g. it gets reassigned) |
| `v as T` | Barely — the types must merely overlap | `T` | facts the compiler can't know (DOM queries, after checks it can't follow). Last resort. |
| `v satisfies T` | Yes, incl. excess properties | `v`'s inferred type (narrower) | config objects, lookup tables, route maps |

An assertion is only allowed when one type is assignable to the other: `'hello' as number` is an error (*"Conversion of type 'string' to type 'number' may be a mistake"*), which is why the double cast `value as unknown as T` exists — a red flag in review. The non-null assertion `user!.name` is the same kind of promise: it strips `null | undefined` with no runtime check.

`satisfies` combines nicely with `as const`:

```ts
const ROUTES = { home: '/', user: '/users/:id' } as const satisfies Record<string, `/${string}`>;
// literal and readonly (ROUTES.home is '/'), AND every value is validated to start with '/'
```

{{quiz:satisfies-vs-annotation}}

> [!INTERVIEW] Say it like this
> "An annotation sets the variable's type — the value is checked, but I lose the more specific inferred type. `as` is an assertion: it overrides the compiler with almost no checking, so it's my last resort. `satisfies` validates the value against a type but keeps the precise inferred type, which is ideal for config objects and lookup tables."

## Key takeaways

- Types are **sets of values**; assignability is the subset relation. `unknown` is everything, `never` is nothing, `any` is "stop checking".
- TypeScript is **structural** and **erased**: shape decides compatibility, and nothing is checked at runtime.
- **Excess property checks** apply only to fresh object literals — the one exception to "extra properties are fine".
- **Annotate boundaries** (parameters, exported return types, ambiguous initialisers); **infer internals**.
- `let` bindings and object properties **widen** literals; `as const` keeps literal, readonly types — at compile time only.
- `interface`: object shapes, checked `extends`, declaration merging. `type`: unions, tuples, function, mapped and conditional types. Be consistent.
- Prefer `unknown` to `any`; narrow before use; `catch` variables are `unknown`.
- Turn on `strict`, and strongly consider `noUncheckedIndexedAccess`.
- Annotation = "this *is* a T"; `as` = "trust me"; `satisfies` = "check it, but keep my type".
