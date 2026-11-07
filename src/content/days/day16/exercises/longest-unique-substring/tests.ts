import { describe, it, expect } from 'vitest';
import { lengthOfLongestSubstring } from './solution';

describe('lengthOfLongestSubstring', () => {
  it('handles the classic examples', () => {
    expect(lengthOfLongestSubstring('abcabcbb')).toBe(3); // "abc"
    expect(lengthOfLongestSubstring('bbbbb')).toBe(1);
  });

  it('counts substrings, not subsequences', () => {
    // "pwke" is a subsequence of length 4, but the longest SUBSTRING is "wke"
    expect(lengthOfLongestSubstring('pwwkew')).toBe(3);
  });

  it('returns 0 for the empty string and 1 for a single character', () => {
    expect(lengthOfLongestSubstring('')).toBe(0);
    expect(lengthOfLongestSubstring(' ')).toBe(1);
  });

  it('does not throw away the whole window on a repeat', () => {
    // restarting from the repeated character would give 2; the answer is "vdf"
    expect(lengthOfLongestSubstring('dvdf')).toBe(3);
  });

  it('never moves the left edge backwards', () => {
    // a last-index jump without the "inside the window" check gives 3 for "abba"
    expect(lengthOfLongestSubstring('abba')).toBe(2);
    expect(lengthOfLongestSubstring('tmmzuxt')).toBe(5); // "mzuxt"
  });

  it('handles the whole string being unique, and spaces/symbols as characters', () => {
    expect(lengthOfLongestSubstring('abcdef')).toBe(6);
    expect(lengthOfLongestSubstring('a b!c')).toBe(5); // spaces and symbols are characters too
    expect(lengthOfLongestSubstring('a b a')).toBe(3); // "a b" — the second space repeats
  });

  it('works on long input', () => {
    const s = 'abcdefghijklmnopqrstuvwxyz'.repeat(4000) + 'A';
    expect(lengthOfLongestSubstring(s)).toBe(27);
  });
});
