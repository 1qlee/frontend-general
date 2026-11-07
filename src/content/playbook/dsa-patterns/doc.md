## How to use this sheet

Interview DS&A problems are mostly variations on about a dozen patterns. The skill being tested is **recognition**: reading the statement and constraints, naming the pattern within a few minutes, and explaining *why* it fits. Use this page in two ways: skim the **cue table** right before an interview, and use the **templates** as drills (type each one from memory until it takes under two minutes). It covers both DS&A days: DS&A I (the linear patterns) and DS&A II (recursion, trees, graphs, heaps, backtracking, DP).

## The problem-solving framework

Use the same script every time, out loud. Under pressure you won't remember advice, but you will remember a script you've practised.

| # | Step | What you do | Say something like |
|---|---|---|---|
| 1 | **Clarify** | Inputs, outputs, types, empty/duplicate/negative cases, mutation allowed?, size of n | "Can the array be empty? Can I modify the input? Roughly how large is n?" |
| 2 | **Examples** | One normal, one edge, one tricky case, written down | "Let me write three cases I'll test against later." |
| 3 | **Brute force** | The simplest correct approach + its complexity | "The naive way is to check every pair: O(n²)." |
| 4 | **Bottleneck** | Name the repeated or wasted work | "I'm re-scanning the array for every element." |
| 5 | **Pattern** | Map the bottleneck/cues to a pattern | "A hash map turns that lookup into O(1)." |
| 6 | **Code** | Typed signature first, small helpers, narrate intent | "This loop maintains the invariant that…" |
| 7 | **Test** | Trace your examples line by line, then edge cases | "Tracing example 2: left = 0, right = 4…" |
| 8 | **Complexity & follow-ups** | Time and space, trade-offs, what changes at scale | "O(n) time, O(n) space. With a stream I'd…" |

> [!TIP]
> If you get stuck, say which patterns you've ruled out and why ("it's not a sliding window because the subarray needn't be contiguous"). Interviewers count that as signal, and it's usually the moment they offer a hint.

## Complexity by constraints

The constraints usually tell you the intended complexity. Assume roughly 10⁷–10⁸ simple operations per second in JavaScript.

| n up to | Target complexity | Typical patterns |
|---|---|---|
| ≤ 10–12 | O(n!), O(n · n!) | Permutations, brute-force arrangements |
| ≤ 20–25 | O(2ⁿ), O(n · 2ⁿ) | Subsets, backtracking, bitmask DP |
| ≤ 500 | O(n³) | Triple loops, interval DP |
| ≤ 5,000–10⁴ | O(n²) | Nested loops, 2-D DP |
| ≤ 10⁵–10⁶ | O(n log n) or O(n) | Sorting, heaps, binary search, hashing, two pointers, sliding window, BFS/DFS |
| ≥ 10⁸ / "huge" | O(log n) or O(1) | Binary search on the answer, math |

| Operation | Cost to remember |
|---|---|
| `Map`/`Set` get/set/has | O(1) average |
| `arr.push/pop`, index access | O(1) |
| `arr.shift/unshift/splice`, `includes`, `indexOf` | O(n) |
| `[...arr]`, `slice`, `concat`, string `+` in a loop | O(n) per call |
| `sort` | O(n log n) (stable since ES2019) |
| Recursion | O(depth) stack space; JS engines cap depth (assume fewer than ~10k frames) |

## Cue → pattern map

