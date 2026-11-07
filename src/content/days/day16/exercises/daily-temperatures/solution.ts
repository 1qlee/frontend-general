/**
 * For each day i, return how many days you have to wait after day i for a STRICTLY warmer
 * temperature, or 0 if no warmer day comes.
 *
 * Target: O(n) time with a monotonic stack (each index is pushed and popped at most once).
 */
export function dailyTemperatures(temps: readonly number[]): number[] {
  const answer = new Array<number>(temps.length).fill(0);
  // Indices of days still waiting for a warmer day.
  // Invariant: their temperatures are non-increasing from bottom to top.
  const waiting: number[] = [];
  for (let i = 0; i < temps.length; i++) {
    // Today resolves every waiting day that is colder than today.
    while (waiting.length > 0 && temps[waiting[waiting.length - 1]] < temps[i]) {
      const j = waiting.pop()!;
      answer[j] = i - j;
    }
    waiting.push(i);
  }
  return answer; // anything still on the stack keeps its 0
}
