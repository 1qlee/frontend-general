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

const FILE_TOOLS = new Set(['Edit', 'Write']);

/** Escape a literal character for use inside a RegExp. */
const escapeChar = (ch: string): string => (/[.+^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch);

/**
 * Glob → anchored RegExp.
 *   `**` + `/`  → zero or more whole directories
 *   `**`        → anything, including `/`
 *   `*`         → any run of characters except `/`
 *   `?`         → exactly one character except `/`
 *   anything else is literal (so `.` is a dot, not "any character")
 */
export function globToRegExp(glob: string): RegExp {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        source += '(?:.*/)?';
        i += 2;
      } else {
        source += '.*';
        i += 1;
      }
    } else if (ch === '*') {
      source += '[^/]*';
    } else if (ch === '?') {
      source += '[^/]';
    } else {
      source += escapeChar(ch);
    }
  }
  return new RegExp(`^${source}$`);
}

/** Patterns without a `/` match the file name at any depth (like .gitignore); others match the whole relative path. */
export function matchesGlob(relativePath: string, glob: string): boolean {
  const target = glob.includes('/') ? relativePath : relativePath.slice(relativePath.lastIndexOf('/') + 1);
  return globToRegExp(glob).test(target);
}

/** Project-relative path, or null when the path points outside the project. */
function toProjectPath(filePath: string, cwd?: string): string | null {
  let path = filePath;
  if (cwd) {
    const root = `${cwd.replace(/\/+$/, '')}/`;
    if (path.startsWith(root)) path = path.slice(root.length);
  }
  while (path.startsWith('./')) path = path.slice(2);
  if (path.startsWith('/')) return null; // absolute and not inside cwd
  if (path.split('/').includes('..')) return null; // traversal: don't try to be clever, refuse
  return path;
}

/** Pad shell separators with spaces, collapse whitespace, and wrap in spaces for token-boundary matching. */
const normalizeCommand = (command: string): string =>
  ` ${command.replace(/([;&|()])/g, ' $1 ').replace(/\s+/g, ' ').trim()} `;

const block = (reason: string): Decision => ({
  exitCode: 2,
  stderr: `Blocked by project policy: ${reason} Ask the human to make this change or suggest an alternative.`,
});

export function decide(input: HookInput, policy: Policy): Decision {
  if (input.hook_event_name !== 'PreToolUse') return { exitCode: 0 };
  const { tool_name: tool, tool_input: toolInput } = input;

  if (FILE_TOOLS.has(tool)) {
    const raw = toolInput.file_path;
    if (!raw) return { exitCode: 0 };
    const path = toProjectPath(raw, input.cwd);
    if (path === null) return block(`${tool} on "${raw}" is outside the project.`);
    const hit = policy.protectedPaths.find((glob) => matchesGlob(path, glob));
    if (hit) return block(`${tool} on "${path}" matches protected pattern "${hit}".`);
    return { exitCode: 0 };
  }

  if (tool === 'Bash') {
    const raw = toolInput.command;
    if (!raw) return { exitCode: 0 };
    const command = normalizeCommand(raw);
    const hit = policy.deniedCommands.find((pattern) => command.includes(normalizeCommand(pattern)));
    if (hit) return block(`the command matches denied pattern "${hit}".`);
    return { exitCode: 0 };
  }

  return { exitCode: 0 };
}
