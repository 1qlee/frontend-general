import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retry } from './solution';

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

describe('retry with exponential backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('resolves straight away when the first attempt succeeds', async () => {
    const fn = vi.fn(async () => 'ok');
    await expect(retry(fn, { retries: 3, baseDelay: 100 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('retries after failures and resolves with the eventual success', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue('data');
    const outcome = track(retry(fn, { retries: 3, baseDelay: 100 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1); // the first retry waits the full baseDelay
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(fn).toHaveBeenCalledTimes(2); // the second retry waits 2 * baseDelay
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(outcome).toEqual({ status: 'fulfilled', value: 'data' });
  });

  it('doubles the delay each time and passes the attempt number', async () => {
    const calledAt: number[] = [];
    const start = Date.now();
    const fn = vi.fn(async (attempt: number) => {
      calledAt.push(Date.now() - start);
      throw new Error(`attempt ${attempt} failed`);
    });
    const outcome = track(retry(fn, { retries: 3, baseDelay: 100 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(calledAt).toEqual([0, 100, 300, 700]); // waits of 100, 200, 400
    expect(fn.mock.calls.map((args) => args[0])).toEqual([1, 2, 3, 4]);
    expect(outcome.status).toBe('rejected');
  });

  it('rejects with the LAST error once retries are exhausted', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('last'));
    const outcome = track(retry(fn, { retries: 1, baseDelay: 10 }));
    await vi.advanceTimersByTimeAsync(100);
    expect(outcome.status).toBe('rejected');
    expect((outcome.reason as Error).message).toBe('last');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('caps each delay at maxDelay', async () => {
    const calledAt: number[] = [];
    const start = Date.now();
    const fn = vi.fn(async () => {
      calledAt.push(Date.now() - start);
      throw new Error('down');
    });
    const outcome = track(retry(fn, { retries: 4, baseDelay: 100, maxDelay: 250 }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(calledAt).toEqual([0, 100, 300, 550, 800]); // waits of 100, 200, 250, 250
    expect(outcome.status).toBe('rejected');
  });

  it('does not retry when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error('Bad Request'), { status: 400 }));
    const shouldRetry = vi.fn((error: unknown) => (error as { status: number }).status >= 500);
    const outcome = track(retry(fn, { retries: 5, baseDelay: 100, shouldRetry }));
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome.status).toBe('rejected'); // immediately, without waiting
    expect((outcome.reason as Error).message).toBe('Bad Request');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('aborting during a backoff wait rejects with signal.reason and stops retrying', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error('flaky'));
    const reason = new Error('user navigated away');
    const outcome = track(retry(fn, { retries: 5, baseDelay: 1000, signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(10); // attempt 1 failed, now waiting 1000ms
    controller.abort(reason);
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual({ status: 'rejected', reason }); // right away, not after the wait
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not call fn at all if the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('already cancelled'));
    const fn = vi.fn(async () => 'never');
    await expect(retry(fn, { retries: 2, baseDelay: 10, signal: controller.signal })).rejects.toThrow('already cancelled');
    expect(fn).not.toHaveBeenCalled();
  });
});
