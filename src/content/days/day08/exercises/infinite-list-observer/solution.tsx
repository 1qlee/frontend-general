import { useCallback, useEffect, useRef, useState } from 'react';

export interface Item {
  id: string;
  title: string;
}

export interface Page {
  items: Item[];
  /** The page number to request next, or null when there are no more pages. */
  nextPage: number | null;
}

export interface InfiniteListProps {
  loadPage: (page: number) => Promise<Page>;
  /** Grow the observer's root box so the next page starts loading before the user reaches the end. */
  rootMargin?: string;
}

type Status = 'idle' | 'loading' | 'error';

export function InfiniteList({ loadPage, rootMargin = '200px' }: InfiniteListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [hasMore, setHasMore] = useState(true);

  // Mutable bookkeeping that must not trigger renders and must be current inside
  // the observer callback (which would otherwise close over stale state).
  const nextPageRef = useRef<number | null>(1);
  const inFlightRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // "Latest ref" pattern: always call the newest loadPage without making
  // loadMore (and therefore the effects below) depend on its identity.
  const loadPageRef = useRef(loadPage);
  useEffect(() => {
    loadPageRef.current = loadPage;
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    const page = nextPageRef.current;
    if (inFlightRef.current || page === null) return; // one request at a time
    inFlightRef.current = true;
    setStatus('loading');
    try {
      const result = await loadPageRef.current(page);
      setItems((prev) => [...prev, ...result.items]);
      nextPageRef.current = result.nextPage;
      setHasMore(result.nextPage !== null);
      setStatus('idle');
    } catch {
      setStatus('error'); // nextPageRef unchanged → Retry requests the same page
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // First page on mount. (In StrictMode the effect runs twice; the in-flight guard dedupes it.)
  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  const showSentinel = hasMore && status !== 'error';

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showSentinel, loadMore, rootMargin]);

  return (
    <div>
      <ul aria-label="Results">
        {items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
      {status === 'loading' && <p role="status">Loading…</p>}
      {status === 'error' && (
        <div role="alert">
          Couldn't load more items.{' '}
          <button type="button" onClick={() => void loadMore()}>
            Retry
          </button>
        </div>
      )}
      {!hasMore && <p>You've reached the end.</p>}
      {showSentinel && <div ref={sentinelRef} data-testid="sentinel" aria-hidden="true" style={{ height: 1 }} />}
    </div>
  );
}

// ---- live preview ---------------------------------------------------------
const PAGE_SIZE = 15;
const LAST_PAGE = 5;

function fakeApi(page: number): Promise<Page> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        items: Array.from({ length: PAGE_SIZE }, (_, i) => ({
          id: `${page}-${i}`,
          title: `Item ${(page - 1) * PAGE_SIZE + i + 1}`,
        })),
        nextPage: page < LAST_PAGE ? page + 1 : null,
      });
    }, 500);
  });
}

export default function Demo() {
  return <InfiniteList loadPage={fakeApi} />;
}
