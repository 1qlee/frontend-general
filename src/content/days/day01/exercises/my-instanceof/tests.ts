import { describe, it, expect } from 'vitest';
import { myInstanceOf } from './solution';

class Animal {}
class Dog extends Animal {}

describe('myInstanceOf', () => {
  it('finds a direct prototype', () => {
    expect(myInstanceOf(new Dog(), Dog)).toBe(true);
  });

  it('walks up the prototype chain', () => {
    expect(myInstanceOf(new Dog(), Animal)).toBe(true);
    expect(myInstanceOf(new Dog(), Object)).toBe(true);
  });

  it('returns false for unrelated constructors', () => {
    expect(myInstanceOf(new Animal(), Dog)).toBe(false);
    expect(myInstanceOf([], Map)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(myInstanceOf(1, Number)).toBe(false);
    expect(myInstanceOf('s', String)).toBe(false);
    expect(myInstanceOf(null, Object)).toBe(false);
    expect(myInstanceOf(undefined, Object)).toBe(false);
  });

  it('handles objects with a null prototype', () => {
    expect(myInstanceOf(Object.create(null), Object)).toBe(false);
  });

  it('works for functions (functions are objects)', () => {
    expect(myInstanceOf(() => {}, Function)).toBe(true);
  });

  it('throws a TypeError when the right-hand side is not callable', () => {
    expect(() => myInstanceOf({}, {})).toThrow(TypeError);
  });

  it('does not use the instanceof operator', () => {
    const fakeCtor = function () {} as unknown as { prototype: object };
    const obj = Object.create(fakeCtor.prototype);
    expect(myInstanceOf(obj, fakeCtor)).toBe(true);
  });
});
