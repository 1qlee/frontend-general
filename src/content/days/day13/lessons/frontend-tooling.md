## Why interviewers ask

*"How does Vite work?"*, *"Why pnpm?"*, *"Walk me through your CI pipeline."*, *"Tree shaking didn't remove this library. Why?"* Tooling questions separate people who use a template from people who can **own the build**. Strong answers explain the *mechanism* (what the tool does, step by step) and the *trade-off* (what it costs and when you'd choose something else). You don't need to know every flag. You need a correct mental model and the right vocabulary.

## How Vite works

Vite has two modes that use different engines.

### Development: native ES modules, on demand

- Browsers understand `<script type="module">` and `import`. Vite's dev server serves your **source files as ES modules**. The browser requests each import, and Vite transforms each file **when it is requested**: TypeScript and JSX become JavaScript (esbuild in Vite ≤ 7), CSS and assets are handled, and bare imports are rewritten (`'react'` becomes `/node_modules/.vite/deps/react.js?v=…`).
- **Startup time doesn't grow with the app.** Only modules the current page actually imports are transformed. A webpack dev server has to **build the whole bundle first**, so cold start and rebuilds get slower as the app grows.
- **Dependency pre-bundling** runs on the first start and whenever the lockfile changes. esbuild bundles each dependency into a single ESM file. This (1) converts CommonJS/UMD packages to ESM and (2) collapses packages made of hundreds of internal modules (`lodash-es` has about 600) into one request. The result is cached in `node_modules/.vite` and served with `Cache-Control: max-age=31536000, immutable`. Your own source files are revalidated with `304 Not Modified`.
- **HMR** works over a WebSocket. When you save a file, Vite invalidates that module and walks up the import graph to the nearest **HMR boundary**, a module that accepts updates. React components become boundaries through Fast Refresh in `@vitejs/plugin-react`. The browser re-imports just that module and component state is preserved. Update speed doesn't depend on app size.

### Production: a real bundle

Unbundled ESM in production would mean **request waterfalls**: the browser discovers imports level by level, and there are no cross-module optimisations. So `vite build` bundles. In Vite ≤ 7 it uses **Rollup**, which provides tree shaking, code splitting at dynamic `import()` points, content-hashed filenames, CSS extraction, asset handling and minification. The output is static files ready for any CDN, and `vite preview` serves them locally.

**The trade-off and where it's going.** Dev (esbuild plus native ESM) and build (Rollup) are different pipelines, which occasionally causes "works in dev, breaks in the build" bugs (CommonJS interop, plugin differences). The Vite team's answer is **Rolldown**: a Rust bundler with a Rollup-compatible plugin API, built on the **Oxc** toolchain. It replaces *both* esbuild and Rollup with one engine and is dramatically faster. It is available as `rolldown-vite` and is the default bundler in **Vite 8**. Check which version a project is on before you answer questions about its internals.

Two practical notes:

- **Vite does not type-check.** It strips types and moves on. Run `tsc --noEmit` (or `tsc -b`) in CI and your editor, or add `vite-plugin-checker` if you want type errors in the dev overlay.
- Only `VITE_`-prefixed variables are exposed through `import.meta.env`, and **everything in the client bundle is public**. Secrets never go there (Day 12).

> [!INTERVIEW] Say it like this
> "webpack bundles the whole app before it can serve anything, so dev startup and rebuilds grow with the codebase. Vite serves source files as native ES modules and transforms them on demand. It pre-bundles dependencies once with esbuild, and HMR swaps a single module, so it stays fast as the app grows. For production it still bundles, with Rollup today and Rolldown going forward, because unbundled ESM would be a request waterfall."

## Bundlers compared

| Tool | Written in | Where you meet it | Strengths | Trade-offs |
|---|---|---|---|---|
| **webpack** | JS | Large existing apps, Module Federation setups | Most configurable; huge loader/plugin ecosystem; Module Federation | Slow; complex config |
| **Rollup** | JS | Vite's production build (≤ 7), library builds | Clean ESM output; excellent tree shaking | Slower than native tools |
| **esbuild** | Go | Vite dev transforms and pre-bundling, tsup, minifiers | Extremely fast transpile, bundle and minify | Small plugin API; limited chunking control |
| **Rspack** | Rust | Migrating big webpack apps (with Rsbuild on top) | webpack-compatible config and most loaders/plugins, far faster | Not every webpack plugin works |
| **Turbopack** | Rust | Next.js, where it is the default bundler from Next 16 | Incremental computation with fine-grained caching | Built for Next.js |
| **Rolldown** | Rust | Vite 8 / `rolldown-vite`, tsdown | Rollup API compatibility at esbuild-class speed | Newest; ecosystem still settling |

A defensible summary: *Vite for most SPAs and frameworks (React Router, Vue, Svelte, Astro); Next.js comes with Turbopack; Rspack is the low-risk path off a large webpack app; esbuild, tsup or tsdown for libraries and scripts.*

## Transpilers, and why `isolatedModules`

| Tool | Type-checks? | Notes |
|---|---|---|
| **tsc** | **Yes**, the only one | Also emits `.d.ts`. Slow as a transpiler. A Go-native port (TypeScript 7) promises large speed-ups |
| **Babel** | No | Biggest plugin ecosystem (the React Compiler ships as a Babel plugin); slowest |
| **SWC** | No | Rust; used by Next.js, `@vitejs/plugin-react-swc`, Rspack |
| **esbuild** | No | Go; Vite ≤ 7 dev transforms |
| **Oxc** | No | Rust; powers Rolldown/Vite 8 transforms and the oxlint linter |

Everything except `tsc` transpiles **one file at a time without the type system**: it deletes type syntax and emits the rest. Some TypeScript code can't be compiled that way, because emitting it correctly needs information from *another* file:

```ts
// types.ts
export interface User { id: string; name: string }

// index.ts
export { User } from './types';          // ❌ Is User a value or a type? A single-file transpiler can't know.
                                         //    If it keeps the re-export, the runtime import fails.
export type { User } from './types';     // ✅ Explicitly type-only, so it's erased
import { type User, fetchUser } from './api'; // ✅ inline `type` modifier
```

Other examples are `const enum`s used across files (the values must be inlined from another file) and merged namespaces. **`isolatedModules: true`** makes `tsc` report an error for any code a per-file transpiler can't handle. **`verbatimModuleSyntax: true`** (TS 5.0+) is the stricter modern replacement: imports and exports without `type` are always kept and ones with `type` are always dropped, so what you write is what gets emitted. **`erasableSyntaxOnly`** (TS 5.8) goes further for Node's built-in type stripping. It bans enums, namespaces with runtime code and constructor parameter properties, which are syntax that can't simply be erased. Day 4 covers these flags in the wider tsconfig context.

> [!MISTAKE]
> "Vite compiles our TypeScript, so the build catches type errors." It doesn't. esbuild and Oxc only strip types, so `vite build` succeeds with type errors. Without a separate `tsc --noEmit` (or `tsc -b`) step in CI, they ship.

## tsconfig: apps vs. libraries

An **application** bundled by Vite only needs `tsc` as a checker:

```jsonc
// tsconfig.app.json (Vite's react-ts template splits app and Node configs; build with tsc -b)
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",   // resolve like Vite: package "exports", no file extensions needed
    "jsx": "react-jsx",
    "noEmit": true,                   // the bundler emits; tsc only checks
    "verbatimModuleSyntax": true,     // (or isolatedModules) so esbuild/SWC/Oxc output is correct
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,             // don't type-check node_modules .d.ts files
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

A **library** published to npm has to produce types that work for *every* consumer:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",            // resolve and emit exactly as Node will for consumers
    "moduleResolution": "NodeNext",  // (relative imports then need explicit .js extensions)
    "declaration": true,             // ship .d.ts files
    "declarationMap": true,          // "go to definition" lands in your source, not dist
    "isolatedDeclarations": true,    // TS 5.5: .d.ts can be generated per file (fast, parallel); needs explicit export types
    "verbatimModuleSyntax": true,
    "strict": true,
    "outDir": "dist"
  }
}
```

Library extras: an `"exports"` map in `package.json` with the `"types"` condition first, `"type": "module"`, `"sideEffects": false` when true, `"files": ["dist"]`, and React as a **peer** dependency. Validate the package with `publint` and `@arethetypeswrong/cli` before publishing. Tools such as tsdown, tsup and unbuild handle the build. Avoid `moduleResolution: "bundler"` in a library, because the types might then only resolve for consumers who use bundlers.

## Linting and formatting

### ESLint flat config

ESLint 9 made **flat config** (`eslint.config.js`) the default, and the legacy `.eslintrc*` format is gone in ESLint 10. A flat config is a plain exported array of config objects. Each one can be scoped with `files` and `ignores`, and plugins are imported as ordinary JS modules instead of being resolved from strings:

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked, // type-aware rules
      reactHooks.configs.flat.recommended,     // rules-of-hooks, exhaustive-deps, React Compiler checks (v7 config name)
      reactRefresh.configs.vite,               // components-only exports keep Fast Refresh working
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    extends: [testingLibrary.configs['flat/react']], // e.g. prefer-screen-queries, no-unnecessary-act
  },
]);
```

**typescript-eslint**'s type-aware rules are where linting earns its keep: `no-floating-promises` (an un-awaited promise whose rejection disappears), `no-misused-promises` (an `async` function passed where a `void` callback is expected), `switch-exhaustiveness-check` and `await-thenable`. The cost is speed, because the linter has to build a TypeScript program. `projectService: true` (typescript-eslint v8) finds the right tsconfig for each file automatically.

Linting is not formatting. ESLint deprecated its stylistic rules (they moved to `@stylistic`), and formatting belongs to a formatter.

### Prettier vs. Biome

| | Prettier | Biome |
|---|---|---|
| Scope | Formatter only; pair it with ESLint and `eslint-config-prettier` | Formatter **and** linter (plus import sorting) in one Rust binary |
| Speed | Fine for most repos | Much faster |
| Output | The reference | Very close to Prettier's output (designed for compatibility) |
| Ecosystem | Many plugins (e.g. Tailwind class sorting) | Fewer lint rules than ESLint's ecosystem; Biome 2 added GritQL plugins and some type-aware rules that don't need tsc |
| Choose when | You want maximum ecosystem and familiarity | Greenfield, speed, fewer dependencies, one config file |

**oxlint** (from the Oxc project) is another very fast linter. Teams often run it before, or alongside, a slimmer ESLint setup. The interview point isn't which tool you pick. It's that formatting is **automated** (format on save, a `--check` step in CI, staged-file hooks with lint-staged or lefthook), so code review never argues about style.

## Package managers

- **npm** ships with Node and writes `package-lock.json`. It **hoists** dependencies into a flat `node_modules`, so your code can import anything that happens to be hoisted.
- **Yarn** comes as Classic (v1, maintenance only) or Berry (v2+). Berry's Plug'n'Play mode has no `node_modules` at all: a `.pnp.cjs` map resolves every import, and "zero-installs" can commit the cache. It can also use a classic `node-modules` linker.
- **pnpm** keeps a **content-addressable store**: every file of every package version is stored once per machine, keyed by its content hash. Projects get **hard links** into `node_modules/.pnpm/…`, and the top level of `node_modules` contains only **symlinks to the dependencies you declared**:

```text
node_modules/
├── react -> .pnpm/react@19.2.0/node_modules/react     ← declared: visible
├── vite  -> .pnpm/vite@7.1.0/node_modules/vite        ← declared: visible
└── .pnpm/
    ├── react@19.2.0/node_modules/react/                ← hard links into the global store
    ├── vite@7.1.0/node_modules/{vite, rollup -> …}     ← vite can see rollup…
    └── rollup@4.50.0/node_modules/rollup/              ← …your code can't
