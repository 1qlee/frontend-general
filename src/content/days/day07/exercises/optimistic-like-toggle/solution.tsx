import { useOptimistic, useState, useTransition } from 'react';

export interface LikeButtonProps {
  initialLiked: boolean;
  initialCount: number;
  /** Persists the new value. Rejects if the server refuses. */
  onToggle: (liked: boolean) => Promise<void>;
}

export const ERROR_MESSAGE = "Couldn't save your like. Please try again.";

interface LikeState {
  liked: boolean;
  count: number;
}

export default function LikeButton({ initialLiked, initialCount, onToggle }: LikeButtonProps) {
  // The CONFIRMED state: only changes once the server has accepted a change.
  const [confirmed, setConfirmed] = useState<LikeState>({ liked: initialLiked, count: initialCount });
  // While an Action is pending, `optimistic` shows whatever we set; when the Action
  // finishes, it falls back to `confirmed` automatically. That fallback IS the rollback.
  const [optimistic, setOptimistic] = useOptimistic(confirmed);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleClick() {
    // Compute from what the user SEES, so a second click while pending toggles back.
    // Absolute values (not "+1") stay correct even if `confirmed` changes mid-flight.
    const next: LikeState = {
      liked: !optimistic.liked,
      count: optimistic.count + (optimistic.liked ? -1 : 1),
    };
    setError(null);
    startTransition(async () => {
      setOptimistic(next); // optimistic updates must happen inside a transition/Action
      try {
        await onToggle(next.liked);
        // Updates after an `await` are not part of the transition automatically (React 19
        // limitation), so wrap them again to commit together with the end of the Action.
        startTransition(() => setConfirmed(next));
      } catch {
        // Don't rethrow: an error thrown from an Action goes to the nearest error boundary.
        startTransition(() => setError(ERROR_MESSAGE));
      }
    });
  }

  return (
    <div>
      {/* The accessible name stays "Like"; the on/off state is conveyed by aria-pressed. */}
      <button type="button" aria-pressed={optimistic.liked} onClick={handleClick}>
        {optimistic.liked ? '♥' : '♡'} Like
      </button>
      <span>
        {optimistic.count} {optimistic.count === 1 ? 'like' : 'likes'}
      </span>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
