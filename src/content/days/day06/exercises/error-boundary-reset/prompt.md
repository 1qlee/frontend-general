Implement a reusable `ErrorBoundary` class with the API of the popular `react-error-boundary` package.

```tsx
<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div role="alert">
      <p>Something went wrong: {error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )}
  onError={(error, info) => logToMonitoring(error, info.componentStack)}
  onReset={() => clearBrokenCache()}
  resetKeys={[userId]}
>
  <Profile userId={userId} />
</ErrorBoundary>
```

**Requirements**

1. Render `children`. When a descendant throws during rendering, render `fallbackRender({ error, resetErrorBoundary })` instead; content outside the boundary keeps working. Wrap non-`Error` throws in an `Error`.
2. Call `onError(error, info)` once per caught error (`info.componentStack` names the component that threw).
3. `resetErrorBoundary()` calls `onReset()`, clears the error and renders the children again — and if they still throw, the fallback comes back.
4. **`resetKeys`:** when any key changes (element-wise `Object.is`, or a different length) **while the fallback is showing**, reset automatically (calling `onReset`). Key changes while there is no error do nothing.

**What the interviewer is looking for:** which lifecycle does what (`getDerivedStateFromError` is render-phase and pure; `componentDidCatch` is commit-phase and may log), why this still has to be a class, and sensible reset semantics.
