/**
 * Learner progress, persisted to localStorage. A small external store read with
 * useSyncExternalStore (the same pattern the course teaches on Days 6–7).
 *
 * Keys are namespaced by day ("3:debounce") so ids only need to be unique per day.
 */
import { useSyncExternalStore } from 'react';
import type { Day, SkillArea } from '../content/types';
import { readJSON, writeJSON } from '../lib/storage';

export type DrillGrade = 'nailed' | 'shaky' | 'missed';

export interface ExerciseProgress {
  code?: string;
  passed?: boolean;
  passedAt?: number;
  attempts: number;
  revealed?: boolean;
  hintsUsed?: number;
}

export interface CardProgress {
  box: number; // Leitner box 1..6
  due: number; // epoch ms
  reviews: number;
  lapses: number;
}

export interface MockSession {
  id: string;
  mode: string;
  startedAt: number;
  durationSec: number;
  items: { ref: string; grade?: DrillGrade; passed?: boolean }[];
  notes?: string;
}

export interface ProgressState {
  version: 1;
  startedAt: number;
  completed: Record<string, number>;
  exercises: Record<string, ExerciseProgress>;
  quiz: Record<string, { choice: number; correct: boolean; at: number }>;
  cards: Record<string, CardProgress>;
  drills: Record<string, { grade: DrillGrade; at: number }>;
  labChecks: Record<string, boolean[]>;
  notes: Record<string, string>;
  confidence: Record<string, Partial<Record<SkillArea, number>>>;
  studyLog: Record<string, number>;
  mockSessions: MockSession[];
  lastLocation?: string;
}

const STORAGE_KEY = 'feg:progress:v1';

function initialState(): ProgressState {
  return {
    version: 1,
    startedAt: Date.now(),
    completed: {},
    exercises: {},
    quiz: {},
    cards: {},
    drills: {},
    labChecks: {},
    notes: {},
    confidence: {},
    studyLog: {},
    mockSessions: [],
  };
}

function load(): ProgressState {
  const stored = readJSON<Partial<ProgressState> | null>(STORAGE_KEY, null);
  if (!stored || stored.version !== 1) return initialState();
  return { ...initialState(), ...stored };
}

let state: ProgressState = typeof window === 'undefined' ? initialState() : load();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function emit() {
  listeners.forEach((l) => l());
}

function scheduleSave() {
  if (saveTimer !== undefined) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined;
    writeJSON(STORAGE_KEY, state);
  }, 250);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => writeJSON(STORAGE_KEY, state));
  // Keep multiple tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      state = load();
      emit();
    }
  });
}

export function getProgress(): ProgressState {
  return state;
}

export function updateProgress(recipe: (draft: ProgressState) => ProgressState): void {
  state = recipe(state);
  scheduleSave();
  emit();
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): ProgressState;
export function useProgress<T>(selector: (s: ProgressState) => T): T;
export function useProgress<T>(selector?: (s: ProgressState) => T): T | ProgressState {
  return useSyncExternalStore(subscribeProgress, () => (selector ? selector(state) : state));
}

export function replaceProgress(next: ProgressState): void {
  state = { ...initialState(), ...next, version: 1 };
  writeJSON(STORAGE_KEY, state);
  emit();
}

export function resetProgress(): void {
  replaceProgress(initialState());
}

// ---------------------------------------------------------------------------
// Keys & mutations
// ---------------------------------------------------------------------------

export const key = (day: number, id: string) => `${day}:${id}`;

export function setBlockComplete(day: number, blockId: string, done = true): void {
  updateProgress((s) => {
    const completed = { ...s.completed };
    if (done) completed[key(day, blockId)] ??= Date.now();
    else delete completed[key(day, blockId)];
    return { ...s, completed };
  });
}

export function saveExercise(day: number, exerciseId: string, patch: Partial<ExerciseProgress>): void {
  updateProgress((s) => {
    const k = key(day, exerciseId);
    const prev = s.exercises[k] ?? { attempts: 0 };
    return { ...s, exercises: { ...s.exercises, [k]: { ...prev, ...patch } } };
  });
}

export function answerQuiz(day: number, questionId: string, choice: number, correct: boolean): void {
  updateProgress((s) => ({ ...s, quiz: { ...s.quiz, [key(day, questionId)]: { choice, correct, at: Date.now() } } }));
}

