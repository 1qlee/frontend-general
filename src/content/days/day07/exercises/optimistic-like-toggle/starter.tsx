import { useState } from 'react';

export interface LikeButtonProps {
  initialLiked: boolean;
  initialCount: number;
  /** Persists the new value. Rejects if the server refuses. */
  onToggle: (liked: boolean) => Promise<void>;
}

export const ERROR_MESSAGE = "Couldn't save your like. Please try again.";

/**
 * Pessimistic version: the UI only changes after the server answers, so every click
 * feels slow. Make it OPTIMISTIC:
 *
 * - On click, immediately show the new pressed state and count (±1) and call onToggle(next).
 * - On success, keep it.
 * - On failure, roll back to the last confirmed state and show ERROR_MESSAGE in a role="alert".
 * - Clear the error when the user tries again.
 *
 * Use useOptimistic + a transition (React 19) or manage the optimistic state yourself.
 */
export default function LikeButton({ initialLiked, initialCount, onToggle }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  async function handleClick() {
    const next = !liked;
    try {
      await onToggle(next);
      setLiked(next);
      setCount((c) => c + (next ? 1 : -1));
    } catch {
      // TODO: tell the user
    }
  }

  return (
    <div>
      {/* The accessible name stays "Like"; the on/off state is conveyed by aria-pressed. */}
      <button type="button" aria-pressed={liked} onClick={handleClick}>
        {liked ? '♥' : '♡'} Like
      </button>
      <span>
        {count} {count === 1 ? 'like' : 'likes'}
      </span>
    </div>
  );
}
