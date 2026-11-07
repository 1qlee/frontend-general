import type { Exercise } from '../../types';

import twoSumStarter from './exercises/two-sum/starter.ts?raw';
import twoSumSolution from './exercises/two-sum/solution.ts?raw';
import twoSumTests from './exercises/two-sum/tests.ts?raw';
import anagramsStarter from './exercises/group-anagrams/starter.ts?raw';
import anagramsSolution from './exercises/group-anagrams/solution.ts?raw';
import anagramsTests from './exercises/group-anagrams/tests.ts?raw';
import substringStarter from './exercises/longest-unique-substring/starter.ts?raw';
import substringSolution from './exercises/longest-unique-substring/solution.ts?raw';
import substringTests from './exercises/longest-unique-substring/tests.ts?raw';
import subarrayStarter from './exercises/subarray-sum-k/starter.ts?raw';
import subarraySolution from './exercises/subarray-sum-k/solution.ts?raw';
import subarrayTests from './exercises/subarray-sum-k/tests.ts?raw';
import reverseStarter from './exercises/reverse-linked-list/starter.ts?raw';
import reverseSolution from './exercises/reverse-linked-list/solution.ts?raw';
import reverseTests from './exercises/reverse-linked-list/tests.ts?raw';
import searchStarter from './exercises/search-insert/starter.ts?raw';
import searchSolution from './exercises/search-insert/solution.ts?raw';
import searchTests from './exercises/search-insert/tests.ts?raw';
import tempsStarter from './exercises/daily-temperatures/starter.ts?raw';
import tempsSolution from './exercises/daily-temperatures/solution.ts?raw';
import tempsTests from './exercises/daily-temperatures/tests.ts?raw';

export const twoSum: Exercise = {
  id: 'dsa-two-sum',
  title: 'Two Sum (return indices)',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 7,
  tags: ['dsa', 'hashing'],
  prompt: `Given an array of numbers and a \`target\`, return the indices \`[i, j]\` (with \`i < j\`) of the two numbers that add up to \`target\`. Return \`null\` if there is no such pair. You may not use the same element twice. Each input has at most one valid pair.

\`\`\`ts
twoSum([2, 7, 11, 15], 9); // [0, 1]
twoSum([3, 2, 4], 6);      // [1, 2]  (not [0, 0]: there is only one 3)
twoSum([3, 3], 6);         // [0, 1]
twoSum([1, 2], 10);        // null
\`\`\`

**Constraints:** \`0 ≤ nums.length ≤ 10⁵\`; values and target can be negative. Don't mutate \`nums\`.

**What the interviewer is looking for:** you state the O(n²) brute force, name the bottleneck ("the inner loop is searching for a complement"), and move to a one-pass hash map. Bonus points for explaining *why* you check the map before inserting.

**Expected complexity:** O(n) time, O(n) extra space. A performance test with 60,000 numbers will time out a nested loop.`,
  starter: twoSumStarter,
  solution: twoSumSolution,
  tests: twoSumTests,
  hints: [
    'Brute force tries every pair. What is the inner loop actually looking for, given nums[j]?',
    'You need the value `target - nums[j]`. Which data structure answers "have I seen this value, and where?" in O(1)?',
    'One pass with `Map<value, index>`: look up the complement first, return if found, then store the current value. Checking before inserting stops an element pairing with itself.',
  ],
  explanation: `**Brute force:** two nested loops over all pairs \`i < j\`, O(n²) time, O(1) space. Correct, but 5 × 10⁹ pair checks at n = 10⁵.

**Bottleneck:** for each \`j\`, the inner loop *searches* for one specific value, \`target − nums[j]\`. Searching is what hash maps are for.

**Pattern:** complement lookup with a hash map.

**Optimal:** walk the array once. For each \`j\`, look up \`target − nums[j]\` in a \`Map<number, number>\` from value to index. If it's there, return \`[thatIndex, j]\`. Otherwise store \`nums[j] → j\` and continue. Because you only look *backwards*, \`i < j\` holds automatically, and checking before inserting means \`[3, 2, 4]\` with target 6 can't return \`[0, 0]\`.

**Complexity:** O(n) time (one pass; each map operation is O(1) on average), O(n) space for the map in the worst case.

**Edge cases:** empty or one-element input (the loop finds nothing → \`null\`); duplicates (\`[3, 3]\` works because the first 3 is stored before the second is checked); negatives and zero (nothing special, since subtraction handles them).

**Common follow-ups:**
- *"The array is sorted. Can you use O(1) space?"* → two pointers from both ends, moving the smaller side up if the sum is too small: O(n) time, O(1) space.
- *"Return all unique pairs"* → sort + two pointers while skipping duplicates, or a map of counts.
- *"3Sum"* → sort, then for each \`i\` run two-pointer Two Sum on the rest: O(n²), which is optimal for that problem.
- *"Why a Map and not an object?"* → numeric keys get stringified on objects, and \`Map\` has clear O(1) \`has/get\` semantics without prototype keys.`,
};

