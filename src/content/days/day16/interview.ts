import type { Flashcard, InterviewQuestion } from '../../types';

export const flashcards: Flashcard[] = [
  {
    id: 'dsa-method-steps',
    front: 'The eight steps of the problem-solving method?',
    back: 'Clarify → examples & edge cases → brute force out loud → find the bottleneck & match a pattern → plan (get buy-in) → implement while narrating → trace by hand → state time & space complexity.',
  },
  {
    id: 'constraints-to-complexity',
    front: 'n ≤ 20, n ≤ 10³–10⁴, n ≤ 10⁵–10⁶: which complexities fit?',
    back: 'n ≤ 20 → exponential/backtracking OK. n ≤ 10³ → O(n²) fine (≤ 10⁴ maybe). n ≤ 10⁵–10⁶ → O(n log n) or O(n). Values up to 10⁹ → think O(log range) (binary search on the answer).',
  },
  {
    id: 'big-o-rules',
    front: 'Big-O simplification rules?',
    back: 'Drop constants (O(2n) → O(n)), drop lower-order terms (O(n² + n) → O(n²)), add sequential steps, multiply nested ones, and use different variables for different inputs (O(a + b), O(a · b)).',
  },
  {
    id: 'recursion-cost',
    front: 'How do you get time and space for a recursive function?',
    back: 'Time ≈ number of calls × work per call. Space ≈ maximum call-stack depth (plus allocations per frame). Naive fib: ~2ⁿ calls but only n deep → O(2ⁿ) time, O(n) space.',
  },
  {
    id: 'amortised-o1',
    front: 'What does "amortised O(1)" mean? Give an example.',
    back: 'Over any sequence of m operations the total cost is O(m), even if a single operation is occasionally O(n). `array.push` (occasional buffer growth + copy), and push/pop-once stacks and sliding windows.',
  },
  {
    id: 'js-hidden-linear',
    front: 'Which common JS array/string operations are O(n), not O(1)?',
    back: '`shift`, `unshift`, `splice` in the middle, `includes`, `indexOf`, `find`, `slice`, spread copies, `str.split`. A `.includes` inside a loop makes it O(n²).',
  },
  {
    id: 'js-sort-facts',
    front: 'Three facts about `Array.prototype.sort`?',
    back: 'Default compares as **strings** (`[10, 9, 1].sort()` → `[1, 10, 9]`), so pass `(a, b) => a - b`. It **mutates** (`toSorted` copies, ES2023). O(n log n), stable since ES2019.',
  },
  {
    id: 'js-2d-array',
    front: 'How do you create a 3×3 grid of zeros without shared rows?',
    back: '`Array.from({ length: 3 }, () => new Array(3).fill(0))`. `new Array(3).fill(new Array(3).fill(0))` puts the SAME row object in every slot.',
  },
  {
    id: 'map-key-identity',
    front: 'Why does `map.get([1, 2])` miss after `map.set([1, 2], x)`?',
    back: 'Map compares object keys by **reference** (SameValueZero). Each `[1, 2]` is a new array. Use a string key: `` `${r},${c}` `` or `sorted.join(\'\')`.',
  },
  {
    id: 'cue-hashing',
    front: 'Recognition cues for a hash map/set?',
    back: '"Seen before?", complement/pair lookup, counting frequencies, duplicates, grouping equivalent items by a canonical key. Trades O(n) space for O(1) average lookups.',
  },
  {
    id: 'prefix-sum-subarray',
    front: 'Prefix-sum trick for "count subarrays summing to k"?',
    back: 'Subarray (i, j] sums to k ⇔ prefix[i] = prefix[j] − k. Keep a Map of prefix → count seeded with {0: 1}; at each step add map.get(prefix − k). O(n). Works with negatives.',
  },
  {
    id: 'cue-two-pointers',
    front: 'Recognition cues for two pointers?',
    back: 'Sorted input with pairs/triplets (opposite ends), palindromes, reversing in place, "remove/move in place with O(1) extra space" (read/write pointers), linked-list middle/cycle (fast/slow).',
  },
  {
    id: 'sliding-window-invariant',
    front: 'Variable sliding window: template and invariant?',
    back: 'For each right: expand (add s[right]) → while invalid, remove s[left] and left++ → record (right − left + 1). Invariant: after shrinking, the window is valid. O(n): each index enters and leaves once.',
  },
  {
    id: 'sliding-window-limits',
    front: 'When does a sliding window NOT work?',
    back: 'When validity isn\'t monotonic, e.g. "sum equals k" with negative numbers: adding an element can lower the sum, so you can\'t tell which side to move. Use prefix sums + a hash map.',
  },
  {
    id: 'monotonic-stack',
    front: 'Monotonic stack: when and why O(n)?',
    back: 'Cue: "next/previous greater or smaller element" (daily temperatures, stock span, histogram). The stack holds unresolved indices in monotonic order; each index is pushed once and popped at most once → O(n) total.',
  },
  {
    id: 'queue-in-js',
    front: 'How do you implement an O(1) queue in JavaScript?',
    back: 'Array + head index: `enqueue` = push, `dequeue` = `items[head++]` (compact occasionally). Or a linked list / ring buffer. Not `shift()`, which is O(n).',
  },
  {
    id: 'linked-list-toolkit',
    front: 'Three linked-list techniques to reach for?',
    back: '1. Save `next` before re-wiring (reverse: prev/curr/next). 2. Dummy head when the head may change. 3. Fast/slow pointers: middle of the list; Floyd\'s cycle detection in O(1) space.',
  },
  {
    id: 'binary-search-template',
    front: 'Lower-bound binary search template and invariant?',
    back: '`lo = 0, hi = n; while (lo < hi) { mid = lo + ((hi - lo) >> 1); if (a[mid] < t) lo = mid + 1; else hi = mid; } return lo;` Invariant: before lo → < t; from hi on → ≥ t.',
  },
  {
    id: 'binary-search-answer-space',
    front: 'When can you binary search on the answer?',
    back: 'When feasible(x) is **monotonic** (false…false, true…true) over a range of candidate answers: "minimum capacity/speed/time such that…". Cost: O(log range × cost of feasible).',
  },
];

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: 'approach-unseen-problem',
    kind: 'concept',
    question: 'Walk me through how you approach an algorithm problem you\'ve never seen before.',
    answer: `**One-liner:** I follow the same process every time: understand, give examples, brute force, find the bottleneck, plan, code, test, analyse. And I do it out loud so you can follow and redirect me.

**In order:**
1. **Clarify:** restate the problem, then ask about input size, sortedness, duplicates, negatives, empty input, and what to return when there's no answer. The constraint on n tells me the complexity I'm aiming for.
2. **Examples:** one normal case and a few edge cases written down, so we agree on expected output.
3. **Brute force:** state the obvious solution and its complexity. That gives me a correct baseline.
4. **Bottleneck → pattern:** ask what work the brute force repeats. Searching suggests a hash map. Re-summing ranges suggests prefix sums or a window. Sorted input suggests two pointers or binary search. "Next greater" suggests a monotonic stack.
5. **Plan:** describe the algorithm in a few steps and check it with you before typing.
6. **Implement** with clear names, narrating *why*, not *what*.
7. **Trace** an example by hand and run the edge cases.
8. **Complexity:** time and space, saying what n is.

**Why this works:** it makes progress visible even when I don't know the optimal answer yet, and it catches most bugs before you have to point them out.`,
    followUps: ['What do you do if the brute force is the only idea you have?', 'How much time do you spend before writing code?', 'What questions do you always ask about the input?'],
    minutes: 2,
  },
  {
    id: 'big-o-js-operations',
    kind: 'concept',
    question: 'What is the time complexity of common JavaScript operations: Map/Set lookups, `push`/`pop`, `shift`, `includes`, `sort`, string concatenation?',
    answer: `**One-liner:** Map/Set operations are O(1) on average, \`push\`/\`pop\` are O(1) (push amortised), anything that scans or moves elements is O(n), and sort is O(n log n).

**Detail:**
- \`map.get/set/has\`, \`set.add/has\`: **O(1) average**. They're hash tables. I say "average" because the spec doesn't guarantee constant time and pathological cases exist.
- \`arr[i]\`, \`push\`, \`pop\`: O(1). \`push\` is **amortised** O(1): occasionally the engine grows the backing store and copies, but the average per push stays constant.
- \`shift\`, \`unshift\`, \`splice\` in the middle: **O(n)**, because every following element moves. That's why I don't use \`shift\` for a BFS queue; I use a head index instead.
- \`includes\`, \`indexOf\`, \`find\`: O(n) linear scans. One inside a loop makes the loop O(n²).
- \`slice\`, spread, \`split\`, \`Object.keys\`: O(k) copies.
- \`sort\`: O(n log n), stable since ES2019, sorts **in place**, and compares as strings unless you pass \`(a, b) => a - b\`.
- Strings are immutable. Concatenating in a loop is fine for small inputs in modern engines, but for big outputs I collect parts in an array and \`join\` once.

**Trade-off to mention:** JS has no built-in heap or deque, so I either implement a small one or state the assumption ("assume a MinHeap with O(log n) push/pop") and move on.`,
    followUps: ['Why is push amortised O(1) rather than O(1)?', 'How would you build an O(1) queue?', 'Is Map faster than a plain object for counting?'],
    minutes: 2,
  },
  {
    id: 'hashmap-vs-sorting',
    kind: 'concept',
    question: 'When would you use a hash map and when would you sort first? Take Two Sum as an example.',
    answer: `**One-liner:** a hash map gives O(n) average time at the cost of O(n) memory and no ordering; sorting costs O(n log n) but creates order, enabling two pointers, binary search and O(1)-extra-space solutions.

**Two Sum specifically:** the brute force checks every pair, O(n²). The inner loop is searching for \`target − x\`, so a hash map of value → index makes it one pass, O(n) time and O(n) space, and it keeps the original indices, which the problem asks for.

Sorting plus two pointers is O(n log n). To return original indices you'd have to sort \`[value, index]\` pairs, which needs O(n) memory anyway. So the hash map wins here.

**When sorting wins:**
- The input is **already sorted**: two pointers is O(n) time and **O(1)** space, strictly better.
- You need **ordered output** or relationships between neighbours: merging intervals, finding the closest pair, removing duplicates.
- **Memory is tight** or keys don't hash well.
- Follow-ups like 3Sum, where sorting makes duplicate-skipping trivial.

**How I'd say it in the room:** "Hashing trades memory for time and ignores order. Sorting trades time for structure. I pick based on whether I need original positions, whether the data is already sorted, and the memory budget."`,
    followUps: ['How would you solve 3Sum and what is its complexity?', 'What if the array is too big to fit in memory?', 'What are the worst cases of a hash map?'],
    minutes: 2,
  },
  {
    id: 'when-sliding-window',
    kind: 'concept',
    question: 'How do you recognise a sliding-window problem, and when does the technique break down?',
    answer: `**One-liner:** I reach for a sliding window when the question is about a **contiguous** subarray or substring, usually "longest", "shortest" or "at most K", and the window's state can be updated incrementally as its edges move.

**The template:** for each \`right\`, add \`s[right]\` to the window state. *While* the window is invalid, remove \`s[left]\` and advance \`left\`. Then record the answer. The **invariant** is "after the shrink loop, the window is valid". Writing that sentence down tells me what state to keep (a sum, a count map, a set of characters).

**Why it's O(n):** \`left\` and \`right\` only move forward, so each element enters and leaves the window once. The nested \`while\` is amortised.

**When it breaks:** the window needs **monotonic validity**. Growing a window should only make it "more" of something and shrinking "less". With negative numbers, "sum equals k" isn't monotonic: adding an element can lower the sum, so I can't decide which edge to move. Then I switch to **prefix sums plus a hash map**: subarray \`(i, j]\` sums to k when \`prefix[i] = prefix[j] − k\`.

**Example:** longest substring without repeating characters is a window with a last-seen map, where \`left\` jumps past the previous occurrence but never moves backwards.`,
    followUps: ['Fixed vs variable window: what changes?', 'How would you return the substring itself?', 'How do you solve "minimum window containing all characters of t"?'],
    minutes: 2,
  },
  {
    id: 'binary-search-answer-space-iq',
    kind: 'concept',
    question: 'Binary search is usually explained on sorted arrays. How can it apply when there is no sorted array?',
    answer: `**One-liner:** binary search really needs a **monotonic yes/no predicate**, not a sorted array. If \`feasible(x)\` is false up to some point and true after it, I can binary search over the candidate answers x.

**Example:** "minimum ship capacity to deliver packages in D days". If capacity c works, any larger capacity works too, so it's monotonic. The answer is between \`max(weight)\` (must carry the heaviest) and \`sum(weights)\` (everything in one day). I binary search that range. Each check is a greedy O(n) simulation, so the total is O(n log(sum)).

**The template I use:** half-open \`lo, hi\`, \`while (lo < hi)\`. If \`feasible(mid)\` then \`hi = mid\`, else \`lo = mid + 1\`. Return \`lo\`. The invariant is that everything below \`lo\` is infeasible and \`hi\` is always feasible, so they meet at the first feasible value. It's the same code as lower bound on an array.

**Cues:** "minimum X such that…", "maximum X such that…", "minimise the largest…", and huge value ranges like 10⁹ where scanning every candidate is impossible.

**Frontend example:** finding the largest font size that still fits a container, or finding the first visible row in a virtualised list by binary searching cumulative row offsets.`,
    followUps: ['How do you prove the predicate is monotonic?', 'What changes if you need the maximum instead of the minimum?', 'How do you avoid an infinite loop?'],
    minutes: 2,
  },
  {
    id: 'time-vs-space',
    kind: 'concept',
    question: 'Talk about time-versus-space trade-offs. Give examples of spending memory to save time, and the reverse.',
    answer: `**One-liner:** many optimisations precompute or remember something so you don't recompute it. That costs memory, and whether it's worth it depends on input size, how often you query, and the memory budget.

**Memory for time:**
- **Hash maps**: Two Sum goes from O(n²)/O(1) to O(n)/O(n).
- **Prefix sums**: O(n) extra space turns every range-sum query into O(1).
- **Memoization**: naive Fibonacci is O(2ⁿ); caching results makes it O(n) time and O(n) space. In frontend terms that's \`useMemo\` or a selector cache.
- **Indexes**: a \`Map<id, item>\` next to an array for O(1) lookups in a normalised store.

**Time for memory:**
- **Two pointers on sorted data** instead of a hash set: O(1) extra space.
- **Floyd's cycle detection** instead of a visited set: O(1) instead of O(n).
- **Iterative instead of recursive**: avoids O(n) call-stack depth (reversing a 100k-node list recursively overflows the stack).
- **Recompute on demand** instead of caching, when the cache would grow without bound. That's why LRU caches exist.

**How I decide:** I check the constraints. If n is small, the simpler solution wins. If memory is constrained (mobile, huge inputs, long-lived caches), I bound it. And I say the trade-off out loud. Interviewers often follow up with "can you do it in O(1) space?", so naming it first shows I saw it.`,
    followUps: ['Can you solve Two Sum in O(1) extra space?', 'What is an LRU cache and why is it a time/space compromise?', 'Does space complexity include the output?'],
    minutes: 2,
  },
  {
    id: 'when-stuck',
    kind: 'concept',
    question: 'What do you do when you get stuck in a coding interview?',
    answer: `**One-liner:** I make being stuck visible and structured. I say where I'm stuck, go back to what I know works, and try systematic ways forward instead of going silent.

**My steps:**
1. **Name it:** "I'm stuck on how to avoid re-scanning the window when I find a duplicate." A specific statement invites a useful hint.
2. **Return to the brute force:** what work is repeated? Naming it usually points at a pattern.
3. **Walk the pattern checklist:** is it sorted (two pointers, binary search)? Contiguous (window, prefix sums)? Pairs or counts (hash map)? Nesting or "next greater" (stack)? Is there a monotonic yes/no (binary search on the answer)?
4. **Shrink the problem:** solve n = 3 by hand, or a simpler variant (no negatives, already sorted), and look at what my hands did.
5. **Use hints well:** interviewers expect to give hints. I acknowledge one, connect it to my plan, and keep going.
6. **Protect the outcome:** if time is short, I code the brute force cleanly and explain the optimisation in words. A correct O(n²) with a clear path to O(n) scores better than an unfinished O(n).

**What I avoid:** silent minutes, deleting everything and restarting, and pretending I'm not stuck. Interviewers grade collaboration and recovery as much as the final answer.`,
    followUps: ['How do you react when the interviewer gives you a hint you don\'t understand?', 'What if you realise halfway through coding that your approach is wrong?'],
    minutes: 2,
  },
  {
    id: 'monotonic-stack-explain',
    kind: 'concept',
    question: 'Explain the monotonic stack. Why is "a loop inside a loop" O(n) here?',
    answer: `**One-liner:** a monotonic stack keeps indices in increasing or decreasing order of value so that each new element can immediately resolve all the earlier elements it "beats". It solves next-greater or next-smaller problems in O(n).

**Example, daily temperatures:** I keep a stack of days that haven't found a warmer day yet. Their temperatures are non-increasing from bottom to top, because a colder day under a warmer one would already have been resolved. When today is warmer than the top, I pop it and record \`today − thatDay\`, and repeat. Then I push today.

**Why O(n):** the inner \`while\` looks nested, but every index is pushed exactly once and popped at most once. Over the whole run there are at most n pops, so the total work is O(n). That's amortised analysis: the cost of the pops is spread across the pushes that made them possible.

**Recognition cues:** "next greater/smaller element", "how many days until…", "stock span", "largest rectangle in histogram", "remove k digits to make the smallest number".

**Why indices, not values:** the answer is a *distance* (\`i − j\`), and indices let me look up the value anyway with \`temps[j]\`.`,
    followUps: ['Increasing vs decreasing stack: how do you choose?', 'How would you handle a circular array?', 'Why store indices instead of values?'],
    minutes: 2,
  },
];
