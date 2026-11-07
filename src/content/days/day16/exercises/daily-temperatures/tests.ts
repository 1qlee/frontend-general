import { describe, it, expect } from 'vitest';
import { dailyTemperatures } from './solution';

describe('dailyTemperatures', () => {
  it('handles the classic example', () => {
    expect(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73])).toEqual([1, 1, 4, 2, 1, 1, 0, 0]);
  });

  it('handles strictly increasing temperatures', () => {
    expect(dailyTemperatures([30, 40, 50, 60])).toEqual([1, 1, 1, 0]);
  });

  it('returns all zeros for strictly decreasing temperatures', () => {
    expect(dailyTemperatures([5, 4, 3, 2, 1])).toEqual([0, 0, 0, 0, 0]);
  });

  it('requires a STRICTLY warmer day (equal does not count)', () => {
    expect(dailyTemperatures([70, 70, 70])).toEqual([0, 0, 0]);
    expect(dailyTemperatures([70, 70, 71])).toEqual([2, 1, 0]);
  });

  it('handles empty input and a single day', () => {
    expect(dailyTemperatures([])).toEqual([]);
    expect(dailyTemperatures([50])).toEqual([0]);
  });

  it('handles negative temperatures and a late warm day', () => {
    expect(dailyTemperatures([-5, -10, -7, -20, 3])).toEqual([4, 1, 2, 1, 0]);
  });

  it('runs in linear time on 50,000 strictly decreasing days', () => {
    const temps = Array.from({ length: 50_000 }, (_, i) => 50_000 - i);
    const start = performance.now();
    const result = dailyTemperatures(temps);
    const elapsed = performance.now() - start;
    expect(result.every((d) => d === 0)).toBe(true);
    expect(elapsed).toBeLessThan(300);
  });
});
