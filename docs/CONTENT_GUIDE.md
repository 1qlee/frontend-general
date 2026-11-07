# Content authoring guide

Everything the learner sees comes from typed TypeScript modules under `src/content/`.
The schema lives in [`src/content/types.ts`](../src/content/types.ts) — read it first.

```
src/content/
  types.ts                 # schema (Day, Block kinds, Exercise, QuizQuestion, …)
  index.ts                 # assembles the course (glob imports — no registry to edit)
  content.test.ts          # validation: schema, time budget, solutions pass, starters fail
  days/dayNN/
    index.ts               # export default day: Day
    lessons/<slug>.md      # lesson bodies, imported with ?raw
    exercises/<slug>/      # one folder per exercise (NOT type-checked by tsc)
      starter.ts(x)        # what the learner starts from
      solution.ts(x)       # reference solution — must pass tests and type-check (strict)
      tests.ts(x)          # Vitest-style tests importing from './solution'
  labs/dayNN/              # agentic (Claude Code) lab injected before the day's drill
    index.ts  lab.md
  playbook/<slug>/         # interview playbook docs
    index.ts  doc.md
```

Validate one day while authoring (fast):

```bash
npx vitest run src/content -t "day 5 "      # note the trailing space: "day 1 " ≠ "day 10"
npx tsc -b --noEmit                          # type-check index.ts files
```

Validation fails if: ids are not kebab-case or are duplicated, a quiz answer index is out of range,
the day's minutes (including the injected lab) are outside 220–260, a day has < 10 flashcards or < 5
interview questions, an `{{quiz:id}}` reference is dangling, a runnable snippet has a syntax error,
a reference solution fails its tests / has type errors, or a starter already passes.

## Daily structure (≈ 240 minutes)

| Block kind | Purpose | Typical minutes |
|---|---|---|
| `review` | Spaced-repetition flashcard warm-up from earlier days (rendered automatically) | 15 |
| `lesson` | Deep, interview-focused reading with runnable snippets and inline checks | 35–50 each |
| `quiz` | 8–12 questions; "what does this print?" and concept checks with thorough explanations | 15–20 |
| `exercise` | 3–6 hands-on exercises with automated tests | 50–70 |
| `lab` (`build`) | Bigger hands-on build in the learner's own practice repo (`fe-gym`) | 30–60 |
| `lab` (`agentic`) | Claude Code practice — injected from `labs/dayNN` (35 min) | 35 |
| `drill` | Speak-aloud interview questions with model answers (uses `interviewQuestions`) | 15–20 |

Days 2–13, 15 and 16 author **≈ 200–220 minutes** in `days/dayNN/index.ts`; the 35-minute agentic lab is
injected automatically before the `drill` block. Days 1, 14 and 17 author the full 240.

## Markdown conventions

GitHub-flavoured markdown plus:

```md
> [!INTERVIEW] Say it like this
> "A closure is a function bundled with references to the variables in scope where it was created…"

> [!MISTAKE]
> Using the array index as a `key` for a list that can be reordered.

> [!TIP] / > [!NOTE] / > [!WARNING] / > [!AGENT]   (AGENT = a Claude Code tip)
```

* **Runnable snippets** — use the info string `ts run` (or `js run`). The learner gets a ▶ Run
  button and an editable copy; `console.*` output is shown. Snippets run as a module in a
  Web Worker (no DOM). Top-level `await` works. Keep them short and make them *print* something.

  ````md
  ```ts run
  console.log('A');
  setTimeout(() => console.log('timeout'), 0);
  Promise.resolve().then(() => console.log('microtask'));
  console.log('B');
  ```
  ````

* **Inline check** — a paragraph containing only `{{quiz:<id>}}` renders the lesson's `checks`
  question with that id right there. Checks not referenced inline appear at the end.
