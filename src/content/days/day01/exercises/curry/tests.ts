import { describe, it, expect, vi } from 'vitest';
import { curry } from './solution';

const add3 = (a: number, b: number, c: number) => a + b + c;

describe('curry', () => {
  it('supports one argument at a time', () => {
    expect(curry(add3)(1)(2)(3)).toBe(6);
  });

  it('supports any grouping of arguments', () => {
    const c = curry(add3);
    expect(c(1, 2)(3)).toBe(6);
    expect(c(1)(2, 3)).toBe(6);
    expect(c(1, 2, 3)).toBe(6);
  });

  it('partially applied functions are reusable and independent', () => {
    const c = curry(add3);
    const add1 = c(1);
    expect(add1(2)(3)).toBe(6);
    expect(add1(10)(10)).toBe(21);
    const add1and2 = add1(2);
    expect(add1and2(100)).toBe(103);
    expect(add1and2(0)).toBe(3);
  });

  it('calls the original function only when enough arguments are collected', () => {
    const spy = vi.fn((a: number, b: number) => a * b);
    const c = curry(spy);
    const half = c(3);
    expect(spy).not.toHaveBeenCalled();
    expect(half(4)).toBe(12);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('works with zero-arity functions', () => {
    expect(curry(() => 'done')()).toBe('done');
  });
});
