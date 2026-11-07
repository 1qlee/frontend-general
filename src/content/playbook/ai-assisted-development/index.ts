import type { PlaybookDoc } from '../../types';
import body from './doc.md?raw';

const doc: PlaybookDoc = {
  id: 'ai-assisted-development',
  title: 'AI-assisted development in interviews',
  summary: "How to describe an AI-assisted workflow credibly (context, planning, verification, review, guardrails, security), strong answers to the questions interviewers now ask, and do's and don'ts for rounds where AI tools are allowed.",
  body,
  order: 5,
};

export default doc;
