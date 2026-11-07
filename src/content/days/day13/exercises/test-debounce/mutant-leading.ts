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
    // BUG: fires on the leading edge; the last call of the burst is never executed
    if (timer === undefined) fn.apply(this, args);
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
    }, wait);
  }

  debounced.cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
