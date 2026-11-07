import { describe, it, expect, vi } from 'vitest';
import { memoize } from './solution';

describe('memoize', () => {
  it('returns cached results for the same first argument', () => {
    const square = vi.fn((n: number) => n * n);
    const fast = memoize(square);
    expect(fast(4)).toBe(16);
    expect(fast(4)).toBe(16);
    expect(square).toHaveBeenCalledTimes(1);
  });

  it('computes separately for different arguments', () => {
    const square = vi.fn((n: number) => n * n);
    const fast = memoize(square);
    fast(2);
    fast(3);
    expect(square).toHaveBeenCalledTimes(2);
  });

  it('caches falsy results such as 0 and undefined', () => {
    const fn = vi.fn((n: number) => (n === 0 ? 0 : undefined));
    const fast = memoize(fn);
    fast(0);
    fast(0);
    fast(1);
    fast(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses the resolver to build cache keys from all arguments', () => {
    const add = vi.fn((a: number, b: number) => a + b);
    const fast = memoize(add, (a, b) => `${a},${b}`);
    expect(fast(1, 2)).toBe(3);
    expect(fast(1, 3)).toBe(4); // would be wrong (3) if only the first arg were the key
    expect(fast(1, 2)).toBe(3);
    expect(add).toHaveBeenCalledTimes(2);
  });

  it('exposes the cache as a Map that can be cleared', () => {
    const fn = vi.fn((s: string) => s.toUpperCase());
    const fast = memoize(fn);
    fast('a');
    expect(fast.cache).toBeInstanceOf(Map);
    expect(fast.cache.get('a')).toBe('A');
    fast.cache.clear();
    fast('a');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('forwards `this`', () => {
    const obj = {
      factor: 10,
      scale: memoize(function (this: { factor: number }, n: number) {
        return n * this.factor;
      }),
    };
    expect(obj.scale(2)).toBe(20);
  });
});
