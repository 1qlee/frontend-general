/**
 * Content schema for the course. Every day of the course is a `Day` module in
 * `src/content/days/dayNN/index.ts`; agentic labs injected into days live in
 * `src/content/labs/dayNN/index.ts`.
 *
 * Markdown fields support GitHub-flavoured markdown plus:
 *  - Callouts:   > [!TIP] / [!NOTE] / [!WARNING] / [!INTERVIEW] / [!MISTAKE] / [!AGENT]
 *                (optional title after the marker: `> [!INTERVIEW] Say it like this`)
 *  - Runnable code: a fenced block with info string `ts run` (or `js run`) gets a
 *                Run button and executes in a sandboxed worker (console output shown).
 *  - Inline quiz: a paragraph consisting only of `{{quiz:<question-id>}}` renders one
 *                of the lesson's `checks` questions inline.
 */

export type Markdown = string;

/** Self-assessment areas used for confidence tracking across the course. */
export type SkillArea =
  | 'javascript'
  | 'async'
  | 'algorithms'
  | 'typescript'
  | 'react'
  | 'react-advanced'
  | 'browser'
  | 'css'
  | 'accessibility'
  | 'performance'
  | 'networking'
  | 'security'
  | 'system-design'
  | 'testing'
  | 'tooling'
  | 'agentic'
  | 'interviewing';

export interface QuizQuestion {
  id: string;
  /** Markdown prompt. Keep it short; put code in `code`. */
  prompt: Markdown;
  /** Optional code shown under the prompt (e.g. "what does this log?"). */
  code?: string;
  codeLang?: 'ts' | 'tsx' | 'js' | 'css' | 'html' | 'bash' | 'json';
  /** If true and `code` is present, a "Run it" button lets the learner verify the output after answering. */
  runnable?: boolean;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
  /** Why the answer is right AND why the tempting wrong answers are wrong. Markdown. */
  explanation: Markdown;
}

export type ExerciseRuntime =
  /** Pure logic; runs in a Web Worker. TypeScript. No DOM. */
  | 'logic'
  /** Real DOM in a sandboxed iframe with React 19, Testing Library and user-event. TSX. */
  | 'dom'
  /** Type-level challenge, checked by the TypeScript compiler (no runtime). */
  | 'types';

export interface Mutant {
  /** What is wrong with this implementation, revealed after the learner's tests catch it. */
  description: string;
  code: string;
}

export interface Exercise {
  id: string;
  title: string;
  runtime: ExerciseRuntime;
  difficulty: 'warm-up' | 'core' | 'stretch';
  estMinutes: number;
  /** Markdown problem statement: requirements, examples, constraints, what interviewers look for. */
  prompt: Markdown;
  /** Source the learner starts from (module syntax; e.g. `export function debounce(...)`). */
  starter: string;
  /** Reference solution (same exports as the starter). */
  solution: string;
  /**
   * implement mode: a Vitest-style test file importing from './solution'.
   * types runtime: type assertions importing from './solution' and './type-utils',
   *                with each case introduced by a `// test: description` comment.
   * write-tests mode: unused (the learner writes the tests) — use ''.
   */
  tests: string;
  /** Progressive hints, from gentle nudge to near-solution. */
  hints: string[];
  /** Markdown shown after solving/revealing: approach, complexity, edge cases, likely follow-up questions. */
  explanation: Markdown;
  /** dom runtime only: render the module's default export in a live preview pane. */
  preview?: boolean;
  /** 'write-tests': the learner writes tests (starter = test file) against `subject`; they must pass on it and catch every mutant. */
  mode?: 'implement' | 'write-tests';
  /** write-tests mode: the correct implementation, importable as './subject'. */
  subject?: string;
  /** write-tests mode: buggy implementations the learner's tests must catch. */
  mutants?: Mutant[];
  /** Topics for filtering in the practice bank, e.g. ['closures', 'timers']. */
  tags: string[];
}

export interface Flashcard {
  id: string;
  /** Question side (markdown). */
  front: Markdown;
  /** Answer side (markdown) — short and memorable. */
  back: Markdown;
}

export type InterviewQuestionKind = 'concept' | 'system-design' | 'ui-build' | 'behavioral' | 'agentic' | 'debugging';

export interface InterviewQuestion {
  id: string;
  kind: InterviewQuestionKind;
  /** The question as an interviewer would ask it. */
  question: Markdown;
  /** A strong model answer (structure it the way you'd say it out loud). */
  answer: Markdown;
  /** Likely follow-up questions from the interviewer. */
  followUps?: string[];
  /** Suggested time to answer out loud (minutes). */
  minutes?: number;
  level?: 'core' | 'senior';
}

interface BlockBase {
  /** Unique within the day, kebab-case. */
  id: string;
  title: string;
  minutes: number;
}

export interface LessonBlock extends BlockBase {
  kind: 'lesson';
  body: Markdown;
  /** Questions that can be embedded with {{quiz:id}} or are shown as "Check yourself" at the end. */
  checks?: QuizQuestion[];
}

export interface ExerciseBlock extends BlockBase {
  kind: 'exercise';
  /** Short intro: how to approach this set (e.g. "Talk out loud; set a 20-minute timer"). */
  intro: Markdown;
  exercises: Exercise[];
}

export interface QuizBlock extends BlockBase {
  kind: 'quiz';
  intro?: Markdown;
  questions: QuizQuestion[];
}

export interface LabBlock extends BlockBase {
  kind: 'lab';
  /** agentic = Claude Code practice; build = hands-on build in your own practice repo. */
  track: 'agentic' | 'build';
  body: Markdown;
  /** Concrete deliverables the learner ticks off. */
  checklist: string[];
}

/** Speak-aloud interview drill using the day's `interviewQuestions`. */
export interface DrillBlock extends BlockBase {
  kind: 'drill';
  intro?: Markdown;
  /** Ids from the day's interviewQuestions; empty = all of them. */
  questionIds?: string[];
}

/** Spaced-repetition warm-up using flashcards from earlier days. */
export interface ReviewBlock extends BlockBase {
  kind: 'review';
  intro?: Markdown;
}

export type Block = LessonBlock | ExerciseBlock | QuizBlock | LabBlock | DrillBlock | ReviewBlock;
export type BlockKind = Block['kind'];

export interface Day {
  number: number;
  /** e.g. "Async JavaScript & the Event Loop" */
  title: string;
  /** One-line theme / subtitle. */
  tagline: string;
  /** 2-4 sentence overview: why this matters in interviews. */
  summary: Markdown;
  /** "By the end of today you can…" */
  objectives: string[];
  /** Areas the learner self-rates at the end of the day. */
  skills: SkillArea[];
  blocks: Block[];
  flashcards: Flashcard[];
  interviewQuestions: InterviewQuestion[];
}

export interface PlaybookDoc {
  id: string;
  title: string;
  summary: string;
  body: Markdown;
  order: number;
}
