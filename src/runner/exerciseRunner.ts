/**
 * Environment-agnostic orchestration for running an exercise: transpile with
 * the TS service, then hand the CommonJS modules to an executor (Web Worker,
 * sandbox iframe, or Node) and interpret the results for each exercise mode.
 */
import type { Exercise } from '../content/types';
import type { LogEntry, ModuleMap, RunSummary, TestResult } from './harness';
import { evaluateTypeCases, TYPE_UTILS_SOURCE, type Diagnostic } from './tsService';

export interface Compiler {
  transpile(source: string, fileName: string): Promise<{ code: string; diagnostics: Diagnostic[] }> | { code: string; diagnostics: Diagnostic[] };
  typecheck(files: Record<string, string>): Promise<Diagnostic[]>;
}

export type Executor = (modules: ModuleMap, entry: string, onLog: (entry: LogEntry) => void) => Promise<RunSummary>;

export interface ExerciseRunResult {
  results: TestResult[];
  /** Fatal problem: syntax error, crash while loading, timeout, … */
  error?: string;
  logs: LogEntry[];
  passed: boolean;
}

export function sourceExt(exercise: Pick<Exercise, 'runtime'>): 'ts' | 'tsx' {
  return exercise.runtime === 'dom' ? 'tsx' : 'ts';
}

function formatDiagnostics(diags: Diagnostic[], label: string): string {
  return `${label}\n${diags.map((d) => `  ${d.file ? `${d.file}:${d.line}:${d.column} ` : ''}${d.message}`).join('\n')}`;
}

async function compileAll(compiler: Compiler, files: Record<string, string>): Promise<{ modules: ModuleMap; error?: string }> {
  const modules: ModuleMap = {};
  for (const [name, source] of Object.entries(files)) {
    const out = await compiler.transpile(source, name);
    if (out.diagnostics.length) {
      return { modules, error: formatDiagnostics(out.diagnostics, `Syntax error in ${name}:`) };
    }
    modules[name.replace(/\.(tsx?|jsx?)$/, '')] = out.code;
  }
  return { modules };
}

const allPass = (results: TestResult[]) => results.length > 0 && results.every((r) => r.status === 'pass');

/**
 * @param userCode what the learner wrote (solution for implement mode, test file for write-tests mode).
 */
export async function runExercise(exercise: Exercise, userCode: string, compiler: Compiler, execute: Executor): Promise<ExerciseRunResult> {
  const logs: LogEntry[] = [];
  const onLog = (entry: LogEntry) => {
    if (logs.length < 500) logs.push(entry);
  };
  const ext = sourceExt(exercise);

  // ---- type challenges ------------------------------------------------------
  if (exercise.runtime === 'types') {
    const diagnostics = await compiler.typecheck({
      'solution.ts': userCode,
      'solution.test.ts': exercise.tests,
      'type-utils.ts': TYPE_UTILS_SOURCE,
    });
    const outcome = evaluateTypeCases(exercise.tests, diagnostics);
    let error: string | undefined;
    if (outcome.solutionErrors.length) error = formatDiagnostics(outcome.solutionErrors, 'Type errors in your code:');
    else if (outcome.setupErrors.length) error = formatDiagnostics(outcome.setupErrors, 'Errors in the test setup (outside any case):');
    return { results: outcome.results, error, logs, passed: !error && allPass(outcome.results) };
  }

  // ---- write-tests mode -----------------------------------------------------
  if (exercise.mode === 'write-tests') {
    const subject = exercise.subject ?? '';
    const base = await compileAll(compiler, { [`solution.test.${ext}`]: userCode, [`subject.${ext}`]: subject });
    if (base.error) return { results: [], error: base.error, logs, passed: false };
    const againstCorrect = await execute(base.modules, 'solution.test', onLog);
    if (againstCorrect.error) return { results: againstCorrect.results, error: againstCorrect.error, logs, passed: false };

    const results: TestResult[] = againstCorrect.results.map((r) => ({ ...r, name: `Correct implementation › ${r.name}` }));
    const correctPasses = allPass(againstCorrect.results);
    const mutants = exercise.mutants ?? [];
    for (let i = 0; i < mutants.length; i++) {
      const mutant = mutants[i];
      const compiled = await compileAll(compiler, { [`subject.${ext}`]: mutant.code });
      if (compiled.error) {
        results.push({ name: `Bug #${i + 1}`, status: 'fail', error: `Internal: mutant failed to compile.\n${compiled.error}`, durationMs: 0 });
        continue;
      }
      const run = await execute({ ...base.modules, ...compiled.modules }, 'solution.test', () => {});
      const caught = !!run.error || run.results.some((r) => r.status === 'fail');
      results.push(
        caught
          ? { name: `Catches bug #${i + 1}: ${mutant.description}`, status: 'pass', durationMs: run.durationMs }
          : {
              name: `Catches bug #${i + 1}`,
              status: 'fail',
              error: 'All of your tests still pass against a buggy implementation. Add a test for a behaviour you have not covered yet.',
              durationMs: run.durationMs,
            },
      );
    }
    return {
      results,
      logs,
      passed: correctPasses && results.every((r) => r.status === 'pass'),
      error: correctPasses ? undefined : 'Your tests must pass against the correct implementation first.',
    };
  }

  // ---- implement mode (logic + dom) ----------------------------------------
  const compiled = await compileAll(compiler, { [`solution.${ext}`]: userCode, [`solution.test.${ext}`]: exercise.tests });
  if (compiled.error) return { results: [], error: compiled.error, logs, passed: false };
  const summary = await execute(compiled.modules, 'solution.test', onLog);
  return { results: summary.results, error: summary.error, logs, passed: !summary.error && allPass(summary.results) };
}
