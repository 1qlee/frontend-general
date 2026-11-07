## Why interviewers ask this

Unions are where TypeScript earns its keep in UI code. Interviewers use them to test two things: whether you can **model state** so that whole classes of bugs become compile errors ("make impossible states impossible"), and whether you can **handle values of uncertain type** — API responses, events, errors — safely, without reaching for `as`. The vocabulary they listen for: *narrowing*, *control-flow analysis*, *discriminated (tagged) union*, *exhaustiveness checking*, *type predicate*, *assertion function*.

## Unions: you can only use what every member has

A value of type `A | B` is *one of* the members. Until TypeScript knows which, it only lets you do what's valid for **every** member:

```ts
function format(input: string | number) {
  input.toFixed(2);  // ❌ Property 'toFixed' does not exist on type 'string'.
  input.toString();  // ✅ exists on both
}
```

**Narrowing** is how you get from "one of several" to "this one": the compiler watches the checks you write and refines the type inside each branch. This is **control-flow analysis** — the same variable can have a different type on different lines.

## Narrowing techniques

| Technique | Example | What it narrows |
|---|---|---|
| `typeof` | `typeof x === 'string'` | primitives, `'function'`, `'object'` (which includes `null`!) |
| Truthiness | `if (x)` | removes `null`/`undefined` — and falsy literals like `''`, `0`, `false` |
| Equality | `x === null`, `x == null`, `a === b` | to the compared value; `== null` removes both `null` and `undefined` |
| `in` | `'email' in contact` | to members that have (or might have) the property |
| `instanceof` | `err instanceof HttpError` | class instances (`Date`, `Error`, `Map`, your classes) |
| `Array.isArray` | `Array.isArray(x)` | to array members (careful: on `unknown` you get `any[]`) |
| Discriminant check | `state.status === 'error'` | to the matching union member |
| Type predicate | `isUser(x)` | whatever the predicate declares |
| Assignment | `x = 'hi'` | to the assigned type, until the next assignment |

```ts run
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Input = string | number | Date | HttpError | { email: string } | null | undefined;

function describe(input: Input): string {
  if (input == null) return 'nothing';                            // null and undefined gone
  if (typeof input === 'string') return `string(${input.length})`;
  if (typeof input === 'number') return `number ${input.toFixed(1)}`;
  if (input instanceof HttpError) return `HTTP ${input.status}`;   // subclass before superclass
  if (input instanceof Date) return `date ${input.getUTCFullYear()}`;
  return `contact ${input.email}`;                                 // only { email } is left
}

const inputs: Input[] = ['hey', 3.14159, new Date(Date.UTC(2024, 0, 1)), new HttpError(404, 'Not found'), { email: 'a@b.co' }, null];
for (const input of inputs) console.log(describe(input));
```

### The `typeof null` trap

```ts
function count(items: string[] | null) {
  if (typeof items === 'object') {
    return items.length; // ❌ 'items' is possibly 'null'.
  }
  return 0;
}
```

`typeof null === 'object'` in JavaScript, and TypeScript models that faithfully: the branch still contains `null`. Check `items !== null` (or `Array.isArray(items)`) instead.

### The truthiness trap

Truthiness narrowing removes `null` and `undefined` — and every *falsy* value of the type with them. That's usually a runtime bug the compiler can't flag:

```ts run
function label(count?: number) {
  if (count) return `${count} items`; // 0 is falsy, so it falls through
  return 'no count provided';
}
console.log(label(3), '|', label(0), '|', label(undefined));
```

Use `count !== undefined` (or `count != null`) when `0`, `''` or `false` are valid values. The same trap in JSX — `{count && <Badge count={count} />}` renders a literal `0` — came up on Day 1.

> [!MISTAKE]
> Using `if (value)` as a null check for numbers or strings. TypeScript narrows `number | undefined` to `number` inside the branch, so it won't warn you that `0` took the wrong path. In the `else` branch the type is still `number | undefined`.

### `in` narrowing

`'prop' in obj` narrows a union to the members that declare `prop`. Since TS 4.9 it also works when *no* member declares it — `obj` becomes `obj & Record<'prop', unknown>` — which makes `in` the go-to tool for inspecting `unknown` objects.

```ts
type Contact = { email: string } | { phone: string };

function reach(c: Contact) {
  return 'email' in c ? `mailto:${c.email}` : `tel:${c.phone}`;
}
```

### What breaks narrowing

Control-flow analysis tracks each variable along each code path:

- **Reassignment** resets it — the variable gets the type of whatever was assigned.
- **Callbacks** might run later, after a reassignment. Narrowing is kept inside closures for `const` variables and for parameters that are never reassigned; since TS 5.4 it's also kept for `let` variables and parameters when the closure is created *after* the last assignment.
- **Property narrowing survives function calls.** After `if (user.address) { save(); user.address.city }` TypeScript still assumes `address` is set, even though `save()` could have cleared it. That's a deliberate trade-off — TypeScript isn't fully sound, by design.

