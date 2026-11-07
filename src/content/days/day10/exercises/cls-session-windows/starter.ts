/** The subset of a `layout-shift` PerformanceEntry that CLS needs. */
export interface LayoutShiftEntry {
  /** Layout shift score of this single shift (impact fraction × distance fraction). */
  value: number;
  /** ms since navigation start. Entries arrive in startTime order. */
  startTime: number;
  /** True if the shift happened within 500 ms of a discrete user input — excluded from CLS. */
  hadRecentInput: boolean;
}

/**
 * Compute Cumulative Layout Shift the way Chrome and `web-vitals` do:
 * - Ignore entries with `hadRecentInput: true` (they neither add score nor extend a window).
 * - Group the rest into session windows: a shift joins the current window if it starts
 *   < 1000 ms after the previous shift in the window AND < 5000 ms after the window's first shift.
 *   Otherwise it starts a new window.
 * - Return the score (sum of values) of the LARGEST window; 0 if there are no shifts.
 */
export function computeCLS(entries: readonly LayoutShiftEntry[]): number {
  throw new Error('Not implemented');
}
