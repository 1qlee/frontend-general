// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { nodeCompiler } from './nodeEnv';
import { domExecutor } from './domEnv';
import { runExercise } from './exerciseRunner';
import type { Exercise } from '../content/types';

const counter: Exercise = {
  id: 'counter', title: 'Counter', runtime: 'dom', difficulty: 'warm-up', estMinutes: 5, prompt: '', hints: [], explanation: '', tags: [],
  starter: `export default function Counter() { return null; }`,
  solution: `import { useState } from 'react';
export default function Counter({ step = 1 }: { step?: number }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + step)}>Increment</button>
      <label>Name <input aria-label="name" defaultValue="x" /></label>
    </div>
  );
}`,
  tests: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import Counter from './solution';

describe('Counter', () => {
  it('increments', async () => {
    const user = userEvent.setup();
    render(<Counter />);
    await user.click(screen.getByRole('button', { name: /increment/i }));
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName('Increment');
  });
  it('supports a step', async () => {
    const user = userEvent.setup();
    render(<Counter step={5} />);
    await user.click(screen.getByRole('button', { name: /increment/i }));
    expect(screen.getByText(/count/i)).toHaveTextContent('Count: 5');
    expect(screen.getByLabelText('name')).toHaveValue('x');
  });
});`,
};

describe('dom runtime', () => {
  it('passes the solution, fails the starter', async () => {
    const good = await runExercise(counter, counter.solution, nodeCompiler, domExecutor);
    expect(good.error).toBeUndefined();
    expect(good.results.map((r) => [r.status, r.error])).toEqual([['pass', undefined], ['pass', undefined]]);
    const bad = await runExercise(counter, counter.starter, nodeCompiler, domExecutor);
    expect(bad.passed).toBe(false);
  });

  it('write-tests mode: catches mutants', async () => {
    const ex: Exercise = {
      ...counter, mode: 'write-tests', tests: '',
      subject: `export function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }`,
      mutants: [
        { description: 'ignores max', code: `export function clamp(n: number, min: number, _max: number) { return Math.max(min, n); }` },
        { description: 'ignores min', code: `export function clamp(n: number, _min: number, max: number) { return Math.min(max, n); }` },
      ],
    };
    const weak = `import { it, expect } from 'vitest'; import { clamp } from './subject'; it('clamps high', () => { expect(clamp(10, 0, 5)).toBe(5); });`;
    const strong = weak + ` it('clamps low', () => { expect(clamp(-1, 0, 5)).toBe(0); });`;
    const r1 = await runExercise(ex, weak, nodeCompiler, domExecutor);
    expect(r1.passed).toBe(false);
    const r2 = await runExercise(ex, strong, nodeCompiler, domExecutor);
    expect(r2.passed).toBe(true);
  });
});
