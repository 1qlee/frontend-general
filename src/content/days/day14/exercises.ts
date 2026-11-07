import type { Exercise } from '../../types';

import guardStarter from './exercises/hook-guard-decision/starter.ts?raw';
import guardSolution from './exercises/hook-guard-decision/solution.ts?raw';
import guardTests from './exercises/hook-guard-decision/tests.ts?raw';
import summaryStarter from './exercises/summarize-agent-run/starter.ts?raw';
import summarySolution from './exercises/summarize-agent-run/solution.ts?raw';
import summaryTests from './exercises/summarize-agent-run/tests.ts?raw';

export const hookGuardDecision: Exercise = {
  id: 'hook-guard-decision',
  title: 'PreToolUse guard: decide(input, policy)',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['agentic', 'hooks', 'security', 'glob matching', 'string parsing'],
  prompt: `Your team wants a guard in front of Claude's file edits and shell commands, registered as a **PreToolUse hook**. A hook receives JSON on stdin; **exit code 2 blocks the tool call and feeds stderr back to Claude**, exit 0 lets it through. The shell wrapper is boring, and the decision is the part worth testing, so implement it as a pure function:

\`\`\`ts
decide(input: HookInput, policy: Policy): { exitCode: 0 | 2; stderr?: string }
\`\`\`

Context (you don't write this): the settings entry and a thin wrapper around your function.

\`\`\`json
"PreToolUse": [{ "matcher": "Edit|Write|Bash",
  "hooks": [{ "type": "command", "command": "node \\"$CLAUDE_PROJECT_DIR\\"/.claude/hooks/guard.mjs" }] }]
\`\`\`

\`\`\`js
// guard.mjs: read stdin, decide, report (decide compiled from your TS)
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const { exitCode, stderr } = decide(JSON.parse(raw), policy);
if (stderr) process.stderr.write(stderr + '\\n');
process.exit(exitCode);
\`\`\`

### Rules

**Edit / Write** (\`tool_input.file_path\`):
1. **Normalise:** if \`cwd\` is given and the path starts with \`cwd + '/'\`, strip that prefix; then strip a leading \`./\`.
2. **Outside the project → block:** the result still starts with \`/\`, or has a \`..\` segment. stderr contains the path and the word **"outside"**.
3. **Protected globs → block** (stderr contains the path and the glob):
   - \`*\` = any characters except \`/\` · \`**/\` = zero or more directories · \`**\` elsewhere = anything including \`/\` · \`?\` = exactly one character except \`/\` · everything else is literal (\`.\` is a dot).
   - A glob **without** \`/\` matches the **file name** at any depth (\`.env*\` blocks \`apps/web/.env.local\`). A glob **with** \`/\` matches the whole project-relative path from the root.

**Bash** (\`tool_input.command\`): block when a \`policy.deniedCommands\` entry appears as **whole tokens**, after normalising both strings: collapse whitespace, and treat \`;\` \`&\` \`|\` \`(\` \`)\` as separate tokens. stderr contains the pattern.

**Everything else** (other tools, other events, missing \`file_path\`/\`command\`) → \`{ exitCode: 0 }\` with **no** \`stderr\`.

| Input | Result |
|---|---|
| Edit \`src/App.tsx\` | allow |
| Write \`packages/ui/pnpm-lock.yaml\` | block (\`pnpm-lock.yaml\`) |
| Edit \`/home/me/fe-gym/src/generated/api.ts\`, cwd \`/home/me/fe-gym\` | block (\`src/generated/**\`) |
| Edit \`src/generated-docs/readme.md\` | allow |
| Bash \`npm test;rm   -rf coverage\` | block (\`rm -rf\`) |
| Bash \`git push --force-with-lease\` | allow |

**What the interviewer is looking for:** separating policy from I/O so it's testable, careful normalisation before matching (the classic bypasses are absolute paths, \`./\`, \`..\` and extra whitespace), a correct glob-to-regex conversion with escaping, and an honest view of what a denylist can't catch.`,
  starter: guardStarter,
  solution: guardSolution,
  tests: guardTests,
  hints: [
    'Split it into small helpers: toProjectPath(), globToRegExp(), matchesGlob(), normalizeCommand(). decide() then becomes a short branch on tool_name.',
    'Convert a glob to a RegExp by walking it character by character. Check for `**/` before `**` before `*`, and escape regex special characters for literal ones. Anchor with ^…$.',
    'Basename rule: `glob.includes("/") ? path : path.slice(path.lastIndexOf("/") + 1)`. Whole-token matching: pad separators with spaces, collapse whitespace, then check `` ` ${cmd} `.includes(` ${pattern} `) ``.',
  ],
  explanation: `**Approach:** normalise first, then match. Paths are made project-relative (stripping \`cwd/\` and \`./\`), and anything still absolute or containing \`..\` is rejected outright rather than resolved. Refusing is simpler and safer than being clever about traversal. Globs become anchored regexes (\`**/\` → \`(?:.*/)?\`, \`**\` → \`.*\`, \`*\` → \`[^/]*\`, \`?\` → \`[^/]\`, everything else escaped). Commands are tokenised by padding separators and collapsing whitespace, then matched on token boundaries with \`\` \` \${cmd} \`.includes(\` \${pattern} \`) \`\`.

**Why a pure function?** The hook script is untestable glue; the policy is the part that must be right. The same split (pure core, thin I/O shell) is what interviewers want to see for any CLI or middleware.

**Limits worth saying out loud:**
- **A denylist is a speed bump, not a wall.** \`rm -r -f\`, \`rm -fr\`, \`find . -delete\`, \`git push origin main --force\`, or a script written to a file and then executed all slip through. That's why it's one layer next to permission deny rules, sandboxing or containers, and review.
- **False positives:** \`echo "never run rm -rf"\` is blocked. Acceptable for a guard: Claude gets the reason on stderr and can rephrase.
- **Fail-open vs fail-closed:** a missing \`file_path\` is allowed here (like the \`jq … // empty\` pattern in the docs). A stricter team might block malformed input instead. Either way, make the choice deliberately.
- **Other environments:** case-insensitive file systems (\`.ENV\` on macOS), symlinks into protected folders, Windows paths. Mention them; you don't need to solve them in 15 minutes.
- **Reading secrets is a different problem:** this hook guards writes and commands. Reads of \`.env\` are better handled by permission deny rules like \`Read(./.env)\`.

**Follow-ups:**
- *"How would Claude know why it was blocked?"* → exit 2 feeds stderr back to Claude, so make the message actionable ("run \`npm run codegen\` instead"). Newer versions also accept JSON output with a permission decision (verify the exact fields for your version).
- *"Performance?"* → hooks run on every matching tool call. Keep them fast; precompile regexes if the policy is large.
- *"Why not just use permission rules?"* → use them first. A hook adds logic rules can't express, like a forbidden command anywhere in a chain.`,
};

