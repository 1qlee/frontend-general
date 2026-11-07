/**
 * Re-implement the `instanceof` operator without using it:
 *
 *   myInstanceOf(value, Ctor) === (value instanceof Ctor)
 *
 * Walk the prototype chain of `value` looking for `Ctor.prototype`.
 * Primitives are never instances. Throw a TypeError if Ctor is not callable.
 * (Ignore Symbol.hasInstance.)
 */
export function myInstanceOf(value: unknown, Ctor: unknown): boolean {
  throw new Error('Not implemented');
}
