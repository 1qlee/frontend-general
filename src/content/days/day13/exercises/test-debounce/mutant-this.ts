export interface Debounced<This, Args extends unknown[]> {
  (this: This, ...args: Args): void;
  cancel(): void;
}

export function debounce<This, Args extends unknown[]>(
  fn: (this: This, ...args: Args) => void,
  wait: number,
): Debounced<This, Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  // BUG: an arrow function has no own `this`, so the caller's `this` is lost
  const debounced = (...args: Args): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, wait);
  };

  return Object.assign(debounced, {
    cancel(): void {
      clearTimeout(timer);
      timer = undefined;
    },
  });
}
