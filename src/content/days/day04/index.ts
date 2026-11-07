import type { Day, Exercise } from '../../types';

import typeLevel from './lessons/type-level-programming.md?raw';
import reactTs from './lessons/react-typescript.md?raw';
import boundaries from './lessons/types-at-the-boundaries.md?raw';

import deepReadonlyStarter from './exercises/type-deep-readonly/starter.ts?raw';
import deepReadonlySolution from './exercises/type-deep-readonly/solution.ts?raw';
import deepReadonlyTests from './exercises/type-deep-readonly/tests.ts?raw';
import templateStarter from './exercises/type-template-literals/starter.ts?raw';
import templateSolution from './exercises/type-template-literals/solution.ts?raw';
import templateTests from './exercises/type-template-literals/tests.ts?raw';
import handlersStarter from './exercises/type-event-handlers/starter.ts?raw';
import handlersSolution from './exercises/type-event-handlers/solution.ts?raw';
import handlersTests from './exercises/type-event-handlers/tests.ts?raw';
import unionToolsStarter from './exercises/type-union-tools/starter.ts?raw';
import unionToolsSolution from './exercises/type-union-tools/solution.ts?raw';
import unionToolsTests from './exercises/type-union-tools/tests.ts?raw';
import selectListStarter from './exercises/generic-select-list/starter.tsx?raw';
import selectListSolution from './exercises/generic-select-list/solution.tsx?raw';
import selectListTests from './exercises/generic-select-list/tests.tsx?raw';
import localStorageStarter from './exercises/use-local-storage/starter.tsx?raw';
import localStorageSolution from './exercises/use-local-storage/solution.tsx?raw';
import localStorageTests from './exercises/use-local-storage/tests.tsx?raw';
import schemaStarter from './exercises/mini-schema-validator/starter.ts?raw';
import schemaSolution from './exercises/mini-schema-validator/solution.ts?raw';
import schemaTests from './exercises/mini-schema-validator/tests.ts?raw';

// ---------------------------------------------------------------------------
// Type challenges
// ---------------------------------------------------------------------------

const typeDeepReadonly: Exercise = {
  id: 'type-deep-readonly',
  title: 'DeepReadonly<T> and Mutable<T>',
  runtime: 'types',
  difficulty: 'warm-up',
  estMinutes: 8,
  tags: ['mapped types', 'conditional types', 'recursion', 'modifiers'],
  prompt: `Implement two utility types.

**\`DeepReadonly<T>\`** makes a value immutable all the way down — the type you'd give a Redux state tree or a frozen config object:

\`\`\`ts
type Config = { api: { baseUrl: string }; features: string[]; onError: (e: Error) => void };
type Frozen = DeepReadonly<Config>;
// { readonly api: { readonly baseUrl: string };
//   readonly features: readonly string[];
//   readonly onError: (e: Error) => void }
\`\`\`

- Nested objects become readonly recursively; arrays become \`readonly\` arrays (tuples: readonly tuples).
- **Functions stay as they are** — mapping over a function's keys would erase its call signature.
- Primitives pass through; unions are handled member by member.

**\`Mutable<T>\`** removes \`readonly\` from \`T\`'s own properties (one level), keeping \`?\` as it is.

Don't use the built-in \`Readonly\`.

**What the interviewer is looking for:** a conditional type that checks functions *before* objects, a homomorphic mapped type, the \`-readonly\` modifier, and an explanation of why arrays "just work".`,
  starter: deepReadonlyStarter,
  solution: deepReadonlySolution,
  tests: deepReadonlyTests,
  hints: [
    'Start with the object case: `{ readonly [K in keyof T]: DeepReadonly<T[K]> }`. Then work out what should happen to non-objects.',
    'Order matters: functions are objects too (`(() => void) extends object` is true). Check `T extends (...args: any[]) => unknown` first and return `T` unchanged.',
    'For Mutable, the modifier syntax is `{ -readonly [K in keyof T]: T[K] }`.',
  ],
  explanation: `**Solution:**

\`\`\`ts
type DeepReadonly<T> = T extends (...args: any[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
\`\`\`

**Why arrays work without a special case:** \`{ readonly [K in keyof T]: … }\` is a *homomorphic* mapped type over a type parameter. When \`T\` is instantiated with an array or tuple, TypeScript maps the element type and keeps the array/tuple shape — adding \`readonly\` gives \`readonly X[]\`.

**Why unions work:** \`T\` is a naked type parameter in a conditional type, so \`DeepReadonly<A | B>\` distributes into \`DeepReadonly<A> | DeepReadonly<B>\`.

**Follow-ups:**
- *"What about \`Map\`, \`Set\` and \`Date\`?"* → Mapping over them keeps their method signatures (so \`map.set\` is still callable). A production version special-cases them: \`T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> : …\`.
- *"Is this enforced at runtime?"* → No. Pair it with \`Object.freeze\` (shallow) or a deep-freeze in development if you need runtime guarantees.
- *"Where would you use it?"* → Reducer state, configuration, props you must not mutate. It turns accidental mutation — the bug behind "React didn't re-render" — into a compile error.`,
};

const typeTemplateLiterals: Exercise = {
  id: 'type-template-literals',
  title: 'Trim<S> and CamelCaseKeys<T>',
  runtime: 'types',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['template literal types', 'infer', 'recursion', 'key remapping'],
  prompt: `Use template literal types, \`infer\` and recursion to manipulate strings at the type level.

\`\`\`ts
TrimLeft<'  hi '>              // 'hi '
Trim<'\\n  hello world \\t'>     // 'hello world'
CamelCase<'created_at_utc'>    // 'createdAtUtc'
CamelCaseKeys<{ user_id: number; first_name: string }>
// { userId: number; firstName: string }
\`\`\`

- Whitespace means \`' '\`, \`'\\n'\` and \`'\\t'\`.
- \`CamelCase\` converts **snake_case**; strings without \`_\` are unchanged.
- \`CamelCaseKeys\` renames the keys of an object type (one level deep), keeping value types and \`?\` modifiers.

This is the type you'd want after a snake_case API response has been converted by a \`camelcaseKeys()\` helper.

**What the interviewer is looking for:** \`infer\` inside a template literal pattern, recursion to repeat the operation, \`Capitalize\`, and key remapping with \`as\`.`,
  starter: templateStarter,
  solution: templateSolution,
  tests: templateTests,
  hints: [
    'A template literal pattern can match a prefix: `` S extends `${Whitespace}${infer Rest}` `` (with `type Whitespace = \' \' | \'\\n\' | \'\\t\'`). What do you do with `Rest`?',
    'Recurse until the pattern stops matching: `? TrimLeft<Rest> : S`. Trim = TrimLeft of a TrimRight (same idea with the whitespace at the end).',
    'CamelCase: `` S extends `${infer Head}_${infer Tail}` ? `${Head}${CamelCase<Capitalize<Tail>>}` : S ``. For the keys: `{ [K in keyof T as K extends string ? CamelCase<K> : K]: T[K] }`.',
  ],
  explanation: `**Solution:**

\`\`\`ts
type Whitespace = ' ' | '\\n' | '\\t';
type TrimLeft<S extends string> = S extends \`\${Whitespace}\${infer Rest}\` ? TrimLeft<Rest> : S;
type TrimRight<S extends string> = S extends \`\${infer Rest}\${Whitespace}\` ? TrimRight<Rest> : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;

type CamelCase<S extends string> = S extends \`\${infer Head}_\${infer Tail}\`
  ? \`\${Head}\${CamelCase<Capitalize<Tail>>}\`
  : S;
type CamelCaseKeys<T> = { [K in keyof T as K extends string ? CamelCase<K> : K]: T[K] };
\`\`\`

**How the matching works:** in \`\${infer Head}_\${infer Tail}\`, \`Head\` is inferred as the shortest possible prefix (up to the *first* underscore) and \`Tail\` gets the rest. A union in a template position (\`\${Whitespace}\`) matches any of its members.

**Why \`Trim<string>\` stays \`string\`:** \`string\` doesn't match the literal pattern, so the false branch returns it unchanged — no infinite recursion.

**Why \`?\` survives in CamelCaseKeys:** a mapped type over \`keyof T\` with an \`as\` clause is still homomorphic, so modifiers are preserved.

**Follow-ups:**
- *"Make it deep"* → recurse into values: \`T[K] extends object ? CamelCaseKeys<T[K]> : T[K]\`, with arrays handled separately.
- *"Is this safe?"* → Only if the runtime conversion matches. Types and the \`camelcaseKeys()\` function can drift — test the function, or derive both from one schema (lesson 3).
- *"Performance?"* → Each recursion step is a type instantiation; very long strings can hit the recursion limit. Fine for keys, not for parsing large text.`,
};

