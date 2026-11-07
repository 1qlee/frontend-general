## Goal

Turn two prompts you'd otherwise retype every day into **custom slash commands** checked into fe-gym:

- `/drill-types <topic>` generates three type challenges on a topic, with `Equal`/`Expect` assertions and **no solutions**.
- `/explain-error [file]` explains a TypeScript compiler error in plain language and gives a **hint, not a fix**.

## Why this matters professionally

A team's best prompts shouldn't live in one person's chat history. A custom command is a reviewed, versioned prompt that anyone can run with the same name. That makes "how we write a migration", "how we triage a bug" or "how we review a PR" repeatable. Building commands also forces you to write precise instructions with constraints and a way to verify the result, which is exactly the prompting skill interviewers ask about.

## 1. Prepare the type-drill folder (5 min)

Type challenges need two helpers: `Equal` and `Expect`. A third, `Todo`, is a placeholder that keeps the template's strict "unused" checks quiet until you solve each challenge.

```ts
// src/drills/types/type-utils.ts
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;
/** Placeholder for an unsolved challenge. It "uses" the type parameters so noUnusedLocals stays quiet. */
export type Todo<_Params> = any;
```

The Vite template's root `tsconfig.json` only *references* `tsconfig.app.json` and `tsconfig.node.json`, so plain `tsc --noEmit` at the root checks nothing. Point it at the app config instead:

```bash
npx tsc -p tsconfig.app.json --noEmit --pretty false
```

## 2. Write `/drill-types` (12 min)

Each markdown file in `.claude/commands/` becomes a command named after the file. Optional YAML frontmatter adds a `description` (shown in the command list) and an `argument-hint` (shown while you type). `$ARGUMENTS` is replaced with everything you type after the command name.

```md
---
description: Generate 3 TypeScript type challenges on a topic (no solutions)
argument-hint: <topic, e.g. "keyof and indexed access types">
---

Create three TypeScript type challenges about: $ARGUMENTS

Rules:
- One file per challenge: src/drills/types/<topic-slug>-<1|2|3>.ts (kebab-case slug).
- Difficulty ramps: 1 = warm-up, 2 = core, 3 = interview stretch.
- Start each file with a doc comment: the task in 2–4 sentences, one input → output
  example, and "don't use the built-in utility that solves this" where relevant.
- Export the type to implement as a placeholder that mentions every type parameter:
  `export type Name<A, B> = Todo<[A, B]>;` (import Equal, Expect, Todo from './type-utils').
- Below it, write 4–6 cases as `export type cases = [Expect<Equal<…>>, …];`
  (exported, so noUnusedLocals stays quiet). Include at least one edge case (union,
  never, readonly, optional keys or any), plus an invalid input marked
  `// @ts-expect-error` where that makes sense.
- Do NOT write solutions, give-away hints, or any file outside src/drills/types/.

Verify: run `npx tsc -p tsconfig.app.json --noEmit --pretty false`. In the new files, the
only errors should be failing Expect assertions (TS2344). If anything else fails, fix the
test cases. Never fix them by solving the challenge.

Finish with one line per file: type name, difficulty, and the concept it tests.
```

Save it as `.claude/commands/drill-types.md`, then run it on today's topic:

```text
/drill-types keyof, typeof and indexed access types
```

Read the three files before you solve anything. Are the cases right? Is there a case a naive answer would fail? If a case is wrong, tell Claude and have it fix the case. Then **solve challenge 1 yourself, without AI**, until `tsc` reports no errors in that file.

> [!AGENT] Commands can also take positional arguments
> `$1`, `$2`, … pick out individual arguments, for example `/drill-types $1` for the topic and `$2` for a count. `$ARGUMENTS` is simpler when the argument is free text.

## 3. Write `/explain-error` (10 min)

This command uses two more features. `allowed-tools` pre-approves the commands it may run. A line starting with `!` followed by a backticked command runs that command and injects its output into the prompt.

```md
---
description: Explain a TypeScript compiler error in plain language and give a hint, not a fix
argument-hint: [file to focus on]
allowed-tools: Bash(npx tsc:*)
---

