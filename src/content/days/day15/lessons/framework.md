## Why interviewers ask algorithm questions (even for frontend roles)

Plenty of frontend loops include one "LeetCode-style" round, usually easy to medium, often on a shared editor with no autocomplete and no test runner. You already write production code every day. What goes wrong in these rounds is rarely missing knowledge. It's **process**: jumping into code before understanding the problem, going silent, missing an edge case, or not being able to say why the solution is O(n).

Interviewers score these rounds on roughly four things:

| Signal | What they write in the feedback |
|---|---|
| **Problem solving** | "Clarified the input, found the brute force quickly, spotted the bottleneck and moved to a hash map." |
| **Communication** | "Narrated their thinking; I always knew what they were trying and why." |
| **Code quality** | "Clean, readable TypeScript; good names; no off-by-one bugs." |
| **Verification** | "Traced an example by hand, caught their own bug, stated time and space complexity unprompted." |

Notice that only one of the four is about getting the optimal answer. A candidate who reaches an O(n log n) solution while communicating clearly often scores better than one who silently types out a memorised O(n) solution and can't explain it.

### How DS&A rounds differ from frontend-flavoured rounds

| | DS&A round | Frontend-flavoured round |
|---|---|---|
| Typical task | "Longest substring without repeating characters" | "Implement `debounce`", "build an autocomplete", "flatten the DOM tree" |
| Environment | Plain function, no DOM, often no running code | Browser, React, sometimes real APIs |
| What's judged | Pattern choice, complexity, edge cases | API design, async correctness, UX states, accessibility |
| The trap | Coding before you have a plan | Forgetting cleanup, loading/error states, keyboard support |

The two overlap more than people think. The DOM traversal exercises from the browser day are tree problems. The LRU cache from the performance day is a hash map plus a linked list. `buildOrder` from the testing & tooling day is a topological sort. Today you build the framework that makes all of these approachable.

> [!NOTE]
> "Nothing too crazy" is the right ambition. Most frontend DS&A rounds stay inside a small set of patterns: hashing, two pointers, sliding window, stacks, binary search, plus trees/graphs/recursion (covered in DS&A II). Recognising which one applies is 80% of the work.

## The method: eight steps, out loud

Memorise these steps and say them out loud in every practice problem until they're automatic. The phrases matter. They tell the interviewer you're following a process, and they buy you thinking time without awkward silence.

### 1. Understand and clarify (2–3 min)

Restate the problem in your own words and pin down the input and output.

- *"Let me restate it: given an array of numbers and a target, I return the two indices whose values add up to the target."*
- *"Can the array be empty? Can it contain negatives or duplicates?"*
- *"Is it sorted? How large can n get?"* ← **the most useful question you can ask** (see the constraints table below).
- *"If there's no answer, should I return `null`, `-1`, or throw?"*
- *"Can I modify the input, or should I treat it as read-only?"*

### 2. Examples and edge cases (2 min)

Write one normal example and two or three edge cases as comments in the editor *before* writing code. Edge-case checklist: **empty, single element, duplicates, negatives/zero, all the same, already sorted / reverse sorted, very large n.**

- *"Let me write a couple of examples so we agree on the expected output."*

### 3. Brute force out loud (1–2 min)

State the obvious solution and its complexity, even if it's terrible. You get credit for a correct baseline, and you now have something to optimise.

- *"The brute force is to try every pair: two nested loops, O(n²) time, O(1) space. That works, but with n up to 10⁵ it's ten billion operations, so let me look for something better."*

Don't code it unless the interviewer asks, or you're stuck and want a working answer on the board.

### 4. Find the bottleneck and match a pattern (2–5 min)

Ask: **what work is the brute force repeating?** Then match that to a pattern.

- *"The inner loop is searching for `target - nums[i]`. Searching is the bottleneck. If I could look that up in O(1), I'd be done. That's a hash map."*
- *"I'm re-summing overlapping ranges, so prefix sums or a sliding window should help."*
- *"The input is sorted, which is a strong hint for two pointers or binary search."*

