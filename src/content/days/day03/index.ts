import type { Day, Exercise } from '../../types';

import howTypescriptThinks from './lessons/how-typescript-thinks.md?raw';
import narrowingUnions from './lessons/narrowing-unions.md?raw';
import genericsUtilityTypes from './lessons/generics-utility-types.md?raw';

import pickStarter from './exercises/type-my-pick/starter.ts?raw';
import pickSolution from './exercises/type-my-pick/solution.ts?raw';
import pickTests from './exercises/type-my-pick/tests.ts?raw';
import readonlyStarter from './exercises/type-my-readonly/starter.ts?raw';
import readonlySolution from './exercises/type-my-readonly/solution.ts?raw';
import readonlyTests from './exercises/type-my-readonly/tests.ts?raw';
import tupleStarter from './exercises/type-tuple-to-object/starter.ts?raw';
import tupleSolution from './exercises/type-tuple-to-object/solution.ts?raw';
import tupleTests from './exercises/type-tuple-to-object/tests.ts?raw';
import firstStarter from './exercises/type-first/starter.ts?raw';
import firstSolution from './exercises/type-first/solution.ts?raw';
import firstTests from './exercises/type-first/tests.ts?raw';
import excludeStarter from './exercises/type-my-exclude-extract/starter.ts?raw';
import excludeSolution from './exercises/type-my-exclude-extract/solution.ts?raw';
import excludeTests from './exercises/type-my-exclude-extract/tests.ts?raw';
import groupByStarter from './exercises/group-by-typed/starter.ts?raw';
import groupBySolution from './exercises/group-by-typed/solution.ts?raw';
import groupByTests from './exercises/group-by-typed/tests.ts?raw';
import parseUserStarter from './exercises/parse-user-unknown/starter.ts?raw';
import parseUserSolution from './exercises/parse-user-unknown/solution.ts?raw';
import parseUserTests from './exercises/parse-user-unknown/tests.ts?raw';

const typeMyPick: Exercise = {
  id: 'type-my-pick',
  title: 'MyPick<T, K>',
  runtime: 'types',
  difficulty: 'warm-up',
  estMinutes: 6,
  tags: ['typescript', 'mapped types', 'keyof', 'utility types'],
  prompt: `Implement \`MyPick<T, K>\` — the built-in \`Pick\` — without using \`Pick\`.

\`\`\`ts
interface Todo { title: string; description?: string; readonly completed: boolean }

type TodoPreview = MyPick<Todo, 'title' | 'completed'>;
// { title: string; readonly completed: boolean }
\`\`\`

- \`K\` can be a single key or a union of keys.
- Only keys of \`T\` are allowed: \`MyPick<Todo, 'nope'>\` must not compile. (The starter's \`K\` is unconstrained — fixing that is part of the exercise.)
- Optional (\`?\`) and \`readonly\` modifiers are preserved.

**What the interviewer is looking for:** a constraint (\`K extends keyof T\`), a mapped type over \`K\`, an indexed access \`T[P]\` — and being able to say *why* the modifiers survive.`,
  starter: pickStarter,
  solution: pickSolution,
  tests: pickTests,
  hints: [
    'Two jobs: restrict `K` to the keys of `T`, then build an object type with one property per key in `K`.',
    'The constraint is `K extends keyof T`. A mapped type looks like `{ [P in SomeUnion]: … }`.',
    '`{ [P in K]: T[P] }` — for each key `P` in `K`, a property whose type is the type of `P` in `T`.',
  ],
  explanation: `**Solution:** \`type MyPick<T, K extends keyof T> = { [P in K]: T[P] }\`.

- \`K extends keyof T\` is what makes \`MyPick<Todo, 'nope'>\` an error — and it's the difference between the built-in \`Pick\` (checks keys) and \`Omit\` (declared with \`K extends keyof any\`, so typos silently do nothing).
- \`[P in K]\` iterates over each member of the key union; \`T[P]\` is an indexed access type.
- **Modifiers:** a mapped type is *homomorphic* when it maps over \`keyof T\` — or over a type parameter constrained to \`keyof T\`, as here — and homomorphic mapped types copy \`?\` and \`readonly\` from \`T\`. Mapping over an unrelated union like \`[P in 'a' | 'b']\` would not.

**Follow-ups:**
- *"Build \`Omit\` from your \`Pick\`."* → \`type MyOmit<T, K extends keyof T> = MyPick<T, Exclude<keyof T, K>>\` (you'll write \`Exclude\` below). This version *does* check its keys, unlike the built-in.
- *"Where do you use \`Pick\` in React?"* → giving a component only the props it needs (\`Pick<User, 'name' | 'avatarUrl'>\`), which keeps it reusable and makes \`memo\` more effective.`,
};

const typeMyReadonly: Exercise = {
  id: 'type-my-readonly',
  title: 'MyReadonly<T>',
  runtime: 'types',
  difficulty: 'warm-up',
  estMinutes: 5,
  tags: ['typescript', 'mapped types', 'readonly', 'utility types'],
  prompt: `Implement \`MyReadonly<T>\` — the built-in \`Readonly\` — without using it.

\`\`\`ts
interface Todo { title: string; tags: string[] }
const todo: MyReadonly<Todo> = { title: 'Ship it', tags: [] };
todo.title = 'x';    // ❌ compile error: read-only
todo.tags.push('x'); // ✅ allowed — Readonly is shallow
\`\`\`

- Every property becomes \`readonly\`; optional properties stay optional.
- Shallow: nested objects are unchanged (DeepReadonly is a Day 4 exercise).
- Arrays and tuples become readonly arrays/tuples.

**What the interviewer is looking for:** the \`readonly\` modifier in a mapped type, and knowing that it's shallow and compile-time only.`,
  starter: readonlyStarter,
  solution: readonlySolution,
  tests: readonlyTests,
  hints: [
    "Map over every key of `T` and keep each property's type.",
    'Mapped types accept modifiers in front of the key: `{ readonly [K in keyof T]: … }`.',
    '`{ readonly [K in keyof T]: T[K] }` — arrays and tuples come out as readonly arrays/tuples automatically because the mapped type is homomorphic.',
  ],
  explanation: `**Solution:** \`type MyReadonly<T> = { readonly [K in keyof T]: T[K] }\`.

- It maps over \`keyof T\`, so it's homomorphic: optional properties stay optional, and when \`T\` is an array or tuple type the result is a readonly array/tuple instead of an object with numeric keys.
- It's **shallow**: \`T[K]\` is copied as-is, so nested objects stay mutable.
- It's **compile-time only** — nothing is frozen at runtime. \`Object.freeze\` is typed to return \`Readonly<T>\`, and both are shallow, so the type mirrors the runtime behaviour.
- Mapped-type modifiers can also be *removed*: \`{ -readonly [K in keyof T]: T[K] }\` gives a \`Mutable<T>\`, and \`-?\` is how \`Required\` works.

**Follow-ups:**
- *"Why type props or state as readonly in React?"* → it documents and enforces "don't mutate": mutation breaks React's \`Object.is\`-based change detection (Day 1).
- *"\`Readonly<T>\` vs \`as const\`?"* → \`as const\` *infers* readonly literal types from a value; \`Readonly<T>\` *transforms* an existing type and keeps the property types as they are.`,
};

