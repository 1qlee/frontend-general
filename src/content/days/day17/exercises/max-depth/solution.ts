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

/**
 * Return the maximum depth of the tree: the number of NODES on the longest
 * root-to-leaf path. An empty tree has depth 0, a single node has depth 1.
 */
export function maxDepth(root: TreeNode | null): number {
  // Base case: an empty subtree contributes no depth.
  if (root === null) return 0;
  // Trust the recursion: each call returns the correct depth of its subtree.
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

/** Iterative alternative (BFS, one level at a time) — no call-stack limit. */
export function maxDepthIterative(root: TreeNode | null): number {
  if (root === null) return 0;
  let depth = 0;
  let level: TreeNode[] = [root];
  while (level.length > 0) {
    depth++;
    const next: TreeNode[] = [];
    for (const node of level) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    level = next;
  }
  return depth;
}
