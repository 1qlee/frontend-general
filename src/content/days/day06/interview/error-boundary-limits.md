**One-liner:** error boundaries catch errors thrown while React renders their subtree — render, lifecycles and effects — and show a fallback; they don't catch event-handler errors, async errors, SSR errors or their own errors.

**How they work:** still a class. `static getDerivedStateFromError` runs in the render phase and must be pure — it returns state that switches to the fallback. `componentDidCatch(error, info)` runs in the commit phase — that's where I log, including `info.componentStack`. There's no hook equivalent. Without any boundary, a render error unmounts the whole root.

**What they miss, and why:**
- **Event handlers** run after rendering, in response to a browser event → `try/catch` in the handler and set error state.
- **Async callbacks** (`setTimeout`, a promise's `.then`) throw when React isn't rendering → forward the error into render with `setState(() => { throw error; })`, or `showBoundary(error)` from `react-error-boundary`.
- **Server rendering** → with streaming SSR, React emits the nearest Suspense fallback and retries on the client, where a boundary can catch it.
- **The boundary's own render** → it propagates to the next boundary up.

**React 19 additions:** rejections read with `use(promise)` and errors thrown in Actions/transitions *do* reach the nearest boundary, and `createRoot` accepts `onCaughtError` / `onUncaughtError` for reporting.

**In practice:** boundaries per route and per independent widget, plus one at the root; pair each with Suspense for that region's loading state; offer a reset — a "Try again" button or `resetKeys` — and fix the cause in `onReset`, or the same error comes straight back.
