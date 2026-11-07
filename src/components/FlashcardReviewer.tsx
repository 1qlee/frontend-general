import { useEffect, useMemo, useState } from 'react';
import type { FlashcardRef } from '../content';
import { key, reviewCard, type CardGrade } from '../store/progress';
import { Markdown } from './Markdown';
import { Icon } from './Icon';

interface Props {
  deck: FlashcardRef[];
  emptyMessage?: string;
  onFinished?: () => void;
}

/** One pass through a deck. Cards graded "again" come back once at the end of the session. */
export function FlashcardReviewer({ deck, emptyMessage = 'No cards due. Nice work!', onFinished }: Props) {
  const initial = useMemo(() => deck.map((c) => key(c.day.number, c.card.id)), [deck]);
  const byKey = useMemo(() => new Map(deck.map((c) => [key(c.day.number, c.card.id), c])), [deck]);
  const [queue, setQueue] = useState<string[]>(initial);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ again: 0, good: 0, easy: 0 });
  const [requeued, setRequeued] = useState<Set<string>>(new Set());

  useEffect(() => {
    setQueue(initial);
    setRevealed(false);
    setStats({ again: 0, good: 0, easy: 0 });
    setRequeued(new Set());
  }, [initial]);

  const currentKey = queue[0];
  const current = currentKey ? byKey.get(currentKey) : undefined;

  const grade = (g: CardGrade) => {
    if (!currentKey) return;
    reviewCard(currentKey, g);
    setStats((s) => ({ ...s, [g]: s[g] + 1 }));
    setRevealed(false);
    setQueue((q) => {
      const rest = q.slice(1);
      if (g === 'again' && !requeued.has(currentKey)) {
        setRequeued((r) => new Set(r).add(currentKey));
        return [...rest, currentKey];
      }
      return rest;
    });
  };

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable], .cm-editor')) return;
      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3'].includes(event.key)) {
        grade((['again', 'good', 'easy'] as const)[Number(event.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!current && deck.length > 0 && stats.again + stats.good + stats.easy > 0) onFinished?.();
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  if (deck.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }
  if (!current) {
    const total = stats.again + stats.good + stats.easy;
    return (
      <div className="flash-done">
        <Icon name="trophy" size={28} />
        <h3>Session complete</h3>
        <p className="muted">
          {total} reviews · {stats.good + stats.easy} recalled · {stats.again} to revisit soon
        </p>
      </div>
    );
  }

  const done = initial.length - queue.filter((k) => !requeued.has(k)).length;
  return (
    <div className="flash">
      <div className="flash-meta">
        <span>
          Card {Math.min(done + 1, initial.length)} of {initial.length}
          {requeued.size > 0 && ` (+${queue.filter((k) => requeued.has(k)).length} repeats)`}
        </span>
        <span>Day {current.day.number}</span>
      </div>
      <div className={`flash-card ${revealed ? 'revealed' : ''}`}>
        <div className="flash-front">
          <Markdown source={current.card.front} />
        </div>
        {revealed && (
          <div className="flash-back" aria-live="polite">
            <Markdown source={current.card.back} />
          </div>
        )}
      </div>
      {!revealed ? (
        <button type="button" className="btn btn-primary btn-lg flash-reveal" onClick={() => setRevealed(true)}>
          Say your answer out loud, then show it <kbd>Space</kbd>
        </button>
      ) : (
        <div className="flash-grades" role="group" aria-label="How well did you recall it?">
          <button type="button" className="btn grade-again" onClick={() => grade('again')}>
            Again <kbd>1</kbd>
          </button>
          <button type="button" className="btn grade-good" onClick={() => grade('good')}>
            Got it <kbd>2</kbd>
          </button>
          <button type="button" className="btn grade-easy" onClick={() => grade('easy')}>
            Easy <kbd>3</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
