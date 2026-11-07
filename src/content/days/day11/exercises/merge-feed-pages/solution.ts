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

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

export function mergeFeedPages<T extends { id: string }>(
  state: FeedState<T>,
  page: FeedPage<T>,
  mode: MergeMode = 'append',
): FeedState<T> {
  const items = uniqueById(page.items);
  const isInitialLoad = state.ids.length === 0;

  if (mode === 'prepend' && !isInitialLoad) {
    if (items.length === 0) return state;
    const overlaps = items.some((item) => Object.hasOwn(state.byId, item.id));
    // No overlap: we can't prove there is no gap between this page and our feed → start over.
    if (!overlaps) return mergeFeedPages(emptyFeed<T>(), { items, nextCursor: page.nextCursor });
  }

  const byId: Record<string, T> = { ...state.byId };
  const freshIds: string[] = [];
  for (const item of items) {
    if (!Object.hasOwn(byId, item.id)) freshIds.push(item.id);
    byId[item.id] = item; // newer server copy wins (like counts, edits…)
  }

  if (mode === 'prepend' && !isInitialLoad) {
    return { ...state, ids: [...freshIds, ...state.ids], byId };
  }
  return {
    ids: [...state.ids, ...freshIds],
    byId,
    nextCursor: page.nextCursor,
    hasMore: page.nextCursor !== null,
  };
}