const typeTupleToObject: Exercise = {
  id: 'type-tuple-to-object',
  title: 'TupleToObject<T>',
  runtime: 'types',
  difficulty: 'warm-up',
  estMinutes: 6,
  tags: ['typescript', 'indexed access', 'as const', 'PropertyKey'],
  prompt: `Turn a tuple of keys into an object type whose keys and values are the tuple's elements.

\`\`\`ts
const cars = ['tesla', 'model 3'] as const;
type Cars = TupleToObject<typeof cars>;
// { tesla: 'tesla'; 'model 3': 'model 3' }
\`\`\`

- Must accept readonly tuples produced by \`as const\`.
- Elements may be strings, numbers or unique symbols.
- Elements that can't be object keys (arrays, objects) must be a compile error.

**What the interviewer is looking for:** \`T[number]\` to get the element union, a \`PropertyKey\` constraint, and knowing that \`as const\` tuples are \`readonly\`.`,
  starter: tupleStarter,
  solution: tupleSolution,
  tests: tupleTests,
  hints: [
    "First get a union of the tuple's elements. What type do you get if you index an array type with `number`?",
    'Constrain `T` so it accepts `as const` tuples but only key-like elements: `T extends readonly PropertyKey[]`.',
    '`{ [K in T[number]]: K }` — each element becomes a key whose value type is the element itself.',
  ],
  explanation: `**Solution:** \`type TupleToObject<T extends readonly PropertyKey[]> = { [K in T[number]]: K }\`.

- \`T[number]\` means "the type you get by indexing with any number" — the union of the element types.
- The constraint does two jobs: \`readonly\` lets \`as const\` tuples in (a readonly array isn't assignable to a mutable one), and \`PropertyKey\` (= \`string | number | symbol\`) rejects elements that can't be keys.
- This is the type-level twin of a runtime idiom: \`Object.fromEntries(values.map((v) => [v, v]))\`.

**Common mistakes:**
- \`T extends any[]\` — rejects \`as const\` tuples.
- \`T extends readonly any[]\` — accepts \`[[1, 2]]\`, so the error case fails (and \`any\` sneaks in).
- \`[K in keyof T]\` — maps over the tuple's *indices* and produces another tuple, not an object.

**Follow-up:** *"Get a union type from the same tuple."* → \`(typeof cars)[number]\`. Day 4 wraps that in a \`TupleToUnion\` helper.`,
};

const typeFirst: Exercise = {
  id: 'type-first',
  title: 'First<T>',
  runtime: 'types',
  difficulty: 'core',
  estMinutes: 6,
  tags: ['typescript', 'tuples', 'conditional types', 'readonly'],
  prompt: `Implement \`First<T>\`: the type of a tuple's first element, or \`never\` for an empty tuple.

\`\`\`ts
First<['a', 'b', 'c']>   // 'a'
First<[]>                // never
First<[undefined, 1]>    // undefined
First<readonly [1, 2]>   // 1   — as const tuples are readonly; accept them
First<'not an array'>    // ❌ compile error
\`\`\`

You'll need a *conditional type* (\`A extends B ? X : Y\`) — the lesson's "peek under the hood" section shows the syntax.

**What the interviewer is looking for:** knowing that an out-of-range tuple index is \`undefined\`, special-casing the empty tuple by looking at \`T\` itself, and the readonly-vs-mutable array relationship.`,
  starter: firstStarter,
  solution: firstSolution,
  tests: firstTests,
  hints: [
    '`T[0]` is almost right. What does it give for `[]`? For `[undefined]`? You need to tell those apart by looking at `T`, not at `T[0]`.',
    'A conditional type can ask "is T the empty tuple?". Constrain `T` with `readonly unknown[]` so readonly tuples are accepted and non-arrays rejected.',
    '`T extends readonly [] ? never : T[0]` — note the `readonly []`: a readonly empty tuple is not assignable to a mutable `[]`.',
  ],
  explanation: `**Solution:** \`type First<T extends readonly unknown[]> = T extends readonly [] ? never : T[0]\`.

Alternatives that also pass:
- \`T['length'] extends 0 ? never : T[0]\`
- \`T extends readonly [infer Head, ...unknown[]] ? Head : never\` — uses \`infer\` (Day 4). Arguably the most precise: it also gives \`never\` for non-tuple arrays like \`string[]\`, where the solution above gives \`string\`.

Why the naive versions fail:
- \`T[0]\` gives \`undefined\` for \`[]\`.
- \`T[0] extends undefined ? never : T[0]\` breaks \`[undefined, 1]\`.
- \`T extends [] ? never : T[0]\` breaks \`readonly []\`, because readonly arrays aren't assignable to mutable ones.

**Follow-ups:** \`Last<T>\` (\`T extends readonly [...unknown[], infer L] ? L : never\`), \`Length<T>\` (\`T['length']\` — a literal for tuples, \`number\` for arrays), and the runtime twin: *"why is \`arr[0]\` typed \`T\` and not \`T | undefined\`?"* → that's what \`noUncheckedIndexedAccess\` changes.`,
};

const typeMyExcludeExtract: Exercise = {
  id: 'type-my-exclude-extract',
  title: 'MyExclude & MyExtract',
  runtime: 'types',
  difficulty: 'core',
  estMinutes: 7,
  tags: ['typescript', 'conditional types', 'unions', 'utility types'],
  prompt: `Implement the built-in \`Exclude<T, U>\` and \`Extract<T, U>\` without using them.

\`\`\`ts
MyExclude<'a' | 'b' | 'c', 'a'>        // 'b' | 'c' — drop members assignable to U
MyExtract<'a' | 'b' | 'c', 'a' | 'z'>  // 'a'       — keep members assignable to U

type Shape = { kind: 'circle'; r: number } | { kind: 'square'; size: number };
MyExtract<Shape, { kind: 'circle' }>   // { kind: 'circle'; r: number }
\`\`\`

**What the interviewer is looking for:** that conditional types *distribute* over unions when the checked type is a naked type parameter, and that \`never\` disappears from unions.`,
  starter: excludeStarter,
  solution: excludeSolution,
  tests: excludeTests,
  hints: [
    'Think about one union member at a time: for a single member `T`, when should the result be `never`, and when `T`?',
    'A conditional type on a naked type parameter is applied to each union member separately, and `never` members vanish from the result.',
    '`MyExclude<T, U> = T extends U ? never : T`. `MyExtract` swaps the branches.',
  ],
  explanation: `**Solution:** \`MyExclude<T, U> = T extends U ? never : T\` and \`MyExtract<T, U> = T extends U ? T : never\`.

**Distribution:** when the checked type is a *naked* type parameter, \`T extends U ? X : Y\` is evaluated once per member of \`T\`, and the results are unioned: \`MyExclude<'a' | 'b' | 'c', 'a'>\` → \`never | 'b' | 'c'\` → \`'b' | 'c'\`. To turn distribution off, wrap both sides in a tuple: \`[T] extends [U] ? … : …\` checks the union as a whole. Day 4 needs both behaviours.

**\`Extract\` on discriminated unions** is genuinely useful: \`Extract<Action, { type: 'add' }>\` gives the payload type of one action, and \`Exclude<Status, 'idle'>\` removes a state. Assignability is structural, so \`{ kind: 'circle'; r: number }\` is assignable to \`{ kind: 'circle' }\` — that's why matching on the tag alone works.

**Edge case:** \`MyExclude<never, X>\` is \`never\` — distributing over an empty union gives an empty union.

**Follow-up:** *"Implement \`NonNullable\` with this."* → \`MyExclude<T, null | undefined>\` (the built-in has been \`T & {}\` since TS 4.8).`,
};

