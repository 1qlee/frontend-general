import type { Exercise } from '../../types';

import durationSubject from './exercises/test-format-duration/subject.ts?raw';
import durationStarter from './exercises/test-format-duration/starter.ts?raw';
import durationSolution from './exercises/test-format-duration/solution.ts?raw';
import durationBoundary from './exercises/test-format-duration/mutant-boundary.ts?raw';
import durationZero from './exercises/test-format-duration/mutant-zero.ts?raw';
import durationPlural from './exercises/test-format-duration/mutant-plural.ts?raw';

import loginSubject from './exercises/test-login-form/subject.tsx?raw';
import loginStarter from './exercises/test-login-form/starter.tsx?raw';
import loginSolution from './exercises/test-login-form/solution.tsx?raw';
import loginDoubleSubmit from './exercises/test-login-form/mutant-double-submit.tsx?raw';
import loginLabel from './exercises/test-login-form/mutant-label.tsx?raw';
import loginValidation from './exercises/test-login-form/mutant-validation.tsx?raw';

import debounceSubject from './exercises/test-debounce/subject.ts?raw';
import debounceStarter from './exercises/test-debounce/starter.ts?raw';
import debounceSolution from './exercises/test-debounce/solution.ts?raw';
import debounceNoReset from './exercises/test-debounce/mutant-no-reset.ts?raw';
import debounceLeading from './exercises/test-debounce/mutant-leading.ts?raw';
import debounceThis from './exercises/test-debounce/mutant-this.ts?raw';
import debounceCancel from './exercises/test-debounce/mutant-cancel.ts?raw';

import semverStarter from './exercises/semver-satisfies/starter.ts?raw';
import semverSolution from './exercises/semver-satisfies/solution.ts?raw';
import semverTests from './exercises/semver-satisfies/tests.ts?raw';

import buildOrderStarter from './exercises/monorepo-build-order/starter.ts?raw';
import buildOrderSolution from './exercises/monorepo-build-order/solution.ts?raw';
import buildOrderTests from './exercises/monorepo-build-order/tests.ts?raw';

const WRITE_TESTS_RULES = `**Mode: you write the tests.** The implementation already exists. Your suite runs against the correct version, where every test must pass, and then against several **buggy versions** swapped in for \`./subject\`, where at least one test must fail for each. A suite is only as good as the bugs it catches. Test the **contract** below, not the code.`;

