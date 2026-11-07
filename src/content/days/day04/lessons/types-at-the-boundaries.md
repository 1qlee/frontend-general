## Why interviewers ask this

"How do you know the API response actually matches your `User` type?" is one of the best TypeScript interview questions, because the honest answer for many codebases is "we don't". Day 3 gave you the rule — treat outside data as `unknown`, narrow it with guards, and remember a type predicate is trusted, not verified. Today is the **app-scale** version interviewers probe for senior roles: where exactly `any` leaks in, why parsers beat validators, how schema libraries derive types (using the type-level tools from lesson 1), how to declare the things TypeScript can't see (globals, env vars, untyped modules), and which tsconfig flags make a React + Vite project safe.

## Types are erased: the boundary problem

TypeScript checks the code you write. It knows nothing about data that arrives at runtime:

- `fetch` responses — `Response.json()` returns `Promise<any>`
- `JSON.parse` — returns `any`
- `localStorage`, `sessionStorage`, cookies, URL/search params, `postMessage`, WebSocket messages
- environment variables, feature-flag payloads, third-party scripts, untyped JS libraries

`any` is contagious: assign it to a typed variable and the compiler simply believes you.

```ts run
interface Order {
  id: string;
  total: number;
  createdAt: Date;
}

const body = JSON.stringify({ id: 'o_1', total: '19.99', createdAt: new Date('2024-05-01T10:00:00Z') });

const order: Order = JSON.parse(body); // ✅ compiles — JSON.parse returns any
console.log(typeof order.total, typeof order.createdAt); // string string — both types lied

console.log('total + tax =', order.total + 1.5); // string concatenation, not addition
try {
  console.log(order.createdAt.getFullYear());
} catch (e) {
  console.log('TypeError:', (e as Error).message);
}
```

Two classic bugs in one snippet: JSON has **no `Date` type** (dates arrive as strings), and a server that sends a number as a string type-checks fine and silently breaks arithmetic.

The same lie hides in "typed" fetch helpers:

```ts
async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json(); // any → T: nothing was checked
}
const user = await getJSON<User>('/api/me'); // looks safe, is a cast
```

As Day 3 put it: a type parameter that appears **only in the return type** is an unchecked assertion with nicer syntax.

{{quiz:l3-json-any}}

## `unknown` at the edge, narrowing inside

Quick recap from Day 3: `unknown` accepts any value but lets you do nothing with it until you narrow; `any` switches checking off in both directions and spreads. Two boundary-specific details:

- `strict` makes `catch` variables `unknown` (`useUnknownInCatchVariables`, TS 4.4) — anything can be thrown, not just `Error`s. Write one helper and use it everywhere:

```ts run
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error) ?? String(error); // JSON.stringify(undefined) returns undefined!
  } catch {
    return String(error); // e.g. a circular object
  }
}

for (const thrown of [new TypeError('bad input'), 'plain string', { code: 42 }, undefined]) {
  try {
    throw thrown;
  } catch (e) {
    console.log(errorMessage(e));
  }
}
```

- Since TS 4.9, `'name' in value` narrows an `unknown`-turned-`object` to `object & Record<'name', unknown>`, so hand-written guards (`value is User`) and assertion functions (`asserts value is User`) compile without casts. But — Day 3's warning — the compiler doesn't check that a guard's body matches its claim.

> [!TIP]
> Make "`any` at the boundary" visible: wrap `fetch` once in an API client that returns `unknown` (or validated data), and lint against `any` (`@typescript-eslint/no-explicit-any`, `no-unsafe-assignment`, `no-unsafe-member-access`). Then every place that turns `unknown` into a real type is explicit and reviewable.

## Parse, don't validate

The phrase comes from Alexis King's essay of the same name. The difference:

- A **validator** answers yes/no (`isValidUser(x): boolean`). After it returns, the knowledge is gone — the data is still `unknown`/`any`, and the next function has to re-check or cast.
- A **parser** takes less-structured input and returns **more-structured output** or fails: `parseUser(x: unknown): User`. The proof that the data is valid now lives in the **type**, so nothing downstream needs to check again. Parsing is also the right moment to **transform**: string dates to `Date`, snake_case to camelCase, raw IDs to branded IDs.