const typeEventHandlers: Exercise = {
  id: 'type-event-handlers',
  title: 'EventHandlers<E> and PickByValue<T, V>',
  runtime: 'types',
  difficulty: 'core',
  estMinutes: 8,
  tags: ['mapped types', 'key remapping', 'template literal types', 'react props'],
  prompt: `Generate component props from an events map — the pattern behind typed event emitters and media/player components.

\`\`\`ts
interface PlayerEvents {
  play: { at: number };
  volumeChange: number;
}
type PlayerHandlers = EventHandlers<PlayerEvents>;
// { onPlay?: (payload: { at: number }) => void;
//   onVolumeChange?: (payload: number) => void }
\`\`\`

**\`EventHandlers<E>\`**
- one **optional** prop per string key \`K\` of \`E\`, named \`on\${Capitalize<K>}\`
- its value is \`(payload: E[K]) => void\`
- symbol and number keys are dropped

**\`PickByValue<T, V>\`** keeps only the properties whose value type is assignable to \`V\`:

\`\`\`ts
PickByValue<{ id: number; name: string; age: number }, number> // { id: number; age: number }
\`\`\`

**What the interviewer is looking for:** key remapping with \`as\`, \`keyof T & string\`, and filtering keys by remapping them to \`never\`.`,
  starter: handlersStarter,
  solution: handlersSolution,
  tests: handlersTests,
  hints: [
    'Mapped types can rename keys: `{ [K in keyof E as NewName]: … }`. The new name can be a template literal type.',
    'A template literal can\'t contain a symbol, so iterate over `keyof E & string`. Add `?` after the key to make each handler optional.',
    'PickByValue: remap a key to `never` to drop it — `as T[K] extends V ? K : never`.',
  ],
  explanation: `**Solution:**

\`\`\`ts
type EventHandlers<E> = {
  [K in keyof E & string as \`on\${Capitalize<K>}\`]?: (payload: E[K]) => void;
};
type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
\`\`\`

**Why the handler is a function-typed property, not a method:** \`onPlay?: (payload) => void\` is checked *contravariantly* under \`strict\`, so a handler expecting a \`string\` payload is rejected (that's the second \`@ts-expect-error\` test). A method signature (\`onPlay?(payload): void\`) would be bivariant and let it through.

**Where you'd use this in an app:**
- A typed event emitter: \`emitter.on<K extends keyof E>(event: K, handler: (payload: E[K]) => void)\` and props derived from the same map, so adding an event updates both.
- Form libraries: \`onFieldChange\` handlers or \`errors\` objects derived from a form model.
- \`PickByValue<Settings, boolean>\` to type a group of toggles.

**Follow-ups:**
- *"Make handlers required for some events"* → split keys with two mapped types and intersect (or \`Merge\`).
- *"Implement the emitter's \`on\`/\`emit\` signatures"* → \`emit<K extends keyof E>(event: K, payload: E[K]): void\` — the generic \`K\` links the event name to its payload type.`,
};

const typeUnionTools: Exercise = {
  id: 'type-union-tools',
  title: 'TupleToUnion, Merge and UnionToIntersection',
  runtime: 'types',
  difficulty: 'stretch',
  estMinutes: 12,
  tags: ['indexed access', 'mapped types', 'infer', 'variance'],
  prompt: `Three utilities that show up both in codebases and in type-challenge interviews.

\`\`\`ts
const ROLES = ['admin', 'editor', 'viewer'] as const;
TupleToUnion<typeof ROLES>                                  // 'admin' | 'editor' | 'viewer'

Merge<{ a: string; b: number }, { b: string; c: boolean }>  // { a: string; b: string; c: boolean }

UnionToIntersection<{ a: 1 } | { b: 2 }>                    // { a: 1 } & { b: 2 }
\`\`\`

- **\`TupleToUnion<T>\`**: the union of the element types (\`never\` for an empty tuple).
- **\`Merge<A, B>\`**: like \`{ ...a, ...b }\` — \`B\` wins conflicts. The result must be **one flat object type**; \`A & B\` would give \`b: number & string\` (= \`never\`) and isn't what the tests expect.
- **\`UnionToIntersection<U>\`**: the famous one. Hint: function parameters are contravariant.

**What the interviewer is looking for:** indexed access with \`number\`, a mapped type over \`keyof A | keyof B\`, and — for the stretch — an explanation of *why* inferring from a contravariant position produces an intersection.`,
  starter: unionToolsStarter,
  solution: unionToolsSolution,
  tests: unionToolsTests,
  hints: [
    'TupleToUnion is one indexed access: what do you get when you index an array type with `number`?',
    'Merge: map over `K in keyof A | keyof B` and pick `B[K]` when `K extends keyof B`, else `A[K]`.',
    'UnionToIntersection: first distribute U into a union of functions `(arg: U) => void`, then match that union against `(arg: infer I) => void`. TypeScript must find one I that works for every member — the intersection.',
  ],
  explanation: `**Solutions:**

\`\`\`ts
type TupleToUnion<T extends readonly unknown[]> = T[number];

type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never;
};

type UnionToIntersection<U> =
  (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never;
\`\`\`

**UnionToIntersection, step by step:**
1. \`U extends unknown ? (arg: U) => void : never\` distributes: \`((arg: A) => void) | ((arg: B) => void)\`.
2. Matching that union against \`(arg: infer I) => void\` collects one candidate for \`I\` per member. Because \`I\` sits in a **parameter** (contravariant) position, TypeScript combines the candidates with an **intersection** — the only argument type that would be safe to pass to *every* function in the union.
3. For incompatible primitives (\`'a' & 'b'\`) the intersection is \`never\`.

**Where they're used:** \`TupleToUnion\` (usually written inline as \`(typeof ROLES)[number]\`) is everyday code — derive a union from a runtime array so they can't drift. \`Merge\` models spread/override semantics (default options merged with user overrides). \`UnionToIntersection\` appears in library code — combining plugin APIs, building overloads, and in tricks like \`IsUnion<T>\` or converting a union to a tuple.

**Follow-ups:**
- *"Why not \`Omit<A, keyof B> & B\`?"* → Semantically right, but it's an intersection — wrap it in a \`Simplify\` mapped type if you want a flat hover.
- *"Write \`IsUnion<T>\`"* → \`[T] extends [UnionToIntersection<T>] ? false : true\`.`,
};

// ---------------------------------------------------------------------------
// Typed React + runtime validation
// ---------------------------------------------------------------------------

const genericSelectList: Exercise = {
  id: 'generic-select-list',
  title: 'Generic <SelectList<T>> component',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 20,
  preview: true,
  tags: ['generic components', 'react', 'events', 'keys', 'accessibility'],
  prompt: `Build a **generic**, controlled single-select list. The point is the typing: callers pass any item type and get it back, fully typed, in \`renderItem\`, \`getKey\` and \`onSelect\`.

\`\`\`tsx
<SelectList
  label="Users"
  items={users}                         // User[]  → T = User (inferred)
  getKey={(u) => u.id}                  // u: User
  selectedKey={selected?.id ?? null}
  onSelect={setSelected}                // (user: User) => void
  renderItem={(u, { selected }) => (selected ? \`✓ \${u.name}\` : u.name)}
/>
\`\`\`

Requirements (the tests are the spec):
- Props are generic over \`T\` (the starter gives you \`SelectListProps<T>\`); \`items\` is \`readonly T[]\`.
- Render \`<ul role="listbox" aria-label={label}>\` with one \`<li role="option">\` per item.
- Use \`getKey(item)\` as the React \`key\` — **not** the index.
- \`aria-selected\` is \`"true"\` for the option whose key equals \`selectedKey\` (\`"false"\` otherwise), and \`renderItem\` receives \`{ selected }\`.
- Click, **Enter** or **Space** on a focused option calls \`onSelect(item)\` with the original item object. Options are focusable (\`tabIndex={0}\`). Prevent Space's default page scroll.
- With no items, render \`<p role="status">{emptyState}</p>\`, defaulting to \`"No items"\`.

**What the interviewer is looking for:** a generic function component (and knowing the \`<T,>\` arrow syntax), typed event handlers (\`React.KeyboardEvent<HTMLLIElement>\`), stable keys, and a component API typed in domain terms rather than DOM terms.`,
  starter: selectListStarter,
  solution: selectListSolution,
  tests: selectListTests,
  hints: [
    'Declare the component as `export function SelectList<T>({ items, getKey, … }: SelectListProps<T>)` — TypeScript infers T from `items` at each call site.',
    'Inside `items.map((item) => …)` compute `const key = getKey(item)` once and use it for both the `key` prop and `selected = key === selectedKey`.',
    'Keyboard: `onKeyDown={(e: KeyboardEvent<HTMLLIElement>) => { if (e.key === \'Enter\' || e.key === \' \') { e.preventDefault(); onSelect(item); } }}`. For the empty state, return early before rendering the `<ul>`.',
  ],
  explanation: `**Approach:** a function declaration \`function SelectList<T>(props: SelectListProps<T>)\` — TSX has no problem with generics on function declarations. For an arrow you'd need \`<T,>\`. \`T\` is inferred from \`items\`; \`getKey\`, \`renderItem\` and \`onSelect\` are then contextually typed, so callers never annotate.

**Why the key test matters:** with \`key={index}\`, prepending an item makes React reuse the first \`<li>\` for the *new* item — DOM nodes, focus, input state and animations attach to the wrong row. \`getKey\` keeps identity attached to the data. Accepting an accessor (rather than constraining \`T extends { id: string }\`) also lets the component handle primitives, as the last test shows.

**Typing choices worth saying out loud:**
- \`items: readonly T[]\` accepts both mutable arrays and \`as const\` tuples.
- \`getKey\` returns \`React.Key\` (\`string | number | bigint\`).
- \`onSelect(item: T)\` — a domain callback; consumers don't care that you used a \`<li>\`.
- \`renderItem\` returns \`ReactNode\`, so strings, elements and \`null\` are all fine.

**Accessibility note:** \`role="listbox"\`/\`"option"\` with \`aria-selected\` is the right semantics, but a complete listbox also needs arrow-key navigation with a roving \`tabIndex\` (only one option in the tab order) and \`aria-activedescendant\` or focus management. That's Day 9 — mention it, don't build it now.

**Follow-ups:**
- *"Make it multi-select"* → \`selectedKeys: ReadonlySet<Key>\` and \`onChange(items: T[])\`; or a discriminated prop \`mode: 'single' | 'multi'\` with different callback types.
- *"Wrap it in \`memo\`"* → \`memo(SelectList)\` loses the generic; cast: \`memo(SelectList) as typeof SelectList\`.
- *"Should the component own the selection state?"* → Controlled is more flexible; offer \`defaultSelectedKey\` for an uncontrolled mode (like \`value\`/\`defaultValue\`).`,
};

