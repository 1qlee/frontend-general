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
  throw new Error('Not implemented');
}

/**
 * Subscribes a component to `selector(store.getState())`. The component must re-render
 * only when the SELECTED value changes (compared with Object.is), and it must not
 * resubscribe on every render. Use useSyncExternalStore.
 */
export function useStore<S extends object, U>(store: Store<S>, selector: (state: S) => U): U {
  throw new Error('Not implemented');
}
