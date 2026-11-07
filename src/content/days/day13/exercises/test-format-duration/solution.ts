import { describe, it, expect } from 'vitest';
import { formatDuration } from './subject';

describe('formatDuration', () => {
  it('formats zero and anything under one second as "0 seconds"', () => {
    expect(formatDuration(0)).toBe('0 seconds');
    expect(formatDuration(999)).toBe('0 seconds');
  });

  it('truncates sub-second remainders instead of rounding', () => {
    expect(formatDuration(1_999)).toBe('1 second');
  });

  // Boundaries are where off-by-one bugs live: test the exact value, not one near it.
  it.each([
    [1_000, '1 second'],
    [60_000, '1 minute'],
    [3_600_000, '1 hour'],
    [86_400_000, '1 day'],
  ])('handles the exact unit boundary %i ms -> %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('pluralises each unit by its own count', () => {
    expect(formatDuration(62_000)).toBe('1 minute and 2 seconds');
    expect(formatDuration(7_201_000)).toBe('2 hours and 1 second');
  });

  it('leaves out zero-valued units', () => {
    expect(formatDuration(86_405_000)).toBe('1 day and 5 seconds');
  });

  it('joins with commas and a final "and"', () => {
    expect(formatDuration(3_723_000)).toBe('1 hour, 2 minutes and 3 seconds');
    expect(formatDuration(90_061_000)).toBe('1 day, 1 hour, 1 minute and 1 second');
  });

  it('throws a RangeError for negative, NaN or infinite input', () => {
    expect(() => formatDuration(-1)).toThrow(RangeError);
    expect(() => formatDuration(Number.NaN)).toThrow(RangeError);
    expect(() => formatDuration(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
