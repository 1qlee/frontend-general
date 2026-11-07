# Claude Code quick reference

The Claude Code features used in this course's labs and on Day 14, in one place. Claude Code changes quickly:
anything marked **(verify)** may differ in your version — check `claude --help`, `/help`, or the official docs
(code.claude.com/docs). Course authors: this file is the source of truth for Claude Code facts in the content.

## Install & start

- Install via the official installer from the docs (native installer for macOS/Linux/WSL, PowerShell installer on
  Windows, Homebrew, or `npm install -g @anthropic-ai/claude-code`). Teach "use the method from the official docs"
  rather than a single command.
- `claude` — interactive session in the current directory (start it from the repo root).
- `claude "explain this repo"` — start with a prompt. `claude -p "…"` — print/headless mode (see below).
- `claude -c` / `--continue` — continue the most recent session in this directory. `claude -r` / `--resume` — pick a past session.
- In-session: `/help` lists commands; `/doctor` checks the installation.

## Memory: CLAUDE.md

- Loaded automatically at session start. Locations: user `~/.claude/CLAUDE.md` (all projects), project `./CLAUDE.md`
  (or `./.claude/CLAUDE.md`, checked in, shared with the team), plus organisation-managed policy files.
  `CLAUDE.md` files in subdirectories are pulled in when Claude works with files in those directories.
- Imports: a line like `@docs/architecture.md` or `@package.json` inside CLAUDE.md includes that file.
- `/init` analyses the repo and drafts a CLAUDE.md. `/memory` opens memory files for editing.
- Good content: commands (build/test/lint/typecheck), architecture in a few lines, conventions, gotchas, explicit
  "don'ts". Keep it short — it costs context every session. Treat it like code: review and update it.

## Settings & permissions

- Files: user `~/.claude/settings.json`; project `.claude/settings.json` (shared, checked in);
  project-local `.claude/settings.local.json` (personal, git-ignored); organisation-managed settings override all.
- Permission rules: `"permissions": { "allow": [...], "ask": [...], "deny": [...] }` with tool patterns, e.g.
  `"Bash(npm run test:*)"`, `"Bash(git diff:*)"`, `"Read(./.env)"`, `"Read(./.env.*)"`, `"Edit(./src/**)"`,
  `"WebFetch(domain:developer.mozilla.org)"`. Deny wins over allow.
- `/permissions` shows and edits rules; when Claude asks permission you can allow once or remember the rule.
- `additionalDirectories` / `/add-dir <path>` give access to directories outside the project.

## Permission modes

- **default** — asks before edits and commands not yet allowed.
- **acceptEdits** — auto-accepts file edits for the session (still asks for risky commands).
- **plan** — read-only research; Claude proposes a plan and waits for approval before changing anything.
- **bypassPermissions** (`--dangerously-skip-permissions`) — no prompts; only in an isolated container/VM.
- Newer versions add further modes (e.g. an "auto" mode that approves low-risk actions) **(verify)**.
- **Shift+Tab** cycles modes in the interactive UI; `--permission-mode plan` starts in a mode.

## Interaction essentials

- `@path/to/file` mentions a file (with autocomplete) so Claude reads it.
- Paste or drag-and-drop screenshots/images into the prompt (or give a file path) — essential for UI work.
- **Esc** interrupts Claude mid-task (context is kept; redirect it). **Esc Esc** (or `/rewind`) opens checkpoints:
  rewind the conversation and/or Claude's file edits to an earlier point. Checkpoints track Claude's edits, not
  side effects of shell commands (database changes, deployed things) — git remains your real safety net.
- `/clear` — fresh context (do it between unrelated tasks). `/compact [focus instructions]` — summarise the
  conversation to free space; auto-compaction happens near the limit. `/context` — see what's using the context window.
- `/model` — switch model (aliases such as `opus`, `sonnet`, `haiku`; `opusplan` uses Opus for planning and Sonnet
  for execution **(verify)**). `/cost` or `/usage` show spend/usage depending on plan **(verify)**.
