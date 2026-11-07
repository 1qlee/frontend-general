import { describe, it, expect } from 'vitest';
import { coinChange } from './solution';

describe('coinChange', () => {
  it('finds the minimum: [1, 2, 5], 11 → 3 (5 + 5 + 1)', () => {
    expect(coinChange([1, 2, 5], 11)).toBe(3);
  });

  it('returns 0 for amount 0', () => {
    expect(coinChange([1], 0)).toBe(0);
    expect(coinChange([7], 0)).toBe(0);
  });

  it('returns -1 when the amount cannot be made', () => {
    expect(coinChange([2], 3)).toBe(-1);
    expect(coinChange([5, 10], 3)).toBe(-1);
  });

  it('beats greedy: [1, 3, 4], 6 → 2 (3 + 3), not 3 (4 + 1 + 1)', () => {
    expect(coinChange([1, 3, 4], 6)).toBe(2);
  });

  it('does not depend on the order of the coins', () => {
    expect(coinChange([5, 2, 1], 11)).toBe(3);
    expect(coinChange([4, 1, 3], 6)).toBe(2);
  });

  it('finds solutions that need the smaller coin several times: [3, 7], 23 → 5', () => {
    expect(coinChange([3, 7], 23)).toBe(5); // 7 + 7 + 3 + 3 + 3
  });

  it('handles coins larger than the amount', () => {
    expect(coinChange([100, 3], 9)).toBe(3);
  });

  it('is fast for [1, 2, 5], 35 — overlapping subproblems must be cached', () => {
    // Plain recursion without memoization makes millions of calls here (~1–3 s).
    const t0 = performance.now();
    expect(coinChange([1, 2, 5], 35)).toBe(7);
    expect(performance.now() - t0).toBeLessThan(300);
  });
});
