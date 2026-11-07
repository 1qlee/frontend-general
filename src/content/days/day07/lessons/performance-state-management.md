## Why interviewers ask about React performance and state

"This page is slow — how would you fix it?" and "Which state management library would you use?" are open-ended on purpose. Weak answers jump straight to a tool ("wrap it in `useMemo`", "use Redux"). Strong answers show a **process**: measure, find *why* it's slow or *what kind* of state it is, apply the cheapest fix that addresses the cause, and verify. Today's exercises make you implement the tools (memoized rows, a virtual list, a selector store, a query cache) so you can talk about their internals.

Day 5 covered *how* rendering works; Day 10 covers loading performance (bundles, Core Web Vitals, caching). This lesson is about **React runtime performance** and **state architecture**.

## What actually triggers a re-render

A component re-renders when:

1. **Its own state changes** (`useState`/`useReducer` setter with a new value by `Object.is`).
2. **Its parent re-renders** — by default React re-renders *all* children, whether or not their props changed.
3. **A context it reads changes** (the provider's `value` is a new reference).
4. **An external store it subscribes to** (via `useSyncExternalStore`) returns a new snapshot.

"Its props changed" is not on the list: props change *because* the parent re-rendered. `memo` is what turns "parent re-rendered" into "re-render only if props changed".

And a re-render is **not** a DOM update: React calls your function, diffs the result, and commits only real differences. Most re-renders are cheap. They matter when:

- the subtree is **big** (hundreds of rows, a chart, a rich editor),
- they happen at **high frequency** (keystrokes, scroll, drag, animation frames, timers),
- or a single render does **expensive work** (sorting/filtering 10k items, heavy formatting).

> [!INTERVIEW] Say it like this
> "Re-renders are usually cheap, so I don't memoize by default. I start with the React Profiler to find which components render, how often, and why. Then I apply the cheapest fix that removes the cause: move state down, pass expensive subtrees as children, split contexts — and only then `memo` with stable props, virtualization, or transitions. Then I profile again to confirm."

## The optimization ladder (cheapest first)

1. **Measure.** Don't guess (see Profiling below).
2. **Move state down.** If only the search box needs `query`, put the state *in* the search box component, not in the page.
3. **Lift content up — pass it as `children`.** Elements created by a component that didn't re-render are the *same objects*, so React skips them.

   ```tsx
   // ❌ every mouse move re-renders <ExpensiveTree />
   function Tracker() {
     const [pos, setPos] = useState({ x: 0, y: 0 });
     return <div onPointerMove={(e) => setPos({ x: e.clientX, y: e.clientY })}><ExpensiveTree /></div>;
   }

   // ✅ App creates <ExpensiveTree /> once; Tracker's re-renders reuse that element
   function Tracker({ children }: { children: React.ReactNode }) {
     const [pos, setPos] = useState({ x: 0, y: 0 });
     return <div onPointerMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>{children}</div>;
   }
   // <Tracker><ExpensiveTree /></Tracker>
   ```
4. **Fix context fan-out.** Every consumer re-renders when the `value` changes. Memoize the value object, split fast-changing and slow-changing data into separate contexts, or move high-frequency shared state into a store with **selectors**.
5. **`memo` + referentially stable props** (next section).
6. **Do less work:** virtualize long lists, code-split heavy components, mark non-urgent updates as transitions (Lesson 1), move pure computation to a Web Worker.

## `memo`, `useMemo`, `useCallback` — done right

`memo(Component)` makes React **skip re-rendering** when every prop is `Object.is`-equal to the previous render's (a **shallow** comparison; an optional second argument `arePropsEqual(prev, next)` customizes it). It does *not* stop re-renders caused by the component's own state or context.

The trap: shallow comparison means **any new object, array, function or JSX element in props defeats `memo`**.

```ts run
// React.memo's default check: same keys, Object.is for each value.
function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && Object.is(a[k], b[k]));
}

const STYLE = { color: 'red' };   // hoisted module constant: same object every time
const handleSelect = () => {};    // what useCallback(fn, []) hands back on every render

// Two renders of a parent that passes props to a memoized <Row>:
const propsOnRender = () => ({
  inline: { id: 1, style: { color: 'red' }, onSelect: () => {} },
  stable: { id: 1, style: STYLE, onSelect: handleSelect },
  withChildren: { id: 1, children: { type: 'span', props: { children: 'hi' } } }, // JSX is an object too
});
const r1 = propsOnRender();
const r2 = propsOnRender();
console.log('inline object + arrow → memo skips?', shallowEqual(r1.inline, r2.inline));
console.log('stable references      → memo skips?', shallowEqual(r1.stable, r2.stable));
console.log('children JSX           → memo skips?', shallowEqual(r1.withChildren, r2.withChildren));
```

How to make props stable:

| Prop | Fix |
|---|---|
| Constant object/array | Hoist it to module scope |
| Object derived from state | `useMemo(() => ({ … }), [deps])` — or pass the primitives instead (`done` rather than `style`) |
| Callback | `useCallback(fn, deps)`; use **functional updates** (`setItems(prev => …)`) or `useReducer`'s `dispatch` (always stable) so deps can be empty |
| `children` | Usually can't be stable — don't `memo` components whose main input is `children` |

> [!MISTAKE]
> `const onToggle = useCallback((id) => setTodos(todos.map(…)), [])` — stable *and wrong*. The callback closes over the first render's `todos` (a stale closure, Day 1), so every toggle resets the other rows. Use `setTodos((prev) => prev.map(…))`.

When **not** to bother:

- `useCallback` for a function passed to a **non-memoized** child or a DOM element: nothing compares it, so it's pure overhead. (Exceptions: it's an effect dependency, or a custom hook returns it.)
- `useMemo` for cheap computations: the comparison and memory cost more than recomputing.
- Props that change every render anyway (e.g. a `now` timestamp).

