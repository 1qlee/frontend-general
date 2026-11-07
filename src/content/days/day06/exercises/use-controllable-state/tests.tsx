import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useControllableState, type UseControllableStateOptions } from './solution';

function setup<T>(initialProps: UseControllableStateOptions<T>) {
  return renderHook((props: UseControllableStateOptions<T>) => useControllableState(props), { initialProps });
}

describe('useControllableState', () => {
  it('uncontrolled: starts at defaultValue, updates on set and reports the change', () => {
    const onChange = vi.fn();
    const { result } = setup({ defaultValue: 'a', onChange });
    expect(result.current[0]).toBe('a');
    act(() => result.current[1]('b'));
    expect(result.current[0]).toBe('b');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('uncontrolled: later changes to defaultValue are ignored (it is an initial value)', () => {
    const { result, rerender } = setup({ defaultValue: 'a' });
    rerender({ defaultValue: 'z' });
    expect(result.current[0]).toBe('a');
  });

  it('controlled: shows the value prop and only reports changes until the parent updates it', () => {
    const onChange = vi.fn();
    const { result, rerender } = setup<number>({ value: 1, defaultValue: 0, onChange });
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(onChange).toHaveBeenCalledWith(2);
    expect(result.current[0]).toBe(1); // the parent has not accepted the change yet
    rerender({ value: 2, defaultValue: 0, onChange });
    expect(result.current[0]).toBe(2);
  });

  it('treats null as a controlled value (only undefined means uncontrolled)', () => {
    const { result } = setup<string | null>({ value: null, defaultValue: 'fallback' });
    expect(result.current[0]).toBeNull();
  });

  it('supports updater functions, resolved against the latest value prop when controlled', () => {
    const onChange = vi.fn();
    const { result, rerender } = setup<number>({ value: 10, defaultValue: 0, onChange });
    rerender({ value: 20, defaultValue: 0, onChange });
    act(() => result.current[1]((prev) => prev + 1));
    expect(onChange).toHaveBeenLastCalledWith(21);
  });

  it('applies two updater functions called in the same event (uncontrolled)', () => {
    const onChange = vi.fn();
    const { result } = setup<number>({ defaultValue: 0, onChange });
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
    });
    expect(result.current[0]).toBe(2);
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it('does not call onChange when the next value is the same as the current one', () => {
    const onChange = vi.fn();
    const { result } = setup({ defaultValue: 'same', onChange });
    act(() => result.current[1]('same'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('returns a setter with a stable identity across renders and value changes', () => {
    const { result, rerender } = setup<number>({ defaultValue: 0 });
    const firstSetter = result.current[1];
    act(() => result.current[1](5));
    rerender({ defaultValue: 0 });
    expect(result.current[0]).toBe(5);
    expect(result.current[1]).toBe(firstSetter);
  });
});
