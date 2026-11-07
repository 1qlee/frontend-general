export interface VisibleRangeInput {
  /** Current scroll offset of the viewport in px. Can be negative (elastic overscroll) or past the end (after rows were removed). */
  scrollTop: number;
  /** Height of the scroll container in px. */
  viewportHeight: number;
  /** Fixed height of every row in px. */
  itemHeight: number;
  /** Total number of rows. */
  itemCount: number;
  /** Extra rows to render above AND below the visible ones. Defaults to 0. */
  overscan?: number;
}

/** Half-open range of row indexes: render `items.slice(start, end)`. */
export interface VisibleRange {
  start: number;
  end: number;
}

/**
 * Windowing math for a fixed-row-height virtual list.
 *
 * - A row counts as visible if ANY part of it is inside the viewport.
 * - `end` is exclusive.
 * - Overscan is clamped to the list bounds.
 * - `scrollTop` is clamped to [0, maxScrollTop] before doing the math.
 * - An empty list returns { start: 0, end: 0 }.
 */
export function getVisibleRange({
  scrollTop,
  viewportHeight,
  itemHeight,
  itemCount,
  overscan = 0,
}: VisibleRangeInput): VisibleRange {
  if (itemCount <= 0 || itemHeight <= 0) return { start: 0, end: 0 };

  // Clamp first: negative values come from elastic overscroll (iOS), and a scrollTop past
  // the end happens when rows are removed while the user is scrolled down.
  const maxScrollTop = Math.max(0, itemCount * itemHeight - viewportHeight);
  const top = Math.min(Math.max(0, scrollTop), maxScrollTop);

  // floor: the row containing the top edge (possibly only partly visible).
  const firstVisible = Math.floor(top / itemHeight);
  // ceil: one past the row containing the bottom edge. A row that STARTS exactly at the
  // bottom edge is not visible, which is why this is ceil(...) and not floor(...) + 1.
  const endVisible = Math.ceil((top + viewportHeight) / itemHeight);

  return {
    start: Math.max(0, firstVisible - overscan),
    end: Math.min(itemCount, endVisible + overscan),
  };
}
