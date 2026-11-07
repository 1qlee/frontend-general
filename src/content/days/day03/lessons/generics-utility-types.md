## Why interviewers ask this

"Explain generics" is one of the most common TypeScript interview questions, and the weak answer is "it's like `any`, but safer". Interviewers want to hear that generics **express relationships between types** — between a function's input and its output, a container and its contents, an object and its keys — and to see you use the standard toolbox (`keyof`, indexed access, utility types) instead of re-typing shapes by hand. Reading library types (`useState<S>`, `Record<K, V>`, `ComponentProps<'button'>`) relies on exactly the same skills.

## Generic functions: capture a relationship

```ts
function firstAny(items: any[]): any { return items[0]; }             // loses everything
function firstUnknown(items: unknown[]): unknown { return items[0]; }  // safe, but callers must cast
function first<T>(items: readonly T[]): T | undefined { return items[0]; }

const n = first([1, 2, 3]);       // number | undefined
const u = first([{ id: 'a' }]);   // { id: string } | undefined
```

`T` is a **type parameter**: a placeholder filled in at each call site. Here it ties the input's element type to the return type. TypeScript usually **infers** `T` from the arguments; pass it explicitly only when there's nothing to infer from, or when the inferred type would be too narrow:

```ts
const [user, setUser] = useState<User | null>(null); // from `null` alone it would infer `null`
const cache = new Map<string, Promise<User>>();      // an empty constructor gives nothing to infer
```

> [!TIP] The "appears twice" rule
> A type parameter should appear **at least twice** in a signature — that's what relates two things. In `function parse<T>(json: string): T`, `T` appears only in the return position: the caller picks any `T` and gets no checking. It's an `as` cast in disguise. Return `unknown` and validate instead.

Generics shine when one argument determines the type of another — or of the result:

```ts run
function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const users = [
  { id: 1, name: 'Ada', admin: true },
  { id: 2, name: 'Linus', admin: false },
];
const names = pluck(users, 'name');  // string[]
const flags = pluck(users, 'admin'); // boolean[]
console.log(names, flags);
// pluck(users, 'email');            // ❌ '"email"' is not assignable to '"name" | "id" | "admin"'
```

## Constraints with `extends`

An unconstrained `T` could be anything, so you can't *do* anything with it. A **constraint** states what `T` must at least be:

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest([1, 2], [1, 2, 3]); // number[] — the caller's type is preserved
longest('ab', 'abc');       // strings have a length too
longest(10, 20);            // ❌ Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
```

Why not `(a: { length: number }, b: { length: number })`? Because then the return type would be `{ length: number }` and the caller's real type would be lost. **A constraint bounds a type parameter without erasing it.**

The classic gotcha — `T` means "the caller's type", not "anything matching the constraint":

```ts
function minimumLength<T extends { length: number }>(obj: T, min: number): T {
  if (obj.length >= min) return obj;
  return { length: min };
  // ❌ '{ length: number; }' is assignable to the constraint of type 'T', but 'T' could be
  //    instantiated with a different subtype of constraint '{ length: number; }'.
}
```

If a caller passed a `string[]`, they'd get back `{ length: 3 }` typed as `string[]`. The compiler is right to refuse.

### `K extends keyof T`: the workhorse pattern

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

function setField<T, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return { ...obj, [key]: value };
}

setField(user, 'age', 37);   // ✅
setField(user, 'age', '37'); // ❌ Argument of type 'string' is not assignable to parameter of type 'number'.
```

`K extends keyof T` restricts the key to real keys of the object, and `T[K]` is the type of *that* property. You'll find this pattern in form libraries (`setValue(name, value)`), table components (`sortBy(column)`), and typed event emitters.

### Defaults and `const` type parameters

