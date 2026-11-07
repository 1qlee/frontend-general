import { useState, type ReactNode } from 'react';

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

export default function VirtualList<T>({ items, itemHeight, height, overscan = 0, label, renderItem }: VirtualListProps<T>) {
  // The only state is the scroll offset; everything else is derived during render.
  const [scrollTop, setScrollTop] = useState(0);
  const { start, end } = getVisibleRange({
    scrollTop,
    viewportHeight: height,
    itemHeight,
    itemCount: items.length,
    overscan,
  });

  const rows: ReactNode[] = [];
  for (let index = start; index < end; index++) {
    rows.push(
      // key = the item's ABSOLUTE index, so a row that stays in view keeps its DOM node
      // (and any state inside it) while the window slides. key = slot position would make
      // React reuse each node for a different item on every scroll.
      <div
        key={index}
        role="listitem"
        aria-setsize={items.length}
        aria-posinset={index + 1}
        style={{ position: 'absolute', top: index * itemHeight, left: 0, right: 0, height: itemHeight }}
      >
        {renderItem(items[index], index)}
      </div>,
    );
  }

  return (
    <div
      role="list"
      aria-label={label}
      tabIndex={0}
      style={{ height, overflowY: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* The sizer gives the scrollbar the full list height even though few rows exist. */}
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>{rows}</div>
    </div>
  );
}
