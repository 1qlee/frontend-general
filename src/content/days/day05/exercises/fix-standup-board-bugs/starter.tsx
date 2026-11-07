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

/**
 * Stand-up board: a meeting timer plus one row per speaker with a notes field.
 * QA reports:
 *  1. "The meeting timer gets stuck at 1s."
 *  2. "After I tick a speaker off, the notes I typed jump to the wrong person."
 *  3. "In development the timer sometimes runs at double speed, and the profiler shows the
 *      interval still firing after the board is closed."
 * Find and fix every bug. Keep the notes inputs uncontrolled.
 */
export default function StandupBoard({ team = TEAM }: { team?: Speaker[] }) {
  const [speakers, setSpeakers] = useState(team);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setInterval(() => {
      setSeconds(seconds + 1);
    }, 1000);
  }, []);

  function removeSpeaker(index: number) {
    setSpeakers(speakers.filter((_, i) => i !== index));
  }

  return (
    <section>
      <p role="timer" aria-label="Meeting time">
        Meeting time: {seconds}s
      </p>
      <ul aria-label="Speakers">
        {speakers.map((speaker, index) => (
          <li key={index}>
            <strong>{speaker.name}</strong>{' '}
            <input aria-label={`Notes for ${speaker.name}`} placeholder="Notes…" />{' '}
            <button type="button" aria-label={`Done: ${speaker.name}`} onClick={() => removeSpeaker(index)}>
              ✓
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
