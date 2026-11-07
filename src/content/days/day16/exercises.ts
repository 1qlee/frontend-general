import type { Exercise } from '../../types';

import maxDepthStarter from './exercises/max-depth/starter.ts?raw';
import maxDepthSolution from './exercises/max-depth/solution.ts?raw';
import maxDepthTests from './exercises/max-depth/tests.ts?raw';
import levelOrderStarter from './exercises/level-order/starter.ts?raw';
import levelOrderSolution from './exercises/level-order/solution.ts?raw';
import levelOrderTests from './exercises/level-order/tests.ts?raw';
import islandsStarter from './exercises/number-of-islands/starter.ts?raw';
import islandsSolution from './exercises/number-of-islands/solution.ts?raw';
import islandsTests from './exercises/number-of-islands/tests.ts?raw';
import shortestPathStarter from './exercises/shortest-path/starter.ts?raw';
import shortestPathSolution from './exercises/shortest-path/solution.ts?raw';
import shortestPathTests from './exercises/shortest-path/tests.ts?raw';
import topKStarter from './exercises/top-k-frequent/starter.ts?raw';
import topKSolution from './exercises/top-k-frequent/solution.ts?raw';
import topKTests from './exercises/top-k-frequent/tests.ts?raw';
import subsetsStarter from './exercises/subsets/starter.ts?raw';
import subsetsSolution from './exercises/subsets/solution.ts?raw';
import subsetsTests from './exercises/subsets/tests.ts?raw';
import coinChangeStarter from './exercises/coin-change/starter.ts?raw';
import coinChangeSolution from './exercises/coin-change/solution.ts?raw';
import coinChangeTests from './exercises/coin-change/tests.ts?raw';

const TREE_HELPERS = `The starter **provides** a \`TreeNode\` class plus \`fromLevelOrder(values)\` / \`toLevelOrder(root)\` (LeetCode's array format, with \`null\` for a missing child) and \`chain(n)\` (a degenerate tree). The tests use them. You only write the algorithm at the bottom of the file.`;

export const maxDepth: Exercise = {
  id: 'dsa-max-depth',
  title: 'Maximum depth of a binary tree',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 6,
  tags: ['dsa', 'trees', 'dfs', 'recursion'],
  prompt: `Return the **maximum depth** of a binary tree: the number of *nodes* on the longest path from the root down to a leaf.

${TREE_HELPERS}

\`\`\`ts
maxDepth(fromLevelOrder([3, 9, 20, null, null, 15, 7])); // 3
//     3
//    / \\
//   9  20
//      / \\
//     15  7
maxDepth(null);               // 0
maxDepth(new TreeNode(1));    // 1
\`\`\`

**Constraints:** up to ~10⁴ nodes; values are irrelevant. The tests include a 2,000-level "linked list" tree.

**What the interviewer is looking for:** a clear base case (\`null → 0\`), the "trust the recursion" step stated out loud (*"if I know the depth of each subtree, mine is 1 + the larger"*), correct complexity — and, for bonus points, knowing that recursion depth equals tree height, so a degenerate tree can overflow the call stack.

**Expected complexity:** O(n) time, O(h) space (h = height: log n if balanced, n if degenerate).`,
  starter: maxDepthStarter,
  solution: maxDepthSolution,
  tests: maxDepthTests,
  hints: [
    'What is the depth of an empty tree? That is your base case.',
    'If a function already gave you the depth of the left and right subtrees, how would you combine them?',
    '`return root === null ? 0 : 1 + Math.max(maxDepth(root.left), maxDepth(root.right));`',
  ],
  explanation: `**Brute force?** There isn't a slower sensible approach here — any correct solution must look at every node, so O(n) is optimal. The interesting decision is *recursive vs iterative*.

**Pattern:** post-order DFS — compute the answer for the children, then combine at the parent. "Return a value up the tree" is the most common tree recursion shape (height, size, sum, balanced?, diameter).

**Walk-through** on \`[3, 9, 20, null, null, 15, 7]\`: \`depth(9) = 1 + max(0, 0) = 1\`, \`depth(15) = depth(7) = 1\`, \`depth(20) = 1 + max(1, 1) = 2\`, \`depth(3) = 1 + max(1, 2) = 3\`.

**Complexity:** O(n) time (each node visited once). O(h) space for the call stack: O(log n) balanced, O(n) for a chain.

**Edge cases:** \`null\` root, single node, a lopsided tree where the deepest leaf is in the middle (don't just follow the leftmost path).

**Iterative version (BFS by level):**

\`\`\`ts
let depth = 0, level = [root];
while (level.length) { depth++; level = level.flatMap((n) => [n.left, n.right].filter(Boolean)); }
\`\`\`

**Follow-ups:**
- *"What if the tree is 1,000,000 levels deep?"* → the recursive version throws \`RangeError: Maximum call stack size exceeded\` (JS engines allow somewhere from a few thousand to tens of thousands of frames; V8 has no tail-call optimisation). Use BFS or an explicit stack of \`[node, depth]\` pairs.
- *"Minimum depth?"* → careful: a node with one child is not a leaf, so \`1 + min(left, right)\` is wrong when one side is \`null\`. BFS and stop at the first leaf is cleanest.
- *"Is the tree balanced?"* → same post-order recursion, returning \`-1\` as a sentinel for "unbalanced" so it stays O(n).
- *Frontend version:* "max nesting depth of a DOM subtree / a JSON object / a comment thread" — same code over \`children\`.`,
};

