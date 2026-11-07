import { useState } from 'react';

export interface CounterProps {
  initial?: number;
  min?: number;
  max?: number;
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
      <button type="button" onClick={() => update(0)}>
        Reset
      </button>
    </div>
  );
}

export default Counter;
