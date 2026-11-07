import { useCallback, useEffect, useMemo, useState } from 'react';
import { allFlashcards, getDay, type InterviewQuestionRef } from '../content';
import type { Block, Day, DrillBlock, ExerciseBlock, LabBlock, LessonBlock, QuizBlock, ReviewBlock } from '../content/types';
import { Markdown, extractHeadings } from '../components/Markdown';
import { QuizQuestion } from '../components/QuizQuestion';
import { FlashcardReviewer } from '../components/FlashcardReviewer';
import { DrillRunner } from '../components/DrillRunner';
import { Icon } from '../components/Icon';
import { Link, navigate } from '../lib/router';
import { blockMeta, RUNTIME_LABELS } from '../lib/meta';
import { clearQuiz, isBlockComplete, isCardDue, key, setBlockComplete, setLabChecks, setNote, useProgress, getProgress } from '../store/progress';
import { NotFound } from './NotFound';
import { plain } from '../lib/text';

function CompleteButton({ day, block, label = 'Mark complete' }: { day: Day; block: Block; label?: string }) {
  const done = useProgress((s) => isBlockComplete(s, day.number, block.id));
  const index = day.blocks.findIndex((b) => b.id === block.id);
  const next = day.blocks[index + 1];
  return (
    <div className="complete-row">
      {done ? (
        <>
          <span className="done-badge">
            <Icon name="check" size={16} /> Completed
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBlockComplete(day.number, block.id, false)}>
            Undo
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setBlockComplete(day.number, block.id);
            navigate(next ? `/day/${day.number}/${next.id}` : `/day/${day.number}`);
          }}
        >
          <Icon name="check" size={16} /> {label}
          {next ? ' & continue' : ''}
        </button>
      )}
    </div>
  );
}

