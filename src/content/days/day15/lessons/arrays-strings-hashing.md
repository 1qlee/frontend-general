## Why this lesson carries most of the weight

Arrays and strings make up the majority of easy and medium interview problems, and almost all of them are solved with one of five patterns: **hashing, prefix sums, two pointers, sliding window, or sort-then-scan**. Each pattern removes a specific kind of repeated work from the brute force. The skill interviewers are testing is *recognition*: reading the problem, spotting the cue, and saying *"this looks like a sliding window, because…"*.

For each pattern below you get: **recognition cues**, a **TypeScript template**, a **runnable example**, and the **invariant** that keeps the code correct.

## 1. Hash maps and sets: trade memory for lookup time

**The idea:** if the brute force has an inner loop that *searches* for something, a `Map` or `Set` turns that O(n) search into an O(1) average lookup. You pay O(n) space.

**Recognition cues:** "have we seen…?", "find a pair/complement", "count occurrences", "duplicates", "group things that are equivalent", "first unique".

### Complement lookup

Instead of asking "which earlier element pairs with this one?" by scanning, store what you've seen and look up the exact value you need.

```ts run
function hasPairWithSum(nums: number[], target: number): boolean {
  const seen = new Set<number>();
  for (const x of nums) {
    if (seen.has(target - x)) return true; // the complement we need
    seen.add(x); // add AFTER checking, so x can't pair with itself
  }
  return false;
}

console.log(hasPairWithSum([8, 3, 5, 1], 6)); // 5 + 1
console.log(hasPairWithSum([3], 6));          // only one 3
```

### Frequency counting

```ts run
function countBy<T>(items: Iterable<T>): Map<T, number> {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

function isAnagram(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const counts = countBy(a);
  for (const ch of b) {
    const c = counts.get(ch);
    if (!c) return false; // missing or already used up
    counts.set(ch, c - 1);
  }
  return true;
}

console.log([...countBy('mississippi')]);
console.log(isAnagram('listen', 'silent'), isAnagram('rat', 'car'));
```

The `(counts.get(item) ?? 0) + 1` idiom is the one to have in muscle memory. Use `??`, not `||`: it reads as "missing → 0".

### Grouping by a canonical key

When things are "the same" under some transformation (anagrams, rotations, same shape), compute a **canonical key** that is identical for every member of a group, then group in a `Map<key, items[]>`.

| Equivalence | Canonical key |
|---|---|
| Anagrams | sorted letters (`[...w].sort().join('')`), or a letter-count signature `'1#0#2#…'` |
| Same set of tags, any order | sorted, joined tags |
| Shifted strings (`abc` ~ `bcd`) | differences between consecutive chars |
| Points on a grid | `` `${row},${col}` `` (arrays as Map keys compare by reference!) |

```ts run
function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

const sortedLetters = (w: string) => [...w].sort().join('');
console.log([...groupBy(['stop', 'pots', 'cat', 'tops', 'act'], sortedLetters).values()]);
```

> [!MISTAKE]
> Building a count-signature key with `counts.join('')`. The counts `[1, 11]` and `[11, 1]` both become `"111"`. Always use a separator (`join('#')`). This is exactly the kind of bug a good test catches.

> [!INTERVIEW] Say it like this
> "The inner loop is just searching for a value, so I'll trade space for time: one pass that stores what I've seen in a hash map. Lookups are O(1) on average, which brings it from O(n²) to O(n) time, at the cost of O(n) space."

## 2. Prefix sums: precompute so range queries are O(1)

**The idea:** `prefix[i]` = sum of the first `i` elements (with `prefix[0] = 0`). Then the sum of any range `[l, r)` is `prefix[r] - prefix[l]`. O(n) to build, O(1) per query.

**Recognition cues:** "sum of elements between i and j" asked many times; "subarray with sum K"; "running balance"; "equal number of 0s and 1s".

```ts run
function buildPrefix(nums: number[]): number[] {
  const prefix = new Array<number>(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
  return prefix;
}

const nums = [3, -1, 4, 1, 5];
const prefix = buildPrefix(nums);
const rangeSum = (l: number, r: number) => prefix[r] - prefix[l]; // half-open [l, r)
console.log(prefix);
console.log(rangeSum(1, 4)); // -1 + 4 + 1
```

The length-`n + 1` array with a leading 0 avoids special-casing ranges that start at index 0. Make that choice deliberately and say it out loud.

### Prefix sums + hash map: counting subarrays that sum to K

"How many subarrays sum to k?" Rewrite the condition: subarray `(i, j]` sums to k ⇔ `prefix[j] - prefix[i] = k` ⇔ **`prefix[i] = prefix[j] - k`**. That turns "find a range" into "have I seen this earlier prefix?", which is the complement lookup from pattern 1.

