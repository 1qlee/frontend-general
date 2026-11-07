## Why interviewers ask about trees

Trees are the most common "real" data structure in DS&A rounds for frontend engineers, for a good reason: **you work with trees all day**. The DOM, a React component tree, a JSON payload, a file explorer, nested comments, a menu with submenus, an AST in your bundler — all trees. When an interviewer asks you to find the depth of a tree or flatten a comment thread, they're checking three things:

1. Can you write **recursion** that is obviously correct — a clear base case and a recursive case you trust?
2. Do you know the **traversal orders** (pre/in/post-order DFS, level-order BFS) and pick the right one on purpose?
3. Do you understand the **cost**: O(n) time, and O(h) stack space, which in JavaScript can mean a stack overflow on a degenerate tree.

DS&A I gave you the problem-solving framework (clarify → examples → brute force → bottleneck → pattern → code → test → complexity). Today you apply it to recursive structures. The good news: tree problems are some of the *most* formulaic in interviews. Learn about six shapes and most questions become variations.

## Recursion: the mental model

A recursive function solves a problem by solving **smaller instances of the same problem**. Every correct recursive function has two parts:

| Part | Question to ask | Tree example |
|---|---|---|
| **Base case** | "What is the smallest input I can answer directly?" | `null` → depth 0 |
| **Recursive case** | "If I had the answer for the smaller pieces, how do I combine them?" | `1 + max(depth(left), depth(right))` |

The skill that makes recursion easy is the **leap of faith**, or *trust the recursion*: when you write `depth(root.left)`, do **not** trace into it. Assume it returns the correct answer for the left subtree (it will, by induction, if your base case and combination step are right) and only think about the current node.

```ts run
type Comment = { id: number; text: string; replies: Comment[] };

// "How many comments are in this thread, including all nested replies?"
function countComments(c: Comment): number {
  // No explicit base case needed: a comment with no replies loops zero times.
  let total = 1; // this comment
  for (const reply of c.replies) total += countComments(reply); // trust it
  return total;
}

const thread: Comment = {
  id: 1, text: 'Ship it?', replies: [
    { id: 2, text: 'Tests?', replies: [{ id: 4, text: 'Green.', replies: [] }] },
    { id: 3, text: 'LGTM', replies: [] },
  ],
};
console.log(countComments(thread)); // 4
```

> [!INTERVIEW] Say it like this
> "I'll define the function by what it returns for one subtree. Base case: an empty tree returns 0. Recursive case: assuming the calls on the children return correct answers, I combine them at this node. Each node is visited once, so it's O(n) time, and the recursion uses O(h) stack space, where h is the height."

### The call stack and its limits in JavaScript

Each call pushes a **stack frame** (arguments, locals, return address). Frames are popped when calls return. Recursion depth = the longest chain of calls that are active at the same time — for a tree, the **height**, not the node count.

