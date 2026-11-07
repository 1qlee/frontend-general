**One-liner:** `useState` for independent, simple values; `useReducer` when the **transitions** are the interesting part — several values that change together, or updates that deserve names.

**It's about where the update logic lives.** `useState` is literally `useReducer` with a built-in reducer, so neither is more powerful. With `useState` the logic lives in event handlers, which is perfect for `setName(value)` or a toggle. With a reducer it lives in one pure function, which pays off when:

- one event must update `status`, `data` and `error` consistently;
- the next state depends on the previous one in non-trivial ways;
- you want named events (`'itemAdded'`, `'checkoutStarted'`) that read like a log and can be unit-tested without rendering;
- you pass the updater deep — `dispatch` is stable, so it works well through context and never breaks memoisation.

**State machines:** a discriminated-union state plus a reducer that ignores illegal transitions makes impossible states unrepresentable — a late `resolved` action after `reset` is simply a no-op.

**Rules:** reducers are pure (StrictMode calls them twice to prove it), side effects go in the handler or an effect that dispatches the result, and updates are immutable — returning the same reference means "no change" and React bails out.

**Trade-off:** more indirection and boilerplate. I usually start with `useState` and move to a reducer when I see setters being called in groups or the handler logic getting hard to follow.