```ts
interface ApiResponse<T = unknown> { data: T; status: number }
type Raw = ApiResponse;       // ApiResponse<unknown> — the default fills in

// TS 5.0: a `const` type parameter infers as if the caller had written `as const`
function defineRoutes<const T extends readonly string[]>(routes: T): T {
  return routes;
}
const routes = defineRoutes(['home', 'settings']); // readonly ['home', 'settings'], not string[]
```

Type parameters with defaults must come after the required ones, just like function parameters.

### Generic types and generic components

Interfaces, type aliases and classes can be generic too — `Array<T>`, `Promise<T>`, `Map<K, V>`, last lesson's `RemoteData<T>`. In React the same idea gives you **generic components**, where the item type flows in from props:

```tsx
interface ListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>;
}

<List items={users} getKey={(u) => String(u.id)} renderItem={(u) => u.name} />; // u: User, inferred
```

Day 4 covers TypeScript in React in depth (props, events, refs, generic and polymorphic components).

## Type operators: `keyof`, `typeof`, indexed access

| Operator | Takes | Gives | Example |
|---|---|---|---|
| `keyof T` | a type | the union of its keys | `keyof { id: number; name: string }` → `'id' \| 'name'` |
| `typeof x` (type position) | a **value** | its type | `typeof config`, `ReturnType<typeof fetchUser>` |
| `T[K]` | a type and key(s) | the property type(s) | `User['address']`, `User['id' \| 'name']` |
| `T[number]` | an array/tuple type | the element type(s) | `(typeof ROLES)[number]` |
| `T[keyof T]` | an object type | the union of all value types | `(typeof Status)[keyof typeof Status]` |

Together they let you derive types from values, so there's a single source of truth:

```ts
const defaultSettings = { theme: 'light' as 'light' | 'dark', fontSize: 14, beta: false };
type Settings = typeof defaultSettings;   // { theme: 'light' | 'dark'; fontSize: number; beta: boolean }
type SettingKey = keyof Settings;         // 'theme' | 'fontSize' | 'beta'

const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];       // 'admin' | 'editor' | 'viewer'
```

`typeof` in a type position is TypeScript's **type query** — not JavaScript's runtime `typeof` operator, which returns a string like `'object'`. Same keyword, two different worlds.

`keyof` details worth knowing:

- `keyof` a type with a string index signature is `string | number` — because `obj[0]` and `obj['0']` are the same property.
- `PropertyKey` is the built-in alias for `string | number | symbol`: everything that can be an object key (`keyof any` is the same type). Use it as the constraint for "something usable as a key", as in today's `groupBy<T, K extends PropertyKey>`.

### Why `Object.keys` returns `string[]`

A question that shows whether you *really* understand structural typing:

```ts run
interface Point {
  x: number;
  y: number;
}

const point3d = { x: 1, y: 2, z: 3 };
const p: Point = point3d; // fine: structural typing allows extra properties

// If Object.keys(p) were typed ('x' | 'y')[], this loop would be lying:
for (const key of Object.keys(p)) {
  console.log(key);
}
```

A value of type `Point` can carry *more* keys than `keyof Point` at runtime, so `Object.keys` honestly returns `string[]`. If you built the object yourself and know it's exact, a local cast — `Object.keys(obj) as (keyof typeof obj)[]` — is a reasonable, explicit trade-off.

{{quiz:object-keys-string}}

## Readonly arrays and tuples

```ts
function sum(values: readonly number[]): number { // a promise: I won't mutate your array
  // values.push(1);  // ❌ Property 'push' does not exist on type 'readonly number[]'.
  return values.reduce((a, b) => a + b, 0);
}
sum([1, 2, 3]);          // ✅ mutable → readonly is fine
sum([1, 2, 3] as const); // ✅ a readonly tuple works too

const ids: readonly string[] = ['a'];
const copy: string[] = ids; // ❌ readonly → mutable is not allowed (you could push through `copy`)
```