Legitimate reasons for `useMemo`: an expensive computation (measure it: `console.time` around it, ≥1 ms on a throttled CPU is a reasonable bar), a value that must be referentially stable because it's an **effect dependency** or a prop of a memoized child. Note that React treats `useMemo` as a performance hint, not a semantic guarantee — it may discard the cache.

{{quiz:memo-children-prop}}

## React Compiler

**React Compiler** is a build-time tool (a Babel plugin, also integrated into Next.js, Vite and Expo setups) that **automatically memoizes** components and hooks. It analyzes data flow and caches values, callbacks and JSX at a finer granularity than people write by hand — including memoization after an early return, which manual hooks can't express.

```tsx
// What you write (with the compiler on):
function TodoList({ todos, filter }: { todos: Todo[]; filter: Filter }) {
  const visible = todos.filter((t) => matches(t, filter));
  const handleToggle = (id: string) => toggle(id);
  return <List items={visible} onToggle={handleToggle} />;
}
// Roughly what it does: recompute `visible` only when todos/filter change, keep the same
// `handleToggle` reference, and reuse the <List> element when its inputs are unchanged.
```

It **relies on the Rules of React** and assumes your code follows them:

- Components and hooks are **pure and idempotent** during render (no side effects, same inputs → same output).
- **Props, state and values passed to JSX/hooks are immutable** — don't mutate them after use.
- **Don't read or write `ref.current` during render** (lazy initialization is the exception).
- Hooks are called unconditionally at the top level.

When it detects a violation it **skips optimizing** that component (the code still works, unoptimized). Its diagnostics ship as lint rules in `eslint-plugin-react-hooks`; `'use no memo'` opts a function out.

What changes for interviews:

- In a compiler-enabled codebase you rarely write `memo`/`useMemo`/`useCallback`; manual memoization becomes an escape hatch (e.g. to control effect dependencies precisely).
- It does **not** make an O(n²) algorithm fast, virtualize a 10k-row list, or stop context consumers from re-rendering when the value changes. Architecture still matters.
- You still need to *understand* referential equality: most codebases don't use it yet, and its assumptions are exactly the Rules of React.

> [!NOTE] Versions
> React Compiler reached **1.0 (stable) in October 2025**. It targets React 19 and supports React 17/18 through `react-compiler-runtime`. Adoption varies widely — ask whether a team uses it before assuming.

## Profiling

**React DevTools → Profiler:**

1. Settings → enable **"Record why each component rendered while profiling"**.
2. Record, perform the slow interaction, stop.
3. Walk the **commits** (bar chart at the top). In the **flamegraph**, width ≈ render time and grey bars didn't render; the **ranked** view sorts by cost.
4. Select a component: "Why did this render?" says *props changed (onSelect)*, *hook 3 changed*, *parent rendered*, *context changed*.

Also useful: DevTools settings → "Highlight updates when components render" for a quick visual; the `<Profiler id onRender>` component for programmatic measurement (`actualDuration` = time this update took, `baseDuration` = estimated cost of the subtree without memoization); and the browser's Performance panel with CPU throttling for the full picture (React 19.2 adds **React Performance Tracks** to Chrome DevTools). Profile a **production/profiling build** for realistic numbers — development builds are much slower.

## List virtualization

