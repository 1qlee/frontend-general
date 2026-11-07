/** The subset of a `layout-shift` PerformanceEntry that CLS needs. */
export interface LayoutShiftEntry {
  /** Layout shift score of this single shift (impact fraction × distance fraction). */
  value: number;
  /** ms since navigation start. Entries arrive in startTime order. */
  startTime: number;
  /** True if the shift happened within 500 ms of a discrete user input — excluded from CLS. */
  hadRecentInput: boolean;
}

const MAX_GAP_MS = 1000;
const MAX_WINDOW_MS = 5000;

/**
 * CLS = the score of the worst "session window": a burst of shifts where each shift
 * is < 1 s after the previous one and the whole window spans < 5 s.
 * (Same algorithm as Google's `web-vitals` library.)
 */
export function computeCLS(entries: readonly LayoutShiftEntry[]): number {
  let largest = 0;
  let sessionValue = 0;
  let sessionFirst: LayoutShiftEntry | undefined;
  let sessionLast: LayoutShiftEntry | undefined;

  for (const entry of entries) {
    // Expected shifts (right after a click/tap/keypress) don't count — and don't extend windows.
    if (entry.hadRecentInput) continue;

    const continuesSession =
      sessionFirst !== undefined &&
      sessionLast !== undefined &&
      entry.startTime - sessionLast.startTime < MAX_GAP_MS &&
      entry.startTime - sessionFirst.startTime < MAX_WINDOW_MS;

    if (continuesSession) {
      sessionValue += entry.value;
    } else {
      sessionValue = entry.value;
      sessionFirst = entry;
    }
    sessionLast = entry;
    largest = Math.max(largest, sessionValue);
  }
  return largest;
}
