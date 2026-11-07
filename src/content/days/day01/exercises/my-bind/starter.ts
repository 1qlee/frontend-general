/**
 * Implement Function.prototype.bind as a standalone function — without using
 * the native .bind().
 *
 *   const bound = myBind(fn, thisArg, ...presetArgs);
 *
 * Requirements:
 * 1. Calling `bound(...rest)` calls `fn` with `this === thisArg` and arguments [...presetArgs, ...rest].
 * 2. Returns fn's return value.
 * 3. Stretch: if `bound` is called with `new`, `thisArg` is ignored and a new instance of `fn` is
 *    created (instances should satisfy `instanceof fn`), just like native bind.
 */
export function myBind(fn: Function, thisArg: unknown, ...presetArgs: unknown[]): (...args: unknown[]) => any {
  throw new Error('Not implemented');
}