```

The result is fast installs, big disk savings across projects and **strictness**: your code can only import what your `package.json` declares.

A **phantom dependency** is a package your code imports without declaring it, which works only because something else pulled it in and npm hoisted it. It breaks without warning when that other package drops it or changes its version. pnpm fails immediately with "Cannot find module", and the fix is to declare the dependency.

> [!MISTAKE]
> "pnpm broke our build, so we turned on `shamefully-hoist`." pnpm didn't break anything. It exposed imports that were never declared. `public-hoist-pattern` and `shamefully-hoist` exist for old tools that assume a flat layout, not to bring phantom dependencies back.

**Lockfiles** record the exact resolved version and integrity hash of every package in the tree, which makes installs reproducible. Commit them, and use frozen installs in CI: `npm ci`, `pnpm install --frozen-lockfile` (pnpm's default in CI) or `yarn install --immutable`. Use one package manager per repo, recorded in the `packageManager` field of `package.json`.

**Supply chain (Day 12).** pnpm 10 no longer runs dependencies' lifecycle scripts (`postinstall`) unless you allow them (`pnpm approve-builds` / `onlyBuiltDependencies`). Recent versions can also refuse versions published too recently (`minimumReleaseAge`), which blunts compromised releases that usually get pulled within hours.

**Workspaces.** A `pnpm-workspace.yaml` lists the package globs. Internal dependencies use the `workspace:*` protocol, which links the local package and is replaced by the real version on publish. pnpm **catalogs** define a dependency version once (`react: "catalog:"`) for the whole repo. `pnpm --filter @acme/web... build` builds a package and its dependencies, and `pnpm -r test` runs a script in every package.

## Monorepos

**Pros:** atomic changes across an app and its shared libraries in one PR; one version policy for dependencies and tooling config; easier large refactors; code sharing without publishing; one CI setup.
**Cons:** CI time grows unless you cache and run only what changed; more tooling to learn; easy coupling (anything can import anything unless you enforce boundaries); ownership and permissions need CODEOWNERS; big clones; and versioning work if you publish packages.

Workspaces *link* packages. A **task runner** understands the package graph and runs tasks in the right order, in parallel and cached:

```json
// turbo.json (Turborepo 2.x)
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