```ts run
function countSubarraysWithSum(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]]); // the empty prefix
  let prefix = 0;
  let count = 0;
  for (const x of nums) {
    prefix += x;
    count += seen.get(prefix - k) ?? 0;
    seen.set(prefix, (seen.get(prefix) ?? 0) + 1);
  }
  return count;
}

console.log(countSubarraysWithSum([1, 2, 3], 3));  // [1,2], [3]
console.log(countSubarraysWithSum([1, -1, 0], 0)); // works with negatives
```

> [!MISTAKE]
> Forgetting to seed the map with `0 → 1`. Without it, subarrays starting at index 0 are never counted, so `[2, 2]` with k = 4 returns 0.

You'll do this in the exercises. It's also the canonical example of when a **sliding window does not work**: with negative numbers, growing the window can *decrease* the sum, so you can't decide which side to move.

## 3. Two pointers

**The idea:** two indices that move through the array according to a rule, so you examine O(n) states instead of O(n²) pairs. The pointers either start at **opposite ends** and move inward, or move in the **same direction** at different speeds.

### Opposite ends (sorted input)

**Cues:** sorted array, find a pair/triplet with a target sum, "container with most water", palindromes, reversing in place.

```ts run
// Sorted input → find a pair summing to target, O(1) extra space.
function pairInSorted(nums: number[], target: number): [number, number] | null {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    if (sum < target) left++; // need bigger: only moving left up can increase the sum
    else right--;             // need smaller
  }
  return null;
}

console.log(pairInSorted([1, 2, 4, 7, 11, 15], 15)); // 4 + 11
```

**Why it's correct (say this):** *"If the sum is too small, `nums[left]` can't be part of any answer with any element at or left of `right`, because those are all ≤ `nums[right]`. So it's safe to discard it."* Each step discards one candidate, so it's O(n).

### Palindromes

```ts run
function isPalindrome(s: string): boolean {
  const isAlnum = (c: string) => /[a-z0-9]/i.test(c);
  let i = 0;
  let j = s.length - 1;
  while (i < j) {
    if (!isAlnum(s[i])) i++;
    else if (!isAlnum(s[j])) j--;
    else if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
    else { i++; j--; }
  }
  return true;
}

console.log(isPalindrome('A man, a plan, a canal: Panama'), isPalindrome('race a car'));
```

### Fast/slow (read/write) pointers: in-place compaction

**Cues:** "remove duplicates in place", "move zeros to the end", "O(1) extra space", "return the new length".

```ts run
// Remove duplicates from a SORTED array in place; return how many unique values remain.
function dedupeSorted(nums: number[]): number {
  let write = 0; // invariant: nums[0..write) are the unique values seen so far
  for (let read = 0; read < nums.length; read++) {
    if (write === 0 || nums[read] !== nums[write - 1]) nums[write++] = nums[read];
  }
  return write;
}

const arr = [1, 1, 2, 3, 3, 3, 4];
const k = dedupeSorted(arr);
console.log(k, arr.slice(0, k));
```

The `read` pointer scans everything; `write` marks the end of the "kept" region. The same template solves "move zeros", "remove element" and "filter in place". Linked-list fast/slow pointers (next lesson) use the same idea.

{{quiz:two-pointer-sorted}}

## 4. Sliding window

**The idea:** for problems about a **contiguous** subarray or substring, keep a window `[left, right]` and *update* its summary (sum, counts, distinct characters) incrementally as edges move, instead of recomputing it for every window.

**Cues:** "subarray"/"substring" plus "longest", "shortest", "maximum sum of size k", "at most K distinct", "contains all characters of…". The word *contiguous* is the strongest cue.

### Fixed size

```ts run
function maxSumOfSizeK(nums: number[], k: number): number {
  if (k > nums.length) return -Infinity;
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += nums[i];
  let best = windowSum;
  for (let right = k; right < nums.length; right++) {
    windowSum += nums[right] - nums[right - k]; // add the new element, drop the old one
    best = Math.max(best, windowSum);
  }
  return best;
}

console.log(maxSumOfSizeK([2, 1, 5, 1, 3, 2], 3)); // 5 + 1 + 3
```

### Variable size: the expand/shrink template

This template covers most variable-window problems. Memorise its shape:

```ts
function longestValidWindow(s: string): number {
  let left = 0;
  let best = 0;
  // window state, e.g. counts of characters inside [left, right]
  for (let right = 0; right < s.length; right++) {
    // 1. EXPAND: add s[right] to the window state
    // 2. SHRINK: while the window is invalid, remove s[left] from the state and left++
    // 3. RECORD: the window is valid again — update best with (right - left + 1)
  }
  return best;
}
```

