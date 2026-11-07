import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-headless-perf',
  title: 'Claude Code: headless perf reviews with claude -p',
  minutes: 35,
  body,
  checklist: [
    'Ran `claude -p` with piped build output and `--output-format json`, and found the result and cost fields with jq',
    'perf-budget.md based on your measured baseline, plus the review prompt in scripts/perf-review.prompt.md',
    'scripts/perf-review.sh builds, measures and pipes into `claude -p` with read-only tools and `--max-turns`; pass/fail is decided in bash',
    'Planted lodash regression: script exits 1 and the review names lodash and src/main.tsx with numbers you verified in .perf/',
    'Regression removed and the script exits 0; reflection on permissions and cost in notes/day10.md',
  ],
};
export default lab;
