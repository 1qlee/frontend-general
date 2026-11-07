## What the interviewer is actually grading

You are not graded on "got the optimal answer in silence". Almost every company scores a coding round on four or five axes, and a correct solution delivered badly can still be a "no hire". Know the rubric so you can deliberately show each signal.

| Signal | What a strong candidate visibly does | What sinks you |
|---|---|---|
| **Problem solving** | Clarifies, finds a working approach, improves it, reasons about complexity | Jumping into code, then rewriting three times |
| **Communication** | Narrates intent ("I'll keep a map from id to node so lookups are O(1)") | Silence for minutes, or narrating syntax ("now I type const…") |
| **Code quality** | Typed signature, clear names, small helpers, no input mutation unless agreed | One 60-line function called `solve` with `a`, `b`, `tmp` |
| **Verification** | Traces examples, tests edge cases *before* being asked, finds own bugs | "I think it works" |
| **Collaboration** | Uses hints quickly, asks focused questions, stays calm when corrected | Arguing with hints, or needing the same hint twice |

> [!INTERVIEW] The one-sentence framing
> Treat the round as **pair programming with a senior colleague who already knows the answer**. Your job is to make your thinking visible so they can say "hire" with evidence.

## The six-step script

Memorise the order. Under pressure you will not remember advice, but you *will* remember a script.

| # | Step | Share of time | Goal | Say this |
|---|---|---|---|---|
| 1 | **Clarify** | ~10% | Pin down inputs, outputs, constraints, edge cases | "Before I start, let me make sure I understand the inputs and outputs." |
| 2 | **Examples** | ~5% | 2–3 concrete cases, written down | "Let me write a normal case, an edge case and one tricky case." |
| 3 | **Approach + complexity** | ~10% | Agree on a plan before typing | "My plan is X. That's O(n) time, O(n) space. Shall I go ahead?" |
| 4 | **Code while narrating** | ~45% | Working, readable code | "First the signature… now the main loop… this helper handles…" |
| 5 | **Test** | ~15% | Trace examples, then edge cases, fix bugs | "Let me trace example 2 line by line." |
| 6 | **Optimise / follow-ups** | ~15% | Improve, discuss trade-offs, extend | "If inputs were huge, I'd change… Another follow-up could be…" |

### Step 1 — Clarify inputs, outputs and edge cases

Spend 2–5 minutes here even if the question looks obvious. It is the cheapest way to show seniority, and it prevents the worst outcome: solving the wrong problem.

**Clarifying checklist (pick the relevant ones, out loud):**

- [ ] **Types and shape** — "Is the input always an array of numbers, or could it contain `null`/strings?"
- [ ] **Empty / missing input** — "What should happen for an empty array or `undefined`?"
- [ ] **Duplicates and ordering** — "Can there be duplicates? Must I preserve input order?"
- [ ] **Mutation** — "Can I mutate the input, or should I return a new structure?"
- [ ] **Sync vs async** — "Can the callback return a promise? What happens if it rejects?"
- [ ] **`this` and arguments** — "Should the wrapped function preserve `this` and all arguments?"
- [ ] **Errors** — "Throw, return `null`, or return a default on invalid input?"
- [ ] **Scale** — "Roughly how big is n? Thousands or millions?" (decides whether O(n²) is fine)
- [ ] **Environment** — "Browser or Node? Can I use modern built-ins like `structuredClone` or `Object.groupBy`?"
- [ ] **API shape** — "Is this the signature you want, or can I adjust it?" (then write it in TypeScript)

> [!TIP]
> Write the agreed TypeScript signature at the top of the editor immediately. It locks in the contract and the interviewer can correct it before you have invested any time.

### Step 2 — Write 2–3 examples

Write them in the editor as comments or as executable checks: one **normal** case, one **edge** case (empty, single element, zero), and one **tricky** case (duplicates, nested, async rejection). They become your test cases in step 5, so this is not wasted time.

```ts run
// Turn your examples into executable checks before (or while) you code.
function check<T>(label: string, actual: T, expected: T): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`, ok ? '' : { actual, expected });
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size must be a positive integer');
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

