import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAutocompleteClient } from './solution';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface Call {
  query: string;
  signal: AbortSignal;
  d: ReturnType<typeof deferred<string[]>>;
}

let calls: Call[];
// A fetcher you control: every call returns a promise the test resolves/rejects explicitly.
// It deliberately IGNORES the abort signal, like many real APIs/SDKs do.
const makeFetcher = () =>
  vi.fn((query: string, signal: AbortSignal) => {
    const d = deferred<string[]>();
    calls.push({ query, signal, d });
    return d.promise;
  });

const tick = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
  calls = [];
});

describe('createAutocompleteClient', () => {
  it('debounces: fetches once, debounceMs after the LAST keystroke, with the trimmed query', async () => {
    const fetcher = makeFetcher();
    const client = createAutocompleteClient({ fetcher, debounceMs: 300 });
    client.setQuery('r');
    await tick(100);
    client.setQuery('re');
    await tick(100);
    client.setQuery(' Rea ');
    await tick(299);
    expect(fetcher).not.toHaveBeenCalled();
    await tick(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('Rea');
  });

  it('goes loading → success and notifies subscribers until they unsubscribe', async () => {
    const client = createAutocompleteClient({ fetcher: makeFetcher() });
    const statuses: string[] = [];
    const unsubscribe = client.subscribe((s) => statuses.push(s.status));
    client.setQuery('react');
    expect(client.getState()).toMatchObject({ query: 'react', status: 'loading' });
    await tick(300);
    calls[0].d.resolve(['React', 'React Native']);
    await tick();
    expect(client.getState()).toEqual({ query: 'react', status: 'success', results: ['React', 'React Native'], error: null });
    expect(statuses).toEqual(['loading', 'success']);
    unsubscribe();
    client.setQuery('');
    expect(statuses).toHaveLength(2);
  });

  it('keeps the previous results visible while the next query is loading', async () => {
    const client = createAutocompleteClient({ fetcher: makeFetcher() });
    client.setQuery('rea');
    await tick(300);
    calls[0].d.resolve(['React']);
    await tick();
    client.setQuery('reac');
    expect(client.getState()).toMatchObject({ query: 'reac', status: 'loading', results: ['React'] });
  });

  it('latest wins: aborts the previous request and ignores its late response', async () => {
    const client = createAutocompleteClient({ fetcher: makeFetcher() });
    client.setQuery('ab');
    await tick(300);
    client.setQuery('abc');
    await tick(300);
    expect(calls).toHaveLength(2);
    expect(calls[0].signal.aborted).toBe(true);
    calls[1].d.resolve(['abc result']);
    await tick();
    calls[0].d.resolve(['ab result']); // the slow, stale response lands last
    await tick();
    expect(client.getState()).toMatchObject({ query: 'abc', status: 'success', results: ['abc result'] });
  });

  it('caches by normalized query: a repeat (any case/whitespace) is instant and never refetches', async () => {
    const fetcher = makeFetcher();
    const client = createAutocompleteClient({ fetcher });
    client.setQuery('React');
    await tick(300);
    calls[0].d.resolve(['React']);
    await tick();
    client.setQuery('vue'); // miss → debounce timer scheduled…
    client.setQuery(' react '); // …hit → served from cache, and the 'vue' timer is cancelled
    expect(client.getState()).toEqual({ query: ' react ', status: 'success', results: ['React'], error: null });
    await tick(1000);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('caches a response that arrives after the user typed on, without showing it', async () => {
    const fetcher = makeFetcher();
    const client = createAutocompleteClient({ fetcher });
    client.setQuery('ab');
    await tick(300); // 'ab' is in flight
    client.setQuery('abc'); // debounce pending for 'abc'
    calls[0].d.resolve(['ab!']);
    await tick();
    expect(client.getState()).toMatchObject({ query: 'abc', status: 'loading' });
    client.setQuery('ab'); // backspace
    expect(client.getState()).toMatchObject({ query: 'ab', status: 'success', results: ['ab!'] });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('evicts the least-recently-USED entry when the cache is full', async () => {
    const fetcher = makeFetcher();
    const client = createAutocompleteClient({ fetcher, cacheSize: 2 });
    const load = async (q: string) => {
      client.setQuery(q);
      await tick(300);
      calls.at(-1)!.d.resolve([q.toUpperCase()]);
      await tick();
    };
    await load('a');
    await load('b');
    client.setQuery('a'); // cache hit → 'a' becomes most recently used
    await load('c'); // must evict 'b', not 'a'
    expect(fetcher).toHaveBeenCalledTimes(3);
    client.setQuery('a');
    expect(client.getState().status).toBe('success');
    client.setQuery('b');
    expect(client.getState().status).toBe('loading');
    await tick(300);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('errors: status error with empty results, and failures are not cached', async () => {
    const fetcher = makeFetcher();
    const client = createAutocompleteClient({ fetcher });
    client.setQuery('boom');
    await tick(300);
    const err = new Error('503');
    calls[0].d.reject(err);
    await tick();
    expect(client.getState()).toEqual({ query: 'boom', status: 'error', results: [], error: err });
    client.setQuery('boo');
    client.setQuery('boom');
    await tick(300);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('empty query: idle immediately, no fetch, in-flight request aborted and ignored', async () => {
    const fetcher = makeFetcher();
    const client = createAutocompleteClient({ fetcher });
    client.setQuery('ab');
    await tick(300);
    client.setQuery('   ');
    expect(client.getState()).toEqual({ query: '   ', status: 'idle', results: [], error: null });
    expect(calls[0].signal.aborted).toBe(true);
    calls[0].d.resolve(['late']);
    await tick(1000);
    expect(client.getState().status).toBe('idle');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('dispose() cancels the pending debounce and stops notifications', async () => {
    const fetcher = makeFetcher();
    const client = createAutocompleteClient({ fetcher });
    const listener = vi.fn();
    client.subscribe(listener);
    client.setQuery('x');
    listener.mockClear();
    client.dispose();
    await tick(1000);
    expect(fetcher).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});
