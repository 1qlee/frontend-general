/**
 * Count the contiguous, non-empty subarrays of `nums` whose sum equals `k`.
 * `nums` may contain negative numbers and zeros.
 *
 * Target: O(n) time, O(n) extra space.
 */
export function subarraySum(nums: readonly number[], k: number): number {
  // prefixCount.get(p) = how many prefixes (including the empty prefix) have sum p
  const prefixCount = new Map<number, number>([[0, 1]]);
  let prefix = 0;
  let count = 0;
  for (const x of nums) {
    prefix += x;
    // a subarray (i, j] sums to k  <=>  prefix[j] - prefix[i] === k  <=>  prefix[i] === prefix[j] - k
    count += prefixCount.get(prefix - k) ?? 0;
    prefixCount.set(prefix, (prefixCount.get(prefix) ?? 0) + 1);
  }
  return count;
}
