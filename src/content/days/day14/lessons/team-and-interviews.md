## Why interviewers ask about this

Senior and lead interviews move from "do you use AI?" to "**how would you make it work for a team?**" That question has a lot inside it: shared configuration, security, CI, code review, cost, and whether you can tell a real productivity gain from a feeling of one. A strong answer sounds like someone who has rolled out a tool before. It covers guardrails first, then conventions, measurement and iteration.

The other half of this lesson is personal: how to *talk* about AI-assisted work so it signals judgement rather than dependence, and how to behave in the growing number of interview rounds where AI tools are allowed.

## Shared configuration lives in the repo

Everything that makes the agent behave like a member of *this* team should be versioned with the code, reviewed in PRs and identical for everyone:

```text
fe-app/
├── CLAUDE.md                    # project memory: commands, architecture, conventions, don'ts
├── .mcp.json                    # team MCP servers (written by `claude mcp add --scope project …`)
└── .claude/
    ├── settings.json            # team permissions + hooks (checked in)
    ├── settings.local.json      # personal overrides (git-ignored)
    ├── commands/                # /new-component, /a11y-check, /pr-description …
    ├── agents/                  # react-reviewer.md, a11y-auditor.md …
    ├── skills/                  # forms-with-design-system/SKILL.md …
    └── hooks/                   # format.sh, protect.sh, typecheck.sh
```

What this buys you: a new joiner clones the repo and gets the same commands, reviewers, guardrails and browser tooling as everyone else on day one. Changes to how the agent behaves are visible in diffs and have reviewers. For config shared across *many* repos, **plugins** (`/plugin`) bundle commands, subagents, skills, hooks and MCP servers so you can install them from a marketplace.

Personal things stay personal: your own allow rules go in `.claude/settings.local.json`, and your style preferences go in `~/.claude/CLAUDE.md`.

## Least-privilege permissions