| Cue in the problem | Pattern | Typical complexity |
|---|---|---|
| "Seen before", duplicates, pair sums to target, anagrams, frequency | Hash map / set | O(n) |
| Sorted input; pairs/triplets; in-place partition; palindrome | Two pointers | O(n) (after an O(n log n) sort) |
| Longest/shortest **contiguous** subarray/substring with a condition | Sliding window | O(n) |
| Range sums, "subarray sum equals k", many range queries | Prefix sums (+ hash map) | O(n) build, O(1) query |
| Brackets, undo, "next greater/smaller", "days until warmer" | Stack / monotonic stack | O(n) |
| Sorted array search; "minimum X such that…"; monotonic yes/no | Binary search | O(log n) per search |
| Linked list cycle, middle, k-th from end, reverse, merge | Fast/slow pointers, pointer rewiring | O(n), O(1) space |
| Tree depth, sums, validation, ancestors, root-to-leaf paths | Tree DFS | O(n), O(h) space |
| Tree by level, nearest/shallowest node | Tree BFS | O(n), O(w) space |
| Relationships, "connected", "reachable", regions, grids | Graph DFS/BFS + visited | O(V + E) |
| Fewest steps/moves/hops, unweighted | BFS | O(V + E) |
| "Prerequisites", "build order", "depends on", circular dependency | Topological sort | O(V + E) |
| "Top k", "k-th largest", merge k sorted, running median | Heap (or sort / bucket sort) | O(n log k) |
| "All combinations/permutations/subsets/valid arrangements" | Backtracking | O(n · 2ⁿ) / O(n · n!) |
| "How many ways", "min/max cost", "can you reach", overlapping choices | Dynamic programming | states × transition |

## Templates

### Hash map: count or look up in O(1)

```ts
function twoSum(nums: number[], target: number): [number, number] | null {
  const indexOf = new Map<number, number>(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const j = indexOf.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    indexOf.set(nums[i], i);
  }
  return null;
}
```

**Complexity:** O(n) time and space. **Classics:** two sum, group anagrams (key = sorted letters), first non-repeating character. **Gotcha:** use a `Map` rather than an object (keys keep their types and there are no prototype keys), and check with `has`/`!== undefined` instead of truthiness.

### Two pointers: converge on sorted data

```ts
function pairWithSum(sorted: number[], target: number): [number, number] | null {
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const sum = sorted[lo] + sorted[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++; else hi--; // move the pointer that can fix the sum
  }
  return null;
}
```

**Complexity:** O(n) time, O(1) space. **Classics:** two sum II, valid palindrome, container with most water, 3Sum (sort + two pointers per element, O(n²)). Read/write pointers handle in-place problems like removing duplicates.

### Sliding window: grow right, shrink left

```ts
function longestUniqueSubstring(s: string): number {
  const lastSeen = new Map<string, number>();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const prev = lastSeen.get(s[right]);
    if (prev !== undefined && prev >= left) left = prev + 1; // shrink until valid
    lastSeen.set(s[right], right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

**Complexity:** O(n): each index enters and leaves the window at most once. **Classics:** longest substring without repeats, minimum window substring, max sum of a size-k window. **Cue check:** the subarray must be **contiguous**, and the validity condition must be monotonic, so that shrinking can only help.

### Prefix sums: O(1) range queries

```ts
function subarraySumEqualsK(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]]); // prefix sum -> count
  let sum = 0, count = 0;
  for (const n of nums) {
    sum += n;
    count += seen.get(sum - k) ?? 0; // a previous prefix that is exactly k smaller
    seen.set(sum, (seen.get(sum) ?? 0) + 1);
  }
  return count;
}
```

**Complexity:** O(n). **Classics:** range sum query, subarray sum equals k (works with negatives, unlike a sliding window), product of array except self (prefix and suffix products).

### Monotonic stack: the next greater element

```ts
function nextGreater(nums: number[]): number[] {
  const result = new Array<number>(nums.length).fill(-1);
  const stack: number[] = []; // indices whose values decrease from bottom to top
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      result[stack.pop()!] = nums[i]; // nums[i] is the answer for everything it pops
    }
    stack.push(i);
  }
  return result;
}
```

**Complexity:** O(n): each index is pushed and popped once. **Classics:** valid parentheses (plain stack), daily temperatures, largest rectangle in a histogram, min stack.

### Binary search: on an index or on the answer

```ts
/** Smallest x in [lo, hi] where ok(x) is true; ok must be false…false, true…true. */
function firstTrue(lo: number, hi: number, ok: (x: number) => boolean): number {
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (ok(mid)) hi = mid; else lo = mid + 1;
  }
  return lo; // check ok(lo) if "none" is possible
}
```

**Complexity:** O(log n) calls to `ok`. **Classics:** search in a sorted array, first bad version, search in a rotated array, "minimum speed to finish in h hours" (binary search on the answer). Write the loop invariant out loud. Off-by-one bugs come from mixing `lo <= hi` with `hi = mid`.

### Linked list: fast/slow pointers and rewiring

```ts
type ListNode = { val: number; next: ListNode | null };

