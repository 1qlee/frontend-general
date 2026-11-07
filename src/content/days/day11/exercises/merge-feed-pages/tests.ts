import { describe, it, expect } from 'vitest';
import { emptyFeed, mergeFeedPages, type FeedState } from './solution';

interface Item {
  id: string;
  text: string;
  likes?: number;
}
const item = (id: string, likes = 0): Item => ({ id, text: `post ${id}`, likes });

function loaded(): FeedState<Item> {
  return mergeFeedPages(emptyFeed<Item>(), { items: [item('9'), item('8'), item('7')], nextCursor: 'c7' });
}

describe('mergeFeedPages — append (load more)', () => {
  it('initial load: ids in page order, items by id, cursor and hasMore set', () => {
    const state = loaded();
    expect(state.ids).toEqual(['9', '8', '7']);
    expect(state.byId['8']).toEqual(item('8'));
    expect(state.nextCursor).toBe('c7');
    expect(state.hasMore).toBe(true);
  });

  it('a page with nextCursor null means the end of the feed', () => {
    const state = mergeFeedPages(loaded(), { items: [item('6')], nextCursor: null });
    expect(state.ids).toEqual(['9', '8', '7', '6']);
    expect(state.hasMore).toBe(false);
    expect(state.nextCursor).toBeNull();
  });

  it('skips items already in the feed but updates their data in place', () => {
    // '7' shows up again (it was bumped on the server) with more likes
    const state = mergeFeedPages(loaded(), { items: [item('7', 5), item('6'), item('5')], nextCursor: 'c5' });
    expect(state.ids).toEqual(['9', '8', '7', '6', '5']);
    expect(state.byId['7'].likes).toBe(5);
    expect(state.nextCursor).toBe('c5');
  });

  it('dedupes ids within a single page (first occurrence wins)', () => {
    const state = mergeFeedPages(emptyFeed<Item>(), { items: [item('3'), item('2'), item('3')], nextCursor: null });
    expect(state.ids).toEqual(['3', '2']);
  });
});

describe('mergeFeedPages — prepend (refresh / new posts banner)', () => {
  it('puts new items on top in page order and keeps the bottom cursor', () => {
    const state = mergeFeedPages(loaded(), { items: [item('11'), item('10'), item('9', 42)], nextCursor: 'c9' }, 'prepend');
    expect(state.ids).toEqual(['11', '10', '9', '8', '7']);
    expect(state.byId['9'].likes).toBe(42);
    expect(state.nextCursor).toBe('c7'); // NOT 'c9' — that would re-download 8 and 7 on "load more"
    expect(state.hasMore).toBe(true);
  });

  it('into an empty feed behaves like the initial load', () => {
    const state = mergeFeedPages(emptyFeed<Item>(), { items: [item('2'), item('1')], nextCursor: 'c1' }, 'prepend');
    expect(state.ids).toEqual(['2', '1']);
    expect(state.nextCursor).toBe('c1');
    expect(state.hasMore).toBe(true);
  });

  it('an empty refresh page changes nothing', () => {
    const before = loaded();
    expect(mergeFeedPages(before, { items: [], nextCursor: null }, 'prepend')).toEqual(before);
  });

  it('with no overlap (possible gap) it replaces the feed with the new page', () => {
    const state = mergeFeedPages(loaded(), { items: [item('30'), item('29')], nextCursor: 'c29' }, 'prepend');
    expect(state.ids).toEqual(['30', '29']);
    expect(Object.keys(state.byId).sort()).toEqual(['29', '30']);
    expect(state.nextCursor).toBe('c29');
  });
});

describe('mergeFeedPages — immutability', () => {
  it('never mutates the previous state', () => {
    const before = loaded();
    const snapshot = JSON.parse(JSON.stringify(before));
    const after = mergeFeedPages(before, { items: [item('7', 9), item('6')], nextCursor: null });
    mergeFeedPages(before, { items: [item('10'), item('9')], nextCursor: 'x' }, 'prepend');
    expect(before).toEqual(snapshot);
    expect(after.ids).not.toBe(before.ids);
    expect(after.byId).not.toBe(before.byId);
  });
});
