import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-playwright-mcp',
  title: 'Claude Code: a visual feedback loop with Playwright MCP',
  minutes: 35,
  body,
  checklist: [
    'Playwright MCP added with `claude mcp add playwright -- npx @playwright/mcp@latest`; `/mcp` shows it connected',
    'notes/day05-pricing-spec.md written by you, with numbered, checkable acceptance criteria',
    'Claude built the component in src/scratch/, screenshotted it at 1280px and 375px and reported pass/fail per criterion',
    'Checked the minimal-state criterion: one piece of state, prices derived, no useEffect',
    'Compared the MCP loop with one manually pasted screenshot',
    'A Testing Library test for the toggle passes; reflection in notes/day05.md',
  ],
};

export default lab;
