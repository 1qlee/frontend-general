## Goal

Ship one real feature in **fe-gym**, an **accessible command palette** (Ctrl/Cmd+K), using the full professional workflow end to end: spec → plan mode → vertical slices → tests first → implementation with hooks enforcing format and types → reviewer subagents → fixes → PR reviewed by the Claude GitHub Action → retro.

**This is not an interview drill.** You may let Claude write the implementation. The rule that replaces "type it yourself" is just as strict: **you read every diff before it's committed**, and you could explain any line of it to an interviewer.

## Why this matters professionally

Every daily lab trained one feature on its own. Real work needs them combined, and the hard parts are the transitions: turning a vague idea into a spec, a spec into slices, slices into verified commits, and review findings into fixes without losing control of the design. This capstone is also the story you'll tell when an interviewer says *"Walk me through how you'd build a feature with an AI agent."*

## Timebox (60 min)

| Stage | Minutes |
|---|---|
| 0. Pre-flight | 4 |
| 1. Spec (you write, Claude critiques) | 8 |
| 2. Plan mode → sliced checklist | 7 |
| 3. Slice 1: tests first → implement → review → commit | 12 |
| 4. Slice 2: same loop | 10 |
| 5. Reviewer subagents → triage → fix | 8 |
| 6. PR + Claude GitHub Action review | 5 |
| 7. Retro + CLAUDE.md update | 6 |

If you fall behind, drop slice 2's stretch items, not the reviews or the retro. The workflow is the deliverable here, more than the feature.

## 0. Pre-flight (4 min)

```bash
cd fe-gym
git switch main
git switch -c feat/command-palette
# or, to keep main free for other work: git worktree add ../fe-gym-palette -b feat/command-palette
```

Check that the tooling from earlier labs is in place:

```bash
cat .claude/settings.json      # PostToolUse format hook (Day 4), protect hook, permissions
ls .claude/agents              # your React reviewer (Day 6) and a11y auditor (Day 9)
ls .github/workflows           # the Claude workflow (Day 13)
```

This lab calls the subagents **`react-reviewer`** and **`a11y-auditor`**. If you named yours differently, use your names. If something is missing, add the minimal versions below now.

**Type-check hook.** Feeds type errors back to Claude after every TS edit. Add it to `PostToolUse` next to your format hook with matcher `Edit|Write`:

```bash
#!/usr/bin/env bash
# .claude/hooks/typecheck.sh  (chmod +x). Exit 2 = stderr is fed back to Claude.
file=$(jq -r '.tool_input.file_path // empty')
[[ "$file" =~ \.(ts|tsx)$ ]] || exit 0
if ! out=$(npm run -s typecheck 2>&1); then
  echo "Type errors after editing $file:" >&2
  echo "$out" | head -40 >&2
  exit 2
fi
exit 0
```

