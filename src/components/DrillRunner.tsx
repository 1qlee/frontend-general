import { useEffect, useState } from 'react';
import type { InterviewQuestionRef } from '../content';
import { gradeDrill, key, useProgress, type DrillGrade } from '../store/progress';
import { formatDuration } from '../lib/studyTimer';
import { Markdown } from './Markdown';
import { Icon } from './Icon';

const KIND_LABEL: Record<string, string> = {
  concept: 'Concept',
  'system-design': 'System design',
  'ui-build': 'UI build',
  behavioral: 'Behavioural',
  agentic: 'AI-assisted development',
  debugging: 'Debugging',
};

function useElapsed(resetKey: string) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    setSeconds(0);
    setRunning(true);
  }, [resetKey]);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return { seconds, running, stop: () => setRunning(false) };
}

interface Props {
  questions: InterviewQuestionRef[];
  onGraded?: (ref: InterviewQuestionRef, grade: DrillGrade) => void;
  onFinished?: () => void;
}

export function DrillRunner({ questions, onGraded, onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const drills = useProgress((s) => s.drills);
  const current = questions[index];
  const timer = useElapsed(current ? key(current.day.number, current.question.id) : 'none');

  if (!current) return <p className="empty-state">No questions here yet.</p>;
  const q = current.question;
  const target = (q.minutes ?? 2) * 60;
  const saved = drills[key(current.day.number, q.id)]?.grade;

  const grade = (g: DrillGrade) => {
    gradeDrill(current.day.number, q.id, g);
    onGraded?.(current, g);
    setRevealed(false);
    if (index < questions.length - 1) setIndex(index + 1);
    else onFinished?.();
  };

  return (
    <div className="drill">
      <ol className="drill-dots" aria-label="Questions">
        {questions.map((ref, i) => {
          const g = drills[key(ref.day.number, ref.question.id)]?.grade;
          return (
            <li key={ref.question.id + ref.day.number}>
              <button
                type="button"
                className={`drill-dot ${i === index ? 'active' : ''} ${g ?? ''}`}
                aria-label={`Question ${i + 1}${g ? ` (${g})` : ''}`}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => {
                  setIndex(i);
                  setRevealed(false);
                }}
              >
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="drill-card card">
        <div className="drill-head">
          <span className="pill">{KIND_LABEL[q.kind] ?? q.kind}</span>
          {q.level === 'senior' && <span className="pill pill-accent">Senior</span>}
          <span className={`drill-timer ${timer.seconds > target ? 'over' : ''}`} aria-live="off">
            <Icon name="clock" size={14} /> {formatDuration(timer.seconds, true)} / {formatDuration(target, true)}
          </span>
        </div>
        <div className="drill-question">
          <Markdown source={q.question} />
        </div>
        {!revealed ? (
          <div className="drill-actions">
            <p className="muted small">Answer out loud first. Aim for a one-sentence answer, then detail, then a trade-off or example.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setRevealed(true);
                timer.stop();
              }}
            >
              <Icon name="eye" size={16} /> Reveal model answer
            </button>
          </div>
        ) : (
          <>
            <div className="drill-answer">
              <h3 className="h-small">Model answer</h3>
              <Markdown source={q.answer} />
              {q.followUps && q.followUps.length > 0 && (
                <>
                  <h3 className="h-small">Likely follow-ups</h3>
                  <ul>
                    {q.followUps.map((f) => (
                      <li key={f}>
                        <Markdown source={f} inline />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="drill-grades" role="group" aria-label="Grade your answer">
              <span className="muted small">How did you do?</span>
              <button type="button" className={`btn grade-easy ${saved === 'nailed' ? 'selected' : ''}`} onClick={() => grade('nailed')}>
                Nailed it
              </button>
              <button type="button" className={`btn grade-good ${saved === 'shaky' ? 'selected' : ''}`} onClick={() => grade('shaky')}>
                Shaky
              </button>
              <button type="button" className={`btn grade-again ${saved === 'missed' ? 'selected' : ''}`} onClick={() => grade('missed')}>
                Missed it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
