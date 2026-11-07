**State as a discriminated union.** `AsyncState<T>` makes impossible states (loading *and* errored, data without success) unrepresentable, and TypeScript forces consumers to narrow on `status` before touching `data` or `error`. The solution uses module-level `IDLE` / `LOADING` constants so setting the same status twice is an `Object.is` bail-out instead of an extra render.

**Races: abort *and* ignore.** Each effect run creates its own `AbortController`; the cleanup aborts it. The callbacks check `controller.signal.aborted` before setting state, so the signal doubles as the "ignore" flag. Abort saves the network; ignoring is what guarantees correctness — the fetcher might not honour the signal (the tests' fetcher doesn't).

**The fetcher and the dependency array.** Putting `fetcher` in the deps looks "correct" but with an inline arrow the effect re-runs after **every** render: abort, refetch, `setState({ status: 'loading' })` (a new object) → render → new fetcher → … an infinite loop (that's why one test has a guard). The options:

1. **Latest ref** (the solution): keep the fetcher in a ref refreshed by `useLayoutEffect`, depend only on `key`. The effect always calls the newest fetcher, and only a new key triggers a request.
2. **Require a stable fetcher** (`useCallback` at every call site) — pushes the problem onto every caller and fails silently when someone forgets. Day 5's exercise documented "must be stable"; a reusable hook should be more forgiving.
3. **`useEffectEvent`** (React 19.2+): `const load = useEffectEvent(fetcher)` and call `load(key, signal)` inside the effect — the official version of option 1.

**Subtleties to mention**

- **One stale render on key change:** the render with the new key still returns the *previous* state (e.g. the old user's data) until the effect sets `loading`. Fix by storing the key alongside the state and deriving during render: `state.key === key ? state : { status: 'loading' }`.
- **StrictMode** mounts, unmounts and re-mounts in development, so the first request is aborted immediately — this design handles it for free.
- This hook has no **cache, deduplication, retries or revalidation**. In production use TanStack Query or SWR, or React 19's `use(promise)` with Suspense and a cache (Day 7). In an interview, build it, then say what a library adds.

**Follow-ups:** add `refetch()` (a counter in state that's part of the effect deps), keep the previous data while reloading (`{ status: 'loading'; previous?: T }`), debounce the key (compose with `useDebouncedValue`), and justify returning an object rather than a tuple (four shapes, extensible).
