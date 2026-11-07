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
export function getVisibleRange(input: VisibleRangeInput): VisibleRange {
  throw new Error('Not implemented');
}
