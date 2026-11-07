/**
 * Group words that are anagrams of each other.
 *
 * - Words contain only lowercase letters a–z (possibly the empty string).
 * - Groups appear in order of their FIRST word's appearance in the input,
 *   and words inside a group keep their input order.
 *
 * Target: O(n · k log k) with a sorted key, or O(n · k) with a letter-count key
 * (n = number of words, k = max word length).
 */
export function groupAnagrams(words: readonly string[]): string[][] {
  // Map preserves insertion order, which gives us "order of first appearance" for free.
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const key = canonicalKey(word);
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return [...groups.values()];
}

/** Letter-count signature, e.g. "aab" -> "2#1#0#…". The separator prevents collisions like [1,11] vs [11,1]. */
function canonicalKey(word: string): string {
  const counts = new Array<number>(26).fill(0);
  for (let i = 0; i < word.length; i++) counts[word.charCodeAt(i) - 97]++;
  return counts.join('#');
}
