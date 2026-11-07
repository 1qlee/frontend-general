## Why interviewers ask about testing

Nearly every senior frontend loop has a testing question, and it is rarely "what is a unit test?". It sounds like *"How would you test this component?"*, *"This test is flaky. Why?"*, or it is a take-home where the tests are graded as hard as the code. Interviewers listen for three things:

1. **A strategy.** You can say what you would test, at which level, and *why*, in terms of risk and confidence rather than a coverage number.
2. **User-centric tests.** You test behaviour through the public surface (the DOM, props, callbacks, the network), not internals.
3. **Fluency with the tools.** Query priority, async utilities, where to mock. No cargo-culted `act()` or `waitFor` everywhere.

> [!INTERVIEW] Say it like this
> "I test behaviour through the same interface a user or caller uses. Most of my confidence comes from integration-style component tests, meaning Testing Library with a mocked network layer. I add a thin layer of unit tests for pure logic and a handful of end-to-end tests for the critical journeys. TypeScript and ESLint catch a whole class of bugs before any test runs."

## The testing trophy

Mike Cohn's **test pyramid** says: many unit tests, fewer integration tests, very few UI tests. Kent C. Dodds's **testing trophy** (2018) adapts that for frontend apps, where most bugs are in how pieces are wired together:

| Layer | What it checks | Tools | Cost vs. confidence |
|---|---|---|---|
| **Static** | Typos, type errors, misused hooks, unhandled promises | TypeScript, ESLint (`typescript-eslint`, `react-hooks`) | Nearly free; runs in the editor |
| **Unit** | Pure functions, reducers, a reusable hook in isolation | Vitest | Fast and precise, but says little about wiring |
| **Integration** | A component tree with real state, context and a (mocked) network, rendered into a DOM | Vitest + React Testing Library + MSW | Best confidence per unit of cost. The widest part of the trophy |
| **End-to-end** | The real app in real browsers against a real or staged backend | Playwright | Highest confidence; slowest, most expensive, most prone to flakiness |

The slogan is Guillermo Rauch's: *"Write tests. Not too many. Mostly integration."*

Why is integration the sweet spot in React? Because the bugs users hit are usually wiring bugs: a prop that isn't passed, an effect that doesn't re-run, a loading state that never shows, an error that gets swallowed. A unit test of a component whose children are all mocked can't see those bugs. An e2e test can, but it costs seconds per test and depends on the environment.

The trophy is a default, not a law. A library of date utilities should be almost all unit tests. A design system leans on component tests plus visual regression. A checkout flow deserves real end-to-end coverage.

### Deciding what to test

A checklist you can say out loud:

1. **What would hurt most if it broke?** Revenue paths (sign-up, checkout), data loss, auth gating, and accessibility of the core flows.
2. **What is complex?** Branching logic, parsing, money and date maths, state machines. Unit-test these thoroughly; it is cheap and precise.
3. **What has broken before?** Every bug fix starts with a regression test that fails *before* the fix.
4. **What is the contract?** For a component that means its props, the output it renders, the callbacks it fires and the requests it makes. Its state variables, which hooks it uses and its private helpers are not part of the contract.

What *not* to test: the framework itself (that React re-renders, that the router routes), third-party internals, trivial pass-through components, and pixel details (visual regression covers those, see Lesson 2).

> [!MISTAKE]
> "We target 100% coverage, so I test every function." Coverage tells you which lines *ran*, not what was *verified*. A test with no assertions can still reach 100%. Lesson 2 covers how to use coverage as a signal.

## Testing behaviour, not implementation

An **implementation detail** is anything the users of your code don't use, see or know about. Tests coupled to implementation details fail in two ways:

- **False negatives:** you refactor (`useState` to `useReducer`, rename a handler, split a component) and tests break even though nothing changed for the user.
- **False positives:** tests stay green while the app is broken. You called the handler directly, but the button was never wired to it.

