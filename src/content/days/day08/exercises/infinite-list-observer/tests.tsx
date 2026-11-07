import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InfiniteList, type Page } from './solution';

/** A controllable IntersectionObserver: the test decides when the sentinel is "visible". */
class FakeIntersectionObserver {
  static all: FakeIntersectionObserver[] = [];
  readonly targets = new Set<Element>();
  readonly root = null;
  readonly thresholds: number[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.options = options;
    FakeIntersectionObserver.all.push(this);
  }
  get rootMargin() {
    return this.options.rootMargin ?? '0px';
  }
  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Simulate every observed element scrolling into (or out of) view. */
function setSentinelVisible(isIntersecting: boolean) {
  act(() => {
    for (const io of FakeIntersectionObserver.all) {
      if (io.targets.size === 0) continue;
      const entries = [...io.targets].map(
        (target) => ({ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 }) as unknown as IntersectionObserverEntry,
      );
      io.callback(entries, io as unknown as IntersectionObserver);
    }
  });
}

const observedElements = () => FakeIntersectionObserver.all.flatMap((io) => [...io.targets]);

function makePage(n: number, nextPage: number | null): Page {
  return { items: [1, 2].map((i) => ({ id: `p${n}-${i}`, title: `Page ${n} item ${i}` })), nextPage };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Three pages: 1 → 2 → 3 → end */
const threePages = (page: number) => Promise.resolve(makePage(page, page < 3 ? page + 1 : null));

beforeEach(() => {
  FakeIntersectionObserver.all = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

describe('InfiniteList', () => {
  it('loads page 1 on mount and renders its items', async () => {
    const loadPage = vi.fn(threePages);
    render(<InfiniteList loadPage={loadPage} />);
    expect(loadPage).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Page 1 item 1')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows a loading status while a request is in flight', async () => {
    const d = deferred<Page>();
    render(<InfiniteList loadPage={() => d.promise} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    await act(async () => d.resolve(makePage(1, 2)));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('observes the sentinel with rootMargin "200px" by default', async () => {
    render(<InfiniteList loadPage={threePages} />);
    await screen.findByText('Page 1 item 1');
    const sentinel = screen.getByTestId('sentinel');
    expect(observedElements()).toContain(sentinel);
    const owner = FakeIntersectionObserver.all.find((io) => io.targets.has(sentinel))!;
    expect(owner.options.rootMargin).toBe('200px');
  });

  it('loads and APPENDS the next page when the sentinel scrolls into view', async () => {
    const loadPage = vi.fn(threePages);
    render(<InfiniteList loadPage={loadPage} />);
    await screen.findByText('Page 1 item 1');

    setSentinelVisible(true);
    await screen.findByText('Page 2 item 1');

    expect(loadPage).toHaveBeenLastCalledWith(2);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Page 1 item 1',
      'Page 1 item 2',
      'Page 2 item 1',
      'Page 2 item 2',
    ]);
  });

  it('ignores entries that are not intersecting', async () => {
    const loadPage = vi.fn(threePages);
    render(<InfiniteList loadPage={loadPage} />);
    await screen.findByText('Page 1 item 1');
    setSentinelVisible(false);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it('never has two requests in flight, however often the sentinel fires', async () => {
    const pending = [deferred<Page>(), deferred<Page>()];
    const loadPage = vi.fn((page: number) => pending[page - 1].promise);
    render(<InfiniteList loadPage={loadPage} />);

    setSentinelVisible(true); // page 1 is still loading
    setSentinelVisible(true);
    expect(loadPage).toHaveBeenCalledTimes(1);

    await act(async () => pending[0].resolve(makePage(1, 2)));
    setSentinelVisible(true);
    setSentinelVisible(true);
    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(loadPage).toHaveBeenLastCalledWith(2);

    await act(async () => pending[1].resolve(makePage(2, null)));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('stops at the last page: removes the sentinel, stops observing, shows the end', async () => {
    const loadPage = vi.fn(() => Promise.resolve(makePage(1, null)));
    render(<InfiniteList loadPage={loadPage} />);
    expect(await screen.findByText(/reached the end/i)).toBeInTheDocument();
    expect(screen.queryByTestId('sentinel')).not.toBeInTheDocument();
    expect(observedElements()).toEqual([]);
    setSentinelVisible(true);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it('disconnects the observer on unmount', async () => {
    const { unmount } = render(<InfiniteList loadPage={threePages} />);
    await screen.findByText('Page 1 item 1');
    expect(observedElements()).toHaveLength(1);
    unmount();
    expect(observedElements()).toEqual([]);
  });

  it('does not re-fetch when the parent re-renders with a new (inline) loadPage function', async () => {
    const api = vi.fn(threePages);
    const { rerender } = render(<InfiniteList loadPage={(p) => api(p)} />);
    await screen.findByText('Page 1 item 1');
    rerender(<InfiniteList loadPage={(p) => api(p)} />);
    rerender(<InfiniteList loadPage={(p) => api(p)} />);
    await act(async () => {});
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('shows an error with a Retry button that retries the SAME page (stretch)', async () => {
    const user = userEvent.setup();
    const loadPage = vi
      .fn<(page: number) => Promise<Page>>()
      .mockResolvedValueOnce(makePage(1, 2))
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce(makePage(2, null));
    render(<InfiniteList loadPage={loadPage} />);
    await screen.findByText('Page 1 item 1');

    setSentinelVisible(true);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load/i);

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Page 2 item 1')).toBeInTheDocument();
    expect(loadPage.mock.calls.map((args) => args[0])).toEqual([1, 2, 2]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
