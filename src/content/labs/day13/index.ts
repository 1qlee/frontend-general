import type { LabBlock } from '../../types';
import body from './lab.md?raw';

const lab: LabBlock = {
  kind: 'lab',
  track: 'agentic',
  id: 'agentic-ci-parallel',
  title: 'Claude Code: GitHub Actions reviews and parallel agents on worktrees',
  minutes: 35,
  body,
  checklist: [
    'fe-gym on GitHub (private) with a green ci.yml running typecheck, Vitest and the Playwright a11y spec',
    '/install-github-app done; claude.yml (@claude mentions) and claude-review.yml (prompt-based PR review) committed',
    'Two Claude sessions ran in parallel on separate worktrees and ports: e2e tests in one, the SignupForm refactor in the other',
    'Refactor guarded by an explicit prompt rule plus a local PreToolUse hook; `git diff --stat main` on test files was empty',
    'e2e branch merged first, and its tests passed against the rebased refactor before you merged it',
    '@claude reviewed the refactor PR; reflection in notes/day13.md',
  ],
};
export default lab;
