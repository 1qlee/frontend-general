/**
 * Top-k frequent values with BUCKET SORT: O(n) time, O(n) space.
 * A frequency is an integer between 1 and n, so we can index buckets by it
 * instead of comparison-sorting.
 */
export function topKFrequent(nums: readonly number[], k: number): number[] {
  // 1. Count: value -> frequency.
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);

  // 2. Bucket by frequency: buckets[f] = values that appear exactly f times.
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, freq] of counts) buckets[freq].push(value);

  // 3. Walk from the highest frequency down until we have k values.
  const result: number[] = [];
  for (let f = buckets.length - 1; f >= 1 && result.length < k; f--) {
    for (const value of buckets[f]) {
      result.push(value);
      if (result.length === k) break;
    }
  }
  return result;
}
