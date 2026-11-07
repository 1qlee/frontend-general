// ---------------------------------------------------------------------------
// Provided helpers (the tests use them). You don't need to change anything here.
// ---------------------------------------------------------------------------

export class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val: number, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

/**
 * Build a tree from LeetCode-style level order, where `null` marks a missing child:
 *   fromLevelOrder([3, 9, 20, null, null, 15, 7])
 *         3
 *        / \
 *       9  20
 *          / \
 *         15  7
 */
export function fromLevelOrder(values: ReadonlyArray<number | null>): TreeNode | null {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue: TreeNode[] = [root];
  let head = 0;
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    const left = values[i++];
    if (left !== null && left !== undefined) {
      node.left = new TreeNode(left);
      queue.push(node.left);
    }
    const right = i < values.length ? values[i++] : null;
    if (right !== null && right !== undefined) {
      node.right = new TreeNode(right);
      queue.push(node.right);
    }
  }
  return root;
}

/** The inverse of fromLevelOrder (trailing nulls are trimmed). */
export function toLevelOrder(root: TreeNode | null): Array<number | null> {
  const out: Array<number | null> = [];
  const queue: Array<TreeNode | null> = [root];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];
    out.push(node ? node.val : null);
    if (node) queue.push(node.left, node.right);
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

/** A degenerate ("linked list") tree: every node only has a right child. */
export function chain(length: number): TreeNode | null {
  let root: TreeNode | null = null;
  for (let v = length; v >= 1; v--) root = new TreeNode(v, null, root);
  return root;
}

// ---------------------------------------------------------------------------

/** Return the values of the tree level by level, left to right. */
export function levelOrder(root: TreeNode | null): number[][] {
  if (root === null) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  let head = 0; // index-based dequeue: O(1), unlike Array.prototype.shift()

  while (head < queue.length) {
    // Snapshot the size: everything currently in the queue is exactly one level.
    const levelEnd = queue.length;
    const level: number[] = [];
    while (head < levelEnd) {
      const node = queue[head++];
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
