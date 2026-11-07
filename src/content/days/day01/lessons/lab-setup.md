## Goal

Set up **fe-gym** — the practice repository you'll use for the rest of the course — and get Claude Code working in it with a `CLAUDE.md` that turns Claude into a **coach**, not a code vending machine.

## Why this matters professionally

Teams that get real leverage from coding agents invest in *context*: a project memory file that encodes conventions, commands, and guardrails. The same skill — writing down how a codebase works so an agent (or a new teammate) can be effective — is exactly what interviewers probe when they ask "How do you use AI tools in your workflow?"

## 1. Create the practice repo (10 min)

```bash
npm create vite@latest fe-gym -- --template react-ts
cd fe-gym
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
git init && git add -A && git commit -m "chore: scaffold fe-gym"
```

Add a test setup so Testing Library matchers work. In `vite.config.ts` add a `test` section:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
  },
});
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

Add `"test": "vitest"` and `"typecheck": "tsc -b --noEmit"` to `package.json` scripts. Create folders you'll fill during the course: `src/drills/` (utility implementations), `src/components/` (UI builds), `notes/` (your interview story bank and reflections).

## 2. Install and start Claude Code (5 min)

Install Claude Code using the method from the official docs (native installer or npm), then start it **from the repo root**:

```bash
cd fe-gym
claude
```

Log in when prompted. Try a first, read-only question to see how it explores:

```text
Explain how this project is structured and how tests are configured. Don't change anything.
```

Watch what it does: it reads files and runs commands to gather context *before* answering. That "gather context → act → verify" loop is the core of how agents work, and you'll learn to steer every stage of it.

## 3. Generate and then rewrite `CLAUDE.md` (15 min)

Run the built-in initializer:

```text
/init
```

It analyses the repo and writes a `CLAUDE.md` at the root. This file is loaded into context at the start of every session — it's the project's memory. Now **edit it by hand** so it reflects how *you* want to work during this course. Keep it short and specific; every line costs context in every session.

```md
# fe-gym

Personal interview-prep repo: Vite + React 19 + TypeScript (strict) + Vitest + Testing Library.

## Commands
- `npm test -- --run` — run tests once; `npm run typecheck` — type-check

## Conventions
- TypeScript strict; no `any` (use `unknown` + narrowing). Named exports.
- Components: function components, props typed with an interface, accessible by default (semantic HTML first).
- Tests live next to code as `*.test.ts(x)` and use Testing Library queries by role.

## Coaching mode (important)
I am preparing for frontend interviews. Files under `src/drills/` and `src/components/` are MY practice:
- Do NOT write or fix implementations there unless I explicitly say "write it".
- When I ask for review: point out bugs, edge cases, complexity and what an interviewer would probe — as questions or hints first.
- You MAY write tests, fixtures, and tooling config when I ask.
```

> [!AGENT] Why a "coaching mode" section works
> `CLAUDE.md` content is treated as standing instructions for the project. Being explicit about *what not to do* (don't solve my drills) is as valuable as describing what to do. You'll extend this file throughout the course.

Commit it: `git add CLAUDE.md && git commit -m "docs: add CLAUDE.md"`. A checked-in `CLAUDE.md` is shared with your team; personal preferences belong in your user-level memory instead.

## 4. Use Claude as a reviewer on today's drill (10 min)

1. Without AI, implement `once` and `memoize` in `src/drills/functions.ts` (you already did them in this app — re-type them from memory).
2. Ask Claude to write tests *for* your implementation:

   ```text
   Write Vitest tests for src/drills/functions.ts covering edge cases an interviewer would probe
   (this-binding, falsy cached values, re-entrancy). Put them in src/drills/functions.test.ts.
   Don't modify functions.ts. Run the tests and tell me which fail, without fixing my code.
   ```

3. Fix any failures yourself. Then ask: *"What follow-up questions would an interviewer ask about my memoize?"*

## 5. Learn the safety controls (5 min)

- **Permission modes:** press **Shift+Tab** to cycle modes (normal → auto-accept edits → plan mode). Plan mode makes Claude research and propose a plan without editing — you'll use it heavily on Day 2.
- When Claude asks permission to run a command or edit a file, read it. You can allow once, or allow that command for the session/project.
- Press **Esc** to interrupt Claude mid-task and redirect it. Course-correcting early is cheaper than undoing.

## Verify

- `npm test -- --run` passes in fe-gym.
- `CLAUDE.md` contains commands, conventions and the coaching-mode rules, and is committed.
- You can explain what `CLAUDE.md` is for in one sentence.

## Reflect (write in `notes/day01.md`)

- Where did Claude gather context before answering? Which files did it read?
- Did it respect the coaching rules? If not, how would you make the instruction clearer?

> [!INTERVIEW] "How do you use AI coding tools?"
> "I treat the agent like a fast collaborator that needs good context. Each repo has a CLAUDE.md with our commands, conventions and guardrails, so it follows the same rules as the team. I use it heavily for exploration, tests and boilerplate, and I review its output like any PR — I'm accountable for what gets merged."
