export interface Debounced<This, Args extends unknown[]> {
  (this: This, ...args: Args): void;
  cancel(): void;
}

export function debounce<This, Args extends unknown[]>(
  fn: (this: This, ...args: Args) => void,
  wait: number,
): Debounced<This, Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function debounced(this: This, ...args: Args): void {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, wait);
  }

  debounced.cancel = (): void => {
    timer = undefined; // BUG: forgets clearTimeout, so the pending call still fires
  };

  return debounced;
}
