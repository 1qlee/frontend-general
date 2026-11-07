import { getDay } from '../content';
import { ExerciseWorkbench } from '../components/ExerciseWorkbench';
import { Icon } from '../components/Icon';
import { Link } from '../lib/router';
import { key, useProgress } from '../store/progress';
import { NotFound } from './NotFound';
import { plain } from '../lib/text';

export function ExercisePage({ dayNumber, blockId, exerciseId }: { dayNumber: number; blockId: string; exerciseId: string }) {
  const day = getDay(dayNumber);
  const block = day?.blocks.find((b) => b.id === blockId);
  const exercises = useProgress((s) => s.exercises);
  if (!day || !block || block.kind !== 'exercise') return <NotFound />;
  const index = block.exercises.findIndex((e) => e.id === exerciseId);
  const exercise = block.exercises[index];
  if (!exercise) return <NotFound />;
  const prev = block.exercises[index - 1];
  const next = block.exercises[index + 1];

  return (
    <div className="page full">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to={`/day/${day.number}`}>Day {day.number}</Link> <Icon name="chevronRight" size={14} />
        <Link to={`/day/${day.number}/${block.id}`}>{plain(block.title)}</Link> <Icon name="chevronRight" size={14} />
        <span>
          {index + 1} of {block.exercises.length}
        </span>
        <span className="breadcrumb-steps" aria-hidden="true">
          {block.exercises.map((e) => (
            <Link key={e.id} to={`/day/${day.number}/${block.id}/${e.id}`} className={`step-dot ${e.id === exercise.id ? 'active' : ''} ${exercises[key(day.number, e.id)]?.passed ? 'passed' : ''}`} title={e.title} tabIndex={-1} />
          ))}
        </span>
      </nav>
      <ExerciseWorkbench key={`${day.number}:${exercise.id}`} day={day.number} exercise={exercise} />
      <nav className="pager" aria-label="Exercise navigation">
        {prev ? (
          <Link to={`/day/${day.number}/${block.id}/${prev.id}`} className="pager-link">
            <Icon name="chevronLeft" size={16} />
            <span>
              <small>Previous</small>
              {plain(prev.title)}
            </span>
          </Link>
        ) : (
          <Link to={`/day/${day.number}/${block.id}`} className="pager-link">
            <Icon name="chevronLeft" size={16} />
            <span>
              <small>Back to</small>
              {plain(block.title)}
            </span>
          </Link>
        )}
        {next ? (
          <Link to={`/day/${day.number}/${block.id}/${next.id}`} className="pager-link pager-next">
            <span>
              <small>Next exercise</small>
              {plain(next.title)}
            </span>
            <Icon name="chevronRight" size={16} />
          </Link>
        ) : (
          <Link to={`/day/${day.number}/${block.id}`} className="pager-link pager-next">
            <span>
              <small>Done?</small>
              Back to the exercise set
            </span>
            <Icon name="chevronRight" size={16} />
          </Link>
        )}
      </nav>
    </div>
  );
}
