import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, type FallbackProps } from './solution';

// The child reads this module-level flag, so a test can "fix the bug" before retrying.
let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error('boom');
  return <p>All good</p>;
}

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Error: {error.message}</p>
      <button type="button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    // React reports caught errors with console.error; keep the output readable.
    vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
  });

  it('renders its children when nothing throws', () => {
    shouldThrow = false;
    render(
      <ErrorBoundary fallbackRender={Fallback}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders the fallback with the error when a child throws during render, without breaking siblings', () => {
    render(
      <div>
        <h1>Dashboard</h1>
        <ErrorBoundary fallbackRender={Fallback}>
          <Bomb />
        </ErrorBoundary>
      </div>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Error: boom');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('calls onError once with the error and the component stack', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary fallbackRender={Fallback} onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    const [error, info] = onError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('boom');
    expect(info.componentStack).toContain('Bomb');
  });

  it('resetErrorBoundary calls onReset and renders the children again', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <ErrorBoundary fallbackRender={Fallback} onReset={onReset}>
        <Bomb />
      </ErrorBoundary>,
    );
    shouldThrow = false; // "fix the cause" before retrying
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the fallback again if the children still throw after a reset', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary fallbackRender={Fallback}>
        <Bomb />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Error: boom');
  });

  it('resets automatically when a resetKey changes', () => {
    const onReset = vi.fn();
    const { rerender } = render(
      <ErrorBoundary fallbackRender={Fallback} onReset={onReset} resetKeys={['user-1']}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    rerender(
      <ErrorBoundary fallbackRender={Fallback} onReset={onReset} resetKeys={['user-2']}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('does not reset (or call onReset) when resetKeys change but there is no error', () => {
    shouldThrow = false;
    const onReset = vi.fn();
    const { rerender } = render(
      <ErrorBoundary fallbackRender={Fallback} onReset={onReset} resetKeys={[1]}>
        <Bomb />
      </ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary fallbackRender={Fallback} onReset={onReset} resetKeys={[2]}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
