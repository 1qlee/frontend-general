/**
 * Formats a duration in milliseconds as human-readable English.
 *
 *   formatDuration(45_000)      // '45 seconds'
 *   formatDuration(150_000)     // '2 minutes and 30 seconds'
 *   formatDuration(7_530_000)   // '2 hours, 5 minutes and 30 seconds'
 *   formatDuration(172_800_000) // '2 days'
 *
 * Rules:
 * - Units are day, hour, minute and second; units whose value is 0 are left out.
 * - Sub-second remainders are truncated: 1_999 ms is '1 second'.
 * - Anything under one second is '0 seconds'.
 * - Each unit is pluralised by its own count: '1 minute', '2 minutes'.
 * - Parts are separated by ', ' except the last two, which are joined with ' and '.
 * - Negative, NaN or infinite input throws a RangeError.
 */
const UNITS: ReadonlyArray<readonly [name: string, seconds: number]> = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
];

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError(`formatDuration: expected a non-negative finite number, got ${ms}`);
  }
  let remaining = Math.floor(ms / 1000);

  const parts: string[] = [];
  for (const [name, size] of UNITS) {
    if (remaining >= size) {
      const count = Math.floor(remaining / size);
      remaining -= count * size;
      parts.push(`${count} ${name}${count === 1 ? '' : 's'}`);
    }
  }
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
