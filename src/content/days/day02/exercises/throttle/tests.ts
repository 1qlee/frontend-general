import { describe, it, expect, vi, beforeEach } from 'vitest';
import { throttle } from './solution';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('invokes immediately on the first call (leading edge)', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('collapses calls inside the window into one trailing call with the latest arguments', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled(1);
    throttled(2);
    throttled(3);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
  });

  it('does not make a trailing call if nothing happened during the window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('once');
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('after a quiet window, the next call is a leading call again', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled(1);
    vi.advanceTimersByTime(150);
    throttled(2);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(2);
  });

  it('under a continuous stream of calls, invocations are spaced at least `wait` apart', () => {
    const invokedAt: number[] = [];
    const start = Date.now();
    const throttled = throttle(() => {
      invokedAt.push(Date.now() - start);
    }, 100);
    for (let i = 0; i < 100; i++) {
      throttled(); // a call every 10ms for 1 second (think: scroll events)
      vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(500);
    expect(invokedAt).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
  });

  it('forwards `this` and arguments', () => {
    const tracker = {
      events: [] as number[],
      onScroll: throttle(function (this: { events: number[] }, y: number) {
        this.events.push(y);
      }, 50),
    };
    tracker.onScroll(10);
    tracker.onScroll(20);
    tracker.onScroll(30);
    vi.advanceTimersByTime(50);
    expect(tracker.events).toEqual([10, 30]);
  });

  it('cancel() drops the trailing call and resets the window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled(1);
    throttled(2);
    throttled.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    throttled(3); // window was reset: leading call
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
  });
});
