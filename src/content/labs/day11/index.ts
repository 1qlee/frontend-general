import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-system-design-sparring',
  title: 'Claude Code: a strict system design mock interviewer',
  minutes: 35,
  body,
  checklist: [
    '.claude/commands/mock-sd.md: one question at a time, pushback rules, a RADIO time plan and an end-of-round scorecard',
    'Ran a timed 25-minute "notifications center" mock in plan mode, whiteboard in notes/day11-mock.md, scorecard in notes/day11-scorecard.md',
    'In a fresh session, got the 5 strongest objections plus a steelman of the alternative, and responded to the top two',
    'docs/adr/0001-notifications-realtime-transport.md drafted with plan mode; you wrote the Decision and fact-checked the flagged claims',
    'Reflection in notes/day11.md, including any sycophancy you caught and how you countered it',
  ],
};
export default lab;