check('normal', chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
check('empty input', chunk([], 3), []);
check('size larger than array', chunk([1, 2], 5), [[1, 2]]);
try {
  chunk([1], 0);
  console.log('FAIL invalid size did not throw');
} catch (e) {
  console.log('PASS invalid size throws:', (e as Error).message);
}
```

### Step 3 — State the approach and its complexity

Say the plan in two or three sentences, give time and space complexity, and **ask for buy-in**. If you only see a brute-force solution, say so and offer it: a working O(n²) beats an unfinished O(n).

- "The brute force is to compare every pair, O(n²). I think we can do O(n) with a hash map of value to index. I'll go with the map unless you'd like me to start simpler."
- "I'll do this recursively because the input is a tree; recursion depth is the tree height, so for very deep trees I'd switch to an explicit stack."

### Step 4 — Code while narrating

Narrate **intent and decisions**, not keystrokes. A good rhythm: say what the next block will do, write it, then say one sentence about why.

- Write the **signature and return type first**, then the happy path, then edge-case guards.
- **Stub helpers** with a name and signature ("`parsePath` turns `'a.b[0]'` into `['a', 'b', '0']`, I'll fill it in after the main logic") — it keeps momentum and shows decomposition.
- Use **descriptive names** (`pendingCount`, `nodeById`), early returns, `const` by default.
- Keep inputs immutable unless you agreed otherwise.
- If you notice a bug mid-way, say so: "I just realised this breaks for an empty array, I'll add a guard here." Self-correction is a positive signal.

### Step 5 — Test with your examples and edge cases

Do not say "I think that works". **Trace** one example line by line, tracking variable values out loud, then run the edge cases. If the environment can execute code, run it, but still trace once: interviewers want to see you can reason without a debugger.

1. Trace the normal example through the code, naming variable values.
2. Run the edge cases from step 2.
3. Ask yourself the edge-case checklist below.
4. When you find a bug, explain the cause before you fix it.

### Step 6 — Optimise and discuss follow-ups

Restate the final complexity, then offer improvements and trade-offs before the interviewer asks. Common follow-ups for frontend questions:

| Follow-up | What they want to hear |
|---|---|
| "Can you make it faster?" | Better data structure (Map/Set), avoid repeated work (memoise, precompute), early exit |
| "What about huge inputs?" | Streaming/chunking, avoiding recursion depth limits, yielding to the main thread |
| "What if it's async?" | Ordering, error propagation, cancellation (`AbortController`), concurrency limits |
| "How would you test this?" | Table of cases, fake timers for time-based code, property-style edge cases |
| "How would you make it production-ready?" | Types, input validation, error messages, docs, memory (WeakMap, cleanup) |

## Phrase bank

| Moment | Phrases that work |
|---|---|
| Starting | "Let me restate the problem to check I've got it." · "I'll ask a few quick questions first." |
| Choosing | "There are two approaches; I'll start with the simpler one and improve it." |
| Complexity | "This is O(n log n) because of the sort; the rest is linear." |
| Coding | "I'm going to write the happy path first, then handle edge cases." |
| Pausing | "Give me 20 seconds to think this through quietly." |
| Self-correcting | "Wait, this double-counts when there are duplicates. Let me fix the condition." |
| Testing | "Let me trace this with the second example." · "What happens with an empty input? It returns early here. Good." |
| Time pressure | "Given time, I'll leave this optimisation as a comment and make sure the core works." |
| Wrapping up | "Final complexity is O(n) time and space. With more time I'd add X and test Y." |

## When you're stuck

Being stuck is normal; going **silent** while stuck is what hurts. Run this protocol out loud:

1. **Say it.** "I'm stuck on how to handle the nested case. Let me think out loud."
2. **Go back to the examples.** Solve one by hand and notice what *you* did. That is the algorithm.
3. **Shrink the problem.** Solve it for one level of nesting, one element, or synchronous code first.
4. **Brute force first.** Get something correct, then optimise.
5. **Change the data structure.** Most frontend questions unlock with a `Map`, a `Set`, a stack, or a queue.
6. **Work backwards** from the desired output.
7. **Ask a targeted question.** Not "can I have a hint?" but "I'm deciding between recursion and an explicit stack. Is recursion depth a concern here?"

> [!INTERVIEW] Script for blanking
> "I want to be transparent: I don't see the optimal approach yet. Let me get a correct brute-force solution down first, and then we can look at where it does repeated work."

## How to take hints

A hint means the interviewer **wants you to pass** and is trying to get you to the part of the rubric they still need to score. Taking a hint well is itself a scored signal.

| Interviewer says | What it usually means | Your move |
|---|---|---|
| "What's the complexity of that?" | It's worse than you think, or they want you to say it | Calculate honestly, then look for repeated work |
| "What if the input were empty / had duplicates?" | You have a bug there | Trace that case now |
| "Is there a data structure that would help?" | Use a Map/Set/stack/heap | Name candidates out loud and pick one |
| "Let's not worry about X." | You're over-engineering | Drop it immediately, acknowledge |
| "Interesting, walk me through that line." | That line is wrong | Trace it slowly; don't defend it |
| "We have about 10 minutes left." | Prioritise | Finish the core, list the rest verbally |

- **Restate the hint** in your own words, then **apply it visibly**.
- **Don't argue.** If you disagree, say "That's a good point. My concern was X; does that matter here?"
- **Don't need the same hint twice.** Write a comment in the code if you must.

## Frontend-flavoured question types

Frontend coding rounds lean on four families more than on classic algorithm puzzles. Each has a small number of tricks that unlock most questions.

| Family | Typical prompts | The key trick |
|---|---|---|
| **Utility implementations** | `debounce`, `throttle`, `once`, `memoize`, `curry`, `deepClone`, `deepEqual`, `flatten`, `get(obj, path)`, `EventEmitter`, `classnames`, `Function.prototype.bind` | A **closure** holds the state (timer id, cache, flag). Return a `function` (not an arrow) when you must preserve `this` and forward `...args` |
| **Async control flow** | `Promise.all/allSettled/race/any`, `promisify`, `retry` with backoff, concurrency-limited map, `timeout`, sequential execution, cancel previous request | Count completions, **store results by index**, and decide where rejections go. For concurrency: a **worker pool** sharing one cursor |
| **DOM traversal** | `getElementsByClassName`, find the same node in a mirrored tree, serialise DOM to JSON, event delegation, find text nodes | **DFS with an explicit stack** (or recursion) over `element.children`; for delegation, `event.target.closest(selector)` plus `root.contains(match)` |
| **Data transforms** | `groupBy`, flatten/unflatten nested keys, list to tree (`parentId`), normalise entities, diff two objects, LRU cache, parse query strings | **One pass with a `Map`** (id → node), then link. LRU: a `Map` keeps insertion order, so delete + set on access and evict `map.keys().next().value` |
| Classic algorithms (less common, still asked) | two-sum, valid brackets, sliding window, binary search, BFS on a grid | Hash map, stack, two pointers, queue |

### Utility implementations: details interviewers probe

| Utility | Gotchas to mention unprompted |
|---|---|
| `debounce` | Preserve `this`/args; `clearTimeout` on every call; follow-ups: `leading`, `cancel()`, `flush()`, `maxWait` |
| `throttle` | Leading vs trailing call; the trailing call must use the **latest** args |
| `memoize` | Cache key (`resolver` or `JSON.stringify` and its limits); `WeakMap` for object keys; for async functions cache the **promise** and evict on rejection |
| `deepClone` | Cycles (a `WeakMap` of seen objects), `Date`, `Map`, `Set`, arrays, prototypes; mention `structuredClone` exists (cannot clone functions or DOM nodes) |
| `deepEqual` | `Object.is` for primitives (`NaN`, `-0`), arrays vs objects, key count, recursion, cycles |
| `EventEmitter` | `Map<string, Set<Listener>>`; **copy listeners before emitting** so `off` inside a handler is safe; `once` wraps; `on` returns an unsubscribe function |
| `bind` | Partial application of args; `new` on a bound function ignores the bound `this` |

### Async control flow: the concurrency pool

The pattern behind "fetch 100 URLs, at most 5 at a time" and "promise pool". Start `limit` workers; each one claims the next index **synchronously**, awaits it, and loops.

```ts run
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0; // shared cursor

  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++; // claimed synchronously, so no two workers get the same index
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let inFlight = 0;
let peak = 0;

const out = await mapWithConcurrency([30, 10, 20, 5, 15], 2, async (ms, i) => {
  inFlight++;
  peak = Math.max(peak, inFlight);
  await sleep(ms);
  inFlight--;
  return `task${i}:${ms}ms`;
});

console.log(out); // input order preserved
console.log('peak in flight:', peak); // never exceeds 2
```

Follow-ups to pre-empt: "If one task rejects, `Promise.all` rejects but the other workers keep running; to stop them, check a `failed` flag or an `AbortSignal` in the loop." "For `allSettled` semantics, store `{ status, value | reason }` instead."

### DOM traversal: the iterative DFS template

```ts
function findAll(root: Element, predicate: (el: Element) => boolean): Element[] {
  const result: Element[] = [];
  const stack: Element[] = [root];
  while (stack.length) {
    const el = stack.pop()!;
    if (predicate(el)) result.push(el);
    // push children in reverse so they're visited in document order
    for (let i = el.children.length - 1; i >= 0; i--) stack.push(el.children[i]);
  }
  return result;
}
```

Mention: `children` (elements only) vs `childNodes` (includes text and comments); `classList.contains` for class matching (not substring checks on `className`); and that `TreeWalker` exists for text-node searches.

### Data transforms: the "index then link" pattern

List → tree with `parentId`: first pass builds `Map<id, node>`, second pass pushes each node into its parent's `children` (or into `roots`). O(n) instead of O(n²) nested searching. The same "build an index first" idea solves normalisation, joins and diffing.

## Edge-case checklist by input type

| Input | Always consider |
|---|---|
| Arrays | empty, one element, duplicates, negatives/zero, already sorted, very large, sparse holes |
| Strings | empty, whitespace, case, unicode/emoji (`'😀'.length === 2`), very long |
| Numbers | `0`, `-0`, `NaN`, `Infinity`, floats (`0.1 + 0.2`), integer overflow past `Number.MAX_SAFE_INTEGER` |
| Objects | `null`, nested, cycles, arrays-as-objects, inherited vs own keys, symbol keys |
| Functions | `this` binding, argument count, return value forwarding, thrown errors |
| Async | rejection, ordering of completion vs input order, timeouts, cancellation, empty input (`Promise.all([])` resolves immediately) |
| Timers | called again before the timer fires, cleanup/cancel, fake timers in tests |

## Time plans

### 45-minute round

| Minutes | Activity |
|---|---|
| 0–3 | Introductions (keep yours to 30 seconds) |
| 3–8 | Clarify, write signature, write 2–3 examples |
| 8–11 | Approach + complexity, get buy-in |
| 11–30 | Code while narrating (aim for a working version by minute 30) |
| 30–37 | Trace examples, edge cases, fix bugs |
| 37–42 | Optimise, follow-up questions |
| 42–45 | Your questions for them |

### 30-minute round

| Minutes | Activity |
|---|---|
| 0–4 | Clarify and examples (one normal, one edge) |
| 4–6 | Approach + complexity |
| 6–20 | Code |
| 20–25 | Test and fix |
| 25–30 | One follow-up, wrap-up |

> [!TIP]
> If the round has **two problems**, the first is usually a warm-up. Budget a third of the time for it, at most. Say "I'll keep this one brief so we have time for the next."

## Code-quality signals that are cheap to show

- [ ] Typed signature with generics where natural (`<T>(items: readonly T[]) => T[][]`)
- [ ] Guard clauses at the top, happy path unindented
- [ ] Descriptive names; no single letters except loop indices
- [ ] Pure functions; inputs not mutated
- [ ] Timers, listeners and subscriptions cleaned up (and a `cancel` exposed if relevant)
- [ ] One clear helper rather than duplicated logic
- [ ] Final complexity stated out loud

> [!MISTAKE]
> Coding before the interviewer agrees on the approach. If your plan has a flaw, you will discover it at minute 25 and have to restart. Ten seconds of "Does that approach sound reasonable?" saves the round.

> [!MISTAKE]
> Silently debugging. When something fails, keep talking: "The output has an extra element, so my loop bound is probably off by one. Let me check the condition."

> [!MISTAKE]
> Optimising prematurely. Interviewers almost always prefer a correct simple solution followed by a discussion of the faster one over a half-finished clever one.

## Key takeaways

- Follow the script: **clarify → examples → approach + complexity → code while narrating → test → optimise**.
- Write the TypeScript signature and examples first; they become your contract and your tests.
- Narrate *intent*, not keystrokes. Silence is the most common reason good engineers fail.
- When stuck, say so, return to the examples, brute force, then reach for a Map/Set/stack.
- Hints are help: restate them, apply them visibly, never argue.
- Most frontend questions reduce to four tricks: closures for state, results-by-index for async, DFS with a stack for the DOM, and "index with a Map, then link" for data.
