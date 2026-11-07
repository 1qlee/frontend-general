import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'ui-build-round',
  title: 'The UI build round',
  summary: 'A 45-minute plan for React + TypeScript machine-coding rounds, the rubric interviewers grade against, reusable patterns, and the gotchas for the ten most common prompts.',
  body,
  order: 2,
};

export default doc;
