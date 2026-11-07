/**
 * All subsets via BACKTRACKING: choose → explore → unchoose.
 * O(n · 2^n) time (2^n subsets, each copied in O(n)); O(n) extra space for the path.
 */
export function subsets(nums: readonly number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  function backtrack(start: number): void {
    // Every node of the decision tree is a valid subset: record a COPY of the path.
    result.push([...path]);
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]); // choose
      backtrack(i + 1); // explore: only later indices, so [1,2] and [2,1] aren't both produced
      path.pop(); // unchoose
    }
  }

  backtrack(0);
  return result;
}
