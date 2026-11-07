import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryCache } from './solution';

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createQueryCache', () => {
  beforeEach(() => {
    vi.useFakeTimers(); // Date.now() only moves when we advance the clock
  });

  it('calls the fetcher, resolves its data and caches it', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn(() => Promise.resolve({ id: 1 }));
    expect(cache.getData('user:1')).toBeUndefined();
    await expect(cache.fetch('user:1', fetcher)).resolves.toEqual({ id: 1 });
    expect(cache.getData('user:1')).toEqual({ id: 1 });
  });

  it('dedupes concurrent requests for the same key', async () => {
    const cache = createQueryCache();
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    const p1 = cache.fetch('todos', fetcher);
    const p2 = cache.fetch('todos', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    d.resolve('ok');
    await expect(Promise.all([p1, p2])).resolves.toEqual(['ok', 'ok']);
  });

  it('keeps different keys independent', async () => {
    const cache = createQueryCache({ staleTime: 1000 });
    const a = vi.fn(() => Promise.resolve('A'));
    const b = vi.fn(() => Promise.resolve('B'));
    await expect(Promise.all([cache.fetch('a', a), cache.fetch('b', b)])).resolves.toEqual(['A', 'B']);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('serves cached data without calling the fetcher while it is fresh', async () => {
    const cache = createQueryCache({ staleTime: 1000 });
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    await cache.fetch('k', fetcher);
    vi.advanceTimersByTime(999);
    await expect(cache.fetch('k', fetcher)).resolves.toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the data is staleTime old', async () => {
    const cache = createQueryCache({ staleTime: 1000 });
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    await cache.fetch('k', fetcher);
    vi.advanceTimersByTime(1000);
    await expect(cache.fetch('k', fetcher)).resolves.toBe('v2');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(cache.getData('k')).toBe('v2');
  });

  it('treats data as stale immediately by default (staleTime 0, like TanStack Query)', async () => {
    const cache = createQueryCache();
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    await cache.fetch('k', fetcher);
    await expect(cache.fetch('k', fetcher)).resolves.toBe('v2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('lets a per-call staleTime override the default', async () => {
    const cache = createQueryCache({ staleTime: 0 });
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    await cache.fetch('k', fetcher);
    vi.advanceTimersByTime(60_000);
    await expect(cache.fetch('k', fetcher, { staleTime: Infinity })).resolves.toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache errors, and a failed key can be fetched again', async () => {
    const cache = createQueryCache({ staleTime: Infinity });
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
    await expect(cache.fetch('k', fetcher)).rejects.toThrow('boom');
    expect(cache.getData('k')).toBeUndefined();
    await expect(cache.fetch('k', fetcher)).resolves.toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidate() forces a refetch but keeps the old data readable meanwhile', async () => {
    const cache = createQueryCache({ staleTime: Infinity });
    const second = deferred<string>();
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockReturnValueOnce(second.promise);
    await cache.fetch('k', fetcher);
    cache.invalidate('k');
    expect(cache.getData('k')).toBe('v1'); // stale-while-revalidate
    const p = cache.fetch('k', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(cache.getData('k')).toBe('v1');
    second.resolve('v2');
    await expect(p).resolves.toBe('v2');
    expect(cache.getData('k')).toBe('v2');
  });

  it('after invalidate(), an older in-flight request is not reused and cannot overwrite newer data', async () => {
    const cache = createQueryCache({ staleTime: Infinity });
    const first = deferred<string>();
    const second = deferred<string>();
    const fetcher = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const p1 = cache.fetch('k', fetcher);
    cache.invalidate('k'); // e.g. a mutation succeeded while the first request was in flight
    const p2 = cache.fetch('k', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);

    second.resolve('new');
    await expect(p2).resolves.toBe('new');
    first.resolve('old'); // the slow, outdated response arrives last
    await expect(p1).resolves.toBe('old'); // its own caller still gets it…
    expect(cache.getData('k')).toBe('new'); // …but it must not overwrite the cache
  });
});
