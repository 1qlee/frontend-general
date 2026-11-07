import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-slash-commands',
  title: 'Claude Code: custom slash commands for type drills and compiler errors',
  minutes: 35,
  body,
  checklist: [
    'src/drills/types/type-utils.ts with Equal, Expect and Todo',
    '.claude/commands/drill-types.md (description, argument-hint, $ARGUMENTS) generated 3 challenges without solutions',
    'Solved one generated challenge yourself, without AI, until tsc showed no errors in it',
    '.claude/commands/explain-error.md (allowed-tools + ! output injection) explained the narrowing error with a hint, not a fix',
    'Both commands committed so anyone cloning fe-gym gets them',
    'Reflection in notes/day03.md, including when to use a command vs CLAUDE.md',
  ],
};

export default lab;