const groupByTyped: Exercise = {
  id: 'group-by-typed',
  title: 'Typed groupBy()',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['typescript', 'generics', 'PropertyKey', 'data transforms', 'prototypes'],
  prompt: `Implement a typed \`groupBy\` with the behaviour of ES2024 \`Object.groupBy\` — **without** calling \`Object.groupBy\`.

\`\`\`ts
const people = [
  { name: 'Ada', team: 'core' },
  { name: 'Linus', team: 'infra' },
  { name: 'Grace', team: 'core' },
] as const;

groupBy(people, (p) => p.team);
// { core: [Ada, Grace], infra: [Linus] }, typed Partial<Record<'core' | 'infra', …>>
\`\`\`

Signature: \`groupBy<T, K extends PropertyKey>(items: Iterable<T>, keyFn: (item: T, index: number) => K): Partial<Record<K, T[]>>\`

- Accept any iterable; keep items in their original order within each group; pass the index to \`keyFn\`.
- Keys can be strings, numbers or symbols. Only keys that were actually produced appear on the result.
- Keys such as \`'constructor'\`, \`'toString'\` and \`'__proto__'\` must behave like any other key.

**What the interviewer is looking for:** a clean single pass, a correct generic signature (with an opinion on \`Record\` vs \`Partial<Record>\`), and awareness of prototype pitfalls when objects are used as dictionaries.`,
  starter: groupByStarter,
  solution: groupBySolution,
  tests: groupByTests,
  hints: [
    'One pass with `for…of` works for every iterable. Keep a running index for `keyFn`.',
    "With a plain `{}`, `result.constructor` already exists (it's inherited), and assigning `result['__proto__']` replaces the prototype instead of adding a key. Which kind of object has no prototype at all?",
    '`const groups = Object.create(null) as Partial<Record<K, T[]>>;` then `const group = groups[key]; if (group) group.push(item); else groups[key] = [item];`',
  ],
  explanation: `**Approach:** one O(n) pass; look up the group, push or create it.

**The prototype trap:** with \`const result = {}\`, \`result['constructor']\` is the inherited \`Object\` function, so \`(result[key] ??= []).push(item)\` calls \`.push\` on a function and throws. Worse, \`result['__proto__'] = [item]\` *replaces the prototype* instead of creating a key — a cousin of prototype-pollution bugs (Day 12). Fixes: \`Object.create(null)\` (which is what \`Object.groupBy\` returns), a \`Map\` (what \`Map.groupBy\` returns), or \`Object.hasOwn\` checks plus \`Object.defineProperty\`.

**Why \`Partial<Record<K, T[]>>\`?** When \`K\` is a literal union (\`'core' | 'infra'\`), nothing guarantees every group exists — an empty input gives \`{}\`. \`Record<K, T[]>\` would let callers write \`groups.infra.length\` and crash. TypeScript's own \`lib.es2024\` typing of \`Object.groupBy\` returns \`Partial<Record<K, T[]>>\` for exactly this reason.

**Why \`K extends PropertyKey\`?** Object keys can only be strings, numbers (coerced to strings) or symbols. The constraint rejects key functions that return objects, which would all collapse into \`'[object Object]'\`.

**Follow-ups:**
- *"Return a \`Map\` instead."* → \`Map.groupBy\` semantics: keys keep their identity, so objects work and \`1\` and \`'1'\` stay distinct.
- *"Accept a property name instead of a function: \`groupBy(people, 'team')\`."* → \`<T, K extends keyof T>(items: Iterable<T>, key: K)\`; the group-key type is \`T[K]\`, which must itself be usable as a key — \`Extract<T[K], PropertyKey>\` expresses that.
- *"Where would you use it in React?"* → sectioned lists (messages grouped by day). Derive it with \`useMemo\` or in a selector — it's derived state, so don't store it in \`useState\`.`,
};

const parseUserUnknown: Exercise = {
  id: 'parse-user-unknown',
  title: 'parseUser(input: unknown): User',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['typescript', 'unknown', 'narrowing', 'type guards', 'validation'],
  prompt: `\`res.json()\` gives you whatever the server sent, typed as \`any\`. Write a hand-rolled validator that turns \`unknown\` into a typed \`User\` — or throws a **descriptive** error.

\`\`\`ts
const user = parseUser(await res.json());
// → User, or a ValidationError like "user.tags[1]: expected a string, got number"
\`\`\`

The full rules are in the starter's doc comment. In short:

- \`id\` positive integer · \`name\` non-empty string · \`email\` string matching \`/^[^\\s@]+@[^\\s@]+$/\` · \`role\` one of \`ROLES\` · \`tags\` array of strings · \`nickname\` optional string.
- Throw the provided \`ValidationError\` with a \`path\` such as \`'user'\`, \`'user.id'\` or \`'user.tags[1]'\`, and a message that says what was received.
- Return a **new** object with only the known keys; omit \`nickname\` entirely when it's absent.
- \`isUser(input): input is User\` — a type guard that never throws.

**Rules:** no \`any\`, no \`as User\`. Narrow \`unknown\` step by step.

**What the interviewer is looking for:** fluent narrowing of \`unknown\` (\`typeof\`, \`Array.isArray\`, null checks), a type predicate, refusing to trust the input's shape (stripping unknown keys), and error messages a teammate could debug from.`,
  starter: parseUserStarter,
  solution: parseUserSolution,
  tests: parseUserTests,
  hints: [
    'Start with a guard `isRecord(value: unknown): value is Record<string, unknown>` — an object, not null, not an array. Then destructure the fields: each one is `unknown`.',
    "Narrow each field with `typeof` / `Number.isInteger` / `Array.isArray`, and throw from a helper whose return type is `never` so TypeScript knows what follows a failed check is unreachable. `ROLES.includes(role)` won't compile with an `unknown` argument — widen the array inside a guard: `(ROLES as readonly unknown[]).includes(value)`.",
    'Validate tags element by element into a new `string[]` (`tags.map((tag: unknown, i) => …)`), then build the result explicitly: `const user: User = { id, name, email, role, tags: parsedTags }; if (nickname !== undefined) user.nickname = nickname;`. `isUser` can simply try `parseUser` and catch.',
  ],
  explanation: `**Shape of a good solution:**
1. An \`isRecord\` guard, then destructure — every field is \`unknown\`.
2. One check per field. A \`fail(path, expected, value): never\` helper throws; because it returns \`never\`, control-flow analysis knows the code after \`return fail(…)\` only runs when the check passed, so each local is narrowed.
3. Construct a fresh \`User\` from the narrowed locals. That strips \`password\` and any other junk, and the object literal is checked against \`User\`, so a misspelt key is a compile error.

**The three gotchas this exercise is built around:**
- **\`Array.isArray\` narrows \`unknown\` to \`any[]\`.** The elements are \`any\`, so \`tags.map((t) => t.toUpperCase())\` would compile and crash. Annotate the element as \`unknown\` and check each one.
- **\`ROLES.includes(value)\` doesn't compile** when \`ROLES\` is a readonly tuple of literals and \`value\` is \`string\`/\`unknown\`: \`includes\` only accepts the element type. Widening the array to \`readonly unknown[]\` is safe because you only read it; pair it with a \`value is Role\` predicate.
- **\`null\` is not "absent".** JSON can't express \`undefined\`, so \`"nickname": null\` from an API means something — decide explicitly. Here it's an error; many APIs would normalise it to absent.

**Why not just \`as User\`?** An assertion checks nothing (lesson 1), and a predicate that doesn't really check is no better (lesson 2). Validating at the boundary is what lets the rest of the app trust its types.

**In production** you'd usually use a schema library (zod, valibot, ArkType): write the schema once and *infer* the type from it (\`type User = z.infer<typeof UserSchema>\`), so validator and type can't drift. You'll build a mini version on Day 4 — and now you know what it does under the hood.

**Follow-ups:**
- *"Report every error, not just the first."* → accumulate \`{ path, message }[]\` and throw once at the end (much better for forms).
- *"How would you test it?"* → table-driven tests: one valid fixture plus one mutation per rule, asserting the error path — like the tests here.
- *"Where does this live in a React app?"* → in the data layer (the fetcher or query function), never in components; components receive already-validated \`User\`s.`,
};

