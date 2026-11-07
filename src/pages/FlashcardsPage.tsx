import { useMemo, useState } from 'react';
import { allFlashcards, days } from '../content';
import { FlashcardReviewer } from '../components/FlashcardReviewer';
import { furthestDayTouched, getProgress, isCardDue, key, useProgress } from '../store/progress';

type DeckMode = 'due' | 'day' | 'all';

export function FlashcardsPage() {
  const progress = useProgress();
  const unlocked = furthestDayTouched(progress);
  const [mode, setMode] = useState<DeckMode>('due');
  const [dayFilter, setDayFilter] = useState<number>(1);
  const [session, setSession] = useState(0);

  // Snapshot the deck per session so grading cards doesn't reshuffle the queue mid-review.
  const deck = useMemo(() => {
    const p = getProgress();
    const cards = allFlashcards.filter((c) => (mode === 'day' ? c.day.number === dayFilter : c.day.number <= (mode === 'all' ? days.length : unlocked)));
    const filtered = mode === 'due' ? cards.filter((c) => isCardDue(p, key(c.day.number, c.card.id))) : cards;
    return [...filtered].sort(() => Math.random() - 0.5);
  }, [mode, dayFilter, unlocked, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const boxes = [0, 0, 0, 0, 0, 0, 0];
  for (const c of allFlashcards) boxes[progress.cards[key(c.day.number, c.card.id)]?.box ?? 0]++;
  const dueCount = allFlashcards.filter((c) => c.day.number <= unlocked && isCardDue(progress, key(c.day.number, c.card.id))).length;

  return (
    <div className="page narrow">
      <header className="page-header">
        <p className="eyebrow">Spaced repetition</p>
        <h1>Flashcards</h1>
        <p className="lede">
          Say the answer out loud, then reveal. Cards you know move to longer intervals (1 → 2 → 4 → 7 → 14 days); misses come back in 10 minutes. Cards unlock as you progress
          through the days.
        </p>
      </header>
      <div className="card deck-controls">
        <div className="segmented" role="radiogroup" aria-label="Deck">
          {(
            [
              ['due', `Due now (${dueCount})`],
              ['day', 'By day'],
              ['all', `All (${allFlashcards.length})`],
            ] as const
          ).map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={mode === value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>
              {label}
            </button>
          ))}
        </div>
        {mode === 'day' && (
          <label className="inline-select">
            Day{' '}
            <select value={dayFilter} onChange={(e) => setDayFilter(Number(e.target.value))}>
              {days.map((d) => (
                <option key={d.number} value={d.number}>
                  {d.number}. {d.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSession((s) => s + 1)}>
          New session
        </button>
      </div>
      <div className="card">
        <FlashcardReviewer key={`${mode}-${dayFilter}-${session}`} deck={deck} emptyMessage="Nothing due right now. Come back later, or pick “All” for extra practice." />
      </div>
      <div className="card box-stats">
        <h2 className="h-small">Memory boxes</h2>
        <ul>
          {['New', '10 min', '1 day', '2 days', '4 days', '7 days', '14 days'].map((label, i) => (
            <li key={label}>
              <span className="box-count">{boxes[i]}</span>
              <span className="muted small">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