export const groupAnagrams: Exercise = {
  id: 'dsa-group-anagrams',
  title: 'Group anagrams',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['dsa', 'hashing', 'strings'],
  prompt: `Group words that are anagrams of each other (same letters, same counts, any order).

\`\`\`ts
groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']);
// [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
groupAnagrams(['']);   // [['']]
groupAnagrams([]);     // []
\`\`\`

**Output order (so the tests are deterministic):** groups appear in order of their first word's appearance in the input, and words inside a group keep their input order.

**Constraints:** up to 10⁴ words, each up to 100 lowercase letters \`a–z\` (the empty string is allowed). Don't mutate the input.

**What the interviewer is looking for:** recognising "group things that are equivalent" as **hash map + canonical key**, and being able to compare two key choices (sorted letters vs letter counts) with their complexity.

**Expected complexity:** O(n · k log k) with a sorted-letters key, or O(n · k) with a letter-count key (n words, max length k).`,
  starter: anagramsStarter,
  solution: anagramsSolution,
  tests: anagramsTests,
  hints: [
    'Comparing every pair of words is O(n² · k). Instead, can you compute something from each word on its own that is identical for all of its anagrams?',
    'Two canonical keys work: the sorted letters (`[...w].sort().join(\'\')`) or the 26 letter counts. Use the key in a `Map<string, string[]>`. A Map also preserves insertion order for you.',
    'If you build the key from counts, join them with a separator (`counts.join(\'#\')`): without one, counts [1, 11] and [11, 1] both become "111". Keys must be strings, because array keys are compared by reference.',
  ],
  explanation: `**Brute force:** for each word, compare it with the first word of every existing group using an anagram check. That's O(n² · k) in the worst case (every word in its own group).

**Bottleneck:** comparing words *against each other*. If each word can produce a key that's identical exactly for its anagrams, we never compare pairs at all.

**Pattern:** grouping by a canonical key in a hash map.

**Optimal:** for each word compute a key, then \`groups.get(key)?.push(word)\` or create the group. Return \`[...groups.values()]\`. Since \`Map\` iterates in insertion order, groups come out in order of first appearance.

Two key choices to compare out loud:
- **Sorted letters:** \`[...w].sort().join('')\`, O(k log k) per word. Simple and works for any alphabet.
- **Letter counts:** a 26-slot array joined with a separator, O(k) per word. Faster asymptotically for long words, but relies on a fixed, small alphabet.

**Complexity:** O(n · k log k) or O(n · k) time; O(n · k) space for the keys and groups.

**Edge cases:** empty input → \`[]\`; empty string is its own anagram class (key \`""\` or all zeros); duplicate words stay together; the separator-collision case (\`'a' + 'b'.repeat(11)\` vs \`'a'.repeat(11) + 'b'\`), which a test checks.

**Common follow-ups:**
- *"Unicode or uppercase input?"* → normalise first (\`toLowerCase()\`, maybe \`normalize('NFC')\`), and use the sorted key or a \`Map<char, count>\` signature, since the 26-slot array no longer fits. Iterate with \`for…of\`/\`[...w]\` to handle surrogate pairs.
- *"Which key is faster in practice?"* → for short English words, sorting is often just as fast; counts win for long strings. Say you'd measure.
- *"Find all anagrams of a pattern inside a long text"* → a fixed-size sliding window with letter counts (next pattern!).`,
};

