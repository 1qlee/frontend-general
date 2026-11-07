export interface FeedState<T extends { id: string }> {
  /** Item ids in display order (newest first). */
  ids: string[];
  /** Normalized item table. */
  byId: Record<string, T>;
  /** Cursor for the NEXT (older) page; null when the end was reached. */
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FeedPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** 'append' = "load more" (older items at the bottom); 'prepend' = refresh / "N new posts" (newest page on top). */
export type MergeMode = 'append' | 'prepend';

export function emptyFeed<T extends { id: string }>(): FeedState<T> {
  return { ids: [], byId: {}, nextCursor: null, hasMore: true };
}

/**
 * Merge a page from a cursor-paginated feed API into the client feed state. Pure: return a new state.
 *
 * append:
 *   - add items whose id is not yet in the feed, in page order, at the end
 *   - items already in the feed keep their position but take the newer data
 *   - take the page's nextCursor; hasMore = nextCursor !== null
 * prepend (refresh):
 *   - new items go on top, in page order; existing items are updated in place
 *   - nextCursor/hasMore are NOT changed (they describe the bottom of the feed)
 *   - into an empty feed it behaves exactly like append (initial load)
 *   - an empty page changes nothing
 *   - if NONE of the page's items is already in the feed, there may be a gap between
 *     the new page and what we have: replace the feed with the page (as an initial load)
 * Both modes: duplicate ids inside one page are kept once (first occurrence wins).
 */
export function mergeFeedPages<T extends { id: string }>(
  state: FeedState<T>,
  page: FeedPage<T>,
  mode: MergeMode = 'append',
): FeedState<T> {
  throw new Error('Not implemented');
}
