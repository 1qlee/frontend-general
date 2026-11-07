import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-socratic-dsa-coach',
  title: 'Claude Code as a Socratic DS&A coach',
  minutes: 35,
  body,
  checklist: [
    'src/dsa/productExceptSelf.ts stub created, plus a CLAUDE.md rule forbidding solution code in src/dsa/',
    '.claude/commands/hint.md takes a file and a level 1–4 ($1/$2) and gives exactly one hint, never TypeScript',
    '.claude/commands/complexity.md asks you to state and justify time/space complexity before it grades you',
    'productExceptSelf implemented by you, without AI, in O(n) time with no division',
    'Claude-written edge-case tests (zeros, negatives, empty, single element, large n) pass against your code, with the implementation untouched by Claude',
    'Commands committed; reflection written in notes/dsa-1.md',
  ],
};

export default lab;