- `readonly T[]` (same as `ReadonlyArray<T>`) removes the mutating methods. Mutable arrays are assignable to readonly ones, not the reverse — so **accept `readonly` arrays in parameters** and your function works with both normal arrays and `as const` data.
- **Tuples** are fixed-length arrays with a type per position: `[string, number]`, labelled `[name: string, age: number]`, optional `[x: number, y?: number]`, with a rest element `[head: string, ...rest: number[]]`. `useState` returns one: `[S, Dispatch<SetStateAction<S>>]`.
- `as const` on an array literal gives a readonly tuple of literal types.
- Like `as const`, `readonly` is shallow and compile-time only.

> [!TIP]
> Returning a pair from a custom hook? Write `return [value, toggle] as const`. Without it TypeScript infers an *array of a union* — `(boolean | (() => void))[]` — and the caller can't call `toggle` without narrowing it first.

## The built-in utility types

Know each one well enough to define it, use it and choose between them:

| Utility | Result | Reach for it when… |
|---|---|---|
| `Partial<T>` | every property optional | patch/update payloads, form drafts, overrides merged onto defaults |
| `Required<T>` | every property required | after defaults are applied: `Required<Options>` |
| `Readonly<T>` | every property `readonly` (shallow) | props/state you must not mutate, frozen config |
| `Pick<T, K>` | only the keys `K` | a slice of a model for one component: `Pick<User, 'name' \| 'avatarUrl'>` |
| `Omit<T, K>` | all keys except `K` | "X without Y": `Omit<User, 'password'>`, or replacing a prop when wrapping a component |
| `Record<K, V>` | keys `K`, values `V` | dictionaries; with a literal union as `K` it's **exhaustive** — `Record<Status, string>` must list every status |
| `Exclude<U, X>` | union members *not* assignable to `X` | removing options: `Exclude<Status, 'idle'>` |
| `Extract<U, X>` | union members assignable to `X` | selecting variants: `Extract<Action, { type: 'add' }>` |
| `NonNullable<T>` | `T` without `null \| undefined` | after a check, in assertion helpers |
| `ReturnType<F>` | a function type's return type | deriving from functions you don't own: `ReturnType<typeof setTimeout>` |
| `Parameters<F>` | a function type's parameters as a tuple | wrappers: `(...args: Parameters<typeof track>) => …` |
| `Awaited<T>` | the value inside a `Promise` (recursively) | `Awaited<ReturnType<typeof fetchUser>>` |
| `InstanceType<C>` | the instance type of a constructor type | factories and DI: `InstanceType<typeof Logger>` |

```ts
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return parseUser(await res.json()); // validate — today's exercise
}

type FetchUserResult = ReturnType<typeof fetchUser>; // Promise<User>
type FetchedUser = Awaited<FetchUserResult>;         // User
type FetchUserArgs = Parameters<typeof fetchUser>;   // [id: string]

const statusLabel: Record<'idle' | 'loading' | 'error', string> = {
  idle: 'Ready',
  loading: 'Loading…',
};
// ❌ Property 'error' is missing in type '{ idle: string; loading: string; }' but required in type
//    'Record<"error" | "idle" | "loading", string>'. — a Record over a literal union is exhaustive
```

The sharp edges that separate strong answers:

- **`Omit` doesn't check its keys.** It's declared `Omit<T, K extends keyof any>`, so `Omit<User, 'pasword'>` silently removes nothing. `Pick<User, 'pasword'>` is an error.
- **`Omit` and `Pick` aren't distributive.** `Omit<A | B, 'x'>` collapses the union to its *common* keys and breaks discriminated unions. Day 4 shows a distributive version.
- **`Record<string, V>` claims every key exists**: `dict['missing']` is typed `V`, not `V | undefined` (unless `noUncheckedIndexedAccess` is on). Use `Partial<Record<string, V>>` or a `Map` for sparse lookups.
- **`ReturnType` of an `async` function is a `Promise`** — wrap it in `Awaited`.
- TS 5.4 added **`NoInfer<T>`** to stop a parameter acting as an inference site — e.g. `createMachine<S extends string>(states: S[], initial: NoInfer<S>)` so a typo in `initial` is an error rather than a new state.

