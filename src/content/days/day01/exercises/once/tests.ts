import { describe, it, expect, vi } from 'vitest';
import { once } from './solution';

describe('once', () => {
  it('calls the wrapped function only once', () => {
    const spy = vi.fn(() => 42);
    const init = once(spy);
    init();
    init();
    init();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns the first result on every call', () => {
    let n = 0;
    const next = once(() => ++n);
    expect(next()).toBe(1);
    expect(next()).toBe(1);
  });

  it('forwards arguments from the first call', () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const add = once(spy);
    expect(add(2, 3)).toBe(5);
    expect(add(10, 10)).toBe(5);
    expect(spy).toHaveBeenCalledWith(2, 3);
  });

  it('preserves `this` when used as a method', () => {
    const counter = {
      value: 7,
      read: once(function (this: { value: number }) {
        return this.value;
      }),
    };
    expect(counter.read()).toBe(7);
  });

  it('does not call fn again if the first call is still running (re-entrancy)', () => {
    let calls = 0;
    const init: () => void = once(() => {
      calls++;
      init(); // re-entrant call
    });
    init();
    expect(calls).toBe(1);
  });
});