- `/review` — review a pull request; `/security-review` — security review of pending changes.
- Long-running shell commands (dev servers, watchers) can run in the background **(verify the shortcut)**.

## Custom slash commands & skills

- **Commands:** a markdown file in `.claude/commands/<name>.md` (project) or `~/.claude/commands/` (user) becomes `/name`.
  Optional YAML frontmatter: `description`, `argument-hint`, `allowed-tools`, `model`. In the body, `$ARGUMENTS`
  is everything typed after the command; `$1`, `$2` are positional arguments; `@file` includes files; a line
  starting with `!` followed by a backticked command runs it and injects its output (needs `allowed-tools` for Bash).
- **Skills:** a folder `.claude/skills/<name>/` (or `~/.claude/skills/`) with a `SKILL.md` whose frontmatter has
  `name` and `description` (plus optional fields such as `allowed-tools`). Only the name/description are loaded
  up front; Claude reads the full skill (and any supporting files in the folder) when the task matches the
  description — "progressive disclosure". Skills can also be invoked explicitly as `/name`.
- Recent versions treat commands and skills as one mechanism (commands are simple skills); `.claude/commands/`
  files keep working **(verify)**.
- Rule of thumb: CLAUDE.md = always-true project facts; skill = know-how loaded on demand; command = a reusable
  prompt you trigger; subagent = a separate worker with its own context; hook = deterministic automation; MCP = new tools/data.

## Subagents

- Files in `.claude/agents/<name>.md` (project) or `~/.claude/agents/` (user); create/edit interactively with `/agents`.
- Frontmatter: `name`, `description` (when to use it — Claude delegates based on this), optional `tools`
  (comma-separated; omit to inherit all tools), optional `model` (e.g. `sonnet`, `opus`, `haiku`, `inherit`).
  The body is the subagent's system prompt.
- Each subagent runs in its **own context window** and returns a summary — great for investigation, reviews and
  parallel work without polluting the main conversation. Built-in helpers include an Explore agent and a Plan agent.
- Invoke explicitly ("Use the a11y-reviewer subagent to audit src/components/Dialog.tsx") or let Claude delegate.
  Give read-only reviewers only read tools (`Read, Grep, Glob`).

## Hooks

- Configured under `"hooks"` in a settings file (or `/hooks`). Events include `PreToolUse`, `PostToolUse`,
  `UserPromptSubmit`, `Notification`, `Stop`, `SubagentStop`, `PreCompact`, `SessionStart`, `SessionEnd`.
- Shape:

  ```json
  {
    "hooks": {
      "PostToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format.sh" }]
        }
      ]
    }
  }
  ```

- The hook receives JSON on **stdin** (e.g. `session_id`, `cwd`, `hook_event_name`, `tool_name`, `tool_input` —
  for Edit/Write, `tool_input.file_path`; PostToolUse also gets `tool_response`).
- Exit code **0** = success; **2** = blocking error: stderr is fed back to Claude (for PreToolUse the tool call is
  blocked; for Stop, Claude is told to keep going); any other non-zero = non-blocking error shown to the user.
- JSON output on stdout can give finer control, e.g. for PreToolUse
  `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "…"}}`
  (`allow` / `deny` / `ask`) **(verify exact fields before teaching them as required)**.
- Hooks run with your user's permissions — review scripts like any code. Typical frontend uses: format/lint edited
  files, run `tsc --noEmit` after edits, block edits to `.env`/lockfiles/generated code, notify when Claude needs input.

Example script (`.claude/hooks/format.sh`):

```bash
#!/usr/bin/env bash
file=$(jq -r '.tool_input.file_path // empty')
[[ "$file" =~ \.(ts|tsx|css|md)$ ]] && npx prettier --write "$file" >/dev/null 2>&1
exit 0
```

Example guard (`.claude/hooks/protect.sh`, PreToolUse on `Edit|Write`):

```bash
#!/usr/bin/env bash
file=$(jq -r '.tool_input.file_path // empty')
if [[ "$file" == *.env* || "$file" == *package-lock.json ]]; then
  echo "Editing $file is not allowed — ask the human." >&2
  exit 2
fi
exit 0
```

