import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promiseAll } from './solution';

const delay = <T>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
const failAfter = (ms: number, reason: Error) => {
  const p = new Promise<never>((_, reject) => setTimeout(() => reject(reason), ms));
  p.catch(() => {}); // mark as handled up front; your implementation still sees the rejection
  return p;
};

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

describe('promiseAll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fulfils with results in input order, not settle order', async () => {
    const outcome = track(promiseAll([delay(30, 'slow'), delay(10, 'fast'), delay(20, 'medium')]));
    await vi.advanceTimersByTimeAsync(30);
    expect(outcome).toEqual({ status: 'fulfilled', value: ['slow', 'fast', 'medium'] });
  });

  it('waits for every input (does not resolve early when the LAST index settles first)', async () => {
    const outcome = track(promiseAll([delay(50, 'a'), delay(10, 'b')]));
    await vi.advanceTimersByTimeAsync(10);
    expect(outcome.status).toBe('pending');
    await vi.advanceTimersByTimeAsync(40);
    expect(outcome).toEqual({ status: 'fulfilled', value: ['a', 'b'] });
  });

  it('accepts plain values and thenables', async () => {
    const thenable = {
      then(onFulfilled: (value: number) => void) {
        onFulfilled(42);
      },
    };
    await expect(promiseAll([1, Promise.resolve('two'), thenable, undefined])).resolves.toEqual([1, 'two', 42, undefined]);
  });

  it('fulfils with [] for an empty array', async () => {
    await expect(promiseAll([])).resolves.toEqual([]);
  });

  it('rejects as soon as one input rejects (fail fast)', async () => {
    const outcome = track(promiseAll([delay(100, 'slow'), failAfter(10, new Error('boom'))]));
    await vi.advanceTimersByTimeAsync(10);
    expect(outcome.status).toBe('rejected'); // did not wait for the 100ms input
    expect((outcome.reason as Error).message).toBe('boom');
  });

  it('rejects with the FIRST rejection reason', async () => {
    const outcome = track(promiseAll([failAfter(30, new Error('second')), failAfter(10, new Error('first')), delay(5, 'ok')]));
    await vi.advanceTimersByTimeAsync(30);
    expect(outcome.status).toBe('rejected');
    expect((outcome.reason as Error).message).toBe('first');
  });

  it('does not delegate to the built-in Promise.all', async () => {
    const spy = vi.spyOn(Promise, 'all');
    await expect(promiseAll([Promise.resolve(1), 2])).resolves.toEqual([1, 2]);
    expect(spy).not.toHaveBeenCalled();
  });
});