**The invariant:** *after the shrink loop, the window `[left, right]` is valid*. Every decision follows from that sentence: what "valid" means (no repeats, at most K distinct, sum ≤ target), what to add on expand, what to remove on shrink.

```ts run
// Longest substring with at most k distinct characters.
function longestAtMostKDistinct(s: string, k: number): number {
  const counts = new Map<string, number>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    counts.set(s[right], (counts.get(s[right]) ?? 0) + 1); // expand
    while (counts.size > k) {                                // shrink until valid
      const c = counts.get(s[left])! - 1;
      if (c === 0) counts.delete(s[left]);
      else counts.set(s[left], c);
      left++;
    }
    best = Math.max(best, right - left + 1);                  // record
  }
  return best;
}

console.log(longestAtMostKDistinct('eceba', 2));   // "ece"
console.log(longestAtMostKDistinct('aaabbcc', 1)); // "aaa"
```

**Why it's O(n) despite the nested `while`:** `left` only moves forward and never passes `right`, so across the whole run the shrink loop executes at most n times in total. Amortised, each character is added once and removed once.

**When a sliding window fails:** the window must be **monotonic**: expanding must never make an invalid window valid again by itself, and shrinking must never make a valid window invalid. With negative numbers and a "sum equals K" condition, that breaks, so use prefix sums instead.

> [!INTERVIEW] Say it like this
> "This asks for the longest contiguous substring with a property I can maintain incrementally, so I'll use a sliding window. The invariant is that after shrinking, the window has no repeated characters. Each index enters and leaves the window at most once, so it's O(n) time, and the map holds at most one entry per distinct character."

## 5. Sorting as preprocessing

**The idea:** sorting costs O(n log n) but creates structure: equal items become adjacent, pairs can use two pointers, intervals can be merged in one pass, and binary search becomes possible.

**Cues:** "merge overlapping intervals", "meeting rooms", "find duplicates with O(1) extra space", "k closest", or any problem where *relationships between values* matter more than original positions.

```ts run
type Interval = [start: number, end: number];

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.toSorted((a, b) => a[0] - b[0]); // don't mutate the caller's array
  const merged: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end); // overlaps: extend
    else merged.push([start, end]);
  }
  return merged;
}

console.log(JSON.stringify(mergeIntervals([[8, 10], [1, 3], [2, 6], [15, 18], [5, 7]])));
```

Frontend connection: merging overlapping time ranges in a calendar view, or coalescing highlighted text ranges, is exactly this.

### Hash map vs sort: the trade-off

| | Hash map | Sort first |
|---|---|---|
| Time | O(n) average | O(n log n) |
| Extra space | O(n) | O(1)–O(n) (depends on the sort; copying costs O(n)) |
| Keeps original indices? | Yes | No, unless you sort `[value, index]` pairs |
| Enables | Lookups, counts, grouping | Two pointers, binary search, adjacent duplicates, interval sweeps |

Two Sum asks for *indices*, so sorting is awkward: you'd sort pairs and lose O(n). If memory is tight or you need ordered output, sorting wins. Saying this trade-off out loud is a strong signal.

{{quiz:pattern-cue-window}}

## Recognition cheat sheet

| You read… | Think… |
|---|---|
| "pair", "complement", "seen before", "duplicate" | Hash set/map |
| "count", "frequency", "most common" | Map counts |
| "group", "equivalent", "anagram" | Map with a canonical key |
| "range sum", "subarray sums to K" (negatives allowed) | Prefix sums (+ map) |
| "sorted" + pair/triplet | Two pointers from both ends |
| "in place", "O(1) extra space", "remove/move" | Read/write pointers |
| "longest/shortest contiguous…", "at most K" | Sliding window |
| "intervals", "overlap", "closest" | Sort, then scan |

## Key takeaways

- Each pattern removes a specific repeated work: searching (hash map), re-summing (prefix sums), checking all pairs (two pointers), recomputing overlapping windows (sliding window).
- Hash maps: complement lookup, `(get ?? 0) + 1` counting, canonical keys with separators.
- Prefix sums with a leading 0; for "count subarrays summing to K", look up `prefix - k` in a map seeded with `{0: 1}`.
- Sliding window's invariant: after shrinking, the window is valid; it's O(n) because each index enters and leaves once. It fails when validity isn't monotonic (negative numbers).
- Sorting is an O(n log n) preprocessing step that unlocks two pointers, binary search and interval merging, at the cost of original indices.
