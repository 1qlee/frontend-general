import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

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

type Status = 'idle' | 'loading' | 'success' | 'error';

/** Wrap the first case-insensitive match of `query` in <mark>. */
function Highlight({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export function Typeahead({ search, onSelect, label = 'Search', debounceMs = 300 }: TypeaheadProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const [inputValue, setInputValue] = useState('');
  // The search term only changes when the USER types — selecting an option fills the
  // input but must not trigger a new search.
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Latest `search` without restarting the debounce when a parent passes a new function each render.
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  });

  useEffect(() => {
    const term = query.trim();
    if (!term) return; // reset happens in the change handler
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus('loading');
      searchRef.current(term, controller.signal).then(
        (items) => {
          if (controller.signal.aborted) return; // stale: a newer query superseded this one
          setResults(items);
          setStatus('success');
          setActiveIndex(-1);
        },
        () => {
          if (controller.signal.aborted) return;
          setResults([]);
          setStatus('error');
        },
      );
    }, debounceMs);
    // Runs when the query changes (or on unmount): cancels the pending debounce AND the in-flight request.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, debounceMs]);

  const hasTerm = query.trim() !== '';
  const listVisible = open && hasTerm && status === 'success' && results.length > 0;
  const statusMessage = !open || !hasTerm ? '' : status === 'loading' ? 'Loading…' : status === 'success' && results.length === 0 ? 'No results' : '';

  function select(item: Suggestion) {
    onSelect(item);
    setInputValue(item.label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setInputValue(value);
    setQuery(value);
    setOpen(true);
    setActiveIndex(-1);
    if (!value.trim()) {
      setStatus('idle');
      setResults([]);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown': {
        if (!hasTerm || status !== 'success' || results.length === 0) return;
        event.preventDefault(); // don't move the caret
        setOpen(true); // re-opens after Escape
        setActiveIndex((i) => (i + 1) % results.length);
        return;
      }
      case 'ArrowUp': {
        if (!listVisible) return;
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
        return;
      }
      case 'Enter': {
        if (listVisible && activeIndex >= 0) {
          event.preventDefault(); // don't submit an enclosing form
          select(results[activeIndex]);
        }
        return;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        } else if (inputValue) {
          // second Escape clears the field (APG behaviour)
          setInputValue('');
          setQuery('');
          setStatus('idle');
          setResults([]);
        }
        return;
      }
    }
  }

  return (
    <div style={{ position: 'relative', maxWidth: 320 }}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={listVisible}
        aria-controls={listboxId}
        aria-activedescendant={listVisible && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        style={{ display: 'block', width: '100%' }}
      />
      <div role="status">{statusMessage}</div>
      {open && hasTerm && status === 'error' && <div role="alert">Something went wrong. Try again.</div>}
      <ul
        id={listboxId}
        role="listbox"
        aria-label={label}
        hidden={!listVisible}
        style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #ccc' }}
      >
        {listVisible &&
          results.map((item, index) => (
            <li
              key={item.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              // keep focus in the input so blur doesn't close the list before the click lands
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(item)}
              style={{ padding: '4px 8px', cursor: 'pointer', background: index === activeIndex ? '#dbeafe' : undefined }}
            >
              <Highlight text={item.label} query={query.trim()} />
            </li>
          ))}
      </ul>
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
