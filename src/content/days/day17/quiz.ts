import type { QuizQuestion } from '../../types';

export const treeChecks: QuizQuestion[] = [
  {
    id: 'dsa2-which-dfs-order',
    prompt: 'You must compute the **total size of every folder** in a file-tree (a folder\'s size is the sum of everything inside it). Which DFS order fits naturally?',
    choices: ['Pre-order (node before children)', 'In-order (left, node, right)', 'Post-order (children before node)', 'Level-order (BFS)'],
    answer: 2,
    explanation:
      'A folder\'s size depends on its children\'s sizes, so the children must be finished **first** — post-order: recurse into every child, then combine at the node. Pre-order is for passing information *down* (e.g. the current path). In-order only has meaning for binary trees (sorted output for a BST) — a folder has many children. BFS visits a folder before its contents, the opposite of what you need.',
  },
  {
    id: 'dsa2-bst-trap',
    prompt: 'What does this (flawed) BST check return for the tree `5 → (1, 6 → (3, 7))`, and is that correct?',
    code: `class TreeNode {
  constructor(public val: number, public left: TreeNode | null = null, public right: TreeNode | null = null) {}
}
function looksLikeBST(n: TreeNode | null): boolean {
  if (!n) return true;
  if (n.left && n.left.val >= n.val) return false;
  if (n.right && n.right.val <= n.val) return false;
  return looksLikeBST(n.left) && looksLikeBST(n.right);
}
const root = new TreeNode(5, new TreeNode(1), new TreeNode(6, new TreeNode(3), new TreeNode(7)));
console.log(looksLikeBST(root));`,
    codeLang: 'ts',
    runnable: true,
    choices: [
      '`true` — and correct, every parent/child pair is ordered',
      '`true` — but wrong: 3 sits in 5\'s right subtree, so it must be greater than 5',
      '`false` — it detects the problem at node 6',
      'It throws, because 3 < 6 on the left side',
    ],
    answer: 1,
    explanation:
      'Each node is only compared with its **direct** children: 1 < 5, 6 > 5, 3 < 6, 7 > 6 — all fine, so it returns `true`. But the BST property is about **whole subtrees**: everything right of 5 must be > 5, and 3 is not. Fix: pass `(low, high)` bounds down the recursion (going left sets `high = node.val`, going right sets `low = node.val`), or do an in-order traversal and check the values strictly increase.',
  },
];

export const graphChecks: QuizQuestion[] = [
  {
    id: 'dsa2-bfs-vs-dfs-shortest',
    prompt: 'You need the **fewest clicks** to get from one page of a site to another (pages are nodes, links are edges, every click costs the same). Which algorithm, and why?',
    choices: [
      'DFS — it finds a path faster because it goes deep immediately',
      'BFS — it explores in order of distance, so the first time it reaches the target is a shortest path',
      'Dijkstra — shortest paths always need Dijkstra',
      'Topological sort — links define an order',
    ],
    answer: 1,
    explanation:
      'With equal edge weights, BFS expands everything 1 click away, then 2, then 3…, so the first arrival at the target uses the fewest edges, in O(V + E). DFS finds *a* path, not the shortest one, unless it explores every path (exponential). Dijkstra is correct but unnecessary — it is BFS generalised to weighted edges, with an extra log factor from the heap. Topological sort needs a DAG, and websites have cycles.',
  },
  {
    id: 'dsa2-heap-topk',
    prompt: 'You process a stream of 10 million scores and must show the **top 10** at any time. What is the best structure, and its total cost?',
    choices: [
      'Keep all scores and sort at the end: O(n log n) time, O(n) space',
      'A max-heap of all scores: O(n log n) time, O(n) space',
      'A min-heap capped at 10 items: O(n log 10) ≈ O(n) time, O(10) space',
      'A sorted array of 10 with binary search insertion: O(n²)',
    ],
    answer: 2,
    explanation:
      'Keep a **min**-heap of the best 10 so far. Its root is the weakest of the top 10 — exactly the one to evict when a better score arrives. Each push/pop is O(log k) with k = 10, so the total is O(n log k) time and O(k) space, and it works on a stream. Sorting everything needs all the data in memory. A max-heap of everything also stores n items. A sorted array of 10 is actually fine too (O(n · k) with tiny k) — but it is not O(n²); the heap is the answer that scales when k grows.',
  },
];

