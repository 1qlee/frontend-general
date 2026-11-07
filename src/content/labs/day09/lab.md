## Goal

Build a repeatable accessibility audit loop for **your own** Day 9 components. It has three parts: an `a11y-auditor` subagent that can read code but never change it, automated **axe** checks in a real browser with `@axe-core/playwright`, and a fix → re-run cycle until the scan is clean. Then you'll do the part no tool can do for you: a keyboard-only pass and a screen-reader smoke test.

## Why this matters professionally

Accessibility regressions slip through review because nobody *sees* them. A missing label or a focus trap that leaks looks fine in a screenshot. Teams that handle this well stack cheap automation (lint, role-based tests, axe in CI) under deliberate manual checks. An agent makes the automated layers almost free to set up and helps you triage what they find. But "Claude said it's accessible" is not a position you can defend to a user, a lawyer or an interviewer. Today you practise using the tools and keeping the sign-off.

## 1. Bring your components in and build a harness (5 min)

Copy your own passing solutions from today's exercises into `src/components/a11y/`: `Disclosure.tsx`, `Dialog.tsx`, `SignupForm.tsx`, and `Combobox.tsx` if you finished it. They're yours, so coaching mode applies. The page that renders them is tooling, so Claude can write it:

```text
Create a standalone page at /a11y.html (root a11y.html + src/a11y-playground/main.tsx +
A11yPlayground.tsx) that renders my components from src/components/a11y/ the way a real page would:
<header> with an h1, <main> with an h2 section per component, and a button that opens the Dialog.
Read each component to wire up its props. Don't modify anything in src/components/.
Run the typecheck when you're done.
```

Start the dev server in a second terminal (`npm run dev`) and open `/a11y.html` to check that everything renders.

## 2. Create the read-only auditor (5 min)

On Day 6 you built `react-reviewer`. This subagent is narrower: it knows WCAG and the APG patterns, and it has **no edit tools**. Create `.claude/agents/a11y-auditor.md` (or use `/agents` and paste this in):

```md
---
name: a11y-auditor
description: Accessibility auditor for React UI. Use when asked to audit accessibility, after UI changes, or to triage axe results in a11y-report/. Read-only: reports issues, never edits.
tools: Read, Grep, Glob
model: inherit
---

You are an accessibility specialist auditing React + TypeScript components against WCAG 2.2 AA
and the WAI-ARIA Authoring Practices (APG). Never edit files.

When invoked:
1. Read the components you are pointed at and any axe results in a11y-report/*.json.
2. Map every axe violation to the source file and line that causes it.
3. Review the code for what axe cannot see: keyboard operability for the APG pattern
   (Enter, Space, Escape, arrow keys), focus management (where focus goes on open, close,
   error, delete), accessible names and states (aria-expanded, aria-invalid,
   aria-describedby), live regions, native elements vs div soup, redundant or invalid ARIA.

Output a table: Severity (blocker / serious / moderate / minor) | WCAG criterion (number and
name; write "unsure" rather than guessing) | file:line | Problem | Suggested fix (describe it,
don't write it) | How to verify.
Then a "Needs a human" list: what you cannot judge from code (alt-text quality, whether
announcements make sense, real focus visibility, reading order on screen).
Never say a component "is accessible". Say what you checked and what you could not check.
```

Two design choices to notice: the **description** says *when* to use it, so Claude can delegate on its own, and the **tools** line makes "never edit" structural, not just a polite request.

## 3. Add axe to a real-browser test (8 min)

Install the test runner and the axe integration:

```bash
npm install -D @playwright/test @axe-core/playwright
npx playwright install chromium
```

Then let Claude write the config and the spec, which is tooling and tests:

```text
Set up Playwright for accessibility checks:
- playwright.config.ts: testDir 'e2e', chromium only, baseURL http://localhost:5173, and a
  webServer running `npm run dev` with reuseExistingServer: true.
- Make sure Vitest ignores e2e/ (its default include would pick up *.spec.ts).
- e2e/a11y.spec.ts: on /a11y.html run AxeBuilder with tags wcag2a, wcag2aa, wcag21a, wcag21aa,
  wcag22aa in three states: (1) as loaded, (2) Disclosure expanded, (3) Dialog open, scanning only
  the dialog. Write each state's violations (id, impact, help, helpUrl, target) to
  a11y-report/<state>.json, add a11y-report/ to .gitignore, and assert there are no violations.
- Add "test:a11y": "playwright test e2e/a11y.spec.ts" to package.json.
Run it and summarise the results. Don't touch src/components/.
```

