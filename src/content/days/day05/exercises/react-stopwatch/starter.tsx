import { useState } from 'react';

/**
 * Stopwatch.
 *
 * - <p role="timer"> shows the elapsed time in seconds with one decimal: "0.0s", "1.5s", "12.3s".
 * - A button that reads "Start" while stopped and "Stop" while running.
 * - "Reset" stops the stopwatch and sets it back to "0.0s".
 * - Update at least every 100 ms. Stopping and resuming continues from where it was.
 * - Never more than one interval at a time; no interval left running after Stop or unmount.
 */
export default function Stopwatch() {
  // TODO: state, an interval, and its cleanup.
  const [elapsedMs] = useState(0);

  return (
    <div>
      <p role="timer" aria-label="Elapsed time">
        {(elapsedMs / 1000).toFixed(1)}s
      </p>
      <button type="button">Start</button> <button type="button">Reset</button>
    </div>
  );
}
