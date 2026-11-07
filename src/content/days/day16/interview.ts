import type { Flashcard, InterviewQuestion } from '../../types';

export const flashcards: Flashcard[] = [
  { id: 'dsa2-recursion-parts', front: 'The two parts of every correct recursive function?', back: '**Base case**: the smallest input you answer directly (e.g. `null → 0`). **Recursive case**: assume the calls on smaller inputs are correct ("trust the recursion") and combine their results.' },
  { id: 'dsa2-recursion-space', front: 'Space complexity of recursion over a tree?', back: 'O(h) for the call stack, where h is the height: O(log n) balanced, O(n) degenerate. Recursion is never "free" space.' },
  { id: 'dsa2-js-stack-limit', front: 'What happens with very deep recursion in JavaScript, and the fix?', back: '`RangeError: Maximum call stack size exceeded` (often fewer than 10k frames; engine-dependent). V8 has no tail-call optimisation. Fix: an explicit stack (iterative DFS) or BFS.' },
  { id: 'dsa2-dfs-orders', front: 'Pre-, in- and post-order: when to use each?', back: '**Pre** (node first): pass info down — paths, depth, bounds, serialising. **In** (left, node, right): sorted order of a BST. **Post** (children first): combine children\'s answers — height, sizes, deleting.' },
  { id: 'dsa2-iterative-preorder', front: 'Iterative pre-order DFS: the one detail people get wrong?', back: 'Pop a node, record it, then push **right before left** so the left child is popped first.' },
  { id: 'dsa2-level-snapshot', front: 'How does level-order BFS know where a level ends?', back: 'Snapshot `queue.length` at the start of the level and dequeue exactly that many nodes (or build a fresh `next` array per level).' },
  { id: 'dsa2-shift-cost', front: 'Why avoid `queue.shift()` in a big BFS?', back: '`shift()` re-indexes the array: O(n) worst case, so BFS can degrade to O(n²). Use a head index (`queue[head++]`) or swap per-level arrays.' },
  { id: 'dsa2-validate-bst', front: 'How do you validate a BST correctly?', back: 'Pass `(low, high)` bounds down: left child gets `high = node.val`, right child gets `low = node.val`. Or check that an in-order traversal is strictly increasing. Parent/child comparisons alone are wrong.' },
  { id: 'dsa2-adjacency-list', front: 'Default graph representation and how to build it in TS?', back: 'Adjacency list: `Array.from({ length: n }, () => [])`, then for each edge push both directions if undirected. O(V + E) space. Never `new Array(n).fill([])` (one shared array).' },
  { id: 'dsa2-bfs-shortest', front: 'Why does BFS give shortest paths in unweighted graphs?', back: 'It expands in rings of equal distance (1 edge, then 2, …), so the first time it reaches a node is via the fewest edges. Weighted edges → Dijkstra (BFS + min-heap).' },
  { id: 'dsa2-mark-on-enqueue', front: 'In BFS, when do you mark a node visited?', back: 'When you **enqueue** it. Marking on dequeue lets the same node be enqueued many times by different neighbours.' },
  { id: 'dsa2-directed-cycle', front: 'How do you detect a cycle in a directed graph?', back: 'DFS with three states: unvisited / visiting (on the current path) / done. Reaching a *visiting* node = back edge = cycle. Or Kahn\'s topological sort: fewer than V nodes output means a cycle.' },
  { id: 'dsa2-grid-graph', front: 'Grid problems as graphs: the checklist?', back: 'Cells are nodes; 4 (or 8) neighbours via a `DIRS` array; bounds check; visited set (don\'t mutate the input without asking); BFS for fewest steps, DFS/BFS for regions; beware recursion depth.' },
  { id: 'dsa2-topo-sort', front: 'Topological sort: what, when, cost?', back: 'An order of a DAG where every node comes after its dependencies. Cues: "prerequisites", "build order", "depends on". Kahn\'s (in-degree + queue) or DFS post-order. O(V + E).' },
  { id: 'dsa2-heap', front: 'What is a binary heap and its costs?', back: 'A complete binary tree in an array, parent ≤ children (min-heap). Peek O(1), push/pop O(log n), heapify O(n). Parent `(i-1)>>1`, children `2i+1`, `2i+2`. JS has none built in.' },
  { id: 'dsa2-topk-heap', front: 'Top-k largest with a heap: which heap and why?', back: 'A **min**-heap capped at k: its root is the weakest of the current top k, so it\'s the one to evict. O(n log k) time, O(k) space, works on streams.' },
  { id: 'dsa2-backtracking-template', front: 'Backtracking template in three words, plus the classic bug?', back: '**Choose → explore → unchoose** (push, recurse, pop). Bug: `result.push(path)` instead of `result.push([...path])` — every entry ends up as the same, emptied array.' },
  { id: 'dsa2-dp-properties', front: 'The two properties that make a problem DP?', back: '**Optimal substructure** (the best answer is built from best sub-answers) and **overlapping subproblems** (naive recursion solves the same subproblem repeatedly).' },
  { id: 'dsa2-memo-vs-tab', front: 'Memoization vs tabulation in one line each?', back: '**Memoization**: top-down recursion + cache; easiest from a brute force; computes only reached states; stack-depth risk. **Tabulation**: bottom-up loop over a table; no recursion; easy space optimisation.' },
  { id: 'dsa2-dp-recipe', front: 'The DP recipe?', back: 'State (what `dp[i]` means) → transition ("what was the last choice?") → base cases → fill order → answer → complexity = states × work per state.' },
];

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: 'dsa2-explain-recursion',
    kind: 'concept',
    question: 'Explain recursion. What are its risks in JavaScript, and how do you avoid them?',
    answer: `**One-liner:** recursion solves a problem by solving smaller instances of the same problem, until it hits a base case it can answer directly.

**How I think about it:** two parts — a **base case** (an empty tree has depth 0) and a **recursive case** that *trusts* the recursive calls (if I know the depth of each subtree, mine is one plus the larger). I don't trace into the calls; if the base case and the combination step are right, induction does the rest. It's the natural fit for recursive data: the DOM, JSON, component trees, nested comments.

**Risks in JS:**
- **Stack depth.** Every active call is a stack frame, and engines cap the stack — typically a few thousand to a few tens of thousands of frames, depending on the engine and frame size. A degenerate tree, a 50,000-reply comment chain or a flood fill on a big grid throws \`RangeError: Maximum call stack size exceeded\`. V8 doesn't do tail-call optimisation, so tail-recursive style doesn't help.
- **Hidden space.** Recursion is O(depth) memory, not O(1).
- **Exponential blow-up** when calls overlap, like naive Fibonacci.

**Mitigations:** when depth is unbounded or user-controlled, I convert to an **explicit stack** or BFS — usually a mechanical change, pushing \`[node, extraState]\` tuples. For overlapping calls, memoize or tabulate.

**Trade-off:** recursion is usually clearer, so I use it for bounded depth (a balanced tree, a UI tree a few dozen levels deep) and go iterative for arbitrary input.`,
    followUps: ['Convert this recursive DFS to an iterative one.', 'Why doesn\'t tail recursion help in Chrome?', 'What is the space complexity of recursive merge sort?'],
    minutes: 2,
  },
  {
    id: 'dsa2-dfs-vs-bfs',
    kind: 'concept',
    question: 'DFS vs BFS — how do they differ and when do you choose each?',
    answer: `**One-liner:** BFS explores in rings of increasing distance using a queue; DFS follows one path as deep as it can using a stack (or recursion), then backtracks.

**Choose BFS when distance matters:**
- Fewest edges/moves in an **unweighted** graph — the first time BFS reaches a node is a shortest path.
- Level-by-level output, the nearest/shallowest match, multi-source spreading (distance to the nearest exit from every cell).

**Choose DFS when you need to explore structure:**
- Reachability, counting connected components, flood fill.
- Cycle detection and topological sort (they rely on "is this node on my current path?").
- Tree aggregates (height, subtree sums) via post-order, and backtracking over decision trees.

**Costs:** both are O(V + E) time with a visited set. Space differs: DFS holds the current path, O(h); BFS holds a frontier, O(width). On a wide, shallow tree DFS is lighter; on a deep, narrow one BFS (or iterative DFS) avoids stack overflow in JS.

**Frontend example:** \`querySelector\` is effectively a pre-order DFS — it returns the first match in document order. If I wanted the *shallowest* matching element, I'd write a BFS.`,
    followUps: ['Why does DFS not give the shortest path?', 'What changes if edges have weights?', 'What is multi-source BFS?'],
    minutes: 2,
  },
  {
    id: 'dsa2-detect-cycle',
    kind: 'concept',
    question: 'How would you detect a cycle in a graph — say, circular imports between modules?',
    answer: `**One-liner:** it depends on whether the graph is directed. Module imports are directed, so I'd use a DFS with three states, or Kahn's topological sort.

**Directed (imports, task dependencies):** DFS where each node is *unvisited*, *visiting* (on the current DFS path) or *done*. When I start a node, I mark it visiting; when all of its dependencies are finished, I mark it done. If I ever reach a node that's **visiting**, I've found a back edge — a cycle — and the current path gives me the cycle to print, like \`a → b → c → a\`. Reaching a *done* node is fine: that's a shared dependency (a diamond), not a cycle. That's the common mistake — a single visited set reports false positives on diamonds.

**Alternative:** Kahn's algorithm — repeatedly remove nodes with in-degree zero. If some nodes never reach in-degree zero, they're in or behind a cycle. Nice because it produces the build order at the same time.

**Undirected:** DFS where a visited neighbour that isn't my parent means a cycle, or union-find — an edge connecting two nodes already in the same set.

**Cost:** O(V + E) for all of them. In practice this is what bundlers and monorepo tools do to warn about circular dependencies.`,
    followUps: ['How would you report the actual cycle path?', 'Why does a diamond dependency confuse a naive visited set?', 'How does union-find detect a cycle?'],
    minutes: 2,
  },
  {
    id: 'dsa2-heap-frontend',
    kind: 'concept',
    question: 'What is a heap, and when would you use one in a frontend context?',
    answer: `**One-liner:** a heap is a complete binary tree stored in an array where each parent is smaller than its children (for a min-heap), so the minimum is always at index 0 — it's the standard way to implement a priority queue.

**Costs:** peek O(1), insert and remove-min O(log n) via sift-up and sift-down, building from n items O(n). Index math replaces pointers: parent \`(i - 1) >> 1\`, children \`2i + 1\` and \`2i + 2\`. JavaScript has no built-in heap, so in an interview I ask whether I can assume one, or write a ~30-line class.

**When it pays off:**
- **Top-k from a stream** — a trending list or leaderboard fed by a WebSocket. A min-heap capped at k keeps the best k in O(n log k) time and O(k) memory.
- **Scheduling** — React's scheduler keeps tasks in a min-heap ordered by expiration time so the most urgent work is always on top.
- **Merging k sorted sources** — combining paginated timelines from several services in O(N log k).
- Dijkstra-style shortest paths, e.g. routing on a map widget.

**When it doesn't:** for a few hundred items in the UI, \`[...items].sort(cmp).slice(0, k)\` is clearer and fast enough — I'd say that out loud and mention the heap as the scaling path. If keys are small bounded integers, bucket sort is O(n).`,
    followUps: ['Why a MIN-heap for the k LARGEST items?', 'Implement push and pop.', 'How is heapify O(n) rather than O(n log n)?'],
    minutes: 2,
  },
  {
    id: 'dsa2-explain-dp',
    kind: 'concept',
    question: 'Explain dynamic programming simply, with an example.',
    answer: `**One-liner:** dynamic programming is recursion that remembers — when a problem's best answer is built from best answers to smaller subproblems, and those subproblems repeat, you solve each one once and reuse it.

**Example — climbing stairs:** you can take 1 or 2 steps; how many ways to reach step n? The last move came from n − 1 or n − 2, so \`ways(n) = ways(n − 1) + ways(n − 2)\`. Naively that recursion is exponential — \`ways(40)\` makes hundreds of millions of calls because \`ways(38)\` is computed again and again. Caching each result makes it n calls: O(n).

**The two properties to name:** **optimal substructure** (the answer is composed from sub-answers) and **overlapping subproblems** (the same sub-answer is needed many times). Without overlap, plain recursion is fine — merge sort isn't DP.

**My recipe in an interview:** define the **state** in one sentence (\`dp[a]\` = fewest coins for amount a), find the **transition** by asking "what was the last choice?" (the last coin c → \`dp[a − c] + 1\`), set **base cases** (\`dp[0] = 0\`), pick a **fill order**, and state the complexity as number of states × work per state — O(amount × coins) for coin change.

**Sanity check:** I also try a greedy counterexample — coins [1, 3, 4] for 6 — which shows why DP is needed at all.`,
    followUps: ['How do you know it is DP rather than greedy?', 'Walk me through house robber.', 'How would you reduce the space?'],
    minutes: 2,
  },
  {
    id: 'dsa2-memo-vs-tabulation',
    kind: 'concept',
    question: 'Memoization vs tabulation — what is the difference and which do you prefer?',
    answer: `**One-liner:** both cache subproblem results; memoization does it **top-down** with recursion plus a cache, tabulation does it **bottom-up** with a loop that fills a table from the base cases.

**Memoization:** I write the natural recursive brute force and add a \`Map\` keyed by the arguments — literally the \`memoize\` higher-order function, applied to a recursive function. Pros: quickest path from brute force to a correct solution, and it only computes states that are actually reached. Cons: recursion depth — in JavaScript a memoized \`coinChange([1], 100000)\` overflows the call stack — and some overhead from calls and hashing.

**Tabulation:** I define \`dp\` as an array, set base cases, and loop in an order where every dependency is ready. Pros: no recursion, predictable performance, and easy **space optimisation** — house robber only needs the last two values, so O(1) space; many 2-D DPs only need the previous row. Cons: I have to work out the fill order, and it computes every state even if some aren't needed.

**What I do in interviews:** brute force → point at the repeated subproblem → memoize (correct and polynomial) → if there's time or the input is large, convert to a table and trim the space. Saying that progression out loud shows the interviewer I understand they're the same algorithm.`,
    followUps: ['When would memoization compute fewer states than tabulation?', 'Convert climbing stairs to O(1) space.', 'What is a good cache key for multi-argument states?'],
    minutes: 2,
  },
  {
    id: 'dsa2-recognise-pattern',
    kind: 'concept',
    question: 'You get a problem you have never seen. How do you work out which pattern or algorithm it needs?',
    answer: `**One-liner:** I let the problem's wording, input shape and constraints narrow it down, then I start from a brute force and ask what the bottleneck is.

**1. Clarify and read the cues.** Specific phrases map to patterns: "contiguous subarray/substring" → sliding window or prefix sums; "sorted" → two pointers or binary search; "pairs/duplicates/seen before" → hash map; "top/k-th" → heap; "fewest steps", "levels", "nearest" → BFS; "connected", "regions", a grid → DFS/BFS with visited; "prerequisites/order" → topological sort; "all combinations/permutations" → backtracking; "how many ways / min cost" with choices → DP.

**2. Use the constraints.** n ≤ 20 means exponential is acceptable; n ≤ 10⁴ allows O(n²); n ≥ 10⁵ needs O(n log n) or O(n).

**3. Brute force first, out loud.** It gives me a correct baseline and the interviewer a checkpoint. Then I find the bottleneck — "I'm re-scanning the array for each element" → hash map; "I'm recomputing the same subproblem" → memoize; "I re-sum the window every time" → sliding window.

**4. Model it.** If entities have relationships, I say "nodes are X, edges are Y" — many problems become BFS/DFS once modelled.

**5. Verify with examples** before coding: does the pattern handle the edge cases?

If I'm stuck, I say which patterns I've ruled out and why — that's useful signal, and interviewers often nudge at exactly that point.`,
    followUps: ['What does n ≤ 10⁵ tell you?', 'Give an example where two patterns both work.', 'What do you do if the brute force is all you can get?'],
    minutes: 2,
  },
  {
    id: 'dsa2-trees-in-frontend',
    kind: 'concept',
    question: 'Where do trees and graphs show up in real frontend work?',
    answer: `**One-liner:** constantly — the DOM, React's component tree, JSON and nested UI data are trees, and anything with dependencies or links is a graph.

**Trees:**
- **The DOM** — \`querySelector\` is a pre-order DFS; event propagation walks the ancestor path; \`contains\` checks ancestry.
- **React** — reconciliation diffs two element trees. A general tree diff is O(n³), so React uses heuristics (same type at same position, keys for lists) to make it O(n). That's why stable keys matter.
- **Nested data** — comment threads, menus, file explorers, JSON schemas driving forms. I flatten them with a DFS carrying depth for indentation, or for virtualised rendering.

**Graphs:**
- **Module graphs** in bundlers — topological order for evaluation, cycle detection for circular-import warnings, tree shaking as reachability from entry points.
- **Monorepo task graphs** — build order and caching.
- **Routing / navigation flows**, social graphs ("people you may know" is BFS at distance 2), dependency-aware form fields that recompute when an input changes (spreadsheet-style topological recalculation).

**Practical concerns I raise:** user-generated nesting can be arbitrarily deep, so I avoid unbounded recursion; and I normalise graph-shaped API data into id-keyed maps so updates are O(1) and the UI doesn't hold duplicate copies.`,
    followUps: ['Why does React need keys, in tree-diff terms?', 'How would you find the shallowest element with a given class?', 'How does tree shaking relate to graph reachability?'],
    minutes: 2,
  },
];
