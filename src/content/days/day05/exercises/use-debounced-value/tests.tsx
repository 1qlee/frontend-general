import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDebouncedValue } from './solution';

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function setup<T>(value: T, delay = 300) {
  return renderHook(({ value, delay }: { value: T; delay: number }) => useDebouncedValue(value, delay), {
    initialProps: { value, delay },
  });
}

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = setup('a');
    expect(result.current).toBe('a');
  });

  it('updates only after `delay` ms without further changes', () => {
    const { result, rerender } = setup('a');
    rerender({ value: 'ab', delay: 300 });
    expect(result.current).toBe('a');
    advance(299);
    expect(result.current).toBe('a');
    advance(1);
    expect(result.current).toBe('ab');
  });

  it('restarts the timer on every change, so intermediate values are never emitted', () => {
    const { result, rerender } = setup('a');
    rerender({ value: 'ab', delay: 300 });
    advance(200);
    rerender({ value: 'abc', delay: 300 });
    advance(200); // 400ms since 'ab' — but only 200ms since 'abc'
    expect(result.current).toBe('a');
    advance(100);
    expect(result.current).toBe('abc');
  });

  it('keeps object identity (returns the exact value it was given)', () => {
    const first = { page: 1 };
    const second = { page: 2 };
    const { result, rerender } = setup(first, 100);
    expect(result.current).toBe(first);
    rerender({ value: second, delay: 100 });
    advance(100);
    expect(result.current).toBe(second);
  });

  it('changing the delay restarts the pending timer with the new delay', () => {
    const { result, rerender } = setup('a', 300);
    rerender({ value: 'b', delay: 300 });
    advance(100);
    rerender({ value: 'b', delay: 1000 }); // same value, new delay
    advance(250); // 350ms since 'b' — the old 300ms timer must not fire
    expect(result.current).toBe('a');
    advance(750); // 1000ms since the delay changed
    expect(result.current).toBe('b');
  });

  it('cancels the pending update on unmount (no leaked timers)', () => {
    const { rerender, unmount } = setup('a');
    rerender({ value: 'ab', delay: 300 });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
