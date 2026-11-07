import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debounce } from './subject';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('does not call fn until `wait` ms after the call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls fn once for a burst, with the arguments of the last call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('restarts the timer on every call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    vi.advanceTimersByTime(80);
    debounced('b');
    vi.advanceTimersByTime(80); // t=160: 160 ms after the first call, but only 80 after the last
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20); // t=180: 100 ms after the last call
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  it('treats calls separated by a quiet period as separate bursts', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    vi.advanceTimersByTime(100);
    debounced('second');
    vi.advanceTimersByTime(100);

    expect(fn.mock.calls).toEqual([['first'], ['second']]);
  });

  it('forwards `this` from the call site', () => {
    const seen: unknown[] = [];
    const searchBox = {
      name: 'search',
      onInput: debounce(function (this: { name: string } | undefined, value: string) {
        seen.push([this?.name, value]);
      }, 50),
    };

    searchBox.onInput('re');
    searchBox.onInput('react');
    vi.advanceTimersByTime(50);

    expect(seen).toEqual([['search', 'react']]);
  });

  it('cancel() drops the pending call, and the function still works afterwards', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('dropped');
    debounced.cancel();
    vi.advanceTimersByTime(1_000);
    expect(fn).not.toHaveBeenCalled();

    debounced('kept');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('kept');
  });
});