```tsx
// ❌ Implementation-detail test (Enzyme-era thinking)
const wrapper = shallow(<Counter />);
wrapper.instance().increment();          // calls a private method
expect(wrapper.state('count')).toBe(1);  // reads private state

// ✅ Behaviour test (Testing Library)
const user = userEvent.setup();
render(<Counter />);
await user.click(screen.getByRole('button', { name: /increment/i }));
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

The second test survives a rewrite to hooks, `useReducer` or Zustand, and it fails if the button isn't wired up. That is exactly the behaviour you want from a test.

A component has **two kinds of users**: the end user, who sees the DOM, and the developer, who passes props. Asserting that `onSubmit` was called with `{ email, password }` tests the developer-facing contract, so it is not an implementation detail. Spying on `useState` is.

## Vitest essentials

**Vitest** is a Vite-native test runner with a Jest-compatible API. It reuses your Vite config (plugins, aliases, transforms), handles ESM and TypeScript out of the box, and its watch mode re-runs only the tests affected by a change in the module graph. Vitest 3 shipped in 2025. Vitest 4 (late 2025) made **Browser Mode** stable, so tests can run in a real browser through Playwright. It also completed the move from `workspace` to `test.projects` for multi-config setups.

```ts
// vite.config.ts (or a separate vitest.config.ts)
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',          // default is 'node'; 'happy-dom' is a faster, less complete alternative
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,            // undo vi.spyOn after every test
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
```

```ts
// src/test/setup.ts
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest'; // toBeInTheDocument, toBeDisabled, toHaveAccessibleName…

// RTL only auto-registers cleanup when `afterEach` is a global (test.globals: true).
afterEach(() => cleanup());
```

Remember that jsdom is not a browser. It has no layout (every size is 0), no `IntersectionObserver` or `ResizeObserver`, and only a partial `matchMedia`. Stub those, or move layout-dependent tests to Browser Mode or Playwright.

The basics, briefly: `describe` / `it` (alias `test`) / `expect`. `toBe` compares with `Object.is`, `toEqual` compares structure recursively, and `toStrictEqual` also checks `undefined` properties and class types. Use `it.each` for table-driven cases and `.only` / `.skip` / `.todo` while you work.

### Mocks: `vi.fn`, `vi.spyOn`, `vi.mock`

```ts run
import { vi } from 'vitest';

// vi.fn: a standalone mock, e.g. a callback prop
const onSave = vi.fn((title: string) => title.toUpperCase());
onSave('draft');
onSave('final');
console.log(onSave.mock.calls);                        // [['draft'], ['final']]
console.log(onSave.mock.results.map((r) => r.value));  // ['DRAFT', 'FINAL']

// vi.spyOn: wrap an existing method (calls through unless you override it)
const api = { fetchUser: (id: number) => ({ id, name: 'Real' }) };
const spy = vi.spyOn(api, 'fetchUser').mockReturnValue({ id: 1, name: 'Mocked' });
console.log(api.fetchUser(1).name, spy.mock.calls.length); // Mocked 1
spy.mockRestore();
console.log(api.fetchUser(1).name);                         // Real
```

- **`vi.fn()`** creates a standalone mock function. Pass it as a callback prop and assert on `toHaveBeenCalledWith`.
- **`vi.spyOn(obj, 'method')`** wraps an existing method so you can observe or override it, and it can be restored. Good for `console.error`, `Date.now`, or `window.scrollTo`.
- **`vi.mock('./module', factory)`** replaces a whole module for the test file.

**`vi.mock` is hoisted.** ES imports are evaluated before any other code in the module, so Vitest moves every `vi.mock` call to the top of the file, above the imports, so the mock is registered before anything imports it. The consequence: the factory cannot use variables declared normally in the file, because they are still in the temporal dead zone. Use `vi.hoisted` instead:

```ts
import { vi, it, expect } from 'vitest';
import { loadProfile } from './profile'; // profile.ts imports getUser from './api'

const mocks = vi.hoisted(() => ({ getUser: vi.fn() })); // hoisted too, so it runs first
vi.mock('./api', () => ({ getUser: mocks.getUser }));

