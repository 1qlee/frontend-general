## Goal

Package fe-gym's React know-how as a **skill**: `.claude/skills/react-conventions/SKILL.md` plus a supporting `examples.md`. You'll watch **progressive disclosure** in action: Claude loads the skill only when a task matches its description, and reads the examples only when it needs them. You'll finish the first week with a decision table covering every mechanism you've used: CLAUDE.md, skills, slash commands, subagents, hooks and MCP.

## Why this matters professionally

Every team has conventions that are too detailed for `CLAUDE.md`, such as how to type a component, where data fetching lives and when to memoize. Loading them in every session wastes context on tasks that never touch React. A skill solves that. At startup only its name and description are loaded, and the full instructions arrive when they're relevant. Knowing *which* mechanism to use for *which* kind of knowledge is what separates someone who "uses AI" from someone who can set up a team's agent workflow.

## 1. Write the skill (10 min)

A skill is a folder. Its `SKILL.md` needs YAML frontmatter with a `name` and a `description`, and the **description decides when it loads**. Say *what* the skill covers and *when* to use it, in the words a task would use. Create `.claude/skills/react-conventions/SKILL.md`:

````md
---
name: react-conventions
description: fe-gym conventions for writing, refactoring or reviewing React 19 + TypeScript components, custom hooks and their tests. Covers component structure, typing props/refs/events, state and data fetching, when to memoize, and React Testing Library style. Use whenever a task creates or changes a .tsx component or hook in this repo.
---

# React conventions (fe-gym)

For worked examples, read [examples.md](examples.md), but only when you need a concrete pattern.

## Boundaries
- src/drills/ and src/components/ are the learner's practice: follow CLAUDE.md coaching mode.
  src/scratch/ is yours.

## Component structure
- One exported component per file, named export, file named after it.
- Order: imports → `interface <Name>Props` → component → private helpers.
- Function declarations, not `React.FC`. Destructure props (with defaults) in the signature.
- Callback props are `onX`; internal handlers are `handleX`. Early-return loading/empty/error states.

## Typing
- Extend native elements: `interface Props extends ComponentProps<'button'> { tone?: Tone }`.
- `children: ReactNode`; events like `ChangeEvent<HTMLInputElement>` (type-only imports from 'react').
- React 19: `ref` is a regular prop on function components, so don't use `forwardRef`. DOM refs: `useRef<HTMLDivElement>(null)`.
- Model variants and status as unions, not booleans that can contradict. No `any`.

## State, effects, data
- Minimal state; derive during render. No effects that copy props or derived values into state. Reset with `key`.
- Effects only synchronise with external systems, and always clean up.
- Components never call `fetch` directly: use a hook that takes an injected fetcher, with a
  status union, and abort stale requests (AbortController).

## Memoization
- Not by default. Use memo/useMemo/useCallback only for: props to a memoized child, a measured
  expensive computation, context values, or effect dependencies. If React Compiler is on,
  don't add manual memoization.

## Tests
- Testing Library + user-event (`userEvent.setup()`). Query by role and name; `findBy*` for async.
- Test behaviour, not state or implementation details. Use fake timers with `act`. Inject fetchers instead of stubbing global fetch.
- Before finishing: `npx vitest run <test file>`.
````

> [!TIP]
> Keep `SKILL.md` short and scannable. It's loaded whole whenever the skill triggers. Put long material in supporting files that Claude opens only when needed. That's progressive disclosure *inside* the skill.

## 2. Add a supporting file (5 min)

`.claude/skills/react-conventions/examples.md` holds one canonical component and test. Use a component from your own week, written the way you'd want every component written:

````md
# Canonical examples

## Component
```tsx
import type { ComponentProps, ReactNode } from 'react';

type Tone = 'info' | 'danger';

interface BadgeProps extends ComponentProps<'span'> {
  tone?: Tone;
  children: ReactNode;
}

export function Badge({ tone = 'info', className, children, ...rest }: BadgeProps) {
  const classes = ['badge', `badge--${tone}`, className].filter(Boolean).join(' ');
  return <span {...rest} className={classes}>{children}</span>;
}
```

## Test
```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Badge } from './Badge';

it('renders its text and forwards native props', () => {
  render(<Badge tone="danger" title="Overdue">Late</Badge>);
  expect(screen.getByText('Late')).toHaveAttribute('title', 'Overdue');
});
```
````

