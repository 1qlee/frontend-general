import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'day-of-checklist',
  title: 'The night before & the day of',
  summary: 'Logistics and remote-setup checks, a 20-minute warm-up in this app, mindset scripts for nerves and blanking, questions to ask each type of interviewer, the thank-you note, and how to debrief afterwards.',
  body,
  order: 9,
};

export default doc;
