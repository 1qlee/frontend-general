import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsync, type Fetcher } from './solution';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A fetcher you resolve by hand. It deliberately IGNORES the abort signal. */
function controllableFetcher() {
  const calls: Array<{ key: string; signal: AbortSignal; request: Deferred<string> }> = [];
  const fetcher = vi.fn((key: string, signal: AbortSignal) => {
    const request = deferred<string>();
    calls.push({ key, signal, request });
    return request.promise;
  });
  return { fetcher, calls };
}

describe('useAsync', () => {
  it('is idle and does not fetch while key is null', () => {
    const { fetcher } = controllableFetcher();
    const { result } = renderHook(() => useAsync(null, fetcher));
    expect(result.current).toEqual({ status: 'idle' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('goes loading → success, calling the fetcher with the key and an AbortSignal', async () => {
    const { fetcher, calls } = controllableFetcher();
    const { result } = renderHook(() => useAsync('user/1', fetcher));
    expect(result.current).toEqual({ status: 'loading' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('user/1', expect.any(AbortSignal));
    await act(async () => calls[0].request.resolve('Ada'));
    expect(result.current).toEqual({ status: 'success', data: 'Ada' });
  });

  it('goes to error with an Error instance (non-Error rejections are wrapped)', async () => {
    const { fetcher, calls } = controllableFetcher();
    const { result } = renderHook(() => useAsync('user/1', fetcher));
    await act(async () => calls[0].request.reject('server exploded'));
    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error.message).toBe('server exploded');
    }
  });

  it('a new key aborts the old request and ignores its late response', async () => {
    const { fetcher, calls } = controllableFetcher();
    const { result, rerender } = renderHook(({ id }: { id: string }) => useAsync(id, fetcher), {
      initialProps: { id: 'a' },
    });
    rerender({ id: 'b' });
    expect(calls[0].signal.aborted).toBe(true);
    expect(result.current).toEqual({ status: 'loading' });
    await act(async () => calls[1].request.resolve('B'));
    await act(async () => calls[0].request.resolve('A (stale)')); // arrives last
    expect(result.current).toEqual({ status: 'success', data: 'B' });
  });

  it('ignores a stale error too', async () => {
    const { fetcher, calls } = controllableFetcher();
    const { result, rerender } = renderHook(({ id }: { id: string }) => useAsync(id, fetcher), {
      initialProps: { id: 'a' },
    });
    rerender({ id: 'b' });
    await act(async () => calls[1].request.resolve('B'));
    await act(async () => calls[0].request.reject(new Error('A failed')));
    expect(result.current).toEqual({ status: 'success', data: 'B' });
  });

  it('switching the key back to null returns to idle and aborts', async () => {
    const { fetcher, calls } = controllableFetcher();
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useAsync(id, fetcher), {
      initialProps: { id: 'a' as string | null },
    });
    rerender({ id: null });
    expect(calls[0].signal.aborted).toBe(true);
    expect(result.current).toEqual({ status: 'idle' });
    await act(async () => calls[0].request.resolve('late'));
    expect(result.current).toEqual({ status: 'idle' });
  });

  it('aborts the in-flight request on unmount', () => {
    const { fetcher, calls } = controllableFetcher();
    const { unmount } = renderHook(() => useAsync('user/1', fetcher));
    expect(calls[0].signal.aborted).toBe(false);
    unmount();
    expect(calls[0].signal.aborted).toBe(true);
  });

  it('does not refetch on re-render when the fetcher is an inline function (new identity each render)', () => {
    const { fetcher } = controllableFetcher();
    let calls = 0;
    const guarded = (key: string, signal: AbortSignal) => {
      // Guard so a render → effect → setState → render loop fails fast instead of hanging.
      if (++calls > 5) throw new Error('Fetcher called on every render — is `fetcher` an effect dependency?');
      return fetcher(key, signal);
    };
    const { rerender } = renderHook(
      ({ id }: { id: string }) => useAsync(id, (key: string, signal: AbortSignal) => guarded(key, signal)),
      { initialProps: { id: 'a' } },
    );
    rerender({ id: 'a' });
    rerender({ id: 'a' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('uses the latest fetcher when the key changes', async () => {
    const first = controllableFetcher();
    const second = controllableFetcher();
    const { result, rerender } = renderHook(
      ({ id, fetcher }: { id: string; fetcher: Fetcher<string> }) => useAsync(id, fetcher),
      { initialProps: { id: 'a', fetcher: first.fetcher as Fetcher<string> } },
    );
    rerender({ id: 'b', fetcher: second.fetcher });
    expect(second.fetcher).toHaveBeenCalledWith('b', expect.any(AbortSignal));
    await act(async () => second.calls[0].request.resolve('from second'));
    expect(result.current).toEqual({ status: 'success', data: 'from second' });
  });
});
