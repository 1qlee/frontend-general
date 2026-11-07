import { useEffect, useMemo, useState } from 'react';
import { allExercises, allInterviewQuestions, type ExerciseRef, type InterviewQuestionRef } from '../content';
import type { InterviewQuestionKind } from '../content/types';
import { DrillRunner } from '../components/DrillRunner';
import { ExerciseWorkbench } from '../components/ExerciseWorkbench';
import { Markdown } from '../components/Markdown';
import { Icon, type IconName } from '../components/Icon';
import { Link, navigate, useQueryParam } from '../lib/router';
import { formatDuration } from '../lib/studyTimer';
import { addMockSession, furthestDayTouched, getProgress, key, setNote, useProgress, type DrillGrade } from '../store/progress';

interface Mode {
  id: string;
  title: string;
  icon: IconName;
  minutes: string;
  description: string;
}

const MODES: Mode[] = [
  { id: 'rapid-fire', title: 'Rapid-fire concepts', icon: 'zap', minutes: '15–20 min', description: '8 random concept questions from the days you have unlocked. Answer out loud, reveal, grade yourself.' },
  { id: 'coding', title: 'Coding round', icon: 'code', minutes: '20–35 min', description: 'A random TypeScript or type-level problem under a countdown. Hints and solution unlock when time is up.' },
  { id: 'algorithms', title: 'Algorithms round', icon: 'target', minutes: '25–40 min', description: 'A LeetCode-style data structures & algorithms problem under a countdown. Narrate the framework: clarify, brute force, optimize, test.' },
  { id: 'ui-build', title: 'UI build round', icon: 'layers', minutes: '30–45 min', description: 'A React component with tests and a live preview, timed like a machine-coding round.' },
  { id: 'system-design', title: 'System design round', icon: 'compass', minutes: '45 min', description: 'A frontend system design prompt with a RADIO scratchpad, a reference outline and a rubric.' },
  { id: 'behavioral', title: 'Behavioural', icon: 'mic', minutes: '10–15 min', description: 'STAR-structured stories for the questions every loop includes.' },
  { id: 'agentic', title: 'AI-assisted development', icon: 'bot', minutes: '10–15 min', description: 'Questions about how you work with coding agents like Claude Code, safely and effectively.' },
];

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(kinds: InterviewQuestionKind[], count: number, opts: { weakOnly?: boolean; allDays?: boolean } = {}): InterviewQuestionRef[] {
  const progress = getProgress();
  const unlocked = opts.allDays ? Infinity : furthestDayTouched(progress);
  let pool = allInterviewQuestions.filter((q) => kinds.includes(q.question.kind) && q.day.number <= unlocked);
  if (opts.weakOnly) {
    pool = allInterviewQuestions.filter((q) => {
      const g = progress.drills[key(q.day.number, q.question.id)]?.grade;
      return g === 'shaky' || g === 'missed';
    });
  }
  return shuffle(pool).slice(0, count);
}