Rendering 10,000 rows means 10,000 sets of DOM nodes: slow mount, slow updates, heavy memory. **Virtualization (windowing)** renders only the rows in the viewport plus a few **overscan** rows, inside a container whose inner "sizer" has the full height so the scrollbar is correct. On scroll, compute `start = floor(scrollTop / rowHeight)`, `end = ceil((scrollTop + viewportHeight) / rowHeight)` and position the rows absolutely — you'll build exactly that today.

Libraries: **TanStack Virtual** (headless), **react-window**, **react-virtuoso** (variable heights out of the box).

Trade-offs to mention unprompted:

- **Variable/dynamic heights** need measurement (`ResizeObserver`) and estimated sizes; scroll position can jump.
- **Find-in-page, SEO and assistive tech** can't see rows that aren't in the DOM — add `aria-setsize`/`aria-posinset`, keep keyboard focus working when a focused row scrolls out.
- **Overscan** trades memory for less blank flashing on fast scroll.
- Alternatives: pagination, "load more", or CSS `content-visibility: auto` (keeps rows in the DOM but skips their rendering work — Day 8/10).

## Code splitting

`lazy(() => import('./Heavy'))` + Suspense at **route** level first, then for heavy, rarely used components (rich editors, charts, modals). Start the import early on intent (hover, focus) to hide latency, and don't split so finely that you create request waterfalls. Bundle analysis and loading strategy are Day 10.

## State management: classify first, then choose

The most useful sentence in a state-management discussion: **"Server state and client state are different problems."**

| Kind | Examples | Characteristics | Default tool |
|---|---|---|---|
| **Server state** | Users, products, comments from an API | Owned by the server; async; can be **stale**; shared by many components; needs caching, dedupe, refetch, invalidation | **TanStack Query**, SWR, RTK Query, Apollo/Relay (GraphQL), framework loaders / Server Components |
| **Local UI state** | Open/closed, hover, an input's text | One component (or a small subtree) | `useState` / `useReducer` |
| **Shared client state** | Cart, editor document, wizard progress, canvas selection | Synchronous, owned by the client, used across distant components | Context (low-frequency), **Zustand**, **Redux Toolkit**, **Jotai** |
| **URL state** | Filters, sort, page, selected tab, search query | Should survive reload and be shareable; back button should work | Router search params (`useSearchParams`), nuqs |
| **Form state** | Values, validation, dirty/touched | Short-lived | Uncontrolled + `FormData`/Actions, React Hook Form for complex forms (Day 6) |
| **Derived state** | Totals, filtered lists | Computable from other state | **Compute during render** — never store it |

### Server state with TanStack Query

```tsx
function Todos({ status }: { status: 'open' | 'done' }) {
  const { data, isPending, isError, isFetching } = useQuery({
    queryKey: ['todos', { status }],           // everything the fetch depends on
    queryFn: () => fetchTodos(status),
    staleTime: 30_000,                          // fresh for 30s: no refetch on mount/focus
  });
  // …
}

function useAddTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addTodo,
    // prefix match: invalidates ['todos', { status: 'open' }] AND ['todos', { status: 'done' }]
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });
}
```

The concepts interviewers expect (TanStack Query v5 names):

- **Query keys** are the cache identity: arrays, hashed deterministically, hierarchical (enables prefix invalidation). Include *every* input of the fetch, or two different requests will share one cache entry.
- **Deduplication**: components that mount with the same key while a request is in flight share it.
- **`staleTime`** (default **0**): how long data counts as fresh. Fresh data is served from cache **without refetching**. Stale data is still shown, but triggers a background refetch on mount, window focus and reconnect.
- **`gcTime`** (default **5 minutes**; `cacheTime` before v5): how long an **unused** entry (no mounted observers) stays in memory before it's garbage-collected. It has nothing to do with freshness.
- **Stale-while-revalidate**: show cached (possibly stale) data instantly, revalidate in the background, swap in new data when it arrives. `isPending` = no data yet; `isFetching` = any request in flight, including background ones.
- **Invalidation** after mutations: mark matching queries stale and refetch the active ones. Optimistic updates via `onMutate` (snapshot → set → roll back in `onError`) or by rendering the mutation's `variables` while it's pending.
- Also: retries with exponential backoff (3 by default), `placeholderData: keepPreviousData` for pagination, `useSuspenseQuery` for Suspense, structural sharing (unchanged parts of new data keep their old references → fewer re-renders).

