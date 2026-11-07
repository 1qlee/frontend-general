## Goal

Take Claude Code out of your terminal and into the team workflow. You'll put fe-gym on GitHub with a normal CI pipeline, install the Claude GitHub app, add an `@claude` workflow and an automated PR review using `anthropics/claude-code-action@v1`, and ask `@claude` to review a real PR. Then you'll run **two agents in parallel on git worktrees**, one writing Playwright e2e tests and one refactoring a component, with guardrails that stop the refactoring agent from "fixing" tests to make them pass.

## Why this matters professionally

Two questions come up in senior interviews more and more: *"How does your team use AI in code review and CI?"* and *"How do you trust code an agent wrote?"* Good answers are about process, not prompts: deterministic CI gates, agent reviews as an extra signal, isolated parallel work, and explicit checks against the best-known agent failure mode, **test tampering**. Editing or skipping a failing test is the shortest path to green, and an agent under pressure will sometimes take it.

## 1. fe-gym on GitHub with a plain CI (6 min)

```bash
gh repo create fe-gym --private --source=. --push
```

Keep it private: anyone who can trigger the Claude workflows spends your API budget. Then let Claude write the pipeline (tooling):

```text
Write .github/workflows/ci.yml: on pull_request and push to main, use Node 22, run npm ci,
npm run typecheck and npm test -- --run, then install Playwright chromium with deps and run
npm run test:a11y. Cache npm. Keep it minimal and explain each step in one line.
```

Push it on a branch, open a PR (`gh pr create --fill`), and make sure CI goes green before you add any AI on top. **Deterministic gates come first.**

## 2. Install the GitHub app and the `@claude` workflow (6 min)

Inside a Claude session in fe-gym:

```text
/install-github-app
```

It walks you through installing the Claude GitHub app on the repo and adding the `ANTHROPIC_API_KEY` secret. If it also offers to create workflow files **(verify what your version sets up)**, compare them with the reference below rather than ending up with two copies. The mention-driven workflow (`.github/workflows/claude.yml`):

```yaml
name: Claude
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
jobs:
  claude:
    if: contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Read the `permissions` block as a threat model. `contents: write` lets Claude push commits to a branch when you ask it to. If you only ever want answers and reviews, you could drop it to `read` and accept that trade-off. The job runs only when a comment contains `@claude`.

## 3. Automated review on every PR (4 min)

`.github/workflows/claude-review.yml` runs on every PR with a `prompt:` that encodes your review criteria, the CI equivalent of your Day 6 `react-reviewer`:

```yaml
name: Claude review
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review this pull request in a Vite + React 19 + TypeScript repo. Follow CLAUDE.md.
            Focus on correctness bugs, accessibility (roles, names, keyboard, focus), React
            pitfalls (effects, keys, stale closures) and test quality.
            If any *.test.ts(x) or e2e/ file changed, say so FIRST and state whether an assertion
            was weakened, removed or skipped.
            At most 8 findings, each with file:line, severity and a suggested fix.
            Post the review as a PR comment.