export const testFormatDuration: Exercise = {
  id: 'write-tests-format-duration',
  title: 'Write the tests: formatDuration(ms)',
  runtime: 'logic',
  mode: 'write-tests',
  difficulty: 'warm-up',
  estMinutes: 12,
  tags: ['testing', 'write-tests', 'boundary values', 'vitest'],
  prompt: `${WRITE_TESTS_RULES} There are **3 bugs** to catch.

### The contract

\`\`\`ts
import { formatDuration } from './subject';
formatDuration(ms: number): string
\`\`\`

| Input (ms) | Output |
|---|---|
| \`45_000\` | \`'45 seconds'\` |
| \`150_000\` | \`'2 minutes and 30 seconds'\` |
| \`7_530_000\` | \`'2 hours, 5 minutes and 30 seconds'\` |
| \`172_800_000\` | \`'2 days'\` |

- Units are day, hour, minute and second. Units whose value is 0 are left out.
- Sub-second remainders are **truncated**: \`1_999\` ms is \`'1 second'\`. Anything under one second is \`'0 seconds'\`.
- Each unit is pluralised by **its own** count: \`'1 minute'\`, \`'2 minutes'\`.
- Parts are separated by \`', '\`, except the last two, which are joined with \`' and '\`.
- Negative, \`NaN\` or infinite input throws a \`RangeError\`.

The examples above are deliberately "comfortable" values: **all three buggy versions pass them.** You have to find the cases the examples don't cover.

**What the interviewer is looking for:** a systematic way to choose cases. That means *equivalence partitioning* (one representative per kind of input) plus *boundary-value analysis* (the exact value where behaviour changes), not just the happy-path examples from the ticket. Name each test after the rule it pins down.`,
  subject: durationSubject,
  mutants: [
    {
      description: 'Off-by-one at unit boundaries: it checks `remaining > size` instead of `>=`, so 60,000 ms becomes "60 seconds" and 1,000 ms produces nothing.',
      code: durationBoundary,
    },
    {
      description: 'Missing edge case: there is no zero case, so 0 ms (and anything under a second) returns an empty string instead of "0 seconds".',
      code: durationZero,
    },
    {
      description: 'Wrong pluralisation: it pluralises by the total number of seconds instead of each unit\'s own count ("1 minutes and 2 seconds").',
      code: durationPlural,
    },
  ],
  starter: durationStarter,
  solution: durationSolution,
  tests: '',
  hints: [
    'Write one `it` per rule in the contract. Then ask which rules the example table never exercises: no example has a count of exactly 1, an exact unit boundary, or zero.',
    'Off-by-one bugs live at boundaries. Test the exact value where a unit starts (`1_000`, `60_000`, `3_600_000`, `86_400_000`), not values comfortably inside a range. `it.each` keeps this compact.',
    'For pluralisation, use a case where one unit has a count of 1 but the total isn\'t 1 second, such as `62_000` → `\'1 minute and 2 seconds\'`. Also cover `0` and something like `999`.',
  ],
  explanation: `**The three bugs and what catches each:**

| Bug | A test that catches it | What the bug returns |
|---|---|---|
| \`remaining > size\` (boundary) | \`formatDuration(60_000)\` → \`'1 minute'\` | \`'60 seconds'\` |
| No zero case | \`formatDuration(0)\` → \`'0 seconds'\` | \`''\` |
| Pluralises by total seconds | \`formatDuration(62_000)\` → \`'1 minute and 2 seconds'\` | \`'1 minutes and 2 seconds'\` |

Notice that every example in the ticket passes against every bug. That is common in real work: the examples someone writes in a ticket are "comfortable" values. Your job is to think in **equivalence classes** (zero, sub-second, a single unit, several units, counts of 1 versus more than 1, invalid input) and **boundaries** (exactly 1 s, 60 s, 1 h, 1 day, 999 ms versus 1,000 ms).

**Technique notes:**
- \`it.each([[1_000, '1 second'], [60_000, '1 minute']])('%i ms -> %s', …)\` turns a boundary table into one readable test per row.
- Assert exact strings. Don't snapshot here, because the explicit string *is* the documentation of the contract.
- This is **mutation testing** done by hand. Tools like Stryker generate mutants automatically (flip \`>=\` to \`>\`, delete a statement, swap \`&&\` and \`||\`) and report a *mutation score*: the share of mutants your tests caught. It's a much better quality signal than line coverage. All three bugs here would have had 100% line coverage from the example tests.

**Follow-ups:**
- *"How do you know your tests are good?"* → See each one fail at least once (break the code on purpose, or write it first, TDD-style), cover the boundaries, and consider mutation testing on critical modules.
- *"Could you property-test it?"* → Yes, with fast-check: generate random non-negative integers and check invariants. Parsing the output back gives the same number of whole seconds, there are never more than four parts, and \`' and '\` appears exactly once when there are two or more parts.
- *"What about localisation?"* → In production, use \`Intl.DurationFormat\` (now in all modern browsers) or \`Intl.PluralRules\` for plural categories. English's "1 versus everything else" rule doesn't hold in most languages.`,
};