export const longestUniqueSubstring: Exercise = {
  id: 'dsa-longest-unique-substring',
  title: 'Longest substring without repeating characters',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 12,
  tags: ['dsa', 'sliding-window', 'hashing', 'strings'],
  prompt: `Return the length of the longest **substring** (contiguous) of \`s\` that contains no repeated characters.

\`\`\`ts
lengthOfLongestSubstring('abcabcbb'); // 3  ("abc")
lengthOfLongestSubstring('bbbbb');    // 1
lengthOfLongestSubstring('pwwkew');   // 3  ("wke"; "pwke" is a subsequence, not a substring)
lengthOfLongestSubstring('');         // 0
\`\`\`

**Constraints:** \`0 ≤ s.length ≤ 5 × 10⁴\`; \`s\` may contain letters, digits, symbols and spaces (treat each UTF-16 code unit as a character).

**What the interviewer is looking for:** recognising the sliding-window cues ("longest" + "contiguous" + a property you can maintain incrementally), stating the window invariant, and handling the two classic bugs: throwing away the whole window on a repeat (\`"dvdf"\`), and moving the left edge backwards (\`"abba"\`).

**Expected complexity:** O(n) time, O(min(n, alphabet)) space.`,
  starter: substringStarter,
  solution: substringSolution,
  tests: substringTests,
  hints: [
    'Brute force checks every substring. Notice that if s[i..j] has no repeats, so does every substring inside it, so you can grow and shrink one window instead of restarting.',
    'Keep a window [left, right] with the invariant "no duplicates inside". Expand `right` one character at a time. When the new character is already in the window, move `left` just past its previous occurrence.',
    'Store each character\'s last index in a Map. On a repeat, set `left = Math.max(left, lastIndex + 1)` (or only jump when lastIndex >= left), because an old occurrence outside the window must not drag `left` backwards. Record `right - left + 1` every step.',
  ],
  explanation: `**Brute force:** for every start \`i\`, extend \`j\` with a fresh \`Set\` until you hit a repeat. That's O(n · m) where m is the alphabet size (O(n²) for large alphabets), or O(n³) if you check each substring from scratch.

**Bottleneck:** when we hit a repeat starting at \`i\`, we throw away everything we learned and restart at \`i + 1\`, even though \`s[i+1..j-1]\` is already known to be repeat-free.

**Pattern:** variable-size sliding window. **Invariant:** \`s[left..right]\` contains no duplicates.

**Optimal walk-through (\`"abba"\`):**

| right | char | lastSeen before | left | window | best |
|---|---|---|---|---|---|
| 0 | a | — | 0 | a | 1 |
| 1 | b | — | 0 | ab | 2 |
| 2 | b | b→1 (inside) | 2 | b | 2 |
| 3 | a | a→0 (**outside**, 0 < left) | 2 | ba | 2 |

At \`right = 3\`, a naive \`left = lastSeen + 1\` would set \`left = 1\` and report \`"bba"\` (length 3): wrong. Only jump when the previous occurrence is inside the window.

The alternative template uses a \`Set\`: expand; \`while (set.has(s[right])) set.delete(s[left++])\`; add; record. Also O(n), because each character enters and leaves at most once.

**Complexity:** O(n) time. Space O(min(n, alphabet)) for the map.

**Edge cases:** empty string → 0; single char → 1; all identical → 1; all unique → n; spaces and symbols are characters too.

**Common follow-ups:**
- *"Return the substring, not just the length"* → also store \`bestStart\` when \`best\` improves, then \`s.slice(bestStart, bestStart + best)\`.
- *"At most K distinct characters"* → same template with a \`Map<char, count>\`; shrink while \`map.size > k\`.
- *"What about emoji?"* → iterate code points (\`[...s]\`), since \`s[i]\` splits surrogate pairs.`,
};

