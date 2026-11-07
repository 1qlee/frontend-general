## Goal

Make fe-gym enforce its own rules **deterministically**. You'll write a project `.claude/settings.json` with:

- a permissions allowlist for safe commands, and deny rules for secrets
- a **PostToolUse** hook that runs Prettier on every file Claude edits
- a **PostToolUse** hook that type-checks after edits and feeds errors back to Claude (exit code 2)
- a **PreToolUse** guard that blocks edits to `.env*` files and lockfiles

Then you'll try to break your own guardrails.

## Why this matters professionally

`CLAUDE.md` is *advice*: the model usually follows it, but nothing guarantees that. Hooks and permissions are *enforcement*: they run every time, whatever the model decides. "Format after every edit", "type errors must be fixed" and "never touch secrets" are rules a team can't leave to chance. You can answer "how do you keep an agent safe in a real codebase?" with specifics only if you've built these layers yourself.

## 1. Settings scopes and the allowlist (7 min)

Claude Code reads settings from several files:

| File | Scope | Checked in? |
|---|---|---|
| `~/.claude/settings.json` | You, in every project | No |
| `.claude/settings.json` | This project, for everyone | **Yes**, shared with the team |
| `.claude/settings.local.json` | This project, just you | No (git-ignored) |
| Organisation-managed settings | Everyone in the org | Set by admins; override everything |

Team rules (the hooks, the denied secrets) go in `.claude/settings.json`. Your personal experiments go in `settings.local.json`. Install the tools the hooks need first:

```bash
npm install -D prettier
jq --version        # the hook scripts parse their JSON input with jq; install it if missing
echo "VITE_API_URL=https://example.test" > .env
grep -qx ".env" .gitignore || echo ".env" >> .gitignore
```

Create `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test:*)",
      "Bash(npm run test:*)",
      "Bash(npm run typecheck)",
      "Bash(npx tsc:*)",
      "Bash(npx vitest:*)",
      "Bash(npx prettier:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ],
    "deny": ["Read(./.env)", "Read(./.env.*)"]
  }
}
```

`Bash(npm test:*)` allows any command that starts with `npm test`. **Deny always wins over allow.** Run `/permissions` in a session to see the merged rules from every scope.

> [!WARNING]
> Keep the allowlist to commands that are safe to run unattended: tests, type checks, read-only git. Don't allow `Bash(git push:*)`, `Bash(rm:*)` or `Bash(npm install:*)`. Those are the moments you *want* Claude to ask.

## 2. Formatting hook (5 min)

A hook receives JSON on **stdin**. For `Edit`/`Write`, the edited path is in `tool_input.file_path`. Create `.claude/hooks/format.sh`:

```bash
#!/usr/bin/env bash
# PostToolUse (Edit|Write): format the file Claude just edited.
file=$(jq -r '.tool_input.file_path // empty')
[[ "$file" =~ \.(ts|tsx|css|md|json)$ ]] && npx prettier --write "$file" >/dev/null 2>&1
exit 0
```

It always exits **0**. Formatting is a convenience, so it never blocks Claude.

## 3. Type-check hook: exit code 2 feeds errors back (8 min)

Create `.claude/hooks/typecheck.sh`:

```bash
#!/usr/bin/env bash
# PostToolUse (Edit|Write): after a TS edit, type-check the app and report errors to Claude.
file=$(jq -r '.tool_input.file_path // empty')
[[ "$file" =~ \.(ts|tsx)$ ]] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
# Ignore src/drills/: your unsolved type challenges fail on purpose, and coaching mode
# means Claude must not be nudged into "fixing" your drills.
errors=$(npx tsc -p tsconfig.app.json --noEmit --pretty false 2>&1 | grep -E '^src/' | grep -v '^src/drills/')
if [[ -n "$errors" ]]; then
  echo "TypeScript errors after editing $file. Fix them before continuing:" >&2
  echo "$errors" | head -20 >&2
  exit 2
fi
exit 0
```

How exit codes work:

- **0**: success, and Claude carries on.
- **2**: a *blocking error*. Claude receives the **stderr** text as feedback. In a PostToolUse hook the edit has already happened, so Claude reads the errors and fixes them in its next step.
- **any other non-zero code**: a non-blocking error that's shown to you, but Claude doesn't act on it.