export const testLoginForm: Exercise = {
  id: 'write-tests-login-form',
  title: 'Write the tests: <LoginForm> with Testing Library',
  runtime: 'dom',
  mode: 'write-tests',
  difficulty: 'core',
  estMinutes: 20,
  tags: ['testing', 'write-tests', 'react testing library', 'user-event', 'forms'],
  prompt: `${WRITE_TESTS_RULES} Use React Testing Library and \`user-event\`. There are **3 bugs** to catch.

### The contract

\`\`\`tsx
import { LoginForm } from './subject';
<LoginForm onSubmit={(values: { email: string; password: string }) => void | Promise<void>} />
\`\`\`

- Two fields labelled **Email** and **Password**, and a submit button named **Sign in**.
- On submit, the values are validated. An invalid email shows *"Enter a valid email address"*. A password shorter than 8 characters shows *"Password must be at least 8 characters"*. Each message has \`role="alert"\` and its field gets \`aria-invalid="true"\`. **Invalid values are never submitted.**
- Valid values call \`onSubmit({ email, password })\` **exactly once**.
- While the promise returned by \`onSubmit\` is pending, the button reads **"Signing in…"** and is **disabled**. Extra clicks do nothing.
- If \`onSubmit\` rejects, an alert says *"Sign-in failed. Please try again."* and the button is enabled again.

Available: \`render\`, \`screen\`, \`within\`, \`act\` from \`@testing-library/react\`; \`userEvent\` from \`@testing-library/user-event\`; \`vi\` from \`vitest\`; jest-dom matchers such as \`toBeDisabled\`, \`toBeEnabled\`, \`toHaveAttribute\`, \`toHaveTextContent\`.

**What the interviewer is looking for:** role and label queries (no test IDs), \`userEvent.setup()\` with \`await\`ed interactions, assertions on **observable effects** (what's on screen; whether, how often and with what \`onSubmit\` was called) rather than internal state, and a promise you control so you can observe the pending state.`,
  subject: loginSubject,
  mutants: [
    {
      description: 'Double submit allowed: the button is never disabled and there is no pending guard, so a second click calls onSubmit again.',
      code: loginDoubleSubmit,
    },
    {
      description: 'Label not associated: the Email label has `htmlFor="email"` but the input\'s id comes from useId(), so the field has no accessible name.',
      code: loginLabel,
    },
    {
      description: 'Validation skipped: the error messages appear, but the missing early return means onSubmit is still called with the invalid values.',
      code: loginValidation,
    },
  ],
  starter: loginStarter,
  solution: loginSolution,
  tests: '',
  hints: [
    'Start every test with `const user = userEvent.setup(); render(<LoginForm onSubmit={onSubmit} />);` and find fields with `screen.getByLabelText(\'Email\')`. A label query is itself an accessibility assertion.',
    'For validation, assert two things: the message appears **and** `expect(onSubmit).not.toHaveBeenCalled()`. Checking only the message lets one of the bugs through.',
    'To see the pending state, make `onSubmit` return a promise you control: `let resolve!: () => void; const onSubmit = vi.fn(() => new Promise<void>((r) => { resolve = r; }));`. Click twice, then assert `toHaveBeenCalledTimes(1)` and `toBeDisabled()`. Finally call `resolve()` and `await screen.findByRole(\'button\', { name: \'Sign in\' })`.',
  ],
  explanation: `**The three bugs and what catches each:**

| Bug | What catches it | What lets it through |
|---|---|---|
| Double submit | A controlled pending promise, two clicks, then \`toHaveBeenCalledTimes(1)\` (or \`toBeDisabled()\` on the pending button) | An \`onSubmit\` that resolves immediately, so the form is never pending when you look |
| Unassociated label | \`getByLabelText('Email')\` or \`getByRole('textbox', { name: 'Email' })\` throws | \`getByPlaceholderText\`, \`getByTestId\` or \`container.querySelector('input[type=email]')\`. The bug ships, and screen-reader users can't identify the field |
| Validation skipped | \`expect(onSubmit).not.toHaveBeenCalled()\` after an invalid submit | Asserting only that the message is shown |

**Why these patterns:**
- **Query by label or role.** The label bug is invisible to sighted users and to test-ID-based tests. Role and label queries make accessibility part of every test (Day 9).
- **\`type="password"\` has no ARIA role.** That's why the password field is found with \`getByLabelText\`, not \`getByRole('textbox')\`.
- **A deferred promise** is the standard way to test in-flight UI: loading spinners, disabled buttons, optimistic updates. Resolve or reject it *from the test*, then wait for the settled UI with \`findBy*\`. Because \`findBy\` runs inside Testing Library's async \`act\` handling, there's no "not wrapped in act" warning.
- **user-event over fireEvent:** \`user.click\` on a disabled button does nothing, just like a browser. \`user.type\` types character by character, so \`onChange\`-driven state updates the way it does for a real user.
- **Assert on effects, not state:** never "\`pending\` is true", always "the button is disabled and says Signing in…".

**Follow-ups:**
- *"How would you test this against the real API client?"* → Render the page with the real client and an MSW handler for \`POST /login\`. Assert on what the user sees (redirect, error message), and use \`server.use(...)\` per test for the 401 and 500 cases.
- *"Would you also test it in Playwright?"* → Only the critical journey (log in, land on the dashboard), using \`getByLabel\` / \`getByRole\` and web-first assertions. The validation matrix belongs in fast component tests.
- *"How do you stop double submits in production?"* → Disable the button *and* guard in the handler (a ref or state check), and make the server side idempotent (an idempotency key), because a UI guard can't stop a retry from a flaky network.`,
};

