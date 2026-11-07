import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-a11y-audit',
  title: 'Claude Code: an a11y auditor subagent plus axe in Playwright',
  minutes: 35,
  body,
  checklist: [
    'Your Day 9 components in src/components/a11y/, rendered on an /a11y.html harness that Claude wrote',
    '.claude/agents/a11y-auditor.md with tools limited to Read, Grep, Glob and a severity + WCAG output table',
    'e2e/a11y.spec.ts scans three UI states with @axe-core/playwright, writes a11y-report/*.json, and Vitest ignores e2e/',
    'Ran audit → fix (by you) → `npm run test:a11y` until green, with the WCAG criterion noted for each fix',
    'Keyboard-only pass and screen-reader smoke test done by you, with findings in notes/day09.md',
  ],
};
export default lab;
