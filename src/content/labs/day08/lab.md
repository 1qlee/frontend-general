## Goal

Debug the way you'd want a senior teammate to: **reproduce → hypotheses → evidence → minimal fix → explanation**, with Claude doing the legwork and you steering. You'll plant two classic bugs from today's lessons in fe-gym: a dropdown with `z-index: 9999` that still renders *under* a card, and a delegated click handler that "only works sometimes". You'll make Claude reason before it edits anything, feed it real evidence from DevTools, interrupt it with **Esc**, roll back a bad fix with **Esc Esc** / `/rewind`, and finish by explaining both root causes in your own words.

## Why this matters professionally

Agents change code quickly, and they change the *wrong* code just as quickly. The typical failure is the symptom patch: `z-index: 99999`, `!important`, a `setTimeout`, a broader selector. The patch "works" on one screen and the bug comes back somewhere else. Hypothesis-first prompting keeps both of you honest. It's also the shape of a strong answer to "tell me about a tricky bug you debugged", which interviewers use to see whether you reason from mechanisms or guess.

## 1. Plant the bugs (6 min)

This is scratch code (your playground since Day 4), so Claude may edit it. Create the two files below. Then point your Day 5 scratch entry (`src/scratch/main.tsx`) at `<DebugLab />` so it renders at `/scratch.html`.

```tsx
// src/scratch/debugging/DebugLab.tsx
import { useState, type MouseEvent } from 'react';
import s from './debug.module.css';

type Item = { id: string; title: string };

export function DebugLab() {
  return (
    <div className={s.page}>
      <Toolbar />
      <section className={s.hero}>
        <h1>Release notes</h1>
        <p>Open the Account menu: it should cover this card.</p>
      </section>
      <TodoList />
    </div>
  );
}

function Toolbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className={s.toolbar}>
      <span>fe-gym</span>
      <div className={s.menuWrap}>
        <button aria-expanded={open} onClick={() => setOpen((o) => !o)}>Account ▾</button>
        {open && (
          <ul className={s.menu}>
            <li><a href="#profile">Profile</a></li>
            <li><a href="#settings">Settings</a></li>
            <li><a href="#logout">Log out</a></li>
          </ul>
        )}
      </div>
    </header>
  );
}

function TodoList() {
  const [items, setItems] = useState<Item[]>([
    { id: 'a', title: 'Review PR #12' },
    { id: 'b', title: 'Write the ADR' },
    { id: 'c', title: 'Fix the flaky test' },
  ]);

  // One listener on the <ul> instead of one per button (event delegation)
  function handleClick(e: MouseEvent<HTMLUListElement>) {
    const el = e.target as HTMLElement;
    if (el.dataset.action !== 'delete') return;
    setItems((prev) => prev.filter((item) => item.id !== el.dataset.id));
  }

  return (
    <ul className={s.list} onClick={handleClick}>
      {items.map((item) => (
        <li key={item.id}>
          {item.title}
          <button type="button" data-action="delete" data-id={item.id}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>Delete</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

```css
/* src/scratch/debugging/debug.module.css */
.page { max-width: 40rem; margin: 0 auto; padding: 1rem; font-family: system-ui, sans-serif; }

/* A teammate added this "to make the hide-on-scroll animation smoother" */
.toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.5rem 1rem; background: #fff; border-bottom: 1px solid #ddd;
  will-change: transform; transform: translateZ(0);
}
.menuWrap { position: relative; }
.menu {
  position: absolute; top: 100%; right: 0; z-index: 9999; min-width: 10rem;
  margin: 0; padding: 0.5rem 0; list-style: none; background: #fff;
  border: 1px solid #ccc; box-shadow: 0 4px 12px rgb(0 0 0 / 0.15);
}
.menu a { display: block; padding: 0.5rem 1rem; }

