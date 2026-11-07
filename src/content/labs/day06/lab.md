## Goal

Create two **subagents** for fe-gym. `react-reviewer` is a read-only React reviewer that returns a prioritised list of findings. `test-writer` writes Testing Library tests and never touches the code under test. You'll run the reviewer on *your own* Day 5–6 components, run both agents **in parallel**, and see how context isolation keeps your main conversation clean.

## Why this matters professionally

One long conversation that explores, implements, tests and reviews gets worse as it goes. The context fills with file dumps and dead ends, and a reviewer that just wrote the code is biased towards it. A subagent is a separate worker with its **own context window**, its own instructions and only the tools you grant it. It hands back a summary, not its whole transcript. That's the writer/reviewer split teams use with humans. It also gives you a reusable, reviewable definition of "what a good React review checks", committed to the repo.

## 1. Bring your components into fe-gym (5 min)

Copy your own solutions from today's and yesterday's build blocks into `src/components/`, either by exporting the code from this app or re-typing it. Good candidates are `Stopwatch.tsx` and `TodoList.tsx` (Day 5), and `Tabs.tsx`, `Modal.tsx` or `Accordion.tsx` (Day 6). These files are **yours**: the coaching rules in `CLAUDE.md` still apply, so Claude reviews them and tests them, but doesn't fix them.

## 2. Create the read-only reviewer (8 min)

A subagent is a markdown file in `.claude/agents/`. The frontmatter holds `name`, a `description` (Claude decides when to delegate based on this, so make it specific), an optional `tools` list and an optional `model`. The body is the subagent's **system prompt**. Create `.claude/agents/react-reviewer.md`:

```md
---
name: react-reviewer
description: Reviews React 19 + TypeScript components for Rules of Hooks violations, effect misuse, missing cleanup, unstable context values, key problems and basic accessibility. Use after a component is written or changed, or when asked to review React code. Read-only; never edits files.
tools: Read, Grep, Glob
model: inherit
---

You are a senior React reviewer preparing a candidate for frontend interviews.
Review only the files you are given (and what they import, if needed). Never edit files.

Check, in this order:
1. Rules of Hooks: hooks called conditionally, in loops, after early returns, or
   outside components or custom hooks.
2. Effects: effects that only derive state (compute during render instead), missing or
   wrong dependencies, stale closures, state synced from props, fetches without
   AbortController or an ignore flag.
3. Cleanup: intervals, timeouts, listeners, subscriptions and observers that are never
   cleaned up; behaviour under StrictMode's double-invoked effects.
4. Context: provider values created inline every render ({{ a, b }} or new functions)
   that re-render every consumer; context that should be split.
5. Lists and keys: index keys on lists that reorder, filter or insert; keys generated
   during render; missing keys.
6. Accessibility basics: clickable divs instead of buttons, missing accessible names,
   labels not tied to inputs, focus not managed for dialogs, keyboard support missing.
7. TypeScript: any, unsafe casts, props types that allow invalid states.

Output format:
- P1 (bugs users will hit), P2 (likely bugs or performance issues), P3 (style and nits).
- Each finding: `file:line`, what is wrong, WHY (the React mechanism), and a hint phrased
  as a question. Do not write the corrected code. The author fixes it themselves.
- End with "Interviewer follow-ups": 2 questions an interviewer would ask about this code.
If you find nothing at a priority level, say so. Never invent issues to fill a list.
```

`tools: Read, Grep, Glob` makes it **structurally** read-only. The instruction "never edit" is backed by the fact that it *can't*.

> [!AGENT] /agents
> Run `/agents` to view, create and edit subagents interactively. Claude Code also ships built-in helpers, such as an Explore agent and a Plan agent. However a subagent file gets created, review its description and tool list by hand.

## 3. Create the test writer (5 min)

`.claude/agents/test-writer.md`:

```md
---
name: test-writer
description: Writes Vitest + React Testing Library tests for a given component or hook in fe-gym. Use when asked to add, extend or harden tests. Never modifies the code under test.
tools: Read, Grep, Glob, Write, Edit, Bash
model: inherit
---

You write behaviour-focused tests for React 19 + TypeScript code.
- Put tests next to the subject as <Name>.test.tsx. Only create or edit *.test.ts(x) files.
- Query by role and accessible name; use @testing-library/user-event (userEvent.setup()).
- One behaviour per test, with names that read like a spec. Cover: the happy path, edge
  cases, keyboard interaction, and cleanup (unmount with fake timers; nothing left behind).
- For timers: vi.useFakeTimers() and wrap advances in act().
- Run the file with `npx vitest run <path>`.
- If a test fails because the COMPONENT is wrong, keep the test, mark it clearly in your
  report as "fails: likely bug", and explain the bug in one sentence. Never change the
  component to make a test pass.
Return: the test file path, the list of test names, and pass/fail per test.
```

Your Day 4 allowlist already permits `npx vitest`, so it can run tests without prompting.

## 4. Run the reviewer on your own code (7 min)

Check `/context` first so you have a baseline. Then:

```text
Use the react-reviewer subagent to review src/components/Stopwatch.tsx.
```

While it runs, notice that the main conversation shows the delegation, not every file the subagent read. When it returns, run `/context` again. The main context grew by roughly the *summary*, not the whole investigation. Pick the top P1 finding and **fix it yourself**. Then ask a follow-up in the main session:

```text
Without editing anything: is my fix for the P1 finding complete? What would break under StrictMode?
```

## 5. Two subagents in parallel (7 min)

```text
In parallel:
- Use the react-reviewer subagent on src/components/Tabs.tsx and src/components/Modal.tsx.
- Use the test-writer subagent to write tests for src/components/TodoList.tsx.
When both finish, give me one combined summary: review findings by priority, then
the tests written and which of them fail.
```

Each runs in its own context, so the reviewer's reading doesn't crowd the test writer and vice versa. Triage the combined summary: which findings are real, and which are noise? Tests that fail with "likely bug" are your fix list. Fix those yourself, without AI.

> [!MISTAKE]
> Giving every subagent all tools "just in case". A reviewer with `Edit` will eventually "helpfully" fix things. That breaks coaching mode in fe-gym, and in a team it bypasses review. Grant the minimum.

## When subagents beat one long conversation

| Use a subagent when… | Stay in one conversation when… |
|---|---|
| The work needs lots of reading but you only want the conclusion | The task is small and you need every detail |
| You want an independent opinion (the reviewer didn't write the code) | Each step depends on the exact output of the previous one |
| Tasks are independent and can run in parallel | You're iterating quickly on one file |
| You want a reusable role with fixed tools and rules | It's a one-off question |

## Verify

```bash
ls .claude/agents          # react-reviewer.md  test-writer.md
grep '^tools:' .claude/agents/*.md   # the reviewer has only Read, Grep, Glob
npm test -- --run src/components    # the new tests run; any failures are bugs you've noted
git add .claude/agents src/components && git commit -m "chore: add react-reviewer and test-writer subagents"
```

## Reflect (write in `notes/day06.md`)

- Which reviewer finding taught you something about React's model (not just style)? Explain the mechanism in two sentences, as you would in an interview.
- How much did `/context` grow after the subagent ran, compared with reviewing the same files in the main conversation?
- Did the test writer find a real bug in your component? Would your own tests have caught it?
- What would you change in the reviewer's `description` so Claude delegates to it without being asked?

> [!INTERVIEW] "How do you handle large or multi-step tasks with an AI agent?"
> "I keep the main conversation for decisions and delegate the heavy reading to subagents. Each one has its own context window, a narrow tool set and a specific job. My React reviewer is read-only and returns prioritised findings, and a separate test writer can only add test files. They can run in parallel, and because the reviewer didn't write the code, it reviews it more honestly. The definitions are committed, so the whole team gets the same review checklist. Then I triage what comes back like any review."