const useLocalStorageExercise: Exercise = {
  id: 'use-local-storage',
  title: 'Typed useLocalStorage<T> hook',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 15,
  preview: true,
  tags: ['custom hooks', 'generics', 'react', 'json', 'error handling'],
  prompt: `Write \`useLocalStorage<T>\`: \`useState\` that survives a reload — typed like \`useState\` and robust against everything storage can throw at you.

\`\`\`tsx
const isTheme = (v: unknown): v is 'light' | 'dark' => v === 'light' || v === 'dark';
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light', { validate: isTheme });
setTheme((t) => (t === 'light' ? 'dark' : 'light'));
\`\`\`

Requirements:
- Signature: \`useLocalStorage<T>(key, initialValue: T | (() => T), options?) => readonly [T, Dispatch<SetStateAction<T>>]\`.
- **First render only:** read \`key\`, \`JSON.parse\` it, and use it if it parses and passes \`options.validate\` (a type guard). Otherwise use \`initialValue\` — which may be a lazy function: call it at most once, and not at all if storage had a value.
- \`setValue\` accepts a value **or an updater function** with exactly \`useState\`'s semantics (two functional updates in one handler both apply).
- Persist every value as JSON.
- **Never crash because of storage:** corrupted JSON, \`getItem\`/\`setItem\` throwing (\`SecurityError\`, \`QuotaExceededError\`) or \`storage: null\` all degrade to in-memory state.
- \`options.storage\` defaults to \`window.localStorage\`; the tests inject an in-memory fake (dependency injection = testable).

**What the interviewer is looking for:** \`unknown\` + a type guard instead of casting parsed JSON, the lazy \`useState\` initializer, delegating functional updates to React instead of closing over stale state, \`as const\` on the returned tuple, and defensive storage access.`,
  starter: localStorageStarter,
  solution: localStorageSolution,
  tests: localStorageTests,
  hints: [
    'Use the lazy form `useState<T>(() => …)` so storage is read once. Inside: try { getItem → JSON.parse → validate } catch { fall back }.',
    'Don\'t write your own updater logic around a captured `value` — return React\'s own `setValue` and persist in a `useEffect` that depends on `[storage, key, value]`, wrapped in try/catch.',
    'Return `[value, setValue] as const`. To call a lazy initial value: `typeof initialValue === \'function\' ? (initialValue as () => T)() : initialValue`.',
  ],
  explanation: `**Approach:**
1. \`useState<T>(() => read() ?? initial)\` — the lazy initializer runs only on mount, so we don't hit storage (or call an expensive \`initialValue()\`) every render.
2. Parsed JSON is \`unknown\`; \`validate\` is a **type guard** (\`(v: unknown) => v is T\`), so a valid value is narrowed to \`T\` without a cast. Without a validator we must trust the stored shape — that's the one deliberate cast, and it's why \`validate\` exists.
3. Return React's own setter: functional updates and batching come for free. The naive \`setValue(fn(value))\` closes over a stale \`value\` and loses one of two queued updates.
4. Persist in an effect after commit, swallowing storage errors — persistence is an enhancement; the UI must keep working in private mode or when the quota is full.
5. \`as const\` makes the return \`readonly [T, Dispatch<SetStateAction<T>>]\` instead of an array of unions.

**Trade-offs and follow-ups:**
- *"Two components use the same key — do they stay in sync?"* → No. Subscribe to the \`storage\` event (fires in *other* tabs) plus a custom in-tab event, ideally via \`useSyncExternalStore\` with \`getItem\` as the snapshot (cache the parsed value so the snapshot is stable).
- *"What if \`key\` changes?"* → This version keeps the old state. Re-read when the key changes (store the key alongside the value in state, or reset with a \`key\` on the component).
- *"SSR?"* → \`window\` doesn't exist on the server, and reading storage during the first client render causes a hydration mismatch. Render the initial value first and read storage in an effect, or use \`useSyncExternalStore\` with a \`getServerSnapshot\`.
- *"Why not \`T extends Json\`?"* → \`JSON.stringify\` silently drops functions and turns \`Date\` into strings. A \`Json\` constraint on \`T\` (or a serialize/deserialize option) makes that explicit.`,
};

const miniSchemaValidator: Exercise = {
  id: 'mini-schema-validator',
  title: 'Mini schema validator with inferred types (zod-lite)',
  runtime: 'logic',
  difficulty: 'stretch',
  estMinutes: 25,
  tags: ['runtime validation', 'generics', 'infer', 'mapped types', 'error handling'],
  prompt: `Build a tiny zod: schemas that validate \`unknown\` data at runtime **and** produce static types.

\`\`\`ts
const User = s.object({
  name: s.string(),
  nickname: s.string().optional(),
  tags: s.array(s.string()),
});
type User = Infer<typeof User>;  // { name: string; tags: string[]; nickname?: string | undefined }

const user = User.parse(await res.json());   // unknown in → User out, or a ValidationError
const result = User.safeParse(input);        // { success: true; data } | { success: false; error }
\`\`\`

**Runtime** (the tests):
- \`s.string()\`, \`s.number()\` (rejects \`NaN\`), \`s.boolean()\`. Error: \`"expected number, received string"\` — "received" is \`typeof\`, except \`'null'\`, \`'array'\` and \`'NaN'\`.
- \`s.array(item)\` validates every element; \`s.object(shape)\` requires a non-null, non-array object and returns a **new** object with only the shape's keys (unknown keys stripped).
- \`.optional()\` returns a **new** schema that also accepts \`undefined\`; missing optional keys are omitted from the output.
- Errors are \`ValidationError\`s with a \`path\` like \`['users', 1, 'email']\` and the message \`"users[1].email: expected string, received number"\` (no prefix at the root). Implement \`formatPath\` too.
- \`parse\` throws; \`safeParse\` returns a discriminated union and only rethrows non-validation errors.

**Types** (checked by the type checker panel, not the tests): \`Infer<S>\` extracts the output type; \`s.object\` makes keys whose schema accepts \`undefined\` optional (\`key?:\`).

**What the interviewer is looking for:** "parse, don't validate", recursion with an accumulated path, a discriminated-union result type, and — for the type part — \`infer\` plus mapped types that split required and optional keys.`,
  starter: schemaStarter,
  solution: schemaSolution,
  tests: schemaTests,
  hints: [
    'Write one factory, `createSchema<T>(check: (input: unknown, path: PathSegment[]) => T): Schema<T>`, that builds `parse`, `safeParse` and `optional` around a single `check` function. Every builder just supplies its own `check`.',
    'Containers pass an extended path down: `item._parse(element, [...path, i])` for arrays and `shape[key]._parse(value, [...path, key])` for objects. Errors thrown deep inside then carry the full path.',
    'Types: `type Infer<S> = S extends Schema<infer T> ? T : never`. Optional keys: `{ [K in keyof S]: undefined extends Infer<S[K]> ? K : never }[keyof S]`; build `{ [K in Required]: … } & { [K in Optional]?: … }` and flatten with a mapped type.',
  ],
  explanation: `**Design:** every schema is an object with an internal \`_parse(input, path)\`; \`parse\`, \`safeParse\` and \`optional\` are derived from it in one \`createSchema\` factory. Containers recurse with an extended path, so a failure deep in the tree throws a \`ValidationError\` that already knows where it happened.

**Key implementation details:**
- \`describeType(value)\` must special-case \`null\` and arrays — \`typeof\` says \`'object'\` for both.
- \`Object.hasOwn(record, key)\` instead of \`record[key]\`, so a key like \`toString\` isn't "found" on the prototype.
- \`safeParse\` catches only \`ValidationError\` — swallowing every error would hide real bugs.
- \`.optional()\` returns a *new* schema; schemas are immutable values that can be shared and composed.

**The types:**

\`\`\`ts
type Infer<S> = S extends Schema<infer T> ? T : never;
type OptionalKeys<S extends Shape> = { [K in keyof S]: undefined extends Infer<S[K]> ? K : never }[keyof S];
type ObjectOutput<S extends Shape> = Simplify<
  { [K in Exclude<keyof S, OptionalKeys<S>>]: Infer<S[K]> } & { [K in OptionalKeys<S>]?: Infer<S[K]> }
>;
\`\`\`

\`undefined extends Infer<S[K]>\` asks "does this schema accept undefined?" — that's how zod decides which keys become \`?:\`. \`Simplify\` (\`{ [K in keyof T]: T[K] } & {}\`) flattens the intersection so hovers show one clean object.

**Follow-ups:**
- *"Collect all errors, not just the first"* → accumulate issues in an array passed through the recursion; throw once at the end (zod's \`issues\`).
- *"Add \`.transform()\` and \`.refine()\`"* → a schema whose output type differs from its input type: \`Schema<In, Out>\`. That's how \`z.coerce.date()\` turns ISO strings into \`Date\`s.
- *"Unions?"* → \`s.union([a, b])\` tries each member; for discriminated unions, check the discriminant first for better errors and speed.
- *"Why not just use zod?"* → In production, do. Building it shows you understand what \`z.infer\` is doing and why the runtime schema is the single source of truth.`,
};

