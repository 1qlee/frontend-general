import type { QuizQuestion } from '../../types';

// ---------------------------------------------------------------------------
// Inline lesson checks
// ---------------------------------------------------------------------------

export const testingChecks: QuizQuestion[] = [
  {
    id: 'getby-queryby-findby',
    prompt: 'After a successful submit, you want to assert that **no** error message is shown. Which assertion is correct?',
    choices: [
      '`expect(screen.getByText(/error/i)).not.toBeInTheDocument()`',
      '`expect(screen.queryByText(/error/i)).not.toBeInTheDocument()`',
      '`expect(await screen.findByText(/error/i)).not.toBeInTheDocument()`',
      '`expect(screen.getByTestId(\'error\')).toBeNull()`',
    ],
    answer: 1,
    explanation:
      '`queryBy*` returns `null` when nothing matches, so it is the variant made for asserting **absence**. `getBy*` **throws** when nothing matches, so the first and last options fail with "Unable to find…" before `expect` even runs. That is the exact opposite of what you want. `findBy*` *rejects* if the element never appears, after waiting a full second for it. Use `findBy` for "appears later", `getBy` for "is there now" and `queryBy` for "is not there".',
  },
  {
    id: 'implementation-detail-assertion',
    prompt: 'Which assertion tests an **implementation detail** of a `<Modal>` component?',
    choices: [
      '`expect(onClose).toHaveBeenCalledTimes(1)` after the user presses Escape',
      '`expect(screen.getByRole(\'dialog\', { name: \'Delete file?\' })).toBeVisible()`',
      '`expect(setIsOpen).toHaveBeenCalledWith(false)` where `setIsOpen` was obtained by spying on `React.useState`',
      '`expect(screen.getByRole(\'button\', { name: \'Cancel\' })).toHaveFocus()` when the modal opens',
    ],
    answer: 2,
    explanation:
      'Spying on `useState` couples the test to *how* the component stores state. Switch to `useReducer`, or lift the state up, and the test breaks with no change in behaviour. The other three test the contract: a callback prop is the developer-facing API (option 1), and the dialog\'s accessible name (option 2) and initial focus (option 4) are exactly what users, including keyboard and screen-reader users, experience.',
  },
];

export const e2eChecks: QuizQuestion[] = [
  {
    id: 'coverage-signal',
    prompt: 'Your team\'s `formatPrice` module has 100% line and branch coverage. What can you conclude?',
    choices: [
      'The module is correct',
      'Every line and branch ran during the tests, but nothing about whether the tests would notice if the behaviour were wrong',
      'Mutation testing would find no surviving mutants',
      'No more tests are needed for the module',
    ],
    answer: 1,
    explanation:
      'Coverage measures **execution**, not **verification**. A test that calls `formatPrice(…)` and asserts nothing reaches 100% coverage. Mutation testing asks the stronger question: if I change `>=` to `>`, does any test fail? Surviving mutants are common even with full coverage, as today\'s write-tests exercises show. Use coverage to find untested risky code, not as proof of quality.',
  },
  {
    id: 'visual-baseline-ci-only',
    prompt: 'Playwright `toHaveScreenshot()` tests pass on every developer\'s Mac but fail on CI with small diffs around text. What is the most likely cause and fix?',
    choices: [
      'CI is slower; increase the assertion timeout',
      'Font rendering and anti-aliasing differ between operating systems; generate and compare baselines in the same Docker image CI uses',
      'Animations are enabled; add `await page.waitForTimeout(1000)` before the screenshot',
      'Screenshots are non-deterministic; raise `maxDiffPixelRatio` to 0.2',
    ],
    answer: 1,
    explanation:
      'Pixel baselines depend on the OS, browser build and installed fonts. Playwright even stores them per platform (`-darwin`, `-linux`). The robust fix is a single rendering environment: run visual tests (and update baselines) in the same container as CI. A timeout doesn\'t change pixels. `toHaveScreenshot` already disables CSS animations by default, and a sleep adds flakiness. A huge diff threshold makes the test unable to catch real regressions.',
  },
];