export const levelOrder: Exercise = {
  id: 'dsa-level-order',
  title: 'Binary tree level-order traversal',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 9,
  tags: ['dsa', 'trees', 'bfs', 'queue'],
  prompt: `Return the node values **level by level**, left to right, as \`number[][]\`.

${TREE_HELPERS}

\`\`\`ts
levelOrder(fromLevelOrder([3, 9, 20, null, null, 15, 7])); // [[3], [9, 20], [15, 7]]
levelOrder(fromLevelOrder([1, 2, 3, null, 4, 5]));          // [[1], [2, 3], [4, 5]]
levelOrder(null);                                           // []
\`\`\`

**Constraints:** up to ~10⁴ nodes; values may repeat or be negative.

**What the interviewer is looking for:** recognising "level by level" as **BFS with a queue**, the *snapshot-the-queue-length* trick to know where a level ends, an O(1) dequeue (not \`shift()\` in a hot loop on big inputs — or at least mentioning it), and correct handling of the empty tree.

**Expected complexity:** O(n) time, O(w) extra space where w is the widest level (up to n/2).`,
  starter: levelOrderStarter,
  solution: levelOrderSolution,
  tests: levelOrderTests,
  hints: [
    '"Level by level" = breadth-first. Which data structure gives you first-in, first-out?',
    'At the start of each level, everything in the queue belongs to that level. Record `queue.length` before you start dequeuing.',
    'Loop exactly `levelSize` times: dequeue, push the value into `level`, enqueue non-null children. Then push `level` into the result.',
  ],
  explanation: `**Brute force:** compute each node's depth with a DFS, then group by depth (a \`Map<number, number[]>\` or \`result[depth] ??= []\`). That is actually *also* O(n) and a perfectly valid answer — say so! It just uses recursion (stack depth = height) and is less direct.

**Bottleneck / why BFS:** BFS naturally visits nodes in level order, so no grouping step is needed — you only need to know where one level ends and the next begins.

**Pattern:** BFS with a queue + **level-size snapshot**. When a level starts, the queue contains exactly that level's nodes; their children are appended behind them.

**Walk-through** on \`[3, 9, 20, null, null, 15, 7]\`: queue \`[3]\` → size 1 → level \`[3]\`, queue \`[9, 20]\` → size 2 → level \`[9, 20]\`, queue \`[15, 7]\` → level \`[15, 7]\` → queue empty, done.

**Complexity:** O(n) time. O(w) queue space — for a perfect tree the last level is ~n/2 nodes.

**JS detail worth saying out loud:** \`Array.prototype.shift()\` is O(n) in the worst case because it re-indexes the array. The reference solution keeps a \`head\` index instead (the array is a queue that only grows). Alternatives: build a \`next\` array per level and swap, or a small ring-buffer/linked-list queue.

**Edge cases:** empty tree → \`[]\` (not \`[[]]\`), one branch ending early, children from *different* parents on the same level (left-to-right order must hold).

**Follow-ups:**
- *Zigzag order* → reverse every other level (or push to the front with a deque).
- *Right side view* → the last value of each level.
- *Average / max per level* → reduce each level.
- *Frontend version:* "render a sitemap or org chart row by row", "find the shallowest element matching a selector" — BFS finds the *closest* match first; DFS (like \`querySelector\`) finds the first in document order.`,
};

