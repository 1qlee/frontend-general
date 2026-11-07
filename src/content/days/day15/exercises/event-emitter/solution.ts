/**
 * Maps each event name to the tuple of arguments its listeners receive, e.g.
 *   type ChatEvents = { message: [text: string, from: string]; typing: [userId: string]; close: [] };
 * (`T extends Record<keyof T, unknown[]>` lets both `type` aliases and `interface`s be used.)
 */
export type Listener<Args extends unknown[]> = (...args: Args) => void;

interface Entry {
  /** The ORIGINAL function (not a wrapper), so `off(event, fn)` also finds once-listeners. */
  listener: unknown;
  once: boolean;
}

export class EventEmitter<Events extends Record<keyof Events, unknown[]>> {
  // One internal map erases the per-event types; the public method signatures restore them.
  #listeners = new Map<keyof Events, Entry[]>();

  /** Registers `listener` for `event`. Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    return this.#add(event, listener, false);
  }

  /** Like `on`, but the listener is removed before its first call, so it runs at most once. */
  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    return this.#add(event, listener, true);
  }

  /** Removes `listener` (registered with `on` OR `once`). Unknown listeners are ignored. */
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const entry = this.#listeners.get(event)?.find((e) => e.listener === listener);
    if (entry) this.#remove(event, entry);
  }

  /**
   * Calls the listeners registered for `event`, in registration order, with `args`.
   * Listeners added or removed during an emit must not break the current dispatch.
   * Returns true if at least one listener was called.
   */
  emit<K extends keyof Events>(event: K, ...args: Events[K]): boolean {
    const entries = this.#listeners.get(event);
    if (!entries?.length) return false;
    // Iterate a SNAPSHOT: a listener that removes itself (or another) can't shift the
    // array under us and make us skip someone, and listeners added now wait for the next emit.
    for (const entry of [...entries]) {
      // Remove once-listeners BEFORE calling them, so a re-entrant emit can't call them twice.
      if (entry.once) this.#remove(event, entry);
      (entry.listener as Listener<Events[K]>)(...args);
    }
    return true;
  }

  /** How many listeners are currently registered for `event`. */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.#listeners.get(event)?.length ?? 0;
  }

  #add<K extends keyof Events>(event: K, listener: Listener<Events[K]>, once: boolean): () => void {
    const entry: Entry = { listener, once };
    const entries = this.#listeners.get(event);
    if (entries) entries.push(entry);
    else this.#listeners.set(event, [entry]);
    // The unsubscribe closes over THIS registration, so it is exact even if the same
    // function was registered twice — and calling it twice is harmless.
    return () => this.#remove(event, entry);
  }

  #remove(event: keyof Events, entry: Entry): void {
    const entries = this.#listeners.get(event);
    if (!entries) return;
    const index = entries.indexOf(entry);
    if (index === -1) return;
    entries.splice(index, 1);
    if (entries.length === 0) this.#listeners.delete(event); // don't keep empty arrays around
  }
}
