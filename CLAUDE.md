# Frontend Interview Gym

Interactive 15-day course app: Vite 6 + React 19 + TypeScript (strict). Content is typed TS modules + markdown;
exercises run in the browser against a Vitest-compatible harness.

## Commands
- `npm run dev` — dev server · `npm run build` — type-check + production build
- `npm run typecheck` — `tsc -b --noEmit`
- `npm test` — runner unit tests + content validation (all days)
- `npx vitest run src/content -t "day 5 "` — validate one day (trailing space matters)

## Architecture
- `src/content/` — course content; schema in `types.ts`, assembled by glob imports in `index.ts`.
  Authoring rules: `docs/CONTENT_GUIDE.md` (read it before touching content).
- `src/runner/` — `harness.ts` (mini Vitest: describe/it/expect/vi, fake timers, mocks, DOM matchers),
  `tsService.ts` (transpile + type-check with real lib.dom/React typings), `exerciseRunner.ts` (modes),
  workers + `client.ts` (browser), `nodeEnv.ts`/`domEnv.ts` (validation in Node/jsdom).
- `src/sandbox/` — iframe entry for React/DOM exercises and live preview.
- `src/store/progress.ts` — localStorage-backed external store (useSyncExternalStore).
- `src/pages/`, `src/components/` — UI. Hash routing in `src/lib/router.tsx`.

## Conventions
- Strict TS, no `any` in app code. Function components, named exports.
- Selectors passed to `useProgress` must return stable values (no `?? {}` inside the selector).
- Exercise source files live in `exercises/<slug>/{starter,solution,tests}.ts(x)` and are NOT type-checked by tsc;
  never name them `*.test.ts`.
- Every content change must keep `npm test` green: reference solutions pass, starters fail.