export const subarraySumK: Exercise = {
  id: 'dsa-subarray-sum-k',
  title: 'Subarray sum equals K',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 12,
  tags: ['dsa', 'prefix-sums', 'hashing'],
  prompt: `Count the **contiguous, non-empty** subarrays whose elements sum to exactly \`k\`.

\`\`\`ts
subarraySum([1, 1, 1], 2);   // 2   ([1,1] twice: indices 0–1 and 1–2)
subarraySum([1, 2, 3], 3);   // 2   ([1,2] and [3])
subarraySum([1, -1, 0], 0);  // 3   ([1,-1], [0], [1,-1,0])
subarraySum([], 0);          // 0
\`\`\`

**Constraints:** \`0 ≤ nums.length ≤ 2 × 10⁴\` (the performance test uses 60,000); values in \`[-1000, 1000]\`; \`k\` can be negative.

**What the interviewer is looking for:** explaining why a sliding window **doesn't** work here (negative numbers), turning the range condition into a lookup with prefix sums (\`prefix[i] = prefix[j] − k\`), and remembering the empty prefix.

**Expected complexity:** O(n) time, O(n) space.`,
  starter: subarrayStarter,
  solution: subarraySolution,
  tests: subarrayTests,
  hints: [
    'The O(n²) solution fixes a start index and extends a running sum. Why can\'t you shrink a window instead? (Try it on [1, -1, 1].)',
    'With prefix sums, the sum of nums[i..j-1] is prefix[j] − prefix[i]. Rearrange "that equals k" into a question about an earlier prefix value.',
    'Keep a running prefix sum and a Map from prefix value to how many times it has occurred, seeded with 0 → 1 (the empty prefix). At each step add `map.get(prefix - k) ?? 0` to the count, then record the current prefix.',
  ],
  explanation: `**Brute force:** for each start \`i\`, extend \`j\` and keep a running sum; count when it equals \`k\`. O(n²) time, O(1) space. Fine for n = 10³, too slow for the 60,000-element test.

**Why not a sliding window?** A window needs monotonic validity: growing must only increase the sum. With negatives, adding an element can decrease the sum, so when the sum is too big you can't know whether to shrink or keep expanding.

**Pattern:** prefix sums + hash map (complement lookup on prefixes).

**Derivation:** let \`P[j]\` be the sum of the first \`j\` elements, with \`P[0] = 0\`. Subarray \`(i, j]\` sums to \`k\` ⇔ \`P[j] − P[i] = k\` ⇔ **\`P[i] = P[j] − k\`**. So at each \`j\`, the number of valid subarrays ending there is *how many earlier prefixes equal \`P[j] − k\`*. A \`Map<prefix, count>\` answers that in O(1).

**Walk-through (\`[1, 1, 1]\`, k = 2):** map \`{0:1}\`. Prefix 1: look up −1 → 0; map \`{0:1, 1:1}\`. Prefix 2: look up 0 → 1 (count 1); map gets 2. Prefix 3: look up 1 → 1 (count 2). Answer 2.

**Complexity:** O(n) time, O(n) space (up to n + 1 distinct prefixes).

**Edge cases:** the seed \`0 → 1\` counts subarrays starting at index 0 (\`[2, 2]\`, k = 4); zeros create many equal prefixes (\`[0, 0, 0]\`, k = 0 → 6), which is why we store **counts**, not just presence; the order "look up, then insert" matters when \`k = 0\`, or every prefix would match itself and count an empty subarray.

**Common follow-ups:**
- *"Return the longest such subarray"* → store the **first** index of each prefix instead of a count; length = \`j − firstIndex[P[j] − k]\`.
- *"All numbers are positive. Can you use O(1) space?"* → yes, now a sliding window works.
- *"Subarrays with sum divisible by k"* → key the map by \`((prefix % k) + k) % k\` (JS \`%\` can be negative!).`,
};

