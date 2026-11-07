import { describe, it, expect } from 'vitest';
import { buildOrder } from './solution';

type Graph = Record<string, string[]>;

/** Every workspace package exactly once, and each one after its workspace dependencies. */
function expectValidOrder(order: string[], packages: Graph) {
  expect([...order].sort()).toEqual(Object.keys(packages).sort());
  const position = new Map(order.map((name, index) => [name, index]));
  const violations: string[] = [];
  for (const [name, deps] of Object.entries(packages)) {
    for (const dep of deps) {
      if (position.has(dep) && position.get(dep)! > position.get(name)!) violations.push(`${dep} must build before ${name}`);
    }
  }
  expect(violations).toEqual([]);
}

/** The error names a real cycle: closed, no repeats, and every arrow is a real dependency. */
function expectCycleError(packages: Graph) {
  let message = '';
  try {
    buildOrder(packages);
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  expect(message).toMatch(/^Cycle detected: /);
  const path = message.replace('Cycle detected: ', '').split(' -> ');
  expect(path.length).toBeGreaterThanOrEqual(2);
  expect(path[0]).toBe(path[path.length - 1]);
  expect(new Set(path.slice(0, -1)).size).toBe(path.length - 1);
  for (let i = 0; i < path.length - 1; i++) {
    expect(packages[path[i]] ?? []).toContain(path[i + 1]);
  }
  return path;
}

describe('buildOrder', () => {
  it('returns an empty list for an empty workspace', () => {
    expect(buildOrder({})).toEqual([]);
  });

  it('returns every package when nothing depends on anything', () => {
    const graph = { docs: [], web: [], tokens: [] };
    expectValidOrder(buildOrder(graph), graph);
  });

  it('builds a chain from the bottom up', () => {
    expect(buildOrder({ app: ['ui'], ui: ['utils'], utils: [] })).toEqual(['utils', 'ui', 'app']);
  });

  it('includes shared dependencies once (diamond)', () => {
    const graph = {
      app: ['ui', 'api-client'],
      ui: ['tokens', 'utils'],
      'api-client': ['utils'],
      tokens: [],
      utils: [],
    };
    const order = buildOrder(graph);
    expect(order).toHaveLength(5);
    expectValidOrder(order, graph);
  });

  it('ignores external (npm) dependencies', () => {
    const graph = { web: ['ui', 'react', 'react-dom'], ui: ['react', 'clsx'] };
    expect(buildOrder(graph)).toEqual(['ui', 'web']);
  });

  it('does not depend on key order', () => {
    const graph = { utils: [], app: ['ui', 'utils'], ui: ['utils'] };
    expectValidOrder(buildOrder(graph), graph);
  });

  it('throws with the cycle path for a three-package cycle', () => {
    const path = expectCycleError({ a: ['b'], b: ['c'], c: ['a'] });
    expect(path).toHaveLength(4);
  });

  it('reports a package that depends on itself', () => {
    expect(() => buildOrder({ a: ['a'] })).toThrow('Cycle detected: a -> a');
  });

  it('finds a cycle that is not reachable from the first package', () => {
    const path = expectCycleError({ app: ['ui'], ui: [], x: ['y', 'react'], y: ['z'], z: ['y'] });
    expect([...path].sort()).toEqual(['y', 'y', 'z']);
  });

  it('reports only the packages on the cycle, not the path that led to it', () => {
    const path = expectCycleError({ app: ['ui'], ui: ['forms'], forms: ['validation'], validation: ['forms'] });
    expect([...path].sort()).toEqual(['forms', 'forms', 'validation']);
  });
});
