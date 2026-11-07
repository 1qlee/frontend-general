## Why these two topics, together

Backtracking and dynamic programming both start from the same place: **a recursive brute force that explores choices**. They diverge on one question:

- If you need **every** valid answer (all subsets, all permutations, every way to place queens), you can't avoid exploring the choices — you make the exploration efficient by **pruning**. That's **backtracking**.
- If you need **one number** about the best/count of answers (fewest coins, number of ways, maximum loot) and the same sub-questions keep recurring, you **cache** them. That's **dynamic programming**.

Interviewers use these to see whether you can write a brute force *systematically* and then explain precisely why it's slow. For a frontend role you're expected to handle the classic easy/medium ones — subsets, permutations, climbing stairs, house robber, coin change — and, more importantly, to **recognise** when a problem is DP. Nobody expects you to invent a novel DP state in 30 minutes.

## Backtracking: choose → explore → unchoose

Backtracking is DFS over a **decision tree**. Each level of the tree is a decision ("include this element or not?", "which unused number goes next?"); each root-to-node path is a partial solution held in a single mutable `path` array.

```ts
function backtrack(/* state: start index, remaining target, … */) {
  if (/* path is a complete answer */) {
    result.push([...path]); // COPY — path keeps changing after this
    return;
  }
  for (const choice of /* choices available from this state */) {
    if (/* choice can't lead to a valid answer */) continue; // prune
    path.push(choice);   // choose
    backtrack(/* next state */); // explore
    path.pop();          // unchoose — restore the state for the next sibling
  }
}
```

The "unchoose" step is what makes it *back*-tracking: one array is reused across the whole search instead of copying at every step, so the extra space is O(depth).

### Subsets: every node is an answer

```ts run
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  const backtrack = (start: number) => {
    result.push([...path]);
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1); // only later elements → no [2,1] after [1,2]
      path.pop();
    }
  };
  backtrack(0);
  return result;
}
console.log(JSON.stringify(subsets([1, 2, 3])));
```

### Permutations: order matters, so track what's used

```ts run
function permutations(nums: number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  const used = new Array<boolean>(nums.length).fill(false);
  const backtrack = () => {
    if (path.length === nums.length) { result.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true; path.push(nums[i]);   // choose
      backtrack();                          // explore
      path.pop(); used[i] = false;          // unchoose
    }
  };
  backtrack();
  return result;
}
console.log(permutations([1, 2, 3]).map((p) => p.join('')).join(' ')); // 123 132 213 231 312 321
```

### Combination sum: pruning

"Find all combinations of `candidates` (reusable) that sum to `target`." Two changes from subsets: recurse with `i` (not `i + 1`) because reuse is allowed, and **prune** — if the candidates are sorted, once one is too big, every later one is too, so `break`.

```ts run
function combinationSum(candidates: number[], target: number): number[][] {
  const sorted = [...candidates].sort((a, b) => a - b); // copy: don't mutate input
  const result: number[][] = [];
  const path: number[] = [];
  const backtrack = (start: number, remaining: number) => {
    if (remaining === 0) { result.push([...path]); return; }
    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remaining) break; // prune the whole rest of this branch
      path.push(sorted[i]);
      backtrack(i, remaining - sorted[i]); // i, not i + 1: reuse allowed
      path.pop();
    }
  };
  backtrack(0, target);
  return result;
}
console.log(JSON.stringify(combinationSum([2, 3, 6, 7], 7))); // [[2,2,3],[7]]
```

**Complexity of backtracking** is about the size of the decision tree times the work per node: subsets O(n · 2ⁿ), permutations O(n · n!). That's fine — the *output* is that large. Pruning doesn't change the worst case but often changes reality dramatically. Constraint cue: **n ≤ ~20** strongly suggests an exponential, backtracking or bitmask solution is intended.

> [!MISTAKE]
> `result.push(path)` instead of `result.push([...path])`. Every entry becomes a reference to the same array, which is empty by the time the search finishes — so you get `[[], [], [], …]`. Interviewers watch for this.

{{quiz:dsa2-backtracking-copy}}

## Dynamic programming

Dynamic programming applies when a problem has two properties:

1. **Optimal substructure** — the best answer for the whole problem is built from best answers to subproblems. (The fewest coins for 11 = one coin + the fewest coins for what's left.)
2. **Overlapping subproblems** — the naive recursion solves the **same** subproblem many times.

If you only have (1), plain recursion or divide-and-conquer is enough (merge sort's halves don't overlap). If you have both, cache each subproblem's answer and the exponential tree collapses to one computation per distinct state.

### Climbing stairs: seeing the overlap

*"You can climb 1 or 2 steps at a time. How many distinct ways to climb n stairs?"* To reach step n, your last move came from n−1 or n−2, so `ways(n) = ways(n − 1) + ways(n − 2)` — Fibonacci. The naive recursion recomputes the same values exponentially often:

```ts run
let calls = 0;
function waysNaive(n: number): number {
  calls++;
  if (n <= 1) return 1; // 1 way to climb 0 or 1 stairs
  return waysNaive(n - 1) + waysNaive(n - 2);
}
console.log(waysNaive(25), 'naive calls:', calls); // ~250,000 calls for n = 25

// Top-down memoization: same recursion + a cache
const memo = new Map<number, number>();
let memoCalls = 0;
function waysMemo(n: number): number {
  memoCalls++;
  if (n <= 1) return 1;
  if (memo.has(n)) return memo.get(n)!;
  const result = waysMemo(n - 1) + waysMemo(n - 2);
  memo.set(n, result);
  return result;
}
console.log(waysMemo(25), 'memo calls:', memoCalls); // ~50 calls
```

The naive tree has ~φⁿ nodes (φ ≈ 1.618) → O(2ⁿ) is the usual loose bound; with memoization there are only n distinct states, each computed once → **O(n)**. That's the whole idea of DP in one example.

### Top-down (memoization) vs bottom-up (tabulation)

**Memoization** is exactly the `memoize` higher-order function from the JS-core day, applied to a recursive function: key = the arguments, value = the result. **Tabulation** fills an array in dependency order, from base cases up, with a loop.

| | Top-down (memoization) | Bottom-up (tabulation) |
|---|---|---|
| Shape | Recursion + cache (`Map` / array) | Loop filling `dp[]` from base cases |
| How to write it | Write the brute force, add 3 lines of cache | Need to know the order to fill states in |
| Computes | Only states actually reached | Every state in the table |
| Stack depth | O(depth of recursion) — **can overflow in JS** for n ≈ 10⁴+ | None |
| Space optimisation | Hard | Easy: keep only the last few rows/values |
| Interview advice | Fastest path from brute force to correct | Say "I can convert this to bottom-up" as the follow-up |

A good interview flow: write the recursive brute force → point at the repeated subproblem → add a memo (now correct and polynomial) → if time allows, convert to a table and optimise space.

### The DP recipe

When you suspect DP, answer these out loud, in order:

1. **State:** what does `dp[i]` (or `dp[i][j]`) *mean*, in one sentence? ("the fewest coins to make amount i", "the most money robbing houses 0..i")
2. **Transition:** how is a state computed from smaller states? Usually by asking **"what was the last choice?"**
3. **Base cases:** the smallest states you know directly (`dp[0]`, empty prefix).
4. **Order:** which direction makes every dependency ready before it's needed?
5. **Answer:** which state (or max over states) is the result?
6. **Complexity:** number of states × work per transition.

### House robber: a "take it or skip it" choice

*"Houses in a row hold `nums[i]` money. You can't rob two adjacent houses. Maximise the loot."*

- **State:** `dp[i]` = max money from houses `0..i`.
- **Transition (last choice: rob house i or not):** `dp[i] = max(dp[i − 1], dp[i − 2] + nums[i])`.
- **Base:** `dp[0] = nums[0]`, `dp[1] = max(nums[0], nums[1])`.
- **Space optimisation:** each state only needs the previous two → two variables, O(1) space.

```ts run
function rob(nums: number[]): number {
  let prev2 = 0; // best up to i - 2
  let prev1 = 0; // best up to i - 1
  for (const money of nums) {
    const best = Math.max(prev1, prev2 + money); // skip this house, or rob it
    prev2 = prev1;
    prev1 = best;
  }
  return prev1;
}
console.log(rob([1, 2, 3, 1]), rob([2, 7, 9, 3, 1]), rob([])); // 4 12 0
```

Greedy ("take every other house", "take the biggest first") fails on inputs like `[2, 1, 1, 2]` (the answer, 4, takes both ends). Having a counterexample to greedy ready is the most convincing way to justify DP.

{{quiz:dsa2-house-robber-recurrence}}

### Coin change: minimise over several choices

*"Fewest coins to make `amount`, or −1."* The last coin used could be any denomination c, leaving `amount − c`:

- **State:** `dp[a]` = fewest coins that make a (`Infinity` = impossible).
- **Transition:** `dp[a] = min over coins c ≤ a of dp[a − c] + 1`.
- **Base:** `dp[0] = 0`. **Answer:** `dp[amount]`, or −1 if still `Infinity`.
- **Complexity:** amount × coins states-work → **O(amount · k)** time, O(amount) space.

```ts run
function coinChange(coins: number[], amount: number): number {
  const dp = new Array<number>(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
console.log(coinChange([1, 2, 5], 11), coinChange([1, 3, 4], 6), coinChange([2], 3)); // 3 2 -1
```

You'll implement this in today's stretch exercise. Notice it's also a **shortest path**: amounts are nodes, each coin is an edge of weight 1, so BFS from 0 works too. Seeing two patterns in one problem is a strong signal.

### When DP is overkill

- **No overlap.** Each subproblem is solved once (tree traversals, merge sort) → plain recursion.
- **Greedy is provably correct.** Interval scheduling by earliest end time, "max profit with unlimited stock transactions", making change with canonical coin systems (real currencies). Greedy is simpler and often O(n log n) or O(n) — but you must be able to justify it, and a single counterexample kills it.
- **You need all solutions, not a count/optimum** → backtracking; caching doesn't shrink an output that is itself exponential.
- **A simple formula exists** — e.g. a running min/max (best time to buy and sell once) is technically DP but just a one-pass scan; call it that.

## Pattern recognition map

The single most useful skill for DS&A rounds is mapping **cues in the problem statement** to a pattern. This map covers both DS&A days; the DS&A cheat sheet in the playbook has templates for each.

| Cue in the problem | Likely pattern |
|---|---|
| "Have we seen…", duplicates, pairs summing to X, anagrams, counting | **Hash map / set** |
| Sorted array; pair/triple with a target; in-place partitioning; palindromes | **Two pointers** |
| "Longest/shortest **contiguous** substring/subarray with…" | **Sliding window** |
| "Sum of range i..j", many range queries, subarray sum equals k | **Prefix sums** (+ hash map) |
| Matching brackets, undo, "nearest greater/smaller element", next warmer day | **Stack / monotonic stack** |
| Sorted input, "minimum value such that…", answer space is monotonic | **Binary search** (on the array or on the answer) |
| Linked list cycle, middle, k-th from end, reverse | **Fast/slow pointers, pointer rewiring** |
| Tree: depth, sums, validate, ancestors, paths | **DFS** (pre-order passes down, post-order combines up) |
| Tree level by level, nearest/shallowest | **BFS** |
| Explicit edges / relationships; "connected", "reachable", "regions"; a grid of cells | **Graph DFS/BFS**, visited set |
| Fewest steps/moves/hops, all edges equal | **BFS** |
| "Order", "prerequisites", "depends on", detect circular dependency | **Topological sort** |
| "Top/most/least k", "k-th largest", merge k sorted, streaming best-so-far | **Heap** (or sort / bucket sort when small/bounded) |
| "All combinations / permutations / subsets / every valid arrangement", n ≤ ~20 | **Backtracking** |
| "How many ways", "min/max cost", "can you reach", choices at each step that overlap | **Dynamic programming** |

> [!INTERVIEW] Say it like this
> "This asks for the *minimum* number of coins and the subproblems overlap — making 30 can be reached through many different first coins — so it's dynamic programming. My state is dp[a], the fewest coins for amount a; the transition is one plus the minimum of dp[a − c] over every coin; the base case is dp[0] = 0. That's O(amount × coins) time and O(amount) space. I'll do it bottom-up so there's no recursion-depth risk for large amounts."

## Key takeaways

- **Backtracking** = DFS over a decision tree with one mutable path: **choose → explore → unchoose**. Copy the path when recording it. Prune branches that can't succeed.
- Subsets use a `start` index; permutations use a `used` array; combination sum recurses with `i` (reuse) and breaks early on sorted input.
- **DP = optimal substructure + overlapping subproblems.** Memoize the brute force (top-down) or fill a table (bottom-up).
- Recipe: **state → transition ("what was the last choice?") → base cases → order → answer → complexity**.
- Bottom-up avoids JS stack limits and makes space optimisation easy (house robber in O(1) space).
- Reach for DP only when subproblems overlap; prefer greedy when it's provably correct and plain recursion when nothing repeats.
