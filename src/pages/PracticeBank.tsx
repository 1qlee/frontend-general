import { useMemo, useState } from 'react';
import { allExercises } from '../content';
import type { ExerciseRuntime } from '../content/types';
import { Icon } from '../components/Icon';
import { Link } from '../lib/router';
import { RUNTIME_LABELS } from '../lib/meta';
import { key, useProgress } from '../store/progress';

export function PracticeBank() {
  const progress = useProgress((s) => s.exercises);
  const [runtime, setRuntime] = useState<ExerciseRuntime | 'all' | 'write-tests'>('all');
  const [status, setStatus] = useState<'all' | 'todo' | 'passed'>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return allExercises.filter(({ day, exercise }) => {
      const p = progress[key(day.number, exercise.id)];
      if (runtime === 'write-tests' ? exercise.mode !== 'write-tests' : runtime !== 'all' && exercise.runtime !== runtime) return false;
      if (status === 'passed' && !p?.passed) return false;
      if (status === 'todo' && p?.passed) return false;
      if (q && !`${exercise.title} ${exercise.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [progress, runtime, status, query]);

  const passed = allExercises.filter(({ day, exercise }) => progress[key(day.number, exercise.id)]?.passed).length;

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">
          {passed}/{allExercises.length} passed
        </p>
        <h1>Practice bank</h1>
        <p className="lede">Every exercise in the course. Re-do the ones you needed hints for until you can write them cold in under the estimated time.</p>
      </header>
      <div className="card filters">
        <label className="search-field">
          <Icon name="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by title or tag (e.g. debounce, hooks, a11y)" aria-label="Filter exercises" />
        </label>
        <div className="segmented" role="radiogroup" aria-label="Type">
          {(['all', 'logic', 'dom', 'types', 'write-tests'] as const).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={runtime === r} className={runtime === r ? 'active' : ''} onClick={() => setRuntime(r)}>
              {r === 'all' ? 'All' : r === 'write-tests' ? 'Write tests' : RUNTIME_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="segmented" role="radiogroup" aria-label="Status">
          {(['all', 'todo', 'passed'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={status === s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
              {s === 'all' ? 'Any status' : s === 'todo' ? 'To do' : 'Passed'}
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap card">
        <table className="practice-table">
          <thead>
            <tr>
              <th scope="col">Exercise</th>
              <th scope="col">Day</th>
              <th scope="col">Type</th>
              <th scope="col">Level</th>
              <th scope="col">Time</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ day, block, exercise }) => {
              const p = progress[key(day.number, exercise.id)];
              return (
                <tr key={`${day.number}-${exercise.id}`}>
                  <td>
                    <Link to={`/day/${day.number}/${block.id}/${exercise.id}`}>{exercise.title}</Link>
                    <div className="tag-row">
                      {exercise.tags.slice(0, 4).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{day.number}</td>
                  <td>{exercise.mode === 'write-tests' ? 'Write tests' : RUNTIME_LABELS[exercise.runtime]}</td>
                  <td>
                    <span className={`pill diff-${exercise.difficulty}`}>{exercise.difficulty}</span>
                  </td>
                  <td>{exercise.estMinutes}m</td>
                  <td>{p?.passed ? <span className="done-badge"><Icon name="check" size={14} /> Passed</span> : p?.attempts ? <span className="muted small">Attempted</span> : <span className="muted small">—</span>}</td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No exercises match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
