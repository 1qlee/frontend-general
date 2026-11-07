import { days, getDay, dayMinutes } from '../content';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressRing';
import { RatingInput } from '../components/RatingInput';
import { Markdown } from '../components/Markdown';
import { Link } from '../lib/router';
import { SKILL_LABELS, blockMeta, weekOf } from '../lib/meta';
import { dayCompletion, isBlockComplete, setConfidence, useProgress } from '../store/progress';
import { NotFound } from './NotFound';

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`;
}

export function DayPage({ dayNumber }: { dayNumber: number }) {
  const day = getDay(dayNumber);
  const progress = useProgress();
  if (!day) return <NotFound />;

  const completion = dayCompletion(progress, day);
  const ratings = progress.confidence[`day-${day.number}`] ?? {};
  const prev = days.find((d) => d.number === day.number - 1);
  const next = days.find((d) => d.number === day.number + 1);
  let elapsed = 0;

  return (
    <div className="page narrow">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Dashboard</Link> <Icon name="chevronRight" size={14} /> <span>Day {day.number}</span>
      </nav>
      <header className="page-header">
        <p className="eyebrow">
          Week {weekOf(day.number)} · Day {day.number} · {formatMinutes(dayMinutes(day))}
        </p>
        <h1>{day.title}</h1>
        <p className="lede">{day.tagline}</p>
      </header>

      <section className="card">
        <Markdown source={day.summary} />
        <h2 className="h-small">By the end of today you can…</h2>
        <ul className="objectives">
          {day.objectives.map((o) => (
            <li key={o}>
              <Icon name="check" size={16} /> {o}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Today's plan</h2>
          <span className="muted">
            {completion.done}/{completion.total} done · {formatMinutes(completion.minutesDone)} of {formatMinutes(completion.minutesTotal)}
          </span>
        </div>
        <ProgressBar value={completion.minutesTotal ? completion.minutesDone / completion.minutesTotal : 0} label="Day progress" />
        <ol className="agenda">
          {day.blocks.map((block) => {
            const meta = blockMeta(block);
            const done = isBlockComplete(progress, day.number, block.id);
            const start = elapsed;
            elapsed += block.minutes;
            const detail =
              block.kind === 'exercise'
                ? `${block.exercises.length} exercises`
                : block.kind === 'quiz'
                  ? `${block.questions.length} questions`
                  : block.kind === 'drill'
                    ? `${block.questionIds?.length || day.interviewQuestions.length} questions`
                    : block.kind === 'lab'
                      ? `${block.checklist.length} deliverables`
                      : block.kind === 'lesson' && block.checks?.length
                        ? `${block.checks.length} checks`
                        : '';
            return (
              <li key={block.id}>
                <Link to={`/day/${day.number}/${block.id}`} className={`agenda-item ${done ? 'done' : ''}`}>
                  <span className="agenda-time">{formatMinutes(start)}</span>
                  <span className={`agenda-icon tone-${meta.tone}`}>{done ? <Icon name="check" size={16} /> : <Icon name={meta.icon} size={16} />}</span>
                  <span className="agenda-body">
                    <span className="agenda-kind">
                      {meta.label} · {block.minutes} min{detail ? ` · ${detail}` : ''}
                    </span>
                    <span className="agenda-title title-md">
                      <Markdown source={block.title} inline />
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} className="agenda-chevron" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card">
        <h2>End-of-day confidence check</h2>
        <p className="muted">After finishing the day, rate how ready you'd feel if an interviewer asked about each area right now.</p>
        <ul className="baseline-list">
          {day.skills.map((skill) => (
            <li key={skill}>
              <span>{SKILL_LABELS[skill]}</span>
              <RatingInput value={ratings[skill]} onChange={(v) => setConfidence(`day-${day.number}`, skill, v)} label={`Confidence after day ${day.number}: ${SKILL_LABELS[skill]}`} />
            </li>
          ))}
        </ul>
      </section>

      <nav className="pager" aria-label="Day navigation">
        {prev ? (
          <Link to={`/day/${prev.number}`} className="pager-link">
            <Icon name="chevronLeft" size={16} />
            <span>
              <small>Day {prev.number}</small>
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/day/${next.number}`} className="pager-link pager-next">
            <span>
              <small>Day {next.number}</small>
              {next.title}
            </span>
            <Icon name="chevronRight" size={16} />
          </Link>
        )}
      </nav>
    </div>
  );
}