/* Positioned so a badge can be placed inside it */
.hero { position: relative; z-index: 1; margin-top: 0.5rem; padding: 2rem; background: #1e293b; color: #fff; border-radius: 0.5rem; }

.list li { display: flex; justify-content: space-between; padding: 0.5rem 0; }
.list button { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.75rem; }
```

Open `/scratch.html` and see both bugs for yourself: the menu disappears behind the dark card, and "Delete" works only when you click the button's edge. Commit the planted state so `git diff` shows exactly what each fix changes:

```bash
git add src/scratch && git commit -m "chore: plant day 8 debugging bugs"
```

## 2. Hypotheses before code (6 min)

Start `claude`, press **Shift+Tab** until you're in **plan mode** (read-only), and describe the symptom, not your guess:

```text
Bug report: on /scratch.html the "Account" dropdown renders UNDER the dark "Release notes" card,
even though .menu has z-index: 9999.
Code: @src/scratch/debugging/DebugLab.tsx @src/scratch/debugging/debug.module.css

Don't change any code yet. List 3 hypotheses ranked by likelihood. For each give:
- the mechanism, in one or two sentences with correct CSS terminology
- the evidence that would confirm or rule it out
- the cheapest experiment I can run in DevTools to get that evidence
```

A good list includes a stacking context created by an ancestor, clipping by `overflow` (a different symptom: the menu would be cut off, not covered), and the `z-index` not applying at all (e.g. a non-positioned element). If Claude jumps straight to "increase the z-index", that's your first data point about how it behaves without constraints.

## 3. Give it evidence, not vibes (6 min)

Collect real evidence in DevTools and paste it in. Don't paraphrase:

- **Screenshot** of the bug: paste or drag it into the prompt.
- **Computed styles** for the menu, each of its ancestors and the hero: filter the Computed pane for `position`, `z-index`, `transform`, `will-change`, `opacity`, `overflow`.
- **DOM snippet**: right-click the `<header>` → Copy → Copy outerHTML.
- **An experiment**: untick `transform` on `.toolbar` in the Styles pane. Did the menu come forward?

```text
Evidence (screenshot attached):
- Computed: <paste the values for ul.menu, div.menuWrap, header.toolbar, section.hero>
- DOM: <paste the header's outerHTML>
- Experiment: unticking `transform` on .toolbar did NOT fix it.
Which hypothesis does this support, and what does the experiment tell us? Describe the stacking
order the browser is actually using. Then propose the minimal root-cause fix plus one alternative,
with trade-offs. Still don't edit.
```

The experiment is a deliberate trap. `will-change: transform` creates a stacking context on its own, so removing only `transform` changes nothing. See whether Claude spots it from the evidence.

## 4. Fix, interrupt, rewind (7 min)

Leave plan mode (**Shift+Tab**) and let Claude apply the fix you agreed on. If it starts editing something you didn't agree to, or reaches for a bigger `z-index`, press **Esc** straight away and redirect it:

```text
Stop. Don't change any z-index values on .menu. Fix the cause: the toolbar's stacking context.
```

Now practise recovery on purpose, *before* you need it on a real codebase:

```text
Try a quick alternative: make .menu position: fixed with z-index: 99999.
```

Look at the result. It's still broken, because a transformed ancestor is also the containing block for `position: fixed`, so the menu is still trapped. Press **Esc Esc** (or run `/rewind`), pick the checkpoint *before* that prompt, and restore the code (and the conversation if you like). Confirm with `git diff` that the hack is gone and only the real fix remains.

> [!WARNING]
> Checkpoints track **Claude's file edits**. They don't undo side effects of shell commands: installed packages, generated files, database changes, anything deployed. Git is still your real safety net, which is why you committed the planted state first.

## 5. Bug 2: reproduce with a failing test first (7 min)

Run `/clear`, since this is an unrelated bug, and go back to plan mode:

```text
Bug: in the todo list on /scratch.html, clicking "Delete" only works sometimes. Users say it works
"if you click the edge of the button". Code: @src/scratch/debugging/DebugLab.tsx
1) List 3 hypotheses with how to confirm each. No code changes.
2) Then write a failing Vitest + Testing Library test in src/scratch/debugging/DebugLab.test.tsx
   that reproduces what a user actually does. It must fail for the right reason.
   Don't fix the component.
```

For evidence, temporarily add `console.log(e.target, e.currentTarget)` to `handleClick`. Click the text, then the icon, then the button's padding, and paste the console output in.

Check the test carefully. If it clicks `getAllByRole('button', { name: 'Delete' })[0]`, it **passes**, because user-event dispatches the click on the button itself, so `target` *is* the button. A faithful reproduction clicks what users click: the inner `<span>` (`getAllByText('Delete')[0]`) or the icon. Ask Claude to explain the difference. A test that passes for the wrong reason is the most dangerous kind.

Once you've seen it fail, **fix `handleClick` yourself**. It's the same skill as today's `delegate()` exercise: walk up from the target with `closest()`, and check that the match is inside `e.currentTarget`. Run the test until it's green, then ask for a review with hints only:

```text
Review my fix in handleClick. What edge cases could still break it (clicks between buttons,
nested interactive elements, SVG targets)? Hints as questions, no code.
```

> [!AGENT] Esc vs rewind vs /clear
> **Esc** stops the current action and keeps the context, so you can redirect. **Esc Esc / `/rewind`** goes back to a checkpoint (code and/or conversation). **`/clear`** starts fresh, for a new, unrelated task.

## Verify

- The dropdown covers the card, and `git diff HEAD -- src/scratch/debugging/debug.module.css` shows a root-cause fix (no `z-index` bump on `.menu`).
- You watched `DebugLab.test.tsx` fail on the planted code and pass after *your* fix: `npm test -- --run src/scratch/debugging`.
- You used **Esc** at least once and restored a checkpoint with **Esc Esc** or `/rewind`, then confirmed it with `git diff`.
- `notes/day08.md` has both root-cause explanations, written without looking at Claude's answer.

## Reflect (write in `notes/day08.md`)

- Explain each root cause in 3–4 sentences: the mechanism, why the obvious fix fails, the real fix, and how you'd stop it coming back (lint rule, review checklist, test).
- Why didn't removing `transform` alone fix the menu? List four other properties that create a stacking context.
- Which hypothesis did Claude rank first for each bug, and was it right? Which piece of evidence changed its mind?
- Did Claude propose a symptom patch at any point? What in your prompt invited it, or prevented it?
- When would you use `/rewind`, and when `git restore` / `git reset`? What can't rewind undo?

> [!INTERVIEW] "Walk me through how you debug a tricky UI bug."
> "First I reproduce it reliably and write the reproduction down, ideally as a failing test that clicks what the user actually clicks. Then I list hypotheses and the cheapest experiment that would confirm or rule out each one, before I change any code. A dropdown with `z-index: 9999` rendering under a card, for example, is almost always a stacking context: an ancestor with `transform`, `opacity` or `will-change` confines the menu's z-index to that context. So the fix is the ancestor's stacking order, or rendering the menu in the top layer with a portal or popover. A bigger number won't help. When I use an agent, I make it work the same way: hypotheses first, real evidence like computed styles and screenshots, and I interrupt or rewind as soon as it reaches for a symptom patch. I don't merge a fix I can't explain."
