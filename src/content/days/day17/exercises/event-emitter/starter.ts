/**
 * Maps each event name to the tuple of arguments its listeners receive, e.g.
 *   type ChatEvents = { message: [text: string, from: string]; typing: [userId: string]; close: [] };
 * (`T extends Record<keyof T, unknown[]>` lets both `type` aliases and `interface`s be used.)
 */
export type Listener<Args extends unknown[]> = (...args: Args) => void;

export class EventEmitter<Events extends Record<keyof Events, unknown[]>> {
  /** Registers `listener` for `event`. Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    throw new Error('Not implemented');
  }

  /** Like `on`, but the listener is removed before its first call, so it runs at most once. */
  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    throw new Error('Not implemented');
  }

  /** Removes `listener` (registered with `on` OR `once`). Unknown listeners are ignored. */
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    throw new Error('Not implemented');
  }

  /**
   * Calls the listeners registered for `event`, in registration order, with `args`.
   * Listeners added or removed during an emit must not break the current dispatch.
   * Returns true if at least one listener was called.
   */
  emit<K extends keyof Events>(event: K, ...args: Events[K]): boolean {
    throw new Error('Not implemented');
  }

  /** How many listeners are currently registered for `event`. */
  listenerCount<K extends keyof Events>(event: K): number {
    throw new Error('Not implemented');
  }
}
