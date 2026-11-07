import { describe, expect, it } from 'vitest';
import { runScript, runTestModules } from './harness';
import { nodeCompiler, nodeTsService } from './nodeEnv';
import { runExercise } from './exerciseRunner';
import type { Exercise } from '../content/types';

function compile(files: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(files).map(([name, src]) => [name.replace(/\.tsx?$/, ''), nodeTsService.transpile(src, name).code]),
  );
}

describe('harness', () => {
  it('runs passing and failing tests with useful messages', async () => {
    const modules = compile({
      'solution.ts': 'export const add = (a: number, b: number) => a + b;',
      'solution.test.ts': `
        import { describe, it, expect } from 'vitest';
        import { add } from './solution';
        describe('add', () => {
          it('adds', () => { expect(add(1, 2)).toBe(3); });
          it('fails', () => { expect(add(1, 2)).toEqual(4); });
          it('objects', () => { expect({ a: [1, { b: 2 }], c: undefined }).toEqual({ a: [1, { b: 2 }] }); });
          it.each([[1, 1, 2], [2, 3, 5]])('add(%i, %i) = %i', (a, b, sum) => { expect(add(a, b)).toBe(sum); });
        });`,
    });
    const summary = await runTestModules(modules, 'solution.test');
    expect(summary.error).toBeUndefined();
    expect(summary.results.map((r) => [r.name, r.status])).toEqual([
      ['add › adds', 'pass'],
      ['add › fails', 'fail'],
      ['add › objects', 'pass'],
      ['add › add(1, 1) = 2', 'pass'],
      ['add › add(2, 3) = 5', 'pass'],
    ]);
    expect(summary.results[1].error).toContain('Expected: 4');
  });

  it('supports fake timers injected into user code', async () => {
    const modules = compile({
      'solution.ts': `export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
        let t: ReturnType<typeof setTimeout> | undefined;
        return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
      }`,
      'solution.test.ts': `
        import { it, expect, vi } from 'vitest';
        import { debounce } from './solution';
        it('debounces', () => {
          vi.useFakeTimers();
          const spy = vi.fn();
          const d = debounce(spy, 100);
          d(1); d(2); vi.advanceTimersByTime(99);
          expect(spy).not.toHaveBeenCalled();
          vi.advanceTimersByTime(1);
          expect(spy).toHaveBeenCalledTimes(1);
          expect(spy).toHaveBeenCalledWith(2);
          expect(Date.now()).toBeGreaterThan(0);
        });
        it('async timers + promises', async () => {
          vi.useFakeTimers();
          const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
          const order: string[] = [];
          const p = (async () => { await sleep(50); order.push('a'); await sleep(50); order.push('b'); })();
          await vi.advanceTimersByTimeAsync(100);
          await p;
          expect(order).toEqual(['a', 'b']);
        });
        it('rejects', async () => {
          await expect(Promise.reject(new Error('boom'))).rejects.toThrow('boom');
          await expect(Promise.resolve(2)).resolves.toBe(2);
        });`,
    });
    const summary = await runTestModules(modules, 'solution.test');
    expect(summary.results.map((r) => r.status)).toEqual(['pass', 'pass', 'pass']);
  });

  it('reports a timeout for a never-resolving test', async () => {
    const modules = compile({
      'solution.test.ts': `import { it } from 'vitest'; it('hangs', () => new Promise(() => {}), 50);`,
    });
    const summary = await runTestModules(modules, 'solution.test');
    expect(summary.results[0].status).toBe('fail');
    expect(summary.results[0].error).toContain('timed out');
  });

  it('runs scripts with event-loop-accurate ordering', async () => {
    const lines: string[] = [];
    const code = nodeTsService.transpile(
      `console.log('1'); setTimeout(() => console.log('timeout'), 0); Promise.resolve().then(() => console.log('micro')); queueMicrotask(() => console.log('qm')); console.log('2'); const x: number = await Promise.resolve(5); console.log('awaited', x, { a: [1, 'two'] });`,
      'main.ts',
    ).code;
    const res = await runScript(code, { onLog: (e) => lines.push(e.text) });
    expect(res.error).toBeUndefined();
    expect(lines).toEqual(['1', '2', 'micro', 'qm', "awaited 5 { a: [1, 'two'] }".replace("'two'", '"two"'), 'timeout']);
  });
});

describe('type challenges', () => {
  const exercise: Exercise = {
    id: 'pick', title: 'Pick', runtime: 'types', difficulty: 'core', estMinutes: 5, prompt: '', hints: [], explanation: '', tags: [],
    starter: 'export type MyPick<T, K extends keyof T> = any;',
    solution: 'export type MyPick<T, K extends keyof T> = { [P in K]: T[P] };',
    tests: `import type { Equal, Expect } from './type-utils';
import type { MyPick } from './solution';
interface Todo { title: string; done: boolean }
// test: picks one key
type A = Expect<Equal<MyPick<Todo, 'title'>, { title: string }>>;
// test: rejects unknown keys
// @ts-expect-error
type B = MyPick<Todo, 'nope'>;
`,
  };
  it('passes the solution and fails the starter', async () => {
    const good = await runExercise(exercise, exercise.solution, nodeCompiler, async () => ({ results: [], durationMs: 0 }));
    expect(good.error).toBeUndefined();
    expect(good.results.map((r) => r.status)).toEqual(['pass', 'pass']);
    const bad = await runExercise(exercise, exercise.starter, nodeCompiler, async () => ({ results: [], durationMs: 0 }));
    expect(bad.passed).toBe(false);
    expect(bad.results[0].status).toBe('fail');
  });
  it('type-checks React code', async () => {
    const diags = await nodeTsService.typecheck({
      'solution.tsx': `import { useState } from 'react';
export default function Counter({ start }: { start: number }) {
  const [n, setN] = useState(start);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
const bad: number = 'x';`,
    });
    expect(diags.map((d) => d.message)).toEqual(["Type 'string' is not assignable to type 'number'."]);
  });
});
