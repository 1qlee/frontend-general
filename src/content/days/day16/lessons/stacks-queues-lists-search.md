## Why these four structures

Stacks, queues, linked lists and binary search show up constantly in easy and medium rounds because they test whether you can **maintain an invariant precisely**. The code is short, but the off-by-one errors and the "what happens when it's empty?" questions are where candidates lose points. They're also the structures you already use as a frontend developer, often without naming them: the undo stack in an editor, browser history, the event loop's task queue, React's linked list of hooks on a fiber.

## Stacks: last in, first out

A stack supports `push` and `pop` at one end, both O(1). In JavaScript a plain array is a perfectly good stack: `push`, `pop`, and `stack[stack.length - 1]` (or `stack.at(-1)`) to peek.

**Recognition cues:** matching/nesting (brackets, tags, nested structures), "most recent unmatched…", undo/back, evaluating expressions, processing something that must be "closed" in reverse order, "next greater/smaller element".

### Matching brackets

The classic warm-up. Every closer must match the **most recent** unmatched opener, which is exactly what a stack gives you.

```ts run
function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: string[] = [];
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (stack.pop() !== pairs[ch]) return false; // wrong type, or nothing to close
  }
  return stack.length === 0; // leftover openers are unclosed
}

for (const s of ['()[]{}', '([)]', '{[]}', '(', ')', '']) console.log(JSON.stringify(s), isValid(s));
```

Three edge cases to name out loud: a closer with an **empty** stack (`")"`), **leftover** openers (`"("`), and **interleaving** (`"([)]"`), which is why counting brackets per type isn't enough.

> [!MISTAKE]
> Solving bracket matching with counters (`open++`, `open--`). Counters accept `"([)]"` and `")("` (if you only check the final count). Nesting needs to remember *order*, and that's a stack.

### Undo and browser history: two stacks

An undo/redo system is two stacks. A new action pushes onto `undo` and **clears** `redo`. Undo pops from `undo` and pushes to `redo`, and redo does the reverse. Browser back/forward works the same way: navigating to a new page after going back throws away the forward history.

```ts run
class History<T> {
  private back: T[] = [];
  private forward: T[] = [];
  constructor(private current: T) {}
  visit(page: T) {
    this.back.push(this.current);
    this.current = page;
    this.forward = []; // a new branch discards the redo stack
  }
  goBack() {
    const prev = this.back.pop();
    if (prev !== undefined) { this.forward.push(this.current); this.current = prev; }
    return this.current;
  }
  goForward() {
    const next = this.forward.pop();
    if (next !== undefined) { this.back.push(this.current); this.current = next; }
    return this.current;
  }
}

const h = new History('/home');
h.visit('/docs'); h.visit('/docs/api');
console.log(h.goBack(), h.goBack(), h.goForward());
h.visit('/blog');
console.log(h.goForward()); // nothing forward any more
```

### Monotonic stack: next greater element

**Cue:** "for each element, find the next (or previous) element that is greater/smaller", including "days until a warmer temperature", "stock span", "largest rectangle in histogram".

Brute force: for each i, scan right until you find something bigger, O(n²). The insight: keep a stack of indices **still waiting for their answer**. Their values are non-increasing from bottom to top, because anything smaller below a new value would already have been answered. When a new value arrives, it is the answer for every waiting element smaller than it, and those are all on top.

```ts run
function nextGreater(nums: number[]): number[] {
  const result = new Array<number>(nums.length).fill(-1);
  const waiting: number[] = []; // indices; values non-increasing bottom → top
  for (let i = 0; i < nums.length; i++) {
    while (waiting.length && nums[waiting.at(-1)!] < nums[i]) {
      result[waiting.pop()!] = nums[i]; // nums[i] is the first bigger value to its right
    }
    waiting.push(i);
  }
  return result; // anything still waiting has no greater element
}

console.log(nextGreater([2, 1, 2, 4, 3])); // [4, 2, 4, -1, -1]
```

**Complexity:** O(n). Each index is pushed once and popped at most once, so the inner `while` does at most n pops *in total* (amortised analysis from the first lesson). Space O(n) for the stack. You'll do the "daily temperatures" variant in the exercises.

> [!INTERVIEW] Say it like this
> "I keep a stack of indices that haven't found a greater element yet. The stack stays monotonically decreasing, so when a bigger value arrives it resolves everything smaller on top. Every index is pushed and popped at most once, so it's O(n) overall even though there's a loop inside a loop."

## Queues: first in, first out

A queue adds at the back and removes from the front. You use queues for breadth-first search (DS&A II), task scheduling, rate-limited request queues, and you already know the most famous one: the event loop's task queue.

### Why `shift()` is the wrong tool

