import { describe, it, expect } from 'vitest';
import { subarraySum } from './solution';

describe('subarraySum', () => {
  it('counts overlapping subarrays', () => {
    expect(subarraySum([1, 1, 1], 2)).toBe(2);
    expect(subarraySum([1, 2, 3], 3)).toBe(2); // [1,2] and [3]
  });

  it('returns 0 for an empty array', () => {
    expect(subarraySum([], 0)).toBe(0);
    expect(subarraySum([], 5)).toBe(0);
  });

  it('handles a single element', () => {
    expect(subarraySum([5], 5)).toBe(1);
    expect(subarraySum([5], 4)).toBe(0);
  });

  it('handles negative numbers (where a sliding window breaks)', () => {
    expect(subarraySum([1, -1, 0], 0)).toBe(3); // [1,-1], [0], [1,-1,0]
    expect(subarraySum([3, 4, 7, 2, -3, 1, 4, 2], 7)).toBe(4);
  });

  it('handles a negative k', () => {
    expect(subarraySum([-1, -1, 1], -1)).toBe(3); // [-1], [-1], [-1,-1,1]
  });

  it('counts every subarray of zeros', () => {
    expect(subarraySum([0, 0, 0], 0)).toBe(6);
  });

  it('counts the subarray that starts at index 0 (the empty prefix)', () => {
    expect(subarraySum([2, 2], 4)).toBe(1);
  });

  it('runs in linear time on 60,000 numbers', () => {
    const nums = Array.from({ length: 60_000 }, (_, i) => ((i * 7919) % 21) - 10);
    const start = performance.now();
    const result = subarraySum(nums, 3);
    const elapsed = performance.now() - start;
    expect(result).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(300);
  });
});
