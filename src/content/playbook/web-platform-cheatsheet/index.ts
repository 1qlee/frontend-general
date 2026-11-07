import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'web-platform-cheatsheet',
  title: 'Web platform cheat sheet',
  summary: 'The browser, CSS, accessibility, performance, networking and security facts and numbers interviewers expect you to know cold: rendering pipeline, events, storage, specificity, stacking, Core Web Vitals, caching, HTTP versions, WCAG 2.2, XSS/CSRF/CSP/CORS and OAuth PKCE.',
  body,
  order: 8,
};

export default doc;
