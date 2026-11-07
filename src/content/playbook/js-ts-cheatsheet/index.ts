import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'js-ts-cheatsheet',
  title: 'JavaScript & TypeScript cheat sheet',
  summary: 'Event-loop ordering, this-binding rules, equality and coercion tables, method complexity, Promise combinators, and the TypeScript essentials: type vs interface, any/unknown/never, narrowing, utility types, generics and type-level patterns.',
  body,
  order: 6,
};

export default doc;