```ts run
// Simplified model of one cache entry: staleTime 30s, gcTime 5min.
const staleTime = 30_000;
const gcTime = 5 * 60_000;
let fetchedAt: number | null = null; // null = not in the cache
let observers = 0;
let lastObserverLeftAt = 0;

function at(t: number, event: 'mount' | 'focus' | 'unmount') {
  const label = `t=${String(t / 1000).padStart(3)}s ${event.padEnd(7)} →`;
  if (fetchedAt !== null && observers === 0 && t - lastObserverLeftAt >= gcTime) fetchedAt = null; // GC'd
  if (event === 'unmount') {
    if (--observers === 0) lastObserverLeftAt = t;
    console.log(`${label} last observer gone: gcTime countdown starts`);
    return;
  }
  if (event === 'mount') observers++;
  if (fetchedAt === null) {
    fetchedAt = t;
    console.log(`${label} cache miss: loading state + fetch`);
  } else if (t - fetchedAt >= staleTime) {
    fetchedAt = t;
    console.log(`${label} stale: show cached data instantly + background refetch`);
  } else {
    console.log(`${label} fresh: show cached data, no request`);
  }
}

at(0, 'mount');
at(10_000, 'focus');
at(45_000, 'focus');
at(60_000, 'unmount');
at(120_000, 'mount');
at(130_000, 'unmount');
at(500_000, 'mount');
```

{{quiz:staletime-vs-gctime}}

### Client state options

- **`useState`/`useReducer` + composition** — the default. Lift state to the nearest common parent; pass it down or use composition before reaching for anything global.
- **Context** — dependency injection, not a state manager. No selectors: **every consumer re-renders** when the value changes. Great for low-frequency values (theme, locale, current user, a store instance); poor for fast-changing data. Split contexts and memoize the value.
- **Zustand** — a small external store with hook selectors built on `useSyncExternalStore`: components re-render only when their selected slice changes. Minimal boilerplate, usable outside React. (v5: a selector returning a *new* object each time causes an infinite loop — use `useShallow`.)
- **Redux Toolkit** — the modern way to write Redux: `createSlice` (Immer-powered "mutations"), `configureStore`, memoized selectors (`createSelector`), excellent devtools, middleware, and **RTK Query** for server state. More ceremony; strong conventions that scale to large teams.
- **Jotai** (atoms) — bottom-up: state is many small atoms plus derived atoms; components subscribe to exactly the atoms they read. (Recoil, the original atom library, is archived.)
- **Signals** (Preact Signals, Solid, Angular, Vue refs; a TC39 proposal) — fine-grained reactivity that updates the DOM without re-rendering components. React doesn't use signals; the React Compiler is React's answer to the same performance problem.
- **XState** — explicit state machines for complex flows (checkout, onboarding) where impossible states must be impossible.

> [!MISTAKE]
> Putting server data in Redux/Zustand and hand-writing `isLoading`, `error`, refetch and cache-invalidation logic. That's a server-state cache — use one. And storing filters in component state when they belong in the URL breaks reload, sharing and the back button.

{{quiz:context-rerender-scope}}

### A decision guide you can say in an interview

1. Is it **from the server**? → a server-state cache (TanStack Query or the framework's data layer). Don't copy it into a client store.
2. Should it **survive reload / be shareable**? → the URL.
3. Can it be **computed** from other state? → derive it in render.
4. Used by **one component or a small subtree**? → `useState`/`useReducer`, lifted as needed.
5. Shared widely but **changes rarely**? → Context.
6. Shared widely and **changes often**, or needs access outside React? → a store with selectors (Zustand for small/medium apps, Redux Toolkit when a large team benefits from strict conventions, middleware and devtools, Jotai for many independent pieces of state).

## Key takeaways

- Re-render triggers: own state, parent render, context, external store. Re-render ≠ DOM update. Optimize only measured, frequent or expensive renders.
- Ladder: measure → move state down → children as props → fix context → `memo` + stable props → virtualize / split / transition.
- `memo` compares props shallowly with `Object.is`; inline objects, arrow functions and JSX `children` defeat it. Stable callbacks need **functional updates** to avoid stale closures.
- React Compiler (1.0, Oct 2025) auto-memoizes but assumes the Rules of React; it doesn't replace good architecture.
- Profile with React DevTools ("why did this render?"), on a production build, with CPU throttling.
- Virtualize long lists (window + overscan + sizer); know the a11y and dynamic-height trade-offs.
- Server state ≠ client state. TanStack Query: keys, dedupe, `staleTime` (freshness) vs `gcTime` (memory for unused entries), stale-while-revalidate, invalidation. Client state: local first, Context for low-frequency, a selector store for high-frequency; URL for shareable state.