// ---------------------------------------------------------------------------
// Day
// ---------------------------------------------------------------------------

const day: Day = {
  number: 4,
  title: 'TypeScript II: Advanced Types & TypeScript in React',
  tagline: 'Conditional, mapped and template literal types — then typing real components, hooks and API boundaries.',
  summary:
    'Senior TypeScript interviews go beyond annotations: can you explain how `Partial` or `z.infer` work, type a generic `<List<T>>`, make context non-nullable, and say what protects you when the API sends something unexpected? Today you learn type-level programming (conditional types, `infer`, mapped and template literal types, variance, brands), the React 19 typing patterns you will write in every live-coding round, and how to type the boundaries of an app where TypeScript can\'t see. Then you implement the utilities, a generic component, a typed hook and a mini schema validator.',
  objectives: [
    'Explain conditional types, distribution over unions, `infer` and mapped-type modifiers precisely',
    'Implement built-in utilities (`Pick`, `Omit`, `Exclude`, `ReturnType`) and DeepReadonly from memory',
    'Use template literal types and key remapping to derive types from other types',
    'Explain method vs function-property bivariance and when branded types are worth it',
    'Type props, children, events, refs, reducers and context in React 19 without `any`',
    'Write generic and discriminated-union components, and know the trade-offs of polymorphic `as` props',
    'Validate untyped data at the boundary ("parse, don\'t validate") and configure tsconfig for a React app',
  ],
  skills: ['typescript', 'react', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'review',
      title: 'Warm-up: spaced repetition',
      minutes: 15,
      intro: 'Cards from Days 1–3 — especially narrowing, discriminated unions and generics, which today builds on. Say each answer out loud before flipping.',
    },
    {
      kind: 'lesson',
      id: 'type-level-programming',
      title: 'Type-level programming: conditional, mapped & template literal types',
      minutes: 40,
      body: typeLevel,
      checks: [
        {
          id: 'l1-distribution',
          prompt: 'What are `A` and `B`?',
          code: `type Kind<T> = T extends string ? 'text' : 'other';\n\ntype A = Kind<string | number>;\ntype B = Kind<never>;`,
          codeLang: 'ts',
          choices: [
            "A = 'text' | 'other', B = never",
            "A = 'other', B = 'other'",
            "A = 'text' | 'other', B = 'other'",
            "A = 'other', B = never",
          ],
          answer: 0,
          explanation:
            "`T` is a naked type parameter, so the conditional **distributes**: `Kind<string> | Kind<number>` = `'text' | 'other'`. If it didn't distribute, `string | number` isn't assignable to `string` and you'd get just `'other'`. `never` is the empty union, so distributing over it produces no members at all — `never`, not `'other'`. Use `[T] extends [string]` to opt out of distribution (and to write a working `IsNever`).",
        },
        {
          id: 'l1-bivariance',
          prompt: 'Under `strict`, which assignment is a compile error?',
          code: `type Animal = { name: string };\ntype Dog = Animal & { bark(): void };\n\ninterface WithMethod { handle(a: Animal): void }\ninterface WithProp { handle: (a: Animal) => void }\n\nconst dogOnly = (d: Dog) => d.bark();\n\nconst x: WithMethod = { handle: dogOnly }; // (1)\nconst y: WithProp = { handle: dogOnly };   // (2)`,
          codeLang: 'ts',
          choices: ['Only (1)', 'Only (2)', 'Both', 'Neither'],
          answer: 1,
          explanation:
            '`strictFunctionTypes` checks parameters of **function-typed properties** contravariantly: a handler that needs a `Dog` can\'t accept every `Animal`, so (2) errors. Parameters of **methods** (`handle(a: Animal): void`) are deliberately kept bivariant for compatibility (e.g. array methods), so (1) compiles — and would crash if called with a non-dog. Declare callbacks as properties to get the strict check.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'react-typescript',
      title: 'TypeScript with React 19: props, events, refs, reducers, context & generics',
      minutes: 45,
      body: reactTs,
      checks: [
        {
          id: 'l2-children',
          prompt: '`Card` declares `children: React.ReactElement`. Which usage is a type error?',
          choices: [
            '<Card><p>Hi</p></Card>',
            '<Card>Hello</Card>',
            '<Card><Avatar /></Card>',
            '<Card>{isAdmin ? <AdminBadge /> : <UserBadge />}</Card>',
          ],
          answer: 1,
          explanation:
            '`ReactElement` is the **object** produced by JSX, so a plain string child isn\'t one. Elements and conditionals that always yield elements are fine. If the component should accept text, numbers, `null` or arrays, type `children` as `React.ReactNode` — the right default for `children`.',
        },
        {
          id: 'l2-use-ref',
          prompt: 'With React 19\'s types, what is the type of `inputRef`?',
          code: `const inputRef = useRef<HTMLInputElement>(null);`,
          codeLang: 'tsx',
          choices: [
            'RefObject<HTMLInputElement | null>',
            'MutableRefObject<HTMLInputElement>',
            'RefObject<HTMLInputElement> with a readonly `current`',
            'HTMLInputElement | null',
          ],
          answer: 0,
          explanation:
            'React 19\'s types have a `useRef<T>(initialValue: T | null): RefObject<T | null>` overload, and `RefObject.current` is now always mutable (`MutableRefObject` is deprecated). In React 18 the same call returned a `RefObject<HTMLInputElement>` with a readonly `current` — that\'s the outdated answer. `useRef` also now requires an argument.',
        },
        {
          id: 'l2-generic-arrow',
          prompt: 'In a `.tsx` file, which generic **arrow** component parses correctly?',
          choices: [
            'const List = <T>(props: ListProps<T>) => <ul />;',
            'const List = <T,>(props: ListProps<T>) => <ul />;',
            'const List<T> = (props: ListProps<T>) => <ul />;',
            'const List = (props: ListProps<T>) => <ul />;',
          ],
          answer: 1,
          explanation:
            'In TSX, `<T>` at the start of an arrow function is parsed as a JSX opening tag. The trailing comma (`<T,>`) or a constraint (`<T extends unknown>`) disambiguates it. Variables can\'t have type parameters (option 3), and option 4 references an undeclared `T`. Function declarations (`function List<T>(…)`) don\'t have this problem.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'types-at-the-boundaries',
      title: 'Types at the boundaries: unknown data, validation, declarations & tsconfig',
      minutes: 30,
      body: boundaries,
      checks: [
        {
          id: 'l3-json-any',
          prompt: 'Under `strict`, what happens here?',
          code: `interface User { id: string; joinedAt: Date }\n\nconst res = await fetch('/api/me');\nconst user: User = await res.json();\nconsole.log(user.joinedAt.getFullYear());`,
          codeLang: 'ts',
          choices: [
            'Compile error: Promise<any> is not assignable to User',
            'Compiles — `json()` returns `Promise<any>`, so nothing checks the shape, and `joinedAt` will be a string at runtime',
            'Compiles, and TypeScript inserts a runtime check that throws if the shape is wrong',
            'Compiles, and `joinedAt` is automatically converted to a Date because of the annotation',
          ],
          answer: 1,
          explanation:
            '`Response.json()` is typed `Promise<any>`, and `any` is assignable to everything, so the annotation is an unchecked assumption. TypeScript never emits runtime checks or conversions — types are erased. JSON has no Date type, so `joinedAt` is an ISO string and `getFullYear()` throws. Treat the body as `unknown` and parse it.',
        },
        {
          id: 'l3-verbatim',
          prompt: '`./api` exports `interface User` and `function fetchUser()`. With `verbatimModuleSyntax: true`, which import is correct for code that uses both?',
          choices: [
            "import { User, fetchUser } from './api';",
            "import { type User, fetchUser } from './api';",
            "import type { User, fetchUser } from './api';",
            'Any of them — the flag only affects emit, not type checking',
          ],
          answer: 1,
          explanation:
            "Under `verbatimModuleSyntax`, imports are emitted exactly as written, so a type that's imported without `type` is an error (TS1484: \"'User' is a type and must be imported using a type-only import\"). `import type { … }` makes *everything* type-only, so calling `fetchUser()` fails. The inline `type` modifier keeps the value import and erases the type import.",
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'quiz',
      title: 'Quiz: what type is it, does it compile?',
      minutes: 15,
      intro: 'Commit to an answer before revealing. For type questions, paste the code into the TypeScript playground afterwards and hover — building the habit of checking is half the value.',
      questions: [
        {
          id: 'ts-distribution-wrap',
          prompt: 'What are `A` and `B`?',
          code: `type ToArray<T> = T extends unknown ? T[] : never;\ntype ToArrayOnce<T> = [T] extends [unknown] ? T[] : never;\n\ntype A = ToArray<string | number>;\ntype B = ToArrayOnce<string | number>;`,
          codeLang: 'ts',
          choices: [
            'A = (string | number)[], B = (string | number)[]',
            'A = string[] | number[], B = (string | number)[]',
            'A = string[] | number[], B = string[] | number[]',
            'A = (string | number)[], B = string[] | number[]',
          ],
          answer: 1,
          explanation:
            '`ToArray` checks a **naked** type parameter, so it distributes: `string[] | number[]`. Wrapping both sides in a tuple (`[T] extends [unknown]`) means the checked type is no longer a naked parameter, so the union is treated as a whole: `(string | number)[]`. Which one you want depends on the use — e.g. `string[] | number[]` forbids mixed arrays.',
        },
        {
          id: 'ts-infer-unwrap',
          prompt: 'What is `X`?',
          code: `type Unwrap<T> = T extends Promise<infer U> ? U : T;\ntype X = Unwrap<Promise<Promise<number>>>;`,
          codeLang: 'ts',
          choices: ['number', 'Promise<number>', 'Promise<Promise<number>>', 'never'],
          answer: 1,
          explanation:
            '`infer U` captures what is inside the **outer** promise — `Promise<number>` — and `Unwrap` doesn\'t recurse. The built-in `Awaited<T>` is recursive (and handles any thenable), which is why `Awaited<Promise<Promise<number>>>` is `number` — mirroring how `await` flattens nested promises at runtime.',
        },
        {
          id: 'ts-template-cross-product',
          prompt: 'How many members does `ClassName` have?',
          code: "type Size = 'sm' | 'md' | 'lg';\ntype Tone = 'red' | 'blue';\ntype ClassName = `${Size}-${Tone}`;",
          codeLang: 'ts',
          choices: ['2', '5', '6', 'It is just `string`'],
          answer: 2,
          explanation:
            "Template literal types distribute over each union in the template and form the **cross product**: 3 sizes × 2 tones = 6 literal members (`'sm-red' | 'sm-blue' | …`). It only widens to `string` if a placeholder is `string` itself. Beware: several large unions multiply quickly and TypeScript caps unions at 100,000 members.",
        },
        {
          id: 'ts-key-remap-filter',
          prompt: 'What is `D`?',
          code: `type DataOnly<T> = {\n  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];\n};\n\ninterface Counter {\n  count: number;\n  label: string;\n  increment(): void;\n  reset: () => void;\n}\ntype D = DataOnly<Counter>;`,
          codeLang: 'ts',
          choices: [
            '{ count: number; label: string }',
            '{ count: number; label: string; reset: () => void }',
            '{ count: number; label: string; increment(): void; reset: () => void }',
            '{}',
          ],
          answer: 0,
          explanation:
            'Remapping a key to `never` with `as` removes it. Both `increment` (a method) and `reset` (a function-typed property) have function types, so both are filtered out. Methods and function properties differ in variance checking, not in what `T[K]` is.',
        },
        {
          id: 'ts-required-strips-undefined',
          prompt: 'With default `strict` settings (no `exactOptionalPropertyTypes`), what is `R`?',
          code: `type R = Required<{ a?: string | undefined }>;`,
          codeLang: 'ts',
          choices: ['{ a: string | undefined }', '{ a: string }', '{ a?: string }', 'A compile error'],
          answer: 1,
          explanation:
            '`Required` is `{ [K in keyof T]-?: T[K] }`, and the `-?` modifier removes both the optionality **and** `undefined` from the property type. With `exactOptionalPropertyTypes` enabled, TypeScript distinguishes "missing" from "explicitly undefined", and the explicitly written `undefined` would survive.',
        },
        {
          id: 'ts-omit-union',
          prompt: 'What is `keyof NoId`?',
          code: `type Shape =\n  | { kind: 'circle'; radius: number; id: string }\n  | { kind: 'square'; side: number; id: string };\n\ntype NoId = Omit<Shape, 'id'>;`,
          codeLang: 'ts',
          choices: ["'kind' | 'radius' | 'side'", "'kind'", "'kind' | 'id'", 'never'],
          answer: 1,
          explanation:
            "`Omit<T, K>` is `Pick<T, Exclude<keyof T, K>>`, and `keyof (A | B)` is only the keys **common to every member**: `'kind' | 'id'`. Remove `'id'` and you're left with `{ kind: 'circle' | 'square' }` — the variant-specific props are gone. Use a distributive version: `T extends unknown ? Omit<T, K> : never`. This bites when wrapping components with union props.",
        },
        {
          id: 'ts-branded-assignability',
          prompt: 'Given `type UserId = string & { readonly __brand: \'UserId\' }`, which statement is true?',
          choices: [
            "`const id: UserId = 'usr_1'` compiles, because a UserId is a string",
            'A `UserId` can be passed where a `string` is expected, but a plain `string` can\'t be passed where a `UserId` is expected',
            'The brand adds a `__brand` property to the string at runtime',
            '`UserId` and `OrderId` brands over `string` are interchangeable because TypeScript is structural',
          ],
          answer: 1,
          explanation:
            'An intersection is a subtype of each part, so `UserId` is assignable to `string`; but a plain `string` lacks the phantom `__brand` property, so it isn\'t assignable to `UserId` — you need a (validating) constructor that casts once. The brand exists only in the type system. Different brand literals (`\'UserId\'` vs `\'OrderId\'`) make the types structurally different, which is the whole point.',
        },
        {
          id: 'ts-usestate-empty-array',
          prompt: 'Under `strict`, what happens?',
          code: `const [tags, setTags] = useState([]);\nsetTags(['react']);`,
          codeLang: 'tsx',
          choices: [
            'Compiles: `tags` is `any[]`',
            "Compile error: `tags` is `never[]`, so 'string' is not assignable to 'never'",
            'Compiles: `tags` is `string[]`, inferred from the later call',
            'Compiles: `tags` is `unknown[]`',
          ],
          answer: 1,
          explanation:
            'TypeScript infers state from the **initial value** only, and an empty array literal with no context becomes `never[]` under `strict`. It never looks at later calls. Fix it with an explicit type argument: `useState<string[]>([])`. Avoid `any[]` — it silences every future mistake.',
        },
        {
          id: 'ts-extend-native-conflict',
          prompt: 'Does this compile?',
          code: `import type { ComponentProps } from 'react';\n\ninterface InputProps extends ComponentProps<'input'> {\n  onChange: (value: string) => void;\n}`,
          codeLang: 'tsx',
          choices: [
            'Yes — your onChange overrides the native one',
            "No — 'InputProps' incorrectly extends the native props because the onChange types are incompatible; Omit 'onChange' first",
            'Yes, but only with `type` instead of `interface`',
            'No — you can never add props to ComponentProps',
          ],
          answer: 1,
          explanation:
            'An `extends` clause requires the new member to be **assignable** to the inherited one, and `(value: string) => void` isn\'t a `ChangeEventHandler<HTMLInputElement>`. Use `extends Omit<ComponentProps<\'input\'>, \'onChange\'>`. With a type intersection (`&`) it would "compile" but produce an `onChange` that must satisfy both signatures — worse. Also: if you forward `...rest` to `<input>`, make sure your own `onChange` isn\'t spread onto it.',
        },
        {
          id: 'ts-context-null-default',
          prompt: '`const ThemeContext = createContext<Theme | null>(null)`. What is the best way to give consumers a non-nullable `Theme`?',
          choices: [
            'Use `useContext(ThemeContext)!` with a non-null assertion in every consumer',
            'Change it to `createContext({} as Theme)`',
            'Export a `useTheme()` hook that reads the context, throws a descriptive error if it is `null`, and returns the narrowed `Theme`',
            'Make every consumer handle `null` with optional chaining',
          ],
          answer: 2,
          explanation:
            'A custom hook narrows once, in one place, and turns "rendered outside the provider" into a clear error at the first render. `!` and `{} as Theme` are unchecked lies — the failure happens later as `undefined is not a function`. Optional chaining everywhere spreads defensive noise for a case that is really a programming error.',
        },
        {
          id: 'ts-ref-react-19',
          prompt: 'In React 19, how should a function component `TextField` let parents attach a ref to its inner `<input>`?',
          choices: [
            'Wrap it in `forwardRef` — function components never receive `ref`',
            'Accept `ref` as a regular prop (e.g. via `ComponentProps<\'input\'>`) and pass it to the `<input>`',
            'Use `useImperativeHandle` — it is required for any ref on a function component',
            'Use a prop with a different name such as `inputRef`, because `ref` is reserved',
          ],
          answer: 1,
          explanation:
            'React 19 passes `ref` to function components as a normal prop, so `function TextField({ ref, ...props }: ComponentProps<\'input\'>)` works and keeps generics intact. `forwardRef` still works but is no longer needed and is slated for deprecation. `useImperativeHandle` is only for exposing a custom handle instead of the DOM node. A custom name like `inputRef` works but is unnecessary now.',
        },
        {
          id: 'ts-vite-no-typecheck',
          prompt: 'A component now has a type error (`const n: number = "1"`). The package script is just `"build": "vite build"`. What happens when you run it?',
          choices: [
            'The build fails with the TypeScript error',
            'The build succeeds — Vite transpiles with esbuild, which strips types without checking them',
            'The build succeeds but Vite prints the type error as a warning',
            'The dev server refuses to start, but the production build succeeds',
          ],
          answer: 1,
          explanation:
            'Vite (and esbuild/SWC in general) **transpiles file by file and never type-checks** — that is why it is fast, and why `isolatedModules` exists. Type errors only fail the build if a step runs the compiler, which is why the official template uses `"build": "tsc -b && vite build"`. Run `tsc --noEmit`/`tsc -b` in CI too; the editor alone is not a gate. (Plugins such as `vite-plugin-checker` can surface type errors in the dev overlay.)',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'type-level-challenges',
      title: 'Type challenges',
      minutes: 25,
      intro:
        "Type-level reps. Do the warm-up and the two core challenges; the stretch (`UnionToIntersection`) is optional. Before you type, **explain your plan out loud** in one sentence (\"a mapped type over keyof T with an `as` clause that…\") — that sentence is what interviewers grade. Hover your types to see what they evaluate to.",
      exercises: [typeDeepReadonly, typeTemplateLiterals, typeEventHandlers, typeUnionTools],
    },
    {
      kind: 'exercise',
      id: 'typed-react-and-validation',
      title: 'Typed React & runtime validation',
      minutes: 35,
      intro:
        'Interview conditions: timer on, talk out loud, no AI. Build the generic `SelectList` first (≈20 min), then the `useLocalStorage` hook. The schema validator is a stretch — attempt it if you finish early or come back to it on a review day. Zero `any`, and read each explanation after passing: the follow-ups are the interview.',
      exercises: [genericSelectList, useLocalStorageExercise, miniSchemaValidator],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 60–90 seconds before revealing the model answer. For the React questions, sketch the code in your head as you talk — interviewers often say "show me".',
    },
  ],
  flashcards: [
    {
      id: 'conditional-distribution',
      front: 'When does a conditional type **distribute** over a union?',
      back: 'Only when the checked type is a **naked type parameter** (`T extends U ? …`). `F<A | B>` becomes `F<A> | F<B>`. Wrapping it (`[T] extends [U]`) turns distribution off.',
    },
    {
      id: 'never-distribution',
      front: 'Why is `IsNever<never>` `never` when `type IsNever<T> = T extends never ? true : false`?',
      back: '`never` is the empty union, and a distributive conditional over zero members yields `never`. Write `[T] extends [never] ? true : false` instead.',
    },
    {
      id: 'infer-keyword',
      front: 'What does `infer` do?',
      back: 'Declares a type variable inside a conditional\'s `extends` clause that captures whatever matches that position — pattern matching. E.g. `T extends Promise<infer U> ? U : T`.',
    },
    {
      id: 'homomorphic-mapped',
      front: 'What is special about a **homomorphic** mapped type (`{ [K in keyof T]: … }`)?',
      back: 'It preserves each property\'s `readonly` and `?` modifiers, and when `T` is an array or tuple it produces an array/tuple. That\'s why `Partial<string[]>` is still an array.',
    },
    {
      id: 'mapped-modifiers',
      front: 'How do you remove `readonly` or `?` in a mapped type?',
      back: 'Prefix with `-`: `{ -readonly [K in keyof T]: T[K] }` (Mutable) and `{ [K in keyof T]-?: T[K] }` (Required). `+` is the default for adding.',
    },
    {
      id: 'key-remap-never',
      front: 'How do you **filter** keys in a mapped type?',
      back: 'Remap them to `never` with an `as` clause: `{ [K in keyof T as T[K] extends string ? K : never]: T[K] }`. Keys mapped to `never` are dropped.',
    },
    {
      id: 'template-literal-cross',
      front: 'What does `` `${\'a\' | \'b\'}-${\'x\' | \'y\'}` `` evaluate to?',
      back: "The cross product: `'a-x' | 'a-y' | 'b-x' | 'b-y'`. Intrinsics `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` transform string literal types.",
    },
    {
      id: 'method-bivariance',
      front: 'Method signature vs function-typed property: how are parameters checked under `strict`?',
      back: 'Function-typed **properties** (`onChange: (v: string) => void`) are checked **contravariantly**. **Methods** (`onChange(v: string): void`) stay **bivariant** — unsound. Declare callbacks as properties.',
    },
    {
      id: 'branded-type',
      front: 'What is a branded type?',
      back: 'A primitive intersected with a phantom property, e.g. `string & { readonly __brand: \'UserId\' }`. Same runtime value, but a plain `string` isn\'t assignable — adds nominal typing. Create it via a validating constructor.',
    },
    {
      id: 'reactnode-vs-element',
      front: '`ReactNode` vs `ReactElement` vs `JSX.Element`?',
      back: '`ReactNode`: anything renderable (elements, strings, numbers, null, arrays) — use for `children`. `ReactElement`: only JSX element objects. `JSX.Element` (`React.JSX.Element` in React 19): what a JSX expression returns.',
    },
    {
      id: 'native-props',
      front: 'How do you make a component accept all native `<button>` props?',
      back: '`interface ButtonProps extends ComponentPropsWithoutRef<\'button\'> { … }` and spread `...rest` onto the `<button>`. Use `ComponentProps<\'button\'>` if you also want `ref` (React 19). `Omit` props you redefine.',
    },
    {
      id: 'useref-react19',
      front: 'React 19 types: `useRef<HTMLDivElement>(null)` returns what?',
      back: '`RefObject<HTMLDivElement | null>` with a **mutable** `current`. `useRef` now requires an argument; `MutableRefObject` is deprecated.',
    },
    {
      id: 'ref-as-prop',
      front: 'How do function components receive refs in React 19?',
      back: 'As a regular `ref` prop — no `forwardRef` needed (it still works but will be deprecated). Type it via `ComponentProps<\'input\'>` or `ref?: React.Ref<Handle>`.',
    },
    {
      id: 'generic-arrow-tsx',
      front: 'How do you write a generic **arrow** component in a `.tsx` file?',
      back: '`const List = <T,>(props: ListProps<T>) => …` — the comma (or `<T extends unknown>`) stops `<T>` being parsed as a JSX tag. Function declarations don\'t need it.',
    },
    {
      id: 'context-null-hook',
      front: 'Idiomatic way to type a context with no sensible default?',
      back: '`createContext<Value | null>(null)` plus a `useValue()` hook that throws if the context is `null` and returns the narrowed `Value`. Consumers get a non-nullable type and a clear error outside the provider.',
    },
    {
      id: 'as-const-hook',
      front: 'Why `return [value, setValue] as const` in a custom hook?',
      back: 'Without it TS infers an array of unions — `(T | Setter)[]` — so destructured items have useless types. `as const` gives a readonly tuple `readonly [T, Setter]`.',
    },
    {
      id: 'isolated-modules-why',
      front: 'Why do Vite/esbuild projects enable `isolatedModules`?',
      back: 'esbuild and SWC transpile **one file at a time** without type information. `isolatedModules` makes `tsc` reject code that needs cross-file knowledge to emit (e.g. re-exporting a type without `export type`). Those tools also never type-check.',
    },
    {
      id: 'parse-dont-validate',
      front: '"Parse, don\'t validate" — what does it mean?',
      back: 'Instead of a boolean check that throws the knowledge away, convert `unknown` into a typed (possibly transformed or branded) value once, at the boundary. The type then proves validity downstream.',
    },
    {
      id: 'verbatim-module-syntax',
      front: 'What does `verbatimModuleSyntax` enforce?',
      back: 'Imports/exports are emitted exactly as written, so type-only imports must say so: `import type { User }` or `import { type User, fetchUser }`. Matches how per-file transpilers (esbuild, SWC) work.',
    },
    {
      id: 'declare-global-module',
      front: 'Why does a `declare global { interface Window { … } }` file need `export {}`?',
      back: '`declare global` is only allowed in a **module**. Without any import/export the file is already a global script. Interface merging then extends the built-in `Window`.',
    },
  ],
  interviewQuestions: [
    {
      id: 'explain-conditional-infer',
      kind: 'concept',
      question: 'Explain conditional types and the `infer` keyword. Where have you used them?',
      answer: `**One-liner:** a conditional type is an if/else on types — \`T extends U ? X : Y\` asks "is T assignable to U?" — and \`infer\` lets the \`extends\` clause capture part of the matched type, like a regex capture group.

**Mechanics worth naming:**
- When \`T\` is a **naked type parameter** and you pass a union, the conditional **distributes** over each member — that's how \`Exclude<T, U> = T extends U ? never : T\` filters a union. Wrapping in \`[T] extends [U]\` turns that off.
- \`infer\` powers the built-ins: \`ReturnType\` is \`T extends (...args: any) => infer R ? R : any\`; \`Parameters\` infers the argument tuple; \`Awaited\` recursively unwraps promises.
- You can also \`infer\` inside template literals: \`\` T extends \`\${infer Head}_\${infer Tail}\` \`\` parses strings at the type level.

**Where I've used them:**
- Deriving types I don't want to duplicate: \`Awaited<ReturnType<typeof fetchUser>>\` for an API function's result, \`ComponentProps<typeof DatePicker>\` for a third-party component's props.
- Typed route params — extracting \`'id' | 'postId'\` from \`'/users/:id/posts/:postId'\` so \`buildPath\` errors on a missing param.
- Schema libraries: \`z.infer\` is just \`infer\` on the schema's generic parameter.

**Trade-off:** clever conditional types can make errors unreadable and slow down the editor, so in app code I keep them in a small, tested \`types/\` module and prefer explicit types elsewhere.`,
      followUps: ['Why is `IsNever<never>` `never` with the naive implementation?', 'Implement `Parameters<T>` from memory.', 'What does "deferred" mean for a conditional type?'],
      minutes: 2,
      level: 'senior',
    },
    {
      id: 'mapped-types-use-case',
      kind: 'concept',
      question: 'What is a mapped type? Give a real use case from an application, not just `Partial`.',
      answer: `**One-liner:** a mapped type builds an object type by iterating over a union of keys — \`{ [K in keyof T]: … }\` — like \`Array.map\` but over property names.

**What you can do in the loop:**
- Transform values: \`{ [K in keyof T]: Promise<T[K]> }\`.
- Change modifiers: add or remove \`readonly\` and \`?\` with \`+\`/\`-\` (\`Mutable\`, \`Required\`).
- Rename or filter keys with \`as\` (TS 4.1+): rename with template literals (\`get\${Capitalize<K>}\`), drop keys by remapping them to \`never\`.

When the keys come from \`keyof T\` of a type parameter, it's **homomorphic**: modifiers are preserved and arrays stay arrays.

**Real use cases:**
- **Forms:** from \`type Values = { email: string; age: number }\` derive \`Errors = { [K in keyof Values]?: string }\` and \`Touched = { [K in keyof Values]: boolean }\`. Add a field once and every related type updates.
- **Event props:** \`\` { [K in keyof Events & string as \`on\${Capitalize<K>}\`]?: (payload: Events[K]) => void } \`\` generates handler props from an events map.
- **API casing:** \`CamelCaseKeys<ApiUser>\` to type the result of a snake_case → camelCase converter.
- **Immutability:** \`DeepReadonly<State>\` for reducer state so mutation is a compile error.

**Why it matters:** mapped types keep related types *derived* from one source instead of hand-maintained copies that drift — the type-level version of "single source of truth".`,
      followUps: ['What does "homomorphic" mean and why does it matter?', 'How would you implement `Omit` with key remapping?', 'Why does `Omit` on a union lose properties?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'type-generic-component',
      kind: 'ui-build',
      question: 'How do you type a generic React component, like a `List` or `Select` that works with any item type?',
      answer: `**One-liner:** make the component function itself generic, so TypeScript infers \`T\` from the \`items\` prop at each call site and threads it through \`renderItem\`, \`getKey\` and \`onSelect\`.

\`\`\`tsx
interface SelectProps<T> {
  items: readonly T[];
  getKey: (item: T) => React.Key;
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
}
function Select<T>({ items, getKey, renderItem, onSelect }: SelectProps<T>) { … }

<Select items={users} getKey={(u) => u.id} renderItem={(u) => u.name} onSelect={setUser} />
\`\`\`

**Details I'd mention:**
- In \`.tsx\`, a generic **arrow** needs \`<T,>\` (or \`<T extends unknown>\`), otherwise \`<T>\` parses as JSX.
- **Accessor vs constraint:** \`getKey\` works for any \`T\`, including primitives; \`<T extends { id: string }>\` is simpler but forces a shape on callers.
- **Explicit type arguments** in JSX when inference has nothing to go on: \`<Select<User> items={[]} … />\`.
- **\`NoInfer<T>\`** (TS 5.4) on props like \`defaultValue\` so they don't widen \`T\`.
- **Callbacks in domain terms** — \`onSelect(user: User)\`, not a DOM event.
- **Wrappers:** \`memo\` drops the generic, so cast \`memo(Select) as typeof Select\`. Before React 19, \`forwardRef\` had the same problem; now \`ref\` is just a prop.

**Trade-off:** generics are worth it when props are related through \`T\`; if nothing connects them, a plain union or \`unknown\` is simpler.`,
      followUps: ['How would you make it multi-select with a discriminated `mode` prop?', 'How do you keep generics when wrapping with memo?', 'What does `NoInfer` solve?'],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'children-types-explained',
      kind: 'concept',
      question: 'What is the difference between `ReactNode`, `ReactElement` and `JSX.Element`? Which do you use for `children`?',
      answer: `**One-liner:** \`ReactNode\` is everything React can render, \`ReactElement\` is only the element object JSX creates, and \`JSX.Element\` is the type a JSX expression evaluates to — so \`children\` should almost always be \`ReactNode\`.

**Details:**
- **\`ReactNode\`** = \`ReactElement | string | number | bigint | boolean | null | undefined | Iterable<ReactNode> | ReactPortal\` (plus promises in React 19's types, for async server components). Right for \`children\` and any "slot" prop like \`title\` or \`icon\`.
- **\`ReactElement<P>\`** is the \`{ type, props, key }\` object. Use it when you really need an element — e.g. you call \`cloneElement\` on it or accept exactly one element child. It rejects plain text: \`<Card>Hello</Card>\` fails.
- **\`JSX.Element\`** is \`ReactElement<any, any>\`. It's what \`<div />\` is inferred as. React 19's types removed the *global* \`JSX\` namespace, so write \`React.JSX.Element\`.

**Related points that show depth:**
- Components don't need an explicit return type; since TS 5.1 with current React types they may return any \`ReactNode\`, including strings and \`null\`.
- For render props, type \`children\` as a function: \`children: (state: S) => ReactNode\`.
- \`PropsWithChildren<P>\` adds an *optional* \`children?: ReactNode\`; I prefer writing it explicitly so I can make it required.`,
      followUps: ['When would you accept `ReactElement` instead of `ReactNode`?', 'How do you type a render-prop child?', 'What changed about the JSX namespace in React 19?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'typing-context-safely',
      kind: 'concept',
      question: 'How do you type React context so consumers don\'t have to deal with `undefined` everywhere?',
      answer: `**One-liner:** create the context with a \`null\` default and expose it only through a custom hook that throws if the value is \`null\` — consumers get a non-nullable type, and a missing provider fails loudly.

\`\`\`tsx
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const value = useMemo(() => ({ user, signIn: setUser, signOut: () => setUser(null) }), [user]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
\`\`\`

**Why not the alternatives:**
- \`createContext({} as AuthValue)\` lies: outside a provider you get \`{}\` and crash later with a confusing error.
- \`useContext(Ctx)!\` everywhere scatters unchecked assertions.
- Optional chaining everywhere treats a programming error as a normal state.

**Extra points:** React 19 lets you render \`<AuthContext value>\` directly (no \`.Provider\`) and read it with \`use(AuthContext)\`, which can be called conditionally. I memoise the value so consumers don't re-render on every provider render, and for large apps I split state and actions into separate contexts so components that only dispatch don't re-render when state changes.`,
      followUps: ['Why memoize the context value?', 'When would you split one context into two?', 'How is `use(Context)` different from `useContext`?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'how-schema-inference-works',
      kind: 'concept',
      question: 'Schema libraries like zod give you `type User = z.infer<typeof UserSchema>`. How does that work at the type level, and why is it better than writing the interface separately?',
      answer: `**One-liner:** each schema object carries its output type as a generic parameter, \`z.infer\` pulls it out with \`infer\`, and \`z.object\` uses mapped types to assemble the object type from its fields — so the runtime validator and the static type come from one definition and can't drift.

**The mechanics (a sketch you can write on a whiteboard):**
\`\`\`ts
interface Schema<T> { parse(input: unknown): T; optional(): Schema<T | undefined> }
type Infer<S> = S extends Schema<infer T> ? T : never;

type OptionalKeys<S> = { [K in keyof S]: undefined extends Infer<S[K]> ? K : never }[keyof S];
type ObjectOutput<S> =
  { [K in Exclude<keyof S, OptionalKeys<S>>]: Infer<S[K]> } &
  { [K in OptionalKeys<S>]?: Infer<S[K]> };
\`\`\`
- \`s.string()\` returns \`Schema<string>\`; \`.optional()\` returns \`Schema<string | undefined>\`.
- \`s.object(shape)\` is generic over the shape (\`S extends Record<string, Schema<unknown>>\`) and returns \`Schema<ObjectOutput<S>>\`. Keys whose schema accepts \`undefined\` become \`key?:\`. A \`Simplify\` mapped type flattens the intersection for readable hovers.
- Transforms (\`z.coerce.date()\`) are why real libraries track an **input** and an **output** type (\`z.input\` vs \`z.output\`).

**Why it's better than a separate interface:**
- One source of truth: add a field to the schema and the type updates; a hand-written interface plus guard can disagree silently — a type predicate is trusted, not verified.
- Parsing happens at the boundary and returns the inferred type, so the rest of the app needs no casts ("parse, don't validate").
- The same schema can validate forms, URL params and env vars.

**Trade-offs:** bundle size (Valibot is the modular, smaller option), runtime cost on large payloads, and very large schemas can slow the type checker. I still prefer it to casting API data.`,
      followUps: ['How would you support `.transform()` where input and output types differ?', 'Why does `undefined extends Infer<S[K]>` detect optional fields?', 'What do generated OpenAPI types give you that schemas do not, and vice versa?'],
      minutes: 3,
      level: 'senior',
    },
    {
      id: 'branded-types',
      kind: 'concept',
      question: 'What are branded (nominal) types in TypeScript, and when are they worth using?',
      answer: `**One-liner:** a branded type intersects a base type with a phantom property — \`type UserId = string & { readonly __brand: 'UserId' }\` — so it's still a plain string at runtime but the compiler won't accept an arbitrary string where a \`UserId\` is required.

**Why it's needed:** TypeScript is **structural**: \`userId: string\` and \`orderId: string\` are interchangeable, and swapping two arguments compiles. Brands add nominal typing where it matters.

**How I use them:**
- A **smart constructor** is the only way in: \`function toUserId(raw: string): UserId\` validates the format, then does the one audited cast. Holding a \`UserId\` is proof it was checked.
- Brands flow out freely: a \`UserId\` is still assignable to \`string\`, so logging and URL-building just work.
- Using a \`unique symbol\` as the brand key keeps it out of autocomplete and impossible to fake by accident.

**Good use cases:** IDs for different entities, money in minor units (\`Cents\` vs \`Dollars\`), validated values (\`Email\`, \`NonEmptyString\`), \`SanitizedHtml\` before it reaches \`dangerouslySetInnerHTML\` — the security angle interviewers like.

**Trade-offs:** every value must pass through a constructor (or a cast in tests), arithmetic returns plain \`number\` and must be re-branded, and over-branding adds friction. I brand where a mix-up is costly and silent — IDs, money, sanitised strings — not everywhere. Zod's \`.brand()\` combines this with runtime parsing.`,
      followUps: ['How do brands relate to "parse, don\'t validate"?', 'Why is `UserId` assignable to `string` but not vice versa?', 'Could you get the same safety with a class?'],
      minutes: 2,
      level: 'senior',
    },
    {
      id: 'polymorphic-components',
      kind: 'concept',
      question: 'How would you type a polymorphic component with an `as` prop, like `<Text as="label" htmlFor="x">`? Would you build one?',
      answer: `**One-liner:** make the component generic over the element type \`E extends ElementType\`, and combine your own props with that element's props minus any conflicts — but I'd weigh it against simpler patterns like \`asChild\` or separate components.

\`\`\`tsx
type PolymorphicProps<E extends ElementType, P> =
  P & { as?: E } & Omit<ComponentPropsWithoutRef<E>, keyof P | 'as'>;

function Text<E extends ElementType = 'span'>({ as, ...rest }: PolymorphicProps<E, { size?: Size }>) {
  const Component: ElementType = as ?? 'span';
  return <Component {...rest} />;
}
\`\`\`

\`E\` is inferred from \`as\`, so \`<Text as="a" href="/x">\` is valid and \`<Text href="/x">\` is an error because \`span\` has no \`href\`.

**Trade-offs I'd raise:**
- **Complexity and speed:** these types are hard to read, slow down type-checking in big design systems, and produce cryptic errors.
- **Refs:** supporting a correctly typed \`ref\` for every \`E\` makes the types significantly worse (React 19's ref-as-prop helps, but the type is still \`ComponentPropsWithRef<E>\` gymnastics).
- **Semantics:** \`as\` makes it easy to render a \`div\` with \`onClick\` instead of a \`button\` — an accessibility footgun.

**Alternatives:** the **\`asChild\`/Slot** pattern (Radix): \`<Button asChild><Link to="/x">Go</Link></Button>\` merges props onto the child, so the child keeps its own types. Or ship a few explicit components (\`Button\`, \`LinkButton\`). I'd use \`as\` for low-level layout/typography primitives and \`asChild\` for interactive components.`,
      followUps: ['How does the Slot/asChild pattern work at runtime?', 'How would you add ref support?', 'Why `Omit<…, keyof P>`?'],
      minutes: 3,
      level: 'senior',
    },
    {
      id: 'refs-react-19',
      kind: 'concept',
      question: 'How do refs work with function components in React 19? Do you still need `forwardRef`, and how do you type it?',
      answer: `**One-liner:** in React 19 \`ref\` is a regular prop for function components, so you destructure it and pass it on — \`forwardRef\` still works but is no longer needed and is expected to be deprecated.

\`\`\`tsx
function TextField({ label, ref, ...props }: { label: string } & ComponentProps<'input'>) {
  return <label>{label}<input ref={ref} {...props} /></label>;
}
const inputRef = useRef<HTMLInputElement>(null);   // RefObject<HTMLInputElement | null>
<TextField label="Email" ref={inputRef} />;
\`\`\`

**Typing details:**
- \`ComponentProps<'input'>\` now includes \`ref?: Ref<HTMLInputElement>\`; \`ComponentPropsWithoutRef\` excludes it.
- To expose a custom API instead of the DOM node: \`ref?: Ref<VideoHandle>\` + \`useImperativeHandle(ref, () => ({ play, pause }), [])\`.
- \`useRef\` requires an argument in React 19's types, and \`RefObject.current\` is mutable — \`MutableRefObject\` is deprecated.
- Ref callbacks can return a **cleanup function**, so implicit returns like \`ref={(el) => (node = el)}\` are now type errors — use a block body.

**Why it's better:** \`forwardRef\` wrapped the component, broke generic components (the generic parameter was lost), tended to produce anonymous components in DevTools unless you set a \`displayName\`, and made types noisy. Ref-as-prop removes all of that. Class components are unchanged: \`ref\` still points to the instance.

**When to use refs at all:** focus management, measuring, integrating non-React libraries, imperative media APIs — not for data that should be state.`,
      followUps: ['What does `useImperativeHandle` do and when is it justified?', 'What changed about ref callbacks in React 19?', 'Why did `forwardRef` break generic components?'],
      minutes: 2,
      level: 'core',
    },
  ],
};

export default day;