- **`"^build"`** means "run `build` in this package's workspace *dependencies* first". That is a topological order over the package graph. Without the caret it refers to a task in the *same* package.
- **Caching:** Turborepo hashes each task's inputs (the package's files, declared environment variables, the hashes of its dependencies, the task config). If the hash has been seen before, it **replays the logs and restores `outputs`** instead of running the task. A **remote cache** shares those results between CI and teammates.
- **Affected-only runs:** `turbo run test --affected` (or `nx affected -t test`) runs tasks only for changed packages and their dependents.

**Nx** offers the same core (project graph, caching, affected) plus code generators, module-boundary lint rules (`@nx/enforce-module-boundaries`) and distributed execution across CI machines. It has more features and more opinions. Turborepo is a thin layer on top of package-manager workspaces.

Here is how a runner turns the graph into parallel waves:

```ts run
// Scheduling `build` with dependsOn: ["^build"]: a package is ready when all of its
// workspace dependencies are built, and everything in one wave can run in parallel.
const graph: Record<string, string[]> = {
  web: ['ui', 'api-client'],
  docs: ['ui'],
  ui: ['tokens', 'utils'],
  'api-client': ['utils'],
  tokens: [],
  utils: [],
};

const pending = new Map(Object.entries(graph).map(([pkg, deps]) => [pkg, new Set(deps)]));
const waves: string[][] = [];
while (pending.size > 0) {
  const ready = [...pending].filter(([, deps]) => deps.size === 0).map(([pkg]) => pkg).sort();
  if (ready.length === 0) throw new Error(`Cycle among: ${[...pending.keys()].join(', ')}`);
  waves.push(ready);
  for (const pkg of ready) pending.delete(pkg);
  for (const deps of pending.values()) for (const pkg of ready) deps.delete(pkg);
}
waves.forEach((wave, i) => console.log(`wave ${i + 1}: ${wave.join(', ')}`));
```