export const numIslands: Exercise = {
  id: 'dsa-number-of-islands',
  title: 'Number of islands (grid as a graph)',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['dsa', 'graphs', 'grid', 'dfs', 'bfs', 'connected components'],
  prompt: `Given a grid of \`'1'\` (land) and \`'0'\` (water), count the **islands**. An island is a group of land cells connected **horizontally or vertically** (not diagonally). Everything outside the grid is water.

\`\`\`ts
numIslands([
  ['1', '1', '0', '0', '0'],
  ['1', '1', '0', '0', '0'],
  ['0', '0', '1', '0', '0'],
  ['0', '0', '0', '1', '1'],
]); // 3
\`\`\`

**Constraints:** \`grid\` may be empty; rows all have the same length; up to ~300 × 300.

**You must not mutate the input.** The classic LeetCode trick of overwriting visited land with \`'0'\` is fine *if the interviewer agrees* — but here, as in most real code, the caller still owns the grid. Keep your own visited set (the tests check the grid is unchanged).

**What the interviewer is looking for:** seeing the grid as an **implicit graph** (cells are nodes, 4 neighbours are edges), "count connected components = scan + flood fill", bounds checks, a visited structure, and a word about recursion depth on large all-land grids.

**Expected complexity:** O(rows × cols) time and space.`,
  starter: islandsStarter,
  solution: islandsSolution,
  tests: islandsTests,
  hints: [
    'Scan every cell. When you find unvisited land, you have found a NEW island — count it, then mark the whole island as visited so you never count it again.',
    '"Mark the whole island" is a DFS or BFS from that cell to its 4 neighbours (up, down, left, right), skipping out-of-bounds cells, water and visited cells.',
    'Keep visited as a `Set<string>` of `${r},${c}` or, faster, a flat `Uint8Array(rows * cols)` indexed by `r * cols + c`. Mark a cell visited when you push it, not when you pop it.',
  ],
  explanation: `**Brute force:** for each pair of land cells, ask "are they connected?" and union them — O((rc)²) or worse. Nobody does this, but naming it shows you know why the graph view matters.

**Pattern:** **connected components on an implicit graph.** Outer loop over all cells; each time you find unvisited land, increment the count and **flood-fill** (DFS or BFS) to mark the entire component. Each cell is visited a constant number of times.

**Walk-through** on the example: (0,0) is new land → count 1, flood marks (0,0),(0,1),(1,0),(1,1). Scan continues; (2,2) → count 2, flood marks just itself. (3,3) → count 3, flood marks (3,3),(3,4). Every other land cell is already visited.

**Complexity:** O(R·C) time — each cell is pushed at most once and checks 4 neighbours. O(R·C) space for \`visited\` plus the stack/queue.

**Recursive vs iterative:** the recursive version is shorter:

\`\`\`ts
const dfs = (r: number, c: number): void => {
  if (r < 0 || c < 0 || r >= R || c >= C || grid[r][c] !== '1' || seen[r * C + c]) return;
  seen[r * C + c] = 1;
  dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
};
\`\`\`

…but its depth can reach R·C on a snaking island (90,000 on a 300 × 300 grid), which can overflow the JS call stack. The reference solution uses an **explicit stack**, which is the safe production choice; mention the trade-off either way.

**Edge cases:** empty grid, all water, all land, single row/column, diagonal-only neighbours (separate islands), U-shaped islands (a naive "check only up and left" scan miscounts these).

**Follow-ups:**
- *"Max area of an island"* → return the size from each flood fill.
- *"Islands are added one at a time; report the count after each"* → **Union-Find** (disjoint set) with path compression.
- *"Count distinct island shapes"* → record the flood-fill path relative to its start.
- *Frontend version:* flood fill in a paint tool, "select all connected cells" in a spreadsheet, or minesweeper's reveal-empty-area.`,
};

