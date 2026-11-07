import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VirtualList, { type VirtualListProps } from './solution';

const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);

function renderList(props: Partial<VirtualListProps<string>> = {}) {
  const renderItem = vi.fn((item: string) => <span>{item}</span>);
  render(<VirtualList items={items} itemHeight={20} height={100} label="Results" renderItem={renderItem} {...props} />);
  const list = screen.getByRole('list', { name: 'Results' });
  /** jsdom has no layout, so we set scrollTop by hand and fire the event. */
  const scrollTo = (top: number) => {
    list.scrollTop = top;
    fireEvent.scroll(list);
  };
  const texts = () => screen.getAllByRole('listitem').map((el) => el.textContent);
  const rowOf = (text: string) => screen.getByText(text).closest('[role="listitem"]');
  return { list, renderItem, scrollTo, texts, rowOf };
}

describe('VirtualList', () => {
  it('renders only the rows that fit in the viewport', () => {
    const { texts } = renderList();
    expect(texts()).toEqual(['Item 0', 'Item 1', 'Item 2', 'Item 3', 'Item 4']);
    expect(screen.queryByText('Item 5')).toBeNull();
  });

  it('calls renderItem only for windowed rows, not for all 1000', () => {
    const { renderItem } = renderList();
    expect(renderItem.mock.calls.length).toBeGreaterThan(0);
    expect(renderItem.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it('sizes an inner element to the full list height so the scrollbar is right', () => {
    const { list } = renderList();
    expect(list.firstElementChild).toHaveStyle({ height: '20000px' });
  });

  it('absolutely positions each row at index × itemHeight', () => {
    const { rowOf } = renderList();
    expect(rowOf('Item 3')).toHaveStyle({ position: 'absolute', top: '60px', height: '20px' });
  });

  it('moves the window when the list is scrolled', () => {
    const { scrollTo, texts } = renderList();
    scrollTo(400);
    expect(texts()).toEqual(['Item 20', 'Item 21', 'Item 22', 'Item 23', 'Item 24']);
    expect(screen.queryByText('Item 0')).toBeNull();
  });

  it('renders overscan rows above and below the viewport', () => {
    const { scrollTo, texts } = renderList({ overscan: 2 });
    scrollTo(400);
    expect(texts()).toEqual(['Item 18', 'Item 19', 'Item 20', 'Item 21', 'Item 22', 'Item 23', 'Item 24', 'Item 25', 'Item 26']);
  });

  it('tells assistive tech each row’s position in the FULL list', () => {
    const { scrollTo, rowOf } = renderList();
    scrollTo(400);
    expect(rowOf('Item 20')).toHaveAttribute('aria-setsize', '1000');
    expect(rowOf('Item 20')).toHaveAttribute('aria-posinset', '21');
  });

  it('keeps the DOM node of a row that stays in view (keys are item indexes, not slot positions)', () => {
    const { scrollTo, rowOf } = renderList();
    const before = rowOf('Item 3');
    scrollTo(20); // window slides by one row: 1..5
    expect(rowOf('Item 3')).toBe(before);
  });
});
