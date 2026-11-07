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

/**
 * Summarise one headless agent run from its (simplified) event log.
 * Tool calls and results are linked by `tool_use.id === tool_result.toolUseId`.
 * See the prompt for exactly which Bash commands count as "running tests".
 */
export function summarizeRun(events: AgentEvent[]): RunSummary {
  throw new Error('Not implemented');
}