export const testDebounce: Exercise = {
  id: 'write-tests-debounce',
  title: 'Write the tests: debounce() with fake timers',
  runtime: 'logic',
  mode: 'write-tests',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['testing', 'write-tests', 'fake timers', 'debounce', 'this'],
  prompt: `${WRITE_TESTS_RULES} Control time with Vitest's fake timers. There are **4 bugs** to catch.

### The contract

\`\`\`ts
import { debounce } from './subject';
const debounced = debounce(fn, wait);
debounced(...args);   // (re)schedules fn
debounced.cancel();   // drops the pending call
\`\`\`

- **Trailing edge:** \`fn\` runs once, \`wait\` ms after the **last** call in a burst, and never before.
- **Every call restarts the timer.**
- \`fn\` receives the **arguments and \`this\`** of that last call.
- \`cancel()\` drops a pending call, and the debounced function keeps working afterwards.

Fake timers: \`vi.useFakeTimers()\` (the starter does this in \`beforeEach\`), \`vi.advanceTimersByTime(ms)\`, \`vi.runAllTimers()\`. In this runner, real timers are restored automatically after each test. In your own projects, call \`vi.useRealTimers()\` in \`afterEach\`.

**What the interviewer is looking for:** deterministic control of time instead of real waiting, assertions that something has **not happened yet** as well as that it has, and remembering \`this\`, which most candidates forget.`,
  subject: debounceSubject,
  mutants: [
    {
      description: 'Timer not reset: later calls in a burst update the arguments but keep the first timer, so fn fires `wait` ms after the FIRST call.',
      code: debounceNoReset,
    },
    {
      description: 'Trailing call lost: fn fires immediately on the leading edge with the first arguments, and the last call of the burst never runs.',
      code: debounceLeading,
    },
    {
      description: '`this` not forwarded: the wrapper is an arrow function, so fn is called with `this === undefined`.',
      code: debounceThis,
    },
    {
      description: 'cancel() forgets clearTimeout: it only resets the variable, so the pending call still fires.',
      code: debounceCancel,
    },
  ],
  starter: debounceStarter,
  solution: debounceSolution,
  tests: '',
  hints: [
    'Test "not yet" as well as "now": after `debounced()`, advance to `wait - 1` and assert `not.toHaveBeenCalled()`, then advance one more millisecond and assert it was called once.',
    'Calls made at the same instant can\'t tell "restarts the timer" apart from "keeps the first timer". Space them out: call, advance 80 ms, call again, advance 80 ms. With `wait = 100`, should it have fired?',
    'For `this`, call the debounced function as a method: `const box = { name: \'search\', run: debounce(function (this: { name: string } | undefined) { seen = this?.name; }, 50) }; box.run();`. For `cancel`, advance well past `wait` and assert nothing fired, then check that a new call still works.',
  ],
  explanation: `**The four bugs and what catches each:**

| Bug | Test that catches it |
|---|---|
| Timer not reset | Call at t=0 and t=80 with \`wait=100\`. At t=160 it must **not** have fired; at t=180 it fires once with the second call's arguments |
| Leading edge (trailing call lost) | "not called before \`wait\`", or "called once with the **last** arguments of a burst" |
| \`this\` lost | Call it as a method and assert on \`this\` inside \`fn\` |
| \`cancel\` without \`clearTimeout\` | \`cancel()\`, advance far past \`wait\`, \`expect(fn).not.toHaveBeenCalled()\` |

The timer-reset bug is the instructive one: a burst of calls at a single instant passes against it. Only **spacing calls out in time** distinguishes "debounce" from "fire \`wait\` ms after the first call" (which is closer to a throttle). Pick test inputs that make the correct and incorrect behaviours *diverge*.

**Fake-timer notes:**
- Use \`await vi.advanceTimersByTimeAsync(ms)\` when the code under test awaits promises between timers (polling, retry with backoff).
- With React and user-event: \`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })\`, and wrap manual advances in \`act(() => { vi.advanceTimersByTime(300); })\`.
- Always restore real timers in \`afterEach\`. A fake clock leaking into the next test is a classic cause of order-dependent flakiness.

**Follow-ups:**
- *"Test a debounced search box in React."* → \`user.type(searchbox, 'react')\`, advance the timers inside \`act\`, assert exactly one request went out (an MSW handler with a \`vi.fn\` spy, or an injected fetcher) and that the results render.
- *"Add \`leading\`, \`maxWait\` and \`flush()\` like lodash."* → Each option is a new rule, so add one or two tests per rule. \`maxWait\` needs a test where continuous calls *would* starve a plain debounce.
- *"Why not just \`await sleep(100)\` in the test?"* → It's slow, and on a loaded CI machine it's flaky. Fake timers make time deterministic and instant.`,
};

