import type { QuizQuestion } from '../../types';

// ---------------------------------------------------------------------------
// Inline lesson checks
// ---------------------------------------------------------------------------

export const frameworkChecks: QuizQuestion[] = [
  {
    id: 'amortised-while',
    prompt: 'What is the time complexity of this function, where n = `nums.length`?',
    code: `function f(nums: number[]): number {
  const stack: number[] = [];
  let pops = 0;
  for (const x of nums) {
    while (stack.length > 0 && stack[stack.length - 1] < x) {
      stack.pop();
      pops++;
    }
    stack.push(x);
  }
  return pops;
}`,
    codeLang: 'ts',
    choices: ['O(n²): there is a loop inside a loop', 'O(n): each element is pushed once and popped at most once', 'O(n log n)', 'O(1) amortised'],
    answer: 1,
    explanation:
      'This is the amortised argument. Every element is pushed exactly once, and an element can only be popped if it was pushed, so the `while` loop runs **at most n times in total** across the whole function, not n times per outer iteration. Total work is O(n + n) = O(n). "Loop inside a loop means O(n²)" is the trap: always ask how many times the inner body can run *in total*. "O(1) amortised" describes a single operation (one push or pop), not the whole function.',
  },
  {
    id: 'sort-default',
    prompt: 'What does this log?',
    code: `console.log([10, 9, 1, 100].sort());`,
    codeLang: 'ts',
    runnable: true,
    choices: ['[1, 9, 10, 100]', '[1, 10, 100, 9]', '[100, 10, 9, 1]', '[10, 9, 1, 100]'],
    answer: 1,
    explanation:
      'Without a comparator, `Array.prototype.sort` converts elements to **strings** and compares UTF-16 code units, so `"100"` < `"9"` because `"1"` < `"9"`. For numbers always pass `(a, b) => a - b`. It also sorts **in place** (use `toSorted` for a copy) and is O(n log n). `[1, 9, 10, 100]` is what people expect, which is exactly why interviewers ask.',
  },
];

export const arraysChecks: QuizQuestion[] = [
  {
    id: 'two-pointer-sorted',
    prompt:
      'The array is **sorted ascending** and you must find two values that sum to `target` using **O(1) extra space**. `nums[left] + nums[right]` is smaller than the target. What do you do?',
    choices: [
      'Decrement `right`, because the sum must change',
      'Increment `left`: no pair using `nums[left]` can reach the target, because `nums[right]` is the largest value left',
      'Restart with `left = 0` and a smaller `right`',
      'Switch to a hash map, because two pointers can only find exact matches by luck',
    ],
    answer: 1,
    explanation:
      '`nums[right]` is the largest remaining value, so if even `nums[left] + nums[right]` is too small, `nums[left]` can\'t be part of any answer: discard it with `left++`. Decrementing `right` would make the sum *smaller*, moving away from the target. Restarting makes it O(n²). A hash map works but uses O(n) space, which the question forbids. The correctness argument ("each step safely discards one candidate") is what interviewers want to hear.',
  },
  {
    id: 'pattern-cue-window',
    prompt:
      '"Given an array of **positive** integers and a number S, return the length of the **shortest contiguous subarray** whose sum is ≥ S." Which approach is the best fit?',
    choices: [
      'Sort the array, then use two pointers',
      'Variable-size sliding window: expand right; while the sum is ≥ S, record the length and shrink from the left',
      'Hash map of values to indices',
      'Binary search for S in the array',
    ],
    answer: 1,
    explanation:
      '"Contiguous subarray" plus "shortest/longest" plus **positive** numbers is the textbook sliding-window cue. With positive numbers, growing the window only increases the sum and shrinking only decreases it, so the window is monotonic and O(n) works. **Sorting** destroys contiguity, so the answer would be about a different array. A **hash map** is useful for "sum equals exactly K" with negatives (prefix sums), not "≥ S, shortest". Binary searching for S in the array answers a different question.',
  },
];

