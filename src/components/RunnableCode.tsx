import { useEffect, useState } from 'react';
import type { LogEntry } from '../runner/harness';
import { runSnippet, warmupCompiler } from '../runner/client';
import { CodeEditor } from './CodeEditor';
import { ConsoleOutput } from './ConsoleOutput';
import { Icon } from './Icon';

export function RunnableCode({ code: initial, compact }: { code: string; compact?: boolean }) {
  const [code, setCode] = useState(initial.replace(/\n$/, ''));
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [running, setRunning] = useState(false);

  // Load the TypeScript compiler in the background so the first Run is instant.
  useEffect(() => {
    const id = window.setTimeout(warmupCompiler, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const run = async () => {
    setRunning(true);
    const collected: LogEntry[] = [];
    setLogs([]);
    const result = await runSnippet(code, (entry) => {
      collected.push(entry);
      setLogs([...collected]);
    });
    if (result.error) collected.push({ level: 'error', text: result.error });
    if (result.timedOut) collected.push({ level: 'warn', text: 'Stopped waiting for pending timers after 5s.' });
    setLogs([...collected]);
    setRunning(false);
  };

  const changed = code !== initial.replace(/\n$/, '');

  return (
    <div className={`runnable ${compact ? 'runnable-compact' : ''}`}>
      <div className="runnable-bar">
        <span className="runnable-label">
          <Icon name="terminal" size={14} /> Runnable · edit me
        </span>
        <div className="runnable-actions">
          {changed && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCode(initial.replace(/\n$/, ''))}>
              <Icon name="rotate" size={14} /> Reset
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={run} disabled={running} aria-label="Run code (Ctrl+Enter)">
            <Icon name="play" size={14} /> {running ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>
      <CodeEditor value={code} onChange={setCode} language="ts" onRun={run} ariaLabel="Runnable code example" />
      {logs && <ConsoleOutput logs={logs} empty={running ? 'Running…' : 'No console output.'} />}
    </div>
  );
}