export const shortestPath: Exercise = {
  id: 'dsa-shortest-path',
  title: 'Shortest path in an unweighted graph (BFS)',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['dsa', 'graphs', 'bfs', 'adjacency list', 'shortest path'],
  prompt: `An **undirected, unweighted** graph has nodes \`0..n-1\` and an edge list. Return the number of edges on the **shortest** path from \`start\` to \`target\`, \`0\` if they are the same node, or \`-1\` if \`target\` is unreachable.

\`\`\`ts
shortestPath(5, [[0, 1], [1, 2], [0, 3], [3, 4], [4, 2]], 0, 2); // 2  (0 → 1 → 2)
shortestPath(4, [[0, 1], [2, 3]], 0, 3);                          // -1 (disconnected)
shortestPath(1, [], 0, 0);                                        // 0
\`\`\`

**Constraints:** up to ~10⁵ nodes and edges. Edges may be duplicated, may be self-loops, and the graph may contain cycles. One test uses a 20,000-node path and must finish in under 300 ms.

**What the interviewer is looking for:** building an **adjacency list once** from the edge list, choosing **BFS** (not DFS) *because* every edge has the same weight, a visited set marked on enqueue, and early exit. Naming Dijkstra as the answer for weighted graphs is a bonus.

**Expected complexity:** O(V + E) time and space.`,
  starter: shortestPathStarter,
  solution: shortestPathSolution,
  tests: shortestPathTests,
  hints: [
    'Turn the edge list into `adj: number[][]` first. Undirected means each edge goes into both lists.',
    'BFS explores nodes in order of distance from the start: everything 1 edge away, then 2, then 3… The first time you reach the target is therefore the shortest path.',
    'Keep `dist = new Array(n).fill(-1)`; set `dist[start] = 0`; when you enqueue a neighbour with `dist === -1`, set `dist[next] = dist[node] + 1`. Use a head index instead of `shift()`.',
  ],
  explanation: `**Brute force:** DFS over every simple path and keep the minimum length — exponential in the worst case. A subtler slow version is BFS that finds each node's neighbours by **scanning the whole edge list** (\`edges.filter(...)\`) every time it dequeues: O(V·E), which takes over a second on the 20,000-node test.

**Bottleneck → pattern:** (1) neighbour lookup must be O(degree), so build an adjacency list once; (2) "fewest edges" in an *unweighted* graph is exactly what **BFS** computes, because it expands in rings of equal distance.

**Why not DFS?** DFS reaches the target by *some* path — in the "long way round" test it would find 0-1-2-3-4-5 (5 edges) before 0-6-5 (2 edges). To make DFS correct you'd have to explore every path.

**Walk-through** on the example: adj = \`0:[1,3] 1:[0,2] 2:[1,4] 3:[0,4] 4:[3,2]\`. Queue \`[0]\` (dist 0) → enqueue 1, 3 (dist 1) → from 1 enqueue 2 (dist 2) = target → return 2.

**Complexity:** O(V + E) time: each node is enqueued once and each adjacency list is scanned once. O(V + E) space for the adjacency list, \`dist\` and the queue.

**Edge cases:** \`start === target\` (0, even with no edges), disconnected target (-1), cycles, self-loops and duplicate edges (the visited check makes them harmless).

**Follow-ups:**
- *"Return the path itself"* → store \`parent[next] = node\` on enqueue, then walk back from the target.
- *"Edges have weights"* → Dijkstra with a min-heap (O((V + E) log V)); weights 0/1 → 0-1 BFS with a deque.
- *"Very large graph, start and target both known"* → bidirectional BFS roughly halves the explored radius.
- *"Directed graph?"* → push only \`adj[a].push(b)\`.
- *Frontend version:* "degrees of separation" in a social graph, the minimum number of route changes between two screens, or the shortest navigation path between two nodes in a component tree.`,
};