export const structuresChecks: QuizQuestion[] = [
  {
    id: 'fast-slow-cycle',
    prompt: 'Why does Floyd\'s fast/slow pointer algorithm detect a cycle using O(1) extra space?',
    choices: [
      'It stores visited nodes in a WeakSet, which doesn\'t count as memory',
      'Inside a cycle, the fast pointer gains one node per step on the slow one, so it must eventually land on the same node; without a cycle it reaches null',
      'It compares node values, and repeated values imply a cycle',
      'It reverses the list as it goes and checks whether it returns to the head',
    ],
    answer: 1,
    explanation:
      'Once both pointers are in the cycle, the gap between them shrinks by exactly one each step (fast moves 2, slow moves 1), so it can\'t "jump over" slow: they meet within one lap. Only two pointers are stored, so it\'s O(1) space. A visited **Set/WeakSet** works but is O(n) space. Comparing **values** is wrong because lists can contain duplicate values without any cycle; you must compare node references. Reversing in place does work as a trick, but it mutates the list, and it isn\'t Floyd\'s algorithm.',
  },
  {
    id: 'binary-search-answer',
    prompt:
      '"Koko can eat bananas at speed k per hour. Given pile sizes (up to 10⁹ each) and h hours, find the minimum k that lets her finish." What makes binary search applicable?',
    choices: [
      'The piles array is sorted',
      'The predicate "can finish at speed k" is monotonic: if speed k works, every faster speed works too',
      'Binary search applies to any problem asking for a minimum',
      'The number of piles is a power of two',
    ],
    answer: 1,
    explanation:
      'Binary search needs a **monotonic predicate** (false…false, true…true), not necessarily a sorted array. Here the search space is the *answer* k in `[1, max(pile)]`, and `canFinish(k)` is monotonic, so you find the first k where it becomes true in O(n · log(max pile)). The piles don\'t need to be sorted at all. "Any minimum" is too strong: without monotonicity (e.g. a function with several local minima) binary search can skip the answer. Powers of two are irrelevant.',
  },
];

