import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promiseAny } from './solution';

const delay = <T>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
const failAfter = (ms: number, reason: unknown) => {
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

describe('promiseAny', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fulfils with the first input to fulfil', async () => {
    const outcome = track(promiseAny([delay(30, 'slow mirror'), delay(10, 'fast mirror'), delay(20, 'ok mirror')]));
    await vi.advanceTimersByTimeAsync(10);
    expect(outcome).toEqual({ status: 'fulfilled', value: 'fast mirror' });
  });

  it('ignores rejections while another input can still fulfil', async () => {
    const outcome = track(promiseAny([failAfter(5, new Error('cdn down')), delay(20, 'origin')]));
    await vi.advanceTimersByTimeAsync(5);
    expect(outcome.status).toBe('pending'); // must NOT settle on the early rejection
    await vi.advanceTimersByTimeAsync(15);
    expect(outcome).toEqual({ status: 'fulfilled', value: 'origin' });
  });

  it('treats plain values as already fulfilled', async () => {
    const outcome = track(promiseAny([delay(10, 'later'), 'now']));
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual({ status: 'fulfilled', value: 'now' });
  });

  it('rejects with an AggregateError when every input rejects', async () => {
    const outcome = track(promiseAny([failAfter(10, new Error('a')), failAfter(5, new Error('b'))]));
    await vi.advanceTimersByTimeAsync(5);
    expect(outcome.status).toBe('pending'); // one input is still outstanding
    await vi.advanceTimersByTimeAsync(5);
    expect(outcome.status).toBe('rejected');
    expect(outcome.reason).toBeInstanceOf(AggregateError);
  });

  it('AggregateError.errors lists the reasons in INPUT order (not rejection order)', async () => {
    const outcome = track(promiseAny([failAfter(30, 'first input'), failAfter(10, 'second input'), failAfter(20, 'third input')]));
    await vi.advanceTimersByTimeAsync(30);
    expect(outcome.reason).toBeInstanceOf(AggregateError);
    expect((outcome.reason as AggregateError).errors).toEqual(['first input', 'second input', 'third input']);
  });

  it('rejects with an AggregateError for an empty array', async () => {
    const outcome = track(promiseAny([]));
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome.reason).toBeInstanceOf(AggregateError);
    expect((outcome.reason as AggregateError).errors).toEqual([]);
  });

  it('does not delegate to the built-in Promise.any', async () => {
    const spy = vi.spyOn(Promise, 'any');
    await expect(promiseAny([Promise.resolve(1)])).resolves.toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });
});