export const toolingChecks: QuizQuestion[] = [
  {
    id: 'turbo-caret-dependson',
    prompt: 'In `turbo.json`, what does `"build": { "dependsOn": ["^build"] }` mean?',
    choices: [
      'Run `build` in every package of the repo before this one, in alphabetical order',
      'Run `build` in this package\'s workspace dependencies first (topologically), then this package\'s `build`',
      'Run this package\'s `build` only if its dependencies\' builds are cached',
      'Run the `prebuild` script before `build`',
    ],
    answer: 1,
    explanation:
      'The caret means "this task in my **dependencies**", so turbo builds the package graph bottom-up and runs independent packages in parallel. Without the caret (`"dependsOn": ["codegen"]`) it refers to another task in the *same* package. Caching is separate: any task can be restored from cache when its input hash matches. Packages unrelated to this one are not built first.',
  },
  {
    id: 'caret-zero-range',
    prompt: 'Your app depends on `"some-lib": "^0.3.1"`. Which version can a fresh install pick?',
    choices: ['0.4.0', '0.3.9', '1.0.0', '0.3.0'],
    answer: 1,
    explanation:
      'For `0.x` versions, the caret locks the **left-most non-zero** part, so `^0.3.1` means `>=0.3.1 <0.4.0`. The semver spec treats 0.x as initial development, where any minor bump may be breaking. `0.4.0` and `1.0.0` are outside the range, and `0.3.0` is below the lower bound. For comparison, `^1.3.1` would allow everything up to (not including) `2.0.0`.',
  },
];

