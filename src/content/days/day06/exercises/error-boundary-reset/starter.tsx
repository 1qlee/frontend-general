import { Component, useState, type ErrorInfo, type ReactNode } from 'react';

export interface FallbackProps {
  error: Error;
  /** Clear the error and try rendering the children again. */
  resetErrorBoundary: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackRender: (props: FallbackProps) => ReactNode;
  /** Side effects (logging/monitoring) — called once per caught error. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Called whenever the boundary resets (button or resetKeys) — clear whatever caused the error. */
  onReset?: () => void;
  /** When any of these change (Object.is) while showing the fallback, the boundary resets itself. */
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * TODO:
 * - static getDerivedStateFromError → store the error (render phase: keep it pure)
 * - componentDidCatch → onError (commit phase: side effects OK)
 * - render → fallbackRender({ error, resetErrorBoundary }) or children
 * - resetErrorBoundary → onReset() + clear the error
 * - componentDidUpdate → reset when resetKeys change while an error is shown
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  render() {
    return this.props.children;
  }
}

// ---- Preview only -----------------------------------------------------------
function BuggyCounter() {
  const [count, setCount] = useState(0);
  if (count === 3) throw new Error('I crashed at 3!');
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      Count: {count} (crashes at 3)
    </button>
  );
}

export default function ErrorBoundaryDemo() {
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12 }}>
      <p>The header outside the boundary keeps working when the counter crashes.</p>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div role="alert" style={{ border: '1px solid crimson', padding: 12 }}>
            <p>Something went wrong: {error.message}</p>
            <button type="button" onClick={resetErrorBoundary}>
              Try again
            </button>
          </div>
        )}
      >
        <BuggyCounter />
      </ErrorBoundary>
    </div>
  );
}
