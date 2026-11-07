/**
 * `nums` is sorted ascending and may contain duplicates.
 * Return the FIRST index i such that nums[i] >= target
 * (the index where target is, or where it would be inserted to keep the array sorted).
 * Return nums.length if every element is smaller than target.
 *
 * Target: O(log n) time, O(1) space.
 */
export function searchInsert(nums: readonly number[], target: number): number {
  // Half-open range [lo, hi). Invariant:
  //   every index < lo has nums[i] < target, every index >= hi has nums[i] >= target.
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] < target) lo = mid + 1; // mid is too small: the answer is to its right
    else hi = mid; // mid might be the answer: keep it in range
  }
  return lo; // lo === hi: the boundary between "< target" and ">= target"
}