// ---------------------------------------------------------------------------
// End-of-lessons quiz
// ---------------------------------------------------------------------------

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'rtl-icon-button-query',
    prompt: 'A close button renders only an SVG icon and has `aria-label="Close dialog"`. Which query should your test use?',
    choices: [
      '`screen.getByTestId(\'close-button\')`',
      '`screen.getByRole(\'button\', { name: \'Close dialog\' })`',
      '`screen.getByText(\'Close dialog\')`',
      '`container.querySelector(\'button.close\')`',
    ],
    answer: 1,
    explanation:
      '`aria-label` sets the button\'s **accessible name**, and `getByRole` with `name` matches exactly what a screen reader announces. If someone deletes the label, the test fails, as it should. `getByText` matches text *content*, and there isn\'t any (only an SVG), so it throws. A test ID works but verifies nothing about accessibility and needs extra markup. `querySelector` on a class couples the test to styling.',
  },
  {
    id: 'rtl-findby-after-fetch',
    prompt: 'A component fetches a user on mount and then renders `<h2>Ada</h2>`. Which assertion is idiomatic?',
    choices: [
      '`expect(screen.getByRole(\'heading\', { name: \'Ada\' })).toBeInTheDocument()`',
      '`expect(await screen.findByRole(\'heading\', { name: \'Ada\' })).toBeInTheDocument()`',
      '`await waitFor(() => {}); expect(screen.getByText(\'Ada\')).toBeInTheDocument()`',
      '`await new Promise((r) => setTimeout(r, 500)); expect(screen.getByText(\'Ada\')).toBeInTheDocument()`',
    ],
    answer: 1,
    explanation:
      '`findBy*` retries the query until it matches or 1000 ms pass, inside Testing Library\'s async act handling. That\'s the right tool for "appears after async work". Plain `getBy` runs immediately, while the request is still in flight, and throws. An empty `waitFor` resolves on its first try, so it waits for nothing in particular. A fixed sleep is slow when the request is fast and flaky when it is slow.',
  },
  {
    id: 'act-warning-cause',
    prompt:
      'Your test passes but logs *"An update to UserList inside a test was not wrapped in act(…)"*. It renders `<UserList />` (which fetches on mount) and immediately asserts that a spinner is visible. What is the most likely cause, and the fix?',
    choices: [
      'React 19 requires `act` around `render`; wrap the call in `act(() => render(...))`',
      'The fetch resolves and updates state after the test stopped waiting; also await the final UI with `findBy*` or `waitForElementToBeRemoved`',
      '`userEvent.setup()` was not called before `render`',
      'The component should fetch in `useLayoutEffect` instead of `useEffect`',
    ],
    answer: 1,
    explanation:
      'The warning means a state update happened when the test wasn\'t waiting for one, here when the request resolved after the last assertion. The test is also weak, because it never checks the loaded state. Waiting for the outcome (`await screen.findByRole(\'list\')` or `await waitForElementToBeRemoved(…spinner…)`) fixes both. `render` is already wrapped in `act` by RTL. user-event has nothing to do with it, and switching effect hooks doesn\'t make the request synchronous.',
  },
  {
    id: 'vi-mock-hoisting',
    prompt: 'This test file throws as soon as it loads. Why?',
    code: `import { vi, it, expect } from 'vitest';
import { loadProfile } from './profile'; // profile.ts imports { getUser } from './api'

const getUser = vi.fn();
vi.mock('./api', () => ({ getUser }));

it('loads the profile', async () => {
  getUser.mockResolvedValue({ id: 1, name: 'Ada' });
  await expect(loadProfile(1)).resolves.toMatchObject({ name: 'Ada' });
});`,
    codeLang: 'ts',
    choices: [
      '`vi.mock` must be called inside the test body',
      '`vi.mock` is hoisted above the imports and the `const`, so its factory reads `getUser` before it is initialised. Create the mock with `vi.hoisted(() => vi.fn())`',
      '`vi.fn()` cannot be called at module scope',
      'Module paths passed to `vi.mock` must be absolute',
    ],
    answer: 1,
    explanation:
      'ES imports are evaluated before the rest of the module, so Vitest **hoists** `vi.mock` to the very top to register the mock before `./profile` imports `./api`. The factory runs during that import, while `const getUser` is still in its temporal dead zone. That gives a ReferenceError, which Vitest reports with a hint about hoisting. `vi.hoisted` moves the mock creation up with it. (Jest\'s Babel plugin allows variables prefixed with `mock` as an escape hatch. Vitest uses `vi.hoisted` instead.) `vi.mock` inside a test is too late, and relative paths are fine.',
  },
  {
    id: 'user-event-vs-fireevent',
    prompt: 'Which statement about `user-event` vs `fireEvent` is correct?',
    choices: [
      'They are equivalent; user-event is shorter syntax for the same single event',
      '`user.type` fires the full keyboard and input event sequence per character and respects disabled elements; `fireEvent.change` dispatches one event with a new value',
      '`fireEvent` is asynchronous and must be awaited; user-event is synchronous',
      'user-event only works with class components',
    ],
    answer: 1,
    explanation:
      'user-event v14 simulates real interactions: pointer and mouse events, focus changes, `keydown`/`keypress`/`input`/`keyup` per character, selection, `maxLength`, and no clicks on disabled elements. `fireEvent` dispatches exactly one DOM event, which can trigger handlers no user could reach. The async part is the other way round: **user-event** APIs return promises (`await user.click(…)`), while `fireEvent` is synchronous.',
  },
  {
    id: 'flaky-sleep-isvisible',
    prompt: 'This Playwright test fails roughly 1 run in 10 on CI. What is the best fix?',
    code: `await page.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(500);
expect(await page.getByRole('status').isVisible()).toBe(true);`,
    codeLang: 'ts',
    choices: [
      'Increase the wait to 2000 ms',
      'Set `retries: 3` in the config',
      'Replace the last two lines with `await expect(page.getByRole(\'status\')).toBeVisible()`',
      'Use `page.locator(\'.toast\')` instead of `getByRole`',
    ],
    answer: 2,
    explanation:
      '`isVisible()` takes a single snapshot, so if the toast appears at 510 ms, the test fails. A **web-first assertion** retries until the status is visible (default 5 s), which removes both the race and the sleep. A longer sleep makes every run slower and still loses the race on a slow enough machine. Retries hide the flake instead of fixing it. A CSS selector changes what you query, not when you check it.',
  },
  {
    id: 'flaky-order-dependence',
    prompt: 'A Vitest test passes when run on its own but fails when the whole file runs, every time. Which category of cause should you investigate first?',
    choices: [
      'Timing: the machine is slower during the full run',
      'State leaking between tests: a module-level cache or store, a shared `QueryClient`, un-restored mocks or spies, fake timers left on, MSW handlers not reset',
      'A bug in jsdom',
      'An outdated snapshot',
    ],
    answer: 1,
    explanation:
      '"Passes alone, fails together" is the signature of **order dependence**: an earlier test leaves state behind. Confirm it by running the file with `--sequence.shuffle`, or by bisecting which earlier test triggers the failure. Then make each test set up its own world: fresh instances per test, `restoreMocks`, `vi.useRealTimers()` and `server.resetHandlers()` in `afterEach`. Timing problems are intermittent, not deterministic. A stale snapshot would fail when run alone too.',
  },
  {
    id: 'playwright-isolation',
    prompt: 'By default, what does each Playwright test get?',
    choices: [
      'A brand-new browser process',
      'A fresh `BrowserContext` (its own cookies, storage and cache) with a new page; the browser process is shared by the tests in a worker',
      'The same page as the previous test in the file, to save time',
      'A persistent browser profile that keeps logins between runs',
    ],
    answer: 1,
    explanation:
      'Contexts are cheap, isolated, incognito-like profiles. Isolation is per test, and speed comes from reusing the browser process per worker. Starting a browser per test would be much slower. Sharing pages between tests would create order dependence. Logins are reused deliberately through `storageState` files produced by a setup project, not through a persistent profile.',
  },
  {
    id: 'vite-dev-startup',
    prompt: 'Why does Vite\'s dev server start quickly even for a large app, while a webpack dev server slows down as the app grows?',
    choices: [
      'Vite skips TypeScript and JSX transformation in development',
      'Vite serves source files as native ES modules transformed on request and pre-bundles only the dependencies; webpack builds the whole bundle before it can serve',
      'Vite uses Rollup in development, which is faster than webpack',
      'Vite serves a cached production build in development',
    ],
    answer: 1,
    explanation:
      'With native ESM the browser requests modules as it needs them, so Vite only transforms what the current page imports. Dependencies are pre-bundled once with esbuild and cached. webpack has to bundle the entire module graph first. Vite still transforms TS and JSX (with esbuild, without type-checking). Rollup is used for the **production** build, not dev, and nothing is served from a production build in dev.',
  },
  {
    id: 'isolated-modules-reexport',
    prompt: 'With `isolatedModules: true` (or `verbatimModuleSyntax`), `tsc` reports an error in `index.ts`. Why?',
    code: `// types.ts
export interface User { id: string; name: string }

// index.ts
export { User } from './types';`,
    codeLang: 'ts',
    choices: [
      'Interfaces cannot be re-exported from another file',
      'A per-file transpiler (esbuild, SWC, Babel, Oxc) can\'t tell that `User` is only a type, so it would emit a runtime re-export of a value that doesn\'t exist. Write `export type { User } from \'./types\'`',
      '`isolatedModules` forbids all re-exports',
      '`User` must be declared with `type` instead of `interface`',
    ],
    answer: 1,
    explanation:
      'Transpilers other than `tsc` compile one file at a time and have no type information, so they can\'t know whether `User` exists at runtime. `isolatedModules` makes `tsc` flag every construct with that problem, and `export type` (or `import { type User }`) marks it as erasable. Re-exporting types is fine once it\'s marked as type-only, and `type` and `interface` behave the same way here.',
  },
  {
    id: 'pnpm-phantom-dependency',
    prompt: 'After switching from npm to pnpm, `import { debounce } from \'lodash-es\'` fails with "Cannot find module". `lodash-es` is not in your `package.json`. What happened, and what is the fix?',
    choices: [
      'pnpm doesn\'t support ESM packages; switch to `lodash`',
      'npm had hoisted `lodash-es` (a dependency of another package) to the top of `node_modules`, making it a phantom dependency; pnpm only links declared dependencies at the top level. Add it to `package.json`',
      'The pnpm store is corrupted; run `pnpm store prune`',
      'Set `shamefully-hoist=true` so pnpm behaves like npm',
    ],
    answer: 1,
    explanation:
      'pnpm\'s top-level `node_modules` contains symlinks only for the dependencies you declare. Everything else lives in `.pnpm/` and is visible only to the packages that depend on it. Your code was relying on npm\'s hoisting accident, which would break as soon as the other package dropped or changed `lodash-es`. Declaring it is the fix. `shamefully-hoist` is an escape hatch for legacy tools, not a fix for your own imports. The store is fine, and pnpm handles ESM.',
  },
  {
    id: 'tree-shaking-blocker',
    prompt: 'You import a single helper, `import { formatDate } from \'big-utils\'`, but the whole library ends up in your production bundle. What is the most likely reason?',
    choices: [
      'You used a named import; tree shaking only works with default imports',
      '`big-utils` is published only as CommonJS (`require` / `module.exports`), which bundlers can\'t analyse statically',
      'Tree shaking only happens in development builds',
      'The library is written in TypeScript',
    ],
    answer: 1,
    explanation:
      'Tree shaking relies on **static ES module syntax**. Imports and exports are fixed at parse time, so the bundler can prove which exports are unused. CommonJS exports are dynamic (`module.exports[name] = …`), so bundlers have to keep the module. Other usual suspects: no `"sideEffects": false` in the library\'s `package.json`, so modules with possible top-level side effects are kept, or top-level calls without `/*#__PURE__*/` annotations. Named imports are the tree-shakeable form, and tree shaking is a *production* optimisation.',
  },
];
