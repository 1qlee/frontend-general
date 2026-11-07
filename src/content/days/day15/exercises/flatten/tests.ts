import { describe, it, expect, vi } from 'vitest';
import { flatten } from './solution';

describe('flatten', () => {
  it('flattens completely by default', () => {
    expect(flatten([1, [2, [3, [4, [5]]]], 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('respects an explicit depth', () => {
    const input = [1, [2, [3, [4]]]];
    expect(flatten(input, 1)).toEqual([1, 2, [3, [4]]]);
    expect(flatten(input, 2)).toEqual([1, 2, 3, [4]]);
  });

  it('returns a shallow copy for depth 0 or a negative depth', () => {
    const inner = [2, 3];
    const input = [1, inner];
    const zero = flatten(input, 0);
    expect(zero).toEqual([1, [2, 3]]);
    expect(zero).not.toBe(input);
    expect(zero[1]).toBe(inner); // shallow: nested arrays are the same references
    expect(flatten(input, -1)).toEqual([1, [2, 3]]);
  });

  it('does not mutate the input', () => {
    const input = [1, [2, [3]]];
    const snapshot = JSON.stringify(input);
    flatten(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('handles empty arrays at any level', () => {
    expect(flatten([])).toEqual([]);
    expect(flatten([[], [[]], [[], [1]]])).toEqual([1]);
  });

  it('keeps non-array values as they are — strings, objects, null, undefined', () => {
    const obj = { id: 1 };
    const set = new Set([1, 2]);
    expect(flatten<unknown>(['ab', ['cd'], [obj, [null, undefined]], set])).toEqual(['ab', 'cd', obj, null, undefined, set]);
    expect(flatten([[obj]])[0]).toBe(obj);
  });

  it('skips empty slots in sparse arrays (like Array.prototype.flat)', () => {
    // eslint-disable-next-line no-sparse-arrays
    const sparse = [1, , 3, [4, , 6]];
    expect(flatten(sparse)).toEqual([1, 3, 4, 6]);
  });

  it('does not delegate to Array.prototype.flat / flatMap', () => {
    const flat = vi.spyOn(Array.prototype, 'flat');
    const flatMap = vi.spyOn(Array.prototype, 'flatMap');
    const out = flatten([1, [2, [3]]]);
    const calls = flat.mock.calls.length + flatMap.mock.calls.length;
    expect(out).toEqual([1, 2, 3]);
    expect(calls).toBe(0);
  });
});
