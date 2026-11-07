# Frontend Interview Gym

An interactive, two-week course (15 days × ~4 hours) for experienced frontend developers who know more
than their interviews show. **React + TypeScript first**, with the general frontend topics interviewers
always probe, frontend system design, and a full track on **agentic development with Claude Code**.

Everything runs in the browser — no backend:

- **Lessons** with precise mental models, interview phrasing (`[!INTERVIEW]` callouts), common mistakes, and
  **runnable TypeScript snippets** (edit and re-run; executes in a Web Worker).
- **Exercises with real tests**:
  - TypeScript utilities (debounce, Promise.all, LRU cache, …) tested by a Vitest-compatible runtime with fake timers and mocks;
  - **React components and hooks** tested with Testing Library + user-event in a sandboxed iframe, with a live preview;
  - **Type challenges** checked by the real TypeScript compiler (strict) in a worker;
  - **"Write the tests"** exercises: your tests must pass on a correct implementation and catch every planted bug.
- **Quizzes** (output prediction with "run it" verification), **speak-aloud drills** with model answers and self-grading,
  **spaced-repetition flashcards**, a **practice bank**, **mock interview** modes (rapid-fire, coding, UI build,
  system design, behavioural, AI-assisted development) and an **interview playbook**.
- **Claude Code labs** every day in your own practice repo (`fe-gym`): CLAUDE.md, plan mode, slash commands,
  hooks, subagents, skills, MCP, headless mode, CI — plus a dedicated deep-dive day.
- Dashboard with progress, study time, confidence (baseline vs. latest) and weak spots. Progress is stored in
  `localStorage`; export/import it from Settings.

## Syllabus

| Day | Topic |
|---|---|
| 1 | JavaScript core, the TypeScript way — scope, closures, `this`, prototypes, coercion |
| 2 | Async JavaScript & the event loop — promises, cancellation, debounce/throttle, concurrency |
| 3 | TypeScript I — structural typing, narrowing, discriminated unions, generics, utility types |
| 4 | TypeScript II — conditional/mapped/template-literal types, TypeScript in React, runtime validation |
| 5 | React I — rendering, reconciliation & keys, state design, effects & refs |
| 6 | React II — hooks in depth, component API patterns, context, portals, error boundaries |
| 7 | React III — concurrent React & React 19, SSR/RSC, performance, state management |
| 8 | Browser, DOM & CSS — rendering pipeline, events, cascade, layout, stacking contexts |
| 9 | Accessibility & semantic HTML — WCAG 2.2, ARIA, keyboard, focus management, testing |
| 10 | Web performance & networking — Core Web Vitals, loading, runtime, HTTP & caching |
| 11 | Frontend system design I — RADIO framework, building blocks, autocomplete & news feed |
| 12 | Frontend system design II — chat, carousel, e-commerce, design systems, web security |
| 13 | Testing & tooling — RTL, Playwright, MSW, Vite & bundlers, monorepos, CI |
| 14 | Agentic development with Claude Code — professional workflows deep dive |
| 15 | Interview simulation — full mock loop, behavioural story bank, maintenance plan |

## Run it

```bash
npm install          # Node 20+ (22 recommended)
npm run dev          # http://localhost:5173
npm run build        # type-check + production build into dist/
npm test             # runner tests + content validation
```

`npm install` uses `legacy-peer-deps` (see `.npmrc`) to work around an npm peer-resolution bug with Vitest 4's
optional peers.

### Deploy

The build is fully static with relative paths and hash routing, so `dist/` can be served from anywhere.
A GitHub Pages workflow is included (`.github/workflows/deploy.yml`): enable it once under
**Settings → Pages → Build and deployment → Source: GitHub Actions**, then every push to `main` deploys.

## How it works

```
src/
  content/            # the course: typed modules + markdown (see docs/CONTENT_GUIDE.md)
    days/dayNN/       # index.ts, lessons/*.md, exercises/<slug>/{starter,solution,tests}.ts(x)
    labs/dayNN/       # Claude Code labs injected into each day
    playbook/<slug>/  # interview playbook docs
    content.test.ts   # validation: schema, time budget, every solution passes, every starter fails
  runner/
    harness.ts        # Vitest-compatible runtime: describe/it/expect/vi, fake timers, mocks, DOM matchers
    tsService.ts      # TypeScript transpile + type-check against bundled lib.dom & React typings
    exerciseRunner.ts # implement / write-tests / type-challenge modes
    client.ts         # browser side: TS worker, per-run exec worker, sandbox iframe
  sandbox/main.tsx    # iframe: React 19 + Testing Library + live preview
  pages/, components/ # the UI
```

Exercise code never touches the host's real timers: `setTimeout`, `Date`, `performance`, etc. are injected
into each module, which is how `vi.useFakeTimers()` works without breaking Testing Library's `waitFor`.

## Contributing content

Read [`docs/CONTENT_GUIDE.md`](docs/CONTENT_GUIDE.md), then validate a single day while you work:

```bash
npx vitest run src/content -t "day 5 "
```
