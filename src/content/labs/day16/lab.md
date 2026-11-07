## Goal

Turn Claude Code into a **Socratic DS&A coach** for your fe-gym practice. You'll build two project slash commands: `/hint`, which gives graduated hints and never full solutions, and `/complexity`, which makes *you* justify Big-O before it reviews your analysis. Then you'll use a prompt pattern where **Claude writes tricky edge-case tests and you write the solutions**.

## Why it matters

The fastest way to stop improving at algorithms is to read the answer the moment you get stuck. An agent that hands over solutions on request makes that even easier. A good human coach does the opposite: they ask a question, give the smallest useful hint, and make you explain your reasoning. Custom commands let you encode that behaviour once and reuse it every time, so the tool supports your learning instead of replacing it. The same skill applies at work: designing prompts and guardrails that keep an agent inside a role you chose deliberately.

## 1. Set up a practice problem (5 min)

In fe-gym, create `src/dsa/` and add a problem file from today, for example `src/dsa/productExceptSelf.ts`, with only a doc comment and a stub:

```ts
/**
 * Return an array where out[i] is the product of every element except nums[i].
 * No division. Target: O(n) time, O(1) extra space besides the output.
 */
export function productExceptSelf(nums: number[]): number[] {
  throw new Error('Not implemented');
}
```

Start Claude Code from the repo root (`claude`). If your `CLAUDE.md` coaching section from the first day doesn't already say so, add this line: *"In src/dsa/, never write or reveal solution code unless I explicitly say 'show solution'."*

## 2. Build `/hint` with graduated levels (10 min)

Custom commands are markdown files in `.claude/commands/`. The file name becomes the command name. In the body, `$ARGUMENTS` is everything typed after the command, and `$1`, `$2` are positional arguments. Optional YAML frontmatter can set `description`, `argument-hint`, `allowed-tools` and `model`.

Create `.claude/commands/hint.md`:

```markdown
---
description: Graduated, Socratic hint for a DS&A problem (never a full solution)
argument-hint: <problem-file> <level 1-4>
allowed-tools: Read, Grep, Glob
---
You are a Socratic algorithms coach. The learner is practising for interviews.

Problem file: $1
Hint level: $2 (if missing, use 1)

Read the problem file and any code the learner has written in it. Then give
EXACTLY ONE hint at the requested level:

1. A question that helps them clarify the problem or spot an edge case.
2. Point at the bottleneck in the brute force ("what work is repeated?")
   without naming the pattern.
3. Name the pattern or data structure and the invariant to maintain, as a
   question if possible.
4. Pseudocode skeleton of at most 5 lines with the key step left as "???".

Rules:
- Never write TypeScript that solves the problem, at any level.
- Never edit files.
- If their code has a bug, ask a question that leads them to it; don't fix it.
- End with: "Try it, then run /hint $1 <next level> if you're still stuck."
```

The `allowed-tools` line pre-approves read-only tools for this command and makes its role obvious when you read the file. Your `CLAUDE.md` rule and the prompt itself are what keep Claude from writing code.

Try it, escalating only when you're really stuck:

```text
/hint src/dsa/productExceptSelf.ts 1
/hint src/dsa/productExceptSelf.ts 2
```

> [!AGENT] Why levels?
> A single "give me a hint" prompt tends to drift towards the answer, because the model wants to be helpful. Explicit levels make the hint size a decision *you* make, and they match how interviewers hint: question → nudge → pattern → skeleton.

## 3. Build `/complexity` that asks first (8 min)

Create `.claude/commands/complexity.md`:

```markdown
---
description: Review a solution's time/space complexity, learner justifies first
argument-hint: <solution-file> [function name]
allowed-tools: Read, Grep, Glob
---
Act as an interviewer reviewing complexity analysis.

Target: $ARGUMENTS

Step 1: Read the code. Do NOT state its complexity yet.
Ask me, as an interviewer would:
  "What are the time and space complexity, what is n, and why?"
Then stop and wait for my answer.

Step 2: After I answer, grade it:
- Correct / partially correct / incorrect, for time and space separately.
- Point out hidden costs I missed (includes/indexOf/shift/slice/spread
  inside loops, sort, string building, recursion depth, Map growth).
- If a loop looks nested but is amortised (each element pushed/popped once),
  check whether I justified that.
- Ask one follow-up an interviewer would ask (e.g. "can you do it in O(1)
  extra space?"). Do not write the improved code.
```

Implement `productExceptSelf` yourself (prefix products left to right, then suffix products right to left), then run:

```text
/complexity src/dsa/productExceptSelf.ts
```

Answer out loud first, then type your answer. Getting graded on what you *said* is the point.

## 4. Claude writes the tests, you write the solution (8 min)

This reverses the usual split. Claude is good at listing adversarial inputs, and *you* need the reps writing the algorithm. Use this prompt pattern for any problem:

```text
I'm practising the problem in @src/dsa/productExceptSelf.ts. Do not write or
suggest an implementation.

Write src/dsa/productExceptSelf.edge.test.ts with Vitest:
- 8–10 cases, each with a name that says which edge case it targets:
  empty, single element, zeros (one zero AND two zeros), negatives,
  duplicates, large n.
- One test per likely bug, e.g. "uses division" (fails with zeros),
  "off-by-one in the suffix pass".
- Compute expected values by hand or with an obviously-correct O(n²)
  reference INSIDE the test file. Never import my implementation into
  the reference.
- Run the tests and show me which fail. Don't touch productExceptSelf.ts.
```

Then iterate on your own code until everything is green. If a test looks wrong, ask Claude to *justify the expected value* rather than accepting a change. Tests are a spec, and a spec can have bugs too.

> [!MISTAKE]
> Asking "why is this test failing?" while your code is open. That invites a fix. Ask "which input makes my output differ from the expected one, and what's special about it?" instead, or use `/hint` at level 1.

## Verify (2 min)

```bash
ls .claude/commands/                       # hint.md  complexity.md
npm test -- --run src/dsa                  # edge-case tests green against YOUR code
git diff --stat                            # the commands, your solution and the test file
```

Also check: `/hint` at levels 1–3 produced no TypeScript, and `/complexity` asked you a question before giving any analysis. If either one leaked an answer, tighten the wording (e.g. add "If you are about to write code, stop and ask a question instead") and run it again. Commit the commands so they're part of your repo's toolkit:

```bash
git add .claude/commands src/dsa
git commit -m "chore: add Socratic /hint and /complexity coaching commands"
```

## Reflect (write in `notes/dsa-1.md`)

- Which hint level did you usually need? What does that say about which step of the method (clarify, bottleneck, pattern, implementation) is your weak spot?
- Did your spoken complexity analysis match the grade? Which hidden cost did you miss?
- Which edge-case test caught a real bug in your solution, and would you have thought of that input yourself under pressure?
- Where did Claude drift towards giving answers, and what wording stopped it?

> [!INTERVIEW] "How do you use AI tools without them doing your thinking?"
> "I decide what role the agent plays before I start. For skill-building I set it up as a coach: I have project slash commands for graduated hints that never include code, and for complexity reviews that make me justify my analysis first. I also split the work so the agent writes adversarial edge-case tests and I write the implementation. That keeps me doing the reasoning while the tool widens my test coverage. At work it's the same principle with different roles: tests and review as guardrails, and me owning the design decisions."
