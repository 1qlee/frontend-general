## Why interviewers ask about this

"How do you use AI tools?" is now a standard question in frontend loops, and the follow-ups go deeper fast: *How do you know the output is right? What goes wrong? What wouldn't you let it do?* Interviewers are separating three groups:

1. People who **don't use agents** (a red flag on many teams now).
2. People who **use them as a slot machine**: prompt, accept, hope. This is a bigger red flag than not using them at all.
3. People who **understand the machine**: they know the model only sees its context, they design ways for it to check its own work, and they can name the failure modes before they happen.

For thirteen days you've practised individual features (plan mode, commands, hooks, MCP, subagents, skills, headless mode, CI). Today you put them into a mental model you can explain on a whiteboard, so that every feature becomes the answer to a question about **context** or **verification**.

> [!INTERVIEW] The one-sentence model
> "A coding agent is a model in a loop with tools: it gathers context, takes an action, checks the result, and repeats until it thinks it's done. My job is to control what goes into its context and to make sure 'done' is checked by something objective: tests, types, a linter or a screenshot, not the model's own opinion."

## The agent loop: gather context → act → verify → repeat

A chat assistant answers from what's in the conversation. An **agent** can also call **tools**, and Claude Code runs it in a loop:

1. **Gather context.** Read files, search the codebase, run `git log`, open a page in a browser, call an MCP server.
2. **Act.** Edit or write files, run commands.
3. **Verify.** Run the tests, the type-checker or the linter, take a screenshot, read the output.
4. **Repeat** until the model decides the task is complete (it stops calling tools and answers), or something stops it: you press **Esc**, a hook blocks it, a permission prompt waits for you, or a turn limit (`--max-turns` in headless mode) runs out.

The key fact behind everything else: **the model only knows what is in its context window.** It has not "indexed" your repo. At the start of a session it sees its system prompt, the definitions of the tools it can call, your `CLAUDE.md` files, and the names and descriptions of available skills and subagents. Everything else it learns by calling tools, and every tool result is appended to the conversation.

Here is a toy version of the loop. The "model" is scripted, but the control flow is the real shape: the model only sees the transcript, every tool result is appended to it, the loop has a hard cap, and it finishes when the model stops asking for tools.

```ts run
// A toy agent loop. The "model" is scripted; the shape of the loop is what matters.
type ToolName = 'read' | 'edit' | 'test';
type Step = { say: string; call?: { tool: ToolName; arg: string } };

const files: Record<string, string> = { 'sum.ts': 'export const sum = (a, b) => a - b;' };

const tools: Record<ToolName, (arg: string) => string> = {
  read: (path) => files[path] ?? 'ENOENT',
  edit: (code) => {
    files['sum.ts'] = code;
    return 'edited sum.ts';
  },
  test: () => (files['sum.ts'].includes('a + b') ? 'PASS 3/3' : 'FAIL sum(1, 2): expected 3, received -1'),
};

// The model never sees `files` directly, only the transcript.
function fakeModel(transcript: string[]): Step {
  const last = transcript[transcript.length - 1];
  if (transcript.length === 1) return { say: 'Read the code first.', call: { tool: 'read', arg: 'sum.ts' } };
  if (last.startsWith('export')) return { say: 'Reproduce the bug with the tests.', call: { tool: 'test', arg: '' } };
  if (last.startsWith('FAIL')) return { say: 'It subtracts. Fix it.', call: { tool: 'edit', arg: 'export const sum = (a, b) => a + b;' } };
  if (last.startsWith('edited')) return { say: 'Verify the fix.', call: { tool: 'test', arg: '' } };
  return { say: 'Tests pass. Done.' };
}

const transcript = ['USER: sum(1, 2) returns -1, please fix'];
for (let turn = 1; turn <= 10; turn++) { // always cap the loop (cf. --max-turns)
  const step = fakeModel(transcript);
  console.log(`turn ${turn}: ${step.say}`);
  if (!step.call) break; // no tool call = the model believes it is finished
  const result = tools[step.call.tool](step.call.arg);
  console.log(`   ${step.call.tool} → ${result}`);
  transcript.push(result); // every tool result is appended to the context
}
console.log(`context used: ${transcript.join('\n').length} chars`);
```

Try deleting the "Verify the fix" branch so the model declares victory right after editing. The output still *says* "done". That is the **overconfident edit** failure mode in miniature: without a verification step, "done" is just an opinion.

{{quiz:agent-sees}}

## Tools, permissions and hooks

In Claude Code the tools fall into a few families:

| Family | Examples | What to watch |
|---|---|---|
| Read & search | `Read`, `Grep`, `Glob` | Cheap per call, but large files and broad searches fill context |
| Change | `Edit`, `Write` | Gated by permissions; checkpoints let you rewind Claude's edits |
| Execute | `Bash` (tests, builds, git, scripts) | The most powerful tool: anything your user account can do |
| Web | `WebFetch` | Brings **untrusted** text into context |
| Extensions | MCP server tools (Playwright, Chrome DevTools, Figma…), subagents, skills | Each one adds capability, and MCP tools add their definitions to context |

