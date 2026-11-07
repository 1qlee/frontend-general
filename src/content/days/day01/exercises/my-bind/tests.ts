import { describe, it, expect } from 'vitest';
import { myBind } from './solution';

function greet(this: { name: string }, greeting: string, punctuation: string) {
  return `${greeting}, ${this.name}${punctuation}`;
}

describe('myBind', () => {
  it('binds `this`', () => {
    const bound = myBind(greet, { name: 'Ada' });
    expect(bound('Hello', '!')).toBe('Hello, Ada!');
  });

  it('supports partial application (preset arguments)', () => {
    const hi = myBind(greet, { name: 'Linus' }, 'Hi');
    expect(hi('?')).toBe('Hi, Linus?');
  });

  it('cannot be re-bound: the first binding wins', () => {
    const first = myBind(greet, { name: 'first' });
    const second = myBind(first, { name: 'second' });
    expect(second('Hey', '.')).toBe('Hey, first.');
  });

  it('`this` stays bound even when called as a method of another object', () => {
    const bound = myBind(greet, { name: 'bound' });
    const other = { name: 'other', bound };
    expect(other.bound('Yo', '')).toBe('Yo, bound');
  });

  it('does not use native Function.prototype.bind', () => {
    const native = Function.prototype.bind;
    let usedNative = false;
    Function.prototype.bind = function (this: Function, ...args: [unknown, ...unknown[]]) {
      usedNative = true;
      return native.apply(this, args);
    };
    try {
      myBind(greet, { name: 'x' })('a', 'b');
    } finally {
      Function.prototype.bind = native;
    }
    expect(usedNative).toBe(false);
  });

  it('stretch: works with `new` (thisArg is ignored, instanceof works)', () => {
    function Point(this: { x: number; y: number }, x: number, y: number) {
      this.x = x;
      this.y = y;
    }
    const BoundPoint = myBind(Point, { ignored: true }, 1) as unknown as new (y: number) => { x: number; y: number };
    const p = new BoundPoint(2);
    expect(p).toEqual({ x: 1, y: 2 });
    expect(p instanceof (Point as unknown as new () => unknown)).toBe(true);
  });
});
