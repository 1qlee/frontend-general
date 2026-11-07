import { useEffect, useState } from 'react';

const TICK_MS = 100;

export function formatElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function Stopwatch() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);

  // The interval is an external system: start it when `running` becomes true,
  // stop it when `running` becomes false or the component unmounts.
  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const id = setInterval(() => {
      // Measure real time instead of assuming every tick is exactly TICK_MS
      // (intervals drift and are throttled in background tabs).
      const now = Date.now();
      const delta = now - last;
      last = now;
      setElapsedMs((ms) => ms + delta); // functional update: never reads a stale `elapsedMs`
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  function reset() {
    setRunning(false);
    setElapsedMs(0);
  }

  return (
    <div>
      <p role="timer" aria-label="Elapsed time" style={{ fontVariantNumeric: 'tabular-nums', fontSize: '2rem', margin: 0 }}>
        {formatElapsed(elapsedMs)}
      </p>
      <button type="button" onClick={() => setRunning((r) => !r)}>
        {running ? 'Stop' : 'Start'}
      </button>{' '}
      <button type="button" onClick={reset}>
        Reset
      </button>
    </div>
  );
}
