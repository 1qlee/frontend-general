import { describe, it, expect, vi } from 'vitest';
import { processInChunks } from './solution';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
/** A real macrotask: lets every pending microtask run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('processInChunks', () => {
  it('processes every item in order and resolves with the results', async () => {
    vi.useFakeTimers();
    const p = processInChunks([1, 2, 3, 4, 5], (n, i) => `${i}:${n * 2}`, { chunkSize: 2 });
    await vi.runAllTimersAsync();
    await expect(p).resolves.toEqual(['0:2', '1:4', '2:6', '3:8', '4:10']);
  });

  it('does not run everything synchronously: only the first chunk runs before yielding', async () => {
    vi.useFakeTimers();
    const fn = vi.fn((n: number) => n);
    const p = processInChunks(range(10), fn, { chunkSize: 3 });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(1); // one setTimeout is waiting to resume the work
    await vi.runAllTimersAsync();
    expect(fn).toHaveBeenCalledTimes(10);
    await expect(p).resolves.toHaveLength(10);
  });

  it('yields with a macrotask by default — awaiting a microtask is NOT a yield', async () => {
    vi.useFakeTimers();
    const fn = vi.fn((n: number) => n);
    const p = processInChunks(range(6), fn, { chunkSize: 2 });
    // Drain the microtask queue: a Promise.resolve()-based "yield" would finish everything here.
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.runAllTimersAsync();
    await expect(p).resolves.toEqual(range(6));
  });

  it('yields between chunks (never after the last one) using yieldToMain', async () => {
    const gates: Array<() => void> = [];
    const yieldToMain = vi.fn(() => new Promise<void>((resolve) => gates.push(resolve)));
    const fn = vi.fn((n: number) => n);
    const p = processInChunks([1, 2, 3, 4, 5], fn, { chunkSize: 2, yieldToMain });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(yieldToMain).toHaveBeenCalledTimes(1);

    gates[0]();
    await flush();
    expect(fn).toHaveBeenCalledTimes(4);
    expect(yieldToMain).toHaveBeenCalledTimes(2);

    gates[1]();
    await expect(p).resolves.toEqual([1, 2, 3, 4, 5]);
    expect(yieldToMain).toHaveBeenCalledTimes(2); // no yield after the final chunk
  });

  it('resolves [] for empty input without calling fn or yielding', async () => {
    const fn = vi.fn((n: number) => n);
    const yieldToMain = vi.fn(() => Promise.resolve());
    await expect(processInChunks([], fn, { yieldToMain })).resolves.toEqual([]);
    expect(fn).not.toHaveBeenCalled();
    expect(yieldToMain).not.toHaveBeenCalled();
  });

  it('rejects when fn throws and stops processing later chunks', async () => {
    vi.useFakeTimers();
    const fn = vi.fn((n: number) => {
      if (n === 2) throw new Error('bad item');
      return n;
    });
    const p = processInChunks(range(8), fn, { chunkSize: 2 });
    const assertion = expect(p).rejects.toThrow('bad item');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3); // 0, 1, then 2 throws — chunks after it never run
  });

  it('stops before the next chunk when the signal is aborted, rejecting with signal.reason', async () => {
    const gates: Array<() => void> = [];
    const yieldToMain = () => new Promise<void>((resolve) => gates.push(resolve));
    const controller = new AbortController();
    const fn = vi.fn((n: number) => n);
    const p = processInChunks(range(6), fn, { chunkSize: 2, yieldToMain, signal: controller.signal });
    const reason = new Error('stale search query');
    const assertion = expect(p).rejects.toBe(reason);

    controller.abort(reason);
    gates[0]();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects with a RangeError for a chunkSize that is not a positive integer', async () => {
    await expect(processInChunks([1], (n) => n, { chunkSize: 0 })).rejects.toThrow(RangeError);
    await expect(processInChunks([1], (n) => n, { chunkSize: 1.5 })).rejects.toThrow(RangeError);
  });
});
