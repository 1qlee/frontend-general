/**
 * Study timer: counts focused study time and flushes it into the progress
 * store every 30 seconds (and when paused) so the dashboard can show hours per day.
 */
import { useSyncExternalStore } from 'react';
import { addStudySeconds } from '../store/progress';

interface TimerState {
  running: boolean;
  sessionSeconds: number;
}

let state: TimerState = { running: false, sessionSeconds: 0 };
let unflushed = 0;
let interval: number | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function flush() {
  if (unflushed > 0) {
    addStudySeconds(unflushed);
    unflushed = 0;
  }
}

export function startTimer() {
  if (state.running) return;
  state = { ...state, running: true };
  interval = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return; // don't count time away from the tab
    unflushed++;
    state = { ...state, sessionSeconds: state.sessionSeconds + 1 };
    if (unflushed >= 30) flush();
    emit();
  }, 1000);
  emit();
}

export function pauseTimer() {
  if (!state.running) return;
  window.clearInterval(interval);
  interval = undefined;
  flush();
  state = { ...state, running: false };
  emit();
}

if (typeof window !== 'undefined') window.addEventListener('beforeunload', flush);

export function useStudyTimer(): TimerState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function formatDuration(totalSeconds: number, withSeconds = false): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (withSeconds) return `${h > 0 ? `${h}:` : ''}${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