`arr.shift()` removes index 0, so every remaining element has to move down by one: **O(n)**. A BFS that `shift()`s n times is accidentally O(n²). (Engines have some optimisations for small arrays, but you can't rely on them, and interviewers expect you to know this.)

The simplest fix in an interview is an **index pointer**: never remove from the front, just move a `head` index forward.

```ts run
class Queue<T> {
  private items: T[] = [];
  private head = 0;
  enqueue(item: T) { this.items.push(item); }
  dequeue(): T | undefined {
    if (this.head === this.items.length) return undefined;
    const item = this.items[this.head++];
    // optional: compact occasionally so memory doesn't grow forever
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }
  get size() { return this.items.length - this.head; }
}

const n = 100_000;
let t = performance.now();
const arr: number[] = Array.from({ length: n }, (_, i) => i);
while (arr.length) arr.shift();
console.log('array.shift x', n, Math.round(performance.now() - t), 'ms');

t = performance.now();
const q = new Queue<number>();
for (let i = 0; i < n; i++) q.enqueue(i);
while (q.size) q.dequeue();
console.log('index queue x', n, Math.round(performance.now() - t), 'ms');
```

> [!NOTE]
> Your timings depend on the engine. V8 has fast paths for `shift` on some arrays, so the gap can be smaller than the theory suggests. The interview answer is still "shift is O(n) in general; I'll use a head pointer", and you can add "or a linked list, or a ring buffer if the queue size is bounded".

## Linked lists

A singly linked list is a chain of nodes, each holding a value and a `next` reference. Access by index is O(n), but inserting or removing *at a node you already hold* is O(1), because no shifting is needed. That's why the LRU cache from the performance day pairs a `Map` (O(1) lookup) with a doubly linked list (O(1) move-to-front).

```ts
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}
```

Interviewers use linked lists to test **pointer discipline**: can you re-wire references without losing part of the list?

### Reverse a list iteratively

Three pointers. Save `next` before you overwrite it.

```ts run
class ListNode {
  constructor(public val: number, public next: ListNode | null = null) {}
}
const fromArray = (vals: number[]) => vals.reduceRight<ListNode | null>((next, v) => new ListNode(v, next), null);
const toArray = (head: ListNode | null) => { const out: number[] = []; for (let n = head; n; n = n.next) out.push(n.val); return out; };

function reverse(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;
  while (curr) {
    const next = curr.next; // save
    curr.next = prev;       // flip
    prev = curr;            // advance
    curr = next;
  }
  return prev;
}

console.log(toArray(reverse(fromArray([1, 2, 3, 4]))));
```

Draw it: `null ← 1   2 → 3 → 4` with `prev` on 1 and `curr` on 2. Narrating the pointer moves with a tiny diagram is much easier for the interviewer to follow than code alone.

A recursive version exists and is elegant, but it uses O(n) call-stack space and will overflow the stack on long lists (tens of thousands of nodes). Mention it as an alternative, then pick iterative.

### The dummy head

Whenever the head itself might change (removing nodes, merging two lists, inserting at the front), create a **dummy** node that points at the head. Every real node then has a predecessor, so there's no special case. Return `dummy.next`.

```ts run
class ListNode {
  constructor(public val: number, public next: ListNode | null = null) {}
}
const fromArray = (vals: number[]) => vals.reduceRight<ListNode | null>((next, v) => new ListNode(v, next), null);
const toArray = (head: ListNode | null) => { const out: number[] = []; for (let n = head; n; n = n.next) out.push(n.val); return out; };

function removeAll(head: ListNode | null, val: number): ListNode | null {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next) {
    if (prev.next.val === val) prev.next = prev.next.next; // unlink; don't advance
    else prev = prev.next;
  }
  return dummy.next;
}

console.log(toArray(removeAll(fromArray([7, 7, 1, 7, 2]), 7))); // the head changes, no special case
```

### Fast and slow pointers

Move `slow` one step and `fast` two steps at a time.

- **Middle of the list:** when `fast` reaches the end, `slow` is in the middle.
- **Cycle detection (Floyd's algorithm):** if there's a cycle, `fast` eventually laps `slow` and they meet. If `fast` hits `null`, there's no cycle. O(n) time, O(1) space, versus O(n) space for a `Set` of visited nodes.

```ts run
class ListNode {
  constructor(public val: number, public next: ListNode | null = null) {}
}

function middle(head: ListNode | null): ListNode | null {
  let slow = head;
  let fast = head;
  while (fast && fast.next) { slow = slow!.next; fast = fast.next.next; }
  return slow; // for even lengths: the second of the two middles
}

function hasCycle(head: ListNode | null): boolean {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true; // compare NODES (references), not values
  }
  return false;
}

const nodes = [1, 2, 3, 4, 5].map((v) => new ListNode(v));
nodes.forEach((n, i) => (n.next = nodes[i + 1] ?? null));
console.log(middle(nodes[0])?.val, hasCycle(nodes[0]));
nodes[4].next = nodes[1]; // 5 → 2 creates a cycle
console.log(hasCycle(nodes[0]));
```

{{quiz:fast-slow-cycle}}

## Binary search: one template you trust

Binary search halves the search space each step: O(log n). On a million elements that's about 20 steps. It's famously easy to get subtly wrong, so learn **one** template and the invariant behind it, and use it everywhere.

**Recognition cues:** sorted input; "find the first/last position…"; "minimum X such that…" or "maximum X such that…"; n or the value range is huge (10⁹), which rules out scanning.

### The lower-bound template (half-open range)

Find the **first index `i` where `nums[i] >= target`** (returns `nums.length` if none).

```ts run
function lowerBound(nums: number[], target: number): number {
  let lo = 0;
  let hi = nums.length; // half-open: the answer is in [lo, hi]
  // Invariant: everything before lo is < target; everything from hi on is >= target.
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] < target) lo = mid + 1; // mid is definitely NOT the answer
    else hi = mid;                         // mid MIGHT be the answer: keep it
  }
  return lo; // lo === hi: the boundary
}

const sorted = [1, 3, 3, 3, 8, 10];
console.log(lowerBound(sorted, 3));  // first 3
console.log(lowerBound(sorted, 4));  // where 4 would be inserted
console.log(lowerBound(sorted, 99)); // nums.length
// "Does it exist?" is one extra check:
const i = lowerBound(sorted, 8);
console.log(i < sorted.length && sorted[i] === 8);
```

Why this template is reliable:

1. **The invariant** tells you which way to move: `nums[mid] < target` means mid and everything left of it are "too small" → `lo = mid + 1`. Otherwise mid is a candidate → `hi = mid` (not `mid - 1`, or you could skip the answer).
2. **Termination:** `mid` is always in `[lo, hi)`, so each iteration shrinks the range. With `lo < hi` and `hi = mid`, there's no infinite loop.
3. **One template, many questions:** first occurrence = `lowerBound(t)`; last occurrence = `lowerBound(t + 1) - 1` for integers (or an `upperBound` with `<=`); insert position = `lowerBound(t)`; count of `t` = `upperBound - lowerBound`.

### Off-by-one traps

| Trap | Symptom | Fix |
|---|---|---|
| `while (lo <= hi)` with `hi = mid` | infinite loop when `lo === hi` | Pair `<` with `hi = mid`, or `<=` with `hi = mid - 1`; never mix |
| `hi = nums.length - 1` with the half-open template | can never return `nums.length` (insert at end) | Start `hi = nums.length` |
| `hi = mid - 1` when mid might be the answer | skips the first occurrence | Only exclude mid when you've *proven* it isn't the answer |
| Returning `mid` when `nums[mid] === target` | returns *an* occurrence, not the first | Keep narrowing; return `lo` at the end |

> [!TIP]
> Test every binary search mentally on three tiny inputs: an empty array, one element (target smaller, equal, larger), and two equal elements. If all of those work, the template is right.

### Binary search on the answer space

The most valuable trick in this lesson. If you can write a function `feasible(x)` that is **monotonic** (false, false, …, false, true, true, …), you can binary search over **x** itself, even when there is no array.

Example: *"Ship packages (in order) within D days. What's the minimum ship capacity?"* If capacity c works, any bigger capacity also works, so it's monotonic. The answer lies between `max(weight)` and `sum(weights)`.

```ts run
function minCapacity(weights: number[], days: number): number {
  const canShip = (cap: number) => {
    let needed = 1;
    let load = 0;
    for (const w of weights) {
      if (load + w > cap) { needed++; load = 0; }
      load += w;
    }
    return needed <= days;
  };
  let lo = Math.max(...weights);               // smallest capacity that could work
  let hi = weights.reduce((a, b) => a + b, 0); // definitely works (everything on day 1)
  while (lo < hi) {                            // same template: first x where canShip(x) is true
    const mid = lo + Math.floor((hi - lo) / 2);
    if (canShip(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

console.log(minCapacity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)); // 15
```

Complexity: O(n · log(sum)) — log(range) iterations, each doing an O(n) feasibility check. Phrases to recognise this: "minimum maximum", "smallest X such that", "at least/at most within K".

Frontend connection: this is how "binary search for the largest font size that fits the container" works, and how virtualised lists find the first visible row from a scroll offset when rows have variable heights (binary search over cumulative offsets, which are prefix sums).

{{quiz:binary-search-answer}}

> [!INTERVIEW] Say it like this
> "I use one binary search template: a half-open range, and the loop finds the first index where a monotonic predicate becomes true. The invariant is that everything before `lo` fails and everything from `hi` on passes, so when they meet I've found the boundary. The same template works on an index range or on an answer range like 'minimum capacity'. All it needs is a monotonic yes/no check."

## Key takeaways

- **Stack:** nesting, matching, undo/history, monotonic stack for next greater/smaller (O(n) because each index is pushed and popped once).
- **Queue:** FIFO; `shift()` is O(n), so use a head-index queue (or a linked list or ring buffer).
- **Linked lists:** save `next` before re-wiring; use a dummy head when the head can change; fast/slow pointers find the middle and detect cycles in O(1) space.
- **Binary search:** one half-open lower-bound template with a stated invariant; mid is excluded only when proven wrong; works on any monotonic predicate, including answer spaces.
