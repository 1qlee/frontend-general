import { useSyncExternalStore } from 'react';
import { readString, writeString } from './storage';

export type ThemePreference = 'light' | 'dark' | 'system';
const KEY = 'feg:theme';
const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : undefined;

export function getThemePreference(): ThemePreference {
  const stored = readString(KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function resolved(): 'light' | 'dark' {
  const pref = getThemePreference();
  if (pref !== 'system') return pref;
  return media?.matches ? 'dark' : 'light';
}

export function setThemePreference(pref: ThemePreference): void {
  writeString(KEY, pref === 'system' ? null : pref);
  if (pref === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = pref;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  media?.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener('change', listener);
  };
}

/** The resolved theme currently shown ('light' | 'dark'). */
export function useTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, resolved, () => 'light');
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, () => 'system');
}
