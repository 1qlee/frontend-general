import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'system-design-round',
  title: 'Frontend system design',
  summary: 'The RADIO framework with a time budget, a clarifying-questions bank, decision tables for rendering, data, real-time, pagination, state and offline, a cross-cutting checklist, and ten practice prompts.',
  body,
  order: 3,
};

export default doc;