Two layers sit around every tool call:

- **Permissions** decide *whether* a call may happen: allow / ask / deny rules in settings, plus the permission mode (default, `acceptEdits`, `plan`, `bypassPermissions`). Deny wins over allow.
- **Hooks** are *your* code that runs at fixed points: `PreToolUse` can block a call (exit code 2, with stderr fed back to Claude), and `PostToolUse` can format, lint or type-check after an edit. Hooks are deterministic. The model can't forget to run them.

That split matters in interviews: **instructions in `CLAUDE.md` are advisory; permissions and hooks are enforced.** "Please don't edit the lockfile" is a request. A `PreToolUse` hook that exits 2 on `package-lock.json` is a guarantee. You will implement exactly that decision logic in today's exercise.

## The context window is the scarce resource

Everything the model works from has to fit in one finite **context window**. What fills it:

- **Fixed overhead every session:** system prompt, tool definitions (including every connected MCP server's tools), all loaded `CLAUDE.md` content and imports, skill and subagent descriptions.
- **Your conversation:** prompts, pasted logs, screenshots.
- **Tool results:** every file read, every grep result, every test run's output. A noisy test reporter or a 2,000-line file read "just in case" costs real space.
- **The model's own output:** plans, explanations, code it wrote.

Run `/context` in a session to see the breakdown. Do it now and then: the first time, people are usually surprised by how much the MCP tool definitions and a long `CLAUDE.md` cost before they've typed anything.

### Context rot

Bigger is not automatically better. As a session grows with stale exploration, abandoned approaches, old error messages and superseded plans, quality tends to drop: the model attends to irrelevant or outdated material, contradicts earlier decisions, or "fixes" a bug you already fixed. This degradation is often called **context rot**. Symptoms you'll recognise:

- It re-introduces an approach you rejected 40 minutes ago.
- It refers to a file's old contents after you changed it.
- Its edits get sloppier and more generic as the session goes on.

### Compaction

When the window nears its limit, Claude Code **auto-compacts**: it summarises the conversation so far and continues from the summary. You can also run `/compact` yourself, optionally with focus instructions (`/compact keep the failing test names and the decision to use aria-activedescendant`). Compaction is lossy by design. Exact error text, small decisions and file details can disappear. Two habits follow:

1. Prefer **`/clear`** (a fresh context) between unrelated tasks over carrying one giant session all day.
2. For long tasks, keep the important state **outside** the conversation: a checklist or scratchpad file (`notes/plan.md`) the agent updates and re-reads. Files survive `/clear` and compaction; conversation details don't.

**Subagents** are the other big context tool: a subagent runs in its own context window and returns only a summary. "Use a subagent to find every place we read the auth token" can cost the main conversation a paragraph instead of thirty file reads.

> [!AGENT] Context is a budget
> Think of the window like a performance budget. Every file read, MCP server and line of `CLAUDE.md` spends some of it. The habits that keep quality high are about spending less: `/clear` between tasks, subagents for investigation, skills for know-how that's only sometimes needed, and terse test output.

## Verification is the biggest quality lever

Anthropic's own guidance calls giving Claude a way to verify its work the single biggest lever for quality, and the toy loop shows why. The model generates *plausible* code. Plausible code is right most of the time, and the rest of the time nothing in the model itself tells it which case it's in. **An objective signal in the loop** turns "probably right" into "checked":

| Signal | Catches | How to wire it in |
|---|---|---|
| Unit/component tests (Vitest + Testing Library) | Behaviour regressions, edge cases | Tests-first workflow; "run `npm test -- --run` and show me the output" |
| Type-checker (`tsc --noEmit`) | Wrong APIs, wrong prop names, nullability | `PostToolUse` hook after edits, or in the acceptance criteria |
| Linter / formatter | Hooks rules, unused code, style drift | `PostToolUse` hook on `Edit\|Write` |
| Screenshots / accessibility snapshots | Layout, visual diffs, missing labels | Playwright MCP, pasted screenshots |
| E2E / axe checks | Integration, a11y violations | Run in the loop or in CI |

The pattern to say out loud: **define "done" as a command that passes, not as a claim.** In prompts: "Done means `npm test -- --run` and `npm run typecheck` both pass; paste the final output." In automation: hooks and CI make the check impossible to skip.

There's a caveat interviewers like: verification is only as good as the check. If the agent can edit the tests, it can make the check meaningless (see the failure modes below). Tests written *before* the implementation, reviewed by you and then protected, are far stronger evidence than tests the agent wrote alongside its own code.

## Models, cost and speed

You can switch models with `/model` (aliases such as `opus`, `sonnet`, `haiku`), set `model:` in a subagent's frontmatter, or pass `--model` in headless runs. Some versions offer an `opusplan` alias that plans with Opus and executes with Sonnet (verify in your version). Typical trade-offs:

- **Larger models** are better at ambiguous design, unfamiliar codebases and long multi-step reasoning. They are slower and cost more per token.
- **Smaller, faster models** are fine for well-specified, mechanical work: summarising a file, running a checklist review, simple per-file migrations in a fan-out.
- **Context is cost too.** A bloated context makes every turn more expensive *and* worse. Trimming context is often a better fix than buying a bigger model.
- Check spend with `/cost` or `/usage`, depending on your plan (verify which your version shows). In headless runs, cap work with `--max-turns`.

A sensible default for frontend work: a strong model for planning and tricky implementation, a cheaper model for read-only reviewer subagents and bulk mechanical runs, and turn caps on anything unattended.

{{quiz:hallucinated-api}}

## Characteristic failure modes and what to do about each

Agents fail in ways you can predict. Being able to list these with a mitigation for each is one of the strongest signals you can give in an interview.

| Failure mode | What it looks like in frontend work | Why it happens | Mitigation |
|---|---|---|---|
| **Plausible-but-wrong APIs** | `ReactDOM.render` in a React 19 app, a prop your design-system `Button` doesn't have, an old router API | Training data mixes library versions; the code *looks* idiomatic | Type-check after edits (hook); put versions and gotchas in `CLAUDE.md`; tell it to read the component's types or the installed package before using it |
| **Overconfident "done"** | "All tests pass!" when no test command ran | The model predicts a satisfying ending | Define done as a passing command; ask for the output; a `Stop` hook or CI that runs the checks |
| **Scope creep** | A "small fix" that also renames props, reformats unrelated files, adds a dependency | Helpfulness plus no stated boundaries | State constraints ("touch only these files; no new deps"); plan mode first; review the full diff; `CLAUDE.md` rule about dependencies |
| **Editing tests to pass** | An assertion loosened, a case marked `.skip`, a snapshot regenerated | The goal "make tests pass" is satisfied most easily that way | Write and commit tests first; say "do not modify tests"; block test-file edits during implementation with a hook; always read test diffs |
| **Stale assumptions** | Uses a function you deleted, an old file layout, a decision from before compaction | Context holds outdated observations; `CLAUDE.md` drifted from reality | `/clear` and re-read; keep `CLAUDE.md` current; tell it what changed; keep plans in files |
| **Thrashing** | Fix A breaks B, fix B breaks A, round and round | Missing information or a wrong mental model, repeated under pressure | Esc early; rewind to a checkpoint; give the missing fact or a hint; restart with a better prompt |
| **Prompt injection from untrusted content** | An issue, PR comment, web page, dependency README or MCP result containing "ignore previous instructions and…" | The model can't reliably tell data from instructions | Least-privilege tools and permissions; deny reads of secrets; no secrets in the environment; sandbox or container for autonomous runs; trust only vetted MCP servers; human review before anything ships |

> [!MISTAKE]
> "The model is smart enough to ignore malicious instructions." Treat every piece of untrusted text the agent reads as potentially adversarial. The defence is limiting **what the agent can do and reach** (permissions, sandboxing, no secrets, review), not hoping it notices.

> [!MISTAKE]
> Blaming the model for failures that are really context failures. When output is generic or wrong, first ask: *Did it have the information it needed? Did it have a way to check itself?* Most of the time the fix is a better prompt, a `CLAUDE.md` line or a verification step, not a different model.

### The two safety nets

- **Checkpoints** (Esc Esc or `/rewind`) rewind the conversation and/or Claude's file edits. They do **not** undo side effects of shell commands: a database migration, a published package, a deployed preview.
- **Git** is the real safety net: work on a branch, commit at green points, and review `git diff` before every commit. In an autonomous run, git plus an isolated environment are what make mistakes cheap.

> [!INTERVIEW] Naming failure modes
> "The failures I plan for are plausible-but-wrong APIs, claiming 'done' without checking, scope creep, weakening tests to make them pass, and prompt injection from content it reads. Each has a structural fix: type-checks and tests in the loop, tests committed before the implementation, explicit constraints and diff review, and least-privilege permissions so injected instructions can't reach anything that matters."

## Key takeaways

- An agent is a **model in a loop with tools**: gather context → act → verify → repeat, until it stops calling tools or something stops it.
- The model knows **only what's in its context window**. Fixed overhead (system prompt, tools, MCP definitions, `CLAUDE.md`) plus everything it reads. Use `/context` to look.
- Long, cluttered sessions degrade (**context rot**); compaction is lossy. Use `/clear` between tasks, subagents for investigation, and files for durable state.
- **Verification is the biggest quality lever**: define done as a passing command; tests written first are the strongest evidence.
- `CLAUDE.md` is advisory; **permissions and hooks are enforced**.
- Know the failure modes (wrong APIs, false "done", scope creep, test tampering, stale assumptions, thrashing, prompt injection) and the structural mitigation for each.
- Checkpoints don't undo shell side effects; **git** is the real safety net.
