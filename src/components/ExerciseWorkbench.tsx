import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise } from '../content/types';
import type { ExerciseRunResult } from '../runner/exerciseRunner';
import type { Diagnostic } from '../runner/tsService';
import { compileForPreview, onTsStatus, runExerciseInBrowser, sandboxUrl, typecheckExercise, warmupCompiler } from '../runner/client';
import { key, saveExercise, useProgress } from '../store/progress';
import { RUNTIME_LABELS } from '../lib/meta';
import { formatDuration } from '../lib/studyTimer';
import { CodeEditor } from './CodeEditor';
import { ConsoleOutput } from './ConsoleOutput';
import { Markdown } from './Markdown';
import { Icon } from './Icon';

type LeftTab = 'prompt' | 'tests' | 'subject' | 'hints' | 'solution' | 'explanation';
type RightTab = 'results' | 'preview' | 'console';

interface Props {
  day: number;
  exercise: Exercise;
  /** Mock-interview mode: countdown from this many minutes and hide hints/solution until time is up. */
  mockMinutes?: number;
  onPassed?: () => void;
}

function useCountdown(totalSeconds: number | undefined, autoStart: boolean) {
  const [remaining, setRemaining] = useState(totalSeconds ?? 0);
  const [running, setRunning] = useState(autoStart && totalSeconds !== undefined);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return {
    remaining,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: (s: number) => {
      setRemaining(s);
      setRunning(false);
    },
  };
}

function ResultsPanel({ result, typeErrors, running }: { result: ExerciseRunResult | null; typeErrors: Diagnostic[] | null; running: boolean }) {
  if (running && !result) return <p className="muted pad">Running tests…</p>;
  if (!result) return <p className="muted pad">Press <strong>Run tests</strong> (Ctrl/⌘ + Enter) to check your solution.</p>;
  const passed = result.results.filter((r) => r.status === 'pass').length;
  const total = result.results.filter((r) => r.status !== 'skip').length;
  return (
    <div className="results">
      <div className={`results-banner ${result.passed ? 'ok' : 'fail'}`} role="status">
        {result.passed ? (
          <>
            <Icon name="check" size={18} /> All {total} checks passed. Read the explanation for the follow-up questions.
          </>
        ) : result.error && total === 0 ? (
          <>
            <Icon name="alert" size={18} /> Couldn't run the tests
          </>
        ) : (
          <>
            <Icon name="x" size={18} /> {passed} of {total} checks passing
          </>
        )}
      </div>
      {result.error && <pre className="results-error">{result.error}</pre>}
      <ul className="test-list">
        {result.results.map((r, i) => (
          <li key={i} className={`test test-${r.status}`}>
            <span className="test-icon" aria-hidden="true">
              {r.status === 'pass' ? '✓' : r.status === 'fail' ? '✕' : '○'}
            </span>
            <div>
              <span className="test-name">
                <span className="sr-only">{r.status === 'pass' ? 'Passed: ' : r.status === 'fail' ? 'Failed: ' : 'Skipped: '}</span>
                {r.name}
              </span>
              {r.error && <pre className="test-error">{r.error}</pre>}
            </div>
          </li>
        ))}
      </ul>
      {typeErrors && typeErrors.length > 0 && (
        <details className="type-errors">
          <summary>
            <Icon name="alert" size={14} /> TypeScript (strict) reports {typeErrors.length} issue{typeErrors.length === 1 ? '' : 's'} — tests still ran, but an interviewer would notice
          </summary>
          <ul>
            {typeErrors.map((d, i) => (
              <li key={i}>
                <code>line {d.line}</code> {d.message}
              </li>
            ))}
          </ul>
        </details>
      )}
      {typeErrors && typeErrors.length === 0 && result.passed && <p className="muted small pad-x">TypeScript strict mode: no type errors.</p>}
    </div>
  );
}

