/**
 * The JSON a PreToolUse hook receives on stdin — only the fields this guard needs.
 * (The real payload has more, e.g. `session_id`.)
 */
export interface HookInput {
  /** 'PreToolUse' for this guard. Be defensive: anything else is allowed. */
  hook_event_name: string;
  /** e.g. 'Edit', 'Write', 'Bash', 'Read'. */
  tool_name: string;
  /** Edit/Write put the target in `file_path`; Bash puts the shell command in `command`. */
  tool_input: { file_path?: string; command?: string };
  /** The project directory the session runs in. Edit/Write paths are often absolute paths inside it. */
  cwd?: string;
}

export interface Policy {
  /** Globs (relative to the project root) that Edit/Write must not touch, e.g. ['.env*', 'src/generated/**']. */
  protectedPaths: string[];
  /** Command fragments Bash must not run, e.g. ['rm -rf', 'git push --force']. */
  deniedCommands: string[];
}

export interface Decision {
  /** 0 = allow the tool call; 2 = block it and feed `stderr` back to Claude. */
  exitCode: 0 | 2;
  /** Present only when blocking: why, and what Claude should do instead. */
  stderr?: string;
}

/**
 * Decide whether a tool call may proceed.
 *
 * - Edit/Write: block files matching `policy.protectedPaths` (glob rules in the prompt) and
 *   any path outside the project. Absolute paths under `input.cwd` count as inside the project.
 * - Bash: block commands containing a `policy.deniedCommands` entry as whole tokens,
 *   ignoring extra whitespace and treating ; & | ( ) as separators.
 * - Everything else: allow.
 *
 * Blocking returns `{ exitCode: 2, stderr }` where stderr names the path/pattern;
 * allowing returns `{ exitCode: 0 }` with no stderr.
 */
export function decide(input: HookInput, policy: Policy): Decision {
  throw new Error('Not implemented');
}
