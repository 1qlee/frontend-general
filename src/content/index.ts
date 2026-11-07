/**
 * Assembles the course from the per-day modules. New days and labs are picked
 * up automatically by the glob imports — no registry to edit.
 */
import type { Block, Day, Exercise, Flashcard, InterviewQuestion, LabBlock, PlaybookDoc, QuizQuestion } from './types';

const dayModules = import.meta.glob<{ default: Day }>('./days/day*/index.ts', { eager: true });
const labModules = import.meta.glob<{ default: LabBlock }>('./labs/day*/index.ts', { eager: true });
const playbookModules = import.meta.glob<{ default: PlaybookDoc }>('./playbook/*/index.ts', { eager: true });

function labFor(dayNumber: number): LabBlock | undefined {
  const key = `./labs/day${String(dayNumber).padStart(2, '0')}/index.ts`;
  return labModules[key]?.default;
}

/** Insert the day's agentic lab before the speak-aloud drill (or at the end). */
function withLab(day: Day): Day {
  const lab = labFor(day.number);
  if (!lab || day.blocks.some((b) => b.id === lab.id)) return day;
  const blocks = [...day.blocks];
  const drillIndex = blocks.findIndex((b) => b.kind === 'drill');
  blocks.splice(drillIndex === -1 ? blocks.length : drillIndex, 0, lab);
  return { ...day, blocks };
}

export const days: Day[] = Object.values(dayModules)
  .map((m) => withLab(m.default))
  .sort((a, b) => a.number - b.number);

export const playbook: PlaybookDoc[] = Object.values(playbookModules)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order);

export const TOTAL_DAYS = days.length;

export function getDay(n: number): Day | undefined {
  return days.find((d) => d.number === n);
}

export function getBlock(dayNumber: number, blockId: string): Block | undefined {
  return getDay(dayNumber)?.blocks.find((b) => b.id === blockId);
}

export interface ExerciseRef {
  day: Day;
  block: Block & { kind: 'exercise' };
  exercise: Exercise;
}

export const allExercises: ExerciseRef[] = days.flatMap((day) =>
  day.blocks.flatMap((block) => (block.kind === 'exercise' ? block.exercises.map((exercise) => ({ day, block, exercise })) : [])),
);

export function findExercise(id: string): ExerciseRef | undefined {
  return allExercises.find((e) => e.exercise.id === id);
}

export interface FlashcardRef {
  day: Day;
  card: Flashcard;
}
export const allFlashcards: FlashcardRef[] = days.flatMap((day) => day.flashcards.map((card) => ({ day, card })));

export interface InterviewQuestionRef {
  day: Day;
  question: InterviewQuestion;
}
export const allInterviewQuestions: InterviewQuestionRef[] = days.flatMap((day) => day.interviewQuestions.map((question) => ({ day, question })));

export interface QuizRef {
  day: Day;
  block: Block;
  question: QuizQuestion;
}
export const allQuizQuestions: QuizRef[] = days.flatMap((day) =>
  day.blocks.flatMap((block): QuizRef[] =>
    block.kind === 'quiz'
      ? block.questions.map((question) => ({ day, block, question }))
      : block.kind === 'lesson'
        ? (block.checks ?? []).map((question) => ({ day, block, question }))
        : [],
  ),
);

export function dayMinutes(day: Day): number {
  return day.blocks.reduce((sum, b) => sum + b.minutes, 0);
}