function PreviewPane({ code, version }: { code: string; version: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [src] = useState(() => sandboxUrl('preview'));
  const ready = useRef(false);

  const send = useCallback(async () => {
    const out = await compileForPreview(code);
    if (out.error) setError(out.error);
    else {
      setError(null);
      iframeRef.current?.contentWindow?.postMessage({ type: 'preview', modules: out.modules }, '*');
    }
  }, [code]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if ((event.data as { type?: string })?.type === 'sandbox-ready') {
        ready.current = true;
        void send();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [send]);

  useEffect(() => {
    if (ready.current) void send();
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="preview">
      {error && <pre className="results-error">{error}</pre>}
      <iframe ref={iframeRef} src={src} title="Live preview of your component" className="preview-frame" />
    </div>
  );
}

export function ExerciseWorkbench({ day, exercise, mockMinutes, onPassed }: Props) {
  const saved = useProgress((s) => s.exercises[key(day, exercise.id)]);
  const [code, setCode] = useState(() => saved?.code ?? exercise.starter);
  const [result, setResult] = useState<ExerciseRunResult | null>(null);
  const [typeErrors, setTypeErrors] = useState<Diagnostic[] | null>(null);
  const [running, setRunning] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>('prompt');
  const [rightTab, setRightTab] = useState<RightTab>('results');
  const [previewVersion, setPreviewVersion] = useState(0);
  const [tsStatus, setTsStatus] = useState('idle');
  const outputRef = useRef<HTMLDivElement>(null);
  const hintsShown = saved?.hintsUsed ?? 0;
  const revealed = !!saved?.revealed;
  const passed = !!saved?.passed;
  const isMock = mockMinutes !== undefined;
  const countdown = useCountdown(mockMinutes !== undefined ? mockMinutes * 60 : exercise.estMinutes * 60, isMock);
  const timeUp = isMock && countdown.remaining <= 0;
  const lang = exercise.runtime === 'dom' ? 'tsx' : 'ts';
  const writeTests = exercise.mode === 'write-tests';
  const hasPreview = exercise.runtime === 'dom' && !!exercise.preview && !writeTests;

  useEffect(() => {
    warmupCompiler();
    return onTsStatus(setTsStatus);
  }, []);

  // Reset local state when switching exercises.
  useEffect(() => {
    setCode(saved?.code ?? exercise.starter);
    setResult(null);
    setTypeErrors(null);
    setLeftTab('prompt');
    setRightTab('results');
  }, [exercise.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist code (debounced).
  useEffect(() => {
    if (code === (saved?.code ?? exercise.starter)) return;
    const id = window.setTimeout(() => saveExercise(day, exercise.id, { code }), 500);
    return () => window.clearTimeout(id);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    if (rightTab === 'console') setRightTab('results');
    try {
      const [res, types] = await Promise.all([
        runExerciseInBrowser(exercise, code),
        typecheckExercise(exercise, code).catch(() => null),
      ]);
      setResult(res);
      setTypeErrors(types);
      window.requestAnimationFrame(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
      saveExercise(day, exercise.id, {
        code,
        attempts: (saved?.attempts ?? 0) + 1,
        ...(res.passed && !passed ? { passed: true, passedAt: Date.now() } : {}),
      });
      if (res.passed) onPassed?.();
      if (hasPreview) setPreviewVersion((v) => v + 1);
    } catch (err) {
      setResult({ results: [], logs: [], passed: false, error: (err as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const resetCode = () => {
    if (window.confirm('Replace your code with the starter? Your current code will be lost.')) {
      setCode(exercise.starter);
      saveExercise(day, exercise.id, { code: exercise.starter });
    }
  };

  const revealSolution = () => {
    if (revealed || window.confirm('Reveal the reference solution? Try the hints first — struggling a bit is where the learning happens.')) {
      saveExercise(day, exercise.id, { revealed: true });
      setLeftTab('solution');
    }
  };

  const lockHelp = isMock && !timeUp;
  const tabs: { id: LeftTab; label: string; hidden?: boolean }[] = [
    { id: 'prompt', label: 'Problem' },
    { id: 'subject', label: 'Code under test', hidden: !writeTests },
    { id: 'tests', label: 'Tests', hidden: writeTests },
    { id: 'hints', label: `Hints${exercise.hints.length ? ` (${hintsShown}/${exercise.hints.length})` : ''}`, hidden: lockHelp },
    { id: 'solution', label: 'Solution', hidden: lockHelp },
    { id: 'explanation', label: 'Explanation', hidden: !(passed || revealed || timeUp) },
  ];

  return (
    <div className="workbench">
      <section className="wb-left card" aria-label="Problem">
        <div className="wb-title">
          <h1 className="title-md">
            <Markdown source={exercise.title} inline />
          </h1>
          <div className="wb-meta">
            <span className={`pill diff-${exercise.difficulty}`}>{exercise.difficulty}</span>
            <span className={`pill runtime-${exercise.runtime}`}>{writeTests ? 'Write the tests' : RUNTIME_LABELS[exercise.runtime]}</span>
            <span className="muted small">~{exercise.estMinutes} min</span>
            {passed && (
              <span className="done-badge">
                <Icon name="check" size={14} /> Passed
              </span>
            )}
          </div>
        </div>
        <div className="tabs" role="tablist" aria-label="Exercise sections">
          {tabs
            .filter((t) => !t.hidden)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={leftTab === t.id}
                aria-controls="wb-left-panel"
                className={`tab ${leftTab === t.id ? 'active' : ''}`}
                onClick={() => (t.id === 'solution' && !revealed ? revealSolution() : setLeftTab(t.id))}
              >
                {t.label}
              </button>
            ))}
        </div>
        <div className="wb-left-panel" id="wb-left-panel" role="tabpanel" aria-labelledby={`tab-${leftTab}`}>
          {leftTab === 'prompt' && (
            <>
              <Markdown source={exercise.prompt} />
              {writeTests && (
                <div className="callout callout-note">
                  <div className="callout-title">
                    <Icon name="info" size={16} /> How this exercise is checked
                  </div>
                  <div className="callout-body">
                    <p>
                      Your tests run against the correct implementation (they must all pass) and against {exercise.mutants?.length ?? 0} buggy versions (each must make at least one of your
                      tests fail). Import from <code>./subject</code>.
                    </p>
                  </div>
                </div>
              )}
              {exercise.runtime === 'types' && (
                <p className="muted small">
                  Checked by the TypeScript compiler (strict). Helpers <code>Equal</code>, <code>Expect</code> etc. come from <code>./type-utils</code>; see the Tests tab for the cases.
                </p>
              )}
            </>
          )}
          {leftTab === 'tests' && (
            <>
              <p className="muted small">The tests are the spec. Reading them is allowed — in an interview you'd ask these questions out loud.</p>
              <CodeEditor value={exercise.tests} language={lang} readOnly ariaLabel="Test file (read only)" />
            </>
          )}
          {leftTab === 'subject' && (
            <>
              <p className="muted small">
                The implementation you're testing (importable as <code>./subject</code>).
              </p>
              <CodeEditor value={exercise.subject ?? ''} language={lang} readOnly ariaLabel="Code under test (read only)" />
            </>
          )}
          {leftTab === 'hints' && (
            <div className="hints">
              {exercise.hints.slice(0, hintsShown).map((h, i) => (
                <div key={i} className="hint">
                  <span className="hint-num">Hint {i + 1}</span>
                  <Markdown source={h} />
                </div>
              ))}
              {hintsShown < exercise.hints.length ? (
                <button type="button" className="btn btn-secondary" onClick={() => saveExercise(day, exercise.id, { hintsUsed: hintsShown + 1 })}>
                  <Icon name="lightbulb" size={16} /> Show hint {hintsShown + 1}
                </button>
              ) : (
                <p className="muted small">That's all the hints. Still stuck? Look at the solution, then re-type it from memory tomorrow.</p>
              )}
            </div>
          )}
          {leftTab === 'solution' && revealed && (
            <>
              <p className="muted small">Read it, close it, and re-implement it yourself. Recognition isn't recall.</p>
              <CodeEditor value={exercise.solution} language={lang} readOnly ariaLabel="Reference solution (read only)" />
            </>
          )}
          {leftTab === 'explanation' && <Markdown source={exercise.explanation} />}
        </div>
      </section>

      <section className="wb-right" aria-label="Your code">
        <div className="wb-toolbar card">
          <button type="button" className="btn btn-primary" onClick={run} disabled={running}>
            <Icon name="play" size={16} /> {running ? 'Running…' : writeTests ? 'Run my tests' : 'Run tests'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetCode}>
            <Icon name="rotate" size={14} /> Reset
          </button>
          <span className="wb-status muted small">{tsStatus === 'loading' ? 'Loading TypeScript compiler…' : ''}</span>
          <div className={`countdown ${countdown.remaining < 0 ? 'over' : ''}`}>
            <Icon name="clock" size={14} />
            <span aria-label="Time remaining">
              {countdown.remaining < 0 ? '+' : ''}
              {formatDuration(Math.abs(countdown.remaining), true)}
            </span>
            {!isMock &&
              (countdown.running ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={countdown.pause}>
                  Pause
                </button>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={countdown.start}>
                  {countdown.remaining === exercise.estMinutes * 60 ? 'Start interview timer' : 'Resume'}
                </button>
              ))}
          </div>
        </div>
        <div className="wb-editor card">
          <CodeEditor value={code} onChange={setCode} language={lang} onRun={run} minHeight="320px" maxHeight="62vh" ariaLabel={writeTests ? 'Your test file' : 'Your solution'} />
        </div>
        <div className="wb-output card" ref={outputRef}>
          <div className="tabs" role="tablist" aria-label="Output">
            <button type="button" role="tab" aria-selected={rightTab === 'results'} className={`tab ${rightTab === 'results' ? 'active' : ''}`} onClick={() => setRightTab('results')}>
              Results
            </button>
            {hasPreview && (
              <button type="button" role="tab" aria-selected={rightTab === 'preview'} className={`tab ${rightTab === 'preview' ? 'active' : ''}`} onClick={() => setRightTab('preview')}>
                Preview
              </button>
            )}
            <button type="button" role="tab" aria-selected={rightTab === 'console'} className={`tab ${rightTab === 'console' ? 'active' : ''}`} onClick={() => setRightTab('console')}>
              Console{result?.logs.length ? ` (${result.logs.length})` : ''}
            </button>
          </div>
          <div role="tabpanel">
            {rightTab === 'results' && <ResultsPanel result={result} typeErrors={typeErrors} running={running} />}
            {rightTab === 'console' && <ConsoleOutput logs={result?.logs ?? []} empty="Console output from your code and tests appears here." />}
            {hasPreview && (
              <div hidden={rightTab !== 'preview'}>
                <PreviewPane code={code} version={previewVersion} />
                <div className="pad-x">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewVersion((v) => v + 1)}>
                    <Icon name="rotate" size={14} /> Refresh preview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
