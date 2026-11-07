import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLocalStorage } from './solution';

/** An in-memory Storage fake; vi.fn wrappers let us assert on reads and writes. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
  };
}

const isNumber = (v: unknown): v is number => typeof v === 'number';

describe('useLocalStorage', () => {
  it('returns [initialValue, setter] when storage is empty', () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useLocalStorage('count', 0, { storage }));
    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toBe(0);
    expect(result.current[1]).toBeTypeOf('function');
  });

  it('reads and JSON-parses an existing value on mount', () => {
    const storage = memoryStorage({ prefs: JSON.stringify({ theme: 'dark', fontSize: 14 }) });
    const { result } = renderHook(() => useLocalStorage('prefs', { theme: 'light', fontSize: 12 }, { storage }));
    expect(result.current[0]).toEqual({ theme: 'dark', fontSize: 14 });
  });

  it('persists updates as JSON', () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useLocalStorage('todos', [] as string[], { storage }));
    act(() => result.current[1](['write tests']));
    expect(result.current[0]).toEqual(['write tests']);
    expect(storage.data.get('todos')).toBe('["write tests"]');
  });

  it('supports functional updates — two in one batch both apply', () => {
    const storage = memoryStorage({ count: '5' });
    const { result } = renderHook(() => useLocalStorage('count', 0, { storage }));
    act(() => {
      result.current[1]((c) => c + 1);
      result.current[1]((c) => c + 1);
    });
    expect(result.current[0]).toBe(7);
    expect(storage.data.get('count')).toBe('7');
  });

  it('calls a lazy initialValue at most once, and not at all when storage has a value', () => {
    const init = vi.fn(() => 42);
    const empty = memoryStorage();
    const { result, rerender } = renderHook(() => useLocalStorage('n', init, { storage: empty }));
    rerender();
    rerender();
    expect(result.current[0]).toBe(42);
    expect(init).toHaveBeenCalledTimes(1);

    const init2 = vi.fn(() => 42);
    const full = memoryStorage({ n: '1' });
    renderHook(() => useLocalStorage('n', init2, { storage: full }));
    expect(init2).not.toHaveBeenCalled();
  });

  it('falls back to initialValue when stored JSON is corrupted', () => {
    const storage = memoryStorage({ count: '{not json' });
    const { result } = renderHook(() => useLocalStorage('count', 3, { storage }));
    expect(result.current[0]).toBe(3);
  });

  it('falls back to initialValue when the stored value fails validate()', () => {
    const storage = memoryStorage({ count: '"five"' });
    const { result } = renderHook(() => useLocalStorage('count', 3, { storage, validate: isNumber }));
    expect(result.current[0]).toBe(3);
  });

  it('keeps working when getItem/setItem throw', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException('blocked', 'SecurityError');
      }),
      setItem: vi.fn(() => {
        throw new DOMException('full', 'QuotaExceededError');
      }),
    };
    const { result } = renderHook(() => useLocalStorage('count', 1, { storage }));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
  });

  it('behaves like useState when storage is null', () => {
    const { result } = renderHook(() => useLocalStorage('count', 10, { storage: null }));
    act(() => result.current[1]((c) => c * 2));
    expect(result.current[0]).toBe(20);
  });
});
