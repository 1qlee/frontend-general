import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { createStore, useStore, type Store } from './solution';

interface AppState {
  count: number;
  name: string;
}

const initial = (): AppState => ({ count: 0, name: 'Ada' });

describe('createStore', () => {
  it('returns the initial state, and its methods work when destructured', () => {
    const { getState, setState } = createStore(initial());
    expect(getState()).toEqual({ count: 0, name: 'Ada' });
    setState({ count: 1 });
    expect(getState().count).toBe(1);
  });

  it('shallow-merges partial updates into a NEW state object', () => {
    const store = createStore(initial());
    const before = store.getState();
    store.setState({ count: 2 });
    expect(store.getState()).toEqual({ count: 2, name: 'Ada' });
    expect(store.getState()).not.toBe(before);
    expect(before.count).toBe(0); // the old snapshot was not mutated
  });

  it('accepts an updater function', () => {
    const store = createStore(initial());
    store.setState((s) => ({ count: s.count + 5 }));
    store.setState((s) => ({ count: s.count + 5 }));
    expect(store.getState().count).toBe(10);
  });

  it('notifies subscribers, and stops after unsubscribe', () => {
    const store = createStore(initial());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when an updater returns the current state', () => {
    const store = createStore(initial());
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((s) => s);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('useStore', () => {
  function Count({ store, onRender }: { store: Store<AppState>; onRender?: () => void }) {
    const count = useStore(store, (s) => s.count);
    onRender?.();
    return <p>Count: {count}</p>;
  }

  function Name({ store, onRender }: { store: Store<AppState>; onRender?: () => void }) {
    const name = useStore(store, (s) => s.name);
    onRender?.();
    return <p>Name: {name}</p>;
  }

  it('renders the selected slice and updates when it changes', () => {
    const store = createStore(initial());
    render(<Count store={store} />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
    act(() => store.setState({ count: 3 }));
    expect(screen.getByText('Count: 3')).toBeInTheDocument();
  });

  it('re-renders only the components whose selected slice changed', () => {
    const store = createStore(initial());
    const countRenders = vi.fn();
    const nameRenders = vi.fn();
    render(
      <>
        <Count store={store} onRender={countRenders} />
        <Name store={store} onRender={nameRenders} />
      </>,
    );
    act(() => store.setState({ count: 1 }));
    expect(countRenders).toHaveBeenCalledTimes(2);
    expect(nameRenders).toHaveBeenCalledTimes(1);
    act(() => store.setState({ name: 'Grace' }));
    expect(screen.getByText('Name: Grace')).toBeInTheDocument();
    expect(countRenders).toHaveBeenCalledTimes(2);
  });

  it('does not re-render when an update leaves the selected value equal', () => {
    const store = createStore(initial());
    const countRenders = vi.fn();
    render(<Count store={store} onRender={countRenders} />);
    act(() => store.setState({ count: 0 })); // new state object, same count
    expect(countRenders).toHaveBeenCalledTimes(1);
  });

  it('reflects updates triggered by user events', async () => {
    const user = userEvent.setup();
    const store = createStore(initial());
    function Increment() {
      return <button onClick={() => store.setState((s) => ({ count: s.count + 1 }))}>+1</button>;
    }
    render(
      <>
        <Count store={store} />
        <Increment />
      </>,
    );
    await user.click(screen.getByRole('button', { name: '+1' }));
    await user.click(screen.getByRole('button', { name: '+1' }));
    expect(screen.getByText('Count: 2')).toBeInTheDocument();
  });

  it('subscribes once, not on every render', () => {
    const store = createStore(initial());
    const subscribe = vi.spyOn(store, 'subscribe');
    const { rerender } = render(<Count store={store} />);
    rerender(<Count store={store} />);
    rerender(<Count store={store} />);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes when the component unmounts', () => {
    const real = createStore(initial());
    const unsubscribed = vi.fn();
    const store: Store<AppState> = {
      ...real,
      subscribe: (listener) => {
        const unsubscribe = real.subscribe(listener);
        return () => {
          unsubscribed();
          unsubscribe();
        };
      },
    };
    const { unmount } = render(<Count store={store} />);
    expect(unsubscribed).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribed).toHaveBeenCalledTimes(1);
  });
});
