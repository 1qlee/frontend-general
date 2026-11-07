import { useSyncExternalStore } from 'react';

export type Listener = () => void;

/** A partial state object, or an updater that receives the current state. */
export type SetStateAction<S> = Partial<S> | ((state: S) => Partial<S>);

export interface Store<S extends object> {
  getState: () => S;
  /**
   * Shallow-merges the partial (or the updater's result) into a NEW state object and
   * notifies subscribers. If an updater returns the current state object itself,
   * nothing changes and nobody is notified.
   */
  setState: (action: SetStateAction<S>) => void;
  /** Registers a listener and returns an unsubscribe function. */
  subscribe: (listener: Listener) => () => void;
}

/**
 * A tiny Zustand-like store. Methods must be plain closures (safe to destructure and
 * to pass around without `this`).
 */
export function createStore<S extends object>(initialState: S): Store<S> {
  let state = initialState;
  const listeners = new Set<Listener>();

  const getState = () => state;

  const setState = (action: SetStateAction<S>) => {
    const partial = typeof action === 'function' ? (action as (state: S) => Partial<S>)(state) : action;
    if (Object.is(partial, state)) return; // updater returned the same object: no change
    // Always a NEW object: subscribers (and React) detect changes by reference.
    state = { ...state, ...partial };
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { getState, setState, subscribe };
}

/**
 * Subscribes a component to `selector(store.getState())`. The component must re-render
 * only when the SELECTED value changes (compared with Object.is), and it must not
 * resubscribe on every render. Use useSyncExternalStore.
 */
export function useStore<S extends object, U>(store: Store<S>, selector: (state: S) => U): U {
  // getSnapshot returns the SELECTED slice. After every store change React calls it and
  // compares the result with Object.is: unchanged slice → this component is not re-rendered.
  // The selector must therefore return a stable value (a primitive or an existing object),
  // not a freshly built object/array — see the explanation for the equality-fn variant.
  const getSnapshot = () => selector(store.getState());
  // `store.subscribe` has a stable identity (created once in createStore), so React
  // subscribes once on mount and unsubscribes on unmount. An inline arrow here would
  // make React unsubscribe/resubscribe after every render.
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
