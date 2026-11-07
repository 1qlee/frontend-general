import { useState } from 'react';

export interface CounterProps {
  /** Starting value (also what Reset returns to). Default 0. */
  initial?: number;
  /** Inclusive lower bound. Default 0. */
  min?: number;
  /** Inclusive upper bound. Default 10. */
  max?: number;
  /** Called with the NEW value after every change. */
  onChange?: (value: number) => void;
}

export function Counter({ initial = 0, min = 0, max = 10, onChange }: CounterProps) {
  const [count, setCount] = useState(initial);

  function update(next: number) {
    setCount(next);
    onChange?.(next);
  }

  return (
    <div>
      <p>{`Count: ${count}`}</p>
      <button type="button" onClick={() => update(count - 1)} disabled={count <= min}>
        Decrement
      </button>
      <button type="button" onClick={() => update(count + 1)} disabled={count >= max}>
        Increment
      </button>
      <button type="button" onClick={() => update(initial)}>
        Reset
      </button>
    </div>
  );
}

export default Counter;
