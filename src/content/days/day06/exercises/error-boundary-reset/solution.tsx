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

function keysChanged(prev: readonly unknown[] = [], next: readonly unknown[] = []): boolean {
  return prev.length !== next.length || prev.some((key, i) => !Object.is(key, next[i]));
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  // Render phase: must be pure. Turns the thrown value into state → fallback UI.
  static getDerivedStateFromError(thrown: unknown): ErrorBoundaryState {
    return { error: thrown instanceof Error ? thrown : new Error(String(thrown)) };
  }

  // Commit phase: side effects are allowed here.
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    // `prevState.error !== null` skips the update in which the error was just caught —
    // otherwise a resetKey that changed in that same update would reset immediately (and loop).
    if (this.state.error !== null && prevState.error !== null && keysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error !== null) {
      return this.props.fallbackRender({ error, resetErrorBoundary: this.resetErrorBoundary });
    }
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