**Reviewer subagents** (read-only tools, so they can't "fix" things behind your back):

```md
---
name: react-reviewer
description: Reviews React + TypeScript changes for correctness, hooks/effects misuse, state design, performance and test quality. Use after implementing a feature slice.
tools: Read, Grep, Glob
---
You are a senior React reviewer. For the files you're given, report findings as
severity (blocker/should/nit) · file:line · problem · suggested fix. Check: effects and cleanup,
derived state, stale closures, keys, event handling, TypeScript strictness, and whether each test
would fail if the behaviour broke. Don't rewrite the code; be specific and brief.
```

```md
---
name: a11y-auditor
description: Audits UI components for accessibility against WAI-ARIA patterns (dialog, combobox, listbox), keyboard support and focus management. Use for any new interactive component.
tools: Read, Grep, Glob
---
You are an accessibility specialist. Check semantics, accessible names, keyboard interaction,
focus management (initial focus, containment, return focus), ARIA states (aria-expanded,
aria-activedescendant, aria-selected) and live-region announcements. Report findings as
severity · file:line · WCAG/APG reference · fix.
```

Start Claude from the repo root (`claude`) and run `/context` once. Note how much is used before you've typed anything.

## 1. Spec (8 min): you write it, Claude critiques it

Create `specs/command-palette.md` **yourself**. Writing the spec is the senior skill in this workflow, so don't hand it to the agent. Start from this skeleton:

```md
# Command palette

## Problem
Keyboard users want to reach any action without hunting through the UI.

## Behaviour
- Ctrl+K (Cmd+K on macOS) anywhere opens the palette; Escape closes it.
- Opening focuses the search input; closing returns focus to whatever had it before.
- Typing filters commands by label (case-insensitive substring).
- ArrowDown / ArrowUp move the active option and wrap; Enter runs the active command and closes.
- No matches → "No commands found". The result count is announced to screen readers.

## Accessibility
- Modal dialog: role="dialog", aria-modal="true", accessible name "Command palette"; focus stays inside.
- Input: role="combobox", aria-expanded, aria-controls → the listbox, aria-activedescendant → active option.
- Listbox with role="option" children; the active option has aria-selected="true". DOM focus stays on the input.
- Result count in a polite live region (role="status").

## API
<CommandPalette commands={commands} />, where Command = { id: string; label: string; run: () => void }

## Out of scope
Fuzzy matching, recent commands, nested pages, async command sources.

## Acceptance criteria
1. Ctrl+K and Meta+K open the palette; Escape closes it and restores focus.
2. Typing "the" shows only matching commands, and the count is announced.
3. Arrow keys move aria-activedescendant/aria-selected with wrapping; Enter runs the command once and closes.
4. Empty state text is shown when nothing matches.
```

Then use Claude as a sparring partner, not an author:

```text
Read @specs/command-palette.md. Act as a skeptical senior frontend reviewer. Don't write code or edit files.
List: ambiguities, missing edge cases, accessibility gaps (compare against the WAI-ARIA APG dialog and
combobox patterns), and anything that will be hard to test in jsdom. Ask me questions; don't decide for me.
```

Answer the questions by **editing the spec yourself**. Typical good catches: what happens when `commands` is empty, whether the hotkey fires while typing in another input, mouse hover vs keyboard active option, and what happens when the filtered list shrinks below the active index. Also decide between native `<dialog>` and a custom dialog. If you choose `showModal()`, check that your jsdom version supports it in tests, or plan to stub it.

## 2. Plan mode (7 min)

Switch to plan mode (Shift+Tab until it shows plan mode, or restart with `claude --permission-mode plan`):

```text
We're building the feature in @specs/command-palette.md under src/features/command-palette/.
You may write implementation code for this feature: it's a capstone, not one of my drills.

First explore the repo's conventions (test setup, existing hooks, folder structure). Then propose a plan that:
- splits the work into 2–3 VERTICAL slices, each shippable with its own tests
  (e.g. slice 1: open/close + dialog semantics + focus; slice 2: filtering + listbox + keyboard)
- lists files and test cases per slice, mapped to the acceptance criteria numbers
- names risks (hotkey on macOS vs others, focus restore, jsdom limitations) and how to test each
No code yet. After I approve, save the plan as a checklist in notes/command-palette-plan.md.
```

Review the plan like a tech lead. Push back at least once, for example: "Slice 1 is too big, move the live region to slice 2", or "Don't add a dependency for the hotkey; a small `useHotkey` hook is enough." Approve, and let it write `notes/command-palette-plan.md`.

> [!AGENT] Why the plan goes in a file
> The plan file survives `/clear` and compaction. Between slices you'll clear the context and say "read the plan and continue", which keeps each slice's context small and focused.

## 3. Slice 1: tests first → implement → review → commit (12 min)

**Tests first** (back in default or acceptEdits mode):

```text
Slice 1 from notes/command-palette-plan.md. Write ONLY the tests, in
src/features/command-palette/CommandPalette.test.tsx: Testing Library queries by role/name and user-event.
Cover acceptance criterion 1 plus the edge cases we agreed in the spec. Create a stub CommandPalette that
returns null so the import resolves. Run the tests and show me they fail for the right reason
(missing dialog/role), not because of an import or syntax error.
```

**Read the tests yourself.** Would each one fail if the behaviour broke? Do they query by role and accessible name? Do they use `userEvent.keyboard('{Control>}k{/Control}')` rather than poking at internals? Fix them now, while they're cheap. Then lock them in:

```bash
git add -A && git commit -m "test(command-palette): failing tests for slice 1"
```

**Implement:**

```text
Implement slice 1 so the tests in CommandPalette.test.tsx pass. Do NOT modify the test file.
Follow CLAUDE.md conventions and the plan. Hooks will format and type-check after each edit; fix
anything they report. Done = `npx vitest run src/features/command-palette` and `npm run typecheck`
pass. Paste the final output, then tick slice 1 in notes/command-palette-plan.md.
```

Watch the hooks working: a formatting pass after each edit, and type errors fed straight back if it gets a type wrong. If it starts thrashing, press **Esc** and give it the missing fact instead of letting it loop.

**Review before committing**, and verify the claims yourself:

```bash
git diff --stat HEAD                         # what changed?
git diff HEAD -- '*.test.tsx'                # must be empty: tests untouched
npx vitest run src/features/command-palette  # don't take "tests pass" on trust
git diff HEAD                                # read every line
git add -A && git commit -m "feat(command-palette): open/close with dialog semantics and focus restore"
```

## 4. Slice 2: same loop, fresh context (10 min)

Clear the context, then point it at the durable state:

```text
/clear
```

```text
Read notes/command-palette-plan.md and @specs/command-palette.md. Continue with slice 2.
Tests first only: write the failing tests for criteria 2–4 in the existing test file (append; don't
change slice 1 tests), run them, show me the failures, and stop.
```

Review → commit the tests → then:

```text
Implement slice 2 until all tests pass without modifying the test file. Use the aria-activedescendant
pattern from the spec (DOM focus stays on the input). Done = vitest for the feature + typecheck pass;
paste the output and tick slice 2 in the plan.
```

Same review routine (`git diff HEAD -- '*.test.tsx'` empty, run tests yourself, read the diff), then commit. Render `<CommandPalette commands={…} />` in `App.tsx` with three or four demo commands so you can try it by hand: open it, filter, arrow, Enter, Escape, and check that focus returns.

## 5. Reviewer subagents → triage → fix (8 min)

```text
Run `git diff main --name-only` to get the changed files. Then use the react-reviewer subagent and the
a11y-auditor subagent (in parallel if you can) to review those files against @specs/command-palette.md.
Don't change anything yet. Merge their findings into one deduplicated table:
# · severity · file:line · problem · suggested fix · which reviewer.
```

**You triage.** Mark each finding as fix now, follow-up issue, or disagree (with a reason). Reviewers are often confidently wrong too: an "issue" that contradicts the APG pattern, or a "should" that would add complexity for no user benefit. Then:

```text
Fix findings #<list> only. Keep the tests passing; add a test for any behaviour a fix changes.
Done = feature tests + typecheck pass; paste the output.
```

Optional, if your Playwright MCP from Day 5 is set up and the dev server is running: *"Use Playwright to open the app, press Control+K, take an accessibility snapshot of the open palette, and check the combobox/listbox roles and states match the spec."*

Review the diff, run the tests yourself, commit: `fix(command-palette): address review findings`.

## 6. PR + Claude GitHub Action review (5 min)

Ask for a PR description draft. You'll edit it, but it's a good summariser:

```text
Draft a PR description for this branch: summary, how to test manually (keyboard steps), accessibility
notes, what's out of scope, and a short "how this was built" section (spec → plan → tests-first slices →
reviewer subagents). Base it on the commits and the spec. Write it to notes/pr-command-palette.md.
```

Push and open the PR (GitHub UI, or `gh pr create` if you use the GitHub CLI):

```bash
git push -u origin feat/command-palette
```

Then comment on the PR to trigger the workflow from Day 13:

```text
@claude Review this PR against specs/command-palette.md. Focus on keyboard and screen-reader behaviour,
focus management, effect cleanup, and whether each test would fail if its behaviour broke.
Post findings as comments; don't push commits.
```

Respond to its comments like you would a colleague's: fix, or reply with your reasoning. **No remote for fe-gym?** Open a second terminal, start a *fresh* `claude` session (clean context, the writer/reviewer pattern) and ask it to review `git diff main...HEAD` against the spec with the same criteria.

## 7. Retro + CLAUDE.md update (6 min)

Write `notes/day14-retro.md`:

```md
# Capstone retro: command palette

## What the agent did well
-
## Where it went wrong (and how I caught it: test, hook, review, my own reading?)
-
## Context: what did /context show? Did /clear between slices help?
-
## Review: which findings were real, which were noise?
-
## What I'll change
- One line for CLAUDE.md:
- One hook / command / subagent tweak:
- Something I'd do by hand next time, and why:
```

Then make the **one CLAUDE.md change** now. It should come from a mistake you saw, not a generic rule (e.g. "Dialogs: always restore focus to the trigger on close; test it"). Commit it:

```bash
git add CLAUDE.md notes/ && git commit -m "docs: capstone retro and CLAUDE.md update"
```

## Verify

- `npx vitest run src/features/command-palette` and `npm run typecheck` pass on the branch.
- `git log --oneline main..` shows test commits **before** each implementation commit.
- `git log -p main.. -- '*.test.tsx'` shows test changes only in "test:" commits (and in fixes that added tests).
- With a keyboard only, you can open, filter, navigate, run a command and close the palette, and focus returns where it started.
- The PR has a description and at least one round of AI review handled by you.

## Reflect

- At which stage did your input change the outcome most: spec, plan, test review, or triage?
- Which failure mode from the first lesson showed up (wrong API, false "done", scope creep, test tampering, stale assumptions)? Which mechanism caught it?
- If you had to run this workflow on a team, what would you put in `.claude/commands/` so nobody has to retype these prompts?

> [!INTERVIEW] "Walk me through building a feature with an AI agent"
> "I wrote a one-page spec with the accessibility requirements and acceptance criteria myself, then had Claude critique it before any code existed. In plan mode it proposed vertical slices; I pushed back on the slicing and saved the plan as a checklist. For each slice it wrote failing tests first, I reviewed and committed them, and then it implemented until they passed without touching the tests, with hooks formatting and type-checking every edit. Two read-only reviewer subagents audited React patterns and accessibility; I triaged their findings, because some were wrong. The PR got an automated Claude review plus mine. The retro produced one new CLAUDE.md rule from a mistake I'd watched it make."
