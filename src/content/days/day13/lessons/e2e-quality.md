## Why interviewers ask

At senior level the question shifts from "can you write a test?" to "can you **own quality** for a team?" That means deciding which journeys deserve end-to-end coverage, keeping the suite fast and trustworthy, and debugging flakiness methodically instead of re-running CI until it goes green. *"How do you deal with flaky tests?"* is one of the most common senior frontend questions. A structured answer (reproduce, classify, fix the root cause, quarantine) stands out.

## Playwright in one page

**Playwright** (Microsoft) drives Chromium, Firefox and WebKit through their own automation protocols. Its runner, `@playwright/test`, has fixtures, parallel workers, retries, sharding, reporters and a trace viewer built in. Cypress is still common in existing codebases. It runs the test inside the browser, which gives a nice interactive runner, but multi-tab, multi-origin and parallel runs are harder. For new projects Playwright has become the default.

```ts
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('a signed-in user can buy a product', async ({ page }) => {
  await page.goto('/products/espresso-machine');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: /cart \(1\)/i }).click();
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();

  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page).toHaveURL(/\/orders\/\d+$/);
  await expect(page.getByRole('status')).toHaveText('Payment received');
});
```

### Locators

`page.getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, `getByAltText`, `getByTitle` and `getByTestId` follow the **same priority as Testing Library**, for the same accessibility reasons. Locators are:

- **Lazy.** A locator is a recipe, re-resolved on every action, so there are no stale element references.
- **Strict.** An action on a locator that matches two elements throws. That forces precise locators instead of silently clicking the first match.
- **Composable.** `page.getByRole('listitem').filter({ hasText: 'Espresso' }).getByRole('button', { name: 'Remove' })`.

Avoid CSS and XPath selectors tied to DOM structure (`div > div:nth-child(3) .btn`). They break on every markup refactor.

### Auto-waiting and web-first assertions

Before every action Playwright runs **actionability checks**: the element must be attached, visible, *stable* (not animating), enabled, able to receive events (not covered by an overlay) and, for `fill`, editable. So you never need to sleep before clicking.

**Web-first assertions** (`await expect(locator).toBeVisible()`, `toHaveText`, `toHaveCount`, `toHaveURL`, `toBeEnabled`…) **retry** until they pass or the timeout (5 s by default) runs out:

```ts
// ❌ One-shot check: isVisible() is read once, with no retry. Flaky.
expect(await page.getByRole('status').isVisible()).toBe(true);

// ❌ A fixed sleep: always slow, and still flaky on a slow CI runner.
await page.waitForTimeout(1000);

// ✅ Web-first: retries until true or timeout.
await expect(page.getByRole('status')).toBeVisible();
```

Here is the idea in miniature: polling an assertion versus checking once.

```ts run
// What a web-first assertion does under the hood: poll until it passes or time runs out.
async function expectEventually(check: () => boolean, { timeout = 1000, interval = 50 } = {}) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out after ${timeout} ms`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return Date.now() - start;
}

let toastVisible = false;
setTimeout(() => (toastVisible = true), Math.random() * 300); // the app is "sometimes slow"

console.log('one-shot check:', toastVisible); // false: the flaky version
const waited = await expectEventually(() => toastVisible);
console.log(`retrying check passed after about ${Math.round(waited / 50) * 50} ms`);
```

### Fixtures and test isolation

Each test receives a fresh **`page` inside a fresh `BrowserContext`**. A context is like a brand-new incognito profile, so cookies, `localStorage`, `sessionStorage` and the cache are all isolated. The browser *process* is shared per worker, which keeps this fast. Built-in fixtures include `page`, `context`, `browser`, `request` (an API client) and `browserName`. You add your own with `test.extend`:

```ts
// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';
import { TodoPage } from './pages/todo-page'; // a page object: locators + actions for one screen

export const test = base.extend<{ todoPage: TodoPage }>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);       // the test body runs here
    await todoPage.clearAll(); // teardown, even if the test failed
  },
});
export { expect };
```

