import { useEffect, useState } from 'react';

export interface Speaker {
  id: string;
  name: string;
}

const TEAM: Speaker[] = [
  { id: 'ada', name: 'Ada' },
  { id: 'grace', name: 'Grace' },
  { id: 'linus', name: 'Linus' },
];

export default function StandupBoard({ team = TEAM }: { team?: Speaker[] }) {
  const [speakers, setSpeakers] = useState(team);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // FIX 1 (stale closure): the callback was created once, during the first render, so
    // `seconds` was always 0 and `seconds + 1` was always 1. A functional update reads the
    // latest queued state instead of the captured snapshot.
    const id = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    // FIX 2 (missing cleanup): stop the interval on unmount. StrictMode's dev-only
    // mount → unmount → mount exposed this as two intervals ("double speed").
    return () => clearInterval(id);
  }, []);

  function removeSpeaker(id: string) {
    setSpeakers((prev) => prev.filter((speaker) => speaker.id !== id));
  }

  return (
    <section>
      <p role="timer" aria-label="Meeting time">
        Meeting time: {seconds}s
      </p>
      <ul aria-label="Speakers">
        {speakers.map((speaker) => (
          // FIX 3 (index keys): the uncontrolled <input> keeps its DOM value, and React matched
          // rows by position, so removing row 0 handed Ada's input to Grace. A stable id key
          // keeps each row's DOM (and state) attached to the right speaker.
          <li key={speaker.id}>
            <strong>{speaker.name}</strong>{' '}
            <input aria-label={`Notes for ${speaker.name}`} placeholder="Notes…" />{' '}
            <button type="button" aria-label={`Done: ${speaker.name}`} onClick={() => removeSpeaker(speaker.id)}>
              ✓
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