```

> [!NOTE]
> Check the action's README for the inputs your version supports beyond `anthropic_api_key` and `prompt`, such as passing CLI options or restricting tools **(verify)**. Every run costs API usage and Actions minutes. On a busy repo, teams limit automated reviews with path filters or a label.

**Headless step idea (not today's task):** a CI job that runs your Day 10 `scripts/perf-review.sh` and posts `.perf/review.md` on the PR. The bash budget check fails the job, and Claude only explains. It needs Claude Code installed in the job and authenticated without a browser, so read the docs for your version before you wire it up.

## 4. Two agents in parallel on worktrees (12 min)

A **worktree** is a second working directory on its own branch that shares the same `.git`. Two sessions in two worktrees can't overwrite each other's files.

```bash
git switch main && git pull
git worktree add ../fe-gym-e2e -b test/signup-e2e
git worktree add ../fe-gym-refactor -b refactor/signup-form
(cd ../fe-gym-e2e && npm install) && (cd ../fe-gym-refactor && npm install)
```

`node_modules` isn't shared, so each worktree needs its own install. Newer versions of Claude Code can create worktrees for you **(verify)**.

> [!WARNING]
> Your Day 9 Playwright config uses `reuseExistingServer: true`. If your main checkout's dev server is running on 5173, the e2e worktree's tests will silently run against **the wrong code**. Give each worktree its own port.

**Terminal 1** (`cd ../fe-gym-e2e && claude`):

```text
Write Playwright e2e tests for my SignupForm on /a11y.html in e2e/signup.spec.ts:
submitting empty shows errors tied to their fields (aria-invalid + aria-describedby), focus moves to
the first invalid field, fixing the errors and submitting shows success, and the whole flow works
keyboard-only. Use role-based locators and web-first assertions; no waitForTimeout.
Make the port configurable in playwright.config.ts via a PORT env var (default 5173, with
--strictPort) and run with PORT=5174. Test the CURRENT behaviour. Don't modify anything under src/.
If a test fails because of a real bug, stop and tell me.
```

**Terminal 2** (`cd ../fe-gym-refactor`). Before you start Claude, add a guard that applies **only in this worktree**. `.claude/settings.local.json` is personal and git-ignored, so it stays local:

```bash
#!/usr/bin/env bash
# .claude/hooks/no-test-edits.sh (PreToolUse on Edit|Write, refactor worktree only)
file=$(jq -r '.tool_input.file_path // empty')
if [[ "$file" == *.test.ts || "$file" == *.test.tsx || "$file" == */e2e/* ]]; then
  echo "Tests are read-only in this session. Report the failing test instead of editing $file." >&2
  exit 2
fi
exit 0
```

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/no-test-edits.sh" }]
      }
    ]
  }
}
```

`chmod +x` the script, start `claude`, and give it the refactor. This is the one place where you explicitly lift coaching mode, because today's skill is *supervising* a refactor, not writing the drill:

```text
Refactor src/components/a11y/SignupForm.tsx: extract validation into a typed useSignupValidation
hook and a reusable <Field> component (label, input, error linked with aria-describedby).
Behaviour, DOM semantics and focus handling must stay identical.
Coaching-mode exception: you may edit this component for this task. But:
- Do NOT create, modify, skip or delete any test (*.test.ts, *.test.tsx, e2e/**). If a test fails,
  stop and explain why. Never change a test to make it pass.
- Plan first, then refactor in small steps, running npm test -- --run and npm run typecheck after each.
```

Switch between the terminals while both run. The guard covers Claude's Edit and Write tools, but a shell command like `sed -i` could still change a file, which is why step 5 checks the result rather than trusting the process.

## 5. Check for tampering, integrate, ask `@claude` (5 min)

In the refactor worktree:

```bash
git status --short                                      # catches new untracked files too
git diff --stat main -- '*.test.ts' '*.test.tsx' e2e/   # must print nothing
git diff main | grep -nE '^\+.*\b(it|test|describe)\.(skip|only|todo)\(' || echo "no skips/only"
```

Then integrate in an order that makes the tests useful. Commit and push the e2e branch and merge it once CI is green. Rebase the refactor branch onto it and run the new e2e suite against the refactor. Now the tests written by one agent guard the code changed by the other:

```bash
git add src && git commit -m "refactor(signup): extract useSignupValidation and Field"
git fetch origin && git rebase origin/main
PORT=5175 npx playwright test e2e/signup.spec.ts
git push -u origin refactor/signup-form && gh pr create --fill
```

On the refactor PR, leave a comment:

```text
@claude Review this refactor: is behaviour identical to main, including focus handling and ARIA
attributes? Did any test file change? List anything that needs a human decision.
```

Read the automated review and the `@claude` reply *as one reviewer among several*, then merge it yourself. Clean up with `git worktree remove ../fe-gym-e2e` and `git worktree remove --force ../fe-gym-refactor` (`--force` because of the untracked hook files).

## Verify

- `ci.yml` is green on a PR, and `claude.yml` plus `claude-review.yml` exist on `main`. The automated review posted a comment.
- `@claude` replied on the refactor PR.
- `e2e/signup.spec.ts` passed on `main` *and* against the rebased refactor.
- `git diff --stat main -- '*.test.ts' '*.test.tsx' e2e/` was empty in the refactor branch before you merged.

## Reflect (write in `notes/day13.md`)

- What did the automated review catch that CI didn't, and what was noise? Would you keep it on every PR?
- Did either session try to touch a test, or stop and report a failing one? What made the difference: the prompt, the hook or the order you integrated in?
- Why merge the e2e branch before the refactor? What could go wrong the other way round?
- Where did running two sessions in parallel save time, and where did it cost you attention?

> [!INTERVIEW] "How would you bring AI agents into a team's CI and review process?"
> "In layers, with deterministic gates first. CI runs type checks, unit, e2e and accessibility tests, and those decide whether a PR can merge. On top of that, the Claude GitHub action does an automated review with our criteria in the prompt, and engineers can mention `@claude` on a PR to ask questions or request a change. It's one reviewer among several, and a human approves every merge. For bigger work we run agents in parallel on separate git worktrees, for example one writing e2e tests while another refactors, and we merge the tests first so they guard the refactor. The failure mode I watch for is test tampering, so refactoring prompts say tests are read-only, a hook blocks test edits in that session, and both CI and the review flag any change to a test file."
