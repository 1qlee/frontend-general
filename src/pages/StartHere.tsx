import { useEffect } from 'react';
import { days } from '../content';
import { Icon } from '../components/Icon';
import { RatingInput } from '../components/RatingInput';
import { Link, useQueryParam } from '../lib/router';
import { ALL_SKILLS, SKILL_LABELS } from '../lib/meta';
import { setConfidence, useProgress } from '../store/progress';
import { dayMinutes } from '../content';

export function StartHere() {
  const baseline = useProgress((s) => s.confidence.baseline) ?? {};
  const focus = useQueryParam('focus');
  useEffect(() => {
    if (focus) document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus]);

  const totalMinutes = days.reduce((s, d) => s + dayMinutes(d), 0);

  return (
    <div className="page narrow">
      <header className="page-header">
        <p className="eyebrow">Start here</p>
        <h1>Your path to interview-ready</h1>
        <p className="lede">
          A hands-on course for experienced frontend developers who know more than their interviews show. It's React and TypeScript first, covers the general frontend
          topics interviewers always probe, gives you a framework for algorithm rounds, and trains you to use Claude Code like a senior engineer.
        </p>
      </header>

      <section className="card">
        <h2>How it works</h2>
        <div className="how-grid">
          <div>
            <Icon name="book" />
            <h3>Learn the model</h3>
            <p>Lessons teach precise mental models and the vocabulary interviewers listen for. Every runtime claim has a ▶ runnable snippet.</p>
          </div>
          <div>
            <Icon name="code" />
            <h3>Do the reps</h3>
            <p>Exercises run real tests in your browser: TypeScript utilities, React components with Testing Library, and type challenges checked by the TypeScript compiler.</p>
          </div>
          <div>
            <Icon name="mic" />
            <h3>Say it out loud</h3>
            <p>Speak-aloud drills with model answers. Grade yourself; shaky answers come back in mock interviews and on your dashboard.</p>
          </div>
          <div>
            <Icon name="bot" />
            <h3>Work with an agent</h3>
            <p>A Claude Code lab every day in your own practice repo: memory, planning, commands, subagents, hooks, MCP, CI — then a full agentic deep dive.</p>
          </div>
          <div>
            <Icon name="cards" />
            <h3>Remember it</h3>
            <p>Spaced-repetition flashcards warm up each day so day-1 material is still sharp on the last day.</p>
          </div>
          <div>
            <Icon name="target" />
            <h3>Simulate the loop</h3>
            <p>Timed mock rounds: rapid-fire concepts, coding, UI builds, system design and behavioural — with rubrics.</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Ground rules</h2>
        <ol className="rules">
          <li>
            <strong>No AI on first attempts</strong> of exercises and drills. Retrieval practice only works if you do the retrieving. Use Claude Code afterwards to review, and in the labs.
          </li>
          <li>
            <strong>Talk out loud</strong> while you code and when you answer drills. Silence is the most common interview failure mode.
          </li>
          <li>
            <strong>Timebox.</strong> Start the study timer (top bar). If an exercise takes 1.5× its estimate, use the hints, finish, and flag it to redo.
          </li>
          <li>
            <strong>Be honest</strong> when grading yourself — the app turns honesty into a targeted review list.
          </li>
        </ol>
      </section>

      <section className="card" id="baseline">
        <h2>Baseline self-assessment</h2>
        <p className="muted">Rate how confident you'd feel answering interview questions on each area today (1 = shaky, 5 = could teach it). You'll re-rate at the end of each day and see the change on your dashboard.</p>
        <ul className="baseline-list">
          {ALL_SKILLS.map((skill) => (
            <li key={skill}>
              <span>{SKILL_LABELS[skill]}</span>
              <RatingInput value={baseline[skill]} onChange={(v) => setConfidence('baseline', skill, v)} label={`Baseline confidence: ${SKILL_LABELS[skill]}`} />
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Syllabus</h2>
          <span className="muted">
            {days.length} days · {Math.round(totalMinutes / 60)} hours
          </span>
        </div>
        <ol className="syllabus">
          {days.map((day) => (
            <li key={day.number}>
              <details>
                <summary>
                  <span className="syllabus-num">Day {day.number}</span>
                  <span className="syllabus-title">{day.title}</span>
                  <span className="muted small">{Math.round(dayMinutes(day) / 6) / 10}h</span>
                </summary>
                <p>{day.tagline}</p>
                <ul>
                  {day.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <Link to={`/day/${day.number}`} className="btn btn-secondary btn-sm">
                  Open day {day.number}
                </Link>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <div className="page-footer-actions">
        <Link to="/day/1" className="btn btn-primary btn-lg">
          Begin Day 1 <Icon name="chevronRight" size={16} />
        </Link>
      </div>
    </div>
  );
}
