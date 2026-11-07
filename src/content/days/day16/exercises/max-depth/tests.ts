import { describe, it, expect } from 'vitest';
import { maxDepth, fromLevelOrder, chain, TreeNode } from './solution';

describe('maxDepth', () => {
  it('returns 0 for an empty tree', () => {
    expect(maxDepth(null)).toBe(0);
  });

  it('returns 1 for a single node', () => {
    expect(maxDepth(new TreeNode(42))).toBe(1);
  });

  it('counts nodes (not edges) on the longest path: [3,9,20,null,null,15,7] → 3', () => {
    expect(maxDepth(fromLevelOrder([3, 9, 20, null, null, 15, 7]))).toBe(3);
  });

  it('follows the deeper side when the tree is lopsided to the left', () => {
    expect(maxDepth(fromLevelOrder([1, 2, null, 3, null, 4]))).toBe(4);
  });

  it('finds a deep path that is not the leftmost or rightmost one', () => {
    //        1
    //      /   \
    //     2     3
    //      \
    //       4
    //      /
    //     5
    expect(maxDepth(fromLevelOrder([1, 2, 3, null, 4, null, null, 5]))).toBe(4);
  });

  it('handles a perfect tree', () => {
    expect(maxDepth(fromLevelOrder([1, 2, 3, 4, 5, 6, 7]))).toBe(3);
  });

  it('handles a degenerate, linked-list-shaped tree 2,000 levels deep', () => {
    expect(maxDepth(chain(2000))).toBe(2000);
  });

  it('does not modify the tree', () => {
    const root = fromLevelOrder([3, 9, 20, null, null, 15, 7]);
    maxDepth(root);
    expect(root?.right?.left?.val).toBe(15);
    expect(root?.left?.left).toBeNull();
  });
});