```ts run
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

interface User {
  id: string;
  name: string;
  role: 'admin' | 'member';
  joinedAt: Date; // a real Date, not the string JSON gave us
}

const ROLES = ['admin', 'member'] as const;
const isRole = (v: unknown): v is User['role'] => (ROLES as readonly unknown[]).includes(v);

function parseUser(input: unknown): Result<User> {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'expected an object' };
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== 'string') return { ok: false, error: 'id: expected string' };
  if (typeof raw.name !== 'string') return { ok: false, error: 'name: expected string' };
  if (!isRole(raw.role)) return { ok: false, error: `role: expected ${ROLES.join(' | ')}` };
  const joinedAt = typeof raw.joined_at === 'string' ? new Date(raw.joined_at) : null;
  if (!joinedAt || Number.isNaN(joinedAt.getTime())) return { ok: false, error: 'joined_at: expected ISO date' };
  return { ok: true, value: { id: raw.id, name: raw.name, role: raw.role, joinedAt } };
}

const fromApi: unknown = JSON.parse('{"id":"u1","name":"Ada","role":"admin","joined_at":"2024-02-01T09:00:00Z","extra":1}');
const parsed = parseUser(fromApi);
if (parsed.ok) console.log(parsed.value.name, parsed.value.joinedAt.getUTCFullYear(), parsed.value);
console.log(parseUser({ id: 'u2', name: 'Bob', role: 'owner', joined_at: '2024-01-01' }));
```

Compare it with Day 3's `parseUser`: same idea, but notice the parser also **transforms** (`joined_at` string → `joinedAt: Date`) and **drops** unknown fields. Hand-writing this for every endpoint is tedious and drifts from the `User` interface — which is exactly what schema libraries fix.

## Schema libraries: one source of truth

With a schema library (zod, Valibot, ArkType…) you write the **runtime schema** once and **infer** the static type from it, so the two can't drift:

```ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
  joinedAt: z.coerce.date(),           // parse + transform the ISO string into a Date
  nickname: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;
// { id: string; name: string; role: 'admin' | 'member'; joinedAt: Date; nickname?: string | undefined }

export async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return UserSchema.parse(await res.json()); // throws a ZodError with a path to the bad field
}
```

How `z.infer` works is today's lesson 1 material: each schema object carries its output type as a generic parameter, `infer` extracts it, and `z.object` uses mapped types (with optional-key handling) to build the object type. **You'll build a mini version of exactly this in today's stretch exercise.**

Practical decisions to talk through:

| Decision | Options |
|---|---|
| **Where** to validate | In the API client / data layer — once, at the edge. Components receive already-typed data. |
| **Failure** handling | `parse` (throw → error boundary / query error state) vs `safeParse` (returns a discriminated union you branch on). Report failures to monitoring; they mean the contract broke. |
| **Strictness** | Strip unknown keys (default in zod) so extra fields don't leak; be *tolerant* where the backend may evolve (e.g. fall back for unknown enum values) so a new server value doesn't take the UI down. |
| **Cost** | Validation runs on every response. Usually negligible; for huge lists, validate the shape you use or sample in production. |
| **Library choice** | zod is the most common; Valibot is modular and much smaller in the bundle; many libraries now implement the shared *Standard Schema* interface, so form and router libraries accept any of them. |

> [!NOTE]
> **Codegen** (OpenAPI → TypeScript, GraphQL Codegen) or end-to-end typed RPC (tRPC) gives you accurate *types* for an API without hand-writing them — but generated types are still compile-time only. They tell you what the server *promises*; runtime validation checks what it *sent*. Many teams combine both: generate schemas from the OpenAPI spec and parse at the edge.

> [!INTERVIEW] Say it like this
> "Types disappear at runtime, so anything crossing a boundary — fetch, JSON.parse, storage, URL params — is really `unknown`. I don't cast it; I parse it at the edge with a schema, so the static type is inferred from the same schema that validates the data. That's 'parse, don't validate': after the parser, the type itself is the proof, and the rest of the app can trust it."

## Declaration files and module augmentation

A `.d.ts` file contains **only types** — no runtime code. Types for a package come from the package itself (`"types"` in its `package.json`), from DefinitelyTyped (`@types/…`), or from declarations you write.

```ts
// src/types/legacy-lib.d.ts — quick escape hatch: everything from the module is `any`
declare module 'legacy-chart-lib';

// Better: declare what you actually use
declare module 'legacy-chart-lib' {
  export interface ChartOptions { type: 'bar' | 'line'; data: number[] }
  export function renderChart(el: HTMLElement, options: ChartOptions): () => void;
}
```

**Non-code imports** need module declarations too. Vite ships them in `vite/client` (CSS modules, images, `?raw`, `?url`), which is why a Vite app has `/// <reference types="vite/client" />` or `"types": ["vite/client"]`. For something Vite doesn't know:

```ts
declare module '*.glsl' {
  const source: string;
  export default source;
}
```

**Globals** (`declare global`): interfaces with the same name **merge**, so you extend `Window` by redeclaring it. The file must be a **module** (have an `import`/`export`), otherwise it is already global and `declare global` is an error:

```ts
// src/types/globals.d.ts
export {};

declare global {
  interface Window {
    analytics?: { track(event: string, props?: Record<string, unknown>): void };
  }
}

// anywhere: window.analytics?.track('signup', { plan: 'pro' });  ✅ typed
```

**Vite environment variables** — type `import.meta.env` by merging into `ImportMetaEnv`:

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Remember that this is a *declaration*, not a check: a missing variable is still `undefined` at runtime. Parse `import.meta.env` once at startup (a schema again) if the app can't run without it. Only `VITE_`-prefixed variables reach client code — and anything in the bundle is public, so never put secrets there.

**Augmenting a library's types** (`declare module 'pkg'` in a file that imports it) adds to its interfaces. A common React example — allowing CSS custom properties in `style`:

```ts
// src/types/react-css-vars.d.ts
import 'react';

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}

// <div style={{ '--gap': '8px' }} />  ✅ (previously: "Object literal may only specify known properties")
```

The `import 'react'` matters: with it the block **augments** the existing module; without it, the file is a global script and `declare module 'react'` would *replace* the module's types.

## tsconfig flags that matter in a React app

| Flag | What it does | Why you want it |
|---|---|---|
| `strict: true` (+ `noUncheckedIndexedAccess`) | The strict family you met on Day 3 (`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `useUnknownInCatchVariables`…) | Non-negotiable baseline; `noUncheckedIndexedAccess` isn't part of `strict` but is worth it in new code. |
| `exactOptionalPropertyTypes` | `a?: string` no longer accepts an explicit `undefined` | Precise (distinguishes "missing" from "undefined"), but noisy with many libraries; opt-in. |
| `moduleResolution: "bundler"` | Resolves like Vite/webpack: `package.json` `exports`, no file extensions required | TS 5.0+. The right choice when a bundler, not Node, loads your code. |
| `module: "ESNext"` (or `"preserve"`, TS 5.4) | Leave `import`/`export` for the bundler | The bundler does module transformation. |
| `jsx: "react-jsx"` | Automatic JSX runtime: compiles to `react/jsx-runtime` calls | No `import React` needed in every file. |
| `isolatedModules: true` | Errors on code that can't be compiled one file at a time | esbuild/SWC/Babel transpile files in isolation (no type info), so constructs like re-exporting a type without `export type` can't be handled. |
| `verbatimModuleSyntax: true` | Imports/exports are emitted exactly as written; type-only imports **must** use `import type` | TS 5.0+. Replaces `importsNotUsedAsValues`/`preserveValueImports`; makes it obvious which imports survive to runtime. |
| `noEmit: true` | `tsc` only type-checks | Vite (esbuild/Rollup) does the emitting. |
| `skipLibCheck: true` | Don't type-check `.d.ts` files in `node_modules` | Faster; avoids errors from conflicting library types. |
| `lib: ["ES2022", "DOM", "DOM.Iterable"]` / `types: ["vite/client"]` | Which built-in and global types exist | Keeps Node globals out of browser code (no accidental `process.env`). |
| `erasableSyntaxOnly` (TS 5.8) | Forbids TS-only runtime syntax: `enum`, `namespace` with code, constructor parameter properties | Code stays strippable by "type stripping" tools (Node's built-in TS support); increasingly enabled in new project templates. |

Two architecture facts interviewers like:

1. **Vite doesn't type-check.** esbuild strips types and moves on, so a type error won't fail `vite dev` or even `vite build` unless your build script runs `tsc -b` first (the official template does: `"build": "tsc -b && vite build"`). Run type-checking in CI and in the editor.
2. The Vite React template uses **project references**: `tsconfig.app.json` (browser code, DOM libs) and `tsconfig.node.json` (`vite.config.ts`, Node types), tied together by a root `tsconfig.json` and built with `tsc -b`. Different code, different environments, different globals.

{{quiz:l3-verbatim}}

## Key takeaways

- Types are erased: `fetch().json()`, `JSON.parse`, storage, URL params and env vars are `unknown` at runtime, whatever you annotate.
- A generic that appears only in a return type (`getJSON<T>()`) is a cast; `as` is a promise you made to the compiler.
- Use `unknown` at the edge and narrow it; `catch` variables are `unknown` under `strict`.
- **Parse, don't validate**: turn `unknown` into a typed (even branded or transformed) value once, at the boundary.
- Schema libraries give one source of truth: runtime schema → inferred type (`z.infer`).
- `.d.ts` files declare types only; augment `Window` with `declare global` (in a module), Vite env with `ImportMetaEnv`, and libraries with `declare module 'pkg'` after importing it.
- React-app tsconfig: `strict`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `isolatedModules`, `verbatimModuleSyntax`, `noEmit`; consider `noUncheckedIndexedAccess`. Vite won't type-check for you.