function LessonView({ day, block }: { day: Day; block: LessonBlock }) {
  const headings = useMemo(() => extractHeadings(block.body), [block.body]);
  const inlineIds = useMemo(() => new Set([...block.body.matchAll(/\{\{quiz:([\w-]+)\}\}/g)].map((m) => m[1])), [block.body]);
  const checks = block.checks ?? [];
  const renderQuiz = useCallback(
    (id: string) => {
      const q = checks.find((c) => c.id === id);
      return q ? <QuizQuestion question={q} day={day.number} /> : null;
    },
    [checks, day.number],
  );
  const remaining = checks.filter((c) => !inlineIds.has(c.id));

  return (
    <div className="lesson-layout">
      {headings.length > 2 && (
        <aside className="toc" aria-label="On this page">
          <p className="toc-title">On this page</p>
          <ul>
            {headings.map((h) => (
              <li key={h.id} className={`toc-depth-${h.depth}`}>
                <button type="button" onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
      <article className="lesson-body">
        <Markdown source={block.body} renderQuiz={renderQuiz} />
        {remaining.length > 0 && (
          <section className="checks">
            <h2>Check yourself</h2>
            {remaining.map((q) => (
              <QuizQuestion key={q.id} question={q} day={day.number} />
            ))}
          </section>
        )}
        <CompleteButton day={day} block={block} />
      </article>
    </div>
  );
}

function QuizView({ day, block }: { day: Day; block: QuizBlock }) {
  const quiz = useProgress((s) => s.quiz);
  const answered = block.questions.filter((q) => quiz[key(day.number, q.id)]);
  const correct = answered.filter((q) => quiz[key(day.number, q.id)]?.correct);
  const wrong = answered.filter((q) => !quiz[key(day.number, q.id)]?.correct);
  const allAnswered = answered.length === block.questions.length;

  useEffect(() => {
    if (allAnswered && !isBlockComplete(getProgress(), day.number, block.id)) setBlockComplete(day.number, block.id);
  }, [allAnswered, day.number, block.id]);

  return (
    <div className="narrow-inner">
      {block.intro && <Markdown source={block.intro} />}
      <div className="quiz-score card" aria-live="polite">
        <span>
          <strong>{answered.length}</strong>/{block.questions.length} answered
        </span>
        <span>
          <strong>{correct.length}</strong> correct
        </span>
        {wrong.length > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => clearQuiz(day.number, wrong.map((q) => q.id))}>
            <Icon name="rotate" size={14} /> Retry the {wrong.length} I missed
          </button>
        )}
      </div>
      {block.questions.map((q, i) => (
        <QuizQuestion key={q.id} question={q} day={day.number} index={i} total={block.questions.length} />
      ))}
      <CompleteButton day={day} block={block} label="Finish quiz" />
    </div>
  );
}

function ExerciseSetView({ day, block }: { day: Day; block: ExerciseBlock }) {
  const exercises = useProgress((s) => s.exercises);
  return (
    <div className="narrow-inner">
      <Markdown source={block.intro} />
      <ul className="exercise-list">
        {block.exercises.map((ex) => {
          const p = exercises[key(day.number, ex.id)];
          return (
            <li key={ex.id}>
              <Link to={`/day/${day.number}/${block.id}/${ex.id}`} className={`exercise-item card ${p?.passed ? 'passed' : ''}`}>
                <span className={`exercise-status ${p?.passed ? 'passed' : p?.attempts ? 'attempted' : ''}`}>
                  {p?.passed ? <Icon name="check" size={16} /> : <Icon name="code" size={16} />}
                </span>
                <span className="exercise-item-body">
                  <span className="exercise-item-title">{ex.title}</span>
                  <span className="exercise-item-meta">
                    <span className={`pill diff-${ex.difficulty}`}>{ex.difficulty}</span>
                    <span className={`pill runtime-${ex.runtime}`}>{ex.mode === 'write-tests' ? 'Write the tests' : RUNTIME_LABELS[ex.runtime]}</span>
                    <span className="muted small">~{ex.estMinutes} min</span>
                    {p?.revealed && !p.passed && <span className="muted small">solution viewed</span>}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} />
              </Link>
            </li>
          );
        })}
      </ul>
      <CompleteButton day={day} block={block} />
    </div>
  );
}

function LabView({ day, block }: { day: Day; block: LabBlock }) {
  const checks = useProgress((s) => s.labChecks[key(day.number, block.id)]) ?? [];
  const note = useProgress((s) => s.notes[key(day.number, block.id)] ?? '');
  const allChecked = block.checklist.every((_, i) => checks[i]);
  return (
    <div className="narrow-inner">
      {block.track === 'agentic' && (
        <p className="lab-banner">
          <Icon name="bot" size={16} /> Claude Code lab · do this in your <strong>fe-gym</strong> practice repo with Claude Code running.
        </p>
      )}
      {block.track === 'build' && (
        <p className="lab-banner build">
          <Icon name="flask" size={16} /> Build lab · do this in your <strong>fe-gym</strong> practice repo. First attempt without AI.
        </p>
      )}
      <Markdown source={block.body} />
      <section className="card lab-checklist">
        <h2 className="h-small">Deliverables</h2>
        <ul>
          {block.checklist.map((item, i) => (
            <li key={item}>
              <label>
                <input
                  type="checkbox"
                  checked={!!checks[i]}
                  onChange={(e) => {
                    const next = block.checklist.map((_, j) => (j === i ? e.target.checked : !!checks[j]));
                    setLabChecks(day.number, block.id, next);
                    if (next.every(Boolean)) setBlockComplete(day.number, block.id);
                  }}
                />
                <span>
                  <Markdown source={item} inline />
                </span>
              </label>
            </li>
          ))}
        </ul>
        <label className="notes-label" htmlFor={`notes-${block.id}`}>
          Notes & reflections
        </label>
        <textarea
          id={`notes-${block.id}`}
          className="notes"
          rows={4}
          value={note}
          placeholder="What worked? What would you tell an interviewer about it?"
          onChange={(e) => setNote(key(day.number, block.id), e.target.value)}
        />
      </section>
      <CompleteButton day={day} block={block} label={allChecked ? 'Mark complete' : 'Mark complete anyway'} />
    </div>
  );
}

function DrillView({ day, block }: { day: Day; block: DrillBlock }) {
  const refs: InterviewQuestionRef[] = useMemo(() => {
    const ids = block.questionIds?.length ? block.questionIds : day.interviewQuestions.map((q) => q.id);
    return ids.map((id) => day.interviewQuestions.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q).map((question) => ({ day, question }));
  }, [block.questionIds, day]);
  const drills = useProgress((s) => s.drills);
  const graded = refs.filter((r) => drills[key(day.number, r.question.id)]).length;
  return (
    <div className="narrow-inner">
      {block.intro && <Markdown source={block.intro} />}
      <p className="muted small">
        {graded}/{refs.length} graded. Shaky and missed answers are added to your weak spots for mock interviews.
      </p>
      <DrillRunner questions={refs} onFinished={() => setBlockComplete(day.number, block.id)} />
      <CompleteButton day={day} block={block} />
    </div>
  );
}

function ReviewView({ day, block }: { day: Day; block: ReviewBlock }) {
  const [includeAll, setIncludeAll] = useState(false);
  // Snapshot the deck when the view opens so grading doesn't reshuffle it.
  const deck = useMemo(() => {
    const progress = getProgress();
    return allFlashcards.filter((c) => c.day.number < day.number && (includeAll || isCardDue(progress, key(c.day.number, c.card.id))));
  }, [day.number, includeAll]);
  return (
    <div className="narrow-inner">
      {block.intro ? (
        <Markdown source={block.intro} />
      ) : (
        <p>Warm up with flashcards from earlier days. Answer each one out loud before revealing it — retrieval is what makes it stick.</p>
      )}
      <label className="inline-toggle">
        <input type="checkbox" checked={includeAll} onChange={(e) => setIncludeAll(e.target.checked)} /> Include cards that aren't due yet
      </label>
      <FlashcardReviewer deck={deck} emptyMessage="No cards due from earlier days. Toggle “include cards that aren't due” for extra practice." onFinished={() => setBlockComplete(day.number, block.id)} />
      <CompleteButton day={day} block={block} />
    </div>
  );
}

export function BlockPage({ dayNumber, blockId }: { dayNumber: number; blockId: string }) {
  const day = getDay(dayNumber);
  const block = day?.blocks.find((b) => b.id === blockId);
  if (!day || !block) return <NotFound />;
  const meta = blockMeta(block);
  const index = day.blocks.indexOf(block);
  const prev = day.blocks[index - 1];
  const next = day.blocks[index + 1];

  return (
    <div className={`page ${block.kind === 'lesson' ? 'wide' : 'narrow'}`}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to={`/day/${day.number}`}>Day {day.number}</Link> <Icon name="chevronRight" size={14} /> <span>{plain(block.title)}</span>
      </nav>
      <header className="page-header block-header">
        <p className={`eyebrow tone-text-${meta.tone}`}>
          <Icon name={meta.icon} size={14} /> {meta.label} · {block.minutes} min
        </p>
        <h1 className="title-md">
          <Markdown source={block.title} inline />
        </h1>
      </header>
      {block.kind === 'lesson' && <LessonView day={day} block={block} />}
      {block.kind === 'quiz' && <QuizView day={day} block={block} />}
      {block.kind === 'exercise' && <ExerciseSetView day={day} block={block} />}
      {block.kind === 'lab' && <LabView day={day} block={block} />}
      {block.kind === 'drill' && <DrillView day={day} block={block} />}
      {block.kind === 'review' && <ReviewView day={day} block={block} />}
      <nav className="pager" aria-label="Block navigation">
        {prev ? (
          <Link to={`/day/${day.number}/${prev.id}`} className="pager-link">
            <Icon name="chevronLeft" size={16} />
            <span>
              <small>Previous</small>
              {plain(prev.title)}
            </span>
          </Link>
        ) : (
          <Link to={`/day/${day.number}`} className="pager-link">
            <Icon name="chevronLeft" size={16} />
            <span>
              <small>Back to</small>Day {day.number} plan
            </span>
          </Link>
        )}
        {next ? (
          <Link to={`/day/${day.number}/${next.id}`} className="pager-link pager-next">
            <span>
              <small>Next</small>
              {plain(next.title)}
            </span>
            <Icon name="chevronRight" size={16} />
          </Link>
        ) : (
          <Link to={`/day/${day.number}`} className="pager-link pager-next">
            <span>
              <small>Finish</small>Confidence check
            </span>
            <Icon name="chevronRight" size={16} />
          </Link>
        )}
      </nav>
    </div>
  );
}