export const reverseLinkedList: Exercise = {
  id: 'dsa-reverse-linked-list',
  title: 'Reverse a linked list',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 8,
  tags: ['dsa', 'linked-list', 'pointers'],
  prompt: `Reverse a singly linked list **in place** and return the new head.

The starter exports a \`ListNode\` class and two helpers the tests use, \`fromArray([1, 2, 3])\` and \`toArray(head)\`. Leave those as they are and implement only \`reverseList\`.

\`\`\`ts
toArray(reverseList(fromArray([1, 2, 3, 4, 5]))); // [5, 4, 3, 2, 1]
reverseList(null);                                // null
\`\`\`

**Constraints:** \`0 ≤ length ≤ 10⁵\`. Re-link the existing nodes; don't allocate new ones. A test reverses a 100,000-node list, so a recursive solution will likely overflow the call stack. An iterative solution is expected.

**What the interviewer is looking for:** pointer discipline. Save \`next\` before overwriting it, return the right node, and leave no cycle behind (the old head's \`next\` must become \`null\`). Draw the pointers and narrate each move.

**Expected complexity:** O(n) time, O(1) extra space.`,
  starter: reverseStarter,
  solution: reverseSolution,
  tests: reverseTests,
  hints: [
    'You need to point each node at the one BEFORE it. What do you need to remember so you don\'t lose the rest of the list when you overwrite `node.next`?',
    'Use three references: `prev` (starts as null), `curr` (starts at head), and a temporary `next` saved at the top of each loop iteration.',
    'Loop while curr is not null: `const next = curr.next; curr.next = prev; prev = curr; curr = next;`. When the loop ends, `prev` is the new head.',
  ],
  explanation: `**Brute force:** copy the values into an array, then write them back in reverse (or build new nodes). O(n) time but O(n) extra space, and it doesn't re-link the nodes, which the interviewer specifically asked for.

**Pattern:** iterative pointer reversal with three pointers. **Invariant:** \`prev\` is the head of the already-reversed part; \`curr\` is the head of the part not yet reversed.

**Walk-through (1 → 2 → 3):**

| step | prev | curr | list state |
|---|---|---|---|
| start | null | 1 | 1 → 2 → 3 |
| 1 | 1 | 2 | null ← 1 2 → 3 |
| 2 | 2 | 3 | null ← 1 ← 2 3 |
| 3 | 3 | null | null ← 1 ← 2 ← 3 |

Return \`prev\` (3).

**Complexity:** O(n) time, O(1) extra space.

**Edge cases:** empty list (loop doesn't run, return \`null\`); one node (its \`next\` is set to \`null\`, which it already was); two nodes; very long lists (iterative has no stack-depth limit).

**The recursive version:** \`if (!head || !head.next) return head; const newHead = reverse(head.next); head.next.next = head; head.next = null; return newHead;\` is elegant, but uses O(n) call-stack space, so it overflows on long lists. Mention it, then explain why you'd ship the iterative one.

**Common follow-ups:**
- *"Reverse only positions m to n"* → dummy head, walk to node m − 1, reverse n − m + 1 nodes with the same loop, then reconnect both ends.
- *"Reverse in groups of k"* → repeat the sub-list reversal per group; keep a pointer to the previous group's tail.
- *"Is a linked list a palindrome, in O(1) space?"* → find the middle with fast/slow pointers, reverse the second half, compare, (optionally) restore.`,
};

