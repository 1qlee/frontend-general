export function curry(fn: (...args: any[]) => any): (...args: any[]) => any {
  return function curried(this: unknown, ...args: any[]): any {
    if (args.length >= fn.length) return fn.apply(this, args);
    // Return a NEW function that remembers the args so far — never mutate shared state,
    // otherwise partially-applied functions could not be reused.
    return function (this: unknown, ...more: any[]) {
      return curried.apply(this, [...args, ...more]);
    };
  };
}
