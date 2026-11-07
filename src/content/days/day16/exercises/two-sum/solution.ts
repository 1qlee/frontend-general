/**
 * Return the indices [i, j] (i < j) of the two numbers in `nums` that add up to `target`,
 * or `null` if no such pair exists. You may not use the same element twice.
 * At most one valid pair exists in each input.
 *
 * Target: O(n) time, O(n) extra space.
 */
export function twoSum(nums: readonly number[], target: number): [number, number] | null {
  // value -> index where we saw it
  const seen = new Map<number, number>();
  for (let j = 0; j < nums.length; j++) {
    const i = seen.get(target - nums[j]);
    // check BEFORE inserting nums[j], so an element can't pair with itself
    if (i !== undefined) return [i, j];
    seen.set(nums[j], j);
  }
  return null;
}