{{quiz:turbo-caret-dependson}}

## A frontend CI/CD pipeline

The principle: **cheap, fast checks first** so failures surface early; expensive browser tests last; independent jobs in parallel; one build artifact promoted through environments.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4                 # pnpm version from "packageManager"
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint                             # eslint + prettier --check (or biome ci)
      - run: pnpm typecheck                        # tsc -b: Vite won't do this for you
      - run: pnpm vitest run --coverage            # unit + integration
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist }

  e2e:
    needs: verify
    runs-on: ubuntu-latest
    strategy:
      matrix: { shard: [1, 2, 3] }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - run: pnpm exec playwright install --with-deps
      - run: pnpm exec playwright test --shard=${{ matrix.shard }}/3
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with: { name: playwright-report-${{ matrix.shard }}, path: playwright-report }
```

The stages, in words:

1. **Install** with a frozen lockfile and a cached store.
2. **Lint and format check.**
3. **Type-check.**
4. **Unit and integration tests**, with coverage reported (and thresholds on critical packages if you use them).
5. **Build**, plus a **bundle-size budget** check (Day 10).
6. **E2E** against the built app (`vite preview`) or a preview deployment, sharded, with traces uploaded on failure.
7. **Preview deploy per PR** (Vercel, Netlify, Cloudflare Pages…), so reviewers, designers and PMs can click through the real change. Run smoke tests against it.
8. **Merge to main → production deploy** of the same artifact, with source maps uploaded to error monitoring, the release tagged, feature flags for risky changes and a one-click rollback.

Around it: required status checks and branch protection, Renovate or Dependabot for updates, and in a monorepo, affected-only runs plus a remote cache to keep CI time flat as the repo grows.

## Semver and Changesets

**Semantic versioning** is `MAJOR.MINOR.PATCH`: breaking change, backwards-compatible feature, bug fix.

| Range | Means | Allows |
|---|---|---|
| `1.4.2` | exactly | `1.4.2` |
| `~1.4.2` | `>=1.4.2 <1.5.0` | patches |
| `^1.4.2` | `>=1.4.2 <2.0.0` | minors and patches (npm's default when saving) |
| `^0.4.2` | `>=0.4.2 <0.5.0` | 0.x is "initial development", so the *minor* is treated as breaking |
| `^0.0.3` | `>=0.0.3 <0.0.4` | nothing else |

Prereleases (`2.0.0-beta.1`) sort **before** their release and are only matched by ranges that explicitly opt into that version. Ranges decide what an install *may* pick, and the lockfile records what it *did* pick. You'll implement this logic in today's exercises.

{{quiz:caret-zero-range}}

**Changesets** handle versioning and changelogs for monorepos that publish packages:

1. In your PR, run `pnpm changeset`, pick the packages and bump types, and write a one-line summary. That commits a file like this:

   ```md
   ---
   '@acme/ui': minor
   '@acme/tokens': patch
   ---

   Add a `loading` state to Button; fix the focus-ring token contrast.
   ```

2. On `main`, the Changesets GitHub Action keeps a **"Version Packages" PR** open. It runs `changeset version`, which bumps versions, updates internal dependents, writes `CHANGELOG.md` entries and deletes the consumed changeset files.
3. Merging that PR runs `changeset publish`, which publishes to npm and creates git tags.

Alternatives: **semantic-release** and **release-please** derive the bump from Conventional Commit messages (`fix:`, `feat:`, `feat!:`). Changesets keep the release intent explicit and human-written per PR, which works well in monorepos.

## Source maps and error monitoring

Production code is bundled and minified, so a raw stack trace looks like `at e (index-4f2a1c.js:1:48213)`. A **source map** (a `.map` JSON file with VLQ-encoded mappings) maps each generated position back to the original file, line, column and name.

```ts
// vite.config.ts
export default defineConfig({
  build: { sourcemap: 'hidden' }, // generate .map files, but no //# sourceMappingURL comment
});
```

- `true`: maps are generated *and* referenced, so anyone's devtools can load your original source.
- `'hidden'`: maps are generated but not referenced. Upload them to your error monitor and don't deploy them (or delete them after upload).
- `'inline'`: the map is embedded in the bundle as a data URI. Development only.

**Error monitoring** (Sentry, Datadog RUM, Bugsnag…): the SDK captures unhandled errors (`window.onerror`, `unhandledrejection`) and errors caught by error boundaries. React 19's `createRoot(container, { onCaughtError, onUncaughtError, onRecoverableError })` gives you hooks for reporting. Each event is tagged with a **release** (usually the git SHA) and an environment. The build uploads the source maps for that release, for example with `@sentry/vite-plugin`, which can delete the maps afterwards. Stack traces then show your real code. Add context: route, breadcrumbs and an anonymous user ID (no PII). Alert on new issues and on regressions right after a deploy, and correlate them with Web Vitals (Day 10).

## Key takeaways

- **Vite:** in dev it serves native ESM, transforms on demand, pre-bundles dependencies with esbuild and does module-level HMR. In production it bundles with Rollup (Rolldown in Vite 8). It never type-checks.
- **Bundlers:** webpack (configurable, slow), Rollup (libraries, clean ESM), esbuild (speed), Rspack (webpack-compatible Rust), Turbopack (Next.js), Rolldown (Vite's future).
- **Transpilers** other than `tsc` work per file without types. Use **`isolatedModules` / `verbatimModuleSyntax`** and `import type`.
- **tsconfig:** apps use `moduleResolution: "bundler"` with `noEmit`; libraries use `NodeNext`, declarations and an `exports` map.
- **ESLint flat config** with typescript-eslint's type-aware rules and react-hooks; a formatter (Prettier or Biome), automated.
- **pnpm:** content-addressable store, hard links, symlinks only for declared dependencies, so **no phantom dependencies**. Commit lockfiles and use frozen installs in CI.
- **Monorepos:** `dependsOn: ["^build"]`, content-hash caching, affected-only runs.
- **CI:** install → lint → typecheck → test → build → e2e → preview deploy → promote. **Semver** ranges plus **Changesets** for releases. **Hidden source maps** uploaded to error monitoring.