| Cue in the problem | Pattern to try first |
|---|---|
| "Have I seen X before?", pairs that sum to something, counting | Hash map / set |
| Sorted array, pairs/triplets, palindromes, in-place compaction | Two pointers |
| "Longest/shortest/at most K **contiguous** subarray or substring" | Sliding window |
| Sum of a range, "subarray sums to K" (with negatives) | Prefix sums (+ hash map) |
| Matching pairs, nesting, undo, "next greater/smaller" | Stack (monotonic stack) |
| Sorted input, "minimum X such that…", n up to 10⁹ | Binary search (on index or answer) |
| Grouping things that are "the same" under some transformation | Hash map with a canonical key |
| Order matters less than relationships between values | Sort first, then scan |

### 5. Plan (1–2 min)

Describe the algorithm in three to five plain-English steps and **get buy-in** before you type.

- *"Plan: one pass; for each number I check whether its complement is in the map; if yes, return both indices; otherwise store the number with its index. Does that sound good before I code it?"*

That last question gives the interviewer a chance to redirect you, which they will if you're heading somewhere bad.

### 6. Implement while narrating (10–15 min)

Write clean, typed code. Name things for what they mean (`seen`, `left`, `windowSum`), not `m`, `a`, `tmp`. Narrate intent, not syntax:

- *"I check the map before inserting, so a number can't pair with itself."*
- *"I'll handle the empty case naturally: the loop just doesn't run."*

If you get stuck: *"I'm not sure about this boundary yet. I'll write `<=` for now, put a TODO, and come back to it when I trace the example."* Moving on beats freezing.

### 7. Test by hand (2–3 min)

Trace your example through the code, line by line, tracking variables in a small table. Then run the edge cases mentally.

- *"Let me trace [2, 7, 11, 15] with target 9. i = 0: complement 7, map is empty, store 2→0. i = 1: complement 2, found at 0, return [0, 1]. Good."*
- *"Empty array: the loop doesn't run, I return null. Single element: same."*

Finding your own bug during the trace is a **positive** signal. It's exactly what they want to see.

### 8. Analyse complexity (1 min)

State time **and** space, and say what n is.

- *"Time is O(n): one pass, and each map operation is O(1) on average. Space is O(n) for the map in the worst case. That's the trade-off: I spend memory to avoid the inner loop."*

> [!INTERVIEW] Say it like this
> "My approach is always the same: clarify the inputs and constraints, write a couple of examples including edge cases, state the brute force and its complexity, find the repeated work and pick a data structure or pattern that removes it, agree on a plan, code it while explaining, trace an example by hand, and finish with time and space complexity."

> [!MISTAKE]
> Starting to type in the first 60 seconds. It feels productive, but you lock in an approach before you understand the problem. Interviewers mark this as "jumped into code". Even if you know the answer, spend two minutes on steps 1–3. They're cheap, and they're scored.

## Big-O: the language of the conversation

**Big-O describes how the running time (or memory) grows as the input grows**, ignoring constant factors and lower-order terms. It's an upper bound on the growth rate. In interviews, "the complexity" means the worst case unless you say otherwise (and "average" for hash maps).

Rules you need:

1. **Drop constants:** O(2n) → O(n). Two separate passes are still linear.
2. **Drop lower-order terms:** O(n² + n) → O(n²).
3. **Different inputs get different variables:** looping over `a` then `b` is O(a + b); nested is O(a · b). Don't call it O(n²) if they're different arrays.
4. **Space complexity** counts the *extra* memory you allocate (maps, copies, recursion stack), usually not the input itself. Say which convention you're using if the output is large.

### Common complexities and what n they allow

A rough rule: a typical judge or interviewer expects about **10⁷–10⁸ simple operations per second** of budget. Use the constraint on n to work out what complexity you're allowed. It's the closest thing to a cheat code in these rounds.

| Complexity | Name | Typical source | Comfortable n |
|---|---|---|---|
| O(1) | constant | hash lookup, array index, arithmetic | any |
| O(log n) | logarithmic | binary search, balanced tree ops | any (10⁹+) |
| O(n) | linear | one pass, hash map building | 10⁶–10⁸ |
| O(n log n) | linearithmic | sorting, heap of n items | 10⁵–10⁶ |
| O(n²) | quadratic | nested loops over pairs | ≤ 10³–10⁴ |
| O(n³) | cubic | triple loops | ≤ 300–500 |
| O(2ⁿ) | exponential | all subsets, naive recursion | ≤ 20–25 |
| O(n!) | factorial | all permutations | ≤ 10 |