Start from "ask for everything", then allow the safe, frequent commands so people aren't trained to click "yes" without reading. Deny the things that should never happen:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test:*)",
      "Bash(npm run test:*)",
      "Bash(npm run lint:*)",
      "Bash(npm run typecheck:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Edit(./src/**)",
      "WebFetch(domain:developer.mozilla.org)"
    ],
    "ask": ["Bash(git push:*)", "Bash(npm install:*)"],
    "deny": ["Read(./.env)", "Read(./.env.*)", "Edit(./src/generated/**)"]
  }
}
```

Principles:

- **Deny wins over allow.** A deny in the project settings can't be undone by someone's local allow. That's what you want for secrets.
- **Prompt fatigue is a security problem.** If the agent asks 40 times a session, people stop reading prompts. Allowlisting the boring, safe commands makes the remaining prompts meaningful.
- **Layer the guarantees.** Permissions decide what's allowed; hooks add logic permissions can't express (e.g. block `rm -rf` anywhere in a chained command, which is today's exercise); the sandbox limits the blast radius if both are bypassed.
- `bypassPermissions` (`--dangerously-skip-permissions`) is only for **isolated containers or VMs**. Never on your laptop with your SSH keys and cloud credentials.

{{quiz:deny-wins}}

## Secrets

- **Never put secrets in `CLAUDE.md`, commands, skills, prompts or `.mcp.json`.** Those are checked in, or sent to the model, or both.
- **Deny reads of secret files** (`Read(./.env)`, `Read(./.env.*)`) and keep real credentials out of the agent's environment where you can. What isn't reachable can't be exfiltrated by an injected instruction.
- **Frontend-specific trap:** Vite exposes `VITE_`-prefixed variables to client code, which means they end up in the public bundle. An agent "fixing" a missing API key by adding `VITE_STRIPE_SECRET_KEY` has just published a secret. Review env changes with that in mind.
- In CI, use the platform's secret store (`secrets.ANTHROPIC_API_KEY` in GitHub Actions) and give the job only the secrets it needs.
- For MCP servers that need tokens, check your version's docs for how credentials are passed (verify), and keep tokens out of the checked-in `.mcp.json`.

## Sandboxing and containers for autonomous runs

The more autonomy, the more isolation. A rough ladder:

| Autonomy | Isolation that fits |
|---|---|
| Interactive, default mode, you approve actions | Your machine, with sensible permissions |
| `acceptEdits` on a feature branch | Your machine + git as the safety net (commit at green points) |
| Long unattended runs, broad Bash access | `/sandbox` for OS-level filesystem/network isolation of shell commands (verify platform support), or a container |
| `bypassPermissions`, fan-out over many files, untrusted input (public issues) | An isolated container/VM or CI runner: throwaway checkout, no production credentials, restricted network, nothing outside the branch it can damage |

Checkpoints won't undo a deleted cloud resource or a published package. Isolation decides how bad the worst case can be.

## MCP: trust like a dependency

MCP servers give the agent new tools and data (Playwright and Chrome DevTools for frontend work, Figma for design context). They also bring two risks: **a server is code running with your permissions**, and **it returns content the model reads**, which may be untrusted (a web page, a ticket, a design file comment). Treat adding one like adding a dependency:

- Who maintains it, and is the source available? Is it the official server for that product?
- Pin versions in team config where you can. `@latest` means the code can change under you.
- Keep the set minimal. Every server's tool definitions cost context in every session.
- Add team servers with `--scope project` so `.mcp.json` is reviewed in PRs. Experimental ones stay `--scope local`.
- For remote servers: know what data leaves your machine, and authenticate through `/mcp`.

## CI integration

You set this up on Day 13. Here it is from a team perspective:

- **Mention-driven:** a workflow on `issue_comment` / `pull_request_review_comment` runs `anthropics/claude-code-action@v1` when a comment contains `@claude`. Claude can answer, review, or push commits to a branch.
- **Automated review:** a workflow on `pull_request` with a `prompt:` describing review criteria (your a11y and React checklist, "flag new dependencies", "flag tests that were modified").
- **Headless jobs:** `claude -p` with `--allowedTools`, `--max-turns` and `--output-format json` in a script: summarise a Lighthouse report, triage a failing test, draft release notes.

Team-level rules that make it safe:

- **Least-privilege workflow permissions.** Grant only what that workflow needs. A review-only job shouldn't be able to push. Check the action's docs for what each use requires (verify).
- **Think about who can trigger it.** On a public repo, consider who can post an `@claude` comment and what that run can reach. Issue and PR text is untrusted input: a classic injection vector.
- **The agent's PRs go through the same gates as anyone's:** CI checks, human review, no auto-merge.
- `/install-github-app` walks through installing the GitHub app and adding the API-key secret.

## Reviewing AI-generated code

AI-generated diffs tend to be **plausible, verbose and confidently presented**, which makes them easy to approve without reading. Review them *more* carefully than a colleague's PR, because the author can't be asked "why?" later. A checklist:

| Area | What to check | Frontend red flags |
|---|---|---|
| **Correctness** | Does the diff do what the task asked? Does the agent's summary match the actual diff? | Summary says "handled errors"; the code swallows them |
| **Edge cases** | Empty, loading, error, very long content, rapid input, unmount mid-request | No `AbortController`/ignore flag → stale response overwrites newer state |
| **Security** | Untrusted data into HTML/URLs, secrets, storage | `dangerouslySetInnerHTML` with user content; `href={userUrl}` without a scheme check; tokens in `localStorage`; `VITE_` secrets |
| **Accessibility** | Semantic elements, accessible names, keyboard, focus, correct ARIA | `<div onClick>` buttons; `aria-*` that contradicts native semantics; focus not returned when a dialog closes |
| **Performance** | Unneeded effects/state, re-renders, bundle weight | Derived state synced in `useEffect`; a 70 kB dependency for one helper; unvirtualised 5,000-row list |
| **Tests that actually test** | Would the test fail if the feature broke? | Mocks the unit under test; asserts on a mock it just configured; snapshot-only; `.skip`; assertions loosened in the same PR |
| **Dependencies** | Does the package exist, is it the right one, maintained, licensed, sized? | A hallucinated package name (attackers register these, a.k.a. "slopsquatting"); a duplicate of an existing dep |
| **Conventions** | Reuses existing utilities and components; matches structure and naming | A new `formatDate` next to the existing one; a hand-rolled button instead of the design-system `Button` |
| **Scope** | Only the changes the task needed | Unrelated renames, reformatting, "while I was here" refactors |

{{quiz:fake-test}}

> [!TIP] Make review cheaper, not optional
> Keep diffs small (vertical slices), ask the agent for a summary of *why* each file changed, run a fresh-context reviewer subagent first, and put the mechanical checks (types, lint, tests, axe) in hooks and CI. Your human attention goes to design, correctness and edge cases.

## Measuring impact honestly

"It feels faster" is not evidence. Self-reports about AI productivity are unreliable. In at least one randomised study (METR, 2025), experienced open-source developers working in their own mature repositories were *slower* with AI assistance, while believing it had sped them up. That doesn't mean agents don't help. It means you should measure.

- **Don't measure:** lines of code, number of AI-generated PRs, "% of code written by AI". These reward volume, and more code is often worse.
- **Do measure (against a baseline from before the rollout, on comparable work):** cycle/lead time, time in review, change failure rate and escaped defects, reverts, time for a new joiner to ship a first PR, and cost per task.
- **Watch quality signals:** review comments per PR, flaky tests added, bundle size, a11y violations in CI.
- **Look for where it works and where it doesn't.** Teams typically see the clearest wins on tests, boilerplate, migrations and exploring unfamiliar code, and less on novel design and subtle state or concurrency bugs. Find out what's true for *your* team.

## The Claude Agent SDK, at a high level

The **Claude Agent SDK** (TypeScript `@anthropic-ai/claude-agent-sdk`, Python `claude-agent-sdk`) exposes the same agent loop that powers Claude Code as a library, so you can build your own agents: an internal design-system migration bot, a scheduled a11y triage agent, a PR helper with your company's tools. Use it when `claude -p` in a script or the GitHub Action isn't enough, for example when you need custom tools or tighter integration with your own systems. The principles from this day don't change: least-privilege tools, verification in the loop, turn limits, logging, and human review of what ships.

## Talking about AI-assisted development in interviews

Interviewers want to hear an **accountable engineer using a power tool**. Not a passenger, and not a sceptic who hasn't kept up.

**Do:**

- **Be concrete.** Name your workflow (plan mode, tests first, hooks, reviewer subagents) and give one specific example.
- **Lead with verification and ownership.** "I review every diff; done means tests and types pass; I own what merges."
- **Show judgement about when *not* to use it:** unclear requirements, security-critical code, a subtle bug where you need to build understanding yourself, tiny edits faster by hand.
- **Quantify carefully.** "The migration of 120 components took three days instead of the two weeks we'd estimated, and we verified every file with types and tests" is credible. "It made me 10x" is not.
- **Prepare two stories:** one where the agent created real leverage (and how you verified it), and one where it was confidently wrong (how you caught it, and what you changed: a `CLAUDE.md` line, a hook, a review step).

**Avoid:**

- "I just let it write everything." That signals no ownership.
- "I don't really trust AI, so I don't use it." That signals you're not keeping up, unless it's backed by a specific, reasoned position.
- Blaming the tool: "the AI introduced that bug." You merged it.
- Feature-dumping: listing every Claude Code feature without saying *why* you'd use each one.

> [!INTERVIEW] "How do you use AI in your work?"
> "Daily, but deliberately. For anything non-trivial I have the agent explore and plan first, I review the plan, and I give it a way to verify: tests I've reviewed, type-checks and lint run by hooks after every edit. I use it most for tests, migrations and getting oriented in unfamiliar code; I'm more hands-on for ambiguous design and subtle state bugs. Everything goes through normal review. I read every diff, because I'm accountable for what ships."

## AI-allowed interview rounds

More companies now run rounds where an AI assistant is allowed or even expected. These rounds aren't easier. They grade **judgement, verification and communication** instead of typing speed.

1. **Clarify the rules first.** Which tools are allowed? Agent mode or autocomplete only? Are they grading the final code, the process, or both?
2. **Plan before prompting, out loud.** Restate the problem, edge cases and approach *yourself*. Then: "I'll have the assistant scaffold the reducer and the markup; I'll write the edge-case tests myself."
3. **Prompt like a spec.** Goal, constraints, acceptance criteria. The interviewer is watching how you specify work, and this is where you show it.
4. **Read every line it produces, and narrate.** "It used `index` as the key. That breaks when items are reordered, so I'll change it to `id`." Catching its mistakes out loud is the strongest signal you can give in this format.
5. **Verify visibly.** Run the tests, add the edge cases, tab through the UI, check the empty and error states.
6. **Keep ownership.** You must be able to explain and modify any line without the tool. If asked "why this approach?", the answer is never "the AI chose it."
7. **Stay in small steps.** One big "build the whole thing" prompt makes it hard to review and hard to recover from. Small prompts keep you in control of the design.

> [!MISTAKE]
> Accepting a 150-line generated solution in the first five minutes and then sitting silently. The interviewer has learned nothing about you. Generate less, explain more, and verify on screen.

## Key takeaways

- Team agent config is **code**: `CLAUDE.md`, `.claude/settings.json`, commands, agents, skills, hooks and `.mcp.json` live in the repo and go through review. Personal overrides stay local.
- **Least privilege:** allowlist safe frequent commands, deny secrets, ask for risky ones; deny wins. `bypassPermissions` only in isolated containers/VMs.
- Secrets never go in checked-in agent config; watch for `VITE_` leaks. MCP servers are dependencies with your permissions. Vet, pin and minimise them.
- CI: mention-driven and automated review with `anthropics/claude-code-action@v1`, least-privilege workflow permissions, untrusted issue/PR text, same gates as human PRs.
- Review AI code against a checklist: correctness, edge cases, security, a11y, performance, tests that test, dependencies, conventions, scope.
- Measure outcomes (cycle time, failure rate, review time) against a baseline. Self-reports mislead.
- In interviews: concrete workflow, verification, ownership, judgement about when not to use it. In AI-allowed rounds: plan aloud, prompt like a spec, read and narrate, verify visibly.
