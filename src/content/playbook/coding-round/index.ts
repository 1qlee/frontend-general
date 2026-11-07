import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'coding-round',
  title: 'The coding round',
  summary: 'A six-step script for live coding (clarify, examples, approach, narrate, test, optimise), the phrases to use at each step, what to do when stuck, and the key trick for every frontend-flavoured question type.',
  body,
  order: 1,
};

export default doc;
