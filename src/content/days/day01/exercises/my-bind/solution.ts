/**
 * Implement Function.prototype.bind as a standalone function — without using
 * the native .bind().
 */
export function myBind(fn: Function, thisArg: unknown, ...presetArgs: unknown[]): (...args: unknown[]) => any {
  if (typeof fn !== 'function') throw new TypeError('myBind must be called on a function');

  function bound(this: unknown, ...args: unknown[]): any {
    // `new.target` is defined when `bound` is invoked with `new`.
    if (new.target) {
      // Native bind ignores thisArg for constructor calls.
      return Reflect.construct(fn, [...presetArgs, ...args], new.target);
    }
    return fn.apply(thisArg, [...presetArgs, ...args]);
  }

  // Make `new bound() instanceof fn` true.
  if (fn.prototype) bound.prototype = Object.create(fn.prototype);
  return bound;
}
