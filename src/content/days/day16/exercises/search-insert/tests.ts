import { describe, it, expect } from 'vitest';
import { searchInsert } from './solution';

describe('searchInsert', () => {
  it('finds the index of a present target', () => {
    expect(searchInsert([1, 3, 5, 6], 5)).toBe(2);
  });

  it('returns the insertion point for a missing target', () => {
    expect(searchInsert([1, 3, 5, 6], 2)).toBe(1);
    expect(searchInsert([1, 3, 5, 6], 0)).toBe(0);
    expect(searchInsert([1, 3, 5, 6], 7)).toBe(4);
  });

  it('returns 0 for an empty array', () => {
    expect(searchInsert([], 3)).toBe(0);
  });

  it('handles a single element', () => {
    expect(searchInsert([4], 4)).toBe(0);
    expect(searchInsert([4], 1)).toBe(0);
    expect(searchInsert([4], 9)).toBe(1);
  });

  it('returns the FIRST position among duplicates', () => {
    expect(searchInsert([1, 2, 2, 2, 3], 2)).toBe(1);
    expect(searchInsert([2, 2, 2, 2], 2)).toBe(0);
    expect(searchInsert([1, 1, 1, 5], 3)).toBe(3);
  });

  it('handles negative numbers', () => {
    expect(searchInsert([-9, -5, -3, -3, 0, 4], -3)).toBe(2);
    expect(searchInsert([-9, -5, -3, -3, 0, 4], -4)).toBe(2);
  });

  it('reads O(log n) elements on a 1,000,000-element array', () => {
    const data = Array.from({ length: 1_000_000 }, (_, i) => i * 2);
    let reads = 0;
    const counted = new Proxy(data, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) reads++;
        return Reflect.get(target, prop, receiver);
      },
    });
    expect(searchInsert(counted, 1_234_567)).toBe(617_284);
    expect(reads).toBeLessThanOrEqual(50); // log2(1e6) ≈ 20; a linear scan reads ~600,000
  });
});
