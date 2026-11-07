import { type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Provided: the windowing math from the previous exercise (already correct).
// ---------------------------------------------------------------------------
export function getVisibleRange({
  scrollTop,
  viewportHeight,
  itemHeight,
  itemCount,
  overscan = 0,
}: {
  scrollTop: number;
  viewportHeight: number;
  itemHeight: number;
  itemCount: number;
  overscan?: number;
}): { start: number; end: number } {
  if (itemCount <= 0 || itemHeight <= 0) return { start: 0, end: 0 };
  const maxScrollTop = Math.max(0, itemCount * itemHeight - viewportHeight);
  const top = Math.min(Math.max(0, scrollTop), maxScrollTop);
  return {
    start: Math.max(0, Math.floor(top / itemHeight) - overscan),
    end: Math.min(itemCount, Math.ceil((top + viewportHeight) / itemHeight) + overscan),
  };
}

export interface VirtualListProps<T> {
  items: readonly T[];
  /** Fixed height of every row in px. */
  itemHeight: number;
  /** Height of the scroll viewport in px (passed in: we don't measure). */
  height: number;
  /** Extra rows above and below the viewport. Defaults to 0. */
  overscan?: number;
  /** Accessible name of the list. */
  label: string;
  renderItem: (item: T, index: number) => ReactNode;
}

/**
 * Required structure:
 *
 *   <div role="list" aria-label={label} tabIndex={0} style="height; overflow-y: auto; position: relative" onScroll>
 *     <div style="height: items.length * itemHeight; position: relative">   ← the "sizer"
 *       <div role="listitem" aria-setsize aria-posinset style="position: absolute; top: index * itemHeight; height: itemHeight">
 *         {renderItem(item, index)}
 *       </div>
 *       …only the rows in getVisibleRange(…)
 *
 * TODO: this naive version renders EVERY item. Make it render only the visible window.
 */
export default function VirtualList<T>({ items, itemHeight, height, label, renderItem }: VirtualListProps<T>) {
  return (
    <div role="list" aria-label={label} tabIndex={0} style={{ height, overflowY: 'auto', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        {items.map((item, index) => (
          <div key={index} role="listitem" style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
