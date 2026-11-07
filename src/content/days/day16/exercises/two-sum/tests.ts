import { describe, it, expect } from 'vitest';
import { twoSum } from './solution';

describe('twoSum', () => {
  it('finds the pair in the classic example', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
  });

  it('works on unsorted input where the pair is not adjacent', () => {
    expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
  });

  it('does not use the same element twice', () => {
    // 3 + 3 = 6, but there is only one 3 — the answer is 2 + 4
    expect(twoSum([3, 2, 4], 6)).not.toEqual([0, 0]);
    expect(twoSum([3], 6)).toBeNull();
  });

  it('handles duplicate values', () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1]);
    expect(twoSum([1, 5, 5, 9], 10)).toEqual([1, 2]);
  });

  it('handles negatives and zero', () => {
    expect(twoSum([-3, 4, 3, 90], 0)).toEqual([0, 2]);
    expect(twoSum([0, 4, 3, 0], 0)).toEqual([0, 3]);
    expect(twoSum([-1, -2, -3, -4, -5], -8)).toEqual([2, 4]);
  });

  it('returns null when no pair exists (including empty input)', () => {
    expect(twoSum([1, 2, 3], 100)).toBeNull();
    expect(twoSum([], 0)).toBeNull();
  });

  it('runs in linear time on 60,000 numbers (pair at the very end)', () => {
    const n = 60_000;
    // all even values, so no two of them can sum to the odd target…
    const nums = Array.from({ length: n - 2 }, (_, i) => i * 2);
    // …except 1 + 1_000_000_000
    nums.push(1, 1_000_000_000);
    const start = performance.now();
    const result = twoSum(nums, 1_000_000_001);
    const elapsed = performance.now() - start;
    expect(result).toEqual([n - 2, n - 1]);
    expect(elapsed).toBeLessThan(300);
  });
});
