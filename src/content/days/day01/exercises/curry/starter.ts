/**
 * Curry a function based on its declared arity (fn.length).
 *
 *   const add3 = (a: number, b: number, c: number) => a + b + c;
 *   const c = curry(add3);
 *   c(1)(2)(3) === 6
 *   c(1, 2)(3) === 6
 *   c(1)(2, 3) === 6
 *   c(1, 2, 3) === 6
 *
 * Each intermediate function must be independent and reusable:
 *   const add1 = c(1); add1(2)(3) === 6; add1(10)(10) === 21
 */
export function curry(fn: (...args: any[]) => any): (...args: any[]) => any {
  throw new Error('Not implemented');
}