export const semverSatisfies: Exercise = {
  id: 'semver-compare-satisfies',
  title: 'compareSemver() and satisfies()',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['tooling', 'semver', 'parsing', 'package managers'],
  prompt: `Every \`pnpm install\` resolves ranges like \`^18.2.0\` against registry versions. Implement the core of that.

**1. \`compareSemver(a, b): -1 | 0 | 1\`.** Versions are \`MAJOR.MINOR.PATCH\` with an optional \`-prerelease\` and \`+build\` (e.g. \`2.0.0-rc.1+sha.5114f85\`).
- Compare major, then minor, then patch **numerically**: \`1.10.0 > 1.9.0\`.
- A prerelease has **lower** precedence than its release: \`1.0.0-rc.1 < 1.0.0\`.
- Between prereleases, compare dot-separated identifiers left to right. Numeric identifiers compare numerically, numeric identifiers sort before alphanumeric ones, alphanumeric ones compare in ASCII order, and if all shared identifiers are equal, the longer list is greater. The spec's own example: \`1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0\`.
- Build metadata is ignored. Invalid versions (\`1.2\`, \`01.2.3\`, \`x.y.z\`) throw a \`TypeError\`.

**2. \`satisfies(version, range): boolean\`** for these ranges:

| Range | Means |
|---|---|
| \`1.2.3\` or \`=1.2.3\` | exactly 1.2.3 |
| \`>=1.2.3\` | 1.2.3 or later |
| \`~1.2.3\` | \`>=1.2.3 <1.3.0\` |
| \`^1.2.3\` | \`>=1.2.3 <2.0.0\` |
| \`^0.2.3\` | \`>=0.2.3 <0.3.0\` |
| \`^0.0.3\` | \`>=0.0.3 <0.0.4\` |

- **npm's prerelease rule:** a prerelease version only satisfies a range whose own version is a prerelease of the **same** \`MAJOR.MINOR.PATCH\`. So \`satisfies('1.3.0-beta.1', '^1.2.0')\` is \`false\`, but \`satisfies('1.2.0-beta.2', '^1.2.0-beta.1')\` is \`true\`.
- Anything else (\`<2.0.0\`, \`1.x\`, \`*\`) throws a \`TypeError\`.

**What the interviewer is looking for:** numeric rather than string comparison (the classic bug), a parse-then-compare structure, turning each range into lower and upper bounds, and knowing *why* \`^0.x\` is narrower.`,
  starter: semverStarter,
  solution: semverSolution,
  tests: semverTests,
  hints: [
    'Parse with one anchored regex into `{ major, minor, patch, prerelease }` and throw a `TypeError` when it doesn\'t match. Convert parts with `Number()`. Comparing strings is the classic bug (`"10" < "9"`).',
    'Prerelease precedence: a version WITHOUT a prerelease is greater. Otherwise walk the identifiers: number vs number numerically, a number sorts before a string, string vs string with `<`, and if all shared identifiers are equal the longer list wins.',
    'Turn each range into bounds `[lower, upper)`: `~1.2.3` → `[1.2.3, 1.3.0)`; `^1.2.3` → `[1.2.3, 2.0.0)`; `^0.2.3` → `[0.2.3, 0.3.0)`; `^0.0.3` → `[0.0.3, 0.0.4)`. Check the prerelease rule before comparing.',
  ],
  explanation: `**Approach:** parse once into a structured value, then write a single \`compare(a, b)\` that everything else uses. \`compareSemver\` is \`compare(parse(a), parse(b))\`, and \`satisfies\` turns the operator into a lower bound (the range's version) and an optional exclusive upper bound, then checks \`lower <= v < upper\`. Converting numeric prerelease identifiers to numbers while parsing makes the comparison straightforward.

**Why \`^0.x\` is narrow:** the semver spec says that in \`0.y.z\`, "anything MAY change at any time". npm's caret therefore locks the **left-most non-zero** part: \`^0.2.3\` allows only \`0.2.x\` and \`^0.0.3\` allows only \`0.0.3\`. If you depend on a 0.x library, every minor bump can be breaking.

**Why the prerelease rule exists:** without it, \`^1.2.0\` would happily install \`1.3.0-alpha.0\`, so a library author publishing a beta would break everyone on a caret range. You opt into prereleases explicitly, one version tuple at a time.

**Complexity:** O(length of the version strings), which is effectively constant.

**Follow-ups:**
- *"Support \`||\`, hyphen ranges and \`1.x\`."* → A range is a *set of comparator sets*: OR (\`||\`) of ANDs (space-separated comparators). Desugar \`1.x\` → \`>=1.0.0 <2.0.0\` and \`1.2.3 - 2.3.4\` → \`>=1.2.3 <=2.3.4\`, then check each AND-set.
- *"What does the lockfile add if ranges already constrain versions?"* → Ranges say what's *allowed*; the lockfile records what was *resolved* (exact versions and integrity hashes for the whole tree), so every machine and CI run installs the same thing.
- *"How would you pick the version to install?"* → Fetch the available versions, filter with \`satisfies\`, take the max by \`compareSemver\`. That's the core of \`maxSatisfying\`.
- *"Who decides MAJOR vs MINOR for your own packages?"* → With Changesets, the PR author does, explicitly. With semantic-release, Conventional Commits do (\`feat!:\` → major).`,
};

