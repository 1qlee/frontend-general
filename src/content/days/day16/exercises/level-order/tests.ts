import { describe, it, expect } from 'vitest';
import { levelOrder, fromLevelOrder, chain, TreeNode } from './solution';

describe('levelOrder', () => {
  it('returns [] for an empty tree', () => {
    expect(levelOrder(null)).toEqual([]);
  });

  it('returns [[val]] for a single node', () => {
    expect(levelOrder(new TreeNode(1))).toEqual([[1]]);
  });

  it('groups values by level: [3,9,20,null,null,15,7]', () => {
    expect(levelOrder(fromLevelOrder([3, 9, 20, null, null, 15, 7]))).toEqual([[3], [9, 20], [15, 7]]);
  });

  it('keeps left-to-right order inside a level, even across different parents', () => {
    //        1
    //      /   \
    //     2     3
    //      \   /
    //       4 5
    expect(levelOrder(fromLevelOrder([1, 2, 3, null, 4, 5]))).toEqual([[1], [2, 3], [4, 5]]);
  });

  it('does not merge levels when a branch ends early', () => {
    expect(levelOrder(fromLevelOrder([1, 2, 3, 4, null, null, null, 5]))).toEqual([[1], [2, 3], [4], [5]]);
  });

  it('handles duplicate and negative values', () => {
    expect(levelOrder(fromLevelOrder([0, -1, -1, 2, 2]))).toEqual([[0], [-1, -1], [2, 2]]);
  });

  it('returns one array per level for a degenerate tree 2,000 levels deep', () => {
    const levels = levelOrder(chain(2000));
    expect(levels).toHaveLength(2000);
    expect(levels[0]).toEqual([1]);
    expect(levels[1999]).toEqual([2000]);
  });

  it('handles a wide perfect tree (4,095 nodes)', () => {
    const values = Array.from({ length: 4095 }, (_, i) => i);
    const levels = levelOrder(fromLevelOrder(values));
    expect(levels).toHaveLength(12);
    expect(levels[11]).toHaveLength(2048);
    expect(levels[11][0]).toBe(2047);
  });
});