it('loads the profile', async () => {
  mocks.getUser.mockResolvedValue({ id: 1, name: 'Ada' });
  await expect(loadProfile(1)).resolves.toMatchObject({ name: 'Ada' });
  expect(mocks.getUser).toHaveBeenCalledWith(1);
});
```

For a partial mock, use the original module: `vi.mock(import('./api'), async (importOriginal) => ({ ...(await importOriginal()), getUser: vi.fn() }))`. Use `vi.mocked(fn)` to get mock typings on an imported function.

Cleanup vocabulary interviewers like to hear: `mockClear()` forgets calls, `mockReset()` also resets the implementation, and `mockRestore()` puts the original method back on a spy. The `clearMocks` / `mockReset` / `restoreMocks` config options do the same automatically between tests.

> [!WARNING]
> Mock at **boundaries you own** (the network, time, randomness, a payment SDK), not your own modules all the way down. If a test mocks every collaborator, it only proves your mocks agree with each other.

### Fake timers

Code that uses `setTimeout`, `setInterval` or `Date` should not make your tests wait in real time. Fake timers replace the clock so the test decides when time passes:

```ts run
import { vi } from 'vitest';

vi.useFakeTimers();
const log: string[] = [];
setTimeout(() => log.push('after 1s'), 1000);
setTimeout(() => log.push('after 5s'), 5000);

