import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-skills',
  title: 'Claude Code: a React conventions skill and choosing the right mechanism',
  minutes: 35,
  body,
  checklist: [
    '.claude/skills/react-conventions/SKILL.md with name + description frontmatter, covering structure, typing, data fetching, memoization and testing',
    'Supporting examples.md, referenced from SKILL.md, with a canonical component and test',
    'Saw the skill load for a component task but not for a TypeScript question; tuned the description if needed',
    'Invoked the skill explicitly with /react-conventions to review the Day 5 scratch component',
    'Moved detailed React rules out of CLAUDE.md, leaving a one-line pointer',
    'Decision table and five-rule classification completed in notes/day07.md',
  ],
};

export default lab;
