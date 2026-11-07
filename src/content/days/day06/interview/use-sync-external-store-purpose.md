**One-liner:** it's the official way to subscribe to a store React doesn't own — browser APIs or state libraries — in a way that stays consistent under concurrent rendering.

**The API:** `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`. `subscribe` registers a listener and returns an unsubscribe function, and should be stable. `getSnapshot` returns an immutable, cached value — the same value by `Object.is` while nothing changed, or React re-renders in a loop. `getServerSnapshot` provides the value for SSR and hydration.

**Why not `useState` + `useEffect`?**
1. **Tearing.** In concurrent rendering React can pause a render half-way. If a mutable store changes during that pause, components rendered before and after the change show different values in the same commit. `useSyncExternalStore` re-checks the snapshot before committing and forces a synchronous re-render if it changed, so the UI is consistent.
2. **Timing gaps.** An effect subscribes after paint, so a change between render and subscription is missed unless you re-read; you also duplicate external state into React state.
3. **SSR.** `getServerSnapshot` gives a hydration-safe value instead of a mismatch.

**Examples:** `useOnlineStatus` with `online`/`offline` events, `useMediaQuery` with `matchMedia`, `localStorage` via the `storage` event. Redux and Zustand use it internally, with memoised selectors so a selector that returns objects doesn't loop.

**Trade-off:** updates from an external store can't be non-blocking transitions — React falls back to a blocking render — so it's for genuinely external state, not a replacement for `useState`.
