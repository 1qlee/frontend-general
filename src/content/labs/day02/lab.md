## Goal

Run the full **Explore → Plan → Code → Commit** loop on a real utility. You describe a spec for `mapWithConcurrency(items, limit, fn)`; Claude, starting in **plan mode**, proposes test cases; you edit the plan; Claude writes **failing** Vitest tests (with fake timers) and commits them. Then *you* implement it — no AI — and Claude reviews your code against the tests without rewriting it.

## Why this matters professionally

"Write the tests first, then make them pass without touching the tests" is the single most reliable way to get correct code out of an agent. Tests turn a vague request into a contract that both of you can check. Plan mode adds a cheap checkpoint *before* any file changes. Reviewing a five-line plan takes thirty seconds; reviewing a wrong 200-line diff takes much longer. Teams that work this way merge agent-assisted code with confidence. Teams that skip it end up with "it looked right" bugs.

## 1. Explore in plan mode (5 min)

Start a fresh session in fe-gym (`claude`, or `/clear` if one is open). Press **Shift+Tab** until the mode indicator shows **plan mode**. You can also start in it directly:

```bash
claude --permission-mode plan
```

In plan mode Claude can read and research but won't edit files or run state-changing commands until you approve a plan. Start with exploration only:

```text
Read CLAUDE.md, vite.config.ts, src/test/setup.ts and the existing tests in src/drills/.
Summarise how tests are written and run in this repo. Don't propose any code yet.
```

Check the summary against what you know. If it's wrong about something (for example, it thinks `globals: true`), correct it now. A wrong mental model at this stage spreads into everything Claude writes after it.

## 2. Describe the spec and get a test plan (8 min)

You implemented this in the app today. Now you're the one writing the requirements. Stay in plan mode and send:

```text
I want to TDD a utility. We're planning — don't write files yet.

Spec: mapWithConcurrency<T, R>(items: readonly T[], limit: number,
  fn: (item: T, index: number) => Promise<R>): Promise<R[]>
- Results are in input order.
- Never more than `limit` calls in flight, and a freed slot starts the next item
  immediately (a pool, not fixed batches).
- fn receives (item, index).
- The first rejection rejects the whole call; no NEW items start after it
  (calls already in flight may finish).
- limit must be a positive integer, otherwise reject with a RangeError.
- [] resolves to [] without calling fn.

Propose a test plan for src/drills/mapWithConcurrency.test.ts: test names, what each
asserts, and which naive implementation it catches (sequential awaits, unbounded
Promise.all, fixed batches, results in completion order). Use Vitest fake timers
(vi.useFakeTimers + await vi.advanceTimersByTimeAsync), not real delays.
```

**Don't approve the first plan.** Read it like a reviewer and answer with feedback instead of accepting it. Typical edits:

```text
Changes to the plan:
- Add a test with durations [50, 10, 10, 10] and limit 2 that asserts everything has
  settled at t=50ms. Fixed batches would need 60ms.
- Measure concurrency with a maxInFlight counter inside fn. Don't assert on internal state.
- Drop the test that counts workers. That's an implementation detail.
- Restore real timers in afterEach.
- Also create src/drills/mapWithConcurrency.ts with only the signature, the doc comment and
  `throw new Error('Not implemented')`. I'll write the implementation myself.
```

> [!AGENT] What to look for in a plan
> Each test should name a **behaviour**, not an implementation, and each should fail for some plausible wrong solution. If two tests would catch the same bug, cut one. If no test separates "pool" from "batches", the plan has a hole. That's the bug interviewers care about most here.

For reference, a good pool-vs-batch test looks roughly like this:

```ts
it('keeps every slot busy (a pool, not fixed batches)', async () => {
  vi.useFakeTimers();
  const sleep = (ms: number) => new Promise<number>((r) => setTimeout(() => r(ms), ms));
  let settled = false;
  const p = mapWithConcurrency([50, 10, 10, 10], 2, sleep).then((r) => {
    settled = true;
    return r;
  });
  await vi.advanceTimersByTimeAsync(50);
  expect(settled).toBe(true); // batches would still be waiting until t=60
  await expect(p).resolves.toEqual([50, 10, 10, 10]);
});
```

