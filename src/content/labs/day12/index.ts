import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-security-review',
  title: 'Claude Code: security reviews and agent safety',
  minutes: 35,
  body,
  checklist: [
    'Planted ProfileCard on a scratch branch and exploited the innerHTML and location.assign sinks yourself',
    'Ran /security-review and a source → sink prompt review, and compared their findings in notes/day12.md',
    'Claude wrote failing regression tests; you fixed the component with your isSafeUrl, DOMPurify and an in-memory token',
    'Deny list extended and confirmed in /permissions; injected-issue experiment run in plan mode and recorded',
    'Audited `claude mcp list` and added the dependency-review rule to CLAUDE.md; DOMPurify vetted with npm view before installing',
  ],
};
export default lab;
