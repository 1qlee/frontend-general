import { describe, it, expect } from 'vitest';
import { computeCLS, type LayoutShiftEntry } from './solution';

const shift = (startTime: number, value: number, hadRecentInput = false): LayoutShiftEntry => ({
  startTime,
  value,
  hadRecentInput,
});

describe('computeCLS (session windows)', () => {
  it('returns 0 when there are no layout shifts', () => {
    expect(computeCLS([])).toBe(0);
  });

  it('sums shifts that happen within 1 s of each other into one window', () => {
    expect(computeCLS([shift(100, 0.05), shift(600, 0.03), shift(1400, 0.02)])).toBeCloseTo(0.1, 10);
  });

  it('a gap of 1 s or more starts a new window, and CLS is the largest window — not the total', () => {
    const entries = [shift(0, 0.05), shift(500, 0.05), shift(3000, 0.04), shift(3999, 0.04)];
    // windows: [0, 500] = 0.10 and [3000, 3999] = 0.08  (total would be 0.18)
    expect(computeCLS(entries)).toBeCloseTo(0.1, 10);
  });

  it('a gap of exactly 1000 ms already starts a new window', () => {
    expect(computeCLS([shift(0, 0.05), shift(1000, 0.04)])).toBeCloseTo(0.05, 10);
  });

  it('caps a window at 5 s even when shifts keep arriving every 900 ms', () => {
    // 0, 900, …, 4500 fit in the first window (6 × 0.01); 5400 starts a new one.
    const entries = Array.from({ length: 10 }, (_, i) => shift(i * 900, 0.01));
    expect(computeCLS(entries)).toBeCloseTo(0.06, 10);
  });

  it('ignores shifts with hadRecentInput — they add nothing and do not bridge a gap', () => {
    const entries = [
      shift(0, 0.05),
      shift(700, 0.5, true), // expected shift right after a click
      shift(1400, 0.05), // 1400 ms after the last *counted* shift → new window
    ];
    expect(computeCLS(entries)).toBeCloseTo(0.05, 10);
  });

  it('returns the largest window even when it is not the last one', () => {
    const entries = [shift(0, 0.2), shift(200, 0.1), shift(10_000, 0.05), shift(20_000, 0.01)];
    expect(computeCLS(entries)).toBeCloseTo(0.3, 10);
  });
});