// ---------------------------------------------------------------------------
// Quiz block: complexity analysis & pattern recognition
// ---------------------------------------------------------------------------

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'hidden-includes',
    prompt: 'What is the time complexity of `dedupe`, where n = `items.length`?',
    code: `function dedupe(items: string[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}`,
    codeLang: 'ts',
    choices: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'],
    answer: 2,
    explanation:
      '`out.includes` is a **linear scan**, hidden inside the loop. In the worst case (all unique) `out` grows to n, so the total work is 1 + 2 + … + n = O(n²). The fix is a `Set` (`[...new Set(items)]` keeps first-occurrence order) for O(n) average. O(n) is the answer people give when they only count visible loops.',
  },
  {
    id: 'doubling-loop',
    prompt: 'What is the time complexity of this loop?',
    code: `let steps = 0;
for (let i = 1; i < n; i *= 2) {
  for (let j = 0; j < n; j++) steps++;
}`,
    codeLang: 'ts',
    choices: ['O(n²)', 'O(n log n)', 'O(log n)', 'O(n)'],
    answer: 1,
    explanation:
      'The outer loop doubles `i`, so it runs about log₂ n times. The inner loop is a full O(n) pass each time. Multiply nested loops: O(n log n). O(n²) assumes the outer loop is linear. O(log n) ignores the inner loop.',
  },
  {
    id: 'constraint-n-1e5',
    prompt: '`1 ≤ n ≤ 10⁵`. Your first idea is O(n²). What should you conclude?',
    choices: [
      'It\'s fine. Computers are fast',
      'About 10¹⁰ operations: far too slow. Aim for O(n log n) or O(n)',
      'Use exponential backtracking instead',
      'Constraints don\'t matter in interviews, only correctness does',
    ],
    answer: 1,
    explanation:
      'With a budget of roughly 10⁷–10⁸ simple operations per second, 10¹⁰ is minutes, not milliseconds. n ≤ 10⁵ is the classic signal for O(n log n) (sorting, binary search, heap) or O(n) (hashing, two pointers, window). O(n²) is usually acceptable up to about n = 10³–10⁴, exponential only for n ≤ ~20. Constraints matter a lot: they\'re the interviewer telling you the intended complexity.',
  },
  {
    id: 'shift-queue',
    prompt: 'A BFS uses `queue.shift()` to dequeue and processes n nodes. What is the worst-case cost of all the dequeues together, and what\'s the usual fix?',
    choices: [
      'O(n): shift is O(1)',
      'O(n²), because each shift moves the remaining elements. Use a head-index pointer (or a linked list / ring buffer)',
      'O(n log n). Use a heap',
      'O(n²). Use `unshift` instead',
    ],
    answer: 1,
    explanation:
      '`shift` removes index 0 and re-indexes everything after it: O(k) for a queue of size k, so n dequeues can cost O(n²). Keep an index `head` and read `items[head++]` instead, which is O(1). A heap is for *priority* order, not FIFO. `unshift` is also O(n) and adds at the wrong end. Engines sometimes optimise `shift` on small arrays, but you can\'t rely on that, and interviewers expect you to know the general cost.',
  },
  {
    id: 'recursive-fib-space',
    prompt: 'Naive recursive `fib(n)` (`fib(n - 1) + fib(n - 2)`, no memo). What are its time and space complexity?',
    code: `function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}`,
    codeLang: 'ts',
    choices: ['O(n) time, O(n) space', 'O(2ⁿ) time, O(2ⁿ) space', 'O(2ⁿ) time, O(n) space', 'O(n²) time, O(1) space'],
    answer: 2,
    explanation:
      'Each call branches into two, so there are about 2ⁿ calls (more precisely φⁿ ≈ 1.618ⁿ, still exponential). But **space is the maximum call-stack depth**, not the total number of calls: at most n frames are active at once, so O(n) space. With memoization (the JS core day\'s `memoize`), time drops to O(n). Confusing total calls with stack depth gives "O(2ⁿ) space".',
  },
  {
    id: 'sum-equals-k-negatives',
    prompt: '"Count subarrays whose sum equals k. The array may contain **negative** numbers." Which approach is correct and O(n)?',
    choices: [
      'Sliding window: expand while the sum < k, shrink while the sum > k',
      'Prefix sums with a hash map counting how often each prefix sum has occurred',
      'Sort, then two pointers',
      'Binary search on prefix sums',
    ],
    answer: 1,
    explanation:
      'With negatives, adding an element can *decrease* the sum, so the sliding window can\'t decide which side to move. The window\'s validity isn\'t monotonic. Rewrite the condition instead: `prefix[j] − prefix[i] = k` ⇔ `prefix[i] = prefix[j] − k`, then count matching earlier prefixes in a map seeded with `{0: 1}`. Sorting breaks contiguity. Binary search needs sorted prefix sums, which you only get when all numbers are non-negative.',
  },
  {
    id: 'cue-first-ge',
    prompt: 'Sorted array of 10⁶ timestamps; you need the first event at or after time t, many times per second. What do you use?',
    choices: [
      '`events.find(e => e >= t)` each time',
      'Binary search (lower bound): O(log n) per query',
      'Build a Set of timestamps',
      'Sort the array again before each query',
    ],
    answer: 1,
    explanation:
      'Sorted data plus "first position where value ≥ t" is the definition of lower-bound binary search: about 20 comparisons for 10⁶ items. `find` is O(n) per query. A Set answers "is t present?", not "what\'s the first one ≥ t". Re-sorting is O(n log n) per query and the array is already sorted. Frontend connection: finding the first visible row in a virtualised list from cumulative row offsets.',
  },
  {
    id: 'cue-group-key',
    prompt: 'You need to group words that are anagrams. Which `Map` key works?',
    code: `const words = ['tea', 'eat', 'ate'];
const keyA = (w: string) => [...w].sort();          // string[]
const keyB = (w: string) => [...w].sort().join(''); // string
const m = new Map<unknown, string[]>();
for (const w of words) {
  const k = keyA(w);
  m.set(k, [...(m.get(k) ?? []), w]);
}
console.log(m.size);`,
    codeLang: 'ts',
    runnable: true,
    choices: [
      '`keyA`: the snippet logs 1 because the sorted arrays are equal',
      '`keyB`: `keyA` creates a new array each time, and Map compares object keys by reference (the snippet logs 3)',
      'Either. Map deep-compares arrays',
      'Neither. Maps can\'t have string keys built at runtime',
    ],
    answer: 1,
    explanation:
      '`Map` uses SameValueZero: primitives by value, objects **by reference**. Every call to `keyA` returns a fresh array, so each word gets its own entry (size 3). Convert the canonical form to a **string** (`join(\'\')`), or for count signatures `join(\'#\')` with a separator. The same trap applies to grid coordinates: use `` `${r},${c}` ``, not `[r, c]`.',
  },
  {
    id: 'cue-monotonic-stack',
    prompt: '"For each bar in a chart, find how many bars to its right you pass before reaching a **taller** bar." n ≤ 10⁵. Which pattern?',
    choices: ['Two pointers from both ends', 'Monotonic stack of indices waiting for a taller bar', 'Prefix sums', 'Sliding window of fixed size'],
    answer: 1,
    explanation:
      '"Next greater element to the right" is the monotonic-stack cue. Keep indices whose answer is unknown, with heights non-increasing from bottom to top. Each new bar resolves every shorter bar on top. O(n), because each index is pushed and popped once. Brute force is O(n²), too slow for 10⁵. Two pointers and fixed windows don\'t capture "first taller to the right". Prefix sums answer range sums, not comparisons.',
  },
  {
    id: 'two-sum-sort-tradeoff',
    prompt: 'Two Sum must return the **original indices**. Why is "sort, then two pointers" a worse fit than a hash map here?',
    choices: [
      'Two pointers doesn\'t work on sorted arrays',
      'Sorting is O(n log n) and loses the original positions unless you sort [value, index] pairs. The hash map is O(n) and keeps indices',
      'Hash maps use less memory than sorting',
      'Sorting can\'t handle negative numbers',
    ],
    answer: 1,
    explanation:
      'Sorting costs O(n log n) and reorders elements, so you have to carry indices along as pairs. The one-pass hash map is O(n) average and naturally knows each index. The trade-off flips when memory matters: two pointers on an already-sorted array is O(n) time and O(1) space, while the hash map needs O(n) space. That\'s why "hash map uses less memory" is wrong. Sorting handles negatives fine with a numeric comparator.',
  },
  {
    id: 'binary-search-bug',
    prompt: 'This lower-bound search sometimes **never terminates**. Why?',
    code: `function lowerBound(nums: number[], target: number): number {
  let lo = 0;
  let hi = nums.length;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}`,
    codeLang: 'ts',
    choices: [
      '`Math.floor` should be `Math.ceil`',
      'With `lo <= hi` and `hi = mid`, once `lo === hi` the range never shrinks (mid === lo === hi, then hi = mid again)',
      '`hi` should start at `nums.length - 1`',
      'It\'s correct; binary search always terminates',
    ],
    answer: 1,
    explanation:
      'This mixes two templates. The half-open template uses `while (lo < hi)` with `hi = mid`. The closed template uses `while (lo <= hi)` with `hi = mid - 1`. Here, when `lo === hi` the loop still runs, `mid === lo`, and if `nums[mid] >= target` it sets `hi = mid`: nothing changes, forever. (It also reads `nums[nums.length]`, which is `undefined`.) `Math.ceil` doesn\'t fix the lo === hi case. Changing `hi` to `length - 1` makes "insert at the end" impossible. Pick one template and keep its three parts consistent.',
  },
];
