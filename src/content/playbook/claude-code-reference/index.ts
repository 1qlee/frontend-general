import type { PlaybookDoc } from '../../types';
import raw from '../../../../docs/claude-code-reference.md?raw';

// Reuse the repo's reference doc; drop its H1 (the page renders its own title).
const body = raw.replace(/^# .*\n+/, '');

const doc: PlaybookDoc = {
  id: 'claude-code-reference',
  title: 'Claude Code quick reference',
  summary: 'Memory, permissions, modes, commands, skills, subagents, hooks, MCP, headless mode and CI — the features used in the labs.',
  body,
  order: 10,
};

export default doc;
