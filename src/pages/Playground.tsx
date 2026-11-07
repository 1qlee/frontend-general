import { useEffect, useState } from 'react';
import type { LogEntry } from '../runner/harness';
import { runSnippet, warmupCompiler } from '../runner/client';
import { CodeEditor } from '../components/CodeEditor';
import { ConsoleOutput } from '../components/ConsoleOutput';
import { Icon } from '../components/Icon';
import { readString, writeString } from '../lib/storage';

const KEY = 'feg:playground';
const DEFAULT = `// A TypeScript scratchpad. Runs in a Web Worker (no DOM). Top-level await works.
// Ctrl/⌘ + Enter to run.

type Task = { id: number; ms: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

console.log('sync 1');
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('microtask'));
console.log('sync 2');

const tasks: Task[] = [{ id: 1, ms: 30 }, { id: 2, ms: 10 }];
const results = await Promise.all(tasks.map(async (t) => (await sleep(t.ms), t.id)));
console.log('Promise.all keeps input order:', results);
`;

export function Playground() {
  const [code, setCode] = useState(() => readString(KEY) ?? DEFAULT);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => warmupCompiler(), []);
  useEffect(() => {
    const id = window.setTimeout(() => writeString(KEY, code), 400);
    return () => window.clearTimeout(id);
  }, [code]);

  const run = async () => {
    setRunning(true);
    const collected: LogEntry[] = [];
    setLogs([]);
    const res = await runSnippet(code, (e) => {
      collected.push(e);
      setLogs([...collected]);
    });
    if (res.error) collected.push({ level: 'error', text: res.error });
    if (res.timedOut) collected.push({ level: 'warn', text: 'Stopped waiting for pending timers after 5s.' });
    setLogs([...collected]);
    setRunning(false);
  };

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Scratchpad</p>
        <h1>Playground</h1>
        <p className="lede">Test a hunch, predict the output of an event-loop puzzle, or warm up before an interview. Your code is saved in this browser.</p>
      </header>
      <div className="playground">
        <div className="card">
          <div className="wb-toolbar">
            <button type="button" className="btn btn-primary" onClick={run} disabled={running}>
              <Icon name="play" size={16} /> {running ? 'Running…' : 'Run'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.confirm('Reset the playground to the example?') && setCode(DEFAULT)}>
              <Icon name="rotate" size={14} /> Reset
            </button>
          </div>
          <CodeEditor value={code} onChange={setCode} onRun={run} minHeight="420px" ariaLabel="Playground code" />
        </div>
        <div className="card">
          <h2 className="h-small">Console</h2>
          <ConsoleOutput logs={logs} empty={running ? 'Running…' : 'Run your code to see output.'} />
        </div>
      </div>
    </div>
  );
}