export const topKFrequent: Exercise = {
  id: 'dsa-top-k-frequent',
  title: 'Top-k frequent elements (bucket sort / heap)',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['dsa', 'hashing', 'heap', 'bucket sort', 'top-k'],
  prompt: `Return the \`k\` most frequent values in \`nums\`, **in any order**. The answer is guaranteed to be unique (no ties at the k-th place) and \`1 ≤ k ≤\` the number of distinct values.

\`\`\`ts
topKFrequent([1, 1, 1, 2, 2, 3], 2); // [1, 2] (or [2, 1])
topKFrequent([7], 1);                // [7]
\`\`\`

**Constraints:** up to 10⁵ values; values can be negative. Do not mutate \`nums\`. Aim for **better than O(n log n)**.

**What the interviewer is looking for:** a frequency \`Map\` first (hashing), then a *selection* step — and a comparison of the three options: sort all unique values (O(u log u)), a **size-k min-heap** (O(u log k)), or **bucket sort by frequency** (O(n)). Explaining *why* each is that cost matters more than which one you code.

**Expected complexity:** O(n) with buckets, or O(n log k) with a heap; O(n) space.`,
  starter: topKStarter,
  solution: topKSolution,
  tests: topKTests,
  hints: [
    'Step 1 is always the same: count occurrences in a `Map<number, number>`.',
    'Sorting the entries by count works (O(u log u)). To beat it, notice that a frequency is an integer between 1 and n.',
    'Make `buckets: number[][]` of length n + 1 where `buckets[f]` holds values seen exactly f times, then walk f from n down to 1, collecting values until you have k.',
  ],
  explanation: `**Brute force:** for every distinct value, count it by scanning the array (O(n·u)), then sort. The first fix is the frequency \`Map\` — O(n), one pass.

**Then the selection step — know all three:**

| Approach | Time | When to pick it |
|---|---|---|
| Sort entries by count | O(n + u log u) | Simplest to write; fine for UI-sized data. Say it first. |
| Min-heap of size k | O(n + u log k) | k ≪ u, or the data is a **stream** (you can't bucket an unbounded stream) |
| Bucket sort by frequency | O(n) | Counts are bounded by n — the classic "optimal" answer |

**Pattern:** hashing + **top-k selection**. The heap trick: keep a *min*-heap of the k best seen so far; when a new candidate beats the smallest (the heap's top), pop and push. The heap never grows beyond k, so each operation is O(log k).

\`\`\`ts
const heap = new MinHeap<[number, number]>((a, b) => a[1] - b[1]); // [value, count]
for (const entry of counts) {
  heap.push(entry);
  if (heap.size > k) heap.pop(); // drop the least frequent
}
\`\`\`

(JavaScript has no built-in heap — the lesson shows a 30-line \`MinHeap\`. In an interview, ask whether you may assume one exists.)

**Walk-through (buckets)** on \`[1,1,1,2,2,3], k = 2\`: counts \`{1:3, 2:2, 3:1}\` → \`buckets[3]=[1], buckets[2]=[2], buckets[1]=[3]\` → walk down from 6: collect 1, then 2 → done.

**Complexity:** O(n) time and space for buckets (n + 1 buckets, u values placed once).

**Edge cases:** k = number of distinct values, negative numbers, a single element, don't sort \`nums\` in place.

**Follow-ups:**
- *"Ties — return the smaller value first"* → sort within each bucket, or compare \`[count, -value]\` in the heap.
- *"It's a live stream of search queries"* → heap of size k over a running count map; for huge streams, approximate (Count-Min Sketch).
- *"Top k closest points / k largest numbers"* → same size-k heap idea, or Quickselect for average O(n).
- *Frontend version:* "most used emoji" picker, "top 5 tags" sidebar, trending searches in an autocomplete.`,
};