JavaScript engines cap the stack. Depending on the engine, the frame size and how much stack is already in use, you get somewhere between a few thousand and a few tens of thousands of frames — **assume less than ~10,000** and never rely on an exact number. Exceed it and you get `RangeError: Maximum call stack size exceeded`. V8 does **not** do tail-call optimisation (only Safari's JavaScriptCore implements proper tail calls), so rewriting into tail-recursive style does not help.

```ts run
function depthOfChain(n: number): number {
  return n === 0 ? 0 : 1 + depthOfChain(n - 1);
}

for (const n of [1_000, 10_000, 1_000_000]) { // 10,000 may or may not fit — engine-dependent
  try {
    console.log(n, '→', depthOfChain(n));
  } catch (e) {
    console.log(n, '→', (e as Error).name, (e as Error).message);
  }
}
```

What this means in practice:

- A **balanced** tree with a million nodes is only ~20 levels deep — recursion is perfectly fine.
- A **degenerate** tree (a "linked list" — e.g. a BST built from sorted input, or a 50,000-reply chain of comments) can overflow.
- Grids are worse: a flood fill on a 300 × 300 all-land grid can recurse 90,000 deep.

The fix is always the same: replace the call stack with an **explicit stack** (an array you `push`/`pop`), or use BFS with a queue. That conversion is a common follow-up ("now do it without recursion"), so practise it below.

> [!MISTAKE]
> Saying "recursion is O(1) space because I don't allocate anything". The call stack is memory: recursion over a tree is O(h) space, which is O(n) in the worst case.

## Binary trees and BSTs

The LeetCode convention, which you'll use in today's exercises:

```ts
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val: number, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}
```

Trees in problems are often written in **level order with nulls**: `[3, 9, 20, null, null, 15, 7]` means root 3, children 9 and 20, 9 has no children, 20 has children 15 and 7. Today's starters include `fromLevelOrder` to build these.

Vocabulary interviewers expect you to use precisely:

| Term | Meaning |
|---|---|
| **Depth** of a node | Edges (or nodes — clarify!) from the root to it |
| **Height** of a tree | Longest root-to-leaf path. Balanced: O(log n). Degenerate: O(n) |
| **Leaf** | A node with no children |
| **Balanced** | Heights of left/right subtrees differ by ≤ 1 at every node |
| **Complete** | Every level full except possibly the last, filled left to right (heaps are complete trees) |
| **BST** | For every node: *all* values in the left subtree < node < *all* values in the right subtree |

A **binary search tree** gives O(h) search, insert and delete — O(log n) when balanced, O(n) when degenerate. Real libraries use self-balancing variants (red-black, AVL, B-trees in databases). You will not be asked to implement balancing in a frontend interview; you might be asked *why* a BST built from sorted input is slow.

## Depth-first traversal: pre, in, post

DFS goes as deep as possible before backtracking. The three orders differ only in **when you process the current node** relative to its children:

| Order | Sequence | Use it when… |
|---|---|---|
| **Pre-order** | node → left → right | You pass information **down** (current path, depth, bounds); copying/serialising a tree |
| **In-order** | left → node → right | BSTs: visits values in **sorted order** |
| **Post-order** | left → right → node | You need the children's answers **first** (height, size, sums, deleting a tree, bottom-up computations) |

```ts run
class TreeNode {
  constructor(public val: number, public left: TreeNode | null = null, public right: TreeNode | null = null) {}
}
//        4
//      /   \
//     2     6
//    / \   / \
//   1   3 5   7
const root = new TreeNode(4, new TreeNode(2, new TreeNode(1), new TreeNode(3)), new TreeNode(6, new TreeNode(5), new TreeNode(7)));

const pre: number[] = [], inOrder: number[] = [], post: number[] = [];
function walk(node: TreeNode | null): void {
  if (!node) return;
  pre.push(node.val);
  walk(node.left);
  inOrder.push(node.val);
  walk(node.right);
  post.push(node.val);
}
walk(root);
console.log('pre ', pre.join(' '));     // 4 2 1 3 6 5 7
console.log('in  ', inOrder.join(' ')); // 1 2 3 4 5 6 7  ← sorted, because it's a BST
console.log('post', post.join(' '));    // 1 3 2 5 7 6 4
```

{{quiz:dsa2-which-dfs-order}}

### Iterative DFS with an explicit stack

Pre-order is the easy conversion: pop a node, process it, push its children — **right first**, so left is popped first.

```ts run
class TreeNode {
  constructor(public val: number, public left: TreeNode | null = null, public right: TreeNode | null = null) {}
}
const root = new TreeNode(4, new TreeNode(2, new TreeNode(1), new TreeNode(3)), new TreeNode(6, new TreeNode(5), new TreeNode(7)));

function preorderIterative(root: TreeNode | null): number[] {
  const out: number[] = [];
  const stack: TreeNode[] = root ? [root] : [];
  while (stack.length) {
    const node = stack.pop()!;
    out.push(node.val);
    if (node.right) stack.push(node.right); // pushed first → popped last
    if (node.left) stack.push(node.left);
  }
  return out;
}

function inorderIterative(root: TreeNode | null): number[] {
  const out: number[] = [];
  const stack: TreeNode[] = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; } // go left as far as possible
    cur = stack.pop()!;
    out.push(cur.val);                                // visit
    cur = cur.right;                                  // then the right subtree
  }
  return out;
}

console.log(preorderIterative(root).join(' '));
console.log(inorderIterative(root).join(' '));
```

If you need post-order iteratively in an interview, the pragmatic trick is: do a modified pre-order (node → right → left) and reverse the output. Mention it; don't burn ten minutes deriving the two-stack version.

> [!TIP]
> When recursion needs extra per-node data (depth, path sum, bounds), push **tuples** onto the explicit stack: `stack.push([node, depth])`. This is how you convert any "pass info down" recursion.

## Breadth-first traversal: level order with a queue

BFS visits nodes level by level using a **FIFO queue**. The classic trick for knowing where a level ends: **snapshot the queue length** at the start of each level.

```ts run
class TreeNode {
  constructor(public val: number, public left: TreeNode | null = null, public right: TreeNode | null = null) {}
}
const root = new TreeNode(3, new TreeNode(9), new TreeNode(20, new TreeNode(15), new TreeNode(7)));

function levels(root: TreeNode | null): number[][] {
  const result: number[][] = [];
  let queue: TreeNode[] = root ? [root] : [];
  while (queue.length) {
    result.push(queue.map((n) => n.val));
    const next: TreeNode[] = [];
    for (const n of queue) {
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    queue = next; // swapping arrays per level avoids O(n) Array.shift()
  }
  return result;
}
console.log(JSON.stringify(levels(root))); // [[3],[9,20],[15,7]]
```

> [!WARNING]
> `Array.prototype.shift()` is O(n) in the worst case because it re-indexes the array. In a BFS over a big graph, `queue.shift()` in a loop can turn O(n) into O(n²). Use a **head index** (`queue[head++]`), swap per-level arrays as above, or a small linked-list queue. Mentioning this unprompted is a strong JS-specific signal.

### DFS or BFS on a tree?

| Need | Choose | Why |
|---|---|---|
| Something per level (averages, right-side view, zigzag) | BFS | Levels fall out naturally |
| **Shallowest** node matching a condition / min depth | BFS | First hit is the closest; stop early |
| Aggregate over subtrees (height, sums, balanced?) | DFS post-order | Children's answers first |
| Root-to-leaf paths, passing constraints down | DFS pre-order | Carry state in parameters |
| Very deep, narrow tree | BFS or iterative DFS | Recursion depth = height |
| Very wide, shallow tree | DFS | BFS queue holds a whole level |

Space: DFS uses O(h), BFS uses O(w) (maximum width). For a perfect binary tree the last level is ~n/2 nodes, so BFS uses O(n) while DFS uses O(log n).

## Common tree patterns

Most tree questions are one of these shapes. Recognise the shape, then fill in the blanks.

### 1. Return a value up (post-order): height, size, diameter

```ts
function height(node: TreeNode | null): number {
  if (!node) return 0;
  return 1 + Math.max(height(node.left), height(node.right));
}
```

**Diameter** (longest path between any two nodes) is the classic upgrade: at each node, the longest path *through* it is `height(left) + height(right)`; track the global maximum while returning the height. "Return one thing, track another in an outer variable" is a pattern worth naming.

### 2. Pass a value down (pre-order): path sums

"Is there a root-to-leaf path summing to `target`?" — subtract as you go down, check at leaves:

```ts run
class TreeNode {
  constructor(public val: number, public left: TreeNode | null = null, public right: TreeNode | null = null) {}
}
function hasPathSum(node: TreeNode | null, remaining: number): boolean {
  if (!node) return false;
  remaining -= node.val;
  if (!node.left && !node.right) return remaining === 0; // only check at LEAVES
  return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
}
//      5
//     / \
//    4   8
//   /   / \
//  11  13  4
const t = new TreeNode(5, new TreeNode(4, new TreeNode(11)), new TreeNode(8, new TreeNode(13), new TreeNode(4)));
console.log(hasPathSum(t, 20), hasPathSum(t, 26), hasPathSum(t, 9)); // true true false
```

### 3. Validate a BST: pass **bounds** down

The trap: checking only `left.val < node.val < right.val` at each node. That accepts this tree:

```text
      5
     / \
    1   6
       / \
      3   7      ← 3 is in 5's RIGHT subtree, so it must be > 5
```

Every node is fine compared with its parent, but it is not a BST. The fix is to pass down the **range** each node must fall into: going left tightens the upper bound, going right tightens the lower bound.

```ts run
class TreeNode {
  constructor(public val: number, public left: TreeNode | null = null, public right: TreeNode | null = null) {}
}
function isValidBST(node: TreeNode | null, low = -Infinity, high = Infinity): boolean {
  if (!node) return true;
  if (node.val <= low || node.val >= high) return false;
  return isValidBST(node.left, low, node.val) && isValidBST(node.right, node.val, high);
}

const tricky = new TreeNode(5, new TreeNode(1), new TreeNode(6, new TreeNode(3), new TreeNode(7)));
const good = new TreeNode(5, new TreeNode(1), new TreeNode(7, new TreeNode(6), new TreeNode(8)));
console.log(isValidBST(tricky), isValidBST(good)); // false true
```

The alternative is an in-order traversal that checks each value is strictly greater than the previous one — equally O(n), and a nice way to show you know in-order = sorted for a BST.

{{quiz:dsa2-bst-trap}}

### 4. Lowest common ancestor (LCA)

"Given two nodes p and q, find their lowest common ancestor."

- **In a BST**, use the ordering: if both values are smaller than the node, go left; if both are larger, go right; otherwise this node is where they split — it's the LCA. O(h).
- **In a general binary tree**, use post-order: return the node if it is p or q; recurse into both children; if *both* sides return something, this node is the LCA; otherwise pass up whichever side found something. O(n).

```ts
function lca(node: TreeNode | null, p: TreeNode, q: TreeNode): TreeNode | null {
  if (!node || node === p || node === q) return node;
  const left = lca(node.left, p, q);
  const right = lca(node.right, p, q);
  if (left && right) return node; // p and q are on different sides
  return left ?? right;
}
```

Frontend twist: "find the nearest common ancestor of two DOM elements" — with `parentElement` pointers you don't need recursion at all: collect one node's ancestors in a `Set`, then walk up from the other until you hit one. (The DOM has `Node.prototype.contains` and `compareDocumentPosition` for related checks.)

### 5. Build/transform: serialise, invert, clone

Return a new node built from the recursive results: `invert(node) = new TreeNode(node.val, invert(node.right), invert(node.left))`. Same shape as cloning a JSON value or converting a DOM tree to a virtual-DOM object, which you did on the browser/DOM day.

## Trees you already know (frontend connections)

| Frontend structure | Tree view | Typical question |
|---|---|---|
| **DOM** | `children` / `parentElement` pointers, n-ary | `getElementsByClassName` from scratch (you built `findAllByClassName` on the DOM day — a pre-order DFS) |
| **JSON** | Objects/arrays are internal nodes, primitives are leaves | Deep clone, deep equal, `get(obj, path)`, max nesting depth |
| **React tree** | Components → children; reconciliation diffs two trees | Why keys matter, why React's diff is O(n) with heuristics, not the O(n³) general tree edit distance |
| **Nested comments / menus / file explorers** | n-ary tree with `children: T[]` | Flatten with depth for rendering, count descendants, expand/collapse |
| **ASTs** | Bundlers, Babel, ESLint walk them with visitors | "How does a codemod work?" |

The only difference between a binary tree and these is `left/right` versus a `children` array — the loop `for (const child of node.children)` replaces two recursive calls.

```ts run
type MenuItem = { label: string; children?: MenuItem[] };

// Flatten a nested menu for rendering with indentation — pre-order DFS carrying depth DOWN.
function flatten(items: MenuItem[], depth = 0, out: Array<{ label: string; depth: number }> = []) {
  for (const item of items) {
    out.push({ label: item.label, depth });
    if (item.children) flatten(item.children, depth + 1, out);
  }
  return out;
}

const menu: MenuItem[] = [
  { label: 'File', children: [{ label: 'New' }, { label: 'Export', children: [{ label: 'PDF' }, { label: 'PNG' }] }] },
  { label: 'Edit' },
];
for (const row of flatten(menu)) console.log('  '.repeat(row.depth) + row.label);
```

> [!INTERVIEW] Connect it to your experience
> "Tree recursion is something I use constantly in frontend work — rendering nested comments, walking a JSON schema to build a form, or flattening a menu for virtualised rendering. The pattern is always the same: a base case for a leaf or empty node, and a combination step that trusts the recursive calls on children. When depth is unbounded — user-generated nesting, say — I switch to an explicit stack so a pathological input can't blow the call stack."

## Key takeaways

- Every recursive function = **base case** + **recursive case**; write the base case first, then *trust* the recursive call.
- Recursion costs **O(depth)** stack space. JS engines cap the stack (assume fewer than ~10k frames) and V8 has no tail-call optimisation — use an explicit stack or BFS for deep inputs.
- **Pre-order** passes info down, **in-order** gives sorted BST values, **post-order** combines children's answers.
- **BFS** with a queue and a level-size snapshot gives level order; avoid `shift()` on large queues.
- BST validation needs **bounds**, not just parent/child comparisons.
- The DOM, JSON, component trees and comment threads are trees: same recursion, `children` instead of `left/right`.
