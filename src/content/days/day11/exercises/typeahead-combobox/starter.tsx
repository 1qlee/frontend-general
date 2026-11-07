import { useState } from 'react';

export interface Suggestion {
  id: string;
  label: string;
}

export interface TypeaheadProps {
  /** Injected data source: receives the trimmed query and an AbortSignal for that request. */
  search: (query: string, signal: AbortSignal) => Promise<Suggestion[]>;
  onSelect: (item: Suggestion) => void;
  /** Visible label; also the combobox's accessible name. */
  label?: string;
  debounceMs?: number;
}

/**
 * TODO — build the typeahead:
 *  1. Debounce: call `search(trimmedQuery, signal)` once, `debounceMs` after the last keystroke.
 *     Empty / whitespace-only input → no request, nothing shown.
 *  2. States: "Loading…" while in flight · options on success · "No results" when empty ·
 *     role="alert" containing "Something went wrong" on error.
 *  3. Latest wins: abort the previous request and ignore any response that is not for the current query.
 *  4. ARIA: input role="combobox" (labelled by `label`), aria-expanded, aria-controls → listbox id,
 *     aria-activedescendant → active option id; role="listbox" > role="option" with aria-selected.
 *  5. Keyboard: ArrowDown/ArrowUp move the active option (wrapping; ArrowDown re-opens a closed list),
 *     Enter selects it, Escape closes the list. Clicking an option selects it.
 *  6. Selecting: call onSelect(item), put item.label in the input, close the list — and do NOT search again.
 */
export function Typeahead({ search, onSelect, label = 'Search', debounceMs = 300 }: TypeaheadProps) {
  const [value, setValue] = useState('');
  return (
    <div>
      <label htmlFor="typeahead-input">{label}</label>
      <input id="typeahead-input" type="text" value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live preview: a fake API with random latency (so you can see races) and an
// error trigger. Type "error" to see the error state.
// ---------------------------------------------------------------------------
const FRAMEWORKS = ['React', 'React Native', 'Preact', 'Redux', 'Remix', 'Vue', 'Svelte', 'SolidJS', 'Angular', 'Qwik', 'Next.js', 'Nuxt', 'Astro', 'Lit'];

function fakeSearch(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (query.toLowerCase() === 'error') return reject(new Error('Server error'));
      const q = query.toLowerCase();
      resolve(FRAMEWORKS.filter((f) => f.toLowerCase().includes(q)).map((f) => ({ id: f, label: f })));
    }, 150 + Math.random() * 600);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export default function TypeaheadDemo() {
  const [picked, setPicked] = useState<Suggestion | null>(null);
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <Typeahead label="Framework" search={fakeSearch} onSelect={setPicked} />
      <p>Selected: {picked ? picked.label : '—'}</p>
    </div>
  );
}
