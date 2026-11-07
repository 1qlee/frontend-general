/**
 * Main-thread API for compiling and running code:
 *  - a long-lived TypeScript worker (transpile + type-check, lazy-loads the compiler)
 *  - a fresh, terminable Web Worker per logic run (protects against infinite loops)
 *  - a hidden sandbox iframe per DOM/React test run
 */
import type { Exercise } from '../content/types';
import type { LogEntry, ModuleMap, RunSummary } from './harness';
import type { Diagnostic, TranspileResult } from './tsService';
import { runExercise, type Compiler, type ExerciseRunResult, type Executor } from './exerciseRunner';
import type { TsRequest } from './ts.worker';
import type { ExecRequest } from './exec.worker';

// ---------------------------------------------------------------------------
// TypeScript worker
// ---------------------------------------------------------------------------

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

let tsWorker: Worker | undefined;
let nextId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
type TsStatus = 'idle' | 'loading' | 'ready';
let tsStatus: TsStatus = 'idle';
const statusListeners = new Set<(s: TsStatus) => void>();

function setStatus(s: TsStatus) {
  tsStatus = s;
  statusListeners.forEach((l) => l(s));
}

export function onTsStatus(listener: (s: TsStatus) => void): () => void {
  statusListeners.add(listener);
  listener(tsStatus);
  return () => statusListeners.delete(listener);
}

function getTsWorker(): Worker {
  if (!tsWorker) {
    tsWorker = new Worker(new URL('./ts.worker.ts', import.meta.url), { type: 'module' });
    tsWorker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const { id, ok, result, error } = event.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (ok) entry.resolve(result);
      else entry.reject(new Error(error));
    };
    tsWorker.onerror = (event) => {
      for (const entry of pending.values()) entry.reject(new Error(event.message || 'TypeScript worker crashed'));
      pending.clear();
      tsWorker = undefined;
      setStatus('idle');
    };
  }
  return tsWorker;
}

function callTs<T>(request: DistributiveOmit<TsRequest, 'id'>): Promise<T> {
  const id = nextId++;
  const worker = getTsWorker();
  if (tsStatus === 'idle') setStatus('loading');
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: (v) => {
        setStatus('ready');
        resolve(v as T);
      },
      reject,
    });
    worker.postMessage({ ...request, id } as TsRequest);
  });
}

export const browserCompiler: Compiler = {
  transpile: (source, fileName) => callTs<TranspileResult>({ type: 'transpile', source, fileName }),
  typecheck: (files) => callTs<Diagnostic[]>({ type: 'typecheck', files }),
};

/** Start loading the compiler early (e.g. when an exercise page mounts). */
export function warmupCompiler(): void {
  void callTs({ type: 'transpile', source: '', fileName: 'warmup.ts' }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Logic executor (Web Worker per run)
// ---------------------------------------------------------------------------

function runInExecWorker<T>(request: ExecRequest, onLog: (e: LogEntry) => void, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(new URL('./exec.worker.ts', import.meta.url), { type: 'module' });
    const timer = window.setTimeout(() => {
      worker.terminate();
      reject(new Error(`Execution stopped after ${timeoutMs / 1000}s — is there an infinite loop or a promise that never settles?`));
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<{ type: 'log'; entry: LogEntry } | { type: 'done'; summary?: RunSummary; result?: unknown }>) => {
      const msg = event.data;
      if (msg.type === 'log') onLog(msg.entry);
      else {
        window.clearTimeout(timer);
        worker.terminate();
        resolve((msg.summary ?? msg.result) as T);
      }
    };
    worker.onerror = (event) => {
      window.clearTimeout(timer);
      worker.terminate();
      reject(new Error(event.message || 'Worker crashed'));
    };
    worker.postMessage(request);
  });
}

export const workerExecutor: Executor = async (modules, entry, onLog) => {
  try {
    return await runInExecWorker<RunSummary>({ type: 'tests', modules, entry }, onLog, 15_000);
  } catch (err) {
    return { results: [], error: (err as Error).message, durationMs: 0 };
  }
};

export interface ScriptRunResult {
  error?: string;
  timedOut?: boolean;
}

/** Transpile and run a TS/JS snippet, streaming console output. */
export async function runSnippet(source: string, onLog: (e: LogEntry) => void): Promise<ScriptRunResult> {
  const out = await browserCompiler.transpile(source, 'main.ts');
  if (out.diagnostics.length) {
    return { error: `Syntax error:\n${out.diagnostics.map((d) => `  line ${d.line}:${d.column} ${d.message}`).join('\n')}` };
  }
  try {
    return await runInExecWorker<ScriptRunResult>({ type: 'script', code: out.code, maxWaitMs: 5000 }, onLog, 10_000);
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// DOM executor (sandbox iframe per run)
// ---------------------------------------------------------------------------

export function sandboxUrl(mode: 'test' | 'preview'): string {
  const theme = document.documentElement.dataset.theme ?? '';
  return new URL(`sandbox.html?mode=${mode}&theme=${theme}`, document.baseURI).href;
}

export const sandboxExecutor: Executor = (modules: ModuleMap, entry: string, onLog) =>
  new Promise<RunSummary>((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.title = 'Test sandbox';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;visibility:hidden;';
    let settled = false;
    const finish = (summary: RunSummary) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
      resolve(summary);
    };
    const timer = window.setTimeout(
      () => finish({ results: [], error: 'Tests stopped after 30s — is there an infinite loop or a promise that never settles?', durationMs: 0 }),
      30_000,
    );
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data as { type: string; entry?: LogEntry; summary?: RunSummary };
      if (msg.type === 'sandbox-ready') iframe.contentWindow?.postMessage({ type: 'run-tests', modules, entry }, '*');
      else if (msg.type === 'log' && msg.entry) onLog(msg.entry);
      else if (msg.type === 'done' && msg.summary) finish(msg.summary);
    };
    window.addEventListener('message', onMessage);
    iframe.src = sandboxUrl('test');
    document.body.appendChild(iframe);
  });

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export function runExerciseInBrowser(exercise: Exercise, code: string): Promise<ExerciseRunResult> {
  return runExercise(exercise, code, browserCompiler, exercise.runtime === 'dom' ? sandboxExecutor : workerExecutor);
}

/** Non-blocking type-check of the learner's code for logic/dom exercises. */
export async function typecheckExercise(exercise: Exercise, code: string): Promise<Diagnostic[]> {
  if (exercise.runtime === 'types') return [];
  const ext = exercise.runtime === 'dom' ? 'tsx' : 'ts';
  if (exercise.mode === 'write-tests') return [];
  return browserCompiler.typecheck({ [`solution.${ext}`]: code });
}

/** Compile the learner's module for the live preview iframe. */
export async function compileForPreview(code: string): Promise<{ modules?: ModuleMap; error?: string }> {
  const out = await browserCompiler.transpile(code, 'solution.tsx');
  if (out.diagnostics.length) return { error: out.diagnostics.map((d) => `line ${d.line}: ${d.message}`).join('\n') };
  return { modules: { solution: out.code } };
}
