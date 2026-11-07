import { describe, it, expect } from 'vitest';
import { subsets } from './solution';

/** Order-insensitive normal form: sort inside each subset, then sort the subsets. */
function normalize(sets: number[][]): string[] {
  return sets.map((s) => JSON.stringify([...s].sort((a, b) => a - b))).sort();
}

describe('subsets', () => {
  it('returns [[]] for an empty input (the empty set has one subset)', () => {
    expect(subsets([])).toEqual([[]]);
  });

  it('returns [] and [x] for a single element', () => {
    expect(normalize(subsets([5]))).toEqual(normalize([[], [5]]));
  });

  it('returns all 8 subsets of [1, 2, 3]', () => {
    const expected = [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]];
    expect(normalize(subsets([1, 2, 3]))).toEqual(normalize(expected));
  });

  it('accepts any order of subsets and of values inside a subset', () => {
    const result = normalize(subsets([3, 1, 2]));
    expect(result).toContain('[1,2,3]');
    expect(result).toContain('[]');
    expect(result).toHaveLength(8);
  });

  it('never returns the same subset twice', () => {
    const result = normalize(subsets([4, 5, 6, 7]));
    expect(new Set(result).size).toBe(result.length);
    expect(result).toHaveLength(16);
  });

  it('returns independent arrays (no shared, mutated path)', () => {
    const result = subsets([1, 2]);
    expect(result.every((s) => Array.isArray(s))).toBe(true);
    expect(normalize(result)).toEqual(normalize([[], [1], [2], [1, 2]]));
  });

  it('handles negative values and zero', () => {
    expect(normalize(subsets([-1, 0]))).toEqual(normalize([[], [-1], [0], [-1, 0]]));
  });

  it('produces 2^n subsets for n = 12', () => {
    const result = subsets(Array.from({ length: 12 }, (_, i) => i));
    expect(result).toHaveLength(4096);
    expect(new Set(normalize(result)).size).toBe(4096);
  });

  it('does not mutate the input', () => {
    const nums = [3, 1, 2];
    subsets(nums);
    expect(nums).toEqual([3, 1, 2]);
  });
});