* Plain fenced blocks (` ```tsx `, ` ```css `, ` ```bash `…) are syntax highlighted.
* Tables, ordered lists, and headings (`##`, `###`) are encouraged — lessons get a table of contents.

## Writing for this course (quality bar)

The learner is an experienced frontend developer who **underperforms in interviews**. They don't need
"what is a variable"; they need crisp mental models, the exact vocabulary interviewers listen for,
the gotchas that trip people up, and lots of reps. Every lesson should:

1. Start from **why interviewers ask this** and what a strong answer demonstrates.
2. Teach the **mental model** precisely (correct terminology; current as of React 19, TypeScript 5.x,
   ES2024; flag anything version-specific).
3. Show **runnable** examples for anything about runtime behaviour.
4. Include at least one `[!INTERVIEW]` callout with a concise, quotable explanation, and
   `[!MISTAKE]` callouts for common wrong answers.
5. Be **React + TypeScript first**: examples in TS/TSX, typed properly (no `any` unless the point
   is to show why `any` is bad).
6. End with a short "Key takeaways" list.

Lesson length: ~1,500–3,000 words. Accuracy matters more than breadth — if something is version-
dependent or debated, say so.

Quiz explanations must explain why the right answer is right **and** why the attractive wrong
answers are wrong. Interview model answers should be structured the way you'd say them out loud
(lead with the one-sentence answer, then detail, then a trade-off or example) and 120–350 words.
Flashcards are atomic: one fact or distinction per card, back side ≤ ~60 words.

## Exercises

```ts
import debounceStarter from './exercises/debounce/starter.ts?raw';
import debounceSolution from './exercises/debounce/solution.ts?raw';
import debounceTests from './exercises/debounce/tests.ts?raw';

const debounce: Exercise = {
  id: 'debounce',                 // globally unique across the course — prefix if generic
  title: 'Implement debounce()',
  runtime: 'logic',               // 'logic' | 'dom' | 'types'
  difficulty: 'core',             // 'warm-up' | 'core' | 'stretch'
  estMinutes: 20,
  prompt: `...markdown: requirements, signature, examples, edge cases, what the interviewer is looking for...`,
  starter: debounceStarter,
  solution: debounceSolution,
  tests: debounceTests,
  hints: ['gentle nudge', 'more specific', 'almost the answer'],
  explanation: `...markdown: approach, complexity, edge cases, follow-up questions + answers...`,
  tags: ['timers', 'closures'],
};
```

**Never name exercise files `*.test.ts`** (Vitest would try to run them directly) — use `tests.ts`.
Exercise sources are modules: the starter/solution `export` what the tests import.

### Runtimes

| runtime | Environment | Files | Notes |
|---|---|---|---|
| `logic` | Web Worker, no DOM | `.ts` | Algorithms, utilities, async, data transforms |
| `dom` | Sandboxed iframe: real DOM, React 19, `react-dom`, `@testing-library/react`, `@testing-library/user-event` | `.tsx` | Components, hooks, DOM utilities. Set `preview: true` to show the default export live. Validated in jsdom, so don't rely on layout (sizes are 0) or `IntersectionObserver` without stubbing it via `vi.stubGlobal`. |
| `types` | TypeScript compiler only | `.ts` | Type challenges (see below) |

### Test API (a Vitest subset — tests are real Vitest syntax)

```ts
import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
```

* `it/test(name, fn, timeoutMs?)`, `.skip`, `.only`, `.todo`, `.each(rows)(title, fn)` with `%s %i %d %j %o %#`
  and `$key` interpolation; `describe` (+ `.skip/.only/.each`), all four hooks. Default timeout 5 s.
* Matchers (all support `.not`, and `.resolves` / `.rejects` for promises):
  `toBe, toEqual, toStrictEqual, toMatchObject, toBeTruthy, toBeFalsy, toBeNull, toBeUndefined,
  toBeDefined, toBeNaN, toBeGreaterThan(OrEqual), toBeLessThan(OrEqual), toBeCloseTo, toBeInstanceOf,
  toBeTypeOf, toContain, toContainEqual, toHaveLength, toHaveProperty, toMatch, toSatisfy, toThrow,
  toHaveBeenCalled, toHaveBeenCalledTimes, toHaveBeenCalledWith, toHaveBeenLastCalledWith,
  toHaveBeenNthCalledWith, toHaveReturnedWith`.
* Asymmetric: `expect.any(Ctor)`, `expect.anything()`, `expect.objectContaining`, `expect.arrayContaining`,
  `expect.stringContaining`, `expect.stringMatching`.
* DOM (jest-dom subset): `toBeInTheDocument, toHaveTextContent, toHaveAttribute, toHaveClass, toHaveValue,
  toBeDisabled, toBeEnabled, toBeChecked, toHaveFocus, toBeVisible, toBeEmptyDOMElement, toContainElement,
  toHaveStyle, toHaveAccessibleName`.
* `vi.fn(impl?)` with `mockImplementation(Once)`, `mockReturnValue(Once)`, `mockResolvedValue(Once)`,
  `mockRejectedValue(Once)`, `mock.calls / results / lastCall`, `mockClear/Reset/Restore`;
  `vi.spyOn(obj, 'method')` (auto-restored after each test); `vi.stubGlobal(name, value)` (auto-restored).
* Fake timers: `vi.useFakeTimers()`, `vi.advanceTimersByTime(ms)`, `await vi.advanceTimersByTimeAsync(ms)`
  (flushes promises between timers — use it for async code + timers), `vi.runAllTimers()`,
  `await vi.runAllTimersAsync()`, `vi.runOnlyPendingTimers()`, `vi.getTimerCount()`, `vi.setSystemTime()`,
  `vi.useRealTimers()` (automatic after each test). Fake timers affect `setTimeout/setInterval/
  requestAnimationFrame/Date/performance.now` **as used by exercise code** (they are injected), not the
  host, so Testing Library's `waitFor`/`findBy*` keep working with fake timers on.
* With React + fake timers, wrap timer advances in `act`: `act(() => { vi.advanceTimersByTime(300); })`
  (`act` is exported from `@testing-library/react`).
* Mock `fetch` with `vi.stubGlobal('fetch', vi.fn(...))` or inject a fetcher parameter (preferred — more
  testable and more interview-like).
* Testing Library cleanup runs automatically after every test.

Good tests: 4–10 focused cases with descriptive names (the learner reads them as a spec), covering the
happy path, edge cases interviewers probe (empty input, errors, `this` binding, cancellation, ordering,
re-entrancy), and at least one case a naive solution fails. Make starters compile and fail cleanly
(`throw new Error('Not implemented')` or `return null`), with the full signature and doc comment.

### `types` runtime (type challenges)

`starter.ts` exports the type(s) to implement (usually `= any` or `= never`), `solution.ts` the answer.
`tests.ts` imports from `./solution` and `./type-utils` and introduces each case with a
`// test: description` comment. A case passes when no compiler error falls inside it.

```ts
import type { Equal, Expect } from './type-utils';
import type { MyPick } from './solution';

interface Todo { title: string; description: string; completed: boolean }

// test: picks a single key
type case1 = Expect<Equal<MyPick<Todo, 'title'>, { title: string }>>;
// test: picks several keys
type case2 = Expect<Equal<MyPick<Todo, 'title' | 'completed'>, { title: string; completed: boolean }>>;
// test: only accepts keys of T
// @ts-expect-error
type case3 = MyPick<Todo, 'nope'>;
```

`type-utils` provides `Equal, NotEqual, Expect, ExpectFalse, IsAny, IsTrue, IsFalse`. Code is checked with
`strict: true`, `lib: es2022 + dom`. Do not use the built-in utility you are asking the learner to
implement in the starter.

### `write-tests` mode (testing skills)

The learner writes the tests. Set `mode: 'write-tests'`, `subject` (correct implementation, importable as
`./subject`), `mutants` (2–4 realistic buggy versions, each with a `description` revealed when caught),
`starter` (a test-file skeleton importing from `./subject` — it must not pass, e.g. contains no tests),
`solution` (a reference test file that passes on `subject` and catches every mutant) and `tests: ''`.

## Agentic labs (`labs/dayNN`)

```ts
import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab', track: 'agentic', id: 'agentic-plan-mode-tdd', title: 'Claude Code: …', minutes: 40, body,
  checklist: ['…concrete, verifiable deliverable…'],
};
export default lab;
```

Labs happen in the learner's practice repo **fe-gym** (Vite + React + TS + Vitest + Testing Library, created on
Day 1). Each lab: goal → why it matters professionally → step-by-step with exact prompts/commands/config →
a "verify" step → reflection questions → how to talk about it in an interview. Only describe Claude Code
features that exist (see `docs/claude-code-reference.md`).

## Rules for parallel authors

* Only create/modify files inside your own `days/dayNN/` (or `labs/dayNN/`, `playbook/…`) directory.
* Do not edit shared files (`types.ts`, `index.ts`, runner code, styles). If the schema blocks you, note it in
  your final report instead.
* Do not run git commands.
* Other days may be mid-edit: ignore type errors or failing tests in other directories.
