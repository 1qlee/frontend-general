import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'behavioral',
  title: 'Behavioural interviews',
  summary: 'STAR(R) with timings, a 60–90-second "tell me about yourself", a story-bank template, the 15 most common questions and what they really probe, senior-level signals, and the pitfalls that cost offers.',
  body,
  order: 4,
};

export default doc;