## MCP (Model Context Protocol)

- Add servers: `claude mcp add <name> -- <command> [args…]` (local stdio process) or
  `claude mcp add --transport http <name> <url>` (remote). `claude mcp list`, `claude mcp remove <name>`, `/mcp`
  in-session (status, authentication).
- Scopes: `--scope local` (default, just you, this project), `--scope project` (writes `.mcp.json`, checked in for
  the team), `--scope user` (all your projects).
- Frontend-relevant servers: Playwright MCP (`claude mcp add playwright -- npx @playwright/mcp@latest`) lets Claude
  drive a real browser, read accessibility snapshots and take screenshots; Chrome DevTools MCP
  (`claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest`) exposes performance traces, console and
  network; Figma provides an MCP server for design context **(verify its current setup in Figma's docs)**.
- MCP servers are code running with your permissions and can return untrusted content — install only servers you trust.

## Headless / programmatic

- `claude -p "prompt"` runs non-interactively and prints the result. Pipe input: `cat lighthouse.json | claude -p "…"`.
- Useful flags: `--output-format text|json|stream-json`, `--allowedTools "Read,Grep,Bash(npm run lint:*)"`,
  `--disallowedTools`, `--permission-mode`, `--max-turns <n>`, `--model`, `--append-system-prompt "…"`.
  JSON output includes the final `result` and metadata such as the session id and cost **(verify field names)**.
- Fan-out pattern: generate a task list, then loop over it calling `claude -p` per item with restricted tools.
- **Claude Agent SDK** (TypeScript `@anthropic-ai/claude-agent-sdk`, Python `claude-agent-sdk`) exposes the same
  agent loop as a library for building your own agents.

## GitHub & CI

- `/install-github-app` (run inside Claude Code) walks through installing the Claude GitHub app and adding the API
  key secret. The official action is `anthropics/claude-code-action@v1`.
- Mention-driven workflow: on `issue_comment` / `pull_request_review_comment`, run the action when the comment
  contains `@claude`; Claude can answer, review, or push commits to a branch.
- Automated review: on `pull_request`, run the action with a `prompt:` describing review criteria.

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

## Parallel work

- Run several sessions on separate **git worktrees** so they don't trample each other:
  `git worktree add ../fe-gym-tests -b chore/e2e-tests` → `cd ../fe-gym-tests && claude`.
  Newer versions can create worktrees for you **(verify)**.
- Writer/reviewer pattern: one session implements, a fresh session (clean context) reviews the diff.

## Other features worth knowing

- **Plugins** (`/plugin`): install bundles of commands, subagents, skills, hooks and MCP servers from marketplaces.
- **Sandboxing** (`/sandbox`): OS-level filesystem/network isolation for shell commands **(verify platform support)**.
- **Status line** (`/statusline`), **IDE integrations** (VS Code extension, JetBrains plugin), Claude Code on the
  web / cloud sessions, desktop app.
- **Output styles** such as an explanatory/learning style that explains choices or asks you to write parts yourself **(verify availability)**.

## Best practices (Anthropic's guidance, paraphrased)

1. **Explore → plan → code → commit.** Have Claude read relevant files first (tell it not to write code yet), use
   plan mode or ask for a plan, review it, then implement, verify, and commit with a good message.
2. **Test-driven:** have Claude write tests from a spec, confirm they fail, commit them, then implement until they
   pass without modifying the tests.
3. **Visual iteration:** give a mock/screenshot, let Claude implement, screenshot the result (Playwright MCP or
   manually), compare, iterate 2–3 times.
4. **Be specific:** files, constraints, examples, acceptance criteria and how to verify. Vague prompts get generic code.
5. **Course-correct early:** Esc to interrupt, rewind to a checkpoint, or ask for a plan first.
6. **Manage context:** `/clear` between tasks; use subagents for investigation; keep a checklist/scratchpad file for big tasks.
7. **Give it a way to verify** its own work: tests, type-checks, linters, screenshots — the biggest quality lever.
8. **Automate** repeated workflows with commands/skills, hooks and headless mode; review agent output like any PR.
