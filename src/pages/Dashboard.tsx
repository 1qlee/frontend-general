import { allExercises, allFlashcards, allInterviewQuestions, allQuizQuestions, days } from '../content';
import type { SkillArea } from '../content/types';
import { Icon } from '../components/Icon';
import { ProgressBar, ProgressRing } from '../components/ProgressRing';
import { Link } from '../lib/router';
import { ALL_SKILLS, SKILL_LABELS, blockMeta } from '../lib/meta';
import { formatDuration } from '../lib/studyTimer';
import { plain } from '../lib/text';
import { currentDayNumber, dayCompletion, furthestDayTouched, isBlockComplete, isCardDue, key, toDateKey, useProgress } from '../store/progress';

function latestConfidence(confidence: Record<string, Partial<Record<SkillArea, number>>>, skill: SkillArea): number | undefined {
  const scopes = Object.keys(confidence)
    .filter((k) => k.startsWith('day-'))
    .sort((a, b) => Number(b.slice(4)) - Number(a.slice(4)));
  for (const scope of scopes) {
    const v = confidence[scope]?.[skill];
    if (v !== undefined) return v;
  }
  return undefined;
}

export function Dashboard() {
  const progress = useProgress();
  const currentNumber = currentDayNumber(progress, days);
  const current = days.find((d) => d.number === currentNumber) ?? days[0];
  const nextBlock = current?.blocks.find((b) => !isBlockComplete(progress, current.number, b.id));
  const hasStarted = Object.keys(progress.completed).length > 0;

  const totalBlocks = days.reduce((s, d) => s + d.blocks.length, 0);
  const doneBlocks = days.reduce((s, d) => s + dayCompletion(progress, d).done, 0);
  const exercisesPassed = allExercises.filter((e) => progress.exercises[key(e.day.number, e.exercise.id)]?.passed).length;
  const quizAnswered = allQuizQuestions.filter((q) => progress.quiz[key(q.day.number, q.question.id)]);
  const quizCorrect = quizAnswered.filter((q) => progress.quiz[key(q.day.number, q.question.id)]?.correct).length;
  const unlocked = furthestDayTouched(progress);
  const dueCards = allFlashcards.filter((c) => c.day.number <= unlocked && isCardDue(progress, key(c.day.number, c.card.id))).length;
  const totalStudy = Object.values(progress.studyLog).reduce((a, b) => a + b, 0);
  const today = progress.studyLog[toDateKey(new Date())] ?? 0;

  const weak = [
    ...allInterviewQuestions
      .filter((q) => {
        const g = progress.drills[key(q.day.number, q.question.id)]?.grade;
        return g === 'missed' || g === 'shaky';
      })
      .map((q) => ({
        label: q.question.question.replace(/[`*_]/g, '').slice(0, 110),
        detail: `Day ${q.day.number} · drill · ${progress.drills[key(q.day.number, q.question.id)]?.grade}`,
        to: `/day/${q.day.number}/${q.day.blocks.find((b) => b.kind === 'drill')?.id ?? ''}`,
      })),
    ...allQuizQuestions
      .filter((q) => progress.quiz[key(q.day.number, q.question.id)]?.correct === false)
      .map((q) => ({ label: q.question.prompt.replace(/[`*_]/g, '').slice(0, 110), detail: `Day ${q.day.number} · quiz`, to: `/day/${q.day.number}/${q.block.id}` })),
    ...allExercises
      .filter((e) => {
        const p = progress.exercises[key(e.day.number, e.exercise.id)];
        return p && p.attempts > 0 && !p.passed;
      })
      .map((e) => ({ label: plain(e.exercise.title), detail: `Day ${e.day.number} · exercise not passed yet`, to: `/day/${e.day.number}/${e.block.id}/${e.exercise.id}` })),
  ];

  const labs = days.flatMap((d) => d.blocks.filter((b) => b.kind === 'lab' && b.track === 'agentic').map((b) => ({ day: d, block: b })));
  const labsDone = labs.filter((l) => isBlockComplete(progress, l.day.number, l.block.id)).length;

  return (
    <div className="page dashboard">
      <section className="hero card">
        <div className="hero-text">
          <p className="eyebrow">
            Day {current.number} of {days.length} · Week {current.number <= 7 ? 1 : 2}
          </p>
          <h1>{current.title}</h1>
          <p className="lede">{current.tagline}</p>
          <div className="hero-actions">
            {nextBlock ? (
              <Link to={`/day/${current.number}/${nextBlock.id}`} className="btn btn-primary btn-lg">
                <Icon name="play" size={16} /> {hasStarted ? 'Continue' : 'Start'}: {plain(nextBlock.title)}
              </Link>
            ) : (
              <Link to={`/day/${current.number}`} className="btn btn-primary btn-lg">
                Review day {current.number}
              </Link>
            )}
            {!hasStarted && (
              <Link to="/start?focus=baseline" className="btn btn-secondary btn-lg">
                <Icon name="target" size={16} /> Set your baseline
              </Link>
            )}
          </div>
        </div>
        <div className="hero-ring">
          <ProgressRing value={totalBlocks ? doneBlocks / totalBlocks : 0} size={128} stroke={10} label={`Course ${Math.round((doneBlocks / Math.max(1, totalBlocks)) * 100)}% complete`}>
            <span className="hero-ring-value">{Math.round((doneBlocks / Math.max(1, totalBlocks)) * 100)}%</span>
          </ProgressRing>
          <small>course complete</small>
        </div>
      </section>

      <section className="stat-grid" aria-label="Your stats">
        <div className="stat card">
          <span className="stat-label">Blocks done</span>
          <span className="stat-value">
            {doneBlocks}
            <small>/{totalBlocks}</small>
          </span>
        </div>
        <div className="stat card">
          <span className="stat-label">Exercises passed</span>
          <span className="stat-value">
            {exercisesPassed}
            <small>/{allExercises.length}</small>
          </span>
        </div>
        <div className="stat card">
          <span className="stat-label">Quiz accuracy</span>
          <span className="stat-value">{quizAnswered.length ? `${Math.round((quizCorrect / quizAnswered.length) * 100)}%` : '—'}</span>
          <small className="stat-sub">{quizAnswered.length} answered</small>
        </div>
        <Link to="/flashcards" className="stat card stat-link">
          <span className="stat-label">Flashcards due</span>
          <span className="stat-value">{dueCards}</span>
          <small className="stat-sub">Review now →</small>
        </Link>
        <div className="stat card">
          <span className="stat-label">Study time</span>
          <span className="stat-value">{formatDuration(today)}</span>
          <small className="stat-sub">today · {formatDuration(totalStudy)} total</small>
        </div>
        <div className="stat card">
          <span className="stat-label">Claude Code labs</span>
          <span className="stat-value">
            {labsDone}
            <small>/{labs.length}</small>
          </span>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Your two weeks</h2>
          <span className="muted">≈4 hours per day</span>
        </div>
        <ol className="day-grid">
          {days.map((day) => {
            const c = dayCompletion(progress, day);
            const pct = c.minutesTotal ? c.minutesDone / c.minutesTotal : 0;
            return (
              <li key={day.number}>
                <Link to={`/day/${day.number}`} className={`day-tile ${day.number === current.number ? 'current' : ''} ${pct >= 1 ? 'done' : ''}`}>
                  <span className="day-tile-num">Day {day.number}</span>
                  <span className="day-tile-title">{day.title}</span>
                  <ProgressBar value={pct} label={`Day ${day.number} progress`} />
                  <span className="day-tile-kinds" aria-hidden="true">
                    {day.blocks.map((b) => (
                      <span key={b.id} className={`kind-dot tone-${blockMeta(b).tone} ${isBlockComplete(progress, day.number, b.id) ? 'filled' : ''}`} />
                    ))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="two-col">
        <section className="card">
          <div className="section-head">
            <h2>Confidence</h2>
            <Link to="/start?focus=baseline" className="muted small">
              Edit baseline
            </Link>
          </div>
          <p className="muted small">Baseline (outline) vs. your latest end-of-day rating (fill). Rate yourself at the bottom of each day.</p>
          <ul className="confidence-list">
            {ALL_SKILLS.map((skill) => {
              const base = progress.confidence.baseline?.[skill];
              const latest = latestConfidence(progress.confidence, skill);
              return (
                <li key={skill}>
                  <span className="confidence-label">{SKILL_LABELS[skill]}</span>
                  <span className="confidence-bar" aria-label={`${SKILL_LABELS[skill]}: baseline ${base ?? 'not set'}, latest ${latest ?? 'not set'} of 5`} role="img">
                    {base !== undefined && <span className="confidence-base" style={{ width: `${(base / 5) * 100}%` }} />}
                    {latest !== undefined && <span className="confidence-latest" style={{ width: `${(latest / 5) * 100}%` }} />}
                  </span>
                  <span className="confidence-num">{latest ?? base ?? '–'}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <div className="section-head">
            <h2>Weak spots</h2>
            {weak.length > 0 && (
              <Link to="/mock/rapid-fire?weak=1" className="btn btn-secondary btn-sm">
                <Icon name="target" size={14} /> Drill weak spots
              </Link>
            )}
          </div>
          {weak.length === 0 ? (
            <p className="muted">
              Nothing flagged yet. Questions you mark as <em>shaky</em> or <em>missed</em>, quiz questions you get wrong, and exercises you haven't passed will show up here.
            </p>
          ) : (
            <ul className="weak-list">
              {weak.slice(0, 10).map((w, i) => (
                <li key={i}>
                  <Link to={w.to}>
                    <span>{w.label}</span>
                    <small>{w.detail}</small>
                  </Link>
                </li>
              ))}
              {weak.length > 10 && <li className="muted small">…and {weak.length - 10} more</li>}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