export const subsets: Exercise = {
  id: 'dsa-subsets',
  title: 'Subsets (backtracking)',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['dsa', 'backtracking', 'recursion'],
  prompt: `Given an array of **distinct** integers, return **all subsets** (the power set) without duplicates. Subsets may come back in any order, and values inside a subset may be in any order — the tests normalise before comparing.

\`\`\`ts
subsets([1, 2, 3]);
// [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]   (any order)
subsets([]); // [[]]  — the empty set has exactly one subset
\`\`\`

**Constraints:** \`0 ≤ nums.length ≤ 12\`. Do not mutate \`nums\`.

**What the interviewer is looking for:** the backtracking template — **choose → explore → unchoose** — with a \`start\` index so \`[1, 2]\` and \`[2, 1]\` aren't both generated, **copying** the path when recording it (the #1 bug), and the complexity argument: 2ⁿ subsets, each up to n long.

**Expected complexity:** O(n · 2ⁿ) time and output space; O(n) extra space for the recursion and path.`,
  starter: subsetsStarter,
  solution: subsetsSolution,
  tests: subsetsTests,
  hints: [
    'Think of a decision tree: for each element, either include it or skip it. Every path through the tree is a subset.',
    'Use a shared `path: number[]` and a recursive `backtrack(start)`. Record the current path, then for each `i` from `start` onward: push `nums[i]`, recurse with `i + 1`, pop.',
    'Record `[...path]`, not `path` — otherwise every entry in the result is the same array, which ends up empty after the last pop.',
  ],
  explanation: `**Brute force / alternative:** iterate the bitmasks \`0 .. 2ⁿ - 1\`; bit i set → include \`nums[i]\`. Same O(n · 2ⁿ) — the output itself is that big, so no algorithm can be faster. Another clean option is iterative doubling: start with \`[[]]\` and for each number add a copy of every existing subset with that number appended.

**Pattern:** **backtracking** — DFS over a decision tree with a single mutable \`path\`:

\`\`\`ts
function backtrack(start: number) {
  result.push([...path]);            // every node is an answer for subsets
  for (let i = start; i < nums.length; i++) {
    path.push(nums[i]);              // choose
    backtrack(i + 1);                // explore
    path.pop();                      // unchoose
  }
}
\`\`\`

**Why \`start\`?** It forces elements to be picked in index order, so each combination appears exactly once. For **permutations** order matters, so you loop over *all* indices and skip used ones with a \`used\` boolean array instead.

**Walk-through** on \`[1, 2, 3]\`: record \`[]\` → choose 1: record \`[1]\` → choose 2: record \`[1,2]\` → choose 3: record \`[1,2,3]\`, pop, pop → choose 3: \`[1,3]\` … → back at root, choose 2: \`[2]\`, \`[2,3]\` → choose 3: \`[3]\`. Eight subsets.

**Complexity:** 2ⁿ subsets × O(n) copy = O(n · 2ⁿ) time; recursion depth ≤ n.

**Edge cases:** empty input → \`[[]]\`; recording the path by reference (all results become \`[]\`); not mutating the input (don't sort it in place).

**Follow-ups:**
- *"Input has duplicates"* (Subsets II) → sort a copy first, and skip \`nums[i]\` when \`i > start && nums[i] === nums[i - 1]\`.
- *"Permutations"* → \`used[]\` array, loop over all i, record only when \`path.length === n\`; O(n · n!).
- *"Combination sum (reuse allowed, hit a target)"* → recurse with \`i\` instead of \`i + 1\`, and **prune** when the running sum exceeds the target (sort first so you can \`break\`).
- *Frontend version:* generating every combination of filters/feature flags for a test matrix, or all variant combinations (size × colour) for a product picker.`,
};