Reading constraints like an expert:

- **n ≤ 20**: exponential or backtracking is probably fine (DS&A II).
- **n ≤ 10³**: O(n²) is fine, possibly the intended answer.
- **n ≤ 10⁴**: O(n²) *might* pass, but an O(n log n) idea is probably intended.
- **n ≤ 10⁵–10⁶**: you need O(n log n) or O(n).
- **Values up to 10⁹ but you're asked for a "minimum/maximum that works"**: binary search on the answer, O(log(range)) iterations.

> [!TIP]
> If the interviewer doesn't give constraints, ask: *"Roughly how big can the input get, thousands or millions?"* The answer tells you whether your brute force might already be acceptable.

## How to analyse code

### Loops

Multiply nested loops, add sequential ones.

```ts
function analyse(nums: number[]) {
  for (const x of nums) console.log(x);          // O(n)
  for (const a of nums) for (const b of nums) {} // O(n²)
  for (let i = 1; i < nums.length; i *= 2) {}    // O(log n): i doubles each time
}
```

Watch for the classic "triangle" loop: `for i … for j = i + 1 …` runs n(n−1)/2 times. That's still O(n²).

### Hidden loops

Many one-liners hide a loop. These count:

```ts
nums.includes(x);   // O(n)
nums.indexOf(x);    // O(n)
str.slice(a, b);    // O(b - a): it copies
[...arr];           // O(n)
arr.shift();        // O(n): every element moves down one index
```

A `nums.includes()` inside a `for` loop is O(n²) even though you only see one loop. Interviewers love asking about this.

```ts run
const n = 20_000;
const nums = Array.from({ length: n }, (_, i) => i);

let t = performance.now();
let found = 0;
for (let i = 0; i < n; i++) if (nums.includes(n - 1 - i)) found++; // hidden inner loop
console.log('includes inside a loop:', Math.round(performance.now() - t), 'ms');

t = performance.now();
const set = new Set(nums);
found = 0;
for (let i = 0; i < n; i++) if (set.has(n - 1 - i)) found++; // O(1) average lookup
console.log('Set.has inside a loop: ', Math.round(performance.now() - t), 'ms');
```

### Recursion

Time ≈ **number of calls × work per call**. Space ≈ **maximum depth of the call stack** (plus whatever each call allocates).

