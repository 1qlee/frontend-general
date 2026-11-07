## Goal

Give Claude **eyes**. You'll connect the Playwright MCP server so Claude can drive a real browser, take screenshots and read the accessibility tree. Then you'll write a short spec for a small UI component and let Claude build it in a scratch folder, look at the result and iterate until it meets your acceptance criteria. Finally, you'll compare that loop with pasting screenshots in by hand.

> [!NOTE]
> This is **not** a drill. Claude writes the component in `src/scratch/`, which you made its playground on Day 4. Your job today is the spec, the acceptance criteria and the judgement.

## Why this matters professionally

Without a way to check its work, an agent writing UI code is guessing. It can produce JSX that compiles and still looks broken, overflows on mobile, or has a toggle that can't be reached by keyboard. Anthropic's own guidance names "give it a way to verify its work" as the biggest quality lever. For UI, that means screenshots and real interaction. The professional skill here is closing the loop: spec → build → *observe* → compare → fix, with explicit criteria instead of "looks fine to me".

## 1. Add the Playwright MCP server (4 min)

From the fe-gym root, in your terminal (not inside a Claude session):

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
claude mcp list
```

This uses the default **local** scope, so it's just for you and this project. `--scope project` would write a `.mcp.json` to commit for the team, and `--scope user` would add it to all your projects. Start `claude` and run:

```text
/mcp
```

Confirm `playwright` is connected. If it reports a missing browser on first use, follow its message.

> [!WARNING]
> An MCP server is code running with your permissions, and web pages it reads are **untrusted input**. Keep Claude on `localhost` in this lab, and only install servers you trust.

## 2. Write the spec yourself (8 min)

In a second terminal, start the dev server and leave it running:

```bash
npm run dev     # note the URL Vite prints, usually http://localhost:5173
```

Now write `notes/day05-pricing-spec.md` **yourself**. Writing clear acceptance criteria is the real skill here, and it's the same skill as clarifying requirements in a UI interview round. Start from this outline and make it your own:

```md
# PricingToggle spec

Three plan cards (Starter, Pro, Team) with a Monthly / Yearly billing toggle.

## Acceptance criteria
1. Monthly prices: 9 / 29 / 79 (USD). Yearly shows the monthly-equivalent price
   at 2 months free (price × 10 / 12, rounded to whole dollars) and "billed yearly".
2. The toggle is a pair of buttons with aria-pressed (or a radiogroup); it's
   reachable with Tab and switchable with Enter/Space; focus is visible.
3. Pro is highlighted with a "Most popular" badge.
4. ≥ 900px wide: cards in one row. ≤ 480px wide: cards stacked, no horizontal scroll.
5. State: ONE piece of state (the billing period). Prices are derived during
   render, with no useEffect and no duplicated price state.
6. Each card has exactly one primary button: "Choose <plan>".
```

Criterion 5 is today's React topic. You're specifying *minimal state*, so you can check whether the agent over-engineers it.

If you have a visual mock (a screenshot of a pricing page you like, or a photo of a sketch), save it as `notes/pricing-mock.png`.

## 3. Build → look → iterate (13 min)

```text
Build the component specified in @notes/day05-pricing-spec.md.
- Put it in src/scratch/pricing/ (PricingToggle.tsx plus a CSS file). This is scratch
  code, so you may write it.
- Add a scratch entry so it renders on its own at /scratch.html (a root scratch.html
  plus src/scratch/main.tsx). Don't touch src/App.tsx.
- The dev server is already running at http://localhost:5173. Don't start another one.
Then verify it yourself with the Playwright browser:
1. Open http://localhost:5173/scratch.html and take screenshots at 1280px and 375px wide.
2. Use the accessibility snapshot to check the toggle's role, name and pressed state.
3. Switch to Yearly with the keyboard and screenshot again.
4. Compare against each acceptance criterion (and @notes/pricing-mock.png if it exists).
Report a table: criterion | pass/fail | evidence. Fix failures and repeat at most 3 rounds,
then stop and show me the final screenshots.
```

While it works, watch the loop. It edits, navigates, screenshots, notices something ("the cards overflow at 375px") and fixes it. If it drifts, for example by adding a currency-switcher nobody asked for, press **Esc** and redirect it.

Then check criterion 5 yourself:

```text
Which state does PricingToggle hold, and what is derived? Point to the lines. Is there
any useEffect? If you'd change the design for a real product, explain why. Don't edit.
```

> [!TIP]
> Accessibility snapshots are often *more* useful than screenshots. They tell Claude what a screen reader user gets (roles, names, states) and catch an unlabelled toggle that looks perfect.

## 4. Compare: pasting screenshots by hand (5 min)

Take one screenshot of the 375px view yourself (browser devtools device mode) and paste or drag it into the prompt, or give its file path:

```text
Here's the page on my phone-size viewport. What looks off compared with the spec?
Don't change any code yet.
```

Note the difference:

| | Manual screenshots | Playwright MCP |
|---|---|---|
| Who looks | You choose what to show | Claude navigates, resizes, clicks and re-checks itself |
| Interaction | Static image only | Can use keyboard and click, and read the a11y tree |
| Iteration cost | You run every round | Claude runs rounds until the criteria pass |
| Best for | A quick "what's wrong here?", or designs it can't reach | Repeatable checks against written criteria |

## 5. Lock it in (5 min)

Screenshots prove it once. A test keeps it true.

```text
Write src/scratch/pricing/PricingToggle.test.tsx with Testing Library: switching to
Yearly via keyboard updates all three prices and aria-pressed; Pro shows "Most popular".
Query by role. Run it.
```

Then commit:

```bash
git add src/scratch scratch.html notes/day05-pricing-spec.md
git commit -m "chore(scratch): pricing toggle built via visual feedback loop"
```

## Verify

- `claude mcp list` shows `playwright`, and `/mcp` shows it connected.
- Claude produced a criterion-by-criterion table backed by screenshots at two widths.
- The component holds one piece of state, and prices are derived with no `useEffect`.
- `npm test -- --run src/scratch` passes.

## Reflect (write in `notes/day05.md`)

- Which acceptance criterion did Claude fail first, and did it notice the failure itself from the screenshot or snapshot?
- Which of your criteria were too vague to verify? Rewrite one so a machine could check it.
- When would you still paste a screenshot manually instead of using MCP?
- Did the generated component follow "minimal state, derive during render"? What would you say in a code review?

> [!INTERVIEW] "How do you use AI tools for UI work without getting sloppy UI?"
> "I never let the agent work blind. I give it a spec with checkable acceptance criteria and, where there's one, a mock. Then I give it a way to see the result. With the Playwright MCP server it opens the page, screenshots it at desktop and mobile widths, reads the accessibility tree and checks keyboard interaction, then iterates against the criteria. I review the final screenshots and the code for things like state design and a11y, and I turn the important behaviour into Testing Library tests so it stays correct."
