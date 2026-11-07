import { describe, it, expect } from 'vitest';
import { ListNode, fromArray, toArray, reverseList } from './solution';

describe('reverseList', () => {
  it('reverses a multi-node list', () => {
    expect(toArray(reverseList(fromArray([1, 2, 3, 4, 5])))).toEqual([5, 4, 3, 2, 1]);
  });

  it('returns null for an empty list', () => {
    expect(reverseList(null)).toBeNull();
  });

  it('returns the same node for a single-node list, with next still null', () => {
    const only = new ListNode(7);
    const result = reverseList(only);
    expect(result).toBe(only);
    expect(result?.next).toBeNull();
  });

  it('reverses a two-node list', () => {
    expect(toArray(reverseList(fromArray([1, 2])))).toEqual([2, 1]);
  });

  it('re-links the existing nodes instead of creating new ones', () => {
    const head = fromArray([1, 2, 3]);
    const tail = head?.next?.next ?? null;
    const result = reverseList(head);
    expect(result).toBe(tail); // the old tail is the new head
    expect(head?.next).toBeNull(); // the old head is the new tail (no cycle left behind)
  });

  it('keeps duplicate and negative values in the right order', () => {
    expect(toArray(reverseList(fromArray([-1, 0, 0, 3, -1])))).toEqual([-1, 3, 0, 0, -1]);
  });

  it('handles a 100,000-node list without overflowing the call stack', () => {
    const values = Array.from({ length: 100_000 }, (_, i) => i);
    const result = toArray(reverseList(fromArray(values)));
    expect(result).toHaveLength(100_000);
    expect(result[0]).toBe(99_999);
    expect(result[99_999]).toBe(0);
  });
});
