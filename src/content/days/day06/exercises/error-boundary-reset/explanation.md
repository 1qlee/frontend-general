**Two lifecycles, two phases.**

- `static getDerivedStateFromError(error)` runs during the **render phase**. It must be pure — it just returns the state that switches `render()` to the fallback. It's static precisely so you can't touch `this` or cause side effects there.
- `componentDidCatch(error, info)` runs in the **commit phase**, after the fallback is on screen. That's where logging and `onError` belong. `info.componentStack` is the React component stack — far more useful in monitoring than the JS stack.

**Why a class?** There is still no hook for "catch errors thrown by my children while they render". Libraries (including `react-error-boundary`) wrap exactly this class and expose friendlier APIs on top (`FallbackComponent`, `useErrorBoundary`, `withErrorBoundary`).

**Reset.** `resetErrorBoundary` is an arrow-function class field, so it can be handed to the fallback without `bind`. It calls `onReset` first — that's where the caller fixes the cause (clear a cache, refetch, reset a form); resetting without fixing anything just throws again.

**`resetKeys` and the subtle edge case.** `componentDidUpdate` compares old and new keys element-wise with `Object.is`. It only resets when an error is showing **and was already showing before this update** (`prevState.error !== null`). Without that check, if the same update that made a child throw also changed a reset key (say, navigating to a user whose profile crashes), the boundary would reset immediately, the child would throw again, and you'd loop. `react-error-boundary` has exactly this guard.

**Limits to state in the interview:** boundaries don't catch errors in **event handlers**, **async callbacks** (`setTimeout`, `.then`), **SSR**, or **their own render**. To route an async error into the nearest boundary, rethrow it during render: `setState(() => { throw error; })` — which is what `useErrorBoundary().showBoundary(error)` does. In React 19, rejections read with `use(promise)` and errors inside Actions/transitions *do* reach boundaries.

**`key` vs `resetKeys`:** changing the boundary's `key` always remounts the boundary **and** its children (losing their state), error or not. `resetKeys` only acts after an error.

**Follow-ups**

- *Write `withErrorBoundary(Component, props)`* → a HOC returning a component that renders `<ErrorBoundary {...props}><Component {...p} /></ErrorBoundary>` — a classic "write a HOC" prompt.
- *Where do you put boundaries?* → route level, around independent widgets, plus one at the root; pair each with `Suspense` for that region's loading state.
- *Global reporting?* → React 19's `createRoot(el, { onCaughtError, onUncaughtError })`, or your monitoring SDK's boundary.
- *Why do tests print errors?* → React logs caught errors with `console.error` in development; these tests silence it with `vi.spyOn(console, 'error')`.