## 3. Watch progressive disclosure (10 min)

Start fresh with `/clear`. First, run a task that **should not** trigger the skill:

```text
What does Exclude<'a' | 'b' | 'c', 'a'> evaluate to, and why?
```

Claude answers without loading the skill. Now run a task that **should** trigger it. Note that the prompt doesn't mention conventions:

```text
Create src/scratch/UsageMeter.tsx: shows "used / limit" with a progress bar
(role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax), switching to a
danger tone at 90% or more. Add a test next to it and run it.
```

Watch the tool calls. Claude should load `react-conventions` before writing code, and may open `examples.md` for the canonical pattern. Then ask:

```text
Which skills did you use for that task, and which of their files did you read?
Point to two places in UsageMeter.tsx where a convention changed what you wrote.
```

If the skill **didn't** trigger, the description is the problem. Make it match how tasks are phrased (for example, add "progress bar, form, list, modal" or "any .tsx file"), then run `/clear` and retry. You can always invoke it explicitly:

```text
/react-conventions review src/scratch/pricing/PricingToggle.tsx against these conventions. List deviations; don't edit.
```

> [!AGENT] Skills vs commands
> A command runs when **you** type it. A skill can also be picked up by **Claude** when a task matches its description. In recent versions they're one mechanism (commands are simple skills), and `.claude/commands/` files keep working **(verify for your version)**.

Now slim `CLAUDE.md`. Replace any detailed React rules with one pointer line: *"React/TSX conventions live in the react-conventions skill."*

## 4. The decision table (7 min)

Copy this into `notes/day07.md` and fill in the last column with your own fe-gym examples from this week:

| Mechanism | When it's loaded or run | Use it for | Don't use it for | Your fe-gym example |
|---|---|---|---|---|
| **CLAUDE.md** | Every session, always in context | Always-true facts: commands, architecture, guardrails | Long how-tos for one kind of task (costs context every time) | |
| **Skill** | Name/description up front; body and files when a task matches | Know-how loaded on demand: conventions, procedures, checklists | Rules that must *always* be enforced | |
| **Slash command** | When you type `/name` | A reusable prompt you trigger deliberately | Knowledge Claude should apply unprompted | |
| **Subagent** | When delegated; runs in its own context window | Isolated investigation, independent review, parallel work | Small tasks needing the full conversation | |
| **Hook** | Deterministically, on events (PreToolUse, PostToolUse, Stop…) | Must-always-happen automation: format, type-check, block secrets | Judgement calls | |
| **MCP server** | Its tools are available; Claude calls them as needed | New capabilities and data: a browser, design files, issue trackers | Instructions or conventions | |

Then classify these five rules without looking at the table. For each one, say where it goes and why:

1. "Run `npm test -- --run` to test."
2. "Every edited `.ts` file must be Prettier-formatted."
3. "Our checklist for reviewing a data-fetching hook."
4. "Generate three flashcards from today's notes when I ask."
5. "Check the rendered page at 375px wide."

## Verify

```bash
ls .claude/skills/react-conventions        # SKILL.md  examples.md
head -4 .claude/skills/react-conventions/SKILL.md   # frontmatter with name and description
npm test -- --run src/scratch               # UsageMeter test passes
git add .claude/skills CLAUDE.md src/scratch notes/day07.md
git commit -m "chore: add react-conventions skill; slim CLAUDE.md"
```

## Reflect (write in `notes/day07.md`)

- Did the skill trigger on the first try? What did you change in the description, and why did that matter?
- Which lines did you move out of `CLAUDE.md`, and what does that save in every session?
- Looking back over the week: which mechanism gave you the biggest quality improvement, and which gave you the biggest speed improvement?
- Your answers to the five-rule classification. Which one could reasonably go in two places?

> [!INTERVIEW] "How would you set up an AI coding agent for a frontend team?"
> "I match each kind of knowledge to the right mechanism. CLAUDE.md stays short: commands, architecture and hard rules. Detailed conventions, like how we type components or fetch data, go in skills, which only load when a task needs them. Repeatable workflows become slash commands, and reviews or investigations go to subagents with narrow tools and their own context. Anything that must always happen, like formatting, type-checking or protecting secrets, is a hook, because hooks are enforced and instructions are only advice. MCP servers add capabilities such as a real browser for visual checks. It's all checked into the repo and reviewed like code."