function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

function reverse(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  while (head) [head.next, prev, head] = [prev, head, head.next];
  return prev;
}
```

**Complexity:** O(n) time, O(1) space. **Classics:** cycle detection (Floyd), middle of a list, remove the k-th node from the end, merge two sorted lists (use a dummy head node).

### Tree DFS: return up, or pass down

```ts
// Return a value up (post-order): height, sums, balanced?
function height(node: TreeNode | null): number {
  if (!node) return 0;
  return 1 + Math.max(height(node.left), height(node.right));
}

// Pass constraints down (pre-order): BST validation with bounds
function isValidBST(node: TreeNode | null, low = -Infinity, high = Infinity): boolean {
  if (!node) return true;
  if (node.val <= low || node.val >= high) return false;
  return isValidBST(node.left, low, node.val) && isValidBST(node.right, node.val, high);
}
```

**Complexity:** O(n) time, O(h) stack. **Classics:** max depth, path sum, validate BST, lowest common ancestor, diameter, invert a tree. For an iterative version, use an explicit stack of `[node, state]` tuples and push the right child before the left.

### BFS: level order and shortest path

```ts
function bfs(adj: number[][], start: number): number[] {
  const dist = new Array<number>(adj.length).fill(-1);
  dist[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) { // head index: no O(n) shift()
    const node = queue[head];
    for (const next of adj[node]) {
      if (dist[next] !== -1) continue;
      dist[next] = dist[node] + 1; // mark on enqueue
      queue.push(next);
    }
  }
  return dist;
}
```

**Complexity:** O(V + E). **Classics:** level-order traversal (snapshot the queue length per level), shortest path in an unweighted graph, word ladder, rotting oranges (multi-source: start with every source in the queue).

### Graph DFS: components and grids

```ts
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function countRegions(grid: string[][]): number {
  const R = grid.length, C = grid[0]?.length ?? 0;
  const seen = new Uint8Array(R * C);
  let regions = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (grid[r][c] !== '1' || seen[r * C + c]) continue;
    regions++;
    seen[r * C + c] = 1;
    const stack: Array<[number, number]> = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop()!;
      for (const [dr, dc] of DIRS) {
        const nr = cr + dr, nc = cc + dc;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
        if (grid[nr][nc] !== '1' || seen[nr * C + nc]) continue;
        seen[nr * C + nc] = 1;
        stack.push([nr, nc]);
      }
    }
  }
  return regions;
}
```

**Complexity:** O(R · C), or O(V + E) for an explicit graph. **Classics:** number of islands, max area of an island, flood fill, number of connected components, clone graph (use a `Map` from old node to new node as the visited set). Build adjacency lists with `Array.from({ length: n }, () => [])`.

### Topological sort (Kahn's algorithm)

```ts
function topoOrder(n: number, edges: Array<[from: number, to: number]>): number[] | null {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array<number>(n).fill(0);
  for (const [a, b] of edges) { adj[a].push(b); indegree[b]++; }
  const queue = [...indegree.keys()].filter((v) => indegree[v] === 0);
  for (let head = 0; head < queue.length; head++) {
    for (const next of adj[queue[head]]) if (--indegree[next] === 0) queue.push(next);
  }
  return queue.length === n ? queue : null; // null → there is a cycle
}
```

**Complexity:** O(V + E). **Classics:** course schedule, build order (see the monorepo `buildOrder` exercise on the testing & tooling day), alien dictionary. For directed cycle detection with DFS, use three states: unvisited, visiting and done.

### Heap: top-k and k-way merge

```ts
// Assumes a MinHeap<T>(compare) with push/pop/peek/size; the DS&A II lesson has a ~30-line implementation.
function kLargest(nums: number[], k: number): number[] {
  const heap = new MinHeap<number>((a, b) => a - b);
  for (const n of nums) {
    heap.push(n);
    if (heap.size > k) heap.pop(); // evict the weakest of the current top k
  }
  const out: number[] = [];
  while (heap.size) out.push(heap.pop()!);
  return out;
}
```

**Complexity:** O(n log k) time, O(k) space. **Classics:** k-th largest element, top-k frequent elements (or bucket sort in O(n)), merge k sorted lists (O(N log k)), k closest points. JavaScript has no built-in heap, so ask whether you may assume one. When n is small, `sort` + `slice` is fine; say so.

### Backtracking: choose → explore → unchoose

```ts
function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  const path: T[] = [];
  const backtrack = (start: number) => {
    if (path.length === size) { result.push([...path]); return; } // copy!
    for (let i = start; i < items.length; i++) {
      if (items.length - i < size - path.length) break; // prune: not enough items left
      path.push(items[i]);
      backtrack(i + 1);
      path.pop();
    }
  };
  backtrack(0);
  return result;
}
```

**Complexity:** the size of the decision tree times the copy cost: O(n · 2ⁿ) for subsets, O(n · n!) for permutations. **Classics:** subsets (record every node), permutations (`used[]` array), combination sum (recurse with `i` to allow reuse, sort and `break` to prune), N-Queens, word search.

### Dynamic programming: state, transition, base case

```ts
// Bottom-up: dp[a] = fewest coins for amount a.
function coinChange(coins: number[], amount: number): number {
  const dp = new Array<number>(amount + 1).fill(Infinity);
  dp[0] = 0;                                              // base case
  for (let a = 1; a <= amount; a++)                       // fill order: small → large
    for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1); // transition
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// Space-optimised 1-D DP: house robber needs only the last two states.
function rob(nums: number[]): number {
  let prev2 = 0, prev1 = 0;
  for (const x of nums) [prev2, prev1] = [prev1, Math.max(prev1, prev2 + x)];
  return prev1;
}
```

**Complexity:** number of states × work per transition. **Classics:** climbing stairs, house robber, coin change (minimum coins and number of ways), longest increasing subsequence, longest common subsequence (2-D), unique paths in a grid. **Recipe:** state → transition ("what was the last choice?") → base cases → fill order → answer. Start top-down (memoize the brute force), then convert to bottom-up if recursion depth or space matters.

## DFS or BFS?

| Need | Use |
|---|---|
| Fewest edges/steps (unweighted) | BFS |
| Level-by-level output, nearest match | BFS |
| Any path / reachability / count regions | Either (DFS is usually shorter to write) |
| Cycle detection, topological order | DFS with three states (or Kahn's BFS) |
| Aggregate over subtrees | DFS post-order |
| Unbounded depth in JS | BFS or an iterative DFS (explicit stack) |
| Weighted shortest path | Dijkstra (BFS + min-heap) |

## Common bugs to check before you say "done"

- `new Array(n).fill([])` shares a single array. Use `Array.from({ length: n }, () => [])`.
- `result.push(path)` in backtracking stores a reference. Push `[...path]`.
- Marking BFS nodes visited on dequeue instead of enqueue.
- `queue.shift()` inside a loop over a large queue costs O(n) per call.
- Checking only parent/child pairs when validating a BST.
- Using one `visited` set for directed cycle detection, which gives false positives on diamond dependencies.
- Truthiness checks on map values (`if (map.get(k))`) when 0 is a valid value.
- Mutating the input (sorting `nums` in place, overwriting grid cells) without asking.
- Unbounded recursion on user-controlled depth.
- Missing trivial cases: empty input, a single element, `start === target`, amount 0.
