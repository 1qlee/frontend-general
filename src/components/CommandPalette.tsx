import { useEffect, useMemo, useRef, useState } from 'react';
import { days, playbook } from '../content';
import { navigate } from '../lib/router';
import { blockMeta, RUNTIME_LABELS } from '../lib/meta';
import { Icon, type IconName } from './Icon';
import { plain } from '../lib/text';

interface Entry {
  label: string;
  detail: string;
  to: string;
  icon: IconName;
  haystack: string;
}

function buildEntries(): Entry[] {
  const entries: Entry[] = [
    { label: 'Dashboard', detail: 'Page', to: '/', icon: 'home', haystack: 'dashboard home progress' },
    { label: 'Start here', detail: 'Page', to: '/start', icon: 'compass', haystack: 'start orientation baseline syllabus' },
    { label: 'Flashcards', detail: 'Page', to: '/flashcards', icon: 'cards', haystack: 'flashcards review spaced repetition' },
    { label: 'Practice bank', detail: 'Page', to: '/practice', icon: 'code', haystack: 'practice exercises all' },
    { label: 'Mock interview', detail: 'Page', to: '/mock', icon: 'mic', haystack: 'mock interview simulation' },
    { label: 'Interview playbook', detail: 'Page', to: '/playbook', icon: 'book', haystack: 'playbook cheatsheet' },
    { label: 'Playground', detail: 'Page', to: '/playground', icon: 'terminal', haystack: 'playground scratchpad run code' },
    { label: 'Settings', detail: 'Page', to: '/settings', icon: 'settings', haystack: 'settings export import reset theme' },
  ];
  for (const day of days) {
    entries.push({ label: `Day ${day.number}: ${day.title}`, detail: day.tagline, to: `/day/${day.number}`, icon: 'flag', haystack: `${day.title} ${day.tagline}`.toLowerCase() });
    for (const block of day.blocks) {
      const meta = blockMeta(block);
      entries.push({ label: plain(block.title), detail: `Day ${day.number} · ${meta.label}`, to: `/day/${day.number}/${block.id}`, icon: meta.icon, haystack: `${block.title} ${meta.label}`.toLowerCase() });
      if (block.kind === 'exercise') {
        for (const ex of block.exercises) {
          entries.push({
            label: plain(ex.title),
            detail: `Day ${day.number} · ${RUNTIME_LABELS[ex.runtime]} · ${ex.difficulty}`,
            to: `/day/${day.number}/${block.id}/${ex.id}`,
            icon: 'code',
            haystack: `${ex.title} ${ex.tags.join(' ')} ${ex.runtime}`.toLowerCase(),
          });
        }
      }
    }
  }
  for (const doc of playbook) {
    entries.push({ label: doc.title, detail: 'Playbook', to: `/playbook/${doc.id}`, icon: 'book', haystack: `${doc.title} ${doc.summary}`.toLowerCase() });
  }
  return entries;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<Element | null>(document.activeElement);
  const entries = useMemo(buildEntries, []);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = terms.length ? entries.filter((e) => terms.every((t) => e.haystack.includes(t) || e.label.toLowerCase().includes(t))) : entries.slice(0, 12);
    return list.slice(0, 40);
  }, [entries, query]);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = previouslyFocused.current;
    return () => {
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, []);
  useEffect(() => setActive(0), [query]);

  const go = (entry: Entry | undefined) => {
    if (!entry) return;
    onClose();
    navigate(entry.to);
  };

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search the course" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search days, lessons, exercises, playbook…"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-opt-${active}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter') go(results[active]);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-results" id="palette-results" role="listbox" aria-label="Results">
          {results.length === 0 && <li className="palette-empty">No matches.</li>}
          {results.map((entry, i) => (
            <li
              key={`${entry.to}-${i}`}
              id={`palette-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`palette-item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(entry)}
            >
              <Icon name={entry.icon} size={16} />
              <span className="palette-item-text">
                <span>{entry.label}</span>
                <small>{entry.detail}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