When you review the spec, the core of each scan should look like this:

```ts
const results = await new AxeBuilder({ page })
  .include('[role="dialog"]') // or 'dialog' if you used the native element
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .analyze();
expect(results.violations).toEqual([]);
```

> [!NOTE]
> axe only checks the DOM that exists **when it runs**. A collapsed panel, a closed dialog, an error state or a hover menu is invisible to it unless the test puts the UI into that state first. That's why the spec scans three states. A single scan of the page as loaded is a common false "all clear".

## 4. Audit → fix → re-run (10 min)

If your first run is clean, well done. Now plant two failures so you can practise the loop: change your SignupForm's hint text to `color: #999` on white (about 2.8:1) and remove the `<label>` from one input. Then:

```text
Use the a11y-auditor subagent to audit src/components/a11y/ together with the axe results
in a11y-report/. Map each violation to file:line and add issues axe can't detect.
```

Triage the table. **Fix the issues yourself** (these are your drill components), then run `npm run test:a11y` again. Repeat until it's green. For each fix, write down the WCAG criterion in your notes. You'll quote these numbers in interviews.

Optional, if you added the Playwright MCP server on Day 5: ask Claude to *walk* the page and compare what it reports with what axe reported.

```text
Using the playwright MCP server, open http://localhost:5173/a11y.html and take an accessibility
snapshot. Then press Tab through the whole page, opening the Disclosure and the Dialog on the way.
Report the focus order as role + accessible name + state, and flag anything with no name, a
generic role or a surprising order. Don't change any files.
```

> [!TIP]
> When axe passes but the snapshot shows a `generic` element where you expected a `button`, or focus landing on `<body>` after the dialog closes, you've found a bug that rule engines miss. Add a role-based Testing Library test for it so it stays fixed.

## 5. What automation can't catch: your part (7 min)

Put the mouse away. In `notes/day09.md`, work through:

**Keyboard pass**
- Can you reach every control with Tab, in a sensible order, with a **visible** focus indicator that isn't hidden under anything?
- Does each widget follow its APG pattern? Enter/Space on the disclosure button, Escape closes the dialog, arrow keys move through the combobox options.
- When the dialog closes, does focus go back to the button that opened it? After a failed submit, does focus move to the first invalid field or the error summary?

**Screen-reader smoke test** (VoiceOver: Cmd+F5 with Safari; NVDA: Ctrl+Alt+N with Firefox or Chrome)
- Does each control announce a sensible **name, role and state** ("Shipping details, button, collapsed")?
- Is the form error announced when it appears, and is it tied to its field?
- Does the dialog announce its title on open, and can the virtual cursor wander into the page behind it?

Neither axe nor the auditor can tell you whether an error message actually helps, whether the focus order makes sense to a person, or whether an announcement is noise. The auditor *infers* from code, axe *matches rules*, and neither has used your UI with assistive technology. Automated checks find only a minority of real issues. A clean scan is the floor, and you're still accountable for what ships.

## Verify

```bash
npm run test:a11y                      # green in all three states
ls a11y-report                          # one JSON file per scanned state
grep '^tools:' .claude/agents/a11y-auditor.md   # Read, Grep, Glob only
npm test -- --run                       # Vitest still green and not running e2e/
```

Commit the agent, config, spec, harness and your fixes. Don't commit `a11y-report/`.

## Reflect (write in `notes/day09.md`)

- Which issues did axe find, which did only the auditor find, and which did only *you* find with the keyboard or screen reader? What does that split tell you about where to spend effort?
- Did the auditor misattribute anything or quote a wrong WCAG number? How did you check?
- Why would a single axe scan of the page as loaded have missed problems in your Dialog?
- What would you add to CI tomorrow, and what would you leave as a manual release check?

> [!INTERVIEW] "How do you make sure what you ship is accessible?"
> "In layers. I start with semantic HTML and the APG patterns, so most things are right by construction. Then automation: jsx-a11y lint, Testing Library tests that query by role and name, which double as accessibility assertions, and axe in Playwright against the real states, like the dialog open and the errors showing, not just the initial page. I use an AI agent as a read-only auditor to map violations to code and flag things rules can't see. But automated checks catch only a minority of issues, so before release someone does a keyboard pass and a screen-reader smoke test of the critical flows. Tools help, but the team is accountable for the result."