Two version-specific details that show you're current:

- **Aliased conditions** (TS 4.4): `const isString = typeof x === 'string'; if (isString) x.toUpperCase();` narrows correctly.
- **Inferred type predicates** (TS 5.5): `[1, undefined, 2].filter((x) => x !== undefined)` is now `number[]`. Before 5.5 you had to write the predicate yourself: `.filter((x): x is number => x !== undefined)`.

## Discriminated unions: make impossible states impossible

Here's how a lot of React code models a request:

```ts
interface UserState {
  isLoading: boolean;
  error?: Error;
  data?: User;
}
```

Three independent fields give 2 × 2 × 2 = 8 combinations, and only about four make sense. What does `{ isLoading: true, error, data }` mean? Every consumer has to guess, and every component has to defend against nonsense.

A **discriminated union** (a.k.a. tagged union) lists the valid states explicitly. Every member has a common **discriminant** property with a *literal* type:

```ts
type RemoteData<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

Now `data` only exists when `status === 'success'`: you can't read it in any other state, and you can't construct a state that is both loading and failed. Checking the discriminant narrows the **whole object**:

```tsx
function UserPanel({ state }: { state: RemoteData<User> }) {
  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <Spinner />;
    case 'error':
      return <ErrorMessage error={state.error} />; // state: { status: 'error'; error: Error }
    case 'success':
      return <Profile user={state.data} />;        // state: { status: 'success'; data: User }
  }
}
```

The same pattern models reducer actions (`{ type: 'add'; item } | { type: 'remove'; id }`), modal state (`{ open: false } | { open: true; itemId: string }`), multi-step forms, WebSocket messages and API results (`{ ok: true; data: T } | { ok: false; error: string }` — boolean literals work as discriminants too). Since TS 4.6 narrowing also works if you destructure the discriminant and payload into `const`s first.

> [!INTERVIEW] Say it like this
> "I model UI state as a discriminated union — one member per state, each carrying only the data that state has, with a literal `status` field as the discriminant. Switching on `status` narrows the whole object, impossible combinations like 'loading with an error' can't even be constructed, and with an exhaustiveness check the compiler lists every place I need to update when I add a state."

## Exhaustiveness checking with `never`

When every member of a union has been handled, what's left is `never`. Use that to make the compiler enforce completeness:

```ts
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

type Action =
  | { type: 'added'; text: string }
  | { type: 'toggled'; id: number }
  | { type: 'cleared' };

function reducer(todos: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case 'added':
      return [...todos, { id: Date.now(), text: action.text, done: false }];
    case 'toggled':
      return todos.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
    case 'cleared':
      return todos.filter((t) => !t.done);
    default:
      return assertNever(action);
  }
}
```

Add `| { type: 'renamed'; id: number; text: string }` to `Action` and the `default` branch stops compiling:

```
Argument of type '{ type: "renamed"; id: number; text: string; }' is not assignable to parameter of type 'never'.
```

That's the real payoff — **refactoring safety**: the compiler points at every `switch` that needs the new case.

Other ways to get the same check:

- `default: action satisfies never;` (TS 4.9+) — compile-time only, no helper function.
- Lean on the return type: if a function annotated `: Todo[]` can fall off the end of the `switch`, TS reports *"Function lacks ending return statement and return type does not include 'undefined'."* It works, but the error is less direct and doesn't help in a `switch` that doesn't return.

`assertNever` also protects you at **runtime**. Types are erased, and a server can send a message type the client doesn't know yet:

```ts run
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; size: number };

function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.r ** 2;
    case 'square':
      return shape.size ** 2;
    default:
      return assertNever(shape);
  }
}

console.log(area({ kind: 'square', size: 3 }));

// Network data doesn't care about your types:
const fromServer = JSON.parse('{"kind":"triangle","base":2}') as Shape;
try {
  area(fromServer);
} catch (e) {
  console.log((e as Error).message);
}
```

{{quiz:exhaustive-new-member}}

## User-defined type guards: `value is T`

When narrowing takes more than one check, move it into a function whose return type is a **type predicate**:

```ts
interface User { id: number; name: string }

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'number' &&
    'name' in value && typeof value.name === 'string'
  );
}