### A peek under the hood

You'll implement several of these today, so here's what they're made of: **mapped types** (iterate over keys) and **conditional types** (pick a type based on assignability). Day 4 teaches you to author them; for now, learn to read them:

```ts
type Partial<T> = { [P in keyof T]?: T[P] };          // mapped type over T's keys, adds `?`
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
type Exclude<T, U> = T extends U ? never : T;          // conditional type, applied per union member
type NonNullable<T> = T & {};                          // (TS 4.8+)
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
```

Read `{ [P in keyof T]?: T[P] }` as *"for each key `P` of `T`, an optional property `P` whose type is `T[P]`"*. Read `T extends U ? never : T` as *"if `T` is assignable to `U`, drop it, otherwise keep it"*. Because `T` is a *naked* type parameter, the condition is evaluated **once per union member** (it *distributes*), and the `never`s vanish from the resulting union — that's how `Exclude` filters.

## Overloads vs unions vs generics

Three ways to type a function that accepts different kinds of input. Decide by asking: **does the output type depend on the input type?**

**1. A union parameter** — when the result type doesn't depend on which member you pass:

```ts
function formatId(id: string | number): string {
  return String(id).padStart(6, '0');
}
```

**2. A generic** — when the output is tied to the input by a type relationship:

```ts
function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}
indexById(users); // Map<string, User> — whatever item type you pass comes back out
```

**3. Overloads** — when there's a fixed mapping from *specific* input types to *specific* output types:

```ts
function parseDate(value: string): Date;
function parseDate(value: null): null;
function parseDate(value: string | null): Date | null; // so callers holding the union can still call it
function parseDate(value: string | null): Date | null { // implementation signature: invisible to callers
  return value === null ? null : new Date(value);
}

const d = parseDate('2024-01-01'); // Date, not Date | null
```

Overload rules: callers only see the overload signatures, never the implementation signature, which must be compatible with all of them; overloads are tried top to bottom, so put the most specific first; and a caller holding a union can only call the set if one overload accepts that union (hence the third signature). The handbook's advice: **prefer a union parameter over overloads when the return type doesn't change**, and a generic when the output follows the input. Real APIs often combine them — `document.createElement` is an overload set whose first signature is generic over a tag-name map, which is how `createElement('canvas')` returns `HTMLCanvasElement`.

> [!INTERVIEW] Explaining generics
> "Generics let a function or type work with many types while preserving the relationship between them. `useState<T>` is the everyday example: the type of the initial state is the type you get back and the type the setter accepts. I add a constraint with `extends` when I need some capability of `T` — like `K extends keyof T`, so `getProperty(obj, key)` returns exactly `T[K]`. And I check each type parameter appears at least twice; if it only appears in the return type, it's a cast in disguise."

{{quiz:generic-cast-in-disguise}}

## Key takeaways

- Generics express **relationships** between types; inference fills them in from arguments. Pass type arguments explicitly only when there's nothing (or too little) to infer from.
- A type parameter that appears only once is a disguised cast.
- A constraint (`T extends X`) bounds a type parameter without erasing it; `K extends keyof T` + `T[K]` is the workhorse pattern.
- `keyof` (keys), `typeof` (value → type) and indexed access (`T[K]`, `T[number]`) derive types from a single source of truth.
- `Object.keys` returns `string[]` because a structurally typed value may have extra keys at runtime.
- Accept `readonly T[]` parameters; return hook tuples `as const`.
- Know the utility types *and* their sharp edges: `Omit` doesn't check keys and isn't distributive, `Record<string, V>` lies about missing keys, `ReturnType` of an async function needs `Awaited`.
- Union parameter when the output doesn't depend on the input; generic when it follows it; overloads for fixed input → output mappings.
