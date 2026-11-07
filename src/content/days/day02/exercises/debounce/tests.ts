import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debounce } from './solution';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('invokes once, on the trailing edge, with the latest arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    debounced('ab');
    debounced('abc');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('abc');
  });

  it('restarts the wait on every call (measured from the LAST call)', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(80);
    debounced();
    vi.advanceTimersByTime(80); // 160ms since the first call, but only 80ms since the last
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('invokes again for a separate burst', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced(1);
    vi.advanceTimersByTime(50);
    debounced(2);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(2);
  });

  it('forwards `this` from the latest call', () => {
    const seen: string[] = [];
    const field = {
      name: 'search',
      onInput: debounce(function (this: { name: string }, value: string) {
        seen.push(`${this.name}=${value}`);
      }, 100),
    };
    field.onInput('re');
    field.onInput('react');
    vi.advanceTimersByTime(100);
    expect(seen).toEqual(['search=react']);
  });

  it('leading: invokes immediately, then once more on the trailing edge only if called again', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true });
    debounced('first');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('first');
    debounced('second');
    debounced('third');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('third');
  });

  it('leading: a single call is not invoked twice', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true });
    debounced('only');
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('leading without trailing: once per burst, and a new burst fires immediately again', () => {
    const fn = vi.fn();
    const submit = debounce(fn, 100, { leading: true, trailing: false });
    submit(1);
    submit(2);
    vi.advanceTimersByTime(60);
    submit(3); // still the same burst — extends it
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
    submit(4);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(4);
  });

  it('cancel() drops the pending invocation', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('x');
    debounced.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
    debounced('y');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('y');
  });

  it('flush() runs the pending invocation now — and not again later', () => {
    const fn = vi.fn();
    const save = debounce(fn, 1000);
    save('draft');
    save.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('draft');
    vi.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);
    save.flush(); // nothing pending: no-op
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