export const searchInsert: Exercise = {
  id: 'dsa-search-insert',
  title: 'Search insert position (lower bound)',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['dsa', 'binary-search'],
  prompt: `\`nums\` is sorted ascending and **may contain duplicates**. Return the **first** index \`i\` where \`nums[i] >= target\`: the index of the first occurrence of \`target\` if it's present, or where it would be inserted to keep the array sorted. Return \`nums.length\` if every element is smaller.

\`\`\`ts
searchInsert([1, 3, 5, 6], 5);       // 2
searchInsert([1, 3, 5, 6], 2);       // 1
searchInsert([1, 3, 5, 6], 7);       // 4
searchInsert([1, 2, 2, 2, 3], 2);    // 1  (the FIRST 2)
searchInsert([], 3);                 // 0
\`\`\`

**Constraints:** \`0 ≤ nums.length ≤ 10⁶\`. One test wraps a 1,000,000-element array in a \`Proxy\` and counts how many elements you read: a linear scan reads hundreds of thousands, binary search about 20.

**What the interviewer is looking for:** a binary search with a clearly stated invariant, correct boundaries (empty array, insert at the very end), and no infinite loop. Duplicates are the trap: returning as soon as \`nums[mid] === target\` finds *a* match, not the first.

**Expected complexity:** O(log n) time, O(1) space.`,
  starter: searchStarter,
  solution: searchSolution,
  tests: searchTests,
  hints: [
    'Think of the array as a sequence of booleans: `nums[i] >= target` is false, false, …, then true, true. You are looking for the first true.',
    'Use a half-open range: `lo = 0`, `hi = nums.length`, loop `while (lo < hi)`. Invariant: everything before `lo` is < target, everything from `hi` on is >= target.',
    'If `nums[mid] < target`, mid can\'t be the answer: `lo = mid + 1`. Otherwise mid might be the answer: `hi = mid` (not mid - 1). Return `lo` when the loop ends.',
  ],
  explanation: `**Brute force:** scan left to right and return the first \`i\` with \`nums[i] >= target\`. O(n). Fine for small inputs, but it ignores the fact that the input is sorted, which is the biggest hint in the problem.

**Bottleneck:** each comparison in a linear scan rules out one element. In a sorted array, one comparison at the middle rules out **half** of the remaining range.

**Pattern:** binary search for a boundary (lower bound) using the half-open template.

**Optimal:** \`lo = 0, hi = nums.length\`. While \`lo < hi\`: \`mid = lo + Math.floor((hi − lo) / 2)\`; if \`nums[mid] < target\` then \`lo = mid + 1\`, else \`hi = mid\`. Return \`lo\`.

**Why it's correct:** the invariant (left of \`lo\` → too small, from \`hi\` on → big enough) holds initially (both regions are empty) and after each update. The range \`[lo, hi)\` strictly shrinks because \`lo ≤ mid < hi\`. When \`lo === hi\`, that index is exactly the boundary.

**Walk-through (\`[1, 2, 2, 2, 3]\`, target 2):** lo 0, hi 5 → mid 2 (2 ≥ 2) → hi 2 → mid 1 (2 ≥ 2) → hi 1 → mid 0 (1 < 2) → lo 1. Return 1, the first 2.

**Complexity:** O(log n) time (~20 iterations for 10⁶), O(1) space.

**Edge cases:** empty array → 0 (the loop never runs); target smaller than everything → 0; bigger than everything → \`nums.length\`; all duplicates; negatives.

**Common follow-ups:**
- *"Find the first and last position of target"* → \`first = lowerBound(t)\`; \`last = lowerBound(t + 1) − 1\` for integers, or write \`upperBound\` with \`<=\`. Check \`first < length && nums[first] === t\`.
- *"Search in a rotated sorted array"* → at each step, one half is sorted. Decide whether target lies in it.
- *"Minimum capacity / speed / time such that…"* → the same template over the **answer space**, with a monotonic \`feasible(x)\` predicate instead of \`nums[mid] >= target\`.
- *"Why \`lo + (hi − lo) / 2\`?"* → in languages with fixed-size ints, \`lo + hi\` can overflow. In JS it's a habit worth showing, not a real bug at these sizes.`,
};

