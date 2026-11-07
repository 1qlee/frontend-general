import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'dsa-patterns',
  title: 'DS&A pattern recognition cheat sheet',
  summary:
    'The problem-solving framework, complexity by constraints, a cue-to-pattern map, and a TypeScript template for each pattern: hashing, two pointers, sliding window, prefix sums, monotonic stack, binary search, linked lists, tree and graph DFS/BFS, topological sort, heaps, backtracking and DP.',
  body,
  order: 11,
};

export default doc;
