import { describe, it, expect } from 'vitest';
import { shortestPath } from './solution';

describe('shortestPath', () => {
  it('returns 0 when start === target, even with no edges', () => {
    expect(shortestPath(1, [], 0, 0)).toBe(0);
  });

  it('finds a direct neighbour', () => {
    expect(shortestPath(2, [[0, 1]], 0, 1)).toBe(1);
  });

  it('treats edges as undirected', () => {
    expect(shortestPath(3, [[1, 0], [2, 1]], 0, 2)).toBe(2);
  });

  it('returns the SHORTEST path, not the first one found by a depth-first walk', () => {
    // 0-1-2-3-4-5 is a long way round; 0-6-5 is short.
    const edges: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [6, 5]];
    expect(shortestPath(7, edges, 0, 5)).toBe(2);
  });

  it('returns -1 for a disconnected target', () => {
    expect(shortestPath(5, [[0, 1], [1, 2], [3, 4]], 0, 4)).toBe(-1);
  });

  it('terminates on cycles, duplicate edges and self-loops', () => {
    const edges: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, 2], [2, 0], [2, 3], [2, 3]];
    expect(shortestPath(4, edges, 0, 3)).toBe(2);
    expect(shortestPath(5, edges, 0, 4)).toBe(-1);
  });

  it('works in a grid-shaped graph with many equal-length paths', () => {
    // 4×4 grid, node id = r * 4 + c; corner to corner is 6 steps.
    const edges: Array<[number, number]> = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (c < 3) edges.push([r * 4 + c, r * 4 + c + 1]);
        if (r < 3) edges.push([r * 4 + c, (r + 1) * 4 + c]);
      }
    }
    expect(shortestPath(16, edges, 0, 15)).toBe(6);
  });

  it('is fast on a 20,000-node path graph (build the adjacency list once)', () => {
    const n = 20_000;
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < n - 1; i++) edges.push([i, i + 1]);
    const t0 = performance.now();
    expect(shortestPath(n, edges, 0, n - 1)).toBe(n - 1);
    expect(performance.now() - t0).toBeLessThan(300);
  });
});
