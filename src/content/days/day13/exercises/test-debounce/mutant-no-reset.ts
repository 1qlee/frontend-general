export interface Debounced<This, Args extends unknown[]> {
  (this: This, ...args: Args): void;
  cancel(): void;
}

export function debounce<This, Args extends unknown[]>(
  fn: (this: This, ...args: Args) => void,
  wait: number,
): Debounced<This, Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Args;
  let lastThis: This;

  function debounced(this: This, ...args: Args): void {
    lastArgs = args;
    lastThis = this;
    if (timer !== undefined) return; // BUG: keeps the first timer instead of restarting it
    timer = setTimeout(() => {
      timer = undefined;
      fn.apply(lastThis, lastArgs);
    }, wait);
  }

  debounced.cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
