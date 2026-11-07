/**
 * A SIMPLIFIED event shape invented for this exercise. It is NOT the real
 * `claude -p --output-format stream-json` schema (which has different, richer
 * fields that can change between versions). In real tooling, map the real
 * events into a small internal shape like this one, so the rest of your code
 * doesn't depend on the wire format.
 */
export type AgentEvent =
  | { type: 'assistant_text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolUseId: string; isError: boolean }
  | { type: 'result'; isError: boolean; costUsd: number; turns: number };

export interface RunSummary {
  /** Number of tool_use events per tool name. */
  toolCounts: Record<string, number>;
  /** Unique `file_path`s of Edit/Write calls whose result was not an error, in first-call order. */
  filesEdited: string[];
  /** Number of tool_result events with isError: true. */
  errorCount: number;
  /** Number of Bash calls that ran a test command. */
  testRuns: number;
  /** Outcome of the LAST test run: true/false from its tool_result, null if no test run or no result. */
  lastTestRunPassed: boolean | null;
  /** From the final `result` event; null if the run never produced one. */
  costUsd: number | null;
  turns: number | null;
  /** A `result` event exists and it is not an error. */
  completed: boolean;
}

type ToolUse = Extract<AgentEvent, { type: 'tool_use' }>;

const EDIT_TOOLS = new Set(['Edit', 'Write']);

// npm/pnpm/yarn [run] test[:suffix] | [npx] vitest | [npx] jest | npx playwright test — then whitespace or end.
const TEST_INVOCATION = /^(?:(?:npm|pnpm|yarn)(?: run)? test(?::[\w-]+)?|(?:npx )?(?:vitest|jest)|npx playwright test)(?:\s|$)/;

/** Does any segment of a (possibly chained) shell command start with a test invocation? */
export function isTestCommand(command: string): boolean {
  return command
    .split(/&&|\|\||;|\|/)
    .map((segment) => segment.trim().replace(/\s+/g, ' '))
    .some((segment) => TEST_INVOCATION.test(segment));
}

const stringField = (input: Record<string, unknown>, key: string): string | undefined => {
  const value = input[key];
  return typeof value === 'string' ? value : undefined;
};

export function summarizeRun(events: AgentEvent[]): RunSummary {
  const toolUses: ToolUse[] = [];
  const resultFor = new Map<string, boolean>(); // toolUseId → isError
  const toolCounts: Record<string, number> = {};
  let errorCount = 0;
  let final: Extract<AgentEvent, { type: 'result' }> | undefined;

  for (const event of events) {
    switch (event.type) {
      case 'tool_use':
        toolUses.push(event);
        toolCounts[event.name] = (toolCounts[event.name] ?? 0) + 1;
        break;
      case 'tool_result':
        resultFor.set(event.toolUseId, event.isError);
        if (event.isError) errorCount++;
        break;
      case 'result':
        final = event;
        break;
      default:
        break;
    }
  }

  const edited = new Set<string>();
  let testRuns = 0;
  let lastTestRunPassed: boolean | null = null;

  for (const use of toolUses) {
    const isError = resultFor.get(use.id); // undefined = no result arrived
    if (EDIT_TOOLS.has(use.name)) {
      const path = stringField(use.input, 'file_path');
      if (path !== undefined && isError === false) edited.add(path);
    }
    if (use.name === 'Bash') {
      const command = stringField(use.input, 'command');
      if (command !== undefined && isTestCommand(command)) {
        testRuns++;
        lastTestRunPassed = isError === undefined ? null : !isError;
      }
    }
  }

  return {
    toolCounts,
    filesEdited: [...edited],
    errorCount,
    testRuns,
    lastTestRunPassed,
    costUsd: final ? final.costUsd : null,
    turns: final ? final.turns : null,
    completed: final !== undefined && !final.isError,
  };
}
