import { describe, it, expect } from 'vitest';
import { groupAnagrams } from './solution';

describe('groupAnagrams', () => {
  it('groups the classic example in order of first appearance', () => {
    expect(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat'])).toEqual([
      ['eat', 'tea', 'ate'],
      ['tan', 'nat'],
      ['bat'],
    ]);
  });

  it('returns [] for no words', () => {
    expect(groupAnagrams([])).toEqual([]);
  });

  it('handles the empty string and a single word', () => {
    expect(groupAnagrams([''])).toEqual([['']]);
    expect(groupAnagrams(['a'])).toEqual([['a']]);
    expect(groupAnagrams(['', 'b', ''])).toEqual([['', ''], ['b']]);
  });

  it('keeps duplicate words together', () => {
    expect(groupAnagrams(['ab', 'ba', 'ab'])).toEqual([['ab', 'ba', 'ab']]);
  });

  it('separates words with the same letters but different counts or lengths', () => {
    expect(groupAnagrams(['ab', 'abb', 'aab', 'bba'])).toEqual([['ab'], ['abb', 'bba'], ['aab']]);
  });

  it('does not merge groups whose letter counts only look alike when concatenated', () => {
    // counts [a:1, b:11] and [a:11, b:1] both join to "111…" without a separator
    const oneA = 'a' + 'b'.repeat(11);
    const elevenA = 'a'.repeat(11) + 'b';
    expect(groupAnagrams([oneA, elevenA])).toEqual([[oneA], [elevenA]]);
  });

  it('does not mutate the input', () => {
    const input = Object.freeze(['cab', 'abc', 'xyz']);
    expect(groupAnagrams(input)).toEqual([['cab', 'abc'], ['xyz']]);
    expect(input).toEqual(['cab', 'abc', 'xyz']);
  });
});
