import { describe, it, expect } from 'vitest';
import { topKFrequent } from './solution';

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

describe('topKFrequent', () => {
  it('returns the two most frequent values (any order)', () => {
    expect(sorted(topKFrequent([1, 1, 1, 2, 2, 3], 2))).toEqual([1, 2]);
  });

  it('works for a single element', () => {
    expect(topKFrequent([7], 1)).toEqual([7]);
  });

  it('returns exactly k values', () => {
    expect(topKFrequent([4, 4, 4, 5, 5, 6], 1)).toEqual([4]);
  });

  it('returns every distinct value when k equals the number of distinct values', () => {
    expect(sorted(topKFrequent([3, 1, 2, 1, 3, 3], 3))).toEqual([1, 2, 3]);
  });

  it('ranks by frequency, not by value or first appearance', () => {
    expect(sorted(topKFrequent([9, 8, 7, 7, 7, 1, 1, 9, 7, 1, 1, 1], 2))).toEqual([1, 7]);
  });

  it('handles negative numbers and zero', () => {
    expect(sorted(topKFrequent([-1, -1, 0, 0, 0, 5], 2))).toEqual([-1, 0]);
  });

  it('does not mutate the input', () => {
    const nums = [3, 3, 1, 2, 2, 2];
    topKFrequent(nums, 2);
    expect(nums).toEqual([3, 3, 1, 2, 2, 2]);
  });

  it('handles 10,000 values with thousands of distinct ones', () => {
    const nums: number[] = [];
    for (let i = 0; i < 9_000; i++) nums.push(i % 3_000); // 3,000 values seen 3 times
    for (let i = 0; i < 1_000; i++) nums.push(i < 600 ? -1 : -2); // -1: 600 times, -2: 400 times
    expect(sorted(topKFrequent(nums, 2))).toEqual([-2, -1]);
  });
});
