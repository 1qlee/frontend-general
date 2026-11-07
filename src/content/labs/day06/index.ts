import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-subagents',
  title: 'Claude Code: a read-only React reviewer and a test-writer subagent',
  minutes: 35,
  body,
  checklist: [
    'Your own Day 5–6 components copied into src/components/',
    '.claude/agents/react-reviewer.md with tools limited to Read, Grep, Glob and a prioritised output format',
    '.claude/agents/test-writer.md that only writes *.test.tsx files and reports likely bugs instead of fixing them',
    'Ran the reviewer on your Stopwatch, compared /context before and after, and fixed the top finding yourself',
    'Ran both subagents in parallel and triaged the combined summary',
    'Agents committed; reflection in notes/day06.md on context isolation',
  ],
};

export default lab;
