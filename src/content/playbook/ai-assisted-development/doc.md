## Why interviewers ask about AI tools

Almost every loop now includes some version of "How do you use AI in your work?", and some companies run coding rounds where AI assistants are allowed or expected. The interviewer is not checking whether you use AI. They're checking your **judgement**:

| They're probing | A strong answer shows |
|---|---|
| **Verification** | You never trust output you haven't tested, type-checked and read |
| **Ownership** | You can explain and defend every line you ship, whoever typed it |
| **Security awareness** | Secrets, data policies, prompt injection, untrusted dependencies |
| **Effectiveness** | You know where agents help (and where they don't) and use them deliberately |
| **Team thinking** | Shared conventions, reviewable diffs, guardrails, not "my personal magic" |

There are two losing positions: **"I don't really use it"** (sounds behind) and **"it writes most of my code"** (sounds risky). The winning position: *a disciplined engineer who uses agents as leverage inside a verification loop*.

> [!INTERVIEW] Your one-sentence positioning
> "I use coding agents like Claude Code as leverage, not as an autopilot: I give them good context, have them plan before they change anything, keep changes small, and verify everything with tests, types and a proper code review, because I own what gets merged."

## The workflow, step by step

| Step | What you do | Why it matters | Tooling you can name |
|---|---|---|---|
| 1. **Context** | Keep project conventions, commands and gotchas in a context file the agent reads every session | Consistent output that matches the codebase | `CLAUDE.md` project memory |
| 2. **Explore & plan** | Ask the agent to read the relevant code and propose a plan; review it before any edit | Catches a wrong approach when it's cheap to fix | Plan mode |
| 3. **Small slices** | One focused change at a time; small diffs | Reviewable, revertible, easy to reason about | Clearing context between tasks |
| 4. **Verify** | Tests first or alongside; the agent runs tests, type-check and lint and iterates until green | Objective feedback instead of "looks right" | Test runner, `tsc`, linter, hooks |
| 5. **Review like a PR** | Read every line, ask why, check edge cases, a11y, security, new dependencies | Ownership; catches plausible-but-wrong code | Your normal review checklist |
| 6. **Commit & document** | Atomic commits, clear messages, update the context file with new learnings | The next session (and teammate) starts smarter | Git, PR templates |

### Context files

A context file like `CLAUDE.md` (checked into the repo) is loaded into the agent's context at the start of a session. Keep it short and factual: what an excellent new teammate would need on day one.

```md
# fe-gym
## Commands
- Dev: `npm run dev` · Tests: `npm test` · Types: `npm run typecheck` · Lint: `npm run lint`
## Conventions
- React 19 function components, TypeScript strict, no `any` (use `unknown` + narrowing)
- Tests: Vitest + Testing Library, query by role/label, no implementation-detail assertions
- Server data via TanStack Query; local UI state with useState/useReducer
## Gotchas
- Never edit files in src/api/generated (regenerate with `npm run gen:api`)
- Run typecheck and tests before declaring a task done
```

> [!AGENT]
> Treat the context file like code: review changes to it, keep it current, and prune it. A bloated or outdated context file degrades output as much as a missing one.

### Plan before code

For anything beyond a one-line fix: have the agent **explore** (read the relevant files), **propose a plan** (files to touch, approach, risks, test strategy), and only then implement. Claude Code's plan mode exists for this: the agent researches and proposes without editing. Reviewing a 10-line plan is far cheaper than reviewing a 400-line wrong diff.

### Tests as verification

Agents are excellent at iterating against an objective signal. Give them one:

1. Write (or have the agent write, then review) a **failing test** that captures the requirement.
2. Ask for the minimal implementation; the agent runs the tests and iterates.
3. Check the tests themselves: do they assert **behaviour**, cover edge cases, and fail for the right reason? An agent can make tests pass by weakening them.

### Review output like a pull request

- [ ] Does it actually meet the requirement, including edge cases (empty, error, slow network, cancellation)?
- [ ] Any new dependency? Does the package exist, is it maintained, is it needed?
- [ ] Types: no `any`, no `@ts-ignore`, no unchecked `as` casts hiding problems
- [ ] Tests: meaningful assertions, nothing skipped or loosened to go green
- [ ] Accessibility: semantic elements, labels, keyboard support
- [ ] Security: no `dangerouslySetInnerHTML` on untrusted data, no secrets, safe URL handling
- [ ] Consistency with codebase conventions; no dead code or invented APIs

### Guardrails and permissions

- **Permissions:** allow routine commands (run tests, type-check) and require approval or deny risky ones (deleting files, pushing, reading `.env` files). Claude Code supports allow/deny permission rules in settings checked into the repo.
- **Hooks:** deterministic scripts that run at points in the agent's lifecycle, e.g. format after every edit or block commands matching a dangerous pattern. They enforce rules instead of hoping the model follows instructions.
- **Isolation:** run autonomous or long-running agents in a container or sandbox with least-privilege credentials.
- **Human checkpoints:** a person reviews and approves before anything is merged or deployed.

### Security: secrets and prompt injection

| Risk | What it looks like | Mitigation |
|---|---|---|
| **Secret leakage** | API keys pasted into prompts, `.env` read into context | Deny rules for secret files, environment variables/secret managers, rotate anything leaked |
| **Data policy** | Proprietary code or customer data sent to an unapproved tool | Use company-approved tools and plans; know the data-retention terms |
| **Prompt injection** | Instructions hidden in a web page, issue, PR comment, README or tool output that the agent reads and follows | Treat external content as untrusted data, least-privilege tools, human approval for risky actions, review every diff |
| **Hallucinated dependencies** | The agent imports a package that doesn't exist (an attacker may register that name) | Verify every new package before installing |
| **Plausible-but-wrong code** | Subtle security bugs: missing auth checks, unsafe HTML, permissive CORS | Security review checklist; tests for the abuse cases |

### Extending the agent

These features exist in Claude Code; describe them in terms of the **problem they solve**, not as a feature list.

| Feature | What it is | Example use you can describe |
|---|---|---|
| **`CLAUDE.md`** | Project (and user) memory loaded each session | Conventions, commands, architecture notes |
| **Plan mode** | Research and propose without editing | Agree the approach for a refactor before any change |
| **Custom slash commands** | Reusable prompts checked into the repo | `/new-component` that scaffolds a component, story and test to team conventions |
| **Subagents** | Specialised agents with their own instructions and context window | A "reviewer" subagent that checks diffs for a11y and security issues |
| **Hooks** | Scripts run on agent lifecycle events | Run the formatter after edits; block `git push --force` |
| **MCP servers** | A standard protocol for connecting tools and data sources | Browser automation to check the UI, an issue tracker, design files |
| **Headless mode (`claude -p`)** | Non-interactive runs from scripts and CI | Generate a changelog draft, triage lint failures in a pipeline |
| **GitHub Actions integration** | Run the agent from issues and PRs | Mention it on a PR to address review comments, with a human approving the result |

## Strong answers to the common questions

> [!INTERVIEW] "How do you use AI tools in your day-to-day work?"
> "Mostly in three ways. First, exploration: asking an agent to map an unfamiliar part of the codebase or explain a gnarly function, which I then verify by reading the code. Second, implementation of well-specified changes: I keep a `CLAUDE.md` with our conventions and commands, ask for a plan first, review it, then let it implement in small steps while running the tests and type-checker. Third, the tedious parts: test cases for edge conditions, migrations, codemods, boilerplate. I'm deliberate about where I *don't* use it: core architectural decisions and anything security-sensitive get my full attention. And everything goes through the same review as a teammate's PR."

> [!INTERVIEW] "How do you make sure AI-generated code is good?"
> "The same way I'd make sure any code is good, with extra scepticism. I rely on objective checks, not vibes: a failing test that captures the requirement before implementation, strict TypeScript, lint, and running the app for UI work. Then I review the diff line by line: edge cases, accessibility, new dependencies, anything that looks plausible but is invented. I keep changes small so review stays meaningful, and I watch for the agent 'fixing' tests by weakening them. If I can't explain a line, it doesn't get merged."

> [!INTERVIEW] "Will AI replace frontend developers?"
> "It's already changing the job: the cost of producing code is dropping, so value shifts towards deciding *what* to build, specifying it precisely, and verifying it: product judgement, architecture, accessibility, performance, and review. Those are hard to automate because they depend on context and trade-offs. I'd expect fewer hours on boilerplate and more on design, quality and integration. Developers who use these tools well will outperform those who don't, so I invest in it, but I don't see the need for engineers who understand the system going away."

> [!INTERVIEW] "Tell me about a time an AI tool got something wrong."
> Have a real story ready. Structure: what you asked for → what it produced (plausible but wrong: e.g. an effect with a missing cleanup causing a race condition, a test that asserted implementation details, a non-existent API option) → **how you caught it** (test, review, profiler) → what you changed in your workflow (a context-file rule, a test, a hook).

> [!INTERVIEW] "What are the risks, and how do you manage them?"
> "Three main ones. Quality: confident, plausible but wrong code, managed with tests, types and review. Security: secrets in context, prompt injection from untrusted content, and hallucinated packages, managed with permission rules, least privilege, human approval for risky actions and checking dependencies. And skills atrophy or loss of understanding, managed by staying the owner: I design the approach, read every diff, and write the tricky parts myself."

**Other questions to prepare:** "When *don't* you use AI?" (novel architecture, security-critical code, when explaining the problem takes longer than solving it, when learning a fundamental) · "How would you roll it out to a team?" (shared context files and commands in the repo, guidelines on data and review, pilot with metrics, keep human review mandatory) · "How do you measure whether it helps?" (cycle time, review churn, escaped defects, not lines of code).

## Weak vs strong phrasing

| Weak | Strong |
|---|---|
| "I use Copilot/Claude for everything." | "I use agents for well-specified changes inside a test-and-review loop." |
| "It's usually right." | "I verify with tests and types; I assume it can be confidently wrong." |
| "I just tell it what I want." | "I give it context: conventions, the relevant files, constraints, and a definition of done." |
| "I don't really trust it, so I don't use it." | "I use it where verification is cheap and avoid it where mistakes are expensive and hard to detect." |
| "It wrote this feature." | "I designed the approach, it implemented the plan, I reviewed and adjusted the edge cases." |

## AI-allowed interview rounds

Rules vary widely: some companies allow an inline assistant, some an agent, some only documentation. **Ask at the start.**

> [!INTERVIEW] Clarify the rules
> "Just to confirm: am I allowed to use an AI assistant in this round, and is there anything you'd prefer I do without it? I'll narrate when I'm using it and why."

### Do

- **Plan first, yourself, out loud.** Decompose the problem before prompting. The interviewer is grading your thinking, and this shows it.
- **Narrate intent before each prompt:** "I'll ask it to scaffold the reducer and its types; I'll write the tests and the race-condition handling myself."
- **Prompt with constraints:** types, edge cases, accessibility, "no new dependencies".
- **Verify every output:** read it, run it, test it. Point out what you're checking.
- **Keep ownership:** reject suggestions out loud with reasons ("It's mutating state here, so I'll fix that by hand").
- **Use it for leverage:** boilerplate, test-case brainstorming, recalling an API's exact signature.

### Don't

- Paste the whole prompt into the tool and wait.
- Accept code you can't explain line by line; expect "walk me through this".
- Spend more than a minute or two fighting a prompt. Write it yourself.
- Let it add dependencies or change architecture without a decision from you.
- Use AI when it's not allowed. Integrity failures end processes instantly.

### Time plan: 45 minutes with AI allowed

| Minutes | Activity |
|---|---|
| 0–5 | Clarify requirements and the AI rules; write the plan and types yourself |
| 5–10 | Write 2–4 tests or examples that define "done" |
| 10–30 | Implement in slices; delegate boilerplate, narrate, review each chunk |
| 30–38 | Run tests, fix failures, handle edge cases, a11y pass |
| 38–45 | Walk through the code, explain decisions, discuss what you'd improve |

> [!TIP]
> When the assistant produces something wrong, that's an opportunity: "That's subtly wrong. It doesn't abort the previous request, so a slow response could overwrite a newer one. I'll fix it directly." Catching AI mistakes on camera is one of the strongest signals in an AI-allowed round.

## Red flags interviewers listen for

- No mention of tests, types or review when describing the workflow
- Can't explain code they "wrote" minutes ago
- No awareness of secrets, data policy or prompt injection
- Treating AI output as authoritative ("the AI said this API exists")
- Over-claiming productivity ("10× faster at everything") without nuance
- Dismissiveness ("it's just autocomplete"), which suggests they haven't explored it seriously

## Key takeaways

- Position yourself as **a disciplined engineer using agents as leverage inside a verification loop**.
- The loop: **context → plan → small slices → verify (tests, types, lint) → review like a PR → commit**.
- Name the mechanisms concretely: `CLAUDE.md`, plan mode, custom commands, subagents, hooks, MCP, headless mode, CI integration, each tied to a problem it solves.
- Security: secrets out of context, untrusted content is data not instructions, verify new packages, least privilege.
- In AI-allowed rounds: clarify rules, plan yourself, narrate, verify everything, own every line.