vi.advanceTimersByTime(999);
console.log(log);   // []: nothing is due yet
vi.advanceTimersByTime(1);
console.log(log);   // ['after 1s']
vi.runAllTimers();
console.log(log);   // ['after 1s', 'after 5s']
vi.useRealTimers();
```

- Use **`await vi.advanceTimersByTimeAsync(ms)`** when the code awaits promises between timers (retry loops, polling). It flushes microtasks between timers.
- **`vi.setSystemTime(new Date('2026-03-01T09:00:00Z'))`** freezes `Date` for "today" logic.
- **Always restore** with `vi.useRealTimers()` in `afterEach`. Fake timers left on are a classic cause of tests that hang or fail depending on their order.
- With `user-event`, call `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`. user-event uses `setTimeout` internally, so without this option it waits forever on a frozen clock.
- With React, wrap manual time advances in `act`: `act(() => { vi.advanceTimersByTime(300); })`. Here the update happens outside any Testing Library helper, so you have to tell React yourself.

### Snapshots: use sparingly

`toMatchSnapshot()` serialises a value into a `__snapshots__` file on the first run and compares against it on later runs. `toMatchInlineSnapshot()` writes the value into the test file itself. The problems:

- **Big DOM snapshots get rubber-stamped.** Nobody reviews a 300-line diff, and `vitest -u` becomes a reflex. The test then asserts "nothing changed", not "this is correct".
- **They are brittle.** A wrapper `div` or a class-name change fails the test with no change in behaviour.

They are good for **small, stable, serialised output**: an error message, a generated config, a parser's AST, preferably inline. For "does it look right", use visual regression testing instead (Lesson 2).

## React Testing Library

### The guiding principle

> "The more your tests resemble the way your software is used, the more confidence they can give you."

React Testing Library (RTL) renders components into a real DOM (jsdom, happy-dom or a real browser). It gives you **no access to component instances, state or shallow rendering**. You find elements the way a user does, interact through events, and assert on what is on screen. Since v16, `@testing-library/dom` is a peer dependency that you install yourself. In React 19, `act` is imported from `react`: the rest of `react-dom/test-utils` was removed, and its `act` is deprecated. RTL re-exports `act` for you.

### Query priority

| Priority | Query | Use it for |
|---|---|---|
| 1 | `getByRole(role, { name })` | Almost everything: buttons, links, headings, textboxes, checkboxes, dialogs, rows… `name` is the **accessible name** |
| 2 | `getByLabelText` | Form fields, including `type="password"`, which has **no ARIA role** |
| 3 | `getByPlaceholderText` | Only when there is genuinely no label. A placeholder is not a label |
| 4 | `getByText` | Non-interactive content: paragraphs, messages, empty states |
| 5 | `getByDisplayValue` | The current value of a filled-in field |
| 6 | `getByAltText`, `getByTitle` | Images; `title` is announced inconsistently |
| 7 | `getByTestId` | Escape hatch when there's no accessible handle (a canvas wrapper, dynamic text) |

Why role first? It is how assistive technology exposes the page. If `getByRole('button', { name: 'Save' })` can't find your button, a screen-reader user can't either. **Every role query doubles as an accessibility assertion.** (Day 9 covered roles and accessible-name computation in depth.)

Useful options: `getByRole('heading', { level: 2 })`, `{ name: /save/i }`, `{ checked: true }`, `{ expanded: false }`, `{ pressed: true }`. Scope queries with `within(row).getByRole('button', { name: 'Delete' })`. When stuck, use `screen.debug()` or `screen.logTestingPlaygroundURL()`.

### `getBy` vs `queryBy` vs `findBy`

| Variant | 0 matches | 1 match | 2+ matches | Async? | Use it when… |
|---|---|---|---|---|---|
| `getBy*` | throws | returns it | throws | no | the element should be there **now** |
| `queryBy*` | returns `null` | returns it | throws | no | asserting **absence** |
| `findBy*` | rejects after timeout | resolves | rejects | yes, retries (default 1000 ms) | the element **appears after async work** |
| `*AllBy*` | same rules, returns arrays | | | | several matches are expected |

```tsx
expect(screen.queryByRole('alert')).not.toBeInTheDocument();                // absence
expect(await screen.findByRole('heading', { name: 'Ada' })).toBeVisible();  // appears later
```

{{quiz:getby-queryby-findby}}

### `user-event` vs `fireEvent`

`fireEvent.click(el)` dispatches **one** DOM event. `user-event` (v14) simulates the **whole interaction** the way a browser would:

- `user.click` fires `pointerdown`, `mousedown`, focus, `pointerup`, `mouseup` and `click`. It does nothing on a disabled element and refuses to click through `pointer-events: none`.
- `user.type` fires `keydown`, `keypress`, `input` and `keyup` **per character**, respecting `maxLength` and the selection.
- `user.tab()`, `user.keyboard('{Enter}')`, `user.selectOptions`, `user.upload`, `user.clear`, `user.hover`.

```tsx
const user = userEvent.setup();   // once per test, before render
render(<SearchBox />);
await user.type(screen.getByRole('searchbox'), 'react');
await user.keyboard('{Enter}');
expect(await screen.findByRole('list', { name: 'Results' })).toBeInTheDocument();
```

Every user-event call returns a promise, so always `await` it. Use `fireEvent` only for events user-event doesn't model: `scroll`, a media element's `ended`, custom events.

### Async utilities and the "not wrapped in act" warning

`findBy*` is `getBy*` plus `waitFor`. `waitFor(callback)` re-runs the callback until it stops throwing: every 50 ms and on every DOM mutation, up to 1000 ms by default. The rules:

- Prefer `findBy*` when you are waiting for an element.
- Put **one assertion** in a `waitFor` and **no side effects**, because it may run many times.
- Don't use an empty `waitFor(() => {})` or a `setTimeout` sleep to "let things settle".
- Use `waitForElementToBeRemoved(() => screen.queryByText(/loading/i))` to wait for something to disappear.

**The warning:** *"An update to UserProfile inside a test was not wrapped in act(...)"*. It means React state changed at a moment your test was not waiting for. Usually a fetch resolved or a timer fired after your last `await`, or even after the test had finished. Your assertions may have run against an intermediate UI.

```tsx
// ⚠️ The test ends while the request is still in flight: act warning, and a weak test
it('renders the user', () => {
  render(<UserProfile id={1} />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

// ✅ Wait for what the user would eventually see
it('renders the user', async () => {
  render(<UserProfile id={1} />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
});
```

RTL already wraps `render`, user-event, `fireEvent` and its async utilities in `act`. **The fix is almost always to wait for the final UI, not to add `act` by hand.**

> [!MISTAKE]
> Silencing the warning by wrapping everything in `act(...)` or adding `await new Promise((r) => setTimeout(r, 0))`. You only need manual `act` when you cause an update outside Testing Library's helpers, for example when you advance fake timers or call a function returned from `renderHook`.

### A custom render with providers

Real components need context: a router, a React Query client, a theme, i18n, a store. Put the wrapping in one place and re-export RTL from it:

```tsx
// src/test/test-utils.tsx
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { ReactElement, ReactNode } from 'react';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(ui: ReactElement, { route = '/', ...options }: Options = {}) {
  // A fresh client per test: no cache leaking between tests, no retries hiding failures.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return { user: userEvent.setup(), queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export * from '@testing-library/react';
```

The important detail is creating **fresh instances per test**. A module-level `QueryClient` shares its cache across tests, and that is a textbook source of order-dependent failures.

### Testing hooks with `renderHook`

```tsx
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';

function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  return { count, increment: () => setCount((c) => c + 1) };
}

it('increments', () => {
  const { result } = renderHook(() => useCounter(5));
  act(() => result.current.increment());
  expect(result.current.count).toBe(6); // read result.current AFTER act; don't destructure early
});
```

`renderHook` has been part of `@testing-library/react` since v13.1; `@testing-library/react-hooks` is deprecated. It accepts `initialProps` and a `wrapper` (for context), and returns `rerender(newProps)`. Use it for **reusable** hooks. If a hook exists only to serve one component, test it through that component.

### Mocking the network with MSW

You have three places to fake a request:

1. **Mock your API module** (`vi.mock('./api')`). Simple, but it couples tests to your data layer and never exercises it.
2. **Stub `fetch`** (`vi.stubGlobal('fetch', vi.fn())`). This couples tests to the exact `fetch` call and breaks if you switch to `ky` or axios.
3. **Intercept at the network level with MSW (Mock Service Worker).** Your real fetching code, including headers, parsing and error handling, runs, and only the response is fake. The same handlers work in Node tests, in the browser (local dev, Storybook) and in Playwright.

```ts
// src/test/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: Number(params.id), name: 'Ada Lovelace' }),
  ),
];

// src/test/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);

// src/test/setup.ts (add to the earlier file)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // no accidental real calls
afterEach(() => server.resetHandlers());                         // drop per-test overrides
afterAll(() => server.close());
```

Override a handler inside one test for error and edge states:

```tsx
it('shows an error when the user cannot be loaded', async () => {
  server.use(
    http.get('https://api.example.com/users/:id', () =>
      HttpResponse.json({ message: 'Internal error' }, { status: 500 }),
    ),
  );
  renderWithProviders(<UserProfile id={1} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
});
```

`HttpResponse.error()` simulates a network failure, and `await delay(500)` inside a handler lets you assert loading states. The code above is the **MSW v2** API (`http`, `HttpResponse`). If an interviewer sees `rest.get(…, (req, res, ctx) => …)`, they know your knowledge stopped at v1.

> [!TIP]
> Injecting the fetcher (`<UserProfile loadUser={…} />` or a context-provided API client) is the other clean option, especially for small apps and interview exercises. It is dependency injection rather than interception, and both keep tests away from `fetch` internals.

## Key takeaways

- **Trophy:** static checks first, integration tests as the bulk, unit tests for logic, a few e2e tests for critical journeys. Choose tests by risk, not by coverage.
- **Test the contract:** what renders, how it responds to interaction, which callbacks fire, which requests go out. Never state or private methods.
- **Vitest:** `vi.fn` for callbacks, `vi.spyOn` to observe and override (and restore), `vi.mock` is **hoisted** (use `vi.hoisted`), and fake timers must be restored.
- **RTL queries:** `getByRole` > `getByLabelText` > … > `getByTestId`. `getBy` for now, `queryBy` for absence, `findBy` for later.
- **user-event over fireEvent:** set it up per test and `await` every call.
- **act warnings** mean you didn't wait for an async update. Await the final UI with `findBy` or `waitFor`.
- **MSW** intercepts at the network layer: one set of handlers for tests, dev and Storybook, with `onUnhandledRequest: 'error'`.
