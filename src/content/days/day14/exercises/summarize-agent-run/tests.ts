import { describe, it, expect } from 'vitest';
import { summarizeRun } from './solution';
import type { AgentEvent } from './solution';

// Small builders so each test reads like a transcript.
let seq = 0;
const use = (name: string, input: Record<string, unknown>, id = `t${++seq}`): AgentEvent => ({ type: 'tool_use', id, name, input });
const ok = (toolUseId: string): AgentEvent => ({ type: 'tool_result', toolUseId, isError: false });
const fail = (toolUseId: string): AgentEvent => ({ type: 'tool_result', toolUseId, isError: true });
const done = (costUsd: number, turns: number, isError = false): AgentEvent => ({ type: 'result', isError, costUsd, turns });
const bash = (command: string, id: string) => use('Bash', { command }, id);

describe('summarizeRun', () => {
  it('handles an empty log', () => {
    expect(summarizeRun([])).toEqual({
      toolCounts: {},
      filesEdited: [],
      errorCount: 0,
      testRuns: 0,
      lastTestRunPassed: null,
      costUsd: null,
      turns: null,
      completed: false,
    });
  });

  it('summarises a typical run: explore, edit, test, finish', () => {
    const events: AgentEvent[] = [
      { type: 'assistant_text', text: 'Let me look at the component first.' },
      use('Grep', { pattern: 'CommandPalette' }, 'a'), ok('a'),
      use('Read', { file_path: 'src/components/CommandPalette.tsx' }, 'b'), ok('b'),
      use('Edit', { file_path: 'src/components/CommandPalette.tsx' }, 'c'), ok('c'),
      use('Write', { file_path: 'src/components/CommandPalette.test.tsx' }, 'd'), ok('d'),
      bash('npm test -- --run', 'e'), ok('e'),
      { type: 'assistant_text', text: 'Done: tests pass.' },
      done(0.42, 7),
    ];
    expect(summarizeRun(events)).toEqual({
      toolCounts: { Grep: 1, Read: 1, Edit: 1, Write: 1, Bash: 1 },
      filesEdited: ['src/components/CommandPalette.tsx', 'src/components/CommandPalette.test.tsx'],
      errorCount: 0,
      testRuns: 1,
      lastTestRunPassed: true,
      costUsd: 0.42,
      turns: 7,
      completed: true,
    });
  });

  it('lists each edited file once, in first-edit order', () => {
    const events: AgentEvent[] = [
      use('Edit', { file_path: 'src/b.ts' }, 'x1'), ok('x1'),
      use('Edit', { file_path: 'src/a.ts' }, 'x2'), ok('x2'),
      use('Edit', { file_path: 'src/b.ts' }, 'x3'), ok('x3'),
    ];
    expect(summarizeRun(events).filesEdited).toEqual(['src/b.ts', 'src/a.ts']);
  });

  it('only counts edits that succeeded (failed or unanswered edits changed nothing)', () => {
    const events: AgentEvent[] = [
      use('Edit', { file_path: 'src/failed.ts' }, 'f1'), fail('f1'),
      use('Write', { file_path: 'src/no-result.ts' }, 'f2'), // run was cut off before the result
      use('Edit', { file_path: 'src/ok.ts' }, 'f3'), ok('f3'),
      use('Edit', { path: 'src/wrong-field.ts' }, 'f4'), ok('f4'), // no string file_path → ignored
    ];
    const summary = summarizeRun(events);
    expect(summary.filesEdited).toEqual(['src/ok.ts']);
    expect(summary.errorCount).toBe(1);
    expect(summary.toolCounts).toEqual({ Edit: 3, Write: 1 });
  });

  it('recognises test commands, including chained ones and script variants', () => {
    const events: AgentEvent[] = [
      bash('cd web && npm test', 'r1'), ok('r1'),
      bash('npx vitest run src/components', 'r2'), ok('r2'),
      bash('npm run test:unit -- --run', 'r3'), ok('r3'),
      bash('pnpm test | tee test.log', 'r4'), ok('r4'),
      bash('npx playwright test', 'r5'), ok('r5'),
    ];
    expect(summarizeRun(events).testRuns).toBe(5);
  });

  it('does not count commands that merely mention a test tool', () => {
    const events: AgentEvent[] = [
      bash('npm install -D vitest', 'n1'), ok('n1'),
      bash('echo "npm test"', 'n2'), ok('n2'),
      bash('npm run lint && npm run typecheck', 'n3'), ok('n3'),
      bash('cat vitest.config.ts', 'n4'), ok('n4'),
      bash('npm run testing-library-codemod', 'n5'), ok('n5'),
    ];
    const summary = summarizeRun(events);
    expect(summary.testRuns).toBe(0);
    expect(summary.lastTestRunPassed).toBeNull();
  });

  it('reports the outcome of the LAST test run', () => {
    const failThenPass: AgentEvent[] = [bash('npm test', 'p1'), fail('p1'), bash('npm test', 'p2'), ok('p2')];
    expect(summarizeRun(failThenPass).lastTestRunPassed).toBe(true);
    expect(summarizeRun(failThenPass).errorCount).toBe(1);

    const passThenFail: AgentEvent[] = [bash('npm test', 'q1'), ok('q1'), bash('npm test', 'q2'), fail('q2')];
    expect(summarizeRun(passThenFail).lastTestRunPassed).toBe(false);

    const noResult: AgentEvent[] = [bash('npm test', 's1'), ok('s1'), bash('npm test', 's2')];
    expect(summarizeRun(noResult).lastTestRunPassed).toBeNull();
  });

  it('takes cost and turns from the result event, and treats an error result as not completed', () => {
    const summary = summarizeRun([use('Read', { file_path: 'a.ts' }, 'z1'), ok('z1'), done(1.5, 30, true)]);
    expect(summary.costUsd).toBe(1.5);
    expect(summary.turns).toBe(30);
    expect(summary.completed).toBe(false);
  });

  it('reports null cost/turns and not completed when the run never finished', () => {
    const summary = summarizeRun([use('Read', { file_path: 'a.ts' }, 'y1'), ok('y1')]);
    expect(summary.costUsd).toBeNull();
    expect(summary.turns).toBeNull();
    expect(summary.completed).toBe(false);
  });
});