const day: Day = {
  number: 3,
  title: "TypeScript I: The Type System You're Expected to Know",
  tagline: 'Structural typing, inference, narrowing, discriminated unions and generics — the fundamentals interviewers probe, made precise.',
  summary:
    'Interviewers use TypeScript questions to find out whether you understand what the checker actually does: structural compatibility, inference and widening, narrowing, and how generics relate types to each other. Today you build that model — types as sets of values, erased at runtime — then use it to model UI state with discriminated unions, turn `unknown` API data into trusted types, and implement the built-in utility types yourself.',
  objectives: [
    'Explain structural typing, excess property checks and type erasure precisely',
    'Predict inferred types: widening, literal types, `as const` and `satisfies`',
    'Choose between `interface` and `type`, and between `any`, `unknown` and `never` — with reasons',
    'Model UI state as a discriminated union with a compile-time exhaustiveness check',
    'Write type guards and assertion functions, and validate `unknown` API data',
    'Use generics, constraints, `keyof`/`typeof`/indexed access and the utility types — and implement Pick, Readonly, Exclude and friends',
  ],
  skills: ['typescript', 'react', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'review',
      title: 'Spaced review: Days 1–2',
      minutes: 15,
      intro:
        'Flashcards from earlier days. Say each answer out loud — in interview vocabulary — before you flip the card, and be strict when grading yourself.',
    },
    {
      kind: 'lesson',
      id: 'how-typescript-thinks',
      title: 'How TypeScript thinks: structure, inference and strictness',
      minutes: 35,
      body: howTypescriptThinks,
      checks: [
        {
          id: 'excess-property-fresh',
          prompt: 'Which numbered lines are compile errors?',
          code: `interface Props { label: string }

const extra = { label: 'Save', colour: 'red' };
const a: Props = extra;                             // (1)
const b: Props = { label: 'Save', colour: 'red' };  // (2)

function show(p: Props) {}
show({ label: 'Save', colour: 'red' });             // (3)`,
          codeLang: 'ts',
          choices: [
            'Only (2)',
            '(2) and (3)',
            'All three',
            'None — structural typing allows extra properties',
          ],
          answer: 1,
          explanation:
            'Excess property checks apply to **fresh object literals** written directly where a typed value is expected — an annotated declaration (2) or a function argument (3). In (1) the literal was first stored in `extra`, so it is no longer fresh and ordinary structural typing applies: `extra` has a `label: string`, so it is a valid `Props`. "None" is the trap for people who know structural typing but not the freshness exception; "All three" is the trap for people who think TypeScript always rejects extra properties.',
        },
        {
          id: 'satisfies-vs-annotation',
          prompt: 'What are the types of `a.brand` and `b.brand`?',
          code: `type Palette = Record<'brand' | 'error', string | number[]>;

const a: Palette = { brand: '#0af', error: [255, 0, 0] };
const b = { brand: '#0af', error: [255, 0, 0] } satisfies Palette;`,
          codeLang: 'ts',
          choices: [
            '`string` and `string`',
            '`string | number[]` and `string`',
            '`string | number[]` for both',
            "`'#0af'` and `'#0af'`",
          ],
          answer: 1,
          explanation:
            'An annotation makes the variable\'s type exactly `Palette`, so `a.brand` is `string | number[]` and you would have to narrow before calling `toUpperCase()`. `satisfies` checks the literal against `Palette` but keeps the **inferred** type, so `b.brand` is `string` (and `b.error` is `number[]`). It is not the literal `\'#0af\'` because object properties are mutable and widen — you would need `as const` for that.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'narrowing-unions',
      title: 'Narrowing, discriminated unions and exhaustiveness',
      minutes: 35,
      body: narrowingUnions,
      checks: [
        {
          id: 'exhaustive-new-member',
          prompt:
            "A reducer ends with `default: return assertNever(action);` (where `assertNever(value: never): never`). A teammate adds `| { type: 'renamed'; id: number; text: string }` to the `Action` union but doesn't touch the reducer. What happens?",
          choices: [
            'It compiles; a runtime error is thrown only when a renamed action is dispatched',
            "Compile error at the `assertNever(action)` call: the 'renamed' member is not assignable to `never`",
            'Compile error where the `Action` type is declared',
            'It compiles; the default branch silently returns undefined',
          ],
          answer: 1,
          explanation:
            "After the handled cases, `action` is narrowed to the members that are left. Before the change that was `never`; now it is `{ type: 'renamed'; … }`, which cannot be passed to a `never` parameter — so the compiler points at every switch that needs updating. The runtime throw (option 1) is the *second* line of defence, for data that bypasses the type system. Nothing is wrong with the union declaration itself, and the default branch never silently returns.",
        },
        {
          id: 'type-predicate-trust',
          prompt: 'What happens when this runs?',
          code: `function isString(x: unknown): x is string {
  return typeof x === 'number';
}

const value: unknown = 42;
if (isString(value)) {
  console.log(value.toUpperCase());
}`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            "Compile error: the predicate's body doesn't match `x is string`",
            'It compiles, then throws a TypeError at runtime',
            'It compiles and logs "42"',
            'It compiles and the if-branch is skipped, because the guard is verified',
          ],
          answer: 1,
          explanation:
            'TypeScript **trusts** type predicates — it never checks that the body proves the claim. The buggy guard returns `true` for 42, the branch treats it as a `string`, and `value.toUpperCase` is not a function at runtime. A wrong predicate is exactly as unsafe as an `as` cast, which is why guards should be small, tested, or derived from a schema.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'generics-utility-types',
      title: 'Generics, type operators and the utility types',
      minutes: 40,
      body: genericsUtilityTypes,
      checks: [
        {
          id: 'object-keys-string',
          prompt: 'Why is `Object.keys(user)` typed `string[]` rather than `(keyof User)[]`?',
          choices: [
            'A historical oversight in lib.d.ts that cannot be fixed for compatibility reasons',
            'Because structural typing allows a value typed `User` to carry extra keys at runtime, so `(keyof User)[]` would be unsound',
            '`keyof` only works on types, and `Object.keys` receives a value',
            'Because numeric keys are converted to strings at runtime, so `keyof` would be wrong for number keys',
          ],
          answer: 1,
          explanation:
            'Any object with *at least* the properties of `User` is assignable to `User`, so at runtime `Object.keys` can return keys TypeScript knows nothing about. Typing the result `(keyof User)[]` would let you index with keys that are not there. It is a deliberate decision, not an oversight. The numeric-key point is real but secondary — string conversion alone would not justify `string[]`.',
        },
        {
          id: 'generic-cast-in-disguise',
          prompt: 'Which signature is effectively an unchecked type assertion in disguise?',
          choices: [
            'function first<T>(items: readonly T[]): T | undefined',
            'function getJSON<T>(url: string): Promise<T>',
            'function getProperty<T, K extends keyof T>(obj: T, key: K): T[K]',
            'function identity<T>(value: T): T',
          ],
          answer: 1,
          explanation:
            "In `getJSON<T>`, `T` appears **only in the return type**, so nothing relates it to the input: the caller writes `getJSON<User>('/me')` and gets a `User` with no checking at all — the same as `as User`. The other three use each type parameter at least twice, tying input to output. The honest version returns `Promise<unknown>` (or takes a validator/schema argument that produces the `T`).",
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'does-it-compile',
      title: 'Does it compile? What is the type?',
      minutes: 15,
      intro:
        'None of these need running — they are compile-time questions. Commit to an answer and say *why* out loud before revealing. If you have a TypeScript playground open, paste the code afterwards and hover the types.',
      questions: [
        {
          id: 'infer-widening',
          prompt: 'What types does TypeScript infer for `a`, `b`, `c` and `d`?',
          code: `let a = 'x';
const b = 'x';
const c = { kind: 'x' };
const d = [1, 'a'] as const;`,
          codeLang: 'ts',
          choices: [
            "`string`, `'x'`, `{ kind: string }`, `readonly [1, 'a']`",
            "`'x'`, `'x'`, `{ kind: 'x' }`, `(string | number)[]`",
            '`string`, `string`, `{ kind: string }`, `readonly (string | number)[]`',
            "`string`, `'x'`, `{ readonly kind: 'x' }`, `[number, string]`",
          ],
          answer: 0,
          explanation:
            "A `const` primitive can never change, so it keeps its literal type `'x'`; a `let` is widened to `string` because you might reassign it. Object properties are mutable, so `c.kind` widens to `string` even though `c` is `const` — that is the source of many \"string is not assignable to 'idle' | 'loading'\" errors. `as const` infers the narrowest type: a readonly tuple of literals. `{ readonly kind: 'x' }` is what you would get with `as const` on the object.",
        },
        {
          id: 'interface-type-merging',
          prompt: 'What does the compiler say?',
          code: `interface Settings { theme: string }
interface Settings { fontSize: number }

type Flags = { beta: boolean };
type Flags = { debug: boolean };`,
          codeLang: 'ts',
          choices: [
            'Both compile: each pair merges into one type',
            "`Settings` merges into `{ theme: string; fontSize: number }`; `Flags` is a 'Duplicate identifier' error",
            "Both are 'Duplicate identifier' errors",
            '`Settings` is an error; `Flags` merges via intersection',
          ],
          answer: 1,
          explanation:
            '**Declaration merging** is an interface-only feature: same-named interfaces in the same scope merge their members. That is how you augment `Window` or a library\'s types. Type aliases are just names for a type and cannot be re-declared. If you wanted the combination with aliases you would write `type Flags = A & B` explicitly.',
        },
        {
          id: 'intersection-conflict',
          prompt: 'What happens here?',
          code: `type Base = { id: string };
type WithNumericId = Base & { id: number };

const item: WithNumericId = { id: 1 };`,
          codeLang: 'ts',
          choices: [
            'It compiles: `id` is `string | number`',
            'Error at the `type WithNumericId` line: incompatible property `id`',
            "Error at the assignment: Type 'number' is not assignable to type 'never'",
            'It compiles: the later `id` wins, like an object spread',
          ],
          answer: 2,
          explanation:
            "An intersection requires a value to satisfy **both** sides, so `id` must be `string & number` — which is `never`. TypeScript does not complain at the declaration; you only find out at a distant assignment. `interface WithNumericId extends Base { id: number }` would fail immediately with \"incorrectly extends interface 'Base'\" — one of the reasons to prefer `extends` for composing object types. Intersections are not unions (option 1) and do not behave like spreads (option 4).",
        },
        {
          id: 'any-unknown-never-access',
          prompt: 'Which of these functions compile?',
          code: `function a(x: any) { return x.toUpperCase(); }
function b(x: unknown) { return x.toUpperCase(); }
function c(x: never) { return x.toUpperCase(); }`,
          codeLang: 'ts',
          choices: ['Only `a`', '`a` and `c`', '`a` and `b`', 'All three'],
          answer: 0,
          explanation:
            "`any` allows every operation. `unknown` allows none until you narrow (\"'x' is of type 'unknown'\"). `never` is the tempting one: it is assignable *to* everything, but property access on it is still an error (\"Property 'toUpperCase' does not exist on type 'never'\"). In practice you only see `never` in impossible branches, where you pass it to something like `assertNever` rather than use it.",
        },
        {
          id: 'assertion-overlap',
          prompt: 'Which numbered lines are compile errors?',
          code: `interface User { id: number; name: string }

const a = {} as User;                    // (1)
const b = JSON.parse('{}') as User;      // (2)
const c = 'hello' as number;             // (3)
const d = 'hello' as unknown as number;  // (4)`,
          codeLang: 'ts',
          choices: ['Only (3)', '(1) and (3)', '(3) and (4)', 'None — `as` always compiles'],
          answer: 0,
          explanation:
            "An assertion is allowed when either type is assignable to the other. `{}` is a supertype of `User` (downcasts are allowed, even though the object is missing every property!), and `any` from `JSON.parse` converts to anything. `string` and `number` don't overlap at all, so (3) errors: \"Conversion of type 'string' to type 'number' may be a mistake\". Going through `unknown` (4) silences it — which is why `as unknown as T` is a code-review red flag. Note that (1) and (2) compile *and are lies*.",
        },
        {
          id: 'satisfies-excess-missing',
          prompt: 'Does this compile?',
          code: `type Page = 'home' | 'about' | 'contact';

const paths = {
  home: '/',
  about: '/about',
  contcat: '/contact',
} satisfies Record<Page, string>;`,
          codeLang: 'ts',
          choices: [
            'Yes — `satisfies` only checks the properties that are present',
            "No — 'contcat' is an excess property (and 'contact' is missing)",
            'Yes — but `paths` is now typed `Record<Page, string>`',
            'No — `satisfies` cannot be used with `Record`',
          ],
          answer: 1,
          explanation:
            "`satisfies` performs the same checks as an annotation, **including** excess property checks on the fresh literal and required properties: TypeScript reports \"Object literal may only specify known properties, but 'contcat' does not exist… Did you mean to write 'contact'?\" — and once the typo is fixed, a missing key would be reported too. What `satisfies` does *not* do is change the type of `paths`: it keeps its inferred type, so option 3 describes an annotation, not `satisfies`.",
        },
        {
          id: 'typeof-null-narrowing',
          prompt: 'Does this compile?',
          code: `function count(items: string[] | null) {
  if (typeof items === 'object') {
    return items.length;
  }
  return 0;
}`,
          codeLang: 'ts',
          choices: [
            'Yes: `typeof` narrowed `items` to `string[]`',
            "No: 'items' is possibly 'null'",
            "No: `typeof` can't be used on arrays",
            "Yes, but it returns `undefined` for null at runtime",
          ],
          answer: 1,
          explanation:
            "`typeof null === 'object'` in JavaScript, and TypeScript models that: in the `'object'` branch the type is still `string[] | null`. Use `items !== null` or `Array.isArray(items)`. (At runtime the unguarded version would throw a TypeError for `null`, not return `undefined`.)",
        },
        {
          id: 'truthiness-else-type',
          prompt: 'What is the type of `n` inside the `else` branch?',
          code: `function format(n: number | undefined) {
  if (n) {
    return n.toFixed(2);
  } else {
    return n; // ← here
  }
}`,
          codeLang: 'ts',
          choices: ['`undefined`', '`number | undefined`', '`0`', '`never`'],
          answer: 1,
          explanation:
            "The `if` branch narrows to `number`, but the `else` branch can't be just `undefined`: `0` and `NaN` are falsy *numbers*. TypeScript can't express \"0 or NaN\" as a type, so `number` stays in. It is also the runtime bug — `format(0)` takes the else branch. If 0 is valid, check `n !== undefined`. (`0` would be a valid answer for a literal union like `0 | 1 | undefined`.)",
        },
        {
          id: 'keyof-index-signature',
          prompt: 'What is `FlagKey`?',
          code: `type Flags = { [name: string]: boolean };
type FlagKey = keyof Flags;`,
          codeLang: 'ts',
          choices: ['`string`', '`string | number`', '`string | number | symbol`', '`never`'],
          answer: 1,
          explanation:
            "With a string index signature, numeric keys are also valid because JavaScript converts them to strings (`flags[0]` is `flags['0']`), so `keyof` is `string | number`. Symbols are not covered by a string index signature. `string | number | symbol` is `PropertyKey` — what `keyof any` gives you.",
        },
        {
          id: 'generic-two-candidates',
          prompt: 'What happens?',
          code: `function pair<T>(a: T, b: T): [T, T] {
  return [a, b];
}

pair(1, 'a');`,
          codeLang: 'ts',
          choices: [
            'It compiles; `T` is `string | number`',
            'It compiles; `T` is `unknown`',
            "Error on 'a': Argument of type 'string' is not assignable to parameter of type 'number'",
            "Error on 1: Argument of type 'number' is not assignable to parameter of type 'string'",
          ],
          answer: 2,
          explanation:
            "TypeScript collects the candidates `number` and `string` for `T` and does **not** union them automatically — that would hide genuine mistakes. With no common supertype among the candidates it picks the first, `number`, and then reports the mismatch on `'a'`. If a mix is intended, say so: `pair<string | number>(1, 'a')`, or use two type parameters.",
        },
        {
          id: 'returntype-async',
          prompt: 'What is `R`?',
          code: `async function load() {
  return 42;
}

type R = ReturnType<typeof load>;`,
          codeLang: 'ts',
          choices: ['`number`', '`Promise<number>`', '`Promise<42>`', '`42`'],
          answer: 1,
          explanation:
            'An `async` function always returns a promise, so `ReturnType` gives `Promise<number>`; use `Awaited<ReturnType<typeof load>>` to get `number`. The return value is widened from `42` to `number` because nothing asks to keep the literal. `typeof load` is the type query that lifts the function *value* into the type world.',
        },
        {
          id: 'omit-typo',
          prompt: 'What happens?',
          code: `interface User { id: string; name: string; password: string }

type PublicUser = Omit<User, 'pasword'>;
const u: PublicUser = { id: '1', name: 'Ada', password: 'hunter2' };`,
          codeLang: 'ts',
          choices: [
            "Error: '\"pasword\"' does not satisfy the constraint 'keyof User'",
            "Error: 'password' does not exist in type 'PublicUser'",
            'It compiles — `Omit` does not check its keys, so nothing was removed',
            'It compiles, but `password` is typed `never`',
          ],
          answer: 2,
          explanation:
            "`Omit` is declared as `Omit<T, K extends keyof any>`, so any string is accepted and a typo silently removes nothing — `PublicUser` still has `password`, and your \"public\" type leaks it. `Pick` *is* constrained to `keyof T`, so option 1 is what you'd get from `Pick<User, 'pasword'>`. Some teams define a strict `type StrictOmit<T, K extends keyof T> = Omit<T, K>` for exactly this reason.",
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'type-challenges',
      title: 'Type challenges + typed runtime code',
      minutes: 55,
      intro:
        "Do the five type challenges first — they are quick reps, aim for 5–7 minutes each — then the two runtime exercises. Narrate as you write (*\"K is constrained to keyof T, then I map over K…\"*): interviewers grade the explanation as much as the answer. For type challenges the compiler is the test runner: a case passes when no error falls inside it. No `any`, no AI, timer on.",
      exercises: [typeMyPick, typeMyReadonly, typeTupleToObject, typeFirst, typeMyExcludeExtract, groupByTyped, parseUserUnknown],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer out loud in 60–90 seconds each: one-sentence answer first, then the detail, then an example or trade-off. Include at least one code example in your head for every answer — TypeScript answers without examples sound memorised.',
    },
  ],
  flashcards: [
    { id: 'ts-structural-typing', front: 'What does **structural typing** mean?', back: 'Compatibility is decided by shape: a value is assignable if it has the required properties with compatible types, regardless of names or where the type was declared.' },
    { id: 'ts-excess-property-check', front: 'When does TypeScript reject **extra properties**?', back: 'Only for **fresh object literals** written directly where a typed value is expected (annotation, argument, return, `satisfies`). Assigned via a variable, extras are allowed.' },
    { id: 'ts-types-erased', front: 'Do TypeScript types exist at runtime?', back: 'No — they are erased at compile time (enums, namespaces and parameter properties are the exceptions that emit code). Untrusted data must be validated at runtime.' },
    { id: 'ts-annotate-boundaries', front: 'Rule of thumb: annotate or infer?', back: '**Annotate boundaries** (parameters, exported return types, ambiguous initialisers like `[]` or `null`); **infer internals** (locals, callback parameters).' },
    { id: 'ts-literal-widening', front: "Inferred types of `const a = 'x'`, `let b = 'x'`, `const c = { k: 'x' }`?", back: "`'x'`, `string`, `{ k: string }` — `let` bindings and object properties widen literals because they can change." },
    { id: 'ts-as-const', front: 'What does `as const` do?', back: 'Infers the narrowest type: literal types, `readonly` properties, arrays as readonly tuples. Compile-time only — it does not freeze anything.' },
    { id: 'ts-interface-vs-type', front: 'What can only `interface` do, and what can only `type` do?', back: '`interface`: declaration merging, `extends` with conflict checking. `type`: unions, tuples, primitives, function types, mapped and conditional types.' },
    { id: 'ts-intersection-conflict', front: 'What is `{ id: string } & { id: number }`?', back: 'A valid type whose `id` is `never` — the error only appears when you assign to it. `interface … extends` would error at the declaration.' },
    { id: 'ts-unknown-vs-any', front: '`unknown` vs `any`?', back: 'Both accept any value. `unknown` forbids using it until you narrow; `any` disables checking in both directions and spreads through your code.' },
    { id: 'ts-never', front: 'Where does `never` show up?', back: 'Functions that always throw, impossible intersections (`string & number`), and what is left after narrowing away every union member (exhaustiveness). It vanishes from unions.' },
    { id: 'ts-no-unchecked-indexed-access', front: 'What does `noUncheckedIndexedAccess` do?', back: 'Adds `| undefined` to index access (`arr[i]`, `record[key]`), catching out-of-bounds reads. Not included in `strict`.' },
    { id: 'ts-satisfies', front: '`satisfies` in one sentence?', back: 'Checks a value against a type (excess and missing properties included) but keeps the value\'s own, more precise inferred type. TS 4.9+.' },
    { id: 'ts-typeof-null', front: "Why doesn't `typeof x === 'object'` remove `null`?", back: "Because `typeof null === 'object'` in JavaScript, and TypeScript models it. Check `x !== null` explicitly." },
    { id: 'ts-discriminated-union', front: 'What is a **discriminated union**?', back: 'A union of object types sharing a property with a literal type (the discriminant, e.g. `status`). Checking it narrows the whole object.' },
    { id: 'ts-assert-never', front: 'How does `assertNever` give you exhaustiveness checking?', back: '`function assertNever(x: never): never`. In the `default` branch the value should be `never`; an unhandled member is not assignable to `never` → compile error.' },
    { id: 'ts-predicate-vs-assertion', front: '`x is T` vs `asserts x is T`?', back: 'A type predicate returns a boolean and narrows inside the `if`; an assertion function throws on failure and narrows everything after the call. Both are **trusted, not verified**.' },
    { id: 'ts-enum-alternative', front: 'Idiomatic alternative to an `enum`?', back: "`const Status = { A: 'a', B: 'b' } as const;` plus `type Status = (typeof Status)[keyof typeof Status];` — erasable, structural, JSON-friendly." },
    { id: 'ts-keyof-constraint', front: 'What does `<T, K extends keyof T>(obj: T, key: K): T[K]` express?', back: 'The key must be a real key of `obj`, and the return type is exactly that property\'s type (an indexed access type).' },
    { id: 'ts-object-keys-string', front: 'Why does `Object.keys(obj)` return `string[]`?', back: 'Structural typing: a value typed `T` may carry extra keys at runtime, so `(keyof T)[]` would be unsound.' },
    { id: 'ts-omit-pitfalls', front: 'Two pitfalls of `Omit<T, K>`?', back: 'It does not check that `K` is a key of `T` (typos silently remove nothing), and it is not distributive over unions (it breaks discriminated unions).' },
  ],
  interviewQuestions: [
    {
      id: 'interface-vs-type',
      kind: 'concept',
      question: 'When do you use `interface` and when do you use `type`?',
      answer: `**One-liner:** for object shapes they're mostly interchangeable. I use \`interface\` for object shapes — especially public, extendable ones — and \`type\` for everything an interface can't express. Consistency in the codebase matters more than the choice.

**The real differences:**
- **Expressiveness:** only \`type\` can name unions, tuples, primitives, function types and mapped/conditional types — \`type Status = 'idle' | 'loading'\`.
- **Extending:** \`interface B extends A\` checks compatibility at the declaration and errors on conflicting properties. An intersection \`A & B\` doesn't — a conflict silently becomes \`never\` and surfaces at some distant assignment.
- **Declaration merging:** same-named interfaces merge. That's how you augment \`Window\` or a library's types via module augmentation. A duplicate type alias is an error.
- **Ergonomics:** errors and hovers show interface names, while aliases are often expanded. Interfaces have no implicit index signature, so an interface isn't assignable to \`Record<string, unknown>\` while the equivalent alias is.
- **Performance:** the TypeScript team recommends \`extends\` over large intersections because interface relationships are cached — only relevant at scale.

**In practice:** props as \`interface ButtonProps extends ComponentProps<'button'> { … }\`; state machines and API results as \`type\` unions. If the codebase already has a convention, I follow it.`,
      followUps: [
        'What is declaration merging used for in practice?',
        'What happens when an intersection has conflicting property types?',
        'Why is an interface not assignable to Record<string, unknown>?',
      ],
      minutes: 2,
    },
    {
      id: 'any-unknown-never',
      kind: 'concept',
      question: 'Explain the difference between `any`, `unknown` and `never`.',
      answer: `**One-liner:** \`unknown\` is the safe top type — anything goes in, nothing can be done with it until you narrow it; \`any\` turns type checking off; \`never\` is the empty type that no value has.

**\`any\`:** assignable to and from everything, and every operation compiles. The real danger is that it **spreads** — properties of \`any\` are \`any\`, functions returning it return \`any\` — so unchecked code leaks into typed code. Acceptable during migrations, with a comment.

**\`unknown\`:** what I use for anything I don't control: \`JSON.parse\`, \`res.json()\`, \`postMessage\` data, and \`catch (e)\`, which *is* \`unknown\` under \`strict\`. I narrow it with \`typeof\`, \`in\`, \`instanceof\`, \`Array.isArray\` or a validator, and the compiler makes sure I did.

**\`never\`:** the bottom type. It's the return type of functions that always throw, the result of impossible intersections like \`string & number\`, and what's left when every member of a union has been narrowed away. That last one powers exhaustiveness checks: \`default: assertNever(action)\` stops compiling when a new action type isn't handled. It also vanishes from unions, which is how \`Exclude\` filters.

**Trade-off:** \`unknown\` costs some ceremony at the boundary — but that ceremony is exactly what catches API drift before it reaches a component.`,
      followUps: [
        'Why is the catch clause variable unknown?',
        'How do you get from unknown to a typed value?',
        'Where does never appear without you writing it?',
      ],
      minutes: 2,
    },
    {
      id: 'structural-typing',
      kind: 'concept',
      question: 'TypeScript is "structurally typed". What does that mean, and what are the practical consequences?',
      answer: `**One-liner:** compatibility is decided by shape — if a value has the required properties with compatible types, it's assignable, regardless of what the type is called or where it was declared.

**Consequences:**
- **Flexibility:** any object with \`x\` and \`y\` works where a \`Point\` is expected, including class instances that never mention \`Point\`. Test mocks are just object literals of the right shape.
- **Extra properties are allowed** — except on **fresh object literals**, which get excess property checks to catch typos like \`{ varient: 'primary' }\`. Store the literal in a variable first and the check disappears; that's a classic interview trap.
- **\`Object.keys\` returns \`string[]\`**, not \`(keyof T)[]\`, because a value typed \`T\` may carry extra keys at runtime.
- **Classes are structural too:** \`const d: Dog = new Cat()\` compiles if the shapes match, even though \`instanceof\` disagrees. \`private\`/\`#private\` members are the exception — they make a class effectively nominal.

**When I need nominal types** — \`UserId\` vs \`OrderId\`, both strings — I use **branded types**: \`string & { readonly __brand: 'UserId' }\`, produced only by a validating function, so you can't pass one where the other is expected.

**Why TypeScript chose this:** idiomatic JavaScript is built on object literals and duck typing; a nominal system like Java's would fight the language.`,
      followUps: [
        'When exactly does TypeScript reject extra properties?',
        'How would you stop two kinds of string ID being mixed up?',
        'Why does Object.keys return string[]?',
      ],
      minutes: 2,
    },
    {
      id: 'model-async-state',
      kind: 'concept',
      question: 'How would you type the state of a component that fetches data? Walk me through it.',
      answer: `**One-liner:** as a discriminated union with one member per state, so impossible combinations can't be represented, plus an exhaustive switch to render it.

**The anti-pattern:** \`{ isLoading: boolean; error?: Error; data?: User }\` — eight combinations, about half of them meaningless. Loading *and* failed *and* has data? Every consumer has to defend against states that shouldn't exist.

**The model:**
\`\`\`ts
type RemoteData<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
\`\`\`
\`status\` is the **discriminant**. Switching on it narrows the whole object, so \`state.data\` is only reachable in the success branch.

**Exhaustiveness:** \`default: return assertNever(state)\` — or \`state satisfies never\` — means that adding a \`'refreshing'\` state is a compile error at every switch that doesn't handle it; the compiler gives me the to-do list. \`assertNever\` also throws at runtime if unexpected data slips past the types.

**Refinements I'd mention:** keep the previous data while refetching (a flag on the success member, or a separate member that carries data); type reducer actions as a discriminated union too; and libraries like TanStack Query already expose a discriminated \`status\` you can narrow on the same way.

The phrase I'd use: **make impossible states impossible.**`,
      followUps: [
        'How do you make the compiler tell you about unhandled states?',
        'How would you represent "refetching while showing old data"?',
        'How do you type the actions of a useReducer?',
      ],
      minutes: 3,
    },
    {
      id: 'explain-generics',
      kind: 'concept',
      question: 'Explain generics. Give a real example.',
      answer: `**One-liner:** generics let a function or type work with many types while preserving the *relationship* between them — between input and output, a container and its contents, an object and its keys.

**Everyday example:** \`useState<T>\`. The type of the initial state is the type you get back and the type the setter accepts. When the initial value doesn't describe the full type, I pass it explicitly: \`useState<User | null>(null)\`.

**One I'd write:**
\`\`\`ts
function sortBy<T, K extends keyof T>(items: readonly T[], key: K): T[] {
  return [...items].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
}
sortBy(users, 'lastName'); // ✅
sortBy(users, 'lastname'); // ❌ not a key of User
\`\`\`
\`K extends keyof T\` is a **constraint**: the key must be a real property, and \`T[K]\` is that property's type. A data-table component uses the same idea for its \`columns\` prop.

**Principles I follow:**
- Let inference do the work; pass type arguments only when there's nothing to infer from.
- Each type parameter should appear at least twice. \`getJSON<T>(url): Promise<T>\` has \`T\` only in the return type — an unchecked cast in disguise; return \`unknown\` and validate.
- A constraint bounds \`T\` without erasing the caller's specific type — that's the difference from just typing the parameter as the constraint.

**Contrast:** \`any\` loses the relationship entirely; overloads only cover a fixed list of types.`,
      followUps: [
        'What does a constraint give you that a plain parameter type does not?',
        'When do you pass type arguments explicitly?',
        'How would you write a generic List component in React?',
      ],
      minutes: 2,
    },
    {
      id: 'satisfies-annotation-assertion',
      kind: 'concept',
      question: 'What is the difference between `const x: T = value`, `value as T` and `value satisfies T`?',
      answer: `**One-liner:** an annotation *sets* the variable's type, an assertion *overrides* the compiler, and \`satisfies\` *checks* the value while keeping its inferred type.

- **Annotation:** \`value\` is fully checked against \`T\` — including excess property checks — and \`x\` is \`T\` from then on. You lose anything more specific: if \`T\` says \`string | number[]\`, you must narrow before calling string methods. Right for boundaries and variables that get reassigned.
- **Assertion:** tells the compiler to trust you. It's only rejected when the types don't overlap at all (\`'a' as number\`), which is why the \`as unknown as T\` escape hatch exists. Missing properties aren't caught — \`{} as User\` compiles. I use it for facts the compiler can't know, like the concrete type of a DOM query, and otherwise treat it as a review flag. The non-null \`!\` is the same kind of promise.
- **\`satisfies\` (TS 4.9):** validates the value — missing keys, typos, wrong value types — but the expression keeps its own inferred type. Ideal for config and lookup tables:
\`\`\`ts
const routes = { home: '/', user: '/users/:id' } as const satisfies Record<string, \`/\${string}\`>;
// routes.home is '/', and every value was checked
\`\`\`

**Rule of thumb:** annotate boundaries; \`satisfies\` for constant data you want both validated and precise; \`as\` as a last resort, with a comment.`,
      followUps: [
        'Why does `as unknown as T` exist, and when is it acceptable?',
        'Can you combine `as const` and `satisfies`? Why would you?',
        'Is the non-null assertion operator safe?',
      ],
      minutes: 2,
    },
    {
      id: 'enums-opinion',
      kind: 'concept',
      question: 'Would you use enums in a new TypeScript codebase?',
      answer: `**One-liner:** generally no — I prefer string literal unions, plus an \`as const\` object when I need the values at runtime — though I'd follow an existing convention.

**Why:**
- **Enums aren't type-only.** They emit a runtime object, so they can't simply be erased: Node's built-in type stripping rejects them, and TS 5.8 added \`--erasableSyntaxOnly\` to ban them.
- **Numeric enums are loose and noisy:** any \`number\` is assignable to them, and the reverse mapping doubles their keys, which surprises anyone iterating \`Object.values\`.
- **String enums are nominal:** a function taking \`Status\` rejects the literal \`'ACTIVE'\`, so JSON data needs mapping or casting — out of step with the rest of TypeScript's structural typing.
- **\`const enum\`** is inlined by \`tsc\`, but per-file transpilers — esbuild in Vite, SWC, Babel — can't inline values declared in other files, and \`isolatedModules\` forbids ambient const enums. Most style guides ban it.

**What I use instead:**
\`\`\`ts
const Status = { Active: 'active', Archived: 'archived' } as const;
type Status = (typeof Status)[keyof typeof Status]; // 'active' | 'archived'
\`\`\`
Named constants, \`Object.values(Status)\` for a dropdown, plain strings that match the API, and no type-system surprises.

**Balance:** string enums aren't dangerous. In a codebase that uses them consistently I wouldn't churn it just for taste.`,
      followUps: [
        'What does a numeric enum compile to?',
        'Why is const enum a problem with Vite or Babel?',
        'How do you get a union type from an as const object?',
      ],
      minutes: 2,
    },
    {
      id: 'typing-api-data',
      kind: 'concept',
      question: 'How do you safely type data that comes from an API?',
      answer: `**One-liner:** treat it as \`unknown\` at the boundary and validate it at runtime before it becomes a typed value — types are erased, so the compiler can't see what the server actually sent.

**The problem:** \`res.json()\` returns \`Promise<any>\`. \`const user: User = await res.json()\` or \`as User\` compiles, but it's a promise nobody checks. When the API renames a field, the crash happens far away, inside a component.

**What I do:**
1. Type the raw value as \`unknown\`.
2. Validate it in the **data layer** — the fetcher or query function, not components. For small cases a hand-written parser using \`typeof\`/\`in\` checks and a \`value is User\` predicate. For real apps a schema library like zod or valibot, where the type is *inferred from the schema* (\`type User = z.infer<typeof UserSchema>\`) so validator and type can't drift.
3. **Parse, don't just check:** return a new object with only the known fields, normalised (dates as \`Date\`, \`null\` vs absent decided), and throw errors with a path like \`user.tags[1]\` so failures are debuggable.

**Complementary:** generate types from the OpenAPI or GraphQL schema so the *expected* shape stays in sync with the backend. Generated types are still compile-time only, though, so I'd keep runtime validation for anything untrusted or third-party.

**Trade-off:** validation costs some bundle size and CPU; for very large payloads you can validate selectively, but the boundary is where trust gets established.`,
      followUps: [
        'What is wrong with `const user = (await res.json()) as User`?',
        'How do schema libraries keep the type and the validator in sync?',
        'Where in a React app should validation happen?',
      ],
      minutes: 2,
    },
    {
      id: 'strict-flags',
      kind: 'concept',
      question: 'Which compiler options would you enable on a new TypeScript + React project, and why?',
      answer: `**One-liner:** \`strict: true\` as the baseline, plus \`noUncheckedIndexedAccess\`, and module settings that match a bundler-based toolchain.

**\`strict\`** turns on the family that makes TypeScript worth using: \`strictNullChecks\` (null and undefined become explicit — the single biggest bug catcher), \`noImplicitAny\`, \`strictFunctionTypes\` (sound callback parameter checking), \`useUnknownInCatchVariables\`, \`strictPropertyInitialization\` and more.

**\`noUncheckedIndexedAccess\`:** array and record lookups return \`T | undefined\`, so \`items[0].name\` on an empty list becomes a compile error instead of a production crash. It adds friction in index-based loops; \`for…of\` avoids most of it.

**For a Vite/esbuild setup:** \`isolatedModules\` (or \`verbatimModuleSyntax\`), because files are transpiled one at a time and the flag reports constructs a per-file transpiler can't handle; \`moduleResolution: "bundler"\`; \`noEmit\`, since the bundler emits; \`jsx: "react-jsx"\`.

**Hygiene:** \`noUnusedLocals\`/\`noUnusedParameters\` (or leave that to ESLint) and \`noFallthroughCasesInSwitch\`.

**Optional:** \`exactOptionalPropertyTypes\` distinguishes a missing property from one explicitly set to \`undefined\` — valuable for spreads and PATCH payloads, but many libraries' types aren't ready for it.

**On an existing codebase** I'd enable flags incrementally — one flag at a time, or per-directory configs — rather than a big-bang migration.`,
      followUps: [
        'What does strictNullChecks change, concretely?',
        'Why does Vite need isolatedModules?',
        'How would you migrate a large codebase to strict?',
      ],
      minutes: 2,
      level: 'senior',
    },
  ],
};

export default day;
