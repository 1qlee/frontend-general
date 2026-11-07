import { useEffect, useRef, useState } from 'react';

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

/**
 * - Load page 1 on mount; render items as <li> in a <ul aria-label="Results">.
 * - While loading: <p role="status">Loading…</p>.
 * - Render <div data-testid="sentinel" /> after the list while there are more pages,
 *   observed by an IntersectionObserver created with { rootMargin }.
 * - Sentinel intersecting → load the next page. Never two requests at once.
 * - nextPage === null → remove the sentinel, disconnect, show "You've reached the end."
 * - Error → <div role="alert"> with a "Retry" button that retries the same page.
 */
export function InfiniteList({ loadPage, rootMargin = '200px' }: InfiniteListProps) {
  // TODO
  return null;
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