Current compiler output:

!`npx tsc -p tsconfig.app.json --noEmit --pretty false`

Focus on errors in: $ARGUMENTS (if that's empty, use the first error).

For that error:
1. Quote the error code and message, then restate it in one plain-English sentence.
2. Explain the mechanism: which two types TypeScript compared, which rule it applied
   (assignability, excess property check, narrowing, constraint, variance…), and why
   the rule exists.
3. Point at the exact line and say what type TypeScript inferred there.
4. Give ONE hint, phrased as a question, that leads me to the fix. Do not write the
   fixed code and do not edit any files.
5. Name the concept and one interview question it relates to.
```

Save it as `.claude/commands/explain-error.md`. Make an error to explain:

```ts
// src/drills/narrowing-error.ts
type Result = { ok: true; value: number } | { ok: false; error: string };

export function show(result: Result): string {
  return result.value.toFixed(2);
}
```

```text
/explain-error src/drills/narrowing-error.ts
```

You should get an explanation of discriminated unions and narrowing (`value` doesn't exist on the `ok: false` member) and a question like *"What could you check before reading `value`?"*. Fix it yourself.

> [!NOTE]
> If the compiler output doesn't show up in the prompt (for example, because `tsc` exits non-zero), check your version's slash-command docs (`/help`, code.claude.com/docs) **(verify)**. As a fallback, delete the `!` line and tell Claude to run the command itself.

## 4. Commands vs CLAUDE.md, and sharing them (8 min)

Type `/` in the session. Your two commands appear with their descriptions (`/help` lists them too). Now compare the two mechanisms:

| | `CLAUDE.md` | Custom command |
|---|---|---|
| Loaded | Every session, automatically | Only when you type `/name` |
| Costs context | Always | Only when used |
| Good for | Always-true facts: commands, conventions, "never do X" | A repeatable task: a procedure plus an output format |
| Example | "Coaching mode: don't write my drills" | `/drill-types`, `/explain-error` |

The rule of thumb: if Claude needs it for *every* task, it goes in `CLAUDE.md`. If it's a workflow you *choose* to start, make it a command. Don't paste the drill-generation rules into `CLAUDE.md`; you'd pay for them in every session.

Share the commands with your team by committing them:

```bash
git add .claude/commands src/drills/types
git commit -m "chore: add /drill-types and /explain-error commands"
```

Anyone who clones the repo now has `/drill-types`. Personal commands you want in *every* project go in `~/.claude/commands/` instead.

> [!TIP]
> Recent Claude Code versions treat commands and **skills** as one mechanism. Files in `.claude/commands/` keep working **(verify for your version)**. You'll build a skill on Day 7 and see when it beats a command.

## Verify

- `/drill-types` created three files in `src/drills/types/` with exported `cases`, and no solutions.
- `npx tsc -p tsconfig.app.json --noEmit --pretty false` shows no errors in the challenge you solved.
- `/explain-error` explained the narrowing error without editing any file.
- Both command files are committed.

## Reflect (write in `notes/day03.md`)

- Which instruction in `/drill-types` did Claude follow least reliably? How did you tighten it?
- Why does a command need a verify step ("run tsc and confirm…") as much as a human task does?
- Name one prompt from your day job you've typed more than three times. What would its command file look like?

> [!INTERVIEW] "How do you share effective AI workflows across a team?"
> "I treat prompts like code. The ones we repeat, like generating test scaffolding, triaging a type error or reviewing a migration, become slash commands checked into the repo, with a description, an argument hint, explicit constraints and a verification step. They're reviewed in PRs and improved over time, so everyone gets the same quality instead of depending on who wrote the best prompt. Always-true project facts go in CLAUDE.md, and task-specific workflows go in commands, so we don't pay for them in every session."
