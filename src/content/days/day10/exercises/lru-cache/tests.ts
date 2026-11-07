import { describe, it, expect, vi } from 'vitest';
import { LRUCache } from './solution';

describe('LRUCache', () => {
  it('stores and retrieves values; missing keys return undefined', () => {
    const cache = new LRUCache<string, number>(2);
    cache.put('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.size).toBe(1);
  });

  it('evicts the least recently used entry when a new key exceeds capacity', () => {
    const cache = new LRUCache<string, number>(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('c', 3);
    expect(cache.has('a')).toBe(false);
    expect(cache.keys()).toEqual(['b', 'c']);
    expect(cache.size).toBe(2);
  });

  it('get() marks an entry as most recently used', () => {
    const cache = new LRUCache<string, number>(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.get('a'); // 'b' is now the LRU entry
    cache.put('c', 3);
    expect(cache.keys()).toEqual(['a', 'c']);
  });

  it('updating an existing key refreshes recency and never evicts', () => {
    const cache = new LRUCache<string, number>(2);
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('a', 10);
    expect(cache.size).toBe(2);
    expect(cache.keys()).toEqual(['b', 'a']);
    cache.put('c', 3);
    expect(cache.keys()).toEqual(['a', 'c']);
    expect(cache.get('a')).toBe(10);
  });

  it('has() does not change recency; delete() removes an entry', () => {
    const cache = new LRUCache<string, number>(2);
    cache.put('a', 1);
    cache.put('b', 2);
    expect(cache.has('a')).toBe(true);
    cache.put('c', 3); // 'a' is still the LRU entry because has() is not a "use"
    expect(cache.keys()).toEqual(['b', 'c']);
    expect(cache.delete('b')).toBe(true);
    expect(cache.delete('b')).toBe(false);
    expect(cache.keys()).toEqual(['c']);
  });

  it('treats falsy values (0, empty string, false) as real hits', () => {
    const cache = new LRUCache<string, number | string | boolean>(3);
    cache.put('zero', 0);
    cache.put('empty', '');
    cache.put('no', false);
    cache.get('zero'); // must count as a use
    cache.put('new', 1);
    expect(cache.get('zero')).toBe(0);
    expect(cache.get('empty')).toBeUndefined(); // evicted: it was the LRU entry
    expect(cache.get('no')).toBe(false);
  });

  it('calls onEvict with the evicted entry (not on delete or update)', () => {
    const onEvict = vi.fn();
    const cache = new LRUCache<string, number>(1, onEvict);
    cache.put('a', 1);
    cache.put('a', 2);
    cache.delete('a');
    expect(onEvict).not.toHaveBeenCalled();
    cache.put('x', 1);
    cache.put('y', 2);
    expect(onEvict).toHaveBeenCalledTimes(1);
    expect(onEvict).toHaveBeenCalledWith('x', 1);
  });

  it('rejects a capacity that is not a positive integer', () => {
    expect(() => new LRUCache(0)).toThrow(RangeError);
    expect(() => new LRUCache(-1)).toThrow(RangeError);
    expect(() => new LRUCache(1.5)).toThrow(RangeError);
  });

  it('compares object keys by identity, not by shape', () => {
    const cache = new LRUCache<{ id: number }, string>(2);
    const keyA = { id: 1 };
    const lookalike = { id: 1 };
    cache.put(keyA, 'A');
    expect(cache.get(keyA)).toBe('A');
    expect(cache.get(lookalike)).toBeUndefined();
    cache.put(lookalike, 'B');
    expect(cache.size).toBe(2);
  });
});