**Authentication.** Logging in through the UI in every test is slow. Instead, log in once in a *setup project*, save the session with `page.context().storageState({ path })`, and let the other projects start already authenticated:

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const storageState = 'e2e/.auth/user.json';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,          // a stray test.only fails the CI run
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'], storageState }, dependencies: ['setup'] },
    { name: 'mobile', use: { ...devices['Pixel 7'], storageState }, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Projects** run the same tests under different configurations: browsers, emulated devices, or logged-in versus anonymous.

### Parallelism

Test files run in parallel across worker processes, and `fullyParallel: true` also parallelises tests *within* a file. That only works if tests don't share mutable state. Two tests that log in as the same user and edit the same cart will collide. Give each test or worker its own data, for example a unique email per test or `testInfo.workerIndex` to pick an account. Use `test.describe.configure({ mode: 'serial' })` only as a last resort. On CI, split the suite across machines with `--shard=1/4` and combine the results with `npx playwright merge-reports`.

### Trace viewer and debugging

With `trace: 'on-first-retry'`, a failing test is retried with tracing on. The trace contains every action with **DOM snapshots before and after**, network requests, console output and the test source, on a timeline you can scrub. Open it with `npx playwright show-trace trace.zip` (or at trace.playwright.dev). Locally, **UI mode** (`npx playwright test --ui`) gives watch mode plus time-travel debugging, `--debug` opens the inspector, and `npx playwright codegen` records interactions and suggests locators.

### Controlling the network and time

- `await page.route('**/api/recommendations', (route) => route.fulfill({ json: [] }))` stubs a slow third party or forces an error state.
- `page.clock` (Playwright 1.45+) installs a fake clock for countdowns, session expiry and "today" logic.

There are two styles of e2e test. **Full-stack** tests run against a real backend with seeded data: maximum confidence, more setup, more ways to flake. **Frontend e2e** tests use a mocked API (via `page.route` or MSW in the browser) and are fast and deterministic. A healthy mix is a few full-stack smoke tests against staging plus more frontend-e2e tests for UI flows.

## Flaky tests

A **flaky test** passes and fails on the same code. It is worse than no test: people learn to re-run red builds, and then real failures slip through.

| Cause | Typical symptom | Fix |
|---|---|---|
| **Timing / races** | Fails more on slow CI; uses fixed sleeps; asserts before data arrives | Web-first assertions and `findBy*`; wait for a *signal* (an element, a response), never a duration |
| **Animations & transitions** | Clicks land on a moving element; screenshot diffs | Rely on actionability checks; emulate `prefers-reduced-motion` or disable transitions in test builds |
| **Shared state / order dependence** | Passes alone, fails in the full run (or the reverse) | Fresh state per test: new `QueryClient`, `server.resetHandlers()`, `restoreMocks`, a new browser context, unique test data |
| **Leaked fakes** | The next test hangs or sees the wrong time | `vi.useRealTimers()` and mock restoration in `afterEach` |
| **Real network / third parties** | Fails when a service is slow or rate-limits | Mock at the boundary (MSW, `page.route`); keep the test environment hermetic |
| **Time, time zone, locale, randomness** | Fails at midnight, on the 31st, or on a UTC runner | `vi.setSystemTime` / `page.clock`; set `TZ` and locale explicitly; seed random data |
| **Resource contention** | Only fails with many workers | Find the shared resource; give slow operations more time; reduce workers as a last resort |
| **Unordered data** | List order differs between runs | Sort before asserting, or assert on membership rather than order |

### A diagnosis routine

1. **Reproduce.** Run it many times: `npx playwright test cart.spec.ts --repeat-each=30 --retries=0`, or `vitest run --sequence.shuffle` to randomise order. Run the test alone and then in the full suite to check for order dependence. Compare one worker against many to check for shared state or contention.
2. **Collect evidence.** Traces, screenshots and videos on failure, plus CI logs. Does it always fail on the same line?
3. **Classify** using the table above and **fix the root cause**.
4. **If you can't fix it today, quarantine it.** Skip or tag it (`@flaky`) with a ticket and an owner, and track the flake rate. Don't let it keep training people to ignore red builds.

> [!MISTAKE]
> "Just add retries." Retries hide the symptom, and sometimes they hide a **real race in the product**: the test was right and the app has a bug. Treat retries as a safety net that *reports*. Playwright labels tests that pass only on retry as **flaky** in its report, so you can track them. They are not the fix.

> [!INTERVIEW] Say it like this
> "First I make it reproducible: repeat-each, shuffled order, one worker versus many. Then I get a trace. Nearly always it's one of four things: asserting before the UI is ready, state shared between tests, an unmocked network dependency, or time. I fix the root cause with web-first assertions, isolated data, mocking at the boundary or a controlled clock. If I can't fix it today, I quarantine it with an owner, because a flaky suite teaches the team to ignore red builds."

## Visual regression testing

DOM assertions can't see that a button is now white on white. Screenshot comparison can:

```ts
await expect(page).toHaveScreenshot('pricing.png', {
  mask: [page.getByTestId('last-updated')], // hide dynamic content
  maxDiffPixelRatio: 0.01,
});
```

The first run writes a **baseline**. Later runs diff against it pixel by pixel, and you accept intentional changes with `--update-snapshots`, reviewing the image diff in the PR. The gotchas:

- **Rendering differs by OS, browser and installed fonts.** Generate and compare baselines in the **same Docker image** that CI uses, or you'll get failures that appear only on CI.
- Mask or freeze dynamic content: timestamps, avatars, ads, carousels. `toHaveScreenshot` disables CSS animations by default.
- Keep screenshots focused (a component or a section) so a diff points to a cause.

Hosted services such as **Chromatic** (built on Storybook stories), Percy and Argos add review workflows and per-component baselines. Vitest 4's Browser Mode also has a `toMatchScreenshot` assertion for component-level visual tests.

## Accessibility checks in CI

Automated checks with **axe-core** catch a meaningful share of WCAG failures, such as missing accessible names, insufficient contrast, invalid ARIA and duplicate IDs. They can't judge focus order, the quality of alt text or screen-reader flow, so manual keyboard and screen-reader passes are still needed. (Day 9 covered this in depth.)

```ts
import AxeBuilder from '@axe-core/playwright';

test('checkout has no detectable a11y violations', async ({ page }) => {
  await page.goto('/checkout');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
```

At the component level, run `vitest-axe`/`jest-axe` or the Storybook a11y addon, and keep using role-based queries. A failing `getByRole` is often the first accessibility bug report you get.

## Contract testing

The trap: frontend tests mock the API, the real API changes, the tests stay green, and production breaks. Your mocks drifted. The defences:

- **Consumer-driven contracts (Pact).** The frontend's tests record the interactions they rely on (this request gets a response of this shape) into a *pact* file. The provider's CI replays those interactions against the real service. A broker answers `can-i-deploy` before either side ships an incompatible change.
- **Schema-first.** An OpenAPI or GraphQL schema is the single source of truth. Generate TypeScript types from it (`openapi-typescript`, GraphQL Code Generator), optionally generate MSW handlers too, and validate responses at runtime at the boundary (e.g. with zod) in development and test.
- **A few real end-to-end smoke tests** against staging as the final check.

## Coverage: a signal, not a target

Coverage reports which lines, branches and functions **ran** during the tests. Vitest supports `provider: 'v8'` (the default; native V8 coverage, fast) and `'istanbul'` (instrumentation-based). Use it to **find risky code with no tests**, such as the error branch of the payment flow. Don't use it as a goal. Goodhart's law applies: *when a measure becomes a target, it ceases to be a good measure.* Teams chasing 100% write assertion-free tests and test trivial getters.

Healthier uses: a threshold as a **ratchet** on critical packages (it can't go down), looking at uncovered branches in a PR's diff, and **mutation testing** (e.g. Stryker). A mutation tool injects small bugs (`>=` to `>`, deleting a line, flipping a boolean) and checks whether your tests catch them. Your **mutation score** says how many injected bugs were caught. That is exactly what today's "write the tests" exercises make you do by hand.

{{quiz:coverage-signal}}

## TDD in practice

**Red → green → refactor:** write a failing test, make it pass with the simplest code, then clean up with the test as a safety net. Where it pays off:

- **Pure logic with a clear spec:** parsers, formatters, validation, reducers, pricing rules.
- **Bug fixes:** write the regression test first and watch it fail. That proves it detects the bug.
- **API design:** writing the call site first shows you an awkward interface before you build it.

Where it fits less well is exploratory UI and visual work. Prototype first, then lock the behaviour in with tests. An honest interview answer: *"I use TDD for logic and every bug fix, test-after for exploratory UI, and I never trust a test I haven't seen fail."* Tests are also how you check an AI agent's work: Day 14 builds on that.

## Test data builders and factories

Many test suites are full of 40-line object literals and shared fixtures that someone mutates. Every time a type gains a required field, dozens of tests break. **Builders** fix this. Each test states only the fields it cares about:

```ts run
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  createdAt: string;
}

let sequence = 0;
function buildUser(overrides: Partial<User> = {}): User {
  sequence += 1;
  return {
    id: `user-${sequence}`,               // unique: safe for parallel e2e runs
    name: `Test User ${sequence}`,
    email: `user${sequence}@example.test`,
    role: 'member',
    createdAt: '2026-01-01T00:00:00.000Z', // fixed: no test depends on "now"
    ...overrides,
  };
}

const admin = buildUser({ role: 'admin' }); // the test says what matters: an admin
const member = buildUser();
console.log(admin.role, admin.id, '|', member.role, member.id);
```

Benefits: a new required field means one change, and TypeScript points you to it. Tests read as intent. Unique values avoid collisions between parallel workers. The same builders can feed MSW handlers and Storybook stories. Libraries such as `fishery` add traits and associations, and `@faker-js/faker` generates realistic values (call `faker.seed(…)` so failures are reproducible).

## Key takeaways

- **Playwright:** role-based, strict, lazy locators; auto-waiting actions; **web-first assertions that retry**; a fresh `BrowserContext` per test; projects for browsers, devices and auth; traces on retry.
- **Flaky tests:** reproduce (repeat, shuffle, vary workers), collect a trace, classify (timing, shared state, network, time), fix the root cause, quarantine with an owner. Retries alone don't fix anything.
- **Visual regression** needs a consistent rendering environment and masked dynamic content. **axe in CI** catches part of the a11y problems, not all of them.
- **Contract testing** (Pact, or schema-first types and validation) keeps your mocks honest.
- **Coverage** shows where tests are missing; **mutation testing** shows whether your tests actually catch bugs.
- **TDD** for logic and bug fixes, and **builders** for test data that states intent.