export const summarizeAgentRun: Exercise = {
  id: 'summarize-agent-run',
  title: 'Summarise a headless agent run',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['agentic', 'headless', 'data transforms', 'maps'],
  prompt: `Headless runs (\`claude -p … --output-format json\` or \`stream-json\`) in CI and fan-out scripts produce event logs. Teams turn them into a summary answering: *What did the agent touch? Did it run the tests, and did they pass at the end? What did it cost?*

> **Simplified shape.** The \`AgentEvent\` type below was **invented for this exercise**. It is *not* the real stream-json schema, which has different and richer fields that can change between versions. In real tooling you'd map the real events into a small internal shape like this one.

\`\`\`ts
type AgentEvent =
  | { type: 'assistant_text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolUseId: string; isError: boolean }
  | { type: 'result'; isError: boolean; costUsd: number; turns: number };
\`\`\`

Implement \`summarizeRun(events): RunSummary\`:

| Field | Rule |
|---|---|
| \`toolCounts\` | Number of \`tool_use\` events per \`name\` |
| \`filesEdited\` | Unique string \`input.file_path\` of \`Edit\`/\`Write\` calls whose matching \`tool_result\` has \`isError: false\`, in first-call order. Failed edits and edits with no result don't count. |
| \`errorCount\` | \`tool_result\` events with \`isError: true\` |
| \`testRuns\` | \`Bash\` calls whose \`input.command\` runs tests (below) |
| \`lastTestRunPassed\` | For the **last** test run: \`true\`/\`false\` from its result; \`null\` if there was no test run or its result never arrived |
| \`costUsd\`, \`turns\` | From the \`result\` event; \`null\` if there is none |
| \`completed\` | A \`result\` event exists and \`isError\` is false |

Results are linked to calls by \`tool_result.toolUseId === tool_use.id\`.

**What counts as running tests:** split the command on \`&&\`, \`||\`, \`;\` and \`|\`; trim each segment and collapse whitespace. A segment is a test run if it **starts with** \`npm test\`, \`npm run test\`, \`pnpm test\`, \`pnpm run test\`, \`yarn test\` or \`yarn run test\` (optionally followed by \`:suffix\`, e.g. \`npm run test:unit\`), or \`vitest\`, \`npx vitest\`, \`jest\`, \`npx jest\` or \`npx playwright test\`. In every case it must be followed by whitespace or the end of the segment. So \`cd web && npm test\` counts; \`npm install -D vitest\`, \`echo "npm test"\` and \`npm run testing-library-codemod\` don't.

**What the interviewer is looking for:** indexing by id instead of nested scans, careful handling of missing and partial data (\`null\` vs \`false\`), and narrowing \`unknown\` input fields safely.`,
  starter: summaryStarter,
  solution: summarySolution,
  tests: summaryTests,
  hints: [
    'Do two passes: first collect tool_use events (in order), a Map from toolUseId to isError, the error count and the final result event. Then walk the tool uses.',
    'An edit counts only when `resultFor.get(id) === false`; `undefined` means no result arrived. For the last test run, `undefined` → null, otherwise `!isError`.',
    'For the test rule, one anchored regex with alternation works: `^(?:(?:npm|pnpm|yarn)(?: run)? test(?::[\\w-]+)?|(?:npx )?(?:vitest|jest)|npx playwright test)(?:\\s|$)`, tested against each split, trimmed segment.',
  ],
  explanation: `**Approach:** one pass to index (\`Map<toolUseId, isError>\`, ordered list of tool uses, counts, the final \`result\`), one pass over tool uses to derive edits and test runs. O(n) time, and no nested \`find\` per event.

**Design points worth mentioning:**
- **\`null\` vs \`false\`.** "No test run" and "the run was cut off before the result" are different from "tests failed". Encoding unknown as \`null\` keeps a CI gate honest.
- **"Ran tests" ≠ "tests pass".** \`lastTestRunPassed\` is what you'd gate on: fail the job if files were edited but the final test run didn't pass. That's the "overconfident done" failure mode caught by a script.
- **An internal shape** (an anti-corruption layer) means a change to the real wire format touches one mapping function, not every consumer.
- **\`input\` is \`Record<string, unknown>\`** because it comes from outside: narrow with \`typeof === 'string'\` instead of casting.

**Limitations:** splitting on \`;\` ignores shell quoting (\`echo "a; npm test"\` would count), and \`CI=1 npm test\` or \`npm --prefix web test\` aren't recognised. A real tool would use a shell parser or record the intent explicitly (e.g. a dedicated test command).

**Follow-ups:**
- *"Flag runs where the agent edited test files"* → check \`filesEdited\` against \`/\\.test\\.tsx?$/\`. That's a cheap detector for "editing tests to pass".
- *"Make it streaming"* → turn it into a reducer \`(summary, event) => summary\` that keeps the Map in its state, so a dashboard can update live.
- *"Aggregate across a fan-out of 300 runs"* → sum the costs, compute pass rates, and group failures by error type to decide whether to fix the prompt or hand the rest to people.`,
};
