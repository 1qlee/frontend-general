import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-debugging',
  title: 'Claude Code: debug with hypotheses, evidence and checkpoints',
  minutes: 35,
  body,
  checklist: [
    'Both bugs planted in src/scratch/debugging/ and committed, so every fix shows up in `git diff`',
    'Claude listed 3 ranked hypotheses with confirmation experiments (in plan mode) before any edit, for both bugs',
    'Gave Claude real evidence: a screenshot, computed styles for the ancestors, and console output for `target` vs `currentTarget`',
    'Dropdown fixed at the root cause (the toolbar’s stacking context), and a deliberate `position: fixed` hack undone with Esc Esc or /rewind',
    'A Testing Library test that clicks the inner <span> failed on the planted code and passed after you fixed handleClick yourself with closest()',
    'Both root causes explained in your own words in notes/day08.md',
  ],
};
export default lab;
