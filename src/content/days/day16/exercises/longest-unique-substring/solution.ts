/**
 * Return the length of the longest substring of `s` (contiguous!) without repeating characters.
 *
 * Target: O(n) time, O(min(n, alphabet)) space.
 */
export function lengthOfLongestSubstring(s: string): number {
  // Invariant: s[left..right] contains no duplicate characters.
  const lastSeen = new Map<string, number>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    const prev = lastSeen.get(ch);
    // Only jump if the previous occurrence is INSIDE the current window — `left` never moves backwards.
    if (prev !== undefined && prev >= left) left = prev + 1;
    lastSeen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
