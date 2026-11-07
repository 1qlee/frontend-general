## Goal

Build a **stress-testing harness** for your DS&A solutions in fe-gym. You write the optimised solution yourself. Claude writes three supporting pieces: (a) a slow but obviously correct **brute-force reference**, (b) a **seeded random input generator**, and (c) a Vitest **differential test** that runs both over hundreds of random cases and reports the *smallest* input where they disagree. Then you plant a bug, debug it from a minimal counterexample, and see how property-based testing (fast-check) does the same thing at industrial strength.

## Why it matters

Hand-written examples only test the cases you already thought of. The bugs that cost you an interview (or a production incident) are the ones you didn't think of: an empty grid, a coin larger than the amount, a duplicate edge. Competitive programmers catch these with stress tests: a brute force that is too slow to submit but easy to trust, compared against the fast solution on random small inputs. It's also a good fit for an agent. The brute force and the generator are boilerplate that's easy to check, while the interesting code stays yours. The tests give Claude and you a shared way to check the work.

## 1. Set the ground rules (3 min)

Start Claude Code in fe-gym (`claude`, or `/clear` an open session). Add this to the coaching section of `CLAUDE.md` (or ask Claude to add it and review the diff):

```text
DS&A practice: I write the optimised solutions in src/drills/dsa/*.ts myself.
Never edit those files or suggest their implementation unless I ask.
You may write brute-force references, generators and tests next to them.
```

## 2. Write your solution — no AI (8 min)

In your editor, create `src/drills/dsa/coinChange.ts` and implement `coinChange(coins: number[], amount: number): number` from memory (bottom-up DP; `-1` when impossible). Talk through the state, transition and base case while you type. Don't run anything yet.

## 3. Brute force and generator (6 min)

Switch to plan mode (**Shift+Tab**) so you can review the approach before any files change:

```text
Read @src/drills/dsa/coinChange.ts but don't change it.
Plan two new files:
1. src/drills/dsa/coinChange.brute.ts: coinChangeBrute(coins, amount). Use the most obviously
   correct algorithm possible (plain recursion trying every coin, no caching, no cleverness).
   It only needs to work for amount <= 25.
2. src/test/random.ts: a seeded PRNG (mulberry32) and helpers: randInt(rng, lo, hi),
   randArray(rng, len, lo, hi). Same seed => same sequence.
Explain why the brute force is trustworthy and what input sizes it can handle.
```

Check the plan: the brute force must not share logic with your solution (a "reference" that reuses your DP inherits your bugs), and the PRNG must take a seed, so `Math.random` is out. Approve it when it's right.

> [!AGENT] Keep the oracle dumb
> A reference implementation is only useful if you can check it **by reading it**. If Claude's brute force contains memoization, sorting tricks or early exits, ask for a simpler one. Slow is fine: it only runs on tiny inputs.

## 4. The differential test (8 min)

```text
Write src/drills/dsa/coinChange.stress.test.ts (Vitest):
- For seed = 1..500: build an rng from the seed, generate coins (1-4 distinct values
  in 1..10) and amount (0..25), and compare coinChange vs coinChangeBrute.
- Generate SMALL cases first (sizes grow with the seed) so the first failure is small.
- Collect every failing case and sort them by (coins.length + amount). Fail with ONE
  message showing the smallest case as JSON, both outputs and its seed, so I can paste
  it into a regular unit test.
- No snapshot files and no retries. Keep it under 2 seconds.
Don't touch coinChange.ts.
```

Run it:

```bash
npm test -- --run src/drills/dsa/coinChange.stress
```

If it's green on the first run, good, but check that it can fail. A test that has never failed hasn't shown you anything yet.

## 5. Debug from a minimal counterexample (6 min)

Plant a realistic bug in **your** solution. For example, loop `a < amount` instead of `a <= amount`, or skip the `c <= a` check so `dp[a - c]` reads a negative index. Run the stress test again. You should get something like:

```text
Smallest failing case (seed 2): {"coins":[1],"amount":1}
  coinChange      => -1
  coinChangeBrute => 1
```

Debug it **yourself** from that input: trace the `dp` array by hand for `amount = 1`. A 2-element counterexample takes seconds to trace, where a 40-element one would take minutes. That's why you sort by size. When you've found it, turn the counterexample into a permanent regression test in `coinChange.test.ts`, then revert the bug.

Then ask for a review, not a fix:

```text
The stress test found {"coins":[1],"amount":1}. I've fixed it. Without editing my
solution, tell me whether any other input class is NOT covered by the generator
(e.g. coins larger than amount, amount = 0, a single coin). Extend the generator if so.
```

## 6. The industrial version: property-based testing (4 min)

Ask for a short comparison, and install the library only if you want to keep it:

```text
Show me how this stress test would look with fast-check (fc.assert + fc.property,
with seed and numRuns parameters). Explain shrinking and how it compares with my
"sort failures by size" approach. Don't install anything yet.
```

Key ideas to take away: fast-check generates inputs from **arbitraries** (`fc.array(fc.integer({ min: 1, max: 10 }))`), and when a property fails it **shrinks** the input automatically to a minimal counterexample and prints the seed so you can replay it. Properties don't need a brute force. They can be **invariants**, such as "the coins in the returned combination sum to `amount`" or "`levelOrder(t).flat()` has the same values as the tree".

## Verify

```bash
npm test -- --run src/drills/dsa             # unit + stress tests green
git diff --stat -- src/drills/dsa/coinChange.ts   # only YOUR edits (check git log too)
```

Optionally repeat steps 3–4 for `numIslands` (brute force: union-find or a recursive flood fill on grids up to 5×5) or `topKFrequent` (brute force: sort all counts). Use a property that ignores order.

## Reflect (write in `notes/dsa-stress.md`)

- What was the smallest counterexample, and how long did it take to understand compared with a large failing input?
- Did Claude's first brute force reuse any logic from your solution? How did you notice?
- Which edge cases did the generator miss at first?
- Where would a differential test pay off at work? Think of a refactor of a pure function, an old parser against a new one, or a fast path against a slow path.

> [!INTERVIEW] "How do you know your algorithm is correct beyond the examples?"
> "I test it in layers. First I trace the given examples and the edge cases: empty input, a single element, the impossible case. For anything subtle I stress-test it. I write a brute force that's too slow to ship but easy to trust, generate a few hundred small random inputs from a fixed seed, and compare the two outputs, reporting the smallest disagreement. That smallest input is usually enough to see the bug at a glance, and it becomes a regression test. In production code I'd use property-based testing with fast-check, which shrinks failures automatically. I also use an AI agent for the boilerplate: the reference, the generator and the harness. The optimised code stays mine, and the tests are how I check both."
