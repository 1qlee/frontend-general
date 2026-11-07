import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debounce } from './subject';

// Write tests for debounce(fn, wait) using fake timers.
// They must pass on the correct implementation and fail on every buggy one.

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // it('does not call fn before `wait` ms', () => {
  //   const fn = vi.fn();
  //   const debounced = debounce(fn, 100);
  //   ...
  //   vi.advanceTimersByTime(99);
  //   ...
  // });
});
