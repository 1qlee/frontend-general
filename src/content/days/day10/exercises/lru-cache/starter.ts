/**
 * Least-recently-used cache with O(1) get/put.
 *
 * - `get(key)` returns the value (or undefined) and marks the key as most recently used.
 * - `put(key, value)` inserts/updates and marks it most recently used. If inserting a NEW key
 *   would exceed `capacity`, evict the least recently used entry first and call `onEvict(key, value)`.
 * - `has(key)` does NOT change recency. `delete(key)` removes without calling onEvict.
 * - `keys()` returns keys from least to most recently used.
 * - The constructor throws a RangeError unless capacity is a positive integer.
 */
export class LRUCache<K, V> {
  readonly capacity: number;

  constructor(capacity: number, onEvict?: (key: K, value: V) => void) {
    this.capacity = capacity;
    throw new Error('Not implemented');
  }

  get size(): number {
    throw new Error('Not implemented');
  }

  has(key: K): boolean {
    throw new Error('Not implemented');
  }

  get(key: K): V | undefined {
    throw new Error('Not implemented');
  }

  put(key: K, value: V): void {
    throw new Error('Not implemented');
  }

  delete(key: K): boolean {
    throw new Error('Not implemented');
  }

  keys(): K[] {
    throw new Error('Not implemented');
  }
}
