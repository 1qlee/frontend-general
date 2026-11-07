import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-hooks-settings',
  title: 'Claude Code: permissions and hooks that enforce your rules',
  minutes: 35,
  body,
  checklist: [
    '.claude/settings.json with an allowlist (tests, tsc, read-only git) and deny rules for .env files; /permissions shows them',
    'PostToolUse hooks: Prettier on edited files, and a type check that exits 2 with errors on stderr',
    'PreToolUse protect.sh blocks edits to .env* and lockfiles (manual stdin test prints exit=2)',
    'Tried to read .env, create .env.local and edit package-lock.json through Claude, and saw each attempt stopped',
    'Saw the type-check hook feed an error back to Claude; settings and hooks committed, settings.local.json not committed',
    'Reflection in notes/day04.md on settings scopes and advice (CLAUDE.md) vs enforcement (hooks)',
  ],
};

export default lab;
