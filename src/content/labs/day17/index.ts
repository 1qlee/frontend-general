import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-stress-testing',
  title: 'Claude Code: stress-test your solutions with a brute force and random inputs',
  minutes: 35,
  body,
  checklist: [
    'CLAUDE.md says Claude must not edit or suggest code for your solutions in src/drills/dsa/',
    'coinChange.ts written by you, without AI',
    'Claude-written brute force (no caching or tricks) and a seeded PRNG in src/test/random.ts, reviewed in plan mode before approval',
    'A differential Vitest test runs 500 seeded cases and reports the smallest failing input with its seed',
    'Planted a bug, debugged it yourself from the minimal counterexample, and kept that input as a regression test',
    'Read a fast-check version of the test and can explain shrinking and invariant-style properties',
    'Reflection written in notes/dsa-stress.md',
  ],
};

export default lab;
