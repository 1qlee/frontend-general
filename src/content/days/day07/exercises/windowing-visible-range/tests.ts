import { describe, it, expect } from 'vitest';
import { getVisibleRange } from './solution';

// 100px viewport, 20px rows → 5 rows fit exactly.
const base = { viewportHeight: 100, itemHeight: 20, itemCount: 1000 };

describe('getVisibleRange', () => {
  it('returns the rows that fill the viewport at the top (end is exclusive)', () => {
    // Row 5 starts at exactly 100px — the bottom edge — so it is NOT visible.
    expect(getVisibleRange({ ...base, scrollTop: 0 })).toEqual({ start: 0, end: 5 });
  });

  it('counts partially visible rows at both edges', () => {
    // Viewport covers 25px..125px → row 1 (20–40) through row 6 (120–140).
    expect(getVisibleRange({ ...base, scrollTop: 25 })).toEqual({ start: 1, end: 7 });
  });

  it('adds overscan rows above and below', () => {
    // Visible rows are 10..14; overscan 2 → 8..16.
    expect(getVisibleRange({ ...base, scrollTop: 200, overscan: 2 })).toEqual({ start: 8, end: 17 });
  });

  it('clamps overscan at the top of the list', () => {
    expect(getVisibleRange({ ...base, scrollTop: 0, overscan: 3 })).toEqual({ start: 0, end: 8 });
  });

  it('clamps overscan at the bottom of the list', () => {
    // 20 rows = 400px; scrolled to the very bottom (400 - 100 = 300).
    expect(getVisibleRange({ ...base, itemCount: 20, scrollTop: 300, overscan: 3 })).toEqual({ start: 12, end: 20 });
  });

  it('renders every row when the list is shorter than the viewport', () => {
    expect(getVisibleRange({ ...base, itemCount: 3, scrollTop: 0, overscan: 2 })).toEqual({ start: 0, end: 3 });
  });

  it('treats a negative scrollTop (elastic overscroll) as 0', () => {
    expect(getVisibleRange({ ...base, scrollTop: -40 })).toEqual({ start: 0, end: 5 });
  });

  it('clamps a scrollTop that is past the end (e.g. after rows were removed)', () => {
    // 10 rows = 200px, so the max scrollTop is 100 → rows 5..9 are visible.
    expect(getVisibleRange({ ...base, itemCount: 10, scrollTop: 500 })).toEqual({ start: 5, end: 10 });
  });

  it('returns an empty range for an empty list', () => {
    expect(getVisibleRange({ ...base, itemCount: 0, scrollTop: 0, overscan: 2 })).toEqual({ start: 0, end: 0 });
  });
});
