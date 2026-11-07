import { describe, it, expect, vi } from 'vitest';
import { createCachedFetcher } from './solution';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks run (a real macrotask) without moving the fake clock. */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe('createCachedFetcher', () => {
  it('fetches on the first get() and serves from cache while fresh', async () => {
    vi.useFakeTimers();
    let version = 0;
    const fetcher = vi.fn(async (key: string) => `${key}-v${++version}`);
    const cached = createCachedFetcher(fetcher, { ttl: 1000 });

    await expect(cached.get('a')).resolves.toBe('a-v1');
    vi.advanceTimersByTime(999);
    await expect(cached.get('a')).resolves.toBe('a-v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent requests for the same key, but not across keys', async () => {
    vi.useFakeTimers();
    const slowA = deferred<string>();
    const fetcher = vi.fn((key: string) => (key === 'a' ? slowA.promise : Promise.resolve(`${key}!`)));
    const cached = createCachedFetcher(fetcher, { ttl: 1000 });

    const p1 = cached.get('a');
    const p2 = cached.get('a');
    const p3 = cached.get('b');
    slowA.resolve('A');
    await expect(Promise.all([p1, p2, p3])).resolves.toEqual(['A', 'A', 'b!']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('fetches again once ttl has passed (no stale window) and resolves with the NEW value', async () => {
    vi.useFakeTimers();
    let version = 0;
    const fetcher = vi.fn(async (key: string) => `${key}-v${++version}`);
    const cached = createCachedFetcher(fetcher, { ttl: 1000 });

    await cached.get('a');
    vi.advanceTimersByTime(1000);
    await expect(cached.get('a')).resolves.toBe('a-v2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('inside the stale window: resolves immediately with stale data and revalidates in the background', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const revalidation = deferred<string>();
    const fetcher = vi.fn((_key: string) => (++calls === 1 ? Promise.resolve('v1') : revalidation.promise));
    const cached = createCachedFetcher(fetcher, { ttl: 1000, staleWhileRevalidate: 5000 });

    await cached.get('a');
    vi.advanceTimersByTime(1500);

    // Must not wait for the (still pending) revalidation.
    const first = await Promise.race([cached.get('a'), settle().then(() => 'still waiting')]);
    expect(first).toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(2);

    revalidation.resolve('v2');
    await settle();
    await expect(cached.get('a')).resolves.toBe('v2'); // fresh again, no new fetch
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('starts at most one background revalidation per key', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const revalidation = deferred<string>();
    const fetcher = vi.fn((_key: string) => (++calls === 1 ? Promise.resolve('v1') : revalidation.promise));
    const cached = createCachedFetcher(fetcher, { ttl: 1000, staleWhileRevalidate: 5000 });

    await cached.get('a');
    vi.advanceTimersByTime(2000);
    await Promise.all([cached.get('a'), cached.get('a'), cached.get('a')]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    revalidation.resolve('v2');
    await settle();
  });

  it('waits for fresh data once the stale window has also passed', async () => {
    vi.useFakeTimers();
    let version = 0;
    const fetcher = vi.fn(async (key: string) => `${key}-v${++version}`);
    const cached = createCachedFetcher(fetcher, { ttl: 1000, staleWhileRevalidate: 1000 });

    await cached.get('a');
    vi.advanceTimersByTime(2000);
    await expect(cached.get('a')).resolves.toBe('a-v2');
  });

  it('does not cache errors: every waiting caller gets the rejection and the next get() retries', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetcher = vi.fn(async (_key: string) => {
      if (++calls === 1) throw new Error('network down');
      return 'ok';
    });
    const cached = createCachedFetcher(fetcher, { ttl: 1000 });

    const a = expect(cached.get('a')).rejects.toThrow('network down');
    const b = expect(cached.get('a')).rejects.toThrow('network down');
    await Promise.all([a, b]);
    await expect(cached.get('a')).resolves.toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('a failed background revalidation evicts the stale entry', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetcher = vi.fn(async (_key: string) => {
      calls++;
      if (calls === 2) throw new Error('revalidation failed');
      return `v${calls}`;
    });
    const cached = createCachedFetcher(fetcher, { ttl: 1000, staleWhileRevalidate: 5000 });

    await cached.get('a');
    vi.advanceTimersByTime(1500);
    await expect(cached.get('a')).resolves.toBe('v1'); // stale; revalidation fails in the background
    await settle();
    await expect(cached.get('a')).resolves.toBe('v3'); // nothing cached any more → blocking fetch
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('invalidate(key) forces a refetch; invalidate() clears every key', async () => {
    vi.useFakeTimers();
    let version = 0;
    const fetcher = vi.fn(async (key: string) => `${key}-v${++version}`);
    const cached = createCachedFetcher(fetcher, { ttl: 60_000 });

    await cached.get('a');
    await cached.get('b');
    cached.invalidate('a');
    await expect(cached.get('a')).resolves.toBe('a-v3');
    await expect(cached.get('b')).resolves.toBe('b-v2');
    cached.invalidate();
    await cached.get('a');
    await cached.get('b');
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
});