export function clearQuiz(day: number, questionIds: string[]): void {
  updateProgress((s) => {
    const quiz = { ...s.quiz };
    for (const id of questionIds) delete quiz[key(day, id)];
    return { ...s, quiz };
  });
}

export function gradeDrill(day: number, questionId: string, grade: DrillGrade): void {
  updateProgress((s) => ({ ...s, drills: { ...s.drills, [key(day, questionId)]: { grade, at: Date.now() } } }));
}

export function setLabChecks(day: number, blockId: string, checks: boolean[]): void {
  updateProgress((s) => ({ ...s, labChecks: { ...s.labChecks, [key(day, blockId)]: checks } }));
}

export function setNote(noteKey: string, text: string): void {
  updateProgress((s) => ({ ...s, notes: { ...s.notes, [noteKey]: text } }));
}

export function setConfidence(scope: string, skill: SkillArea, value: number): void {
  updateProgress((s) => ({ ...s, confidence: { ...s.confidence, [scope]: { ...s.confidence[scope], [skill]: value } } }));
}

export function addStudySeconds(seconds: number, date = new Date()): void {
  const day = toDateKey(date);
  updateProgress((s) => ({ ...s, studyLog: { ...s.studyLog, [day]: (s.studyLog[day] ?? 0) + seconds } }));
}

export function addMockSession(session: MockSession): void {
  updateProgress((s) => ({ ...s, mockSessions: [session, ...s.mockSessions].slice(0, 100) }));
}

export function setLastLocation(path: string): void {
  if (state.lastLocation === path) return;
  updateProgress((s) => ({ ...s, lastLocation: path }));
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Spaced repetition (Leitner boxes)
// ---------------------------------------------------------------------------

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Interval after a successful review, by the box the card moves INTO. */
const INTERVALS = [0, 10 * MINUTE, 1 * DAY, 2 * DAY, 4 * DAY, 7 * DAY, 14 * DAY];

export type CardGrade = 'again' | 'good' | 'easy';

export function reviewCard(cardKey: string, grade: CardGrade, now = Date.now()): void {
  updateProgress((s) => {
    const prev = s.cards[cardKey] ?? { box: 0, due: now, reviews: 0, lapses: 0 };
    let box: number;
    if (grade === 'again') box = 1;
    else if (grade === 'good') box = Math.min(6, Math.max(2, prev.box + 1));
    else box = Math.min(6, Math.max(3, prev.box + 2));
    const next: CardProgress = {
      box,
      due: now + INTERVALS[box],
      reviews: prev.reviews + 1,
      lapses: prev.lapses + (grade === 'again' && prev.reviews > 0 ? 1 : 0),
    };
    return { ...s, cards: { ...s.cards, [cardKey]: next } };
  });
}

export function isCardDue(progress: ProgressState, cardKey: string, now = Date.now()): boolean {
  const card = progress.cards[cardKey];
  return !card || card.due <= now;
}

// ---------------------------------------------------------------------------
// Derived progress
// ---------------------------------------------------------------------------

export function isBlockComplete(progress: ProgressState, day: number, blockId: string): boolean {
  return key(day, blockId) in progress.completed;
}

export function dayCompletion(progress: ProgressState, day: Day): { done: number; total: number; minutesDone: number; minutesTotal: number } {
  let done = 0;
  let minutesDone = 0;
  let minutesTotal = 0;
  for (const b of day.blocks) {
    minutesTotal += b.minutes;
    if (isBlockComplete(progress, day.number, b.id)) {
      done++;
      minutesDone += b.minutes;
    }
  }
  return { done, total: day.blocks.length, minutesDone, minutesTotal };
}

/** The first day that isn't fully complete (or the last day). */
export function currentDayNumber(progress: ProgressState, days: Day[]): number {
  for (const d of days) {
    const c = dayCompletion(progress, d);
    if (c.done < c.total) return d.number;
  }
  return days[days.length - 1]?.number ?? 1;
}

/** Highest day the learner has touched (for unlocking flashcards). */
export function furthestDayTouched(progress: ProgressState): number {
  let max = 1;
  for (const k of [...Object.keys(progress.completed), ...Object.keys(progress.exercises), ...Object.keys(progress.quiz)]) {
    const n = Number(k.split(':')[0]);
    if (n > max) max = n;
  }
  return max;
}