- `factorial(n)` → n calls × O(1) = O(n) time, O(n) stack space.
- Naive `fib(n)` → each call branches twice → about 2ⁿ calls → O(2ⁿ). Memoize it (the JS core day's `memoize`) and there are only n distinct calls → O(n).
- Binary search written recursively → log n calls → O(log n) time *and* O(log n) stack space (O(1) if iterative).

DS&A II goes deeper into recursion trees. For today: count calls and depth.

### Amortised analysis

Some operations are usually cheap but occasionally expensive. **Amortised O(1)** means that over any sequence of m operations the total cost is O(m), so the *average per operation* is O(1) even though a single call can be O(n).

The standard example is `array.push`: JS engines store arrays in a backing buffer with spare capacity. When it fills up, the engine allocates a bigger buffer (typically growing it by a constant factor) and copies everything: O(n) once in a while, but cheap enough on average. The same reasoning applies to the "each element is pushed and popped at most once" argument for monotonic stacks and sliding windows: the inner `while` loop looks nested, but its *total* work over the whole run is O(n).

{{quiz:amortised-while}}

## JavaScript/TypeScript specifics interviewers expect you to know

| Operation | Cost | Notes |
|---|---|---|
| `map.get/set/has/delete`, `set.add/has/delete` | O(1) average | Hash tables; keys compared with SameValueZero (so `NaN` works, objects by reference) |
| `arr[i]`, `arr.push`, `arr.pop` | O(1) (push amortised) | |
| `arr.shift`, `arr.unshift`, `arr.splice(i, …)` | O(n) | Elements must move |
| `arr.includes/indexOf/find` | O(n) | Linear scan |
| `arr.slice`, `[...arr]`, `str.slice`, `str.split` | O(k) | Copies |
| `arr.sort(cmp)` | O(n log n) | Stable since ES2019; **mutates**; `toSorted` (ES2023) copies |
| `str + str` in a loop | can degrade to O(n²) | Strings are immutable; build an array and `join` |
| `Object.keys(obj)` | O(n) | Prefer `Map` for dynamic keys |

The gotchas worth saying out loud:

**`sort()` without a comparator sorts as strings.**

```ts run
const nums = [10, 1, 5, 100, 25];
console.log([...nums].sort());                // string order
console.log([...nums].sort((a, b) => a - b)); // numeric ascending
console.log(nums.toSorted((a, b) => b - a));  // ES2023: non-mutating, descending
```

**Strings are immutable.** `s[0] = 'x'` never changes the string: sloppy-mode code silently ignores it, and strict code (including every ES module) throws a `TypeError`. To "modify" a string, convert it to an array (`[...s]`), change that, and `join('')`. Repeated `+=` in a loop is fine in modern engines for small inputs, but in an interview say *"I'll collect parts in an array and join, so it's O(n) total"*.

**No built-in heap, deque or balanced tree.** If you need a priority queue, either say *"I'll assume a MinHeap class with push/pop in O(log n)"* (most interviewers accept this) or implement a small one (DS&A II). For a queue, use an index pointer instead of `shift()` (next lesson).

**Initialising 2-D arrays: don't share rows.**

```ts run
const bad = new Array(3).fill(new Array(3).fill(0)); // ONE row object, referenced 3 times
bad[0][0] = 1;
console.log('fill(array):', JSON.stringify(bad));

const good = Array.from({ length: 3 }, () => new Array<number>(3).fill(0)); // a new row each time
good[0][0] = 1;
console.log('Array.from: ', JSON.stringify(good));
```

**Objects as keys.** `Map` keys are compared by reference, so `map.set([1, 2], …)` then `map.get([1, 2])` misses. Use a string key such as `` `${r},${c}` ``. Plain objects coerce keys to strings, and inherited keys like `"constructor"` can surprise you. Prefer `Map` for counting.

**Number limits.** Integers are exact up to `Number.MAX_SAFE_INTEGER` (2⁵³ − 1). Fine for nearly all interview problems; mention `BigInt` if sums could exceed it. Use `Math.floor((lo + hi) / 2)` or `lo + ((hi - lo) >> 1)`. Overflow isn't the issue it is in Java, but `>> 1` only works below 2³¹.

{{quiz:sort-default}}

> [!MISTAKE]
> Calling `Map` "O(1)" without qualification. It's O(1) **on average** (expected). With pathological hashing it can degrade, and engines don't guarantee it. Saying "O(1) average" costs nothing and signals precision.

## When you're stuck

Have a script for this too, so being stuck turns into visible problem solving instead of silence:

1. **Say so, and say where:** *"I'm stuck on how to avoid re-scanning the window."*
2. **Go back to the brute force** and name the repeated work.
3. **Walk the pattern table:** *"Sorted? No. Contiguous? Yes, so maybe a sliding window. What would the window's invariant be?"*
4. **Solve a smaller or simpler version**: n = 3, or no negatives, or a sorted input.
5. **Take the hint gracefully:** interviewers give hints on purpose; using one well is a positive signal.
6. **Ship the brute force** if time is running out, then describe the optimisation in words.

## Key takeaways

- DS&A rounds score process (clarify, examples, brute force, pattern, plan, code, trace, complexity), not just the final answer.
- Ask for constraints: n tells you the complexity you're allowed.
- Optimise by naming the repeated work in the brute force and choosing a structure that removes it.
- Count hidden loops (`includes`, `slice`, `shift`) and use amortised reasoning for push/pop-once arguments.
- Know the JS specifics: Map/Set O(1) average, `shift` O(n), `sort` needs a numeric comparator and is O(n log n), strings are immutable, no built-in heap/deque, `Array.from` for 2-D arrays.
