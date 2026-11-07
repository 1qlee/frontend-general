import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-plan-mode-tdd',
  title: 'Claude Code: plan mode + a TDD loop for mapWithConcurrency',
  minutes: 35,
  body,
  checklist: [
    'Used Shift+Tab (or --permission-mode plan) to explore and plan before any file changed',
    'Edited Claude’s test plan at least once (e.g. added the pool-vs-batches timing test) before approving it',
    'Failing Vitest tests with fake timers committed with a "test:" message that explains why',
    'mapWithConcurrency implemented by you, without AI, and all tests green',
    'Claude reviewed your code with hints only; `git diff HEAD~1 -- src/drills/mapWithConcurrency.test.ts` shows the tests unchanged',
    'Reflection written in notes/day02.md',
  ],
};

export default lab;