That's why the script writes to `>&2` and exits `2`. With stdout and exit 1, Claude would never see the errors.

> [!NOTE]
> Running `tsc` after every edit is fine in fe-gym. In a large monorepo it's slow, so teams often run the full check once in a `Stop` hook (exit 2 there tells Claude to keep going) and keep only cheap checks per edit.

## 4. Guard hook for secrets and lockfiles (5 min)

This is the reference guard, extended to more lockfile names. Create `.claude/hooks/protect.sh`:

```bash
#!/usr/bin/env bash
# PreToolUse (Edit|Write): block edits to env files and lockfiles.
file=$(jq -r '.tool_input.file_path // empty')
base=$(basename "$file")
if [[ "$base" == .env* || "$base" == package-lock.json || "$base" == pnpm-lock.yaml || "$base" == yarn.lock ]]; then
  echo "Editing $file is not allowed. Ask the human to change it." >&2
  exit 2
fi
exit 0
```

In a **PreToolUse** hook, exit 2 *blocks the tool call*, and Claude sees your message. Make the three scripts executable, then wire them into `.claude/settings.json` next to `permissions`:

```bash
chmod +x .claude/hooks/*.sh
```

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect.sh" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format.sh" },
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/typecheck.sh" }
        ]
      }
    ]
  }
}
```

Restart Claude Code, then run `/hooks` to confirm all three hooks are registered. Newer versions may pick up changes without a restart **(verify)**.

> [!WARNING]
> Hooks run shell commands **with your user's permissions** on every matching event. Review a hook script like production code, and never copy one from the internet without reading it.

## 5. Try to break it (7 min)

Run each prompt and watch what stops it:

```text
Read .env and tell me what the API URL is.
```

```text
Create .env.local with FEATURE_FLAG=1.
```

```text
Change the "name" field in package-lock.json to "fe-gym-test".
```

The first should be refused by the **deny rule**. The second and third should be blocked by **protect.sh**, and Claude should relay your message. Now test the feedback loop. Add a type error by hand to `src/App.tsx` (`const n: number = 'oops';`), then:

```text
Create src/scratch/Badge.tsx: a Badge component with props
{ tone: 'info' | 'danger'; children: ReactNode } plus every native <span> prop
(use ComponentProps<'span'>). Named export, no default export.
```

Watch for three things: Prettier reformats the file, the type-check hook reports the `App.tsx` error with exit 2, and Claude reacts to it. Remove the error yourself afterwards. Then add one line to the coaching section of `CLAUDE.md`: *"`src/scratch/` is your playground. You may write code there."*

## Verify

```bash
cat .claude/settings.json | jq '.permissions, (.hooks | keys)'   # valid JSON, both hook events present
echo '{"tool_input":{"file_path":".env.local"}}' | .claude/hooks/protect.sh; echo "exit=$?"   # exit=2
git status --short .claude          # settings.json and hooks/ to commit; no settings.local.json
```

Commit with `git add .claude .gitignore CLAUDE.md package.json package-lock.json && git commit -m "chore: add Claude Code permissions and hooks"`.

## Reflect (write in `notes/day04.md`)

- Which rules from `CLAUDE.md` would you move into a hook because "usually" isn't good enough?
- Why did the type-check hook need exit **2** and **stderr**? What happens with `exit 1`?
- Which belongs in `settings.local.json` rather than the shared file, and why?
- The guard checks file names. How could Claude still change `.env` (hint: `Bash`)? What other layer would you add?

> [!INTERVIEW] "How do you keep a coding agent safe in a production codebase?"
> "In layers. Permissions decide what it may do without asking: tests, type checks and read-only git are allowed, secrets are denied, and anything destructive or networked still prompts. Hooks enforce what must always happen. A pre-tool hook blocks edits to env files and lockfiles, and post-edit hooks format and type-check, feeding errors straight back so the agent fixes them. Those settings are checked into the repo, so the whole team gets the same guardrails, and personal tweaks stay in local settings. Finally, everything still goes through normal code review and CI."
