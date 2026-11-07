/**
 * Least-recently-used cache with O(1) get/put.
 *
 * A `Map` iterates in insertion order, so if we re-insert a key every time it is
 * used, the FIRST key in the map is always the least recently used one.
 */
export class LRUCache<K, V> {
  private readonly map = new Map<K, V>();
  readonly capacity: number;
  private readonly onEvict?: (key: K, value: V) => void;

  constructor(capacity: number, onEvict?: (key: K, value: V) => void) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`capacity must be a positive integer, got ${capacity}`);
    }
    this.capacity = capacity;
    this.onEvict = onEvict;
  }

  get size(): number {
    return this.map.size;
  }

  /** Does NOT count as a use (no recency change). */
  has(key: K): boolean {
    return this.map.has(key);
  }

  get(key: K): V | undefined {
    // has() rather than a truthiness check: 0, '' and false are real values.
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    // Move to the most-recently-used end.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  put(key: K, value: V): void {
    if (this.map.has(key)) {
      // Updating an existing key never evicts; it just refreshes recency.
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next();
      if (!oldest.done) {
        const evictedValue = this.map.get(oldest.value) as V;
        this.map.delete(oldest.value);
        this.onEvict?.(oldest.value, evictedValue);
      }
    }
    this.map.set(key, value);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  /** Keys from least to most recently used. */
  keys(): K[] {
    return [...this.map.keys()];
  }
}