export const monorepoBuildOrder: Exercise = {
  id: 'monorepo-build-order',
  title: 'buildOrder(): a monorepo task graph',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['tooling', 'monorepo', 'graphs', 'topological sort'],
  prompt: `Turborepo, Nx and \`pnpm -r\` all compute this before running \`build\` with \`dependsOn: ["^build"]\`. Implement it.

\`\`\`ts
buildOrder(packages: Record<string, string[]>): string[]
\`\`\`

- \`packages\` maps each workspace package to the names it depends on.
- Return an order in which every package appears **exactly once**, **after all of its workspace dependencies**. Any valid order is accepted.
- Dependencies that are not keys of \`packages\` (\`'react'\`, \`'zod'\`) are external npm packages: ignore them and leave them out of the result.
- On a dependency cycle, throw an \`Error\` with the message \`Cycle detected: a -> b -> c -> a\`, where each name depends on the next. Report **only the packages on the cycle**, not the path that led to it. The cycle can start at any of its members.

\`\`\`ts
buildOrder({ app: ['ui', 'react'], ui: ['utils'], utils: [] });
// ['utils', 'ui', 'app']

buildOrder({ app: ['ui'], ui: ['forms'], forms: ['validation'], validation: ['forms'] });
// throws Error('Cycle detected: forms -> validation -> forms')
\`\`\`

**What the interviewer is looking for:** recognising a topological sort, O(V + E) DFS (post-order) or Kahn's algorithm, three-state cycle detection, and reconstructing the actual cycle for a useful error message.`,
  starter: buildOrderStarter,
  solution: buildOrderSolution,
  tests: buildOrderTests,
  hints: [
    'Depth-first search: visit a package\'s dependencies first, then push the package (post-order). Remember finished packages so shared dependencies are built once.',
    'Use three states: unvisited, *visiting* (on the current DFS path) and *done*. Reaching a *visiting* package again means you just closed a cycle.',
    'Keep the current DFS path in an array (push on enter, pop on exit). When you reach a visiting package `p`, the cycle is `[...path.slice(path.indexOf(p)), p]`.',
  ],
  explanation: `**DFS approach (the reference solution):** for each package, recursively visit its workspace dependencies, then append the package. Post-order guarantees dependencies come first. A \`Map<string, 'visiting' | 'done'>\` handles both deduplication (*done*) and cycle detection (*visiting* means a back edge). The current path stack turns "there's a cycle" into "here is the cycle". Slice from the first occurrence of the repeated package so the path that led into it isn't reported. **O(V + E)** time and O(V) space.

**Kahn's algorithm (the alternative):** count each package's unbuilt workspace dependencies, repeatedly take the packages whose count is zero, and decrement their dependents. It naturally produces **waves** of packages that can build in parallel, which is how a task runner schedules work with \`--concurrency\` (see the runnable snippet in the tooling lesson). If packages remain when no package is ready, they contain a cycle. To report it, start from any leftover package, follow leftover dependencies until a package repeats, and cut the path at the first occurrence of that package.

**Production concerns worth mentioning:**
- **Recursion depth:** deep graphs can overflow the stack with recursive DFS. Use an explicit stack (or Kahn's) for very large repos.
- **Determinism:** sort keys and dependencies so the output (and the logs and cache keys built from it) is stable across runs.
- **Critical path:** the longest chain of dependent tasks bounds the total build time no matter how many CPU cores you have. Splitting a package that sits on the critical path speeds up CI more than adding machines.

**Follow-ups:**
- *"Which packages need rebuilding when \`utils\` changes?"* → Reverse the edges and BFS from the changed packages: everything reachable is affected (\`turbo run build --affected\`, \`nx affected\`).
- *"How does caching interact with this?"* → A task's hash includes its dependencies' hashes, so a change in \`utils\` invalidates \`ui\` and \`app\` but not \`docs\`.`,
};
