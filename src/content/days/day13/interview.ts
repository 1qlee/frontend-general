import type { Flashcard, InterviewQuestion } from '../../types';

export const flashcards: Flashcard[] = [
  {
    id: 'testing-trophy',
    front: 'The **testing trophy**, bottom to top?',
    back: 'Static (TypeScript, ESLint) → unit → **integration** (the widest layer: components with real state and a mocked network) → end-to-end. Confidence per unit of cost peaks at integration.',
  },
  {
    id: 'rtl-query-priority',
    front: 'RTL query priority, and why that order?',
    back: '`getByRole` → `getByLabelText` → `getByPlaceholderText` → `getByText` → `getByDisplayValue` → `getByAltText` / `getByTitle` → `getByTestId`. Query the way users and assistive tech find things, so every query is also an a11y check.',
  },
  {
    id: 'getby-queryby-findby-card',
    front: '`getBy` vs `queryBy` vs `findBy`?',
    back: '`getBy`: must exist now, throws otherwise. `queryBy`: returns `null` if missing, so use it for absence. `findBy`: a promise that retries (default 1000 ms), for elements that appear after async work. All three throw on multiple matches.',
  },
  {
    id: 'user-event-setup',
    front: 'How do you use user-event v14 correctly?',
    back: '`const user = userEvent.setup()` once per test, before `render`, then `await` every call (`await user.click(…)`). With fake timers: `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.',
  },
  {
    id: 'act-warning-meaning',
    front: 'What does the "not wrapped in act(…)" warning usually mean?',
    back: 'A state update (fetch resolved, timer fired) happened when the test wasn\'t waiting for it. Fix: await the final UI with `findBy*` / `waitFor`. Manual `act` is only for updates outside RTL\'s helpers (fake timers, `renderHook` calls).',
  },
  {
    id: 'vi-mock-hoisting-card',
    front: 'Why can\'t a `vi.mock` factory use a `const` declared in the test file?',
    back: '`vi.mock` is **hoisted** above the imports so the mock is registered first. Top-level variables are still uninitialised when the factory runs. Create them with `vi.hoisted(() => …)`.',
  },
  {
    id: 'vi-fn-vs-spyon',
    front: '`vi.fn()` vs `vi.spyOn(obj, \'m\')`?',
    back: '`vi.fn()` creates a new standalone mock (e.g. a callback prop). `vi.spyOn` wraps an existing method, calls through by default, can override it, and can be **restored** with `mockRestore()` / `restoreMocks`.',
  },
  {
    id: 'msw-card',
    front: 'What does MSW do differently from mocking `fetch`?',
    back: 'It intercepts requests at the network layer, so your real request code runs and only the response is fake. The same handlers work in Node tests, the browser and Storybook. Use `server.use()` per test for errors and `onUnhandledRequest: \'error\'`.',
  },
  {
    id: 'web-first-assertions',
    front: 'What is a Playwright **web-first assertion**?',
    back: '`await expect(locator).toBeVisible()` / `toHaveText()` … retries until it passes or the timeout (5 s) expires. `expect(await locator.isVisible()).toBe(true)` checks once and is flaky.',
  },
  {
    id: 'playwright-actionability',
    front: 'What does Playwright check before `click()`?',
    back: 'Actionability: attached, visible, **stable** (not animating), enabled, and receives events (not covered by another element). Hence no sleeps before actions.',
  },
  {
    id: 'playwright-context-isolation',
    front: 'How does Playwright isolate tests?',
    back: 'Each test gets a fresh `BrowserContext` (own cookies, storage and cache), like a new incognito profile. The browser process is shared per worker. Reuse a login via `storageState` from a setup project.',
  },
  {
    id: 'flaky-root-causes',
    front: 'Four most common root causes of flaky UI tests?',
    back: '1. Timing (asserting before the UI is ready, fixed sleeps). 2. State shared between tests or order dependence. 3. Real network or third parties. 4. Time, time zone, locale or randomness. (Plus animations and CI resource contention.)',
  },
  {
    id: 'mutation-testing-card',
    front: 'What is **mutation testing**?',
    back: 'Inject small bugs (`>=` → `>`, delete a line) and re-run the tests. A mutant that survives means your tests didn\'t notice the change. The mutation score is a far better quality signal than coverage. Tool: Stryker.',
  },
  {
    id: 'vite-dev-vs-build',
    front: 'Vite: dev vs production build?',
    back: 'Dev: native ESM served on demand, esbuild transforms, dependency pre-bundling, module-level HMR. Build: a real bundle (Rollup in Vite ≤ 7, Rolldown in Vite 8) with tree shaking, code splitting and hashing. Vite never type-checks.',
  },
  {
    id: 'isolated-modules-card',
    front: 'Why do Vite, SWC and esbuild setups need `isolatedModules` / `verbatimModuleSyntax`?',
    back: 'Those tools transpile **one file at a time without types**. The flag makes `tsc` flag code they can\'t compile correctly, e.g. re-exporting a type without `export type`, or cross-file `const enum`.',
  },
  {
    id: 'pnpm-strictness',
    front: 'How does pnpm prevent **phantom dependencies**?',
    back: 'Packages live in a content-addressable store, hard-linked into `node_modules/.pnpm`. The top level holds symlinks **only** to declared dependencies, so importing an undeclared package fails immediately.',
  },
  {
    id: 'tree-shaking-requirements',
    front: 'What does tree shaking need?',
    back: 'Static ESM `import`/`export` (not CommonJS), a production build with minification, `"sideEffects": false` (or a list) in package.json, and no top-level side effects (or `/*#__PURE__*/` annotations).',
  },
  {
    id: 'turbo-caret-build',
    front: '`"dependsOn": ["^build"]` in turbo.json?',
    back: 'Run `build` in my **workspace dependencies** first (topological order), then mine. Results are cached by a hash of inputs (files, env, dependency hashes), so unchanged packages are restored, not rebuilt.',
  },
  {
    id: 'caret-vs-tilde',
    front: '`^1.4.2` vs `~1.4.2` vs `^0.4.2`?',
    back: '`^1.4.2` = `>=1.4.2 <2.0.0`. `~1.4.2` = `>=1.4.2 <1.5.0`. `^0.4.2` = `>=0.4.2 <0.5.0`, because in 0.x the caret locks the left-most non-zero part.',
  },
  {
    id: 'hidden-source-maps',
    front: 'Why `build.sourcemap: \'hidden\'`?',
    back: 'Maps are generated but the bundle has no `//# sourceMappingURL` comment. Upload them to Sentry or another error monitor (tagged with the release) for readable stack traces, without serving your source publicly.',
  },
];

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: 'what-to-test',
    kind: 'concept',
    level: 'core',
    minutes: 2,
    question: 'How do you decide what to test in a React application?',
    answer: `**One-liner:** I test by **risk** and by **contract**: the behaviours that would hurt most if they broke, tested through the interface a user or caller actually uses.

**How I prioritise:**
1. **Critical journeys** like sign-up, checkout and auth gating. They get integration tests for the component flows plus a few end-to-end tests across the real app.
2. **Complex logic** like parsing, money and date maths, reducers and state machines. That gets fast unit tests focused on boundaries and edge cases.
3. **Anything that has broken before.** Every bug fix starts with a failing regression test.
4. **Accessibility of core flows**, through role-based queries and automated axe checks.

**What a test asserts:** for a component, the contract is what it renders, how it responds to interaction, which callbacks fire with what, and which requests go out. If I can refactor the internals without touching the tests, they're at the right level.

**What I deliberately skip:** implementation details (state variables, which hooks are used), the framework itself, trivial pass-through components, and pixel details. Visual regression covers those if they matter.

**Trade-off:** I'd rather have fewer tests that give real confidence than a 100%-coverage suite that breaks on every refactor. I use coverage to *find* untested risky branches, not as the goal.`,
    followUps: ['What would you never test?', 'How do you test a component that fetches data?', 'Is 100% coverage a good target?'],
  },
  {
    id: 'rtl-philosophy',
    kind: 'concept',
    level: 'core',
    minutes: 2,
    question: 'What is React Testing Library\'s philosophy, and how do you choose which query to use?',
    answer: `**One-liner:** RTL's principle is that *the more your tests resemble the way your software is used, the more confidence they give you*. So it renders into a real DOM and gives you no access to state or component instances.

**In practice:** I find elements the way a user or screen reader would, interact with \`user-event\`, and assert on what's on screen and on callback props.

**Query priority:** \`getByRole\` with an accessible name first, because it covers buttons, links, headings, textboxes and dialogs, and it doubles as an accessibility check. If a screen reader can't find "Save", neither can my test. Then \`getByLabelText\` for form fields (password inputs have no role), then placeholder, text and display value, and \`getByTestId\` only as an escape hatch when there's no accessible handle.

**Variants:** \`getBy\` when the element should be there now, \`queryBy\` to assert absence, \`findBy\` for things that appear after async work. I scope with \`within\` when there are repeated rows.

**Interactions:** \`userEvent.setup()\` per test and \`await\` every call. It fires the full event sequence and respects disabled elements, unlike \`fireEvent\`'s single synthetic event.

**Async:** I wait for the final UI with \`findBy\` or \`waitFor\`. When I see an "act" warning, it means I didn't wait for an update, not that I should wrap more code in \`act\`.`,
    followUps: ['Why is `getByTestId` last?', 'When do you still need `act` manually?', 'Why `user-event` instead of `fireEvent`?'],
  },
  {
    id: 'test-balance',
    kind: 'concept',
    level: 'core',
    minutes: 2,
    question: 'How do you balance unit, integration and end-to-end tests?',
    answer: `**One-liner:** I follow the testing trophy. Static analysis is the base, integration tests are the bulk, unit tests cover pure logic, and a small number of end-to-end tests cover critical journeys.

**Why integration is the bulk:** most frontend bugs are wiring bugs: a prop not passed, a loading state that never shows, an error swallowed. Rendering a feature with its real children, real state and a mocked network (RTL plus MSW) catches those in milliseconds and survives refactors.

**Unit tests** go to code with lots of logic and little wiring: formatters, reducers, validation, date maths. They're cheap, precise, and they document edge cases.

**End-to-end tests** (Playwright) cover the journeys that would cost money or trust if they broke: log in, checkout, the core create-edit-save loop, across real browsers. I keep them few because they're slower and more expensive to keep stable.

**Rules of thumb:**
- Push a test down to the cheapest level that can catch the bug. When an e2e test fails, I add a lower-level test that reproduces it.
- Keep mocks honest with contract tests or schema-generated types, plus a few smoke tests against a real backend.
- Static checks first: \`strict\` TypeScript and type-aware lint rules like \`no-floating-promises\` remove whole categories of tests.

**Example:** a typical product team might have hundreds of component tests running in seconds, unit tests for its domain logic, and 10 to 30 e2e journeys that run on every PR.`,
    followUps: ['When would you invert that balance?', 'Do you run e2e tests against a real backend?', 'How do you keep the e2e suite fast?'],
  },
  {
    id: 'flaky-tests',
    kind: 'debugging',
    level: 'senior',
    minutes: 3,
    question: 'A UI test is flaky in CI. How do you diagnose and fix it?',
    answer: `**One-liner:** make it reproducible, collect evidence, classify the root cause, fix that cause, and quarantine with an owner if I can't fix it now. Retries are never the fix.

**1. Reproduce.** I run it many times: Playwright \`--repeat-each=30 --retries=0\` or Vitest \`--sequence.shuffle\`. I run it alone versus in the full suite (order dependence) and with one worker versus many (shared state, contention).

**2. Evidence.** Traces on retry, screenshots and video on failure, CI logs. Does it always fail at the same assertion?

**3. Classify and fix.** It's almost always one of these:
- **Timing:** asserting before the UI is ready, or fixed sleeps. Fix with web-first assertions and \`findBy*\`, waiting for a signal rather than a duration.
- **Shared state:** module-level caches, a shared QueryClient, un-restored mocks or fake timers, two tests using the same user account. Fix with fresh state per test and unique test data.
- **Network:** real third-party calls. Mock at the boundary with MSW or \`page.route\`.
- **Time and environment:** dates, time zones, locale, randomness, animations. Control the clock, set \`TZ\`, seed data, disable motion.

**4. Quarantine** if needed: tag or skip it with a ticket and an owner, and track the flake rate.

**Why it matters:** a flaky suite trains people to re-run and ignore red builds. And sometimes the "flaky test" has found a **real race in the product**, which is why blanket retries are dangerous. Playwright reports pass-on-retry tests as flaky so you can track them, not to make them go away.`,
    followUps: ['What would you put in a lint config to prevent flakiness?', 'Tell me about a flaky test you fixed.', 'Are retries ever acceptable?'],
  },
  {
    id: 'vite-vs-webpack',
    kind: 'concept',
    level: 'core',
    minutes: 2,
    question: 'How does Vite differ from webpack?',
    answer: `**One-liner:** webpack bundles the entire app before it can serve anything. Vite serves your source files as native ES modules in development and only bundles for production.

**Dev server:**
- Vite transforms each file **on request**: TS and JSX via esbuild (or Oxc in Vite 8), with no type-checking. Startup cost depends on what the current page imports, not on the size of the app.
- Dependencies are **pre-bundled once** with esbuild. CommonJS packages are converted to ESM, and many-file packages like lodash-es become a single request. The result is cached with immutable headers.
- **HMR** invalidates just the changed module up to the nearest boundary (React Fast Refresh), so update speed is independent of app size. webpack has to rebuild the affected chunks.

**Production:** Vite still bundles, because unbundled ESM would cause request waterfalls. Vite ≤ 7 uses Rollup for tree shaking, code splitting and hashing. Vite 8 replaces both esbuild and Rollup with **Rolldown**, a Rust bundler with a Rollup-compatible API, which also removes the dev/prod mismatch.

**Trade-offs:** webpack is more configurable, has a huge loader ecosystem and Module Federation, and big existing apps depend on it. Rspack is the low-risk faster path for those. Vite's two pipelines can occasionally behave differently between dev and build. And Vite doesn't type-check, so \`tsc --noEmit\` runs separately in CI.`,
    followUps: ['What is dependency pre-bundling for?', 'Why not ship unbundled ESM to production?', 'How would you migrate a large webpack app?'],
  },
  {
    id: 'tree-shaking',
    kind: 'concept',
    level: 'core',
    minutes: 2,
    question: 'What does tree shaking need in order to work, and why does it sometimes fail?',
    answer: `**One-liner:** tree shaking is dead-code elimination based on **static ES module structure**. The bundler proves which exports are never imported and drops them, so it only works when that proof is possible.

**What it needs:**
1. **ESM syntax** in both your code and the library: static \`import\` and \`export\`. CommonJS (\`require\`, \`module.exports\`) is dynamic, so bundlers keep the whole module.
2. **A production build with minification.** The bundler marks unused exports and the minifier removes them.
3. **Side-effect information.** If importing a module might do something (patch a global, inject CSS), it can't be dropped even if nothing is used from it. Libraries declare \`"sideEffects": false\` (or list the files that do have side effects, such as CSS) in \`package.json\`.
4. **Pure top-level code.** A top-level call such as \`const Button = styled(…)\` or \`forwardRef(…)\` might have side effects, so tools need \`/*#__PURE__*/\` annotations to drop it.

**Common reasons it fails:** a CJS-only dependency, a Babel config that converts ESM to CJS before bundling, missing \`sideEffects\`, barrel files that re-export modules with side effects, and \`import * as utils\` used with dynamic property access.

**How I verify:** a bundle analyser (\`rollup-plugin-visualizer\`, \`source-map-explorer\`) and a size budget in CI. Day 10 covers bundle size and splitting from the performance side.`,
    followUps: ['What does `"sideEffects": false` actually promise?', 'Are barrel files bad?', 'How do you check what ended up in your bundle?'],
  },
  {
    id: 'pnpm-vs-npm',
    kind: 'concept',
    level: 'core',
    minutes: 2,
    question: 'Why would you choose pnpm over npm?',
    answer: `**One-liner:** pnpm is faster and far more disk-efficient, and its strict \`node_modules\` layout stops you from importing packages you never declared.

**How it works:** every file of every package version lives once in a global **content-addressable store**, keyed by hash. Projects get hard links into \`node_modules/.pnpm\`, and the top level of \`node_modules\` contains **symlinks only to your declared dependencies**.

**Why that matters:**
- **No phantom dependencies.** npm hoists transitive dependencies to the top, so \`import 'lodash'\` can work by accident until some other package drops it. pnpm fails immediately, so the dependency gets declared.
- **Speed and disk:** a package already in the store is linked, not downloaded or copied. That's a big win in monorepos and on CI with a cached store.
- **Workspaces:** \`workspace:*\` links, \`--filter\` to run tasks for a package and its dependencies, and catalogs to keep versions consistent across packages.
- **Supply-chain defaults:** pnpm 10 doesn't run dependencies' \`postinstall\` scripts unless you approve them.

**Trade-offs:** some older tools assume a hoisted layout and need \`public-hoist-pattern\` (or, as a last resort, \`shamefully-hoist\`). Symlinks occasionally confuse tooling such as some React Native setups. And the team has to standardise, so I'd pin the \`packageManager\` field.

Whatever the manager: commit the lockfile and use frozen installs in CI (\`pnpm install --frozen-lockfile\`, \`npm ci\`).`,
    followUps: ['What is a phantom dependency?', 'What does a lockfile guarantee?', 'How does Yarn Plug\'n\'Play differ?'],
  },
  {
    id: 'monorepo-tradeoffs',
    kind: 'system-design',
    level: 'senior',
    minutes: 3,
    question: 'What are the pros and cons of a monorepo for frontend teams, and what tooling makes it work?',
    answer: `**One-liner:** a monorepo trades repository simplicity for **atomic changes and shared tooling**, and it only scales with a task runner that understands the package graph, caches results and runs only what changed.

**Pros:**
- **Atomic changes.** Change the design system and every app that uses it in one PR, with one CI run proving they still work together.
- **One version policy** for React, TypeScript and lint configs, so no "works with ui@3.2 but not 3.4" drift.
- **Code sharing without publishing** (\`workspace:*\`) and easier large refactors.

**Cons:**
- **CI time** grows with the repo unless you use caching and affected-only runs.
- **Coupling.** Anything can import anything unless you enforce boundaries (Nx module-boundary rules, \`exports\` maps, lint rules).
- **Ownership** needs CODEOWNERS; clones are bigger; publishing packages needs versioning discipline.

**Tooling:**
- **Package-manager workspaces** (pnpm) for linking.
- A **task runner**, Turborepo or Nx, with \`dependsOn: ["^build"]\` for topological order, **content-hash caching** (local plus remote, shared by CI and developers), and \`--affected\` to run only changed packages and their dependents. Nx adds generators, boundary enforcement and distributed execution.
- **Changesets** for versioning and changelogs if packages are published.

**When I wouldn't:** separate teams with independent release cycles and little shared code, or very different stacks. There, the coordination cost buys little.`,
    followUps: ['How does remote caching decide a task can be skipped?', 'How do you stop apps importing each other\'s internals?', 'How do you version packages in a monorepo?'],
  },
  {
    id: 'frontend-ci-pipeline',
    kind: 'system-design',
    level: 'senior',
    minutes: 3,
    question: 'Walk me through the CI/CD pipeline you would set up for a React application.',
    answer: `**One-liner:** cheap, fast checks first so failures surface in a minute or two; browser tests last; every PR gets a preview deployment; and the artifact that passed is the one that ships.

**On every pull request:**
1. **Install** with a frozen lockfile and a cached store (\`pnpm install --frozen-lockfile\`).
2. **Lint and format check:** ESLint with type-aware rules, plus Prettier or Biome in check mode.
3. **Type-check** with \`tsc -b\`, because Vite doesn't type-check.
4. **Unit and integration tests** with Vitest, RTL and MSW, with coverage reported (thresholds only on critical packages).
5. **Build**, plus a **bundle-size budget** so regressions fail the PR.
6. **E2E** with Playwright against the built app or the preview URL, sharded across machines, with traces and reports uploaded on failure.
7. **Preview deployment** so reviewers, designers and PMs click through the real change, with an automated a11y scan and smoke tests against it.

Steps 2–4 can run as parallel jobs. In a monorepo, Turborepo or Nx runs only affected packages, and a remote cache keeps CI time flat.

**On merge to main:** deploy the same build to production (often via staging), upload **hidden source maps** to error monitoring tagged with the release, put risky features behind flags, and keep rollback one click away. Watch error rates and Web Vitals right after the deploy.

**Around it:** required status checks, branch protection, Renovate or Dependabot for updates, and Changesets if we publish packages.`,
    followUps: ['How would you keep this under 10 minutes?', 'Where do you run e2e tests: against preview or a local build?', 'What happens if a deploy breaks production?'],
  },
  {
    id: 'mock-network',
    kind: 'concept',
    level: 'core',
    minutes: 2,
    question: 'How do you mock network requests in frontend tests?',
    answer: `**One-liner:** I mock at the **network boundary** with MSW, so my real data-fetching code runs and only the server's response is fake.

**Options I compare:**
- **\`vi.mock\` on my API module:** quick, but the data layer itself (URLs, headers, parsing, error handling) goes untested, and tests couple to its shape.
- **Stubbing \`fetch\`:** couples tests to exact \`fetch\` calls and breaks if we switch to ky or axios.
- **MSW (Mock Service Worker):** handlers like \`http.get('/api/users/:id', () => HttpResponse.json(user))\`, intercepted in Node for Vitest and by a Service Worker in the browser. The same handlers serve tests, local development and Storybook.

**Set-up I use:** default happy-path handlers in a shared file. In the test setup: \`server.listen({ onUnhandledRequest: 'error' })\` so no request escapes, \`server.resetHandlers()\` after each test, and \`server.use(...)\` inside a test for error, empty and slow states (\`HttpResponse.json(…, { status: 500 })\`, \`HttpResponse.error()\`, \`delay()\`). Test data comes from builders, so it's consistent and states intent.

**For e2e,** Playwright's \`page.route\` stubs flaky third parties or forces edge cases, while a few smoke tests hit a real backend.

**Keeping mocks honest:** types generated from an OpenAPI or GraphQL schema, runtime validation at the boundary, or consumer-driven contract tests with Pact. Otherwise the mocks drift and the tests stay green while production breaks.

**Alternative:** in small apps or interview exercises, inject the fetcher as a dependency. It's simple and explicit.`,
    followUps: ['How do you test a loading state?', 'How do you stop mocks drifting from the real API?', 'MSW v1 vs v2: what changed?'],
  },
];