function MockHub() {
  const sessions = useProgress((s) => s.mockSessions);
  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Simulation</p>
        <h1>Mock interview</h1>
        <p className="lede">Practice the formats, not just the facts. Start a timer, talk out loud, and grade yourself honestly. The final day strings these together into a full loop.</p>
      </header>
      <div className="mode-grid">
        {MODES.map((m) => (
          <Link key={m.id} to={`/mock/${m.id}`} className="mode-card card">
            <Icon name={m.icon} size={22} />
            <h2>{m.title}</h2>
            <p>{m.description}</p>
            <span className="muted small">{m.minutes}</span>
          </Link>
        ))}
      </div>
      <section className="card">
        <h2>History</h2>
        {sessions.length === 0 ? (
          <p className="muted">No mock sessions yet.</p>
        ) : (
          <ul className="history">
            {sessions.slice(0, 15).map((s) => {
              const graded = s.items.filter((i) => i.grade);
              const nailed = graded.filter((i) => i.grade === 'nailed').length;
              return (
                <li key={s.id}>
                  <strong>{MODES.find((m) => m.id === s.mode)?.title ?? s.mode}</strong>
                  <span className="muted small">{new Date(s.startedAt).toLocaleString()}</span>
                  <span className="small">
                    {graded.length ? `${nailed}/${graded.length} nailed` : s.items.some((i) => i.passed) ? 'passed' : ''} · {formatDuration(s.durationSec)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function RapidFire({ kinds, title, intro }: { kinds: InterviewQuestionKind[]; title: string; intro: string }) {
  const weakOnly = useQueryParam('weak') === '1';
  const [allDays, setAllDays] = useState(false);
  const [round, setRound] = useState(0);
  const kindsKey = kinds.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => pickQuestions(kinds, 8, { weakOnly, allDays }), [kindsKey, weakOnly, allDays, round]);
  const [startedAt] = useState(() => Date.now());
  const [grades, setGrades] = useState<Record<string, DrillGrade>>({});
  const [finished, setFinished] = useState(false);

  const finish = () => {
    setFinished(true);
    addMockSession({
      id: `${Date.now()}`,
      mode: kinds.includes('agentic') && kinds.length === 1 ? 'agentic' : kinds.includes('behavioral') ? 'behavioral' : 'rapid-fire',
      startedAt,
      durationSec: Math.round((Date.now() - startedAt) / 1000),
      items: questions.map((q) => ({ ref: key(q.day.number, q.question.id), grade: grades[key(q.day.number, q.question.id)] })),
    });
  };

  return (
    <div className="page narrow">
      <MockHeader title={title} />
      <p className="muted">{intro}</p>
      {!weakOnly && (
        <label className="inline-toggle">
          <input type="checkbox" checked={allDays} onChange={(e) => setAllDays(e.target.checked)} /> Include days I haven't reached yet
        </label>
      )}
      {weakOnly && <p className="lab-banner">Weak-spots mode: only questions you graded shaky or missed.</p>}
      {finished ? (
        <div className="card flash-done">
          <Icon name="trophy" size={28} />
          <h2>Round complete</h2>
          <p>
            {Object.values(grades).filter((g) => g === 'nailed').length} nailed · {Object.values(grades).filter((g) => g === 'shaky').length} shaky ·{' '}
            {Object.values(grades).filter((g) => g === 'missed').length} missed
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setRound((r) => r + 1);
              setGrades({});
              setFinished(false);
            }}
          >
            Another round
          </button>
        </div>
      ) : (
        <DrillRunner
          key={round}
          questions={questions}
          onGraded={(ref, g) => setGrades((s) => ({ ...s, [key(ref.day.number, ref.question.id)]: g }))}
          onFinished={finish}
        />
      )}
    </div>
  );
}

function MockHeader({ title }: { title: string }) {
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/mock">Mock interview</Link> <Icon name="chevronRight" size={14} /> <span>{title}</span>
      </nav>
      <header className="page-header">
        <h1>{title}</h1>
      </header>
    </>
  );
}

function ExerciseRound({ filter, title, minutesFor }: { filter: (e: ExerciseRef) => boolean; title: string; minutesFor: (e: ExerciseRef) => number }) {
  const [round, setRound] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const pick = useMemo(() => {
    const progress = getProgress();
    const pool = allExercises.filter(filter);
    const unpassed = pool.filter((e) => !progress.exercises[key(e.day.number, e.exercise.id)]?.passed);
    return shuffle(unpassed.length ? unpassed : pool)[0];
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pick) return <p className="empty-state">No exercises available for this round yet.</p>;
  return (
    <div className="page full">
      <MockHeader title={title} />
      <p className="muted">
        From Day {pick.day.number}. Clarify out loud, state your approach before coding, narrate as you go, and test edge cases. Hints and the solution unlock when the timer runs out.
      </p>
      <ExerciseWorkbench
        key={`${pick.day.number}-${pick.exercise.id}-${round}`}
        day={pick.day.number}
        exercise={pick.exercise}
        mockMinutes={minutesFor(pick)}
        onPassed={() =>
          addMockSession({
            id: `${Date.now()}`,
            mode: title.startsWith('UI') ? 'ui-build' : title.startsWith('Algorithms') ? 'algorithms' : 'coding',
            startedAt,
            durationSec: Math.round((Date.now() - startedAt) / 1000),
            items: [{ ref: key(pick.day.number, pick.exercise.id), passed: true }],
          })
        }
      />
      <div className="page-footer-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setRound((r) => r + 1);
            setStartedAt(Date.now());
          }}
        >
          <Icon name="repeat" size={16} /> Different problem
        </button>
      </div>
    </div>
  );
}

const RADIO = [
  { id: 'requirements', title: 'Requirements', hint: 'Functional & non-functional: users, scale, devices, performance, a11y, i18n, offline, SEO. Confirm scope.' },
  { id: 'architecture', title: 'Architecture', hint: 'Component tree, client/server boundary, rendering strategy, data flow.' },
  { id: 'data', title: 'Data model', hint: 'Client state vs server state, entities, normalization, where each piece lives.' },
  { id: 'interface', title: 'Interface (API)', hint: 'Component props/events and the server API: endpoints, pagination, real-time.' },
  { id: 'optimizations', title: 'Optimizations & deep dives', hint: 'Performance, UX states, accessibility, security, error handling, testing.' },
];

const RUBRIC = [
  'Clarified requirements and scope before designing',
  'Clear high-level architecture with a component breakdown',
  'Sound data model and state ownership',
  'Well-defined API/interfaces (incl. pagination/real-time choices)',
  'Covered performance, accessibility and failure modes',
  'Stated trade-offs explicitly and managed time well',
];

function SystemDesignRound() {
  const [round, setRound] = useState(0);
  const question = useMemo(() => pickQuestions(['system-design', 'ui-build'], 1, { allDays: true })[0], [round]);
  const [seconds, setSeconds] = useState(45 * 60);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({});
  const notes = useProgress((s) => s.notes);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (revealed) return;
    const id = window.setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [revealed, round]);

  if (!question) return <p className="empty-state">No system design questions available yet.</p>;
  const noteKey = (section: string) => `mock-sd:${question.day.number}:${question.question.id}:${section}`;

  return (
    <div className="page narrow">
      <MockHeader title="System design round" />
      <div className="card sd-prompt">
        <div className="drill-head">
          <span className="pill">Day {question.day.number}</span>
          <span className={`drill-timer ${seconds < 0 ? 'over' : ''}`}>
            <Icon name="clock" size={14} /> {seconds < 0 ? '+' : ''}
            {formatDuration(Math.abs(seconds), true)}
          </span>
        </div>
        <Markdown source={question.question.question} />
        <p className="muted small">Suggested pacing: requirements 5–8 min · architecture 10 · data model 5–8 · interface 5–8 · optimizations 10+. Talk while you write.</p>
      </div>
      {RADIO.map((section) => (
        <div key={section.id} className="card radio-section">
          <label htmlFor={`sd-${section.id}`}>
            <strong>{section.title}</strong> <span className="muted small">{section.hint}</span>
          </label>
          <textarea id={`sd-${section.id}`} className="notes" rows={4} value={notes[noteKey(section.id)] ?? ''} onChange={(e) => setNote(noteKey(section.id), e.target.value)} />
        </div>
      ))}
      {!revealed ? (
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setRevealed(true)}>
          <Icon name="eye" size={16} /> I'm done — show the reference outline
        </button>
      ) : (
        <>
          <div className="card">
            <h2>Reference outline</h2>
            <Markdown source={question.question.answer} />
            {question.question.followUps?.length ? (
              <>
                <h3 className="h-small">Follow-ups to prepare for</h3>
                <ul>
                  {question.question.followUps.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div className="card">
            <h2>Score yourself</h2>
            <ul className="rubric">
              {RUBRIC.map((item, i) => (
                <li key={item}>
                  <span>{item}</span>
                  <div className="segmented small" role="radiogroup" aria-label={item}>
                    {['Missed', 'Partial', 'Good', 'Strong'].map((label, v) => (
                      <button key={label} type="button" role="radio" aria-checked={scores[i] === v} className={scores[i] === v ? 'active' : ''} onClick={() => setScores((s) => ({ ...s, [i]: v }))}>
                        {label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const total = Object.values(scores).reduce((a, b) => a + b, 0);
                const grade: DrillGrade = total >= RUBRIC.length * 2 ? 'nailed' : total >= RUBRIC.length ? 'shaky' : 'missed';
                addMockSession({
                  id: `${Date.now()}`,
                  mode: 'system-design',
                  startedAt,
                  durationSec: Math.round((Date.now() - startedAt) / 1000),
                  items: [{ ref: key(question.day.number, question.question.id), grade }],
                });
                navigate('/mock');
              }}
            >
              Save session
            </button>{' '}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setRound((r) => r + 1);
                setRevealed(false);
                setSeconds(45 * 60);
                setScores({});
              }}
            >
              Another prompt
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function MockInterview({ mode }: { mode?: string }) {
  if (!mode) return <MockHub />;
  switch (mode) {
    case 'rapid-fire':
      return (
        <RapidFire
          kinds={['concept', 'debugging', 'agentic']}
          title="Rapid-fire concepts"
          intro="One question at a time. Answer out loud in about two minutes: one-sentence answer, then detail, then a trade-off or example. Then reveal and grade."
        />
      );
    case 'agentic':
      return (
        <RapidFire
          kinds={['agentic']}
          title="AI-assisted development"
          intro="Interviewers increasingly ask how you use AI tools. Answer with concrete workflows, guardrails, and how you verify output."
        />
      );
    case 'behavioral':
      return (
        <RapidFire
          kinds={['behavioral']}
          title="Behavioural"
          intro="Use STAR: Situation (1–2 sentences), Task, Action (most of your time — what *you* did), Result (numbers if you have them) + what you learned. Aim for 2–3 minutes."
        />
      );
    case 'coding':
      return <ExerciseRound title="Coding round" filter={(e) => e.exercise.runtime !== 'dom' && e.exercise.difficulty !== 'warm-up'} minutesFor={(e) => Math.max(15, e.exercise.estMinutes + 5)} />;
    case 'algorithms':
      return <ExerciseRound title="Algorithms round" filter={(e) => e.exercise.tags.includes('dsa') && e.exercise.difficulty !== 'warm-up'} minutesFor={(e) => Math.max(20, e.exercise.estMinutes + 10)} />;
    case 'ui-build':
      return <ExerciseRound title="UI build round" filter={(e) => e.exercise.runtime === 'dom' && e.exercise.mode !== 'write-tests'} minutesFor={(e) => Math.max(25, e.exercise.estMinutes + 10)} />;
    case 'system-design':
      return <SystemDesignRound />;
    default:
      return <MockHub />;
  }
}