const data: unknown = await res.json();
if (isUser(data)) {
  data.name; // data: User
}
```

- When the guard returns `false`, the `else` branch is narrowed too (a `Cat | Dog` checked with `isCat` is `Dog` in the `else`).
- Classic use: filtering — `items.filter((x): x is Item => x != null)`. Since 5.5 TypeScript infers simple predicates like this itself, but you still need explicit ones for anything more complex.
- **The compiler trusts you completely.** A predicate that says `true` for the wrong value is exactly as unsafe as an `as` cast — it's an assertion with a function body. Keep guards small and test them.

> [!WARNING]
> `function isUser(x: unknown): x is User { return true; }` compiles. A type predicate is a promise, not a proof. That's why many teams validate API data with a schema library (zod, valibot) that derives the type *from* the validator so the two can't drift apart — you'll build a mini version on Day 4.

{{quiz:type-predicate-trust}}

## Assertion functions: `asserts value is T`

An assertion function narrows by **throwing** instead of returning a boolean. After the call, the rest of the scope sees the narrowed type:

```ts
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertIsDefined<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value == null) throw new Error(`${name} is ${value}`);
}

const root = document.getElementById('root'); // HTMLElement | null
assertIsDefined(root, '#root');
root.append('ready');                         // root: HTMLElement
```

They're ideal for invariants — "this can't be null here, and if it is, fail loudly with a useful message" — instead of sprinkling `!` around. One gotcha: the function must be called through a name with an **explicit type**. An arrow function stored in an un-annotated `const` fails with *"Assertions require every name in the call target to be declared with an explicit type annotation."* Use a `function` declaration.

| | Returns | Narrows | Best for |
|---|---|---|---|
| Type predicate `value is T` | `boolean` | inside `if`, ternaries, `filter` | branching |
| Assertion function `asserts value is T` | nothing (throws on failure) | everything after the call | invariants, parsing, test helpers |

## Enums vs union literals

`enum` is one of the few TypeScript features that **emits runtime code**:

```ts run
enum Direction { Up, Down }
enum Status { Active = 'ACTIVE', Archived = 'ARCHIVED' }

console.log(Direction);               // numeric enums get a reverse mapping
console.log(Object.keys(Direction));  // so they have twice the keys you'd expect
console.log(Status);                  // string enums don't
```

Why many teams avoid them:

| Issue | Details |
|---|---|
| Not erasable | An enum is a runtime object, so it can't simply be stripped. Node's built-in TypeScript support (type stripping, on by default since Node 23.6) rejects enums, and TS 5.8's `--erasableSyntaxOnly` flag bans them. |
| Numeric enums are loose | Reverse mappings pollute `Object.keys`/`Object.values`, and any `number` value is assignable to a numeric enum type — only out-of-range *literals* are rejected (TS 5.0+). |
| String enums are nominal | `setStatus('ACTIVE')` is an error: callers must import `Status.Active`. That's out of step with the rest of TypeScript's structural world and awkward for values that arrive as JSON strings. |
| `const enum` | Meant to be inlined at compile time, but per-file transpilers (esbuild — which Vite uses — SWC, Babel) can't see values declared in other files, and with `isolatedModules` (which those tools require) ambient `const enum`s are an error. Most style guides ban them. |

The alternatives:

```ts
// 1. A union of string literals — zero runtime cost, works directly with JSON
type Status = 'active' | 'archived';

// 2. When you also need the values at runtime (iterate, render a <select>, validate):
const Status = { Active: 'active', Archived: 'archived' } as const;
type Status = (typeof Status)[keyof typeof Status]; // 'active' | 'archived'

setStatus('active');      // ✅ plain strings work
setStatus(Status.Active); // ✅ so does the named constant
Object.values(Status);    // ['active', 'archived'] — no reverse-mapping noise
```

(A value and a type can share a name — they live in separate namespaces — so `Status` works as both.)

> [!INTERVIEW] Would you use enums?
> "Generally no. I use string literal unions, plus an `as const` object when I need the values at runtime. They're erasable, structurally typed and work directly with JSON. If a codebase already uses string enums consistently I'd follow the convention, but I'd avoid numeric enums and `const enum` — reverse mappings, loose number assignability, and problems with isolatedModules-style transpilers."

## Key takeaways

- Narrowing = control-flow analysis refining a union per branch: `typeof`, truthiness, equality, `in`, `instanceof`, discriminants, predicates, assignment.
- Traps: `typeof null === 'object'`; truthiness drops `0`/`''`/`false`; reassignment and closures can reset narrowing; property narrowing optimistically survives calls.
- Model state as a **discriminated union** with a literal discriminant — impossible states become unrepresentable.
- `default: return assertNever(x)` turns "forgot a case" into a compile error *and* guards against unknown runtime data.
- Type predicates (`value is T`) and assertion functions (`asserts value is T`) are **trusted, not verified** — keep them small and tested.
- Prefer union literals (plus `as const` objects) to enums; avoid numeric enums and `const enum`.
