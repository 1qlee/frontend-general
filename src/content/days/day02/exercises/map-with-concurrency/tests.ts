import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapWithConcurrency } from './solution';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Subscribes to a promise immediately — so a rejection is never left unhandled while fake
 * time advances — and records its outcome for later assertions.
 */
function track<T>(promise: Promise<T>) {
  const outcome: { status: 'pending' | 'fulfilled' | 'rejected'; value?: T; reason?: unknown } = { status: 'pending' };
  promise.then(
    (value) => {
      outcome.status = 'fulfilled';
      outcome.value = value;
    },
    (reason: unknown) => {
      outcome.status = 'rejected';
      outcome.reason = reason;
    },
  );
  return outcome;
}

describe('mapWithConcurrency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fulfils with results in input order', async () => {
    const durations = [40, 10, 30, 20];
    const outcome = track(
      mapWithConcurrency(durations, 2, async (ms) => {
        await sleep(ms);
        return `done in ${ms}`;
      }),
    );
    await vi.advanceTimersByTimeAsync(100);
    expect(outcome).toEqual({ status: 'fulfilled', value: ['done in 40', 'done in 10', 'done in 30', 'done in 20'] });
  });

  it('never has more than `limit` calls in flight — and does use all the slots', async () => {
    let active = 0;
    let maxActive = 0;
    const durations = [30, 10, 50, 20, 20, 40, 10, 30, 10, 20];
    const outcome = track(
      mapWithConcurrency(durations, 3, async (ms) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await sleep(ms);
        active--;
        return ms;
      }),
    );
    await vi.advanceTimersByTimeAsync(500);
    expect(outcome).toEqual({ status: 'fulfilled', value: durations });
    expect(maxActive).toBe(3);
  });

  it('starts the next item as soon as any slot frees up (a pool, not batches)', async () => {
    const fn = vi.fn((ms: number) => sleep(ms).then(() => ms));
    const outcome = track(mapWithConcurrency([50, 10, 10, 10], 2, fn));
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(25);
    // t=10: item 1 done -> item 2 starts; t=20: item 2 done -> item 3 starts.
    // Fixed batches of 2 would still be waiting for item 0 (50ms) here.
    expect(fn).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(25);
    expect(outcome).toEqual({ status: 'fulfilled', value: [50, 10, 10, 10] });
  });

  it('passes the index as the second argument', async () => {
    const fn = vi.fn(async (item: string, index: number) => `${index}:${item}`);
    const outcome = track(mapWithConcurrency(['a', 'b', 'c'], 2, fn));
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual({ status: 'fulfilled', value: ['0:a', '1:b', '2:c'] });
    expect(fn).toHaveBeenCalledWith('c', 2);
  });

  it('fulfils with [] for empty input without calling fn', async () => {
    const fn = vi.fn(async (n: number) => n);
    const outcome = track(mapWithConcurrency([], 3, fn));
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual({ status: 'fulfilled', value: [] });
    expect(fn).not.toHaveBeenCalled();
  });

  it('works when limit is larger than the number of items', async () => {
    const fn = vi.fn((n: number) => sleep(10).then(() => n * 2));
    const outcome = track(mapWithConcurrency([1, 2], 10, fn));
    await vi.advanceTimersByTimeAsync(10);
    expect(outcome).toEqual({ status: 'fulfilled', value: [2, 4] });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects with the first error and starts no new items after it', async () => {
    const fn = vi.fn(async (n: number) => {
      await sleep(n === 1 ? 10 : 30);
      if (n === 1) throw new Error('item 1 failed');
      return n;
    });
    const outcome = track(mapWithConcurrency([0, 1, 2, 3, 4, 5], 2, fn));
    await vi.advanceTimersByTimeAsync(10);
    expect(outcome.status).toBe('rejected');
    expect((outcome.reason as Error).message).toBe('item 1 failed');
    await vi.advanceTimersByTimeAsync(200); // item 0 finishes at 30ms: no new item may start
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects with a RangeError for a limit below 1', async () => {
    const fn = vi.fn(async (n: number) => n);
    let caught: unknown;
    try {
      await mapWithConcurrency([1, 2, 3], 0, fn);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(RangeError);
    expect(fn).not.toHaveBeenCalled();
  });
});