export const dailyTemperatures: Exercise = {
  id: 'dsa-daily-temperatures',
  title: 'Daily temperatures (monotonic stack)',
  runtime: 'logic',
  difficulty: 'stretch',
  estMinutes: 12,
  tags: ['dsa', 'monotonic-stack', 'stack'],
  prompt: `Given daily temperatures, return an array where \`answer[i]\` is the number of days after day \`i\` until a **strictly warmer** temperature, or \`0\` if none comes.

\`\`\`ts
dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]); // [1, 1, 4, 2, 1, 1, 0, 0]
dailyTemperatures([30, 40, 50, 60]);                 // [1, 1, 1, 0]
dailyTemperatures([70, 70, 70]);                     // [0, 0, 0]  (equal is not warmer)
\`\`\`

**Constraints:** \`0 ≤ temps.length ≤ 10⁵\`; temperatures may be negative. Don't mutate the input. A 50,000-day strictly decreasing input (the worst case for brute force) must finish in under 300 ms.

**What the interviewer is looking for:** recognising "next greater element" and reaching for a monotonic stack, explaining what the stack holds ("days still waiting for a warmer day"), and justifying O(n) with the push-once/pop-once argument.

**Expected complexity:** O(n) time, O(n) space.`,
  starter: tempsStarter,
  solution: tempsSolution,
  tests: tempsTests,
  hints: [
    'Brute force scans right from each day until it finds a warmer one: O(n²) on a decreasing sequence. Flip the question: when a warm day arrives, which earlier days does it answer?',
    'Keep a stack of INDICES of days that haven\'t found a warmer day yet. Their temperatures are non-increasing from bottom to top. Why must that be true?',
    'For each day i: while the stack is non-empty and temps[top] < temps[i], pop j and set answer[j] = i - j. Then push i. Days left on the stack keep 0.',
  ],
  explanation: `**Brute force:** for each \`i\`, scan \`j = i + 1…\` until \`temps[j] > temps[i]\`. O(n²) in the worst case (strictly decreasing temperatures: every scan runs to the end).

**Bottleneck:** cold days get re-scanned again and again. A single warm day answers *many* earlier days at once, and the brute force doesn't exploit that.

**Pattern:** monotonic (non-increasing) stack of unresolved indices.

**Walk-through (\`[73, 74, 75, 71, 69, 72, 76, 73]\`):**
- 73 → push 0. 74 > 73 → pop 0 (answer 1), push 1. 75 → pop 1 (1), push 2.
- 71, 69 → push 3, 4 (stack temps: 75, 71, 69, non-increasing).
- 72 → pops 4 (69, answer 1) and 3 (71, answer 2); 75 isn't colder, so stop; push 5.
- 76 → pops 5 (answer 1) and 2 (answer 4); push 6. 73 → push 7. End: 6 and 7 stay 0.

**Why O(n):** each index is pushed exactly once and popped at most once, so the inner \`while\` runs at most n times *in total*. Amortised O(1) per day.

**Complexity:** O(n) time, O(n) space (the stack holds up to n indices on a decreasing input).

**Edge cases:** empty input → \`[]\`; equal temperatures (use \`<\`, not \`<=\`, when popping, so equal days aren't "warmer"); decreasing input → all zeros; negatives work unchanged.

**Common follow-ups:**
- *"Next greater element in a circular array"* → loop \`2n\` times using \`i % n\`, only pushing during the first pass.
- *"Previous smaller element / stock span"* → same idea, different comparison or direction.
- *"Largest rectangle in a histogram"* → monotonic increasing stack; each pop computes the widest rectangle for that bar.
- *"Can you do it with O(1) extra space besides the output?"* → yes: iterate from the right and jump using the answers you've already computed (\`j += answer[j]\`). Still amortised O(n).`,
};
