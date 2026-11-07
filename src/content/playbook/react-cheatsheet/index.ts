import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'react-cheatsheet',
  title: 'React cheat sheet',
  summary: 'Render and commit, what triggers renders, keys, state snapshots and batching, effect lifecycle, memoisation decisions, React 19 APIs, Suspense and transitions, RSC vs SSR vs CSR, common bugs and TypeScript typing patterns.',
  body,
  order: 7,
};

export default doc;