export const coinChange: Exercise = {
  id: 'dsa-coin-change',
  title: 'Coin change: minimum coins (DP)',
  runtime: 'logic',
  difficulty: 'stretch',
  estMinutes: 12,
  tags: ['dsa', 'dynamic programming', 'memoization'],
  prompt: `Given coin denominations (positive integers, unlimited supply of each) and an \`amount\`, return the **fewest coins** that add up to \`amount\`, or \`-1\` if it can't be made. \`amount = 0\` needs \`0\` coins.

\`\`\`ts
coinChange([1, 2, 5], 11); // 3   (5 + 5 + 1)
coinChange([2], 3);        // -1
coinChange([1, 3, 4], 6);  // 2   (3 + 3) — greedy "largest coin first" says 3 (4 + 1 + 1)
\`\`\`

**Constraints:** \`1 ≤ coins.length ≤ 12\`, \`0 ≤ amount ≤ 10⁴\`. One test (\`[1, 2, 5]\`, 35) must finish in under 300 ms — plain recursion without caching takes seconds there.

**What the interviewer is looking for:** rejecting greedy with a counterexample, then the DP recipe out loud — **state** (\`dp[a]\` = fewest coins for amount a), **transition** (\`min over coins of dp[a - c] + 1\`), **base case** (\`dp[0] = 0\`), **answer** (\`dp[amount]\`, or -1 if still Infinity) — and the complexity O(amount × coins).

**Expected complexity:** O(amount · coins) time, O(amount) space.`,
  starter: coinChangeStarter,
  solution: coinChangeSolution,
  tests: coinChangeTests,
  hints: [
    'Greedy fails on `[1, 3, 4]`, 6. Instead ask: "if the LAST coin I use is c, what is left to solve?"',
    'That gives a recurrence: `best(a) = 1 + min(best(a - c))` over coins c ≤ a, with `best(0) = 0`. The same sub-amounts are solved again and again — cache them (memo) or fill a table.',
    'Bottom-up: `dp = new Array(amount + 1).fill(Infinity); dp[0] = 0;` then for a from 1 to amount, for each coin c ≤ a, `dp[a] = Math.min(dp[a], dp[a - c] + 1)`. Return `dp[amount] === Infinity ? -1 : dp[amount]`.',
  ],
  explanation: `**Brute force:** try every combination recursively — \`best(a) = 1 + min over c of best(a - c)\`. Correct, but exponential: with \`[1, 2, 5]\` the call count grows about 1.7× per extra unit of amount, so amount 35 makes tens of millions of calls.

**Bottleneck:** **overlapping subproblems** — \`best(30)\` is reached via 5, via 2+2+1, via 1+1+1+2… and recomputed every time. And the problem has **optimal substructure**: the best way to make \`a\` is one coin plus the best way to make the remainder. Those two properties = dynamic programming.

**Pattern:** DP. Two equivalent implementations:

\`\`\`ts
// Top-down: the brute force + a cache (memoization)
const memo = new Map<number, number>();
function best(a: number): number {
  if (a === 0) return 0;
  if (a < 0) return Infinity;
  if (memo.has(a)) return memo.get(a)!;
  let res = Infinity;
  for (const c of coins) res = Math.min(res, best(a - c) + 1);
  memo.set(a, res);
  return res;
}
\`\`\`

Bottom-up (the reference solution) fills \`dp[0..amount]\` in increasing order so every \`dp[a - c]\` is ready when needed — no recursion, so no stack-depth risk at amount 10⁴ with a 1-coin.

**Walk-through** for \`[1, 2, 5]\`: \`dp[0]=0, dp[1]=1, dp[2]=1, dp[3]=2, dp[4]=2, dp[5]=1, dp[6]=2, … dp[10]=2, dp[11]=min(dp[10], dp[9], dp[6]) + 1 = 3\`.

**Complexity:** O(amount · coins) time, O(amount) space.

**Edge cases:** amount 0 → 0; impossible amounts → -1 (keep \`Infinity\` as "impossible" and convert at the end — don't let \`-1\` leak into a \`min\`); coins larger than the amount; unsorted coins.

**Follow-ups:**
- *"Count the number of ways"* (Coin Change II) → \`ways[a] += ways[a - c]\`, with the **coin loop outside** so combinations aren't counted once per ordering.
- *"Return which coins"* → store the coin that achieved each \`dp[a]\` and walk back.
- *"Why not BFS?"* → you can! Amounts are nodes, coins are edges, fewest coins = shortest path. Same O(amount · coins). Great answer to show pattern fluency.
- *"When is greedy correct?"* → for "canonical" systems like real currencies (1, 2, 5, 10…), but not in general.`,
};