## 3. Approve, watch the tests fail, commit them (7 min)

When the plan looks right, approve it. Claude leaves plan mode and writes the files. Then confirm the tests fail **for the right reason**:

```bash
npm test -- --run src/drills/mapWithConcurrency
```

Every test should fail with `Not implemented`. If any fail with an import error or a type error, or if any **pass**, the suite is broken. Ask Claude to fix the *tests* before you go on.

Commit the tests as the spec:

```text
Commit only src/drills/mapWithConcurrency.test.ts and the stub. Use a "test:" prefix and an
imperative subject of 50 characters or fewer. In the body, say which behaviours the tests pin
down and why they use fake timers. Show me the message before you commit.
```

A good result looks like this:

```text
test: specify mapWithConcurrency behaviour

Pin down input ordering, the in-flight limit, pool scheduling (no idle
slots), fail-fast on the first rejection, RangeError for bad limits
and the empty-input case. Fake timers keep the timing tests fast and
deterministic.
```

> [!TIP]
> A commit message explains **why**, not what (the diff already shows what). Committing the failing tests first gives you a fixed point: later, `git diff` shows at a glance whether anyone (you or Claude) quietly changed the tests to make them pass.

## 4. Implement it yourself (10 min)

Press **Shift+Tab** back to normal mode. Then, **without AI**, implement `mapWithConcurrency` in your editor. Keep the tests running in watch mode:

```bash
npm test -- mapWithConcurrency
```

Talk out loud while you code, the way you would in an interview. Describe the worker pool, the shared index, and why claiming `nextIndex++` is safe with no `await` in between.

## 5. Review without rewriting (5 min)

```text
Review src/drills/mapWithConcurrency.ts against the committed tests and the spec.
Don't edit any files, and don't modify the tests. They are the contract.
Coaching mode: for each issue, give me a question or a hint first, not the fix.
Then ask me the three follow-up questions an interviewer is most likely to ask about
this implementation, one at a time, and grade my spoken answers.
```

Expected follow-ups include cancellation with an `AbortSignal`, "collect all errors instead of failing fast", and "rate limiting vs concurrency limiting". Fix any issues yourself, then commit:

```bash
git add src/drills/mapWithConcurrency.ts
git commit -m "feat: implement mapWithConcurrency as a worker pool"
```

> [!MISTAKE]
> Saying "make the tests pass" when tests fail. An agent may "fix" the problem by weakening an assertion. Always say **"don't modify the tests"**. Better still, add this line to the coaching section of `CLAUDE.md`: *"Committed tests are the spec. Never change them unless I explicitly ask."*

## Verify

```bash
npm test -- --run src/drills/mapWithConcurrency     # all green
git log --oneline -2                                 # test: commit, then feat: commit
git diff HEAD~1 --stat -- src/drills/mapWithConcurrency.test.ts   # no output: tests unchanged
```

## Reflect (write in `notes/day02.md`)

- Which plan edits did you make, and which bug would each one have let through?
- Did Claude's first test plan include a test that separates a pool from fixed batches? If it didn't, what in your spec could have been clearer?
- How long did reviewing the plan take compared with how long a bad diff would have taken to review?
- Did Claude respect "don't modify the tests" and "don't write my implementation"? Where did you have to repeat it?

> [!INTERVIEW] "How do you make sure AI-generated code is actually correct?"
> "I make correctness checkable before any code exists. For anything non-trivial I start the agent in plan mode, have it explore the code, and review its plan. Often I write the spec as failing tests first and commit them, so the agent's job is 'make these pass without touching the tests', and the diff proves it didn't move the goalposts. Then I review the implementation like any PR: edge cases, error paths, and whether the tests would actually catch the bugs I'm worried about."