export const dpChecks: QuizQuestion[] = [
  {
    id: 'dsa2-backtracking-copy',
    prompt: 'What does this print?',
    code: `const result: number[][] = [];
const path: number[] = [];
function backtrack(start: number, nums: number[]) {
  result.push(path); // note: no copy
  for (let i = start; i < nums.length; i++) {
    path.push(nums[i]);
    backtrack(i + 1, nums);
    path.pop();
  }
}
backtrack(0, [1, 2]);
console.log(JSON.stringify(result));`,
    codeLang: 'ts',
    runnable: true,
    choices: ['[[],[1],[1,2],[2]]', '[[],[],[],[]]', '[[1,2],[1,2],[1,2],[1,2]]', '[[]]'],
    answer: 1,
    explanation:
      '`result.push(path)` stores **the same array reference** four times. Every `push` is undone by a `pop`, so when the search ends `path` is empty — and all four entries point at it. You get the right *number* of results with the wrong contents. Always record a snapshot: `result.push([...path])`.',
  },
  {
    id: 'dsa2-house-robber-recurrence',
    prompt: 'House robber: you can\'t rob two adjacent houses. With `dp[i]` = the most money from houses `0..i`, which recurrence is correct?',
    choices: [
      '`dp[i] = dp[i - 1] + nums[i]`',
      '`dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])`',
      '`dp[i] = max(dp[i - 2], dp[i - 1] + nums[i])`',
      '`dp[i] = dp[i - 2] + nums[i]`',
    ],
    answer: 1,
    explanation:
      'Ask "what was the last choice?" Either you **skip** house i (best is `dp[i - 1]`) or you **rob** it, which forbids house i − 1, so you add `nums[i]` to `dp[i - 2]`. Take the max. Option 1 robs adjacent houses. Option 3 adds `nums[i]` to `dp[i - 1]`, which may already include house i − 1. Option 4 forces robbing every other house, which loses on `[2, 1, 1, 2]` (answer 4: both ends).',
  },
];

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'dsa2-naive-fib-complexity',
    prompt: 'What is the time complexity of this function, and roughly how many calls does `fib(30)` make?',
    code: `let calls = 0;
function fib(n: number): number {
  calls++;
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}
fib(30);
console.log(calls);`,
    codeLang: 'ts',
    runnable: true,
    choices: ['O(n) — about 30 calls', 'O(n²) — about 900 calls', 'Exponential, O(2ⁿ) — about 2.7 million calls', 'O(n log n) — about 150 calls'],
    answer: 2,
    explanation:
      'Each call branches into two, and the subproblems overlap massively (`fib(28)` is computed twice, `fib(27)` three times…). The exact count is `2·fib(n+1) − 1` ≈ 2.69 million for n = 30 — growth of φⁿ ≈ 1.618ⁿ, usually stated as O(2ⁿ). Memoizing reduces it to n distinct states, O(n). The linear answers describe the memoized version, not this one.',
  },
  {
    id: 'dsa2-recursion-space',
    prompt: 'A recursive DFS visits every node of a **balanced** binary tree with n nodes. What are its time and extra space complexities?',
    choices: ['O(n) time, O(1) space', 'O(n) time, O(log n) space', 'O(log n) time, O(log n) space', 'O(n) time, O(n) space always'],
    answer: 1,
    explanation:
      'Every node is visited once → O(n) time. The call stack holds at most one frame per level of the current path → O(h), and a balanced tree has h ≈ log₂ n. "O(1) space" forgets the call stack. "O(n) space always" is the *worst case* for a degenerate tree (a linked list), not a balanced one — say both when asked.',
  },
  {
    id: 'dsa2-bfs-order-output',
    prompt: 'What does this BFS print?',
    code: `const adj: Record<string, string[]> = {
  A: ['B', 'C'],
  B: ['D'],
  C: ['D', 'E'],
  D: ['F'],
  E: [],
  F: [],
};
const seen = new Set(['A']);
const queue = ['A'];
const order: string[] = [];
for (let head = 0; head < queue.length; head++) {
  const node = queue[head];
  order.push(node);
  for (const next of adj[node]) {
    if (!seen.has(next)) { seen.add(next); queue.push(next); }
  }
}
console.log(order.join(' '));`,
    codeLang: 'ts',
    runnable: true,
    choices: ['A B D F C E', 'A B C D E F', 'A C E D F B', 'A B C D D E F'],
    answer: 1,
    explanation:
      'BFS visits by distance from A: A (0), then B and C (1), then D and E (2), then F (3). D is reachable from both B and C, but it is marked on enqueue, so it appears once. `A B D F C E` is a DFS (pre-order) order. The version with two Ds is what happens without a visited set.',
  },
  {
    id: 'dsa2-pattern-knight',
    prompt: 'Which pattern fits: *"Return the minimum number of moves a chess knight needs to reach square (x, y) from (0, 0)"*?',
    choices: ['Backtracking over all move sequences', 'BFS on an implicit graph of squares', 'Dynamic programming over x and y', 'Greedy: always move closer to the target'],
    answer: 1,
    explanation:
      'Squares are nodes, the 8 knight moves are edges, every move costs 1, and you want the **fewest** moves → BFS. Backtracking explores every sequence (exponential) when only the shortest matters. A DP over (x, y) doesn\'t work directly because knight moves go "backwards" too, so there\'s no natural fill order. Greedy fails near the target — sometimes you have to move away to land on it.',
  },
  {
    id: 'dsa2-fill-shared-array',
    prompt: 'What does this print?',
    code: `const adj: number[][] = new Array(3).fill([]);
adj[0].push(1);
console.log(JSON.stringify(adj));`,
    codeLang: 'ts',
    runnable: true,
    choices: ['[[1],[],[]]', '[[1],[1],[1]]', '[[],[],[]]', 'TypeError: cannot push to a frozen array'],
    answer: 1,
    explanation:
      '`fill([])` evaluates `[]` **once** and puts that same array object in every slot, so pushing to `adj[0]` shows up everywhere. Build adjacency lists with `Array.from({ length: n }, () => [])`, which calls the factory per slot.',
  },
  {
    id: 'dsa2-directed-cycle-visited',
    prompt: 'For the **directed** graph `app → ui, app → utils, ui → utils`, a DFS reports "cycle" whenever it meets an already-visited node. What happens?',
    choices: [
      'Correctly reports no cycle',
      'Falsely reports a cycle, because `utils` is reached twice',
      'Correctly reports a cycle between app and utils',
      'Loops forever',
    ],
    answer: 1,
    explanation:
      'This is a **diamond**, not a cycle: `utils` is reachable by two paths. A plain visited set can\'t tell "seen on another branch" from "on my current path". Directed cycle detection needs three states — unvisited, **visiting** (on the current DFS path) and done — and only a visiting node indicates a back edge. (For **undirected** graphs, the rule is "visited and not my parent".)',
  },
  {
    id: 'dsa2-stairs-three-steps',
    prompt: 'You can climb **1, 2 or 3** steps at a time. Which recurrence gives the number of ways `w(n)` to reach step n (with `w(0) = 1`, and `w` of a negative number = 0)?',
    choices: ['`w(n) = w(n − 1) + w(n − 2)`', '`w(n) = w(n − 1) + w(n − 2) + w(n − 3)`', '`w(n) = 3 · w(n − 1)`', '`w(n) = w(n − 3) + 3`'],
    answer: 1,
    explanation:
      'Ask "what was the last move?" — a 1-step from n − 1, a 2-step from n − 2, or a 3-step from n − 3. The ways are disjoint, so you add them: `w(n) = w(n−1) + w(n−2) + w(n−3)`. The two-term version is the 1-or-2 step problem. `3 · w(n − 1)` counts sequences of n moves, not ways to land exactly on step n.',
  },
  {
    id: 'dsa2-permutation-complexity',
    prompt: 'What is the time complexity of generating all permutations of n distinct items (each stored as a new array)?',
    choices: ['O(2ⁿ)', 'O(n²)', 'O(n · n!)', 'O(n!) / n'],
    answer: 2,
    explanation:
      'There are n! permutations, and copying each one into the result costs O(n), so O(n · n!). O(2ⁿ) is the number of **subsets** (n · 2ⁿ with copying). The output size alone rules out anything polynomial — no algorithm can list n! items faster than n!.',
  },
  {
    id: 'dsa2-memo-vs-tab-stack',
    prompt: 'Your top-down memoized `coinChange` works for small amounts but throws `RangeError: Maximum call stack size exceeded` for `coins = [1]`, `amount = 100000`. Best fix?',
    choices: [
      'Use a `Map` instead of an object for the memo',
      'Convert it to bottom-up tabulation (a loop filling `dp[0..amount]`)',
      'Wrap the recursive call in `try/catch` and retry',
      'Make the function tail-recursive so the engine reuses the frame',
    ],
    answer: 1,
    explanation:
      'With coin 1, the recursion goes `best(100000) → best(99999) → …`: 100,000 frames deep, beyond JS engine limits. Tabulation computes the same states in a loop with no recursion. The memo\'s data structure doesn\'t affect depth. Catching the error doesn\'t make the answer computable. V8 does not implement tail-call optimisation (only Safari\'s engine does), and this recursion isn\'t in tail position anyway (it takes a `min` after the call).',
  },
  {
    id: 'dsa2-greedy-coins',
    prompt: 'Why is "always take the largest coin that fits" not a valid solution to minimum coin change in general?',
    choices: [
      'It is valid; it only fails when amount is 0',
      'For coins [1, 3, 4] and amount 6 it returns 3 coins (4+1+1), but 2 coins (3+3) is optimal',
      'It can\'t return −1 for impossible amounts',
      'It is O(n²)',
    ],
    answer: 1,
    explanation:
      'A single counterexample kills a greedy algorithm, and `[1, 3, 4] → 6` is the classic one. Greedy is correct for "canonical" coin systems like real currencies, which is why it feels right. The DP considers every possible last coin, so it can\'t be fooled. (Greedy can also wrongly fail on reachable amounts — e.g. coins [3, 5], amount 9: take 5, then stuck at 4, though 3+3+3 works.)',
  },
  {
    id: 'dsa2-constraints-cue',
    prompt: 'A problem says `1 ≤ nums.length ≤ 15` and asks for "every valid arrangement". What does the constraint tell you?',
    choices: [
      'You must find an O(n) solution',
      'An exponential solution such as backtracking (≈ 2¹⁵ or 15! with pruning) is intended',
      'You need binary search',
      'Nothing — constraints are only for input validation',
    ],
    answer: 1,
    explanation:
      'Constraints are a hint about the intended complexity. n ≤ ~20 means exponential work is acceptable (2²⁰ ≈ 1 million), and "every valid arrangement" asks for an exponential-sized output anyway → backtracking with pruning. n up to 10⁵ would point at O(n) or O(n log n); n ≤ 10⁴ often allows O(n²) or a 2-D DP.',
  },
];
